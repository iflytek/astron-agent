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
import java.util.Locale;
import java.util.Objects;

/**
 * @author mingsuiyongheng
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PromptChatService {
    private static final String PROVIDER_GOOGLE = "google";
    private static final String PROVIDER_ANTHROPIC = "anthropic";
    private static final MediaType JSON_MEDIA_TYPE = MediaType.get("application/json; charset=utf-8");

    private final OkHttpClient httpClient;

    @Autowired
    private ChatDataService chatDataService;

    @Autowired
    private ChatRecordModelService chatRecordModelService;

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
        PreparedRequest preparedRequest = buildPreparedRequest(request, provider);

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
        } else {
            requestBuilder.addHeader("Authorization", "Bearer " + request.getString("apiKey"));
        }

        Request httpRequest = requestBuilder.build();

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
                    processSSEStream(body, emitter, streamId, chatReqRecords, edit, isDebug, provider);
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
    private void processSSEStream(ResponseBody body, SseEmitter emitter, String streamId, ChatReqRecords chatReqRecords, boolean edit, boolean isDebug, String provider) {
        BufferedSource source = body.source();
        StringBuffer finalResult = new StringBuffer();
        StringBuffer thinkingResult = new StringBuffer();
        StringBuffer sid = new StringBuffer();
        StringBuffer traceResult = new StringBuffer();
        boolean streamEnded = false;

        try (body) {
            try {
                String contentType = body.contentType() != null ? body.contentType().toString() : "";
                if (!contentType.contains("text/event-stream")) {
                    String payload = body.string();
                    if (StringUtils.isNotBlank(payload)) {
                        parseSSEContent(payload, emitter, streamId, finalResult, thinkingResult, sid, traceResult, provider);
                    }
                    handleStreamComplete(emitter, streamId, finalResult, thinkingResult, chatReqRecords, sid, traceResult, edit, isDebug);
                    return;
                }

                while (true) {
                    // Check if stop signal is received
                    if (SseEmitterUtil.isStreamStopped(streamId)) {
                        log.info("Stop signal detected, saving collected data, streamId: {}", streamId);
                        handleStreamInterrupted(emitter, streamId, finalResult, thinkingResult, chatReqRecords, sid, traceResult, edit, isDebug);
                        streamEnded = true;
                        break;
                    }

                    String line = source.readUtf8Line();
                    if (line == null) {
                        handleStreamComplete(emitter, streamId, finalResult, thinkingResult, chatReqRecords, sid, traceResult, edit, isDebug);
                        streamEnded = true;
                        break;
                    }

                    if (line.startsWith("data:")) {
                        if (line.contains("[DONE]")) {
                            handleStreamComplete(emitter, streamId, finalResult, thinkingResult, chatReqRecords, sid, traceResult, edit, isDebug);
                            streamEnded = true;
                            break;
                        }

                        String data = line.substring(5).trim();
                        parseSSEContent(data, emitter, streamId, finalResult, thinkingResult, sid, traceResult, provider);

                        // Check stop signal again after processing each data
                        if (SseEmitterUtil.isStreamStopped(streamId)) {
                            log.info("Stop signal detected after processing data, saving collected data, streamId: {}", streamId);
                            handleStreamInterrupted(emitter, streamId, finalResult, thinkingResult, chatReqRecords, sid, traceResult, edit, isDebug);
                            streamEnded = true;
                            break;
                        }
                    }
                }
            } catch (IOException e) {
                log.error("Exception reading SSE stream data, saving collected data, streamId: {}", streamId, e);
                // Save collected data even when exception occurs
                handleStreamInterrupted(emitter, streamId, finalResult, thinkingResult, chatReqRecords, sid, traceResult, edit, isDebug);
                SseEmitterUtil.completeWithError(emitter, "Data reading exception: " + e.getMessage());
                streamEnded = true;
            }
        } catch (Exception e) {
            log.warn("Exception closing response body, streamId: {}", streamId, e);
            // Save collected data when exception occurs
            handleStreamInterrupted(emitter, streamId, finalResult, thinkingResult, chatReqRecords, sid, traceResult, edit, isDebug);
            streamEnded = true;
        }

        if (!streamEnded) {
            handleStreamComplete(emitter, streamId, finalResult, thinkingResult, chatReqRecords, sid, traceResult, edit, isDebug);
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
        request.put("stream", true);
        return new PreparedRequest(
                request.getString("url"),
                JSON.toJSONString(request),
                "text/event-stream");
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
    private void handleStreamComplete(SseEmitter emitter, String streamId, StringBuffer finalResult, StringBuffer thinkingResult, ChatReqRecords chatReqRecords, StringBuffer sid, StringBuffer traceResult, boolean edit, boolean isDebug) {
        log.info("Stream completed for streamId: {}", streamId);

        // Save data to database first to ensure data is not lost
        if (!isDebug) {
            saveStreamResultsToDatabase(chatReqRecords, finalResult, thinkingResult, sid, traceResult, edit);
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
    private void handleStreamInterrupted(SseEmitter emitter, String streamId, StringBuffer finalResult, StringBuffer thinkingResult, ChatReqRecords chatReqRecords, StringBuffer sid, StringBuffer traceResult, boolean edit, boolean isDebug) {
        log.info("Stream interrupted for streamId: {}, saving collected data", streamId);

        // Save collected data to database first to ensure data is not lost
        if (!isDebug) {
            saveStreamResultsToDatabase(chatReqRecords, finalResult, thinkingResult, sid, traceResult, edit);
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
    private void saveStreamResultsToDatabase(ChatReqRecords chatReqRecords, StringBuffer finalResult, StringBuffer thinkingResult, StringBuffer sid, StringBuffer traceResult, boolean edit) {
        if (chatReqRecords == null) {
            return;
        }

        chatRecordModelService.saveChatResponse(chatReqRecords, finalResult, sid, edit, 2);
        chatRecordModelService.saveThinkingResult(chatReqRecords, thinkingResult, edit);
        saveTraceResult(chatReqRecords, traceResult, edit);
    }

    /**
     * Function to save trace results
     *
     * @param chatReqRecords Chat request records object
     * @param traceResult StringBuffer object storing trace results
     * @param edit Whether in edit mode
     */
    private void saveTraceResult(ChatReqRecords chatReqRecords, StringBuffer traceResult, boolean edit) {
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
                existingRecord.setUpdateTime(now);

                chatDataService.updateTraceSourceByUidAndChatIdAndReqId(existingRecord);
                log.info("Update trace record, reqId: {}, chatId: {}, uid: {}",
                        chatReqRecords.getId(), chatReqRecords.getChatId(), chatReqRecords.getUid());
            }
        } else {
            // New mode: create new record
            createNewTraceSource(chatReqRecords, traceResult, now);
        }
    }

    /**
     * Create new trace record
     */
    private void createNewTraceSource(ChatReqRecords chatReqRecords, StringBuffer traceResult, java.time.LocalDateTime now) {
        ChatTraceSource chatTraceSource = new ChatTraceSource();
        chatTraceSource.setUid(chatReqRecords.getUid());
        chatTraceSource.setChatId(chatReqRecords.getChatId());
        chatTraceSource.setReqId(chatReqRecords.getId());
        chatTraceSource.setContent(traceResult.toString());
        chatTraceSource.setType("prompt");
        chatTraceSource.setCreateTime(now);
        chatTraceSource.setUpdateTime(now);

        chatDataService.createTraceSource(chatTraceSource);
        log.info("Create new trace record, reqId: {}, chatId: {}, uid: {}",
                chatReqRecords.getId(), chatReqRecords.getChatId(), chatReqRecords.getUid());
    }
}
