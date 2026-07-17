package com.iflytek.astron.console.hub.service.chat.springai;

import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.toolkit.config.properties.ApiUrl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.Duration;

/**
 * HTTP helpers backing the standalone-agent skill tools: downloading SKILL.md / resources for
 * {@code read_skill} (and, in a later phase, calling the sandbox endpoint for {@code run_skill}).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SkillRuntimeToolService {

    private static final MediaType JSON_MEDIA_TYPE = MediaType.get("application/json; charset=utf-8");

    private final OkHttpClient httpClient;
    private final ApiUrl apiUrl;

    /**
     * POST a single skill command to core/agent's sandbox-exec endpoint; returns the raw JSON string.
     */
    public String executeSandbox(JSONObject body) throws IOException {
        String base = StringUtils.defaultIfBlank(apiUrl.getAgentUrl(), "http://127.0.0.1:8700");
        String url = StringUtils.stripEnd(base, "/") + "/agent/v1/skill/sandbox-exec";
        Request request = new Request.Builder()
                .url(url)
                .post(RequestBody.create(body.toJSONString(), JSON_MEDIA_TYPE))
                .addHeader("Content-Type", "application/json")
                .build();
        OkHttpClient client = httpClient.newBuilder()
                .callTimeout(Duration.ofSeconds(120))
                .build();
        try (Response response = client.newCall(request).execute()) {
            ResponseBody respBody = response.body();
            String text = respBody == null ? "" : respBody.string();
            if (!response.isSuccessful()) {
                throw new IOException("sandbox-exec failed: HTTP " + response.code() + " " + text);
            }
            return text;
        }
    }

    /** Download a text resource (SKILL.md or a referenced file) from a presigned URL. */
    public String downloadText(String url) throws IOException {
        Request request = new Request.Builder().url(url).get().build();
        OkHttpClient client = httpClient.newBuilder()
                .callTimeout(Duration.ofSeconds(30))
                .build();
        try (Response response = client.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Skill resource download failed: HTTP " + response.code());
            }
            ResponseBody body = response.body();
            if (body == null) {
                throw new IOException("Skill resource download returned empty body");
            }
            return body.string();
        }
    }
}
