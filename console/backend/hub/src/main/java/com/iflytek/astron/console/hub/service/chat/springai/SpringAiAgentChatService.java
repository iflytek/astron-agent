package com.iflytek.astron.console.hub.service.chat.springai;

import com.iflytek.astron.console.commons.dto.llm.SparkChatRequest;
import com.iflytek.astron.console.commons.entity.chat.ChatReqRecords;
import com.iflytek.astron.console.commons.entity.chat.ChatTraceSource;
import com.iflytek.astron.console.commons.service.ChatRecordModelService;
import com.iflytek.astron.console.commons.service.data.ChatDataService;
import com.iflytek.astron.console.commons.util.SseEmitterUtil;
import com.iflytek.astron.console.hub.service.chat.springai.ChatModelFactory.AgentModel;
import lombok.RequiredArgsConstructor;
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
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Runs a standalone-agent chat turn on Spring AI. Tools (web_search / current_time / MCP) are
 * registered as {@link ToolCallback}s and executed internally by the framework (Spring AI's default
 * internal tool execution); each streamed chunk is forwarded to the legacy SSE contract and chat
 * records are persisted.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SpringAiAgentChatService {

    private final ChatModelFactory chatModelFactory;
    private final AgentToolCallbackResolver toolCallbackResolver;
    private final ChatRecordModelService chatRecordModelService;
    private final ChatDataService chatDataService;

    public void chat(AgentChatTask task, SseEmitter emitter, String streamId) {
        AgentSseBridge bridge = new AgentSseBridge(emitter, streamId);
        try {
            ChatToolContext context = new ChatToolContext(task.getUserId());
            AgentModel agentModel = task.getLlmInfoVo() != null
                    ? chatModelFactory.forCustomModel(task.getLlmInfoVo())
                    : chatModelFactory.forSparkModel(task.getSparkModelName());

            List<ToolCallback> tools = toolCallbackResolver.resolve(task.getOpenedTool(), task.getMcpServerUrls(), context);
            log.info("Agent chat start, streamId={}, modelId={}, spark={}, toolCount={}, openedTool={}, mcpServerUrls={}",
                    streamId, agentModel.modelId(), task.getLlmInfoVo() == null, tools.size(), task.getOpenedTool(),
                    task.getMcpServerUrls());

            // internalToolExecutionEnabled defaults to true: Spring AI executes tool calls internally
            // and streams the final answer. We only forward each chunk to the SSE bridge.
            OpenAiChatOptions options = OpenAiChatOptions.builder()
                    .model(agentModel.modelId())
                    .toolCallbacks(tools)
                    .build();
            Prompt prompt = new Prompt(toMessages(task.getMessages()), options);

            agentModel.chatModel()
                    .stream(prompt)
                    .takeWhile(resp -> !SseEmitterUtil.isStreamStopped(streamId))
                    .doOnNext(resp -> emitChunk(resp, bridge))
                    .blockLast();

            bridge.emitToolTrace(context.drainTrace());
            persist(task, bridge);
            Long requestId = task.getChatReqRecords() == null ? null : task.getChatReqRecords().getId();
            bridge.complete(task.getChatId(), requestId);
        } catch (WebClientResponseException e) {
            log.error("Spring AI agent chat failed (HTTP {}), streamId: {}, responseBody: {}", e.getStatusCode(),
                    streamId, e.getResponseBodyAsString(), e);
            SseEmitterUtil.completeWithError(emitter, "Failed to process chat request: " + e.getMessage());
        } catch (Exception e) {
            log.error("Spring AI agent chat failed, streamId: {}", streamId, e);
            SseEmitterUtil.completeWithError(emitter, "Failed to process chat request: " + e.getMessage());
        }
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
