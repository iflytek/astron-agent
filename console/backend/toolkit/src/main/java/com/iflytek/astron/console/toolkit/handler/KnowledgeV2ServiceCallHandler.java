package com.iflytek.astron.console.toolkit.handler;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.toolkit.common.constant.ProjectContent;
import com.iflytek.astron.console.toolkit.config.properties.RepoAuthorizedConfig;
import com.iflytek.astron.console.toolkit.config.properties.ApiUrl;
import com.iflytek.astron.console.toolkit.entity.core.knowledge.*;
import com.iflytek.astron.console.toolkit.entity.platform.PlatformAccountConfigDto;
import com.iflytek.astron.console.toolkit.service.platform.PlatformAccountService;
import com.iflytek.astron.console.toolkit.util.OkHttpUtil;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;

import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
public class KnowledgeV2ServiceCallHandler {
    @Resource
    private ApiUrl apiUrl;
    @Resource
    private RepoAuthorizedConfig repoAuthorizedConfig;
    @Resource
    private PlatformAccountService platformAccountService;

    private static final String DATASET_ID_FIELD = "datasetId";

    /**
     * Create or reuse a RAGFlow dataset and return its id.
     *
     * @param name RAGFlow dataset.name
     * @param description RAGFlow dataset.description; nullable
     */
    public String createRagflowDataset(String name, String description) {
        String url = apiUrl.getKnowledgeUrl().concat("/v1/dataset/create");
        Map<String, String> headers = buildKnowledgeHeaders(ProjectContent.FILE_SOURCE_RAG_FLOW_RAG_STR);
        DatasetCreateRequest req = new DatasetCreateRequest(name, description);
        String reqBody = JSON.toJSONString(req);
        log.info("createRagflowDataset url = {}, name = {}", url, name);
        String resp = postJson(url, headers, reqBody);
        log.info("createRagflowDataset response = {}", resp);
        KnowledgeResponse parsed = JSON.parseObject(resp, KnowledgeResponse.class);
        if (parsed == null || parsed.getCode() == null || parsed.getCode() != 0) {
            String msg = (parsed == null) ? "blank response" : parsed.getMessage();
            throw new BusinessException(ResponseEnum.REPO_CREATE_RAGFLOW_FAILED, msg);
        }
        return extractDatasetId(parsed.getData());
    }

    private String extractDatasetId(Object data) {
        JSONObject dataObj = toJsonObject(data);
        String datasetId = dataObj == null ? null : dataObj.getString(DATASET_ID_FIELD);
        if (StringUtils.isBlank(datasetId)) {
            throw new BusinessException(ResponseEnum.REPO_CREATE_RAGFLOW_FAILED,
                    "RAGFlow returned blank datasetId");
        }
        return datasetId;
    }

    private JSONObject toJsonObject(Object data) {
        if (data instanceof JSONObject) {
            return (JSONObject) data;
        }
        if (data instanceof String) {
            return JSON.parseObject((String) data);
        }
        throw new BusinessException(ResponseEnum.REPO_CREATE_RAGFLOW_FAILED,
                "RAGFlow returned non-object data");
    }

    /**
     * Document parsing and chunking
     *
     * @param request the split request describing the document
     * @param datasetId RAGFlow dataset.id; ignored when blank or non-Ragflow
     * @return knowledge response from the upstream split API
     */
    public KnowledgeResponse documentSplit(SplitRequest request, String datasetId) {
        applyDatasetIdToSplitRequest(request, datasetId);
        String url = apiUrl.getKnowledgeUrl().concat("/v1/document/split");
        Map<String, String> headers = buildKnowledgeHeaders(request.getRagType());
        String reqBody = JSON.toJSONString(request);
        log.info("documentSplit url = {}, request = {}", url, reqBody);
        String post = postJson(url, headers, reqBody);
        log.info("documentSplit response = {}", post);
        return JSON.parseObject(post, KnowledgeResponse.class);
    }

    /**
     * Document upload and chunking (multipart/form-data)
     *
     * @param multipartFile multipart file to upload
     * @param lengthRange chunking length range
     * @param separator separator list
     * @param ragType RAG type
     * @param resourceType resource type (0=file, 1=html)
     * @param oldDocId existing RAGFlow doc id for upsert; null for first slice
     * @param datasetId RAGFlow dataset.id; ignored when blank or non-Ragflow
     * @return KnowledgeResponse
     */
    public KnowledgeResponse documentUpload(MultipartFile multipartFile,
            List<Integer> lengthRange, List<String> separator,
            String ragType, Integer resourceType,
            String oldDocId,
            String datasetId) {
        String url = apiUrl.getKnowledgeUrl().concat("/v1/document/upload");

        try {
            log.info("documentUpload fileName: {}, fileSize: {} bytes, oldDocId: {}",
                    multipartFile.getOriginalFilename(), multipartFile.getSize(), oldDocId);

            Map<String, Object> params = new HashMap<>();
            params.put("file", multipartFile);
            if (lengthRange != null) {
                params.put("lengthRange", JSON.toJSONString(lengthRange));
            }
            if (separator != null && !separator.isEmpty()) {
                params.put("separator", JSON.toJSONString(separator));
            }
            params.put("ragType", ragType);
            if (resourceType != null) {
                params.put("resourceType", resourceType.toString());
            }
            if (StringUtils.isNotBlank(oldDocId)) {
                params.put("documentId", oldDocId);
            }
            applyDatasetIdToUploadParams(params, ragType, datasetId);
            Map<String, String> headers = buildKnowledgeHeaders(ragType);

            log.info("documentUpload url = {}, ragType = {}, resourceType = {}", url, ragType, resourceType);
            String post = OkHttpUtil.postMultipart(url, headers, null, params, null);
            log.info("documentUpload response = {}", post);
            return JSON.parseObject(post, KnowledgeResponse.class);
        } catch (Exception e) {
            log.error("documentUpload error: {}", e.getMessage(), e);
            KnowledgeResponse errorResponse = new KnowledgeResponse();
            errorResponse.setCode(-1);
            errorResponse.setMessage("Upload failed: " + e.getMessage());
            return errorResponse;
        }
    }

    void applyDatasetIdToSplitRequest(SplitRequest request, String datasetId) {
        if (request == null) {
            return;
        }
        if (ProjectContent.FILE_SOURCE_RAG_FLOW_RAG_STR.equals(request.getRagType())
                && StringUtils.isNotBlank(datasetId)) {
            request.setDatasetId(datasetId);
        }
    }

    void applyDatasetIdToUploadParams(
            Map<String, Object> params, String ragType, String datasetId) {
        if (params == null) {
            return;
        }
        if (ProjectContent.FILE_SOURCE_RAG_FLOW_RAG_STR.equals(ragType)
                && StringUtils.isNotBlank(datasetId)) {
            params.put(DATASET_ID_FIELD, datasetId);
        }
    }

    public KnowledgeResponse saveChunk(KnowledgeRequest request) {
        String url = apiUrl.getKnowledgeUrl().concat("/v1/chunks/save");
        Map<String, String> headers = buildKnowledgeHeaders(request.getRagType());
        String reqBody = JSON.toJSONString(request);
        log.info("saveChunk url = {}, request = {}", url, reqBody);
        String post = postJson(url, headers, reqBody);
        log.info("saveChunk response = {}", post);
        return JSON.parseObject(post, KnowledgeResponse.class);
    }

    public KnowledgeResponse updateChunk(KnowledgeRequest request) {
        String url = apiUrl.getKnowledgeUrl().concat("/v1/chunk/update");
        Map<String, String> headers = buildKnowledgeHeaders(request.getRagType());
        String reqBody = JSON.toJSONString(request);
        log.info("updateChunk url = {}, request = {}", url, reqBody);
        String post = postJson(url, headers, reqBody);
        log.info("updateChunk response = {}", post);
        return JSON.parseObject(post, KnowledgeResponse.class);
    }

    public KnowledgeResponse deleteDocOrChunk(KnowledgeRequest request) {
        String url = apiUrl.getKnowledgeUrl().concat("/v1/chunk/delete");
        Map<String, String> headers = buildKnowledgeHeaders(request.getRagType());
        String reqBody = JSON.toJSONString(request);
        log.info("deleteDocOrChunk url = {}, request = {}", url, reqBody);
        String post = postJson(url, headers, reqBody);
        log.info("deleteDocOrChunk response = {}", post);
        return JSON.parseObject(post, KnowledgeResponse.class);
    }

    public KnowledgeResponse knowledgeQuery(QueryRequest request) {
        String url = apiUrl.getKnowledgeUrl().concat("/v1/chunk/query");
        Map<String, String> headers = buildKnowledgeHeaders(request.getRagType());
        String reqBody = JSON.toJSONString(request);
        log.info("knowledgeQuery request url:{}\ndata:{}", url, reqBody);
        String respData = postJson(url, headers, reqBody);
        log.info("knowledgeQuery response data:{}", respData);
        return JSON.parseObject(respData, KnowledgeResponse.class);
    }

    private String postJson(String url, String reqBody) {
        return OkHttpUtil.post(url, reqBody);
    }

    private String postJson(String url, Map<String, String> headers, String reqBody) {
        return OkHttpUtil.post(url, headers, reqBody);
    }

    private Map<String, String> buildKnowledgeHeaders(String ragType) {
        Map<String, String> headers = new HashMap<>();
        if (ProjectContent.FILE_SOURCE_RAG_FLOW_RAG_STR.equals(ragType)) {
            PlatformAccountConfigDto.RagflowConfig ragflow = platformAccountService.requireRagflow();
            headers.put("x-ragflow-base-url", ragflow.getBaseUrl());
            headers.put("x-ragflow-api-token", ragflow.getApiToken());
            if (ragflow.getTimeout() != null) {
                headers.put("x-ragflow-timeout", String.valueOf(ragflow.getTimeout()));
            }
            if (StringUtils.isNotBlank(ragflow.getDefaultGroup())) {
                headers.put("x-ragflow-default-group", ragflow.getDefaultGroup());
            }
            return headers;
        }
        if (ProjectContent.FILE_SOURCE_CBG_RAG_STR.equals(ragType)) {
            PlatformAccountConfigDto.XinghuoKnowledgeConfig xinghuo =
                    platformAccountService.requireXinghuoKnowledge();
            PlatformAccountConfigDto.IflytekOpenPlatformConfig platform =
                    platformAccountService.requireXinghuoKnowledgePlatformCredentials();
            headers.put("x-xinghuo-dataset-id", xinghuo.getDatasetId());
            headers.put("x-xinghuo-app-id", platform.getPlatformAppId());
            headers.put("x-xinghuo-app-secret", platform.getPlatformApiSecret());
        }
        return headers;
    }
}
