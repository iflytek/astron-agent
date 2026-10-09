package com.iflytek.astron.console.hub.service.chat.runtime;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.dto.llm.SparkChatRequest;
import com.iflytek.astron.console.commons.entity.chat.ChatReqRecords;
import com.iflytek.astron.console.commons.service.ChatRecordModelService;
import com.iflytek.astron.console.commons.util.SseEmitterUtil;
import com.iflytek.astron.console.hub.service.agentmemory.runtime.AgentMemoryRuntimeService;
import com.iflytek.astron.console.hub.service.chat.springai.AgentChatTask;
import com.iflytek.astron.console.hub.service.chat.springai.AgentSseBridge;
import com.iflytek.astron.console.toolkit.entity.vo.LLMInfoVo;
import java.io.IOException;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;
import okio.BufferedSource;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/** Relays Console chat and debug turns to the same core-agent executor used by Agent Runtime. */
@Slf4j
@Service
public class CoreAgentChatService {

    private static final MediaType JSON_MEDIA_TYPE =
            MediaType.parse("application/json; charset=utf-8");
    private static final String SPARK_API =
            "https://spark-api-open.xf-yun.com/v1/chat/completions";
    private static final String SAFE_FAILURE = "Failed to process chat request";

    private final OkHttpClient httpClient;
    private final ChatRecordModelService chatRecordModelService;
    private final AgentMemoryRuntimeService agentMemoryRuntimeService;
    private final Executor executor;
    private final String endpoint;
    private final String internalKey;
    private final String consumerAppId;

    public CoreAgentChatService(
            ChatRecordModelService chatRecordModelService,
            AgentMemoryRuntimeService agentMemoryRuntimeService,
            @Qualifier("agentRuntimeExecutor") Executor executor,
            @Value("${agent.runtime.execution-url:http://core-agent:17870/agent/v1/custom/chat/completions}") String endpoint,
            @Value("${workflow.internal-api-key:}") String internalKey,
            @Value("${maas.appId:}") String consumerAppId) {
        this(
                new OkHttpClient(),
                chatRecordModelService,
                agentMemoryRuntimeService,
                executor,
                endpoint,
                internalKey,
                consumerAppId);
    }

    CoreAgentChatService(
            OkHttpClient httpClient,
            ChatRecordModelService chatRecordModelService,
            AgentMemoryRuntimeService agentMemoryRuntimeService,
            Executor executor,
            String endpoint,
            String internalKey,
            String consumerAppId) {
        this.httpClient = httpClient;
        this.chatRecordModelService = chatRecordModelService;
        this.agentMemoryRuntimeService = agentMemoryRuntimeService;
        this.executor = executor;
        this.endpoint = endpoint;
        this.internalKey = internalKey;
        this.consumerAppId = consumerAppId;
    }

    public void chat(AgentChatTask task, SseEmitter emitter, String streamId) {
        AgentSseBridge bridge = new AgentSseBridge(emitter, streamId);
        try {
            CompletableFuture.runAsync(
                    () -> execute(task, bridge, emitter, streamId), executor)
                    .exceptionally(error -> {
                        fail(task, bridge, emitter, streamId, error);
                        return null;
                    });
        } catch (RuntimeException exception) {
            fail(task, bridge, emitter, streamId, exception);
        }
    }

    private void execute(
            AgentChatTask task,
            AgentSseBridge bridge,
            SseEmitter emitter,
            String streamId) {
        requireConfiguration();
        Request request = new Request.Builder()
                .url(endpoint)
                .header("X-Consumer-Username", consumerAppId)
                .header("X-Workflow-Internal-Key", internalKey)
                .post(RequestBody.create(buildRequest(task).toJSONString(), JSON_MEDIA_TYPE))
                .build();
        log.info(
                "Core agent chat start, streamId={}, botId={}, debug={}",
                streamId,
                task.getBotId(),
                task.isDebug());
        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful() || response.body() == null) {
                throw new IllegalStateException(
                        "Core agent returned HTTP " + response.code());
            }
            consume(response.body(), bridge, streamId);
        } catch (IOException exception) {
            throw new IllegalStateException("Core agent request failed", exception);
        }
        persist(task, bridge);
        Long requestId =
                task.getChatReqRecords() == null ? null : task.getChatReqRecords().getId();
        bridge.complete(task.getChatId(), requestId);
        scheduleMemoryWrite(task, bridge.getFinalResult().toString());
        log.info("Core agent chat complete, streamId={}", streamId);
    }

    private void consume(ResponseBody body, AgentSseBridge bridge, String streamId)
            throws IOException {
        BufferedSource source = body.source();
        String line;
        while ((line = source.readUtf8Line()) != null) {
            if (SseEmitterUtil.isStreamStopped(streamId)) {
                return;
            }
            if (!line.startsWith("data: ")) {
                continue;
            }
            String data = line.substring("data: ".length()).trim();
            if (data.isEmpty() || "[DONE]".equals(data)) {
                continue;
            }
            JSONObject payload = JSON.parseObject(data);
            if (payload == null) {
                continue;
            }
            Integer code = payload.getInteger("code");
            if (code != null && code != 0) {
                throw new IllegalStateException("Core agent returned an application error");
            }
            JSONArray choices = payload.getJSONArray("choices");
            if (choices == null || choices.isEmpty()) {
                continue;
            }
            JSONObject firstChoice = choices.getJSONObject(0);
            JSONObject delta = firstChoice == null ? null : firstChoice.getJSONObject("delta");
            if (delta == null) {
                continue;
            }
            bridge.emitReasoning(delta.getString("reasoning_content"));
            bridge.emitContent(delta.getString("content"));
        }
    }

    private JSONObject buildRequest(AgentChatTask task) {
        JSONObject body = new JSONObject();
        body.put("uid", StringUtils.defaultString(task.getUserId()));
        body.put("stream", true);
        body.put("messages", buildMessages(task.getMessages()));
        body.put("model_config", buildModelConfig(task));
        body.put("instruction", buildInstruction(task.getMessages()));
        body.put("plugin", buildPlugin(task));
        body.put("max_loop_count", 10);
        body.put(
                "meta_data",
                new JSONObject()
                        .fluentPut("caller", "console-hub")
                        .fluentPut("caller_sid", StringUtils.defaultString(task.getDebugSessionId()))
                        .fluentPut("run_id", StringUtils.defaultString(task.getDebugSessionId())));
        return body;
    }

    private JSONObject buildModelConfig(AgentChatTask task) {
        LLMInfoVo model = task.getLlmInfoVo();
        if (model == null) {
            return new JSONObject()
                    .fluentPut("domain", StringUtils.defaultIfBlank(task.getSparkModelName(), "generalv3.5"))
                    .fluentPut("api", SPARK_API)
                    .fluentPut("provider", "openai")
                    .fluentPut("api_key", "");
        }
        return new JSONObject()
                .fluentPut("domain", StringUtils.defaultIfBlank(model.getDomain(), model.getServiceId()))
                .fluentPut("api", model.getUrl())
                .fluentPut("provider", StringUtils.defaultString(model.getProvider()))
                .fluentPut("api_key", StringUtils.defaultString(model.getApiKey()));
    }

    private JSONArray buildMessages(List<SparkChatRequest.MessageDto> source) {
        JSONArray messages = new JSONArray();
        if (source == null) {
            return messages;
        }
        for (SparkChatRequest.MessageDto message : source) {
            if (message == null || "system".equalsIgnoreCase(message.getRole())) {
                continue;
            }
            messages.add(new JSONObject()
                    .fluentPut("role", message.getRole())
                    .fluentPut("content", message.getContent()));
        }
        return messages;
    }

    private JSONObject buildInstruction(List<SparkChatRequest.MessageDto> source) {
        String answer = "";
        if (source != null) {
            answer = source.stream()
                    .filter(message -> message != null && "system".equalsIgnoreCase(message.getRole()))
                    .map(SparkChatRequest.MessageDto::getContent)
                    .filter(StringUtils::isNotBlank)
                    .findFirst()
                    .orElse("");
        }
        return new JSONObject().fluentPut("reasoning", "").fluentPut("answer", answer);
    }

    private JSONObject buildPlugin(AgentChatTask task) {
        JSONArray tools = parseArray(task.getTools());
        if (StringUtils.isNotBlank(task.getOpenedTool())) {
            for (String item : task.getOpenedTool().split(",")) {
                if (StringUtils.isNotBlank(item)) {
                    tools.add(item.trim());
                }
            }
        }
        JSONArray workflows = new JSONArray();
        for (Object item : parseArray(task.getWorkflows())) {
            if (item instanceof JSONObject object) {
                String flowId = object.getString("flowId");
                if (StringUtils.isNotBlank(flowId)) {
                    workflows.add(flowId);
                }
            } else if (item != null) {
                workflows.add(item.toString());
            }
        }
        JSONObject plugin = new JSONObject();
        plugin.put("tools", tools);
        plugin.put("mcp_server_ids", List.of());
        plugin.put("mcp_server_urls", parseArray(task.getMcpServerUrls()));
        plugin.put("workflow_ids", workflows);
        plugin.put("knowledge", List.of());
        plugin.put("skills", task.getSkills() == null ? List.of() : task.getSkills());
        return plugin;
    }

    private JSONArray parseArray(String value) {
        if (StringUtils.isBlank(value)) {
            return new JSONArray();
        }
        try {
            JSONArray parsed = JSON.parseArray(value);
            return parsed == null ? new JSONArray() : parsed;
        } catch (RuntimeException exception) {
            log.warn("Ignoring malformed agent plugin configuration");
            return new JSONArray();
        }
    }

    private void requireConfiguration() {
        if (StringUtils.isAnyBlank(endpoint, internalKey, consumerAppId)) {
            throw new IllegalStateException("Core agent execution is not configured");
        }
    }

    private void fail(
            AgentChatTask task,
            AgentSseBridge bridge,
            SseEmitter emitter,
            String streamId,
            Throwable error) {
        log.error(
                "Core agent chat failed, streamId={}, errorType={}",
                streamId,
                error.getClass().getSimpleName());
        try {
            persist(task, bridge);
        } catch (RuntimeException persistError) {
            log.error(
                    "Core agent partial response persistence failed, streamId={}, errorType={}",
                    streamId,
                    persistError.getClass().getSimpleName());
        }
        SseEmitterUtil.completeWithError(
                emitter,
                SAFE_FAILURE + " (streamId: " + StringUtils.defaultString(streamId, "unknown") + ")");
    }

    private void persist(AgentChatTask task, AgentSseBridge bridge) {
        ChatReqRecords request = task.getChatReqRecords();
        if (request == null) {
            return;
        }
        chatRecordModelService.saveChatResponse(
                request, bridge.getFinalResult(), new StringBuffer(), task.isEdit(), 2);
        chatRecordModelService.saveThinkingResult(
                request, bridge.getThinkingResult(), task.isEdit());
    }

    private void scheduleMemoryWrite(AgentChatTask task, String assistantAnswer) {
        try {
            CompletableFuture.runAsync(
                    () -> agentMemoryRuntimeService.writeTurn(task, assistantAnswer), executor);
        } catch (RuntimeException exception) {
            log.warn(
                    "Agent memory write skipped, botId={}, errorType={}",
                    task.getBotId(),
                    exception.getClass().getSimpleName());
        }
    }
}
