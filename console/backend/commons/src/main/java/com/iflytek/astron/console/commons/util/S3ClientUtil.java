package com.iflytek.astron.console.commons.util;

import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import io.minio.BucketExistsArgs;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.SetBucketPolicyArgs;
import io.minio.errors.ErrorResponseException;
import io.minio.errors.InsufficientDataException;
import io.minio.errors.InternalException;
import io.minio.errors.InvalidResponseException;
import io.minio.errors.ServerException;
import io.minio.errors.XmlParserException;
import io.minio.http.Method;
import jakarta.annotation.PostConstruct;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Concise S3 (MinIO) client utility providing upload and presign capabilities. */
@Slf4j
@Component
public class S3ClientUtil {

    @Value("${s3.endpoint}")
    private String endpoint;

    @Value("${s3.remoteEndpoint}")
    private String remoteEndpoint;

    @Value("${s3.accessKey}")
    private String accessKey;

    @Value("${s3.secretKey}")
    private String secretKey;

    @Getter
    @Value("${s3.bucket}")
    private String defaultBucket;

    @Getter
    @Value("${s3.presignExpirySeconds:600}")
    private int presignExpirySeconds;

    @Value("${s3.enablePublicRead:false}")
    private boolean enablePublicRead;

    private MinioClient minioClient;

    @PostConstruct
    public void init() {
        this.minioClient = MinioClient.builder().endpoint(endpoint).credentials(accessKey, secretKey).build();

        // Check if default bucket exists, create if not
        try {
            boolean found = minioClient.bucketExists(BucketExistsArgs.builder().bucket(defaultBucket).build());
            if (!found) {
                log.info("Creating S3 bucket: {}", defaultBucket);
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(defaultBucket).build());
                log.info("Created S3 bucket: {}", defaultBucket);
            } else {
                log.info("S3 bucket already exists: {}", defaultBucket);
            }

            // Set bucket policy to public read only if enabled
            if (enablePublicRead) {
                String publicReadPolicy = buildPublicReadPolicy(defaultBucket);
                minioClient.setBucketPolicy(
                        SetBucketPolicyArgs.builder()
                                .bucket(defaultBucket)
                                .config(publicReadPolicy)
                                .build());
                log.info("Set public read policy for bucket: {}", defaultBucket);
            }
        } catch (ErrorResponseException | InsufficientDataException | InternalException | InvalidKeyException | InvalidResponseException | IOException | NoSuchAlgorithmException | ServerException | XmlParserException e) {
            log.error("Failed to check/create/configure S3 bucket '{}': {}", defaultBucket, e.getMessage(), e);
            throw new BusinessException(ResponseEnum.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Build public read policy JSON for a bucket using fastjson2. This allows anonymous users to
     * read/download objects from the bucket.
     *
     * @param bucketName bucket name
     * @return JSON policy string
     */
    private String buildPublicReadPolicy(String bucketName) {
        JSONObject policy = new JSONObject();
        policy.put("Version", "2012-10-17");

        JSONObject statement = new JSONObject();
        statement.put("Effect", "Allow");

        JSONObject principal = new JSONObject();
        principal.put("AWS", new JSONArray().fluentAdd("*"));
        statement.put("Principal", principal);

        statement.put("Action", new JSONArray().fluentAdd("s3:GetObject"));
        statement.put("Resource", new JSONArray().fluentAdd(String.format("arn:aws:s3:::%s/*", bucketName)));

        policy.put("Statement", new JSONArray().fluentAdd(statement));

        return policy.toJSONString();
    }

    /**
     * Upload object (stream). Caller is responsible for closing the input stream.
     *
     * @param bucketName target bucket
     * @param objectKey object key (path)
     * @param contentType MIME type, e.g., "application/octet-stream" or a specific type
     * @param inputStream input stream
     * @param objectSize total object size (-1 if unknown, provide partSize)
     * @param partSize part size (required when objectSize=-1, recommend >= 10MB)
     * @return uploaded object URL
     */
    public String uploadObject(String bucketName, String objectKey, String contentType, InputStream inputStream, long objectSize, long partSize) {
        try {
            PutObjectArgs.Builder builder = PutObjectArgs.builder().bucket(bucketName).object(objectKey).stream(inputStream, objectSize, partSize);

            if (contentType != null && !contentType.isEmpty()) {
                builder.contentType(contentType);
            }

            minioClient.putObject(builder.build());

            // Build object URL
            return buildObjectUrl(bucketName, objectKey);
        } catch (ErrorResponseException | InsufficientDataException | InternalException | InvalidKeyException | InvalidResponseException | IOException | NoSuchAlgorithmException | ServerException | XmlParserException e) {
            if (log.isErrorEnabled()) {
                log.error("S3 error on upload: {}", e.getMessage(), e);
            }
            throw new BusinessException(ResponseEnum.S3_UPLOAD_ERROR);
        }
    }

    /**
     * Build object URL.
     *
     * @param bucketName bucket name
     * @param objectKey object key
     * @return full object URL
     */
    private String buildObjectUrl(String bucketName, String objectKey) {
        return String.format("%s/%s/%s", remoteEndpoint, bucketName, objectKey);
    }

    /**
     * Upload object to default bucket (stream). Caller closes the stream.
     *
     * @param objectKey object key (path)
     * @param contentType MIME type
     * @param inputStream input stream
     * @param objectSize total object size (-1 if unknown, provide partSize)
     * @param partSize part size (required when objectSize=-1, recommend >= 10MB)
     * @return uploaded object URL
     */
    public String uploadObject(String objectKey, String contentType, InputStream inputStream, long objectSize, long partSize) {
        return uploadObject(defaultBucket, objectKey, contentType, inputStream, objectSize, partSize);
    }


    /**
     * Upload byte array.
     *
     * @param bucketName target bucket
     * @param objectKey object key (path)
     * @param contentType MIME type
     * @param data byte array
     * @return uploaded object URL
     */
    public String uploadObject(String bucketName, String objectKey, String contentType, byte[] data) {
        try (InputStream inputStream = new ByteArrayInputStream(data)) {
            return uploadObject(bucketName, objectKey, contentType, inputStream, data.length, -1);
        } catch (IOException e) {
            // ByteArrayInputStream.close won't throw IOException; present to satisfy try-with-resources
            throw new BusinessException(ResponseEnum.S3_UPLOAD_ERROR);
        }
    }

    /**
     * Upload byte array to default bucket.
     *
     * @param objectKey object key (path)
     * @param contentType MIME type
     * @param data byte array
     * @return uploaded object URL
     */
    public String uploadObject(String objectKey, String contentType, byte[] data) {
        return uploadObject(defaultBucket, objectKey, contentType, data);
    }

    /**
     * Simplified upload with auto-detected file size. Caller closes the stream.
     *
     * @param bucketName target bucket
     * @param objectKey object key (path)
     * @param contentType MIME type
     * @param inputStream input stream
     * @return uploaded object URL
     */
    public String uploadObject(String bucketName, String objectKey, String contentType, InputStream inputStream) {
        // Use -1 as objectSize; MinIO will use multipart upload (recommend 5MB part size)
        return uploadObject(bucketName, objectKey, contentType, inputStream, -1, 5L * 1024 * 1024);
    }

    /**
     * Simplified upload to default bucket; auto-detect size. Caller closes the stream.
     *
     * @param objectKey object key (path)
     * @param contentType MIME type
     * @param inputStream input stream
     * @return uploaded object URL
     */
    public String uploadObject(String objectKey, String contentType, InputStream inputStream) {
        return uploadObject(defaultBucket, objectKey, contentType, inputStream);
    }

    /**
     * Generate a presigned PUT URL for browser direct upload.
     *
     * @param bucketName target bucket
     * @param objectKey object key
     * @param expirySeconds expiry in seconds (MinIO requires 1..604800)
     * @return URL usable for HTTP PUT
     */
    public String generatePresignedPutUrl(String bucketName, String objectKey, int expirySeconds) {
        try {
            return minioClient.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder().method(Method.PUT).bucket(bucketName).object(objectKey).expiry(expirySeconds).build());
        } catch (ErrorResponseException | InsufficientDataException | InternalException | InvalidKeyException | InvalidResponseException | IOException | NoSuchAlgorithmException | XmlParserException | ServerException e) {
            log.error("S3 error on presign PUT for bucket '{}', object '{}': {}", bucketName, objectKey, e.getMessage(), e);
            throw new BusinessException(ResponseEnum.S3_PRESIGN_ERROR);
        }
    }

    /**
     * Generate a presigned PUT URL in the default bucket using default expiry.
     *
     * @param objectKey object key
     * @return URL usable for HTTP PUT
     */
    public String generatePresignedPutUrl(String objectKey) {
        return generatePresignedPutUrl(defaultBucket, objectKey, presignExpirySeconds);
    }

    /**
     * Generate a presigned GET URL for reading/downloading an object.
     *
     * @param bucketName target bucket
     * @param objectKey object key
     * @param expirySeconds expiry in seconds (MinIO requires 1..604800)
     * @return URL usable for HTTP GET
     */
    public String generatePresignedGetUrl(String bucketName, String objectKey, int expirySeconds) {
        try {
            return minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(bucketName)
                            .object(objectKey)
                            .expiry(expirySeconds)
                            .build());
        } catch (ErrorResponseException | InsufficientDataException | InternalException | InvalidKeyException | InvalidResponseException | IOException | NoSuchAlgorithmException | XmlParserException | ServerException e) {
            log.error("S3 error on presign GET for bucket '{}', object '{}': {}", bucketName, objectKey, e.getMessage(), e);
            throw new BusinessException(ResponseEnum.S3_PRESIGN_ERROR);
        }
    }

    /**
     * Generate a presigned GET URL in the default bucket using default expiry.
     *
     * @param objectKey object key
     * @return URL usable for HTTP GET
     */
    public String generatePresignedGetUrl(String objectKey) {
        return generatePresignedGetUrl(defaultBucket, objectKey, presignExpirySeconds);
    }
}
