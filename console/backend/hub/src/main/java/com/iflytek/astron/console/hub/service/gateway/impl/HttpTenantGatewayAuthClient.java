package com.iflytek.astron.console.hub.service.gateway.impl;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.hub.service.gateway.TenantGatewayAuthClient;
import lombok.extern.slf4j.Slf4j;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.util.Optional;

@Slf4j
@Service
public class HttpTenantGatewayAuthClient implements TenantGatewayAuthClient {

    private static final MediaType JSON_MEDIA_TYPE = MediaType.parse("application/json; charset=utf-8");

    private final OkHttpClient httpClient;
    private final String verifyAppAuthUrl;

    @Autowired
    public HttpTenantGatewayAuthClient(@Value("${tenant.verify-app-auth}") String verifyAppAuthUrl) {
        this(new OkHttpClient(), verifyAppAuthUrl);
    }

    HttpTenantGatewayAuthClient(OkHttpClient httpClient, String verifyAppAuthUrl) {
        this.httpClient = httpClient;
        this.verifyAppAuthUrl = verifyAppAuthUrl;
    }

    @Override
    public Optional<String> verify(String apiKey, String apiSecret) {
        if (!StringUtils.hasText(verifyAppAuthUrl)) {
            log.warn("tenant verify app auth url is empty");
            return Optional.empty();
        }

        JSONObject requestBody = new JSONObject();
        requestBody.put("api_key", apiKey);
        requestBody.put("api_secret", apiSecret);

        Request request = new Request.Builder()
                .url(verifyAppAuthUrl)
                .post(RequestBody.create(requestBody.toJSONString(), JSON_MEDIA_TYPE))
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                log.warn("tenant verify app auth request failed, status={}", response.code());
                return Optional.empty();
            }
            return parseAppId(response.body());
        } catch (IOException | RuntimeException ex) {
            log.warn("tenant verify app auth request error", ex);
            return Optional.empty();
        }
    }

    private Optional<String> parseAppId(ResponseBody body) throws IOException {
        if (body == null) {
            return Optional.empty();
        }
        JSONObject responseJson = JSON.parseObject(body.string());
        Integer code = responseJson == null ? null : responseJson.getInteger("code");
        if (code == null || code != 0) {
            return Optional.empty();
        }
        JSONObject data = responseJson.getJSONObject("data");
        if (data == null) {
            return Optional.empty();
        }
        String appId = data.getString("appid");
        if (!StringUtils.hasText(appId)) {
            appId = data.getString("app_id");
        }
        return StringUtils.hasText(appId) ? Optional.of(appId) : Optional.empty();
    }
}
