package com.iflytek.astron.console.hub.service;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.entity.chat.ChatReqRecords;
import com.iflytek.astron.console.commons.service.ChatRecordModelService;
import com.iflytek.astron.console.commons.service.data.ChatDataService;
import com.iflytek.astron.console.commons.util.SseEmitterUtil;
import okhttp3.*;
import okio.Buffer;
import okio.BufferedSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PromptChatServiceTest {

    @Mock
    private OkHttpClient httpClient;

    @Mock
    private ChatDataService chatDataService;

    @Mock
    private ChatRecordModelService chatRecordModelService;

    @Mock
    private ManagedWebSearchService managedWebSearchService;

    @Mock
    private SseEmitter emitter;

    @Mock
    private Call call;

    @Mock
    private Response response;

    @Mock
    private ResponseBody responseBody;

    private PromptChatService promptChatService;

    private JSONObject request;
    private ChatReqRecords chatReqRecords;
    private String streamId;

    @BeforeEach
    void setUp() {
        promptChatService = new PromptChatService(httpClient);
        ReflectionTestUtils.setField(promptChatService, "chatDataService", chatDataService);
        ReflectionTestUtils.setField(promptChatService, "chatRecordModelService", chatRecordModelService);
        ReflectionTestUtils.setField(promptChatService, "managedWebSearchService", managedWebSearchService);

        streamId = "test-stream-id";
        request = new JSONObject();
        request.put("url", "http://test.com/chat");
        request.put("apiKey", "test-api-key");

        chatReqRecords = new ChatReqRecords();
        chatReqRecords.setId(1L);
        chatReqRecords.setUid("test-uid");
        chatReqRecords.setChatId(100L);
    }

    // ==================== chatStream Tests ====================

    @Test
    void testChatStream_NullChatReqRecords_NotDebugMode() {
        try (MockedStatic<SseEmitterUtil> sseUtilMock = mockStatic(SseEmitterUtil.class)) {
            promptChatService.chatStream(request, emitter, streamId, null, false, false);

            sseUtilMock.verify(() -> SseEmitterUtil.completeWithError(emitter, "Message is empty"));
            verifyNoInteractions(httpClient);
        }
    }

    @Test
    void testChatStream_NullUid_NotDebugMode() {
        try (MockedStatic<SseEmitterUtil> sseUtilMock = mockStatic(SseEmitterUtil.class)) {
            chatReqRecords.setUid(null);

            promptChatService.chatStream(request, emitter, streamId, chatReqRecords, false, false);

            sseUtilMock.verify(() -> SseEmitterUtil.completeWithError(emitter, "Message is empty"));
            verifyNoInteractions(httpClient);
        }
    }

    @Test
    void testChatStream_NullChatId_NotDebugMode() {
        try (MockedStatic<SseEmitterUtil> sseUtilMock = mockStatic(SseEmitterUtil.class)) {
            chatReqRecords.setChatId(null);

            promptChatService.chatStream(request, emitter, streamId, chatReqRecords, false, false);

            sseUtilMock.verify(() -> SseEmitterUtil.completeWithError(emitter, "Message is empty"));
            verifyNoInteractions(httpClient);
        }
    }

    @Test
    void testChatStream_DebugMode_AllowsNullRecords() {
        try (MockedStatic<SseEmitterUtil> sseUtilMock = mockStatic(SseEmitterUtil.class)) {
            when(httpClient.newCall(any(Request.class))).thenReturn(call);
            doNothing().when(call).enqueue(any(Callback.class));

            promptChatService.chatStream(request, emitter, streamId, null, false, true);

            verify(httpClient).newCall(any(Request.class));
            verify(call).enqueue(any(Callback.class));
            sseUtilMock.verifyNoInteractions();
        }
    }

    @Test
    void testChatStream_ValidRequest_ExecutesHttpCall() {
        when(httpClient.newCall(any(Request.class))).thenReturn(call);
        doNothing().when(call).enqueue(any(Callback.class));

        promptChatService.chatStream(request, emitter, streamId, chatReqRecords, false, false);

        verify(httpClient).newCall(argThat(req -> {
            assertNotNull(req);
            assertEquals("http://test.com/chat", req.url().toString());
            assertEquals("Bearer test-api-key", req.header("Authorization"));
            assertEquals("application/json", req.header("Content-Type"));
            assertEquals("text/event-stream", req.header("Accept"));
            return true;
        }));
        verify(call).enqueue(any(Callback.class));
    }

    @Test
    void testChatStream_GoogleRequest_UsesGoogApiKeyHeader() {
        request.put("provider", "google");
        request.put("model", "gemini-3.1-pro");
        request.put("messages", JSON.parseArray(
                "[\n" +
                        "  {\"role\":\"system\",\"content\":\"You are helpful.\"},\n" +
                        "  {\"role\":\"user\",\"content\":\"Hello\"}\n" +
                        "]"));
        request.put("url", "https://example.com/v1beta/models/gemini-3.1-pro:generateContent");

        when(httpClient.newCall(any(Request.class))).thenReturn(call);
        doNothing().when(call).enqueue(any(Callback.class));

        promptChatService.chatStream(request, emitter, streamId, chatReqRecords, false, false);

        verify(httpClient).newCall(argThat(req -> {
            assertNotNull(req);
            assertEquals("https://example.com/v1beta/models/gemini-3.1-pro:streamGenerateContent?alt=sse", req.url().toString());
            assertEquals("test-api-key", req.header("x-goog-api-key"));
            assertNull(req.header("Authorization"));
            return true;
        }));
    }

    @Test
    void testChatStream_OpenAiManagedSearch_InjectsSearchSummaryIntoMessages() {
        request.put("provider", "openai");
        request.put("model", "deepseek-chat");
        request.put("managedWebSearch", true);
        request.put("managedSearchQuery", "today's news");
        request.put("userId", "debug-user");
        request.put("messages", JSON.parseArray("""
                [
                  {"role":"system","content":"You are helpful."},
                  {"role":"user","content":"<wrapped prompt with knowledge> Help me search today's news"}
                ]
                """));
        when(managedWebSearchService.search(eq("today's news"), eq("test-uid")))
                .thenReturn(new ManagedWebSearchService.SearchAugmentation(
                        "Search summary with [1]",
                        "[{\"type\":\"web_search\",\"deskToolName\":\"Web Search\",\"web_search\":{\"outputs\":[{\"index\":1,\"url\":\"https://example.com\",\"title\":\"Example\"}]}}]",
                        false,
                        null));
        when(httpClient.newCall(any(Request.class))).thenReturn(call);
        doNothing().when(call).enqueue(any(Callback.class));

        promptChatService.chatStream(request, emitter, streamId, chatReqRecords, false, false);

        verify(httpClient).newCall(argThat(req -> {
            try {
                JSONObject body = parseRequestBody(req);
                assertFalse(body.containsKey("managedSearchQuery"));
                assertFalse(body.containsKey("userId"));
                assertTrue(body.getJSONArray("messages")
                        .getJSONObject(0)
                        .getString("content")
                        .contains("managed real-time web search"));
                assertTrue(body.getJSONArray("messages")
                        .getJSONObject(0)
                        .getString("content")
                        .contains("Search summary with [1]"));
            } catch (IOException e) {
                fail(e);
            }
            return true;
        }));
    }

    @Test
    void testChatStream_DebugManagedSearch_UsesRequestUserIdWhenRecordsMissing() {
        request.put("provider", "openai");
        request.put("model", "deepseek-chat");
        request.put("managedWebSearch", true);
        request.put("managedSearchQuery", "latest headlines");
        request.put("userId", "debug-user");
        request.put("messages", JSON.parseArray("""
                [
                  {"role":"system","content":"You are helpful."},
                  {"role":"user","content":"wrapped prompt"}
                ]
                """));
        when(managedWebSearchService.search(eq("latest headlines"), eq("debug-user")))
                .thenReturn(new ManagedWebSearchService.SearchAugmentation("summary", "[]", false, null));
        when(httpClient.newCall(any(Request.class))).thenReturn(call);
        doNothing().when(call).enqueue(any(Callback.class));

        promptChatService.chatStream(request, emitter, streamId, null, false, true);

        verify(managedWebSearchService).search("latest headlines", "debug-user");
    }

    @Test
    void testChatStream_Exception_HandledGracefully() {
        try (MockedStatic<SseEmitterUtil> sseUtilMock = mockStatic(SseEmitterUtil.class)) {
            when(httpClient.newCall(any(Request.class))).thenThrow(new RuntimeException("HTTP error"));

            promptChatService.chatStream(request, emitter, streamId, chatReqRecords, false, false);

            sseUtilMock.verify(() -> SseEmitterUtil.completeWithError(eq(emitter), contains("Failed to create chat stream")));
        }
    }

    @Test
    void testChatStream_RequestContainsStreamTrue() {
        ArgumentCaptor<Request> requestCaptor = ArgumentCaptor.forClass(Request.class);
        when(httpClient.newCall(any(Request.class))).thenReturn(call);
        doNothing().when(call).enqueue(any(Callback.class));

        promptChatService.chatStream(request, emitter, streamId, chatReqRecords, false, false);

        verify(httpClient).newCall(requestCaptor.capture());
        Request capturedRequest = requestCaptor.getValue();
        assertNotNull(capturedRequest.body());
    }

    // ==================== HTTP Callback Tests ====================

    @Test
    void testHttpCallback_OnFailure() throws Exception {
        try (MockedStatic<SseEmitterUtil> sseUtilMock = mockStatic(SseEmitterUtil.class)) {
            ArgumentCaptor<Callback> callbackCaptor = ArgumentCaptor.forClass(Callback.class);
            when(httpClient.newCall(any(Request.class))).thenReturn(call);
            doNothing().when(call).enqueue(callbackCaptor.capture());

            promptChatService.chatStream(request, emitter, streamId, chatReqRecords, false, false);

            Callback callback = callbackCaptor.getValue();
            IOException testException = new IOException("Connection timeout");
            callback.onFailure(call, testException);

            sseUtilMock.verify(() -> SseEmitterUtil.completeWithError(eq(emitter), contains("Connection failed")));
        }
    }

    @Test
    void testHttpCallback_OnResponse_Unsuccessful() throws Exception {
        try (MockedStatic<SseEmitterUtil> sseUtilMock = mockStatic(SseEmitterUtil.class)) {
            ArgumentCaptor<Callback> callbackCaptor = ArgumentCaptor.forClass(Callback.class);
            when(httpClient.newCall(any(Request.class))).thenReturn(call);
            doNothing().when(call).enqueue(callbackCaptor.capture());

            promptChatService.chatStream(request, emitter, streamId, chatReqRecords, false, false);

            when(response.isSuccessful()).thenReturn(false);
            when(response.code()).thenReturn(500);
            when(response.message()).thenReturn("Internal Server Error");

            Callback callback = callbackCaptor.getValue();
            callback.onResponse(call, response);

            sseUtilMock.verify(() -> SseEmitterUtil.completeWithError(eq(emitter), contains("Request failed")));
        }
    }

    @Test
    void testHttpCallback_OnResponse_NullBody() throws Exception {
        try (MockedStatic<SseEmitterUtil> sseUtilMock = mockStatic(SseEmitterUtil.class)) {
            ArgumentCaptor<Callback> callbackCaptor = ArgumentCaptor.forClass(Callback.class);
            when(httpClient.newCall(any(Request.class))).thenReturn(call);
            doNothing().when(call).enqueue(callbackCaptor.capture());

            promptChatService.chatStream(request, emitter, streamId, chatReqRecords, false, false);

            when(response.isSuccessful()).thenReturn(true);
            when(response.body()).thenReturn(null);

            Callback callback = callbackCaptor.getValue();
            callback.onResponse(call, response);

            sseUtilMock.verify(() -> SseEmitterUtil.completeWithError(emitter, "Response body is empty"));
        }
    }

    @Test
    void testHttpCallback_OnResponse_WithBody_ProcessesStream() throws Exception {
        try (MockedStatic<SseEmitterUtil> sseUtilMock = mockStatic(SseEmitterUtil.class)) {
            ArgumentCaptor<Callback> callbackCaptor = ArgumentCaptor.forClass(Callback.class);
            when(httpClient.newCall(any(Request.class))).thenReturn(call);
            doNothing().when(call).enqueue(callbackCaptor.capture());

            promptChatService.chatStream(request, emitter, streamId, chatReqRecords, false, true);

            when(response.isSuccessful()).thenReturn(true);
            when(response.body()).thenReturn(responseBody);

            // Mock BufferedSource with [DONE] to end stream
            Buffer buffer = new Buffer();
            buffer.writeUtf8("data: [DONE]\n");
            BufferedSource source = buffer;
            when(responseBody.source()).thenReturn(source);

            sseUtilMock.when(() -> SseEmitterUtil.isStreamStopped(streamId)).thenReturn(false);

            Callback callback = callbackCaptor.getValue();
            callback.onResponse(call, response);

            verify(responseBody).source();
        }
    }

    // ==================== SSE Stream Processing Tests ====================

    @Test
    void testProcessSSEStream_StopSignal_BeforeReading() throws Exception {
        try (MockedStatic<SseEmitterUtil> sseUtilMock = mockStatic(SseEmitterUtil.class)) {
            ArgumentCaptor<Callback> callbackCaptor = ArgumentCaptor.forClass(Callback.class);
            when(httpClient.newCall(any(Request.class))).thenReturn(call);
            doNothing().when(call).enqueue(callbackCaptor.capture());

            promptChatService.chatStream(request, emitter, streamId, chatReqRecords, false, true);

            when(response.isSuccessful()).thenReturn(true);
            when(response.body()).thenReturn(responseBody);

            Buffer buffer = new Buffer();
            buffer.writeUtf8("data: test\n");
            when(responseBody.source()).thenReturn(buffer);

            // Simulate stop signal
            sseUtilMock.when(() -> SseEmitterUtil.isStreamStopped(streamId)).thenReturn(true);

            Callback callback = callbackCaptor.getValue();
            callback.onResponse(call, response);

            verify(responseBody).source();
        }
    }

    @Test
    void testProcessSSEStream_CompletionWithDone() throws Exception {
        try (MockedStatic<SseEmitterUtil> sseUtilMock = mockStatic(SseEmitterUtil.class)) {
            ArgumentCaptor<Callback> callbackCaptor = ArgumentCaptor.forClass(Callback.class);
            when(httpClient.newCall(any(Request.class))).thenReturn(call);
            doNothing().when(call).enqueue(callbackCaptor.capture());

            promptChatService.chatStream(request, emitter, streamId, chatReqRecords, false, true);

            when(response.isSuccessful()).thenReturn(true);
            when(response.body()).thenReturn(responseBody);

            Buffer buffer = new Buffer();
            buffer.writeUtf8("data: [DONE]\n");
            when(responseBody.source()).thenReturn(buffer);

            sseUtilMock.when(() -> SseEmitterUtil.isStreamStopped(streamId)).thenReturn(false);

            Callback callback = callbackCaptor.getValue();
            callback.onResponse(call, response);

            verify(responseBody).source();
        }
    }

    @Test
    void testProcessSSEStream_ValidSSEData() throws Exception {
        try (MockedStatic<SseEmitterUtil> sseUtilMock = mockStatic(SseEmitterUtil.class)) {
            ArgumentCaptor<Callback> callbackCaptor = ArgumentCaptor.forClass(Callback.class);
            when(httpClient.newCall(any(Request.class))).thenReturn(call);
            doNothing().when(call).enqueue(callbackCaptor.capture());

            promptChatService.chatStream(request, emitter, streamId, chatReqRecords, false, true);

            when(response.isSuccessful()).thenReturn(true);
            when(response.body()).thenReturn(responseBody);

            String sseData = "{\"id\":\"test-id\",\"choices\":[{\"delta\":{\"content\":\"Hello\"}}]}";
            Buffer buffer = new Buffer();
            buffer.writeUtf8("data: " + sseData + "\n");
            buffer.writeUtf8("data: [DONE]\n");
            when(responseBody.source()).thenReturn(buffer);

            sseUtilMock.when(() -> SseEmitterUtil.isStreamStopped(streamId)).thenReturn(false);

            Callback callback = callbackCaptor.getValue();
            callback.onResponse(call, response);

            verify(emitter, atLeastOnce()).send(any(SseEmitter.SseEventBuilder.class));
        }
    }

    @Test
    void testProcessSSEStream_ErrorInData() throws Exception {
        try (MockedStatic<SseEmitterUtil> sseUtilMock = mockStatic(SseEmitterUtil.class)) {
            ArgumentCaptor<Callback> callbackCaptor = ArgumentCaptor.forClass(Callback.class);
            when(httpClient.newCall(any(Request.class))).thenReturn(call);
            doNothing().when(call).enqueue(callbackCaptor.capture());

            promptChatService.chatStream(request, emitter, streamId, chatReqRecords, false, true);

            when(response.isSuccessful()).thenReturn(true);
            when(response.body()).thenReturn(responseBody);

            String errorData = "{\"error\":{\"message\":\"API Error\"}}";
            Buffer buffer = new Buffer();
            buffer.writeUtf8("data: " + errorData + "\n");
            buffer.writeUtf8("data: [DONE]\n");
            when(responseBody.source()).thenReturn(buffer);

            sseUtilMock.when(() -> SseEmitterUtil.isStreamStopped(streamId)).thenReturn(false);

            Callback callback = callbackCaptor.getValue();
            callback.onResponse(call, response);

            verify(emitter, atLeastOnce()).send(any(SseEmitter.SseEventBuilder.class));
        }
    }

    @Test
    void testProcessSSEStream_IOException_Handled() throws Exception {
        try (MockedStatic<SseEmitterUtil> sseUtilMock = mockStatic(SseEmitterUtil.class)) {
            ArgumentCaptor<Callback> callbackCaptor = ArgumentCaptor.forClass(Callback.class);
            when(httpClient.newCall(any(Request.class))).thenReturn(call);
            doNothing().when(call).enqueue(callbackCaptor.capture());

            promptChatService.chatStream(request, emitter, streamId, chatReqRecords, false, true);

            MediaType mediaType = MediaType.get("text/event-stream; charset=utf-8");
            lenient().when(response.isSuccessful()).thenReturn(true);
            lenient().when(response.body()).thenReturn(responseBody);
            lenient().when(responseBody.contentType()).thenReturn(mediaType);

            // Mock BufferedSource that throws IOException on read
            BufferedSource mockSource = mock(BufferedSource.class);
            lenient().when(responseBody.source()).thenReturn(mockSource);
            lenient().when(mockSource.readUtf8Line()).thenThrow(new IOException("Read error"));

            sseUtilMock.when(() -> SseEmitterUtil.isStreamStopped(streamId)).thenReturn(false);

            Callback callback = callbackCaptor.getValue();
            callback.onResponse(call, response);

            // Verify that completeWithError was called with the expected error message
            sseUtilMock.verify(() -> SseEmitterUtil.completeWithError(emitter, "Data reading exception: Read error"));
        }
    }

    // ==================== SSE Data Sending Tests ====================

    @Test
    void testTryServeSSEData_Success() throws Exception {
        try (MockedStatic<SseEmitterUtil> sseUtilMock = mockStatic(SseEmitterUtil.class)) {
            ArgumentCaptor<Callback> callbackCaptor = ArgumentCaptor.forClass(Callback.class);
            when(httpClient.newCall(any(Request.class))).thenReturn(call);
            doNothing().when(call).enqueue(callbackCaptor.capture());

            promptChatService.chatStream(request, emitter, streamId, chatReqRecords, false, true);

            when(response.isSuccessful()).thenReturn(true);
            when(response.body()).thenReturn(responseBody);

            String sseData = "{\"id\":\"test-id\"}";
            Buffer buffer = new Buffer();
            buffer.writeUtf8("data: " + sseData + "\n");
            buffer.writeUtf8("data: [DONE]\n");
            when(responseBody.source()).thenReturn(buffer);

            sseUtilMock.when(() -> SseEmitterUtil.isStreamStopped(streamId)).thenReturn(false);
            doNothing().when(emitter).send(any(SseEmitter.SseEventBuilder.class));

            Callback callback = callbackCaptor.getValue();
            callback.onResponse(call, response);

            verify(emitter, atLeastOnce()).send(any(SseEmitter.SseEventBuilder.class));
        }
    }

    @Test
    void testTryServeSSEData_IOException() throws Exception {
        try (MockedStatic<SseEmitterUtil> sseUtilMock = mockStatic(SseEmitterUtil.class)) {
            ArgumentCaptor<Callback> callbackCaptor = ArgumentCaptor.forClass(Callback.class);
            when(httpClient.newCall(any(Request.class))).thenReturn(call);
            doNothing().when(call).enqueue(callbackCaptor.capture());

            promptChatService.chatStream(request, emitter, streamId, chatReqRecords, false, true);

            when(response.isSuccessful()).thenReturn(true);
            when(response.body()).thenReturn(responseBody);

            String sseData = "{\"id\":\"test-id\"}";
            Buffer buffer = new Buffer();
            buffer.writeUtf8("data: " + sseData + "\n");
            buffer.writeUtf8("data: [DONE]\n");
            when(responseBody.source()).thenReturn(buffer);

            sseUtilMock.when(() -> SseEmitterUtil.isStreamStopped(streamId)).thenReturn(false);
            doThrow(new IOException("Send error")).when(emitter).send(any(SseEmitter.SseEventBuilder.class));

            Callback callback = callbackCaptor.getValue();
            callback.onResponse(call, response);

            verify(emitter, atLeastOnce()).send(any(SseEmitter.SseEventBuilder.class));
        }
    }

    @Test
    void testTryServeSSEData_AsyncRequestNotUsableException() throws Exception {
        try (MockedStatic<SseEmitterUtil> sseUtilMock = mockStatic(SseEmitterUtil.class)) {
            ArgumentCaptor<Callback> callbackCaptor = ArgumentCaptor.forClass(Callback.class);
            when(httpClient.newCall(any(Request.class))).thenReturn(call);
            doNothing().when(call).enqueue(callbackCaptor.capture());

            promptChatService.chatStream(request, emitter, streamId, chatReqRecords, false, true);

            when(response.isSuccessful()).thenReturn(true);
            when(response.body()).thenReturn(responseBody);

            String sseData = "{\"id\":\"test-id\"}";
            Buffer buffer = new Buffer();
            buffer.writeUtf8("data: " + sseData + "\n");
            buffer.writeUtf8("data: [DONE]\n");
            when(responseBody.source()).thenReturn(buffer);

            sseUtilMock.when(() -> SseEmitterUtil.isStreamStopped(streamId)).thenReturn(false);
            doThrow(new org.springframework.web.context.request.async.AsyncRequestNotUsableException("Client disconnected"))
                    .when(emitter)
                    .send(any(SseEmitter.SseEventBuilder.class));

            Callback callback = callbackCaptor.getValue();
            callback.onResponse(call, response);

            verify(emitter, atLeastOnce()).send(any(SseEmitter.SseEventBuilder.class));
        }
    }

    private JSONObject parseRequestBody(Request request) throws IOException {
        assertNotNull(request.body());
        Buffer sink = new Buffer();
        request.body().writeTo(sink);
        return JSON.parseObject(sink.readUtf8());
    }

    // ==================== Data Processing Tests ====================

    @Test
    void testParseSSEContent_WithChoicesAndContent() throws Exception {
        try (MockedStatic<SseEmitterUtil> sseUtilMock = mockStatic(SseEmitterUtil.class)) {
            ArgumentCaptor<Callback> callbackCaptor = ArgumentCaptor.forClass(Callback.class);
            when(httpClient.newCall(any(Request.class))).thenReturn(call);
            doNothing().when(call).enqueue(callbackCaptor.capture());

            promptChatService.chatStream(request, emitter, streamId, chatReqRecords, false, true);

            when(response.isSuccessful()).thenReturn(true);
            when(response.body()).thenReturn(responseBody);

            String sseData = "{\"id\":\"sid-123\",\"choices\":[{\"delta\":{\"content\":\"Hello\",\"reasoning_content\":\"Thinking\"}}]}";
            Buffer buffer = new Buffer();
            buffer.writeUtf8("data: " + sseData + "\n");
            buffer.writeUtf8("data: [DONE]\n");
            when(responseBody.source()).thenReturn(buffer);

            sseUtilMock.when(() -> SseEmitterUtil.isStreamStopped(streamId)).thenReturn(false);

            Callback callback = callbackCaptor.getValue();
            callback.onResponse(call, response);

            verify(emitter, atLeastOnce()).send(any(SseEmitter.SseEventBuilder.class));
        }
    }

    @Test
    void testParseSSEContent_InvalidJson() throws Exception {
        try (MockedStatic<SseEmitterUtil> sseUtilMock = mockStatic(SseEmitterUtil.class)) {
            ArgumentCaptor<Callback> callbackCaptor = ArgumentCaptor.forClass(Callback.class);
            when(httpClient.newCall(any(Request.class))).thenReturn(call);
            doNothing().when(call).enqueue(callbackCaptor.capture());

            promptChatService.chatStream(request, emitter, streamId, chatReqRecords, false, true);

            when(response.isSuccessful()).thenReturn(true);
            when(response.body()).thenReturn(responseBody);

            Buffer buffer = new Buffer();
            buffer.writeUtf8("data: {invalid json\n");
            buffer.writeUtf8("data: [DONE]\n");
            when(responseBody.source()).thenReturn(buffer);

            sseUtilMock.when(() -> SseEmitterUtil.isStreamStopped(streamId)).thenReturn(false);

            Callback callback = callbackCaptor.getValue();
            callback.onResponse(call, response);

            // Should handle parse error and send error response
            verify(emitter, atLeastOnce()).send(any(SseEmitter.SseEventBuilder.class));
        }
    }

    // ==================== Database Save Tests ====================

    @Test
    void testSaveStreamResults_NotDebugMode() throws Exception {
        try (MockedStatic<SseEmitterUtil> sseUtilMock = mockStatic(SseEmitterUtil.class)) {
            ArgumentCaptor<Callback> callbackCaptor = ArgumentCaptor.forClass(Callback.class);
            when(httpClient.newCall(any(Request.class))).thenReturn(call);
            doNothing().when(call).enqueue(callbackCaptor.capture());

            promptChatService.chatStream(request, emitter, streamId, chatReqRecords, false, false);

            when(response.isSuccessful()).thenReturn(true);
            when(response.body()).thenReturn(responseBody);

            String sseData = "{\"id\":\"sid-123\",\"choices\":[{\"delta\":{\"content\":\"Test\"}}]}";
            Buffer buffer = new Buffer();
            buffer.writeUtf8("data: " + sseData + "\n");
            buffer.writeUtf8("data: [DONE]\n");
            when(responseBody.source()).thenReturn(buffer);

            sseUtilMock.when(() -> SseEmitterUtil.isStreamStopped(streamId)).thenReturn(false);

            Callback callback = callbackCaptor.getValue();
            callback.onResponse(call, response);

            verify(chatRecordModelService).saveChatResponse(eq(chatReqRecords), any(StringBuffer.class), any(StringBuffer.class), eq(false), eq(2));
            verify(chatRecordModelService).saveThinkingResult(eq(chatReqRecords), any(StringBuffer.class), eq(false));
        }
    }

    @Test
    void testSaveStreamResults_DebugMode_NoSave() throws Exception {
        try (MockedStatic<SseEmitterUtil> sseUtilMock = mockStatic(SseEmitterUtil.class)) {
            ArgumentCaptor<Callback> callbackCaptor = ArgumentCaptor.forClass(Callback.class);
            when(httpClient.newCall(any(Request.class))).thenReturn(call);
            doNothing().when(call).enqueue(callbackCaptor.capture());

            promptChatService.chatStream(request, emitter, streamId, chatReqRecords, false, true);

            when(response.isSuccessful()).thenReturn(true);
            when(response.body()).thenReturn(responseBody);

            Buffer buffer = new Buffer();
            buffer.writeUtf8("data: [DONE]\n");
            when(responseBody.source()).thenReturn(buffer);

            sseUtilMock.when(() -> SseEmitterUtil.isStreamStopped(streamId)).thenReturn(false);

            Callback callback = callbackCaptor.getValue();
            callback.onResponse(call, response);

            verifyNoInteractions(chatRecordModelService);
            verifyNoInteractions(chatDataService);
        }
    }

    @Test
    void testSaveTraceResult_EditMode_EmptyTrace() throws Exception {
        try (MockedStatic<SseEmitterUtil> sseUtilMock = mockStatic(SseEmitterUtil.class)) {
            ArgumentCaptor<Callback> callbackCaptor = ArgumentCaptor.forClass(Callback.class);
            when(httpClient.newCall(any(Request.class))).thenReturn(call);
            doNothing().when(call).enqueue(callbackCaptor.capture());

            promptChatService.chatStream(request, emitter, streamId, chatReqRecords, true, false);

            when(response.isSuccessful()).thenReturn(true);
            when(response.body()).thenReturn(responseBody);

            Buffer buffer = new Buffer();
            buffer.writeUtf8("data: [DONE]\n");
            when(responseBody.source()).thenReturn(buffer);

            sseUtilMock.when(() -> SseEmitterUtil.isStreamStopped(streamId)).thenReturn(false);

            Callback callback = callbackCaptor.getValue();
            callback.onResponse(call, response);

            // trace result is empty, so no database operations should occur
            verify(chatDataService, never()).findTraceSourceByUidAndChatIdAndReqId(anyString(), anyLong(), anyLong());
            verify(chatDataService, never()).updateTraceSourceByUidAndChatIdAndReqId(any());
            verify(chatDataService, never()).createTraceSource(any());
        }
    }

    @Test
    void testSaveTraceResult_NewMode() throws Exception {
        try (MockedStatic<SseEmitterUtil> sseUtilMock = mockStatic(SseEmitterUtil.class)) {
            ArgumentCaptor<Callback> callbackCaptor = ArgumentCaptor.forClass(Callback.class);
            when(httpClient.newCall(any(Request.class))).thenReturn(call);
            doNothing().when(call).enqueue(callbackCaptor.capture());

            promptChatService.chatStream(request, emitter, streamId, chatReqRecords, false, false);

            when(response.isSuccessful()).thenReturn(true);
            when(response.body()).thenReturn(responseBody);

            Buffer buffer = new Buffer();
            buffer.writeUtf8("data: [DONE]\n");
            when(responseBody.source()).thenReturn(buffer);

            sseUtilMock.when(() -> SseEmitterUtil.isStreamStopped(streamId)).thenReturn(false);

            Callback callback = callbackCaptor.getValue();
            callback.onResponse(call, response);

            // Trace result is empty, so createTraceSource should not be called
            verify(chatDataService, never()).createTraceSource(any());
        }
    }

    // ==================== Stream Completion Tests ====================

    @Test
    void testHandleStreamComplete_SendsCompleteEvent() throws Exception {
        try (MockedStatic<SseEmitterUtil> sseUtilMock = mockStatic(SseEmitterUtil.class)) {
            ArgumentCaptor<Callback> callbackCaptor = ArgumentCaptor.forClass(Callback.class);
            when(httpClient.newCall(any(Request.class))).thenReturn(call);
            doNothing().when(call).enqueue(callbackCaptor.capture());

            promptChatService.chatStream(request, emitter, streamId, chatReqRecords, false, true);

            when(response.isSuccessful()).thenReturn(true);
            when(response.body()).thenReturn(responseBody);

            Buffer buffer = new Buffer();
            buffer.writeUtf8("data: [DONE]\n");
            when(responseBody.source()).thenReturn(buffer);

            sseUtilMock.when(() -> SseEmitterUtil.isStreamStopped(streamId)).thenReturn(false);
            doNothing().when(emitter).send(any(SseEmitter.SseEventBuilder.class));
            doNothing().when(emitter).complete();

            Callback callback = callbackCaptor.getValue();
            callback.onResponse(call, response);

            verify(emitter, atLeastOnce()).send(any(SseEmitter.SseEventBuilder.class));
            verify(emitter).complete();
        }
    }

    @Test
    void testHandleStreamInterrupted_SendsInterruptedEvent() throws Exception {
        try (MockedStatic<SseEmitterUtil> sseUtilMock = mockStatic(SseEmitterUtil.class)) {
            ArgumentCaptor<Callback> callbackCaptor = ArgumentCaptor.forClass(Callback.class);
            when(httpClient.newCall(any(Request.class))).thenReturn(call);
            doNothing().when(call).enqueue(callbackCaptor.capture());

            promptChatService.chatStream(request, emitter, streamId, chatReqRecords, false, true);

            // Stub contentType to trigger SSE stream reading path
            MediaType mediaType = MediaType.get("text/event-stream; charset=utf-8");
            lenient().when(response.isSuccessful()).thenReturn(true);
            lenient().when(response.body()).thenReturn(responseBody);
            lenient().when(responseBody.contentType()).thenReturn(mediaType);

            // Use a real Buffer for SSE data
            Buffer buffer = new Buffer();
            buffer.writeUtf8("data: {\"id\":\"test\"}\n");
            buffer.writeUtf8("data: [DONE]\n");
            lenient().when(responseBody.source()).thenReturn(buffer);

            // isStreamStopped: 1st=false (loop entry), 2nd=false (after data), 3rd=true (after [DONE] check)
            sseUtilMock.when(() -> SseEmitterUtil.isStreamStopped(streamId))
                    .thenReturn(false)
                    .thenReturn(false)
                    .thenReturn(true);
            // Stub static methods that get called during stream handling
            sseUtilMock.when(() -> SseEmitterUtil.completeWithError(any(SseEmitter.class), anyString())).thenAnswer(inv -> null);

            doNothing().when(emitter).send(any(SseEmitter.SseEventBuilder.class));
            doNothing().when(emitter).complete();

            Callback callback = callbackCaptor.getValue();
            callback.onResponse(call, response);

            verify(emitter, atLeastOnce()).send(any(SseEmitter.SseEventBuilder.class));
        }
    }

    @Test
    void testTrySendCompleteAndEnd_ClientDisconnected() throws Exception {
        try (MockedStatic<SseEmitterUtil> sseUtilMock = mockStatic(SseEmitterUtil.class)) {
            ArgumentCaptor<Callback> callbackCaptor = ArgumentCaptor.forClass(Callback.class);
            when(httpClient.newCall(any(Request.class))).thenReturn(call);
            doNothing().when(call).enqueue(callbackCaptor.capture());

            promptChatService.chatStream(request, emitter, streamId, chatReqRecords, false, true);

            when(response.isSuccessful()).thenReturn(true);
            when(response.body()).thenReturn(responseBody);

            Buffer buffer = new Buffer();
            buffer.writeUtf8("data: [DONE]\n");
            when(responseBody.source()).thenReturn(buffer);

            sseUtilMock.when(() -> SseEmitterUtil.isStreamStopped(streamId)).thenReturn(false);
            doThrow(new org.springframework.web.context.request.async.AsyncRequestNotUsableException("Disconnected"))
                    .when(emitter)
                    .send(any(SseEmitter.SseEventBuilder.class));

            Callback callback = callbackCaptor.getValue();
            callback.onResponse(call, response);

            verify(emitter, atLeastOnce()).send(any(SseEmitter.SseEventBuilder.class));
        }
    }
}
