package com.iflytek.astron.console.hub.service.chat.springai;

import com.iflytek.astron.console.commons.dto.llm.SparkChatRequest;
import com.iflytek.astron.console.commons.entity.chat.ChatReqRecords;
import com.iflytek.astron.console.commons.entity.chat.ChatTraceSource;
import com.iflytek.astron.console.commons.service.ChatRecordModelService;
import com.iflytek.astron.console.commons.service.data.ChatDataService;
import com.iflytek.astron.console.commons.util.SseEmitterUtil;
import com.iflytek.astron.console.hub.service.agentmemory.runtime.AgentMemoryRuntimeService;
import com.iflytek.astron.console.hub.service.chat.springai.ChatModelFactory.AgentModel;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Runs a standalone-agent chat turn on Spring AI. Tools (web_search / current_time / MCP) are
 * registered as {@link ToolCallback}s and executed internally by the framework (Spring AI's default
 * internal tool execution). The model is streamed asynchronously: the reactive pipeline is
 * subscribed (NOT blocked) so the controller can return the {@link SseEmitter} immediately and
 * chunks are forwarded incrementally; chat records are persisted on completion.
 */
@Slf4j
@Service
public class SpringAiAgentChatService {

    private final ChatModelFactory chatModelFactory;
    private final AgentToolCallbackResolver toolCallbackResolver;
    private final ChatRecordModelService chatRecordModelService;
    private final ChatDataService chatDataService;
    private final AgentMemoryRuntimeService agentMemoryRuntimeService;
    private final Executor agentMemoryExecutor;

    public SpringAiAgentChatService(
            ChatModelFactory chatModelFactory,
            AgentToolCallbackResolver toolCallbackResolver,
            ChatRecordModelService chatRecordModelService,
            ChatDataService chatDataService,
            AgentMemoryRuntimeService agentMemoryRuntimeService,
            @Qualifier("agentMemoryExecutor") Executor agentMemoryExecutor) {
        this.chatModelFactory = chatModelFactory;
        this.toolCallbackResolver = toolCallbackResolver;
        this.chatRecordModelService = chatRecordModelService;
        this.chatDataService = chatDataService;
        this.agentMemoryRuntimeService = agentMemoryRuntimeService;
        this.agentMemoryExecutor = agentMemoryExecutor;
    }

    public void chat(AgentChatTask task, SseEmitter emitter, String streamId) {
        AgentSseBridge bridge = new AgentSseBridge(emitter, streamId);
        ChatToolContext context = new ChatToolContext(task.getUserId());
        try {
            AgentModel agentModel = task.getLlmInfoVo() != null
                    ? chatModelFactory.forCustomModel(task.getLlmInfoVo())
                    : chatModelFactory.forSparkModel(task.getSparkModelName());

            List<ToolCallback> tools = toolCallbackResolver.resolve(task.getOpenedTool(), task.getMcpServerUrls(),
                    task.getSkills(), task.getTools(), task.getWorkflows(), context);
            log.info("Agent chat start, streamId={}, modelId={}, spark={}, toolCount={}, openedTool={}, mcpServerUrls={}, tools={}, workflows={}",
                    streamId, agentModel.modelId(), task.getLlmInfoVo() == null, tools.size(), task.getOpenedTool(),
                    task.getMcpServerUrls(), task.getTools(), task.getWorkflows());

            OpenAiChatOptions options = OpenAiChatOptions.builder()
                    .model(agentModel.modelId())
                    .toolCallbacks(tools)
                    .build();
            Prompt prompt = new Prompt(toMessages(task.getMessages()), options);

            // Subscribe asynchronously: do NOT block the request thread. The controller returns the
            // SseEmitter right after this call, so Spring MVC starts the streaming response and the
            // chunks below are flushed incrementally. Blocking (blockLast) buffers every SSE event
            // until the controller returns, which breaks streaming.
            AtomicInteger chunkCount = new AtomicInteger();
            agentModel.chatModel()
                    .stream(prompt)
                    .takeWhile(resp -> !SseEmitterUtil.isStreamStopped(streamId))
                    .subscribe(
                            resp -> {
                                int n = chunkCount.incrementAndGet();
                                if (n <= 5) {
                                    Generation g = resp.getResult();
                                    String t = g != null && g.getOutput() != null ? g.getOutput().getText() : null;
                                    log.info("agent stream chunk #{}, streamId={}, textLen={}", n, streamId,
                                            t == null ? -1 : t.length());
                                }
                                emitChunk(resp, bridge);
                            },
                            error -> handleStreamError(error, emitter, streamId, task, bridge),
                            () -> {
                                log.info("agent stream complete, streamId={}, totalChunks={}", streamId,
                                        chunkCount.get());
                                bridge.emitToolTrace(context.drainTrace());
                                persist(task, bridge);
                                Long requestId =
                                        task.getChatReqRecords() == null ? null : task.getChatReqRecords().getId();
                                bridge.complete(task.getChatId(), requestId);
                                scheduleMemoryWrite(task, bridge.getFinalResult().toString());
                            });
        } catch (Exception e) {
            log.error("Spring AI agent chat setup failed, streamId: {}", streamId, e);
            SseEmitterUtil.completeWithError(emitter, "Failed to process chat request: " + e.getMessage());
        }
    }

    private void scheduleMemoryWrite(AgentChatTask task, String assistantAnswer) {
        try {
            CompletableFuture.runAsync(
                    () -> agentMemoryRuntimeService.writeTurn(task, assistantAnswer),
                    agentMemoryExecutor)
                    .exceptionally(error -> {
                        log.warn("Agent memory async write failed, botId={}, uid={}, err={}",
                                task.getBotId(), task.getUserId(), error.getMessage());
                        return null;
                    });
        } catch (RejectedExecutionException e) {
            log.warn("Agent memory write skipped because executor is saturated, botId={}, uid={}",
                    task.getBotId(), task.getUserId());
        }
    }

    private void handleStreamError(Throwable e, SseEmitter emitter, String streamId, AgentChatTask task,
            AgentSseBridge bridge) {
        if (e instanceof WebClientResponseException w) {
            log.error("Spring AI agent chat failed (HTTP {}), streamId: {}, responseBody: {}", w.getStatusCode(),
                    streamId, w.getResponseBodyAsString(), e);
        } else {
            log.error("Spring AI agent chat failed, streamId: {}", streamId, e);
        }
        // Persist whatever was generated before the error so the partial reply is not lost.
        try {
            persist(task, bridge);
        } catch (Exception persistError) {
            log.error("Failed to persist partial response after stream error, streamId: {}", streamId, persistError);
        }
        SseEmitterUtil.completeWithError(emitter, "Failed to process chat request: " + e.getMessage());
    }

    private void emitChunk(ChatResponse response, AgentSseBridge bridge) {
        if (response == null) {
            return;
        }
        Generation generation = response.getResult();
        if (generation == null) {
            return;
        }
        AssistantMessage output = generation.getOutput();
        if (output == null) {
            return;
        }
        String text = output.getText();
        if (StringUtils.isNotEmpty(text)) {
            bridge.emitContent(text);
        }
        Map<String, Object> metadata = output.getMetadata();
        if (metadata != null) {
            for (Map.Entry<String, Object> entry : metadata.entrySet()) {
                if (StringUtils.containsIgnoreCase(entry.getKey(), "reasoning")
                        && entry.getValue() instanceof String reasoning && StringUtils.isNotEmpty(reasoning)) {
                    bridge.emitReasoning(reasoning);
                }
            }
        }
    }

    private List<Message> toMessages(List<SparkChatRequest.MessageDto> dtos) {
        List<Message> messages = new ArrayList<>();
        if (dtos == null) {
            return messages;
        }
        for (SparkChatRequest.MessageDto dto : dtos) {
            String role = StringUtils.lowerCase(StringUtils.defaultString(dto.getRole()));
            String content = StringUtils.defaultString(dto.getContent());
            switch (role) {
                case "system" -> messages.add(new SystemMessage(content));
                case "assistant" -> messages.add(new AssistantMessage(content));
                default -> messages.add(new UserMessage(content));
            }
        }
        return messages;
    }

    private void persist(AgentChatTask task, AgentSseBridge bridge) {
        ChatReqRecords req = task.getChatReqRecords();
        if (req == null) {
            return;
        }
        StringBuffer sid = new StringBuffer();
        chatRecordModelService.saveChatResponse(req, bridge.getFinalResult(), sid, task.isEdit(), 2);
        chatRecordModelService.saveThinkingResult(req, bridge.getThinkingResult(), task.isEdit());
        saveTrace(req, bridge, task.isEdit());
    }

    private void saveTrace(ChatReqRecords req, AgentSseBridge bridge, boolean edit) {
        if (bridge.getTraceResult().length() == 0) {
            return;
        }
        String trace = bridge.getTraceResult().toString();
        String type = bridge.isManagedSearchTrace() ? "web_search" : "prompt";
        LocalDateTime now = LocalDateTime.now();
        if (edit) {
            ChatTraceSource existing = chatDataService.findTraceSourceByUidAndChatIdAndReqId(
                    req.getUid(), req.getChatId(), req.getId());
            if (existing != null) {
                existing.setContent(trace);
                existing.setType(type);
                existing.setUpdateTime(now);
                chatDataService.updateTraceSourceByUidAndChatIdAndReqId(existing);
            }
        } else {
            ChatTraceSource source = new ChatTraceSource();
            source.setUid(req.getUid());
            source.setChatId(req.getChatId());
            source.setReqId(req.getId());
            source.setContent(trace);
            source.setType(type);
            source.setCreateTime(now);
            source.setUpdateTime(now);
            chatDataService.createTraceSource(source);
        }
    }
}
