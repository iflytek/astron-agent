package com.iflytek.astron.console.toolkit.service.workflowtrace;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.toolkit.config.properties.WorkflowTraceProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.Credentials;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
@RequiredArgsConstructor
public class WorkflowTraceEsClient {

    private static final MediaType JSON_MEDIA_TYPE = MediaType.get("application/json; charset=utf-8");

    private final WorkflowTraceProperties workflowTraceProperties;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private volatile OkHttpClient client;

    public JsonNode search(JsonNode body) {
        Request.Builder requestBuilder = new Request.Builder()
                .url(buildSearchUrl())
                .post(RequestBody.create(body.toString(), JSON_MEDIA_TYPE));
        if (StringUtils.isNotBlank(workflowTraceProperties.getEsUsername())) {
            requestBuilder.header(
                    "Authorization",
                    Credentials.basic(
                            workflowTraceProperties.getEsUsername(),
                            StringUtils.defaultString(workflowTraceProperties.getEsPassword())));
        }

        try (Response response = getClient().newCall(requestBuilder.build()).execute()) {
            ResponseBody responseBody = response.body();
            if (!response.isSuccessful() || responseBody == null) {
                String errorBody = responseBody == null ? "" : responseBody.string();
                log.error("Workflow trace search failed, code={}, body={}", response.code(), errorBody);
                throw new BusinessException(ResponseEnum.RESPONSE_FAILED, "workflow trace request failed");
            }
            return objectMapper.readTree(responseBody.string());
        } catch (JsonProcessingException e) {
            log.error("Failed to parse workflow trace response", e);
            throw new BusinessException(ResponseEnum.RESPONSE_FAILED, "workflow trace response parse failed");
        } catch (IOException e) {
            log.error("Workflow trace search request failed", e);
            throw new BusinessException(ResponseEnum.RESPONSE_FAILED, "workflow trace request failed");
        }
    }

    private String buildSearchUrl() {
        return StringUtils.removeEnd(workflowTraceProperties.getEsUrl(), "/")
                + "/"
                + workflowTraceProperties.getEsIndex()
                + "/_search";
    }

    private OkHttpClient getClient() {
        if (client == null) {
            synchronized (this) {
                if (client == null) {
                    client = buildClient();
                }
            }
        }
        return client;
    }

    private OkHttpClient buildClient() {
        return new OkHttpClient.Builder()
                .connectTimeout(workflowTraceProperties.getEsTimeoutSeconds(), TimeUnit.SECONDS)
                .readTimeout(workflowTraceProperties.getEsTimeoutSeconds(), TimeUnit.SECONDS)
                .writeTimeout(workflowTraceProperties.getEsTimeoutSeconds(), TimeUnit.SECONDS)
                .callTimeout(workflowTraceProperties.getEsTimeoutSeconds(), TimeUnit.SECONDS)
                .build();
    }
}
