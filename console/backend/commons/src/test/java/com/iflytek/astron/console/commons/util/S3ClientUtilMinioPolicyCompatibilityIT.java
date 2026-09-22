package com.iflytek.astron.console.commons.util;

import static org.assertj.core.api.Assertions.assertThat;

import io.minio.GetObjectArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.SetBucketPolicyArgs;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

@Testcontainers
class S3ClientUtilMinioPolicyCompatibilityIT {
    private static final String MINIO_IMAGE =
            "quay.io/minio/minio:RELEASE.2025-07-23T15-54-02Z";
    private static final String ACCESS_KEY = "codex-policy-root";
    private static final String SECRET_KEY = "codex-policy-password-2026";
    private static final String DEFAULT_BUCKET = "console-oss";
    private static final String ARTIFACT_BUCKET = "workflow-artifacts";
    private static final String PUBLIC_OBJECT = "public/asset.txt";
    private static final String ARTIFACT_OBJECT =
            "workflow/artifacts/42/secret.txt";
    private static final byte[] PUBLIC_CONTENT =
            "public asset".getBytes(StandardCharsets.UTF_8);
    private static final byte[] ARTIFACT_CONTENT =
            "private artifact".getBytes(StandardCharsets.UTF_8);

    @Container
    private static final GenericContainer<?> MINIO =
            new GenericContainer<>(DockerImageName.parse(MINIO_IMAGE))
                    .withEnv("MINIO_ROOT_USER", ACCESS_KEY)
                    .withEnv("MINIO_ROOT_PASSWORD", SECRET_KEY)
                    .withCommand("server", "/data", "--address", ":9000")
                    .withExposedPorts(9000)
                    .waitingFor(Wait.forHttp("/minio/health/cluster").forStatusCode(200))
                    .withStartupTimeout(Duration.ofMinutes(2));

    @Test
    void productionMinioAcceptsPolicyAndEnforcesArtifactPrivacy() throws Exception {
        String endpoint = "http://" + MINIO.getHost() + ":" + MINIO.getMappedPort(9000);
        MinioClient adminClient = MinioClient.builder()
                .endpoint(endpoint)
                .credentials(ACCESS_KEY, SECRET_KEY)
                .build();
        adminClient.makeBucket(
                MakeBucketArgs.builder().bucket(DEFAULT_BUCKET).build());
        adminClient.setBucketPolicy(SetBucketPolicyArgs.builder()
                .bucket(DEFAULT_BUCKET)
                .config(legacyPublicReadPolicy())
                .build());

        S3ClientUtil clientUtil = configuredClient(endpoint);
        clientUtil.init();
        clientUtil.ensurePrivateBucket(ARTIFACT_BUCKET);

        String reconciledPolicy = adminClient.getBucketPolicy(
                io.minio.GetBucketPolicyArgs.builder().bucket(DEFAULT_BUCKET).build());
        assertThat(reconciledPolicy)
                .contains(
                        "AstronPublicReadExcludingWorkflowArtifacts",
                        "AstronDenyWorkflowArtifactReads",
                        "aws:principaltype")
                .doesNotContain("LegacyPublicRead", "aws:PrincipalType");

        putObject(adminClient, DEFAULT_BUCKET, PUBLIC_OBJECT, PUBLIC_CONTENT);
        putObject(adminClient, DEFAULT_BUCKET, ARTIFACT_OBJECT, ARTIFACT_CONTENT);
        putObject(adminClient, ARTIFACT_BUCKET, ARTIFACT_OBJECT, ARTIFACT_CONTENT);

        assertThat(anonymousGet(endpoint, DEFAULT_BUCKET, PUBLIC_OBJECT).statusCode())
                .isEqualTo(200);
        assertThat(anonymousGet(endpoint, DEFAULT_BUCKET, ARTIFACT_OBJECT).statusCode())
                .isEqualTo(403);
        assertThat(anonymousGet(endpoint, ARTIFACT_BUCKET, ARTIFACT_OBJECT).statusCode())
                .isEqualTo(403);

        try (InputStream response = adminClient.getObject(GetObjectArgs.builder()
                .bucket(DEFAULT_BUCKET)
                .object(ARTIFACT_OBJECT)
                .build())) {
            assertThat(response.readAllBytes()).isEqualTo(ARTIFACT_CONTENT);
        }

        assertPresignedArtifactDownload(
                clientUtil, DEFAULT_BUCKET, ARTIFACT_OBJECT, ARTIFACT_CONTENT);
        assertPresignedArtifactDownload(
                clientUtil, ARTIFACT_BUCKET, ARTIFACT_OBJECT, ARTIFACT_CONTENT);
    }

    private static S3ClientUtil configuredClient(String endpoint) {
        S3ClientUtil clientUtil = new S3ClientUtil();
        ReflectionTestUtils.setField(clientUtil, "endpoint", endpoint);
        ReflectionTestUtils.setField(clientUtil, "remoteEndpoint", endpoint);
        ReflectionTestUtils.setField(clientUtil, "accessKey", ACCESS_KEY);
        ReflectionTestUtils.setField(clientUtil, "secretKey", SECRET_KEY);
        ReflectionTestUtils.setField(clientUtil, "defaultBucket", DEFAULT_BUCKET);
        ReflectionTestUtils.setField(clientUtil, "presignExpirySeconds", 600);
        ReflectionTestUtils.setField(clientUtil, "enablePublicRead", true);
        return clientUtil;
    }

    private static void putObject(
            MinioClient client, String bucket, String object, byte[] content) throws Exception {
        client.putObject(PutObjectArgs.builder()
                .bucket(bucket)
                .object(object)
                .stream(new ByteArrayInputStream(content), content.length, -1)
                .contentType("text/plain")
                .build());
    }

    private static HttpResponse<byte[]> anonymousGet(
            String endpoint, String bucket, String object) throws Exception {
        return get(endpoint + "/" + bucket + "/" + object);
    }

    private static void assertPresignedArtifactDownload(
            S3ClientUtil clientUtil,
            String bucket,
            String object,
            byte[] expectedContent)
            throws Exception {
        String presignedUrl = clientUtil.generatePresignedDownloadUrl(
                bucket, object, "artifact.txt", 300);
        HttpResponse<byte[]> response = get(presignedUrl);
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).isEqualTo(expectedContent);
    }

    private static HttpResponse<byte[]> get(String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .GET()
                .build();
        return HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.ofByteArray());
    }

    private static String legacyPublicReadPolicy() {
        return """
                {
                  "Version":"2012-10-17",
                  "Statement":[{
                    "Sid":"LegacyPublicRead",
                    "Effect":"Allow",
                    "Principal":{"AWS":["*"]},
                    "Action":["s3:GetObject"],
                    "Resource":["arn:aws:s3:::%s/*"]
                  }]
                }
                """.formatted(DEFAULT_BUCKET);
    }
}
