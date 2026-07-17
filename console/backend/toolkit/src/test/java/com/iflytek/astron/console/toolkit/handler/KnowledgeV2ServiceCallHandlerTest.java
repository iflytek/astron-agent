package com.iflytek.astron.console.toolkit.handler;

import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.toolkit.config.properties.ApiUrl;
import com.iflytek.astron.console.toolkit.entity.core.knowledge.QueryMatchObj;
import com.iflytek.astron.console.toolkit.entity.core.knowledge.QueryRequest;
import com.iflytek.astron.console.toolkit.entity.core.knowledge.SplitRequest;
import com.iflytek.astron.console.toolkit.entity.platform.PlatformAccountConfigDto;
import com.iflytek.astron.console.toolkit.service.platform.PlatformAccountService;
import com.iflytek.astron.console.toolkit.util.OkHttpUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

/** Unit tests for {@link KnowledgeV2ServiceCallHandler}. */
class KnowledgeV2ServiceCallHandlerTest {

    private KnowledgeV2ServiceCallHandler handler;

    @BeforeEach
    void setUp() {
        handler = new KnowledgeV2ServiceCallHandler();
        ApiUrl apiUrl = mock(ApiUrl.class);
        when(apiUrl.getKnowledgeUrl()).thenReturn("http://core-knowledge.local");
        ReflectionTestUtils.setField(handler, "apiUrl", apiUrl);

        PlatformAccountService platformAccountService = mock(PlatformAccountService.class);
        when(platformAccountService.requireRagflow()).thenReturn(ragflowConfig());
        when(platformAccountService.requireXinghuoKnowledge()).thenReturn(xinghuoConfig());
        when(platformAccountService.requireXinghuoKnowledgePlatformCredentials()).thenReturn(iflytekConfig());
        ReflectionTestUtils.setField(handler, "platformAccountService", platformAccountService);
    }

    @Test
    void applyDatasetIdToSplitRequest_setsForRagflowOnly() {
        SplitRequest req = new SplitRequest();
        req.setRagType("Ragflow-RAG");
        handler.applyDatasetIdToSplitRequest(req, "ds-1");
        assertThat(req.getDatasetId()).isEqualTo("ds-1");
    }

    @Test
    void applyDatasetIdToSplitRequest_noOpForNonRagflow() {
        SplitRequest req = new SplitRequest();
        req.setRagType("CBG-RAG");
        handler.applyDatasetIdToSplitRequest(req, "ds-1");
        assertThat(req.getDatasetId()).isNull();
    }

    @Test
    void applyDatasetIdToSplitRequest_noOpForBlankDatasetId() {
        SplitRequest req = new SplitRequest();
        req.setRagType("Ragflow-RAG");
        handler.applyDatasetIdToSplitRequest(req, "");
        assertThat(req.getDatasetId()).isNull();
        handler.applyDatasetIdToSplitRequest(req, null);
        assertThat(req.getDatasetId()).isNull();
    }

    @Test
    void applyDatasetIdToSplitRequest_nullRequestIsNoOp() {
        handler.applyDatasetIdToSplitRequest(null, "ds-1");
    }

    @Test
    void applyDatasetIdToUploadParams_setsForRagflowOnly() {
        Map<String, Object> params = new HashMap<>();
        handler.applyDatasetIdToUploadParams(params, "Ragflow-RAG", "ds-1");
        assertThat(params).containsEntry("datasetId", "ds-1");
    }

    @Test
    void applyDatasetIdToUploadParams_noOpForNonRagflow() {
        Map<String, Object> params = new HashMap<>();
        handler.applyDatasetIdToUploadParams(params, "CBG-RAG", "ds-1");
        assertThat(params).doesNotContainKey("datasetId");
    }

    @Test
    void applyDatasetIdToUploadParams_noOpForBlankDatasetId() {
        Map<String, Object> params = new HashMap<>();
        handler.applyDatasetIdToUploadParams(params, "Ragflow-RAG", "");
        assertThat(params).doesNotContainKey("datasetId");
        handler.applyDatasetIdToUploadParams(params, "Ragflow-RAG", null);
        assertThat(params).doesNotContainKey("datasetId");
    }

    @Test
    void applyDatasetIdToUploadParams_nullParamsIsNoOp() {
        handler.applyDatasetIdToUploadParams(null, "Ragflow-RAG", "ds-1");
    }

    @Test
    @DisplayName("createRagflowDataset returns datasetId on success")
    void createRagflowDataset_success() {
        try (MockedStatic<OkHttpUtil> okHttp = mockStatic(OkHttpUtil.class)) {
            okHttp.when(() -> OkHttpUtil.post(anyString(), anyMap(), anyString()))
                    .thenReturn("{\"code\":0,\"message\":\"success\",\"data\":{\"datasetId\":\"ds-abc-123\"}}");

            String result = handler.createRagflowDataset("uuid-name", "kb_alpha");

            assertThat(result).isEqualTo("ds-abc-123");
        }
    }

    @Test
    @DisplayName("createRagflowDataset throws on non-zero code")
    void createRagflowDataset_nonZeroCode() {
        try (MockedStatic<OkHttpUtil> okHttp = mockStatic(OkHttpUtil.class)) {
            okHttp.when(() -> OkHttpUtil.post(anyString(), anyMap(), anyString()))
                    .thenReturn("{\"code\":10003,\"message\":\"upstream failure\",\"data\":null}");

            assertThatThrownBy(() -> handler.createRagflowDataset("n", "d"))
                    .isInstanceOf(BusinessException.class);
        }
    }

    @Test
    @DisplayName("createRagflowDataset throws when datasetId blank")
    void createRagflowDataset_blankDatasetId() {
        try (MockedStatic<OkHttpUtil> okHttp = mockStatic(OkHttpUtil.class)) {
            okHttp.when(() -> OkHttpUtil.post(anyString(), anyMap(), anyString()))
                    .thenReturn("{\"code\":0,\"message\":\"\",\"data\":{\"datasetId\":\"\"}}");

            assertThatThrownBy(() -> handler.createRagflowDataset("n", "d"))
                    .isInstanceOf(BusinessException.class);
        }
    }

    @Test
    @DisplayName("createRagflowDataset throws on null/blank response")
    void createRagflowDataset_nullResponse() {
        try (MockedStatic<OkHttpUtil> okHttp = mockStatic(OkHttpUtil.class)) {
            okHttp.when(() -> OkHttpUtil.post(anyString(), anyMap(), anyString()))
                    .thenReturn("");

            assertThatThrownBy(() -> handler.createRagflowDataset("n", "d"))
                    .isInstanceOf(BusinessException.class);
        }
    }

    @Test
    void knowledgeQuery_sendsRagflowHeaders() {
        QueryRequest request = new QueryRequest();
        request.setQuery("hello");
        request.setTopN(3);
        request.setRagType("Ragflow-RAG");
        QueryMatchObj match = new QueryMatchObj();
        match.setRepoId(Collections.singletonList("repo-1"));
        match.setDatasetId(Collections.singletonList("ds-1"));
        request.setMatch(match);

        try (MockedStatic<OkHttpUtil> okHttp = mockStatic(OkHttpUtil.class)) {
            okHttp.when(() -> OkHttpUtil.post(
                    eq("http://core-knowledge.local/v1/chunk/query"),
                    anyMap(),
                    anyString()))
                    .thenReturn("{\"code\":0,\"message\":\"success\",\"data\":{\"results\":[]}}");

            assertThat(handler.knowledgeQuery(request).getCode()).isZero();
            okHttp.verify(() -> OkHttpUtil.post(
                    eq("http://core-knowledge.local/v1/chunk/query"),
                    argThat(headers -> "http://ragflow.local".equals(headers.get("x-ragflow-base-url"))
                            && "rag-token".equals(headers.get("x-ragflow-api-token"))),
                    anyString()));
        }
    }

    @Test
    void documentUpload_sendsRagflowHeadersAsHeadersNotUrlParams() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "demo.txt", "text/plain", "hello".getBytes(StandardCharsets.UTF_8));

        try (MockedStatic<OkHttpUtil> okHttp = mockStatic(OkHttpUtil.class)) {
            okHttp.when(() -> OkHttpUtil.postMultipart(
                    anyString(),
                    anyMap(),
                    isNull(),
                    anyMap(),
                    isNull()))
                    .thenReturn("{\"code\":0,\"message\":\"success\",\"data\":[]}");

            assertThat(handler.documentUpload(file, null, null, "Ragflow-RAG", 0, null, "ds-1").getCode())
                    .isZero();
            okHttp.verify(() -> OkHttpUtil.postMultipart(
                    eq("http://core-knowledge.local/v1/document/upload"),
                    argThat(headers -> "http://ragflow.local".equals(headers.get("x-ragflow-base-url"))
                            && "rag-token".equals(headers.get("x-ragflow-api-token"))),
                    isNull(),
                    argThat(params -> "ds-1".equals(params.get("datasetId"))),
                    isNull()));
        }
    }

    private PlatformAccountConfigDto.RagflowConfig ragflowConfig() {
        PlatformAccountConfigDto.RagflowConfig config = new PlatformAccountConfigDto.RagflowConfig();
        config.setBaseUrl("http://ragflow.local");
        config.setApiToken("rag-token");
        config.setTimeout(60);
        config.setDefaultGroup("default");
        return config;
    }

    private PlatformAccountConfigDto.XinghuoKnowledgeConfig xinghuoConfig() {
        PlatformAccountConfigDto.XinghuoKnowledgeConfig config =
                new PlatformAccountConfigDto.XinghuoKnowledgeConfig();
        config.setDatasetId("dataset-1");
        return config;
    }

    private PlatformAccountConfigDto.IflytekOpenPlatformConfig iflytekConfig() {
        PlatformAccountConfigDto.IflytekOpenPlatformConfig config =
                new PlatformAccountConfigDto.IflytekOpenPlatformConfig();
        config.setPlatformAppId("app-id");
        config.setPlatformApiSecret("secret");
        return config;
    }
}
