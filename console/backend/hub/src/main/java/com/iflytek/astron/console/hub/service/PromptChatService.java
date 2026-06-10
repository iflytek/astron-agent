package com.iflytek.astron.console.hub.service;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.service.data.ChatDataService;
import com.iflytek.astron.console.commons.util.SseEmitterUtil;
import com.iflytek.astron.console.commons.entity.chat.ChatReqRecords;
import com.iflytek.astron.console.commons.entity.chat.ChatTraceSource;
import com.iflytek.astron.console.commons.service.ChatRecordModelService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import okhttp3.*;
import okio.BufferedSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * @author mingsuiyongheng
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PromptChatService {
    private static final String PROVIDER_GOOGLE = "google";
    private static final String PROVIDER_ANTHROPIC = "anthropic";
    private static final String OPENAI_SEARCH_TOOL_NAME = "web_search";
    private static final String LEGACY_OPENAI_SEARCH_TOOL_NAME = "ifly_search";
    private static final String CURRENT_TIME_TOOL_NAME = CurrentTimeTool.TOOL_NAME;
    private static final String MANAGED_MCP_TOOLS_FIELD = "managedMcpTools";
    private static final int MAX_OPENAI_TOOL_ROUNDS = 15;
    private static final int MAX_OPENAI_TOOL_CALLS = 15;
    private static final String WEB_SEARCH_DECISION_INSTRUCTION = """
            You have access to a web_search tool. Decide whether to call it.
            Use web_search for questions that require current or recently changed external information, including latest news, prices, policies, schedules, releases, rankings, or status.
            For static knowledge that does not need real-time information, answer directly without using the tool.
            """;
    private static final String CURRENT_TIME_DECISION_INSTRUCTION = """
            You have access to a current_time tool. Decide whether to call it.
            Use current_time for questions about the current date, weekday, time, or timezone.
            For static knowledge that does not need the current time, answer directly without using a tool.
            """;
    private static final String OPENAI_TOOL_DECISION_INSTRUCTION = """
            You have access to current_time and web_search tools. Decide whether to call them.
            Use current_time for questions about the current date, weekday, time, or timezone.
            Use web_search for questions that require current or recently changed external information, including latest news, prices, policies, schedules, releases, rankings, or status.
            For static knowledge that does not need tools, answer directly without using a tool.
            """;
    private static final String MCP_TOOL_DECISION_INSTRUCTION = """
            You have access to configured MCP tools from external servers. Decide whether to call them.
            Use an MCP tool when its name, description, and parameters match the user's request.
            For requests that do not need these external tools, answer directly without using them.
            """;
    private static final MediaType JSON_MEDIA_TYPE = MediaType.get("application/json; charset=utf-8");

    private final OkHttpClient httpClient;

    @Autowired
    private ChatDataService chatDataService;

    @Autowired
    private ChatRecordModelService chatRecordModelService;

    @Autowired
    private ManagedWebSearchService managedWebSearchService;

    @Autowired
    private McpRuntimeToolService mcpRuntimeToolService;

    /**
     * Function to handle chat stream requests
     *
     * @param request HTTP request object
     * @param emitter Server-Sent Events (SSE) emitter
     * @param streamId Stream identifier
     * @param chatReqRecords Chat request records
     */
    public void chatStream(JSONObject request, SseEmitter emitter, String streamId, ChatReqRecords chatReqRecords, boolean edit, boolean isDebug) {
        if (!isDebug && (chatReqRecords == null || chatReqRecords.getUid() == null || chatReqRecords.getChatId() == null)) {
            SseEmitterUtil.completeWithError(emitter, "Message is empty");
            return;
        }

        try {
            performChatRequest(request, emitter, streamId, chatReqRecords, edit, isDebug);
        } catch (Exception e) {
            log.error("Exception occurred while creating Prompt chat stream, streamId: {}", streamId, e);
            SseEmitterUtil.completeWithError(emitter, "Failed to create chat stream: " + e.getMessage());
        }
    }

    /**
     * Function to execute chat request
     *
     * @param request JSON object containing chat request
     * @param emitter SseEmitter object for sending events
     * @param streamId Unique identifier of the stream
     * @param chatReqRecords Chat request records
     * @param edit Whether in edit mode
     * @param isDebug Whether in debug mode
     * @throws IOException If HTTP request fails
     */
    private void performChatRequest(JSONObject request, SseEmitter emitter, String streamId, ChatReqRecords chatReqRecords, boolean edit, boolean isDebug) throws IOException {
        String provider = normalizeProvider(request.getString("provider"));
        ensureManagedToolsForOpenAiCompatibleProvider(provider, request);
        ensureMcpToolsForOpenAiCompatibleProvider(provider, request);
        boolean shouldHandleOpenAiFunctionTools = shouldHandleOpenAiFunctionToolCall(provider, request);
        JSONObject fallbackRequest = null;
        if (shouldHandleOpenAiFunctionTools) {
            fallbackRequest = JSON.parseObject(request.toJSONString());
            applyToolDecisionInstruction(request);
        } else if (hasWebSearchCapability(request)) {
            applyWebSearchDecisionInstruction(request);
        }
        if (shouldHandleOpenAiFunctionTools
                && handleOpenAiFunctionToolCall(request, fallbackRequest, emitter, streamId, chatReqRecords, edit, isDebug, provider)) {
            return;
        }
        PreparedRequest preparedRequest = buildPreparedRequest(request, provider);
        Request httpRequest = buildHttpRequest(request, preparedRequest, provider);

        Call call = httpClient.newCall(httpRequest);
        log.info("request:{}", request);

        call.enqueue(new Callback() {
            /**
             * Callback method when SSE connection fails
             *
             * @param call Current Call object
             * @param e IOException exception thrown
             */
            @Override
            public void onFailure(Call call, IOException e) {
                log.error("SSE connection failed, streamId: {}, error: {}", streamId, e.getMessage());
                SseEmitterUtil.completeWithError(emitter, "Connection failed: " + e.getMessage());
            }

            /**
             * Response callback method
             *
             * @param call HTTP call object
             * @param response HTTP response object
             */
            @Override
            public void onResponse(Call call, Response response) {
                if (!response.isSuccessful()) {
                    log.error("Request failed, streamId: {}, status code: {}, reason: {}", streamId, response.code(), response.message());
                    SseEmitterUtil.completeWithError(emitter, "Request failed: " + response.message());
                    return;
                }

                ResponseBody body = response.body();
                if (body != null) {
                    processSSEStream(body, emitter, streamId, chatReqRecords, edit, isDebug, provider,
                            request.getString("managedSearchTrace"));
                } else {
                    SseEmitterUtil.completeWithError(emitter, "Response body is empty");
                }
            }
        });
    }

    /**
     * Process Server-Sent Events (SSE) stream.
     *
     * @param body HTTP response body containing SSE stream data
     * @param emitter SseEmitter object for sending events to client
     * @param streamId Unique identifier of the stream being processed
     * @param chatReqRecords Chat request records object
     */
    private void processSSEStream(ResponseBody body, SseEmitter emitter, String streamId, ChatReqRecords chatReqRecords,
            boolean edit, boolean isDebug, String provider, String managedSearchTrace) {
        BufferedSource source = body.source();
        StringBuffer finalResult = new StringBuffer();
        StringBuffer thinkingResult = new StringBuffer();
        StringBuffer sid = new StringBuffer();
        StringBuffer traceResult = new StringBuffer();
        boolean streamEnded = false;

        if (StringUtils.isNotBlank(managedSearchTrace)) {
            traceResult.append(managedSearchTrace);
            emitManagedSearchToolCalls(emitter, streamId, managedSearchTrace);
        }

        try (body) {
            try {
                MediaType contentType = body.contentType();
                String contentTypeStr = contentType != null ? contentType.toString() : "";
                if (!contentTypeStr.contains("text/event-stream")) {
                    String payload = body.string();
                    if (StringUtils.isNotBlank(payload)) {
                        parseSSEContent(payload, emitter, streamId, finalResult, thinkingResult, sid, traceResult, provider);
                    }
                    handleStreamComplete(emitter, streamId, finalResult, thinkingResult, chatReqRecords, sid, traceResult, edit, isDebug,
                            StringUtils.isNotBlank(managedSearchTrace));
                    return;
                }

                while (true) {
                    // Check if stop signal is received
                    if (SseEmitterUtil.isStreamStopped(streamId)) {
                        log.info("Stop signal detected, saving collected data, streamId: {}", streamId);
                        handleStreamInterrupted(emitter, streamId, finalResult, thinkingResult, chatReqRecords, sid, traceResult, edit, isDebug,
                                StringUtils.isNotBlank(managedSearchTrace));
                        streamEnded = true;
                        break;
                    }

                    String line = source.readUtf8Line();
                    if (line == null) {
                        handleStreamComplete(emitter, streamId, finalResult, thinkingResult, chatReqRecords, sid, traceResult, edit, isDebug,
                                StringUtils.isNotBlank(managedSearchTrace));
                        streamEnded = true;
                        break;
                    }

                    if (line.startsWith("data:")) {
                        if (line.contains("[DONE]")) {
                            handleStreamComplete(emitter, streamId, finalResult, thinkingResult, chatReqRecords, sid, traceResult, edit, isDebug,
                                    StringUtils.isNotBlank(managedSearchTrace));
                            streamEnded = true;
                            break;
                        }

                        String data = line.substring(5).trim();
                        parseSSEContent(data, emitter, streamId, finalResult, thinkingResult, sid, traceResult, provider);

                        // Check stop signal again after processing each data
                        if (SseEmitterUtil.isStreamStopped(streamId)) {
                            log.info("Stop signal detected after processing data, saving collected data, streamId: {}", streamId);
                            handleStreamInterrupted(emitter, streamId, finalResult, thinkingResult, chatReqRecords, sid, traceResult, edit, isDebug,
                                    StringUtils.isNotBlank(managedSearchTrace));
                            streamEnded = true;
                            break;
                        }
                    }
                }
            } catch (IOException e) {
                log.error("Exception reading SSE stream data, saving collected data, streamId: {}", streamId, e);
                // Save collected data even when exception occurs
                handleStreamInterrupted(emitter, streamId, finalResult, thinkingResult, chatReqRecords, sid, traceResult, edit, isDebug,
                        StringUtils.isNotBlank(managedSearchTrace));
                SseEmitterUtil.completeWithError(emitter, "Data reading exception: " + e.getMessage());
                streamEnded = true;
            }
        } catch (Exception e) {
            log.warn("Exception closing response body, streamId: {}", streamId, e);
            // Save collected data when exception occurs
            handleStreamInterrupted(emitter, streamId, finalResult, thinkingResult, chatReqRecords, sid, traceResult, edit, isDebug,
                    StringUtils.isNotBlank(managedSearchTrace));
            streamEnded = true;
        }

        if (!streamEnded) {
            handleStreamComplete(emitter, streamId, finalResult, thinkingResult, chatReqRecords, sid, traceResult, edit, isDebug,
                    StringUtils.isNotBlank(managedSearchTrace));
        }
    }

    private boolean shouldHandleOpenAiFunctionToolCall(String provider, JSONObject request) {
        if (PROVIDER_GOOGLE.equals(provider) || PROVIDER_ANTHROPIC.equals(provider)) {
            return false;
        }
        return hasOpenAiManagedTool(request.getJSONArray("tools")) || hasMcpRuntimeTool(request);
    }

    private boolean hasOpenAiManagedTool(JSONArray tools) {
        if (tools == null || tools.isEmpty()) {
            return false;
        }
        for (int i = 0; i < tools.size(); i++) {
            JSONObject tool = tools.getJSONObject(i);
            JSONObject function = tool == null ? null : tool.getJSONObject("function");
            if (function != null && isManagedToolName(function.getString("name"))) {
                return true;
            }
        }
        return false;
    }

    private boolean hasOpenAiSearchTool(JSONArray tools) {
        if (tools == null || tools.isEmpty()) {
            return false;
        }
        for (int i = 0; i < tools.size(); i++) {
            JSONObject tool = tools.getJSONObject(i);
            JSONObject function = tool == null ? null : tool.getJSONObject("function");
            if (function != null && isSearchToolName(function.getString("name"))) {
                return true;
            }
        }
        return false;
    }

    private boolean hasOpenAiCurrentTimeTool(JSONArray tools) {
        if (tools == null || tools.isEmpty()) {
            return false;
        }
        for (int i = 0; i < tools.size(); i++) {
            JSONObject tool = tools.getJSONObject(i);
            JSONObject function = tool == null ? null : tool.getJSONObject("function");
            if (function != null && isCurrentTimeToolName(function.getString("name"))) {
                return true;
            }
        }
        return false;
    }

    private boolean hasMcpRuntimeTool(JSONObject request) {
        JSONArray mcpTools = request == null ? null : request.getJSONArray(MANAGED_MCP_TOOLS_FIELD);
        return mcpTools != null && !mcpTools.isEmpty();
    }

    private void ensureManagedToolsForOpenAiCompatibleProvider(String provider, JSONObject request) {
        if (!request.getBooleanValue("managedWebSearch")
                || PROVIDER_GOOGLE.equals(provider)
                || PROVIDER_ANTHROPIC.equals(provider)) {
            return;
        }
        JSONArray tools = request.getJSONArray("tools");
        if (tools == null) {
            tools = new JSONArray();
            request.put("tools", tools);
        }
        if (!hasOpenAiSearchTool(tools)) {
            tools.add(buildOpenAiSearchFunctionTool());
        }
        if (!hasOpenAiCurrentTimeTool(tools)) {
            tools.add(buildOpenAiCurrentTimeFunctionTool());
        }
        if (StringUtils.isBlank(request.getString("tool_choice"))
                && StringUtils.isBlank(request.getString("toolChoice"))) {
            request.put("tool_choice", "auto");
        }
    }

    private void ensureMcpToolsForOpenAiCompatibleProvider(String provider, JSONObject request) throws IOException {
        if (PROVIDER_GOOGLE.equals(provider) || PROVIDER_ANTHROPIC.equals(provider)) {
            return;
        }
        List<String> mcpServerUrls = parseMcpServerUrls(request.get("mcpServerUrls"));
        if (mcpServerUrls.isEmpty()) {
            return;
        }
        if (mcpRuntimeToolService == null) {
            throw new IOException("MCP runtime tool service is unavailable");
        }
        List<McpRuntimeToolService.McpRuntimeTool> mcpTools = mcpRuntimeToolService.listTools(mcpServerUrls);
        if (mcpTools.isEmpty()) {
            log.warn("No MCP tools available from configured server URLs: {}", mcpServerUrls);
            return;
        }
        JSONArray tools = request.getJSONArray("tools");
        if (tools == null) {
            tools = new JSONArray();
            request.put("tools", tools);
        }
        JSONArray registry = new JSONArray();
        for (McpRuntimeToolService.McpRuntimeTool mcpTool : mcpTools) {
            if (mcpTool == null || StringUtils.isBlank(mcpTool.functionName())) {
                continue;
            }
            tools.add(new JSONObject()
                    .fluentPut("type", "function")
                    .fluentPut("function", new JSONObject()
                            .fluentPut("name", mcpTool.functionName())
                            .fluentPut("description", mcpTool.description())
                            .fluentPut("parameters", mcpTool.inputSchema())));
            registry.add(mcpTool.toJson());
        }
        if (!registry.isEmpty()) {
            request.put(MANAGED_MCP_TOOLS_FIELD, registry);
            if (StringUtils.isBlank(request.getString("tool_choice"))
                    && StringUtils.isBlank(request.getString("toolChoice"))) {
                request.put("tool_choice", "auto");
            }
        }
    }

    private JSONObject buildOpenAiSearchFunctionTool() {
        JSONObject properties = new JSONObject()
                .fluentPut("query", new JSONObject()
                        .fluentPut("type", "string")
                        .fluentPut("description", "A precise web search query based on the user's request."));
        JSONArray required = new JSONArray();
        required.add("query");
        return buildOpenAiFunctionTool(
                OPENAI_SEARCH_TOOL_NAME,
                "Search the live web for up-to-date external information. Use this for recent events, latest facts, prices, policies, schedules, releases, rankings, or status.",
                properties,
                required);
    }

    private JSONObject buildOpenAiCurrentTimeFunctionTool() {
        JSONObject properties = new JSONObject()
                .fluentPut("timezone", new JSONObject()
                        .fluentPut("type", "string")
                        .fluentPut("description", "IANA timezone name. Defaults to Asia/Shanghai."));
        return buildOpenAiFunctionTool(
                CURRENT_TIME_TOOL_NAME,
                "Get the current date, time, weekday, timezone, and ISO timestamp. Use this for questions about today, now, the current date, or the current weekday.",
                properties,
                new JSONArray());
    }

    private JSONObject buildOpenAiFunctionTool(String name, String description, JSONObject properties, JSONArray requiredFields) {
        JSONObject parameters = new JSONObject()
                .fluentPut("type", "object")
                .fluentPut("properties", properties)
                .fluentPut("required", requiredFields)
                .fluentPut("additionalProperties", false);
        return new JSONObject()
                .fluentPut("type", "function")
                .fluentPut("function", new JSONObject()
                        .fluentPut("name", name)
                        .fluentPut("description", description)
                        .fluentPut("parameters", parameters));
    }

    private boolean hasWebSearchCapability(JSONObject request) {
        if (request.getBooleanValue("managedWebSearch")) {
            return true;
        }
        JSONArray tools = request.getJSONArray("tools");
        if (tools == null || tools.isEmpty()) {
            return false;
        }
        for (int i = 0; i < tools.size(); i++) {
            JSONObject tool = tools.getJSONObject(i);
            if (tool == null) {
                continue;
            }
            if (tool.containsKey("google_search")) {
                return true;
            }
            String type = tool.getString("type");
            String name = tool.getString("name");
            if (StringUtils.containsIgnoreCase(type, "web_search") || isSearchToolName(name)) {
                return true;
            }
            JSONObject function = tool.getJSONObject("function");
            if (function != null && isSearchToolName(function.getString("name"))) {
                return true;
            }
        }
        return false;
    }

    private boolean isSearchToolName(String name) {
        return StringUtils.equals(name, OPENAI_SEARCH_TOOL_NAME)
                || StringUtils.equals(name, LEGACY_OPENAI_SEARCH_TOOL_NAME);
    }

    private boolean isCurrentTimeToolName(String name) {
        return StringUtils.equals(name, CURRENT_TIME_TOOL_NAME);
    }

    private boolean isManagedToolName(String name) {
        return isSearchToolName(name) || isCurrentTimeToolName(name);
    }

    private void applyToolDecisionInstruction(JSONObject request) {
        JSONArray tools = request.getJSONArray("tools");
        boolean hasSearchTool = hasOpenAiSearchTool(tools);
        boolean hasCurrentTimeTool = hasOpenAiCurrentTimeTool(tools);
        boolean hasMcpTool = hasMcpRuntimeTool(request);
        if (hasSearchTool && hasCurrentTimeTool) {
            applyDecisionInstruction(request, OPENAI_TOOL_DECISION_INSTRUCTION, "current_time and web_search tools");
        } else if (hasCurrentTimeTool) {
            applyDecisionInstruction(request, CURRENT_TIME_DECISION_INSTRUCTION, "current_time tool");
        } else if (hasSearchTool) {
            applyDecisionInstruction(request, WEB_SEARCH_DECISION_INSTRUCTION, "web_search tool");
        }
        if (hasMcpTool) {
            applyDecisionInstruction(request, MCP_TOOL_DECISION_INSTRUCTION, "configured MCP tools");
        }
    }

    private void applyWebSearchDecisionInstruction(JSONObject request) {
        applyDecisionInstruction(request, WEB_SEARCH_DECISION_INSTRUCTION, "web_search tool");
    }

    private void applyDecisionInstruction(JSONObject request, String instruction, String marker) {
        JSONArray messages = request.getJSONArray("messages");
        if (messages == null || messages.isEmpty()) {
            return;
        }

        JSONObject firstSystemMessage = null;
        for (int i = 0; i < messages.size(); i++) {
            JSONObject message = messages.getJSONObject(i);
            if (message != null && "system".equals(normalizeMessageRole(message.getString("role")))) {
                firstSystemMessage = message;
                break;
            }
        }

        if (firstSystemMessage == null) {
            messages.add(0, new JSONObject()
                    .fluentPut("role", "system")
                    .fluentPut("content", instruction));
        } else {
            String content = StringUtils.defaultString(firstSystemMessage.getString("content"));
            if (!StringUtils.contains(content, marker)) {
                firstSystemMessage.put("content", instruction + "\n" + content);
            }
        }
        request.put("messages", messages);
    }

    private boolean handleOpenAiFunctionToolCall(JSONObject request, JSONObject fallbackRequest, SseEmitter emitter, String streamId,
            ChatReqRecords chatReqRecords, boolean edit, boolean isDebug, String provider) throws IOException {
        JSONObject loopRequest = JSON.parseObject(request.toJSONString());
        JSONArray managedSearchTrace = new JSONArray();
        Set<String> seenToolCalls = new HashSet<>();
        int executedToolCalls = 0;
        boolean toolExecuted = false;

        for (int round = 0; round < MAX_OPENAI_TOOL_ROUNDS; round++) {
            loopRequest.put("stream", false);

            JSONObject planningResponse;
            try {
                planningResponse = executeJsonRequest(loopRequest, provider);
            } catch (Exception e) {
                if (!toolExecuted) {
                    log.warn("OpenAI-compatible tool planning failed, fallback to normal request, streamId: {}, error: {}", streamId, e.getMessage());
                    if (fallbackRequest != null) {
                        request.clear();
                        request.putAll(fallbackRequest);
                    }
                    stripToolFields(request);
                    return false;
                }
                log.warn("OpenAI-compatible tool loop failed after tool execution, streamId: {}, error: {}", streamId, e.getMessage());
                SseEmitterUtil.completeWithError(emitter, "Tool call failed: " + e.getMessage());
                return true;
            }

            JSONArray toolCalls = extractAssistantToolCalls(planningResponse);
            if (toolCalls == null || toolCalls.isEmpty()) {
                JSONObject finalRequest = buildOpenAiFinalStreamingRequest(
                        loopRequest,
                        fallbackRequest,
                        toolExecuted);
                streamOpenAiFinalResponse(
                        finalRequest,
                        emitter,
                        streamId,
                        chatReqRecords,
                        edit,
                        isDebug,
                        provider,
                        managedSearchTrace);
                return true;
            }

            ManagedToolBatchResult batchResult = executeManagedTools(
                    toolCalls,
                    loopRequest,
                    chatReqRecords,
                    seenToolCalls,
                    MAX_OPENAI_TOOL_CALLS - executedToolCalls,
                    resolveAllowedManagedToolNames(loopRequest),
                    resolveMcpRuntimeTools(loopRequest));
            appendTraceEntries(managedSearchTrace, batchResult.traceEntries());
            appendToolMessages(loopRequest, extractAssistantMessage(planningResponse), toolCalls, batchResult.outputs());
            executedToolCalls += batchResult.executedToolCalls();
            toolExecuted = toolExecuted || batchResult.executedToolCalls() > 0;

            if (batchResult.limitExceeded()) {
                return completeToolLoopStopped(
                        loopRequest,
                        emitter,
                        streamId,
                        chatReqRecords,
                        edit,
                        isDebug,
                        provider,
                        managedSearchTrace,
                        "TOOL_CALL_LIMIT_EXCEEDED",
                        "The tool call budget for this user message has been exhausted after " + MAX_OPENAI_TOOL_CALLS + " tool calls.");
            }
            if (batchResult.duplicateDetected()) {
                return completeToolLoopStopped(
                        loopRequest,
                        emitter,
                        streamId,
                        chatReqRecords,
                        edit,
                        isDebug,
                        provider,
                        managedSearchTrace,
                        "DUPLICATE_TOOL_CALL",
                        "A duplicate tool call was detected and skipped to prevent a loop.");
            }
        }

        return completeToolLoopStopped(
                loopRequest,
                emitter,
                streamId,
                chatReqRecords,
                edit,
                isDebug,
                provider,
                managedSearchTrace,
                "TOOL_ROUND_LIMIT_EXCEEDED",
                "The tool round budget for this user message has been exhausted after " + MAX_OPENAI_TOOL_ROUNDS + " rounds.");
    }

    private JSONObject executeJsonRequest(JSONObject request, String provider) throws IOException {
        PreparedRequest preparedRequest = buildPreparedRequest(request, provider);
        Request httpRequest = buildHttpRequest(request, preparedRequest, provider);
        try (Response response = httpClient.newCall(httpRequest).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Request failed: " + response.message());
            }
            ResponseBody body = response.body();
            if (body == null) {
                throw new IOException("Response body is empty");
            }
            return JSON.parseObject(body.string());
        }
    }

    private JSONObject buildOpenAiFinalStreamingRequest(JSONObject loopRequest, JSONObject fallbackRequest, boolean toolExecuted) {
        JSONObject finalRequest = !toolExecuted && fallbackRequest != null
                ? JSON.parseObject(fallbackRequest.toJSONString())
                : JSON.parseObject(loopRequest.toJSONString());
        stripToolFields(finalRequest);
        finalRequest.put("stream", true);
        if (toolExecuted) {
            appendToolFinalAnswerInstruction(finalRequest);
        }
        return finalRequest;
    }

    private void appendToolFinalAnswerInstruction(JSONObject request) {
        JSONArray messages = request.getJSONArray("messages");
        if (messages == null) {
            messages = new JSONArray();
            request.put("messages", messages);
        }
        String instruction = "Tool results have been provided in the conversation. Produce the final answer from the available information.";
        for (int i = 0; i < messages.size(); i++) {
            JSONObject messageObj = messages.getJSONObject(i);
            if (messageObj != null && "system".equals(normalizeMessageRole(messageObj.getString("role")))) {
                messageObj.put("content", appendPrompt(messageObj.getString("content"), instruction));
                return;
            }
        }
        messages.add(0, new JSONObject()
                .fluentPut("role", "system")
                .fluentPut("content", instruction));
    }

    private void streamOpenAiFinalResponse(JSONObject request, SseEmitter emitter, String streamId,
            ChatReqRecords chatReqRecords, boolean edit, boolean isDebug, String provider, JSONArray managedSearchTrace) {
        String traceJson = managedSearchTrace == null || managedSearchTrace.isEmpty() ? "" : managedSearchTrace.toJSONString();
        PreparedRequest preparedRequest = buildPreparedRequest(request, provider);
        Request httpRequest = buildHttpRequest(request, preparedRequest, provider);
        httpClient.newCall(httpRequest).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                log.error("OpenAI-compatible final stream failed, streamId: {}, error: {}", streamId, e.getMessage());
                SseEmitterUtil.completeWithError(emitter, "Connection failed: " + e.getMessage());
            }

            @Override
            public void onResponse(Call call, Response response) {
                if (!response.isSuccessful()) {
                    log.error("OpenAI-compatible final stream request failed, streamId: {}, status code: {}, reason: {}",
                            streamId, response.code(), response.message());
                    SseEmitterUtil.completeWithError(emitter, "Request failed: " + response.message());
                    return;
                }

                ResponseBody body = response.body();
                if (body != null) {
                    processSSEStream(body, emitter, streamId, chatReqRecords, edit, isDebug, provider, traceJson);
                } else {
                    SseEmitterUtil.completeWithError(emitter, "Response body is empty");
                }
            }
        });
    }

    private Request buildHttpRequest(JSONObject request, PreparedRequest preparedRequest, String provider) {
        Request.Builder requestBuilder = new Request.Builder()
                .url(preparedRequest.url())
                .post(RequestBody.create(preparedRequest.body(), JSON_MEDIA_TYPE))
                .addHeader("Content-Type", "application/json")
                .addHeader("Accept", preparedRequest.accept());

        if (PROVIDER_GOOGLE.equals(provider)) {
            requestBuilder.addHeader("x-goog-api-key", request.getString("apiKey"));
        } else if (PROVIDER_ANTHROPIC.equals(provider)) {
            requestBuilder.addHeader("x-api-key", request.getString("apiKey"));
            requestBuilder.addHeader("anthropic-version", "2023-06-01");
            if (StringUtils.isNotBlank(request.getString("anthropicBeta"))) {
                requestBuilder.addHeader("anthropic-beta", request.getString("anthropicBeta"));
            }
        } else {
            requestBuilder.addHeader("Authorization", "Bearer " + request.getString("apiKey"));
        }
        return requestBuilder.build();
    }

    private JSONArray extractAssistantToolCalls(JSONObject response) {
        JSONObject message = extractAssistantMessage(response);
        return message == null ? null : message.getJSONArray("tool_calls");
    }

    private JSONObject extractAssistantMessage(JSONObject response) {
        if (response == null) {
            return null;
        }
        JSONArray choices = response.getJSONArray("choices");
        if (choices == null || choices.isEmpty()) {
            return null;
        }
        JSONObject firstChoice = choices.getJSONObject(0);
        return firstChoice == null ? null : firstChoice.getJSONObject("message");
    }

    private String extractAssistantContent(JSONObject response) {
        JSONObject message = extractAssistantMessage(response);
        return message == null ? "" : StringUtils.defaultString(message.getString("content"));
    }

    private JSONObject normalizeSynchronousOpenAiResponse(JSONObject response) {
        if (response == null) {
            return null;
        }
        JSONObject normalized = new JSONObject();
        if (StringUtils.isNotBlank(response.getString("id"))) {
            normalized.put("id", response.getString("id"));
        }
        JSONArray choices = response.getJSONArray("choices");
        if (choices == null || choices.isEmpty()) {
            return normalized;
        }
        JSONObject firstChoice = choices.getJSONObject(0);
        JSONObject message = firstChoice == null ? null : firstChoice.getJSONObject("message");
        String content = message == null ? "" : message.getString("content");
        JSONArray normalizedChoices = new JSONArray();
        normalizedChoices.add(new JSONObject()
                .fluentPut("delta", new JSONObject().fluentPut("content", StringUtils.defaultString(content))));
        normalized.put("choices", normalizedChoices);
        return normalized;
    }

    private void emitSynchronousOpenAiResponse(JSONObject response, SseEmitter emitter, String streamId,
            ChatReqRecords chatReqRecords, boolean edit, boolean isDebug, JSONArray managedSearchTrace) {
        String traceJson = managedSearchTrace == null || managedSearchTrace.isEmpty() ? "" : managedSearchTrace.toJSONString();
        if (StringUtils.isNotBlank(traceJson)) {
            emitManagedSearchToolCalls(emitter, streamId, traceJson);
        }
        JSONObject normalizedData = normalizeSynchronousOpenAiResponse(response);
        StringBuffer finalResult = new StringBuffer(extractAssistantContent(response));
        StringBuffer thinkingResult = new StringBuffer();
        StringBuffer sid = new StringBuffer(StringUtils.defaultString(response == null ? null : response.getString("id")));
        StringBuffer traceResult = new StringBuffer(traceJson);
        if (normalizedData != null) {
            tryServeSSEData(emitter, normalizedData, streamId);
        }
        handleStreamComplete(emitter, streamId, finalResult, thinkingResult, chatReqRecords, sid, traceResult, edit, isDebug,
                StringUtils.isNotBlank(traceJson));
    }

    private boolean completeToolLoopStopped(JSONObject loopRequest, SseEmitter emitter, String streamId,
            ChatReqRecords chatReqRecords, boolean edit, boolean isDebug, String provider, JSONArray managedSearchTrace,
            String code, String message) throws IOException {
        appendToolLoopStopInstruction(loopRequest, code, message);
        stripToolFields(loopRequest);
        loopRequest.put("stream", true);
        try {
            streamOpenAiFinalResponse(loopRequest, emitter, streamId, chatReqRecords, edit, isDebug, provider, managedSearchTrace);
        } catch (Exception e) {
            log.warn("OpenAI-compatible final answer after tool loop stop failed, streamId: {}, code: {}, error: {}",
                    streamId, code, e.getMessage());
            SseEmitterUtil.completeWithError(emitter, code + ": " + e.getMessage());
        }
        return true;
    }

    private void appendToolLoopStopInstruction(JSONObject request, String code, String message) {
        JSONArray messages = request.getJSONArray("messages");
        if (messages == null) {
            messages = new JSONArray();
            request.put("messages", messages);
        }
        String instruction = """
                Tool execution stopped with code %s.
                %s
                Use only the available tool results already present in the conversation. If the available results are insufficient, say that the answer is incomplete.
                """.formatted(code, message);
        for (int i = 0; i < messages.size(); i++) {
            JSONObject messageObj = messages.getJSONObject(i);
            if (messageObj != null && "system".equals(normalizeMessageRole(messageObj.getString("role")))) {
                messageObj.put("content", appendPrompt(messageObj.getString("content"), instruction));
                return;
            }
        }
        messages.add(0, new JSONObject()
                .fluentPut("role", "system")
                .fluentPut("content", instruction));
    }

    private void stripToolFields(JSONObject request) {
        request.remove("tools");
        request.remove("toolChoice");
        request.remove("tool_choice");
        request.remove("mcpServerUrls");
        request.remove(MANAGED_MCP_TOOLS_FIELD);
    }

    private ManagedToolBatchResult executeManagedTools(JSONArray toolCalls, JSONObject request, ChatReqRecords chatReqRecords,
            Set<String> seenToolCalls, int remainingToolCallBudget, Set<String> allowedToolNames,
            Map<String, McpRuntimeToolService.McpRuntimeTool> mcpRuntimeTools) {
        List<ManagedToolOutput> outputs = new ArrayList<>();
        JSONArray traceEntries = new JSONArray();
        boolean limitExceeded = false;
        boolean duplicateDetected = false;
        int executedToolCalls = 0;

        for (int i = 0; i < toolCalls.size(); i++) {
            JSONObject toolCall = toolCalls.getJSONObject(i);
            JSONObject function = toolCall == null ? null : toolCall.getJSONObject("function");
            if (function == null) {
                continue;
            }
            String toolCallId = toolCall.getString("id");
            String toolName = function.getString("name");
            JSONObject arguments = parseToolArguments(function.getString("arguments"));

            if (allowedToolNames == null || !allowedToolNames.contains(toolName)) {
                outputs.add(new ManagedToolOutput(toolCallId, buildToolErrorContent("TOOL_NOT_AVAILABLE", "Tool was not provided for this request: " + toolName)));
                continue;
            }

            McpRuntimeToolService.McpRuntimeTool mcpRuntimeTool = mcpRuntimeTools.get(toolName);
            if (!isManagedToolName(toolName) && mcpRuntimeTool == null) {
                outputs.add(new ManagedToolOutput(toolCallId, buildToolErrorContent("UNSUPPORTED_TOOL", "Unsupported tool: " + toolName)));
                continue;
            }

            String signature = toolName + ":" + arguments.toJSONString();
            if (seenToolCalls.contains(signature)) {
                duplicateDetected = true;
                outputs.add(new ManagedToolOutput(toolCallId, buildToolErrorContent("DUPLICATE_TOOL_CALL", "Duplicate tool call skipped: " + toolName)));
                continue;
            }

            if (remainingToolCallBudget <= 0) {
                limitExceeded = true;
                outputs.add(new ManagedToolOutput(toolCallId, buildToolErrorContent(
                        "TOOL_CALL_LIMIT_EXCEEDED",
                        "Tool call budget exhausted for this user message.")));
                continue;
            }

            seenToolCalls.add(signature);
            remainingToolCallBudget--;
            executedToolCalls++;

            if (isSearchToolName(toolName)) {
                ManagedToolOutput output = executeSearchTool(toolCallId, arguments, request, chatReqRecords, traceEntries);
                outputs.add(output);
            } else if (isCurrentTimeToolName(toolName)) {
                outputs.add(new ManagedToolOutput(toolCallId, CurrentTimeTool.execute(arguments.getString("timezone"))));
            } else if (mcpRuntimeTool != null) {
                outputs.add(executeMcpTool(toolCallId, mcpRuntimeTool, arguments, traceEntries));
            }
        }

        return new ManagedToolBatchResult(outputs, traceEntries, executedToolCalls, limitExceeded, duplicateDetected);
    }

    private Set<String> resolveAllowedManagedToolNames(JSONObject request) {
        Set<String> allowedToolNames = new HashSet<>();
        JSONArray tools = request.getJSONArray("tools");
        if (tools == null || tools.isEmpty()) {
            return allowedToolNames;
        }
        for (int i = 0; i < tools.size(); i++) {
            JSONObject tool = tools.getJSONObject(i);
            JSONObject function = tool == null ? null : tool.getJSONObject("function");
            if (function == null) {
                continue;
            }
            String name = function.getString("name");
            if (isManagedToolName(name)) {
                allowedToolNames.add(name);
            }
        }
        allowedToolNames.addAll(resolveMcpRuntimeTools(request).keySet());
        return allowedToolNames;
    }

    private Map<String, McpRuntimeToolService.McpRuntimeTool> resolveMcpRuntimeTools(JSONObject request) {
        Map<String, McpRuntimeToolService.McpRuntimeTool> runtimeTools = new LinkedHashMap<>();
        JSONArray registry = request == null ? null : request.getJSONArray(MANAGED_MCP_TOOLS_FIELD);
        if (registry == null || registry.isEmpty()) {
            return runtimeTools;
        }
        for (int i = 0; i < registry.size(); i++) {
            McpRuntimeToolService.McpRuntimeTool tool = McpRuntimeToolService.McpRuntimeTool.fromJson(registry.getJSONObject(i));
            if (tool != null && StringUtils.isNotBlank(tool.functionName())) {
                runtimeTools.put(tool.functionName(), tool);
            }
        }
        return runtimeTools;
    }

    private ManagedToolOutput executeSearchTool(String toolCallId, JSONObject arguments, JSONObject request,
            ChatReqRecords chatReqRecords, JSONArray traceEntries) {
        String query = StringUtils.defaultIfBlank(arguments.getString("query"), resolveLatestUserQuery(request.getJSONArray("messages")));
        String userId = StringUtils.defaultIfBlank(
                chatReqRecords == null ? request.getString("userId") : chatReqRecords.getUid(),
                "managed-web-search");
        ManagedWebSearchService.SearchAugmentation augmentation = managedWebSearchService.search(query, userId);
        if (augmentation.failed()) {
            String errorMessage = StringUtils.defaultIfBlank(augmentation.errorMessage(), "real-time web search unavailable");
            return new ManagedToolOutput(toolCallId, "实时联网搜索失败：" + errorMessage);
        }
        appendTraceEntries(traceEntries, augmentation.traceJson());
        return new ManagedToolOutput(toolCallId, augmentation.summary());
    }

    private ManagedToolOutput executeMcpTool(String toolCallId, McpRuntimeToolService.McpRuntimeTool tool,
            JSONObject arguments, JSONArray traceEntries) {
        try {
            String result = mcpRuntimeToolService.callTool(tool, arguments);
            appendMcpTraceEntry(traceEntries, tool, arguments, result);
            return new ManagedToolOutput(toolCallId, result);
        } catch (Exception e) {
            log.warn("MCP tool call failed, tool: {}, error: {}", tool.toolName(), e.getMessage());
            return new ManagedToolOutput(toolCallId, buildToolErrorContent("MCP_TOOL_CALL_FAILED", e.getMessage()));
        }
    }

    private void appendMcpTraceEntry(JSONArray traceEntries, McpRuntimeToolService.McpRuntimeTool tool,
            JSONObject arguments, String result) {
        if (traceEntries == null || tool == null) {
            return;
        }
        traceEntries.add(new JSONObject()
                .fluentPut("type", "mcp")
                .fluentPut("deskToolName", "MCP: " + tool.toolName())
                .fluentPut("toolName", tool.toolName())
                .fluentPut("serverUrl", tool.serverUrl())
                .fluentPut("arguments", arguments)
                .fluentPut("content", StringUtils.abbreviate(StringUtils.defaultString(result), 2000)));
    }

    private JSONObject parseToolArguments(String arguments) {
        if (StringUtils.isBlank(arguments)) {
            return new JSONObject();
        }
        try {
            JSONObject parsedArguments = JSON.parseObject(arguments);
            return parsedArguments == null ? new JSONObject() : parsedArguments;
        } catch (Exception e) {
            log.warn("Failed to parse tool arguments: {}", arguments, e);
            return new JSONObject();
        }
    }

    private List<String> parseMcpServerUrls(Object value) {
        if (value == null) {
            return List.of();
        }
        JSONArray parsedUrls = null;
        if (value instanceof JSONArray urls) {
            parsedUrls = urls;
        } else if (value instanceof List<?> urls) {
            parsedUrls = new JSONArray(urls);
        } else if (value instanceof String text && StringUtils.isNotBlank(text)) {
            try {
                parsedUrls = JSON.parseArray(text);
            } catch (Exception e) {
                log.warn("Failed to parse mcpServerUrls: {}", text, e);
            }
        }
        if (parsedUrls == null || parsedUrls.isEmpty()) {
            return List.of();
        }
        List<String> urls = new ArrayList<>();
        for (int i = 0; i < parsedUrls.size(); i++) {
            String url = parsedUrls.getString(i);
            if (StringUtils.isNotBlank(url) && !urls.contains(url.trim())) {
                urls.add(url.trim());
            }
        }
        return urls;
    }

    private String buildToolErrorContent(String code, String message) {
        return new JSONObject()
                .fluentPut("error", code)
                .fluentPut("message", message)
                .toJSONString();
    }

    private void appendTraceEntries(JSONArray target, JSONArray traceEntries) {
        if (target == null || traceEntries == null || traceEntries.isEmpty()) {
            return;
        }
        target.addAll(traceEntries);
    }

    private void appendTraceEntries(JSONArray target, String traceJson) {
        if (target == null || StringUtils.isBlank(traceJson)) {
            return;
        }
        try {
            JSONArray parsedTrace = JSON.parseArray(traceJson);
            if (parsedTrace != null && !parsedTrace.isEmpty()) {
                target.addAll(parsedTrace);
            }
        } catch (Exception e) {
            log.warn("Failed to parse managed search trace: {}", traceJson, e);
        }
    }

    private void appendToolMessages(JSONObject request, JSONObject assistantMessage, JSONArray toolCalls, List<ManagedToolOutput> outputs) {
        JSONArray messages = request.getJSONArray("messages");
        if (messages == null) {
            messages = new JSONArray();
            request.put("messages", messages);
        }
        messages.add(new JSONObject()
                .fluentPut("role", "assistant")
                .fluentPut("content", assistantMessage == null ? "" : StringUtils.defaultString(assistantMessage.getString("content")))
                .fluentPut("tool_calls", toolCalls));
        for (ManagedToolOutput output : outputs) {
            if (output == null || StringUtils.isBlank(output.toolCallId())) {
                continue;
            }
            messages.add(new JSONObject()
                    .fluentPut("role", "tool")
                    .fluentPut("tool_call_id", output.toolCallId())
                    .fluentPut("content", output.content()));
        }
    }

    /**
     * Parse SSE content and process data
     *
     * @param data SSE data string to be parsed
     * @param emitter SseEmitter object for sending data to client
     * @param streamId Stream identifier
     * @param finalResult Final result StringBuffer object
     * @param thinkingResult Thinking process result StringBuffer object
     * @param sid Session identifier StringBuffer object
     * @param traceResult Trace result StringBuffer object
     */
    private void parseSSEContent(String data, SseEmitter emitter, String streamId, StringBuffer finalResult, StringBuffer thinkingResult, StringBuffer sid, StringBuffer traceResult, String provider) {
        log.debug("SSE data streamId: {} ==> {}", streamId, data);

        try {
            JSONObject dataObj = JSON.parseObject(data);
            collectTraceData(dataObj, traceResult, streamId, provider);
            JSONObject normalizedData = normalizeResponsePayload(dataObj, provider);

            if (normalizedData == null) {
                return;
            }

            if (normalizedData.containsKey("error")) {
                JSONObject error = normalizedData.getJSONObject("error");
                String errorMessage = error.getString("message");
                log.error("SSE data contains error, streamId: {}, message: {}", streamId, errorMessage);
                finalResult.append(errorMessage);
            }

            // Try to send data, continue processing data even if client disconnects
            boolean clientConnected = tryServeSSEData(emitter, normalizedData, streamId);

            // Process and save data regardless of client connection status
            processSidValue(normalizedData, sid, streamId);
            processChoicesData(normalizedData, finalResult, thinkingResult, traceResult, streamId);

            if (!clientConnected) {
                log.info("Client disconnected, but continue processing data to ensure completeness, streamId: {}", streamId);
            }
        } catch (Exception e) {
            handleParseError(e, data, streamId, emitter);
        }
    }

    /**
     * Try to send SSE data, detect client connection status
     *
     * @param emitter SseEmitter object
     * @param dataObj Data object to be sent
     * @param streamId Stream identifier
     * @return true if client is still connected, false if client has disconnected
     */
    private boolean tryServeSSEData(SseEmitter emitter, JSONObject dataObj, String streamId) {
        if (emitter == null) {
            log.warn("SseEmitter is null, cannot send data, streamId: {}", streamId);
            return false;
        }

        try {
            String jsonData = dataObj.toJSONString();
            emitter.send(SseEmitter.event().name("data").data(jsonData));
            return true;
        } catch (org.springframework.web.context.request.async.AsyncRequestNotUsableException e) {
            log.warn("Client connection disconnected, streamId: {}, continue background data processing", streamId);
            return false;
        } catch (IOException e) {
            log.error("Failed to send SSE data, streamId: {}, error: {}", streamId, e.getMessage());
            return false;
        } catch (IllegalStateException e) {
            log.debug("SseEmitter completed, streamId: {}", streamId);
            return false;
        } catch (Exception e) {
            log.error("Unexpected error occurred while sending SSE data, streamId: {}", streamId, e);
            return false;
        }
    }

    /**
     * Function to process SID value
     *
     * @param dataObj JSON object containing SID
     * @param sid StringBuffer for storing SID
     * @param streamId Stream ID
     */
    private void processSidValue(JSONObject dataObj, StringBuffer sid, String streamId) {
        if (sid.isEmpty() && dataObj.containsKey("id")) {
            String sidValue = dataObj.getString("id");
            if (sidValue != null && !sidValue.trim().isEmpty()) {
                sid.append(sidValue);
                log.debug("Set sid: {}, streamId: {}", sidValue, streamId);
            }
        }
    }

    /**
     * Function to process choices
     *
     * @param dataObj JSON object containing choices
     * @param finalResult StringBuffer for storing final result
     * @param thinkingResult StringBuffer for storing thinking process
     * @param traceResult StringBuffer for storing trace information
     * @param streamId ID for identifying the stream
     */
    private void processChoicesData(JSONObject dataObj, StringBuffer finalResult, StringBuffer thinkingResult, StringBuffer traceResult, String streamId) {
        if (!dataObj.containsKey("choices")) {
            return;
        }

        com.alibaba.fastjson2.JSONArray choices = dataObj.getJSONArray("choices");
        if (choices.isEmpty()) {
            return;
        }

        processFirstChoice(choices, finalResult, thinkingResult);
        processSecondChoiceForTracing(choices, traceResult, streamId);
    }

    /**
     * Process output and thinking results
     *
     * @param choices JSONArray object representing collection of choices
     * @param finalResult StringBuffer object for storing final result
     * @param thinkingResult StringBuffer object for storing thinking process result
     */
    private void processFirstChoice(com.alibaba.fastjson2.JSONArray choices, StringBuffer finalResult, StringBuffer thinkingResult) {
        JSONObject firstChoice = choices.getJSONObject(0);
        if (!firstChoice.containsKey("delta")) {
            return;
        }

        JSONObject delta = firstChoice.getJSONObject("delta");
        if (delta.containsKey("content")) {
            finalResult.append(delta.getString("content"));
        }
        if (delta.containsKey("reasoning_content")) {
            thinkingResult.append(delta.getString("reasoning_content"));
        }
    }

    private String resolveLatestUserQuery(JSONArray messages) {
        if (messages == null || messages.isEmpty()) {
            return "";
        }
        for (int i = messages.size() - 1; i >= 0; i--) {
            JSONObject message = messages.getJSONObject(i);
            if (message != null && "user".equals(normalizeMessageRole(message.getString("role")))) {
                return message.getString("content");
            }
        }
        return "";
    }

    private void emitManagedSearchToolCalls(SseEmitter emitter, String streamId, String managedSearchTrace) {
        if (emitter == null || StringUtils.isBlank(managedSearchTrace)) {
            return;
        }
        JSONArray toolCalls = JSON.parseArray(managedSearchTrace);
        if (toolCalls == null || toolCalls.isEmpty()) {
            return;
        }
        JSONObject syntheticData = new JSONObject();
        JSONArray choices = new JSONArray();
        choices.add(new JSONObject().fluentPut("delta", new JSONObject()));
        choices.add(new JSONObject().fluentPut("delta", new JSONObject().fluentPut("tool_calls", toolCalls)));
        syntheticData.put("choices", choices);
        tryServeSSEData(emitter, syntheticData, streamId);
    }

    private PreparedRequest buildPreparedRequest(JSONObject request, String provider) {
        if (PROVIDER_GOOGLE.equals(provider)) {
            return new PreparedRequest(
                    normalizeGoogleStreamUrl(request.getString("url"), request.getString("model")),
                    JSON.toJSONString(buildGoogleRequestBody(request)),
                    "text/event-stream");
        }
        if (PROVIDER_ANTHROPIC.equals(provider)) {
            return new PreparedRequest(
                    normalizeAnthropicUrl(request.getString("url")),
                    JSON.toJSONString(buildAnthropicRequestBody(request)),
                    "text/event-stream");
        }
        boolean stream = !request.containsKey("stream") || request.getBooleanValue("stream");
        return new PreparedRequest(
                request.getString("url"),
                JSON.toJSONString(buildOpenAiCompatibleRequestBody(request)),
                stream ? "text/event-stream" : "application/json");
    }

    private JSONObject buildGoogleRequestBody(JSONObject request) {
        JSONObject body = new JSONObject();
        JSONArray messages = request.getJSONArray("messages");
        JSONArray contents = new JSONArray();
        String systemPrompt = null;

        if (messages != null) {
            for (int i = 0; i < messages.size(); i++) {
                JSONObject message = messages.getJSONObject(i);
                if (message == null) {
                    continue;
                }
                String role = normalizeMessageRole(message.getString("role"));
                String content = message.getString("content");
                if (StringUtils.isBlank(content)) {
                    continue;
                }
                if ("system".equals(role)) {
                    systemPrompt = appendPrompt(systemPrompt, content);
                    continue;
                }
                JSONObject contentItem = new JSONObject();
                contentItem.put("role", "assistant".equals(role) ? "model" : "user");
                JSONArray parts = new JSONArray();
                parts.add(new JSONObject().fluentPut("text", content));
                contentItem.put("parts", parts);
                contents.add(contentItem);
            }
        }

        body.put("contents", contents);
        if (StringUtils.isNotBlank(systemPrompt)) {
            JSONArray systemParts = new JSONArray();
            systemParts.add(new JSONObject().fluentPut("text", systemPrompt));
            body.put("systemInstruction", new JSONObject().fluentPut("parts", systemParts));
        }
        JSONArray tools = request.getJSONArray("tools");
        if (tools != null && !tools.isEmpty()) {
            body.put("tools", tools);
        }
        return body;
    }

    private JSONObject buildAnthropicRequestBody(JSONObject request) {
        JSONObject body = new JSONObject();
        body.put("model", request.getString("model"));
        body.put("max_tokens", resolvePositiveInteger(request.getInteger("max_tokens"), 1024));
        body.put("stream", true);

        JSONArray messages = request.getJSONArray("messages");
        JSONArray anthropicMessages = new JSONArray();
        String systemPrompt = null;

        if (messages != null) {
            for (int i = 0; i < messages.size(); i++) {
                JSONObject message = messages.getJSONObject(i);
                if (message == null) {
                    continue;
                }
                String role = normalizeMessageRole(message.getString("role"));
                String content = message.getString("content");
                if (StringUtils.isBlank(content)) {
                    continue;
                }
                if ("system".equals(role)) {
                    systemPrompt = appendPrompt(systemPrompt, content);
                    continue;
                }
                anthropicMessages.add(new JSONObject()
                        .fluentPut("role", "assistant".equals(role) ? "assistant" : "user")
                        .fluentPut("content", content));
            }
        }

        if (StringUtils.isNotBlank(systemPrompt)) {
            body.put("system", systemPrompt);
        }
        body.put("messages", anthropicMessages);
        JSONArray tools = request.getJSONArray("tools");
        if (tools != null && !tools.isEmpty()) {
            body.put("tools", tools);
        }
        return body;
    }

    private JSONObject buildOpenAiCompatibleRequestBody(JSONObject request) {
        JSONObject body = new JSONObject();
        request.forEach((key, value) -> {
            if (StringUtils.equalsAny(key,
                    "url",
                    "apiKey",
                    "provider",
                    "userId",
                    "config",
                    "managedWebSearch",
                    "managedSearchQuery",
                    "managedSearchTrace",
                    "mcpServerUrls",
                    MANAGED_MCP_TOOLS_FIELD,
                    "anthropicBeta")) {
                return;
            }
            body.put(key, value);
        });
        body.put("stream", !request.containsKey("stream") || request.getBooleanValue("stream"));
        return body;
    }

    private JSONObject normalizeResponsePayload(JSONObject dataObj, String provider) {
        if (dataObj == null) {
            return null;
        }
        if (PROVIDER_GOOGLE.equals(provider)) {
            return normalizeGoogleResponse(dataObj);
        }
        if (PROVIDER_ANTHROPIC.equals(provider)) {
            return normalizeAnthropicResponse(dataObj);
        }
        return dataObj;
    }

    private void collectTraceData(JSONObject dataObj, StringBuffer traceResult, String streamId, String provider) {
        if (dataObj == null) {
            return;
        }
        if (PROVIDER_GOOGLE.equals(provider)) {
            collectGoogleSearchTrace(dataObj, traceResult, streamId);
            return;
        }
        if (PROVIDER_ANTHROPIC.equals(provider)) {
            collectAnthropicSearchTrace(dataObj, traceResult, streamId);
        }
    }

    private void collectGoogleSearchTrace(JSONObject dataObj, StringBuffer traceResult, String streamId) {
        JSONArray candidates = dataObj.getJSONArray("candidates");
        if (candidates == null || candidates.isEmpty()) {
            return;
        }
        JSONObject candidate = candidates.getJSONObject(0);
        JSONObject groundingMetadata = candidate == null ? null : candidate.getJSONObject("groundingMetadata");
        if (groundingMetadata == null || groundingMetadata.isEmpty()) {
            return;
        }
        JSONArray toolCalls = new JSONArray();
        toolCalls.add(new JSONObject()
                .fluentPut("type", "web_search")
                .fluentPut("deskToolName", "Web Search")
                .fluentPut("provider", PROVIDER_GOOGLE)
                .fluentPut("groundingMetadata", groundingMetadata));
        appendToolCallsTrace(toolCalls, traceResult, streamId);
    }

    private void collectAnthropicSearchTrace(JSONObject dataObj, StringBuffer traceResult, String streamId) {
        String type = dataObj.getString("type");
        JSONObject contentBlock = dataObj.getJSONObject("content_block");
        String contentBlockType = contentBlock == null ? null : contentBlock.getString("type");
        if (!StringUtils.containsIgnoreCase(type, "content_block")
                || !StringUtils.containsIgnoreCase(StringUtils.defaultString(contentBlockType), "web_search")) {
            return;
        }
        JSONArray toolCalls = new JSONArray();
        toolCalls.add(new JSONObject()
                .fluentPut("type", "web_search")
                .fluentPut("deskToolName", "Web Search")
                .fluentPut("provider", PROVIDER_ANTHROPIC)
                .fluentPut("content_block", contentBlock));
        appendToolCallsTrace(toolCalls, traceResult, streamId);
    }

    private void processSecondChoiceForTracing(JSONArray choices, StringBuffer traceResult, String streamId) {
        if (choices == null || choices.size() <= 1) {
            return;
        }

        JSONObject secondChoice = choices.getJSONObject(1);
        if (secondChoice == null || !secondChoice.containsKey("delta")) {
            return;
        }

        JSONObject delta = secondChoice.getJSONObject("delta");
        if (delta == null || !delta.containsKey("tool_calls")) {
            return;
        }

        appendToolCallsTrace(delta.getJSONArray("tool_calls"), traceResult, streamId);
    }

    private void appendToolCallsTrace(JSONArray toolCalls, StringBuffer traceResult, String streamId) {
        if (toolCalls == null || toolCalls.isEmpty()) {
            return;
        }
        if (!traceResult.isEmpty()) {
            traceResult.append(",");
        }
        traceResult.append(toolCalls.toJSONString());
        log.debug("Save prompt tool trace data, streamId: {}, toolCallsCount: {}", streamId, toolCalls.size());
    }

    private JSONObject normalizeGoogleResponse(JSONObject dataObj) {
        if (dataObj.containsKey("error")) {
            return dataObj;
        }
        JSONObject promptFeedback = dataObj.getJSONObject("promptFeedback");
        if (promptFeedback != null && StringUtils.isNotBlank(promptFeedback.getString("blockReason"))) {
            JSONObject error = new JSONObject();
            error.put("message", "Google prompt blocked: " + promptFeedback.getString("blockReason"));
            return new JSONObject().fluentPut("error", error);
        }

        JSONObject normalized = new JSONObject();
        if (StringUtils.isNotBlank(dataObj.getString("responseId"))) {
            normalized.put("id", dataObj.getString("responseId"));
        }

        JSONArray candidates = dataObj.getJSONArray("candidates");
        String text = "";
        if (candidates != null && !candidates.isEmpty()) {
            JSONObject candidate = candidates.getJSONObject(0);
            if (candidate != null) {
                JSONObject content = candidate.getJSONObject("content");
                if (content != null) {
                    JSONArray parts = content.getJSONArray("parts");
                    if (parts != null) {
                        StringBuilder builder = new StringBuilder();
                        for (int i = 0; i < parts.size(); i++) {
                            JSONObject part = parts.getJSONObject(i);
                            if (part != null && StringUtils.isNotBlank(part.getString("text"))) {
                                builder.append(part.getString("text"));
                            }
                        }
                        text = builder.toString();
                    }
                }
            }
        }

        JSONArray choices = new JSONArray();
        JSONObject choice = new JSONObject();
        JSONObject delta = new JSONObject();
        delta.put("content", text);
        choice.put("delta", delta);
        choices.add(choice);
        normalized.put("choices", choices);
        return normalized;
    }

    private JSONObject normalizeAnthropicResponse(JSONObject dataObj) {
        if (dataObj.containsKey("error")) {
            return dataObj;
        }

        String type = dataObj.getString("type");
        if (StringUtils.equalsAny(type,
                "message_start",
                "content_block_start",
                "content_block_stop",
                "message_delta",
                "ping")) {
            JSONObject normalized = new JSONObject();
            String id = dataObj.getString("id");
            if (StringUtils.isBlank(id)) {
                JSONObject message = dataObj.getJSONObject("message");
                if (message != null) {
                    id = message.getString("id");
                }
            }
            if (StringUtils.isNotBlank(id)) {
                normalized.put("id", id);
            }
            return normalized;
        }

        if (!Objects.equals(type, "content_block_delta")) {
            return dataObj;
        }

        JSONObject normalized = new JSONObject();
        if (StringUtils.isNotBlank(dataObj.getString("id"))) {
            normalized.put("id", dataObj.getString("id"));
        }
        JSONObject deltaObj = dataObj.getJSONObject("delta");
        String text = deltaObj != null ? deltaObj.getString("text") : "";
        JSONArray choices = new JSONArray();
        JSONObject choice = new JSONObject();
        JSONObject delta = new JSONObject();
        delta.put("content", text);
        choice.put("delta", delta);
        choices.add(choice);
        normalized.put("choices", choices);
        return normalized;
    }

    private String normalizeProvider(String provider) {
        if (StringUtils.isBlank(provider)) {
            return "";
        }
        return provider.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeGoogleStreamUrl(String rawUrl, String model) {
        String url = StringUtils.trimToEmpty(rawUrl);
        if (url.contains(":streamGenerateContent")) {
            return appendAltSse(url);
        }
        if (url.contains(":generateContent")) {
            return appendAltSse(url.replace(":generateContent", ":streamGenerateContent"));
        }
        String base = StringUtils.removeEnd(url, "/");
        String modelName = StringUtils.defaultIfBlank(model, "gemini-2.5-flash");
        return appendAltSse(base + "/v1beta/models/" + modelName + ":streamGenerateContent");
    }

    private String appendAltSse(String url) {
        return url.contains("?") ? url + "&alt=sse" : url + "?alt=sse";
    }

    private String normalizeAnthropicUrl(String rawUrl) {
        String url = StringUtils.trimToEmpty(rawUrl);
        if (url.endsWith("/v1/messages")) {
            return url;
        }
        if (url.endsWith("/")) {
            url = StringUtils.removeEnd(url, "/");
        }
        if (url.endsWith("/v1")) {
            return url + "/messages";
        }
        return url + "/v1/messages";
    }

    private String normalizeMessageRole(String role) {
        return StringUtils.defaultIfBlank(role, "user").trim().toLowerCase(Locale.ROOT);
    }

    private String appendPrompt(String existing, String next) {
        if (StringUtils.isBlank(existing)) {
            return next;
        }
        return existing + "\n\n" + next;
    }

    private int resolvePositiveInteger(Integer value, int defaultValue) {
        if (value == null || value <= 0) {
            return defaultValue;
        }
        return value;
    }

    private record ManagedToolOutput(String toolCallId, String content) {}

    private record ManagedToolBatchResult(List<ManagedToolOutput> outputs, JSONArray traceEntries, int executedToolCalls,
            boolean limitExceeded, boolean duplicateDetected) {}

    private record PreparedRequest(String url, String body, String accept) {}

    /**
     * Method to handle parsing errors
     *
     * @param e Exception thrown
     * @param data Data that caused the error
     * @param streamId Stream ID
     * @param emitter SseEmitter object for sending events
     */
    private void handleParseError(Exception e, String data, String streamId, SseEmitter emitter) {
        log.error("Exception parsing SSE data, streamId: {}", streamId, e);
        log.error("Exception data: {}", data);

        JSONObject errorResponse = createErrorResponse(e);
        tryServeSSEData(emitter, errorResponse, streamId);
    }

    /**
     * Create error response object
     *
     * @param e Input exception object
     * @return JSONObject containing error information
     */
    private JSONObject createErrorResponse(Exception e) {
        JSONObject errorResponse = new JSONObject();
        errorResponse.put("error", true);
        errorResponse.put("message", "Parsing exception: " + e.getMessage());
        return errorResponse;
    }

    /**
     * Handle stream completion function
     *
     * @param emitter SseEmitter object for sending events
     * @param streamId Unique identifier of the stream
     * @param finalResult StringBuffer object of final result
     * @param thinkingResult StringBuffer object of thinking process
     * @param chatReqRecords Chat request records object
     * @param sid StringBuffer object of session ID
     * @param traceResult StringBuffer object of trace result
     */
    private void handleStreamComplete(SseEmitter emitter, String streamId, StringBuffer finalResult, StringBuffer thinkingResult,
            ChatReqRecords chatReqRecords, StringBuffer sid, StringBuffer traceResult, boolean edit, boolean isDebug,
            boolean managedSearchTrace) {
        log.info("Stream completed for streamId: {}", streamId);

        // Save data to database first to ensure data is not lost
        if (!isDebug) {
            saveStreamResultsToDatabase(chatReqRecords, finalResult, thinkingResult, sid, traceResult, edit, managedSearchTrace);
        }

        // Build completion data and try to send to client (if still connected)
        JSONObject completeData = buildCompleteData(finalResult, thinkingResult, traceResult, chatReqRecords);
        trySendCompleteAndEnd(emitter, completeData, streamId);
    }

    /**
     * Handle stream interruption function - save collected data
     *
     * @param emitter SseEmitter object for sending events
     * @param streamId Unique identifier of the stream
     * @param finalResult StringBuffer object of final result
     * @param thinkingResult StringBuffer object of thinking process
     * @param chatReqRecords Chat request records object
     * @param sid StringBuffer object of session ID
     * @param traceResult StringBuffer object of trace result
     */
    private void handleStreamInterrupted(SseEmitter emitter, String streamId, StringBuffer finalResult, StringBuffer thinkingResult,
            ChatReqRecords chatReqRecords, StringBuffer sid, StringBuffer traceResult, boolean edit, boolean isDebug,
            boolean managedSearchTrace) {
        log.info("Stream interrupted for streamId: {}, saving collected data", streamId);

        // Save collected data to database first to ensure data is not lost
        if (!isDebug) {
            saveStreamResultsToDatabase(chatReqRecords, finalResult, thinkingResult, sid, traceResult, edit, managedSearchTrace);
        }

        // Build interrupted completion data and try to send to client (if still connected)
        JSONObject interruptedData = buildCompleteData(finalResult, thinkingResult, traceResult, chatReqRecords);
        interruptedData.put("interrupted", true);
        interruptedData.put("reason", "Stream interrupted or client disconnected");

        trySendCompleteAndEnd(emitter, interruptedData, streamId);

        log.info("Saved data at interruption, streamId: {}, finalResult length: {}, thinkingResult length: {}, traceResult length: {}",
                streamId, finalResult.length(), thinkingResult.length(), traceResult.length());
    }

    /**
     * Try to send completion signal and end SSE connection
     *
     * @param emitter SseEmitter object
     * @param completeData Completion data
     * @param streamId Stream identifier
     */
    private void trySendCompleteAndEnd(SseEmitter emitter, JSONObject completeData, String streamId) {
        if (emitter == null) {
            log.warn("SseEmitter is null, cannot send completion signal, streamId: {}", streamId);
            return;
        }

        try {
            // Try to send completion data
            emitter.send(SseEmitter.event().name("complete").data(completeData.toJSONString()));
            log.debug("Successfully sent completion data, streamId: {}", streamId);
        } catch (org.springframework.web.context.request.async.AsyncRequestNotUsableException e) {
            log.info("Client connection disconnected, cannot send completion data, but data has been saved, streamId: {}", streamId);
        } catch (Exception e) {
            log.warn("Failed to send completion data, but data has been saved, streamId: {}, error: {}", streamId, e.getMessage());
        }

        try {
            // Try to send end signal and complete connection
            JSONObject endData = new JSONObject();
            endData.put("end", true);
            endData.put("timestamp", System.currentTimeMillis());
            if (completeData != null) {
                endData.put("message", completeData.getString("message"));
            }
            emitter.send(SseEmitter.event().name("end").data(endData.toJSONString()));
            emitter.complete();
            log.debug("SSE connection ended normally, streamId: {}", streamId);
        } catch (org.springframework.web.context.request.async.AsyncRequestNotUsableException e) {
            log.info("Client connection disconnected, cannot send end signal, streamId: {}", streamId);
        } catch (IllegalStateException e) {
            log.debug("SseEmitter completed, streamId: {}", streamId);
        } catch (Exception e) {
            log.warn("Exception occurred while ending SSE connection, streamId: {}, error: {}", streamId, e.getMessage());
        }
    }

    /**
     * Build complete data JSON object
     *
     * @param finalResult StringBuffer of final result
     * @param thinkingResult StringBuffer of thinking process
     * @param traceResult StringBuffer of trace result
     * @param chatReqRecords Chat request records object
     * @return JSONObject containing complete data
     */
    private JSONObject buildCompleteData(StringBuffer finalResult, StringBuffer thinkingResult, StringBuffer traceResult, ChatReqRecords chatReqRecords) {
        JSONObject completeData = new JSONObject();
        completeData.put("finalResult", finalResult.toString());
        completeData.put("message", finalResult.toString());
        completeData.put("thinkingResult", thinkingResult.toString());
        completeData.put("traceResult", traceResult.toString());
        completeData.put("timestamp", System.currentTimeMillis());

        if (chatReqRecords != null) {
            completeData.put("chatId", chatReqRecords.getChatId());
            completeData.put("requestId", chatReqRecords.getId());
        }

        return completeData;
    }

    /**
     * Save stream results to database
     *
     * @param chatReqRecords Chat request records object
     * @param finalResult StringBuffer of final result
     * @param thinkingResult StringBuffer of thinking process
     * @param sid StringBuffer of session ID
     * @param traceResult StringBuffer of trace result
     */
    private void saveStreamResultsToDatabase(ChatReqRecords chatReqRecords, StringBuffer finalResult, StringBuffer thinkingResult,
            StringBuffer sid, StringBuffer traceResult, boolean edit, boolean managedSearchTrace) {
        if (chatReqRecords == null) {
            return;
        }

        chatRecordModelService.saveChatResponse(chatReqRecords, finalResult, sid, edit, 2);
        chatRecordModelService.saveThinkingResult(chatReqRecords, thinkingResult, edit);
        saveTraceResult(chatReqRecords, traceResult, edit, managedSearchTrace);
    }

    /**
     * Function to save trace results
     *
     * @param chatReqRecords Chat request records object
     * @param traceResult StringBuffer object storing trace results
     * @param edit Whether in edit mode
     */
    private void saveTraceResult(ChatReqRecords chatReqRecords, StringBuffer traceResult, boolean edit, boolean managedSearchTrace) {
        if (traceResult.isEmpty()) {
            return;
        }

        java.time.LocalDateTime now = java.time.LocalDateTime.now();

        if (edit) {
            // Edit mode: query existing record and update
            ChatTraceSource existingRecord = chatDataService.findTraceSourceByUidAndChatIdAndReqId(
                    chatReqRecords.getUid(),
                    chatReqRecords.getChatId(),
                    chatReqRecords.getId());

            if (existingRecord != null) {
                existingRecord.setContent(traceResult.toString());
                existingRecord.setType(managedSearchTrace ? "web_search" : "prompt");
                existingRecord.setUpdateTime(now);

                chatDataService.updateTraceSourceByUidAndChatIdAndReqId(existingRecord);
                log.info("Update trace record, reqId: {}, chatId: {}, uid: {}",
                        chatReqRecords.getId(), chatReqRecords.getChatId(), chatReqRecords.getUid());
            }
        } else {
            // New mode: create new record
            createNewTraceSource(chatReqRecords, traceResult, now, managedSearchTrace);
        }
    }

    /**
     * Create new trace record
     */
    private void createNewTraceSource(ChatReqRecords chatReqRecords, StringBuffer traceResult, java.time.LocalDateTime now,
            boolean managedSearchTrace) {
        ChatTraceSource chatTraceSource = new ChatTraceSource();
        chatTraceSource.setUid(chatReqRecords.getUid());
        chatTraceSource.setChatId(chatReqRecords.getChatId());
        chatTraceSource.setReqId(chatReqRecords.getId());
        chatTraceSource.setContent(traceResult.toString());
        chatTraceSource.setType(managedSearchTrace ? "web_search" : "prompt");
        chatTraceSource.setCreateTime(now);
        chatTraceSource.setUpdateTime(now);

        chatDataService.createTraceSource(chatTraceSource);
        log.info("Create new trace record, reqId: {}, chatId: {}, uid: {}",
                chatReqRecords.getId(), chatReqRecords.getChatId(), chatReqRecords.getUid());
    }
}
