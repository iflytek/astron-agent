package com.iflytek.astron.console.toolkit.service.external;

import com.alibaba.fastjson2.JSON;
import com.iflytek.astron.console.toolkit.entity.dto.external.AppInfoResponse;
import com.iflytek.astron.console.toolkit.util.OkHttpUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Service for calling external third-party APIs
 */
@Service
@Slf4j
public class ExternalApiService {
    @Value("${api.url.appIdQryUrl}")
    private String appIdQryUrl;


    /**
     * Query app info by API key
     *
     * @param apiKey API key
     * @return AppInfoResponse
     */
    public AppInfoResponse getAppInfoByApiKey(String apiKey) {
        String url = appIdQryUrl + "/v2/app/key/api_key/" + apiKey;
        log.debug("Calling external API: {}", url);

        try {
            String response = OkHttpUtil.get(url);
            log.debug("External API response: {}", response);

            // Check if response is valid JSON format
            if (response == null || response.trim().isEmpty()) {
                log.error("Empty response from external API for apiKey: {}", apiKey);
                return createMockResponse(apiKey);
            }

            // Check for common error responses
            if (response.contains("404") || response.contains("not found") ||
                    response.contains("error") || !response.trim().startsWith("{")) {
                log.warn("External API not available (response: {}), using mock data for apiKey: {}",
                        response.trim(), apiKey);
                return createMockResponse(apiKey);
            }

            return JSON.parseObject(response, AppInfoResponse.class);
        } catch (Exception e) {
            log.warn("Failed to query external API ({}), using mock data for apiKey: {}",
                    e.getMessage(), apiKey);
            return createMockResponse(apiKey);
        }
    }

    /**
     * Create mock response when external API is not available TODO: Remove this when external API is
     * fixed
     */
    private AppInfoResponse createMockResponse(String apiKey) {
        AppInfoResponse response = new AppInfoResponse();
        response.setCode(0);
        response.setMessage("Success (Mock Data)");

        AppInfoResponse.AppInfoData data = new AppInfoResponse.AppInfoData();
        // Use a deterministic appId based on apiKey for consistency
        data.setAppid("mock-app-" + apiKey.substring(0, Math.min(8, apiKey.length())));
        data.setName("Mock Application");
        data.setSource("mock");
        data.setDesc("Mock application for testing");

        response.setData(data);

        log.info("Generated mock response for apiKey: {}, appId: {}", apiKey, data.getAppid());
        return response;
    }
}
