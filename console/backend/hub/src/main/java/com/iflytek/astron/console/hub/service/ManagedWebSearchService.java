package com.iflytek.astron.console.hub.service;

import cn.xfyun.api.SparkChatClient;
import cn.xfyun.config.SparkModel;
import cn.xfyun.model.sparkmodel.RoleContent;
import cn.xfyun.model.sparkmodel.SparkChatParam;
import cn.xfyun.model.sparkmodel.WebSearch;
import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.toolkit.entity.platform.PlatformAccountConfigDto;
import com.iflytek.astron.console.toolkit.service.platform.PlatformAccountService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.Response;
import okhttp3.ResponseBody;
import okio.BufferedSource;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class ManagedWebSearchService {

    private static final String SEARCH_SYSTEM_PROMPT = """
            You are a real-time web search assistant.
            Use web search and answer the user's question with a concise factual summary.
            Keep any source reference indices returned by search, such as [1], [2].
            Do not describe yourself, the model, or the search provider.
            Only return external search findings relevant to the user's query.
            """;
    private static final long SEARCH_TIMEOUT_SECONDS = 60L;

    @Resource
    private PlatformAccountService platformAccountService;

    public SearchAugmentation search(String query, String userId) {
        if (StringUtils.isBlank(query)) {
            return SearchAugmentation.empty();
        }

        PlatformAccountConfigDto.IflytekOpenPlatformConfig config =
                platformAccountService.requireIflytekOpenPlatform();
        SparkChatClient client = new SparkChatClient.Builder()
                .signatureHttp(config.getSparkApiPassword(), SparkModel.SPARK_X1)
                .build();

        SparkChatParam request = buildSearchRequest(query, userId);
        StringBuffer summary = new StringBuffer();
        StringBuffer trace = new StringBuffer();
        StringBuffer error = new StringBuffer();
        CountDownLatch latch = new CountDownLatch(1);

        client.send(request, new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                error.append(e.getMessage());
                latch.countDown();
            }

            @Override
            public void onResponse(Call call, Response response) {
                try (response; ResponseBody body = response.body()) {
                    if (!response.isSuccessful()) {
                        error.append(response.message());
                        return;
                    }
                    if (body == null) {
                        error.append("empty response body");
                        return;
                    }
                    readSearchStream(body, summary, trace);
                } catch (Exception e) {
                    error.append(e.getMessage());
                } finally {
                    latch.countDown();
                }
            }
        });

        try {
            if (!latch.await(SEARCH_TIMEOUT_SECONDS, TimeUnit.SECONDS)) {
                return SearchAugmentation.failed("managed web search timeout");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return SearchAugmentation.failed("managed web search interrupted");
        }

        if (error.length() > 0) {
            return SearchAugmentation.failed(error.toString());
        }

        JSONArray toolCalls = parseToolCalls(trace.toString());
        if (StringUtils.isBlank(summary.toString()) && toolCalls.isEmpty()) {
            return SearchAugmentation.failed("managed web search returned no results");
        }
        return new SearchAugmentation(summary.toString().trim(), JSON.toJSONString(toolCalls), false, null);
    }

    private SparkChatParam buildSearchRequest(String query, String userId) {
        SparkChatParam param = new SparkChatParam();
        param.setUserId(userId);
        param.setMessages(List.of(
                roleContent("system", SEARCH_SYSTEM_PROMPT),
                roleContent("user", query)));

        WebSearch webSearch = new WebSearch();
        webSearch.setEnable(true);
        webSearch.setSearchMode("deep");
        webSearch.setShowRefLabel(true);
        param.setWebSearch(webSearch);
        return param;
    }

    private RoleContent roleContent(String role, String content) {
        RoleContent roleContent = new RoleContent();
        roleContent.setRole(role);
        roleContent.setContent(content);
        return roleContent;
    }

    private void readSearchStream(ResponseBody body, StringBuffer summary, StringBuffer trace) throws IOException {
        BufferedSource source = body.source();
        while (true) {
            String line = source.readUtf8Line();
            if (line == null || line.contains("[DONE]")) {
                break;
            }
            if (!line.startsWith("data:")) {
                continue;
            }
            String payload = line.substring(5).trim();
            if (StringUtils.isBlank(payload)) {
                continue;
            }
            JSONObject dataObj = JSON.parseObject(payload);
            if (dataObj == null || dataObj.getInteger("code") != 0 || !dataObj.containsKey("choices")) {
                continue;
            }
            JSONArray choices = dataObj.getJSONArray("choices");
            if (choices == null || choices.isEmpty()) {
                continue;
            }
            JSONObject firstChoice = choices.getJSONObject(0);
            if (firstChoice != null) {
                JSONObject delta = firstChoice.getJSONObject("delta");
                if (delta != null && StringUtils.isNotBlank(delta.getString("content"))) {
                    summary.append(delta.getString("content"));
                }
            }
            if (choices.size() > 1) {
                JSONObject secondChoice = choices.getJSONObject(1);
                JSONObject delta = secondChoice == null ? null : secondChoice.getJSONObject("delta");
                JSONArray toolCalls = delta == null ? null : delta.getJSONArray("tool_calls");
                if (toolCalls != null && !toolCalls.isEmpty()) {
                    if (!trace.isEmpty()) {
                        trace.append(",");
                    }
                    trace.append(toolCalls.toJSONString());
                }
            }
        }
    }

    private JSONArray parseToolCalls(String traceContent) {
        if (StringUtils.isBlank(traceContent)) {
            return new JSONArray();
        }
        String normalized = traceContent.trim();
        if (!normalized.startsWith("[")) {
            return new JSONArray();
        }
        normalized = normalized.replace("],[", ",");
        JSONArray toolCalls = JSON.parseArray(normalized);
        if (toolCalls == null) {
            return new JSONArray();
        }
        for (int i = 0; i < toolCalls.size(); i++) {
            JSONObject toolCall = toolCalls.getJSONObject(i);
            if (toolCall != null && !toolCall.containsKey("deskToolName")) {
                toolCall.put("deskToolName", "Web Search");
            }
        }
        return toolCalls;
    }

    public record SearchAugmentation(String summary, String traceJson, boolean failed, String errorMessage) {
        static SearchAugmentation empty() {
            return new SearchAugmentation("", "", false, null);
        }

        static SearchAugmentation failed(String errorMessage) {
            return new SearchAugmentation("", "", true, errorMessage);
        }
    }
}
