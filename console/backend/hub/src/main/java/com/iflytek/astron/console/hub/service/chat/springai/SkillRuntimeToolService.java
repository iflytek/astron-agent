package com.iflytek.astron.console.hub.service.chat.springai;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;
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

    private final OkHttpClient httpClient;

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
