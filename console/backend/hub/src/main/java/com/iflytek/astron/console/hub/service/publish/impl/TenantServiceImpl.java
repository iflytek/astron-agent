package com.iflytek.astron.console.hub.service.publish.impl;

import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.hub.dto.user.TenantAuth;
import com.iflytek.astron.console.hub.service.publish.TenantService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * @author yun-zhi-ztl
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TenantServiceImpl implements TenantService {

    @Value("${tenant.create-app}")
    private String createApp;

    @Value("${tenant.get-app-detail}")
    private String getAppDetail;

    private static final OkHttpClient HTTP_CLIENT = new OkHttpClient().newBuilder()
            .connectionPool(new ConnectionPool(100, 5, TimeUnit.MINUTES))
            .connectTimeout(60, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .build();

    @Override
    public String createApp(String uid, String appName, String appDesc) {
        JSONObject requestBody = new JSONObject();
        requestBody.put("request_id", uid + UUID.randomUUID());
        requestBody.put("app_name", appName);
        requestBody.put("app_desc", appDesc);
        requestBody.put("dev_id", 1);
        requestBody.put("cloud_id", "0");

        RequestBody requestBodyForPost = RequestBody.create(MediaType.parse("application/json"), requestBody.toJSONString());
        Request request = new Request.Builder()
                .url(createApp)
                .method("POST", requestBodyForPost)
                .build();

        JSONObject reqJson = new JSONObject();
        try (Response response = HTTP_CLIENT.newCall(request).execute()) {
            ResponseBody body = response.body();
            if ((!response.isSuccessful()) || (body == null)) {
                log.error("tenant-service-create-app error request:  {}, response: {}", requestBody, reqJson);
                return null;
            }
            String responseBody = body.string();
            reqJson = JSONObject.parseObject(responseBody);
            if (reqJson.getInteger("code") == 0 && reqJson.containsKey("data") && reqJson.getJSONObject("data").containsKey("app_id")) {
                return reqJson.getJSONObject("data").getString("app_id");
            } else {
                log.error("tenant-service-create-app is not successful request : {}, response: {}", requestBody, reqJson);
            }
        } catch (Exception e) {
            log.error("tenant-service-create-app throw exception request : {}", requestBody, e);
        }
        return null;
    }

    @Override
    public TenantAuth getAppDetail(String appId) {
        String requestUrl = String.format("%s?app_ids=%s", getAppDetail, appId);
        Request request = new Request.Builder()
                .url(requestUrl)
                .method("GET", null)
                .build();

        JSONObject reqJson = new JSONObject();
        try (Response response = HTTP_CLIENT.newCall(request).execute()) {
            ResponseBody body = response.body();
            if ((!response.isSuccessful()) || (body == null)) {
                log.error("tenant-service-get-app-detail  error requestUrl: {}, response: {}", requestUrl, reqJson);
                return null;
            }
            String responseBody = body.string();
            reqJson = JSONObject.parseObject(responseBody);
            if (reqJson.getInteger("code") == 0 && reqJson.containsKey("data")
                    && reqJson.getJSONArray("data").getJSONObject(0).containsKey("auth_list")) {
                return JSONArray.parseArray(reqJson.getJSONArray("data").getJSONObject(0).getString("auth_list"), TenantAuth.class).get(0);
            } else {
                log.error("tenant-service-get-app-detail Lack of return requestUrl: {}, response: {}", requestUrl, reqJson);
            }
        } catch (Exception e) {
            log.error("tenant-service-get-app-detail throw exception requestUrl: {}", requestUrl, e);
        }
        return null;
    }

}
