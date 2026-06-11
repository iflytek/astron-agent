package com.iflytek.astron.console.hub.service;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
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
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

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
    private McpRuntimeToolService mcpRuntimeToolService;

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
        ReflectionTestUtils.setField(promptChatService, "mcpRuntimeToolService", mcpRuntimeToolService);

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
    void testChatStream_GoogleNativeSearch_KeepsWebSearchDecisionInstruction() {
        request.put("provider", "google");
        request.put("model", "gemini-3.1-pro");
        request.put("messages", JSON.parseArray("""
                [
                  {"role":"system","content":"You are helpful."},
                  {"role":"user","content":"今天热点新闻"}
                ]
                """));
        request.put("tools", JSON.parseArray("""
                [{"google_search": {}}]
                """));
        request.put("url", "https://example.com/v1beta/models/gemini-3.1-pro:generateContent");

        when(httpClient.newCall(any(Request.class))).thenReturn(call);
        doNothing().when(call).enqueue(any(Callback.class));

        promptChatService.chatStream(request, emitter, streamId, chatReqRecords, false, false);

        verify(httpClient).newCall(argThat(req -> {
            try {
                JSONObject body = parseRequestBody(req);
                String systemInstruction = body.getJSONObject("systemInstruction")
                        .getJSONArray("parts")
                        .getJSONObject(0)
                        .getString("text");
                assertTrue(systemInstruction.contains("You have access to a web_search tool"));
                assertFalse(systemInstruction.contains("current_time and web_search tools"));
            } catch (IOException e) {
                fail(e);
            }
            return true;
        }));
    }

    @Test
    void testChatStream_AnthropicNativeSearch_KeepsWebSearchDecisionInstruction() {
        request.put("provider", "anthropic");
        request.put("model", "claude-sonnet");
        request.put("messages", JSON.parseArray("""
                [
                  {"role":"system","content":"You are helpful."},
                  {"role":"user","content":"今天热点新闻"}
                ]
                """));
        request.put("tools", JSON.parseArray("""
                [{"type":"web_search_20250305","name":"web_search"}]
                """));
        request.put("url", "https://example.com/v1/messages");

        when(httpClient.newCall(any(Request.class))).thenReturn(call);
        doNothing().when(call).enqueue(any(Callback.class));

        promptChatService.chatStream(request, emitter, streamId, chatReqRecords, false, false);

        verify(httpClient).newCall(argThat(req -> {
            try {
                JSONObject body = parseRequestBody(req);
                String system = body.getString("system");
                assertTrue(system.contains("You have access to a web_search tool"));
                assertFalse(system.contains("current_time and web_search tools"));
            } catch (IOException e) {
                fail(e);
            }
            return true;
        }));
    }

    @Test
    void testChatStream_OpenAiManagedSearchWithoutTools_AddsDefaultToolsAndDoesNotPreSearch() throws Exception {
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
        Call planningCall = mock(Call.class);
        Call finalStreamCall = mock(Call.class);
        Response planningResponse = mock(Response.class);
        when(httpClient.newCall(any(Request.class))).thenReturn(planningCall, finalStreamCall);
        when(planningCall.execute()).thenReturn(planningResponse);
        when(planningResponse.isSuccessful()).thenReturn(true);
        when(planningResponse.body()).thenReturn(ResponseBody.create(
                "{\"id\":\"plan-id\",\"choices\":[{\"message\":{\"content\":\"no tool call\"}}]}",
                MediaType.get("application/json; charset=utf-8")));
        doNothing().when(finalStreamCall).enqueue(any(Callback.class));

        promptChatService.chatStream(request, emitter, streamId, chatReqRecords, false, false);

        ArgumentCaptor<Request> requestCaptor = ArgumentCaptor.forClass(Request.class);
        verify(httpClient, times(2)).newCall(requestCaptor.capture());
        JSONObject planningBody = parseRequestBody(requestCaptor.getAllValues().get(0));
        JSONObject finalBody = parseRequestBody(requestCaptor.getAllValues().get(1));

        assertFalse(planningBody.containsKey("managedSearchQuery"));
        assertFalse(planningBody.containsKey("userId"));
        assertEquals("auto", planningBody.getString("tool_choice"));
        assertEquals("web_search", planningBody.getJSONArray("tools")
                .getJSONObject(0)
                .getJSONObject("function")
                .getString("name"));
        assertEquals("current_time", planningBody.getJSONArray("tools")
                .getJSONObject(1)
                .getJSONObject("function")
                .getString("name"));
        assertFalse(planningBody.getJSONArray("messages")
                .getJSONObject(0)
                .getString("content")
                .contains("managed real-time web search"));
        assertTrue(finalBody.getBooleanValue("stream"));
        assertFalse(finalBody.containsKey("tools"));
        assertFalse(finalBody.containsKey("tool_choice"));
        assertFalse(finalBody.containsKey("managedSearchQuery"));
        assertFalse(finalBody.containsKey("userId"));
        assertFalse(finalBody.getJSONArray("messages")
                .getJSONObject(0)
                .getString("content")
                .contains("current_time and web_search tools"));
        verify(planningCall).execute();
        verify(finalStreamCall).enqueue(any(Callback.class));
        verify(managedWebSearchService, never()).search(anyString(), anyString());
    }

    @Test
    void testChatStream_OpenAiFinalAnswerAfterToolCall_UsesStreamingRequest() throws Exception {
        request.put("provider", "openai");
        request.put("model", "deepseek-chat");
        request.put("userId", "debug-user");
        request.put("tool_choice", "auto");
        request.put("tools", JSON.parseArray("""
                [
                  {
                    "type": "function",
                    "function": {
                      "name": "web_search",
                      "description": "Search the live web.",
                      "parameters": {"type": "object", "properties": {"query": {"type": "string"}}}
                    }
                  }
                ]
                """));
        request.put("messages", JSON.parseArray("""
                [
                  {"role":"system","content":"You are helpful."},
                  {"role":"user","content":"今天热点新闻"}
                ]
                """));

        Call planningCall = mock(Call.class);
        Call finalPlanningCall = mock(Call.class);
        Call finalStreamCall = mock(Call.class);
        Response planningResponse = mock(Response.class);
        Response finalPlanningResponse = mock(Response.class);
        when(httpClient.newCall(any(Request.class))).thenReturn(planningCall, finalPlanningCall, finalStreamCall);
        when(planningCall.execute()).thenReturn(planningResponse);
        when(finalPlanningCall.execute()).thenReturn(finalPlanningResponse);
        when(planningResponse.isSuccessful()).thenReturn(true);
        when(finalPlanningResponse.isSuccessful()).thenReturn(true);
        when(planningResponse.body()).thenReturn(ResponseBody.create(
                """
                {"id":"plan-id","choices":[{"message":{"role":"assistant","content":"","tool_calls":[{"id":"call_search","type":"function","function":{"name":"web_search","arguments":"{\\"query\\":\\"今天热点新闻\\"}"}}]}}]}
                """,
                MediaType.get("application/json; charset=utf-8")));
        when(finalPlanningResponse.body()).thenReturn(ResponseBody.create(
                """
                {"id":"final-plan-id","choices":[{"message":{"role":"assistant","content":"新闻摘要"}}]}
                """,
                MediaType.get("application/json; charset=utf-8")));
        doNothing().when(finalStreamCall).enqueue(any(Callback.class));
        when(managedWebSearchService.search(eq("今天热点新闻"), eq("debug-user")))
                .thenReturn(new ManagedWebSearchService.SearchAugmentation("新闻摘要", "[]", false, null));

        promptChatService.chatStream(request, emitter, streamId, null, false, true);

        ArgumentCaptor<Request> requestCaptor = ArgumentCaptor.forClass(Request.class);
        verify(httpClient, times(3)).newCall(requestCaptor.capture());
        JSONObject finalBody = parseRequestBody(requestCaptor.getAllValues().get(2));
        assertTrue(finalBody.getBooleanValue("stream"));
        assertFalse(finalBody.containsKey("tools"));
        assertFalse(finalBody.containsKey("tool_choice"));
        assertEquals("assistant", finalBody.getJSONArray("messages").getJSONObject(2).getString("role"));
        assertEquals("tool", finalBody.getJSONArray("messages").getJSONObject(3).getString("role"));
        assertEquals("call_search", finalBody.getJSONArray("messages").getJSONObject(3).getString("tool_call_id"));
        assertTrue(finalBody.getJSONArray("messages").getJSONObject(3).getString("content").contains("新闻摘要"));
        verify(planningCall).execute();
        verify(finalPlanningCall).execute();
        verify(finalStreamCall).enqueue(any(Callback.class));
        verify(managedWebSearchService).search("今天热点新闻", "debug-user");
    }

    @Test
    void testChatStream_DebugManagedSearch_UsesRequestUserIdWhenToolIsCalled() throws Exception {
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
        Call planningCall = mock(Call.class);
        Call finalPlanningCall = mock(Call.class);
        Call finalStreamCall = mock(Call.class);
        Response planningResponse = mock(Response.class);
        Response finalPlanningResponse = mock(Response.class);
        when(httpClient.newCall(any(Request.class))).thenReturn(planningCall, finalPlanningCall, finalStreamCall);
        when(planningCall.execute()).thenReturn(planningResponse);
        when(finalPlanningCall.execute()).thenReturn(finalPlanningResponse);
        when(planningResponse.isSuccessful()).thenReturn(true);
        when(finalPlanningResponse.isSuccessful()).thenReturn(true);
        when(planningResponse.body()).thenReturn(ResponseBody.create(
                """
                {"id":"plan-id","choices":[{"message":{"role":"assistant","content":"","tool_calls":[{"id":"call_search","type":"function","function":{"name":"web_search","arguments":"{\\"query\\":\\"latest headlines\\"}"}}]}}]}
                """,
                MediaType.get("application/json; charset=utf-8")));
        when(finalPlanningResponse.body()).thenReturn(ResponseBody.create(
                """
                {"id":"final-id","choices":[{"message":{"role":"assistant","content":"summary"}}]}
                """,
                MediaType.get("application/json; charset=utf-8")));
        doNothing().when(finalStreamCall).enqueue(any(Callback.class));
        when(managedWebSearchService.search(eq("latest headlines"), eq("debug-user")))
                .thenReturn(new ManagedWebSearchService.SearchAugmentation("summary", "[]", false, null));

        promptChatService.chatStream(request, emitter, streamId, null, false, true);

        verify(httpClient, times(3)).newCall(any(Request.class));
        verify(finalPlanningCall).execute();
        verify(finalStreamCall).enqueue(any(Callback.class));
        verify(managedWebSearchService).search("latest headlines", "debug-user");
    }

    @Test
    void testChatStream_OpenAiSearchTool_AddsDecisionInstructionToPlanningRequest() throws Exception {
        request.put("provider", "openai");
        request.put("model", "deepseek-chat");
        request.put("managedWebSearch", true);
        request.put("managedSearchQuery", "今天是周几");
        request.put("userId", "debug-user");
        request.put("tools", JSON.parseArray("""
                [
                  {
                    "type": "function",
                    "function": {
                      "name": "web_search",
                      "description": "Search the live web.",
                      "parameters": {"type": "object", "properties": {"query": {"type": "string"}}}
                    }
                  },
                  {
                    "type": "function",
                    "function": {
                      "name": "current_time",
                      "description": "Get current time.",
                      "parameters": {"type": "object", "properties": {}}
                    }
                  }
                ]
                """));
        request.put("messages", JSON.parseArray("""
                [
                  {"role":"system","content":"You are helpful."},
                  {"role":"user","content":"今天是周几"}
                ]
                """));

        Call planningCall = mock(Call.class);
        Call finalStreamCall = mock(Call.class);
        Response planningResponse = mock(Response.class);
        when(httpClient.newCall(any(Request.class))).thenReturn(planningCall, finalStreamCall);
        when(planningCall.execute()).thenReturn(planningResponse);
        when(planningResponse.isSuccessful()).thenReturn(true);
        when(planningResponse.body()).thenReturn(ResponseBody.create(
                "{\"id\":\"plan-id\",\"choices\":[{\"message\":{\"content\":\"no tool call\"}}]}",
                MediaType.get("application/json; charset=utf-8")));
        doNothing().when(finalStreamCall).enqueue(any(Callback.class));

        promptChatService.chatStream(request, emitter, streamId, null, false, true);

        ArgumentCaptor<Request> requestCaptor = ArgumentCaptor.forClass(Request.class);
        verify(httpClient, times(2)).newCall(requestCaptor.capture());
        JSONObject planningBody = parseRequestBody(requestCaptor.getAllValues().get(0));
        JSONObject finalBody = parseRequestBody(requestCaptor.getAllValues().get(1));
        assertEquals("web_search", planningBody.getJSONArray("tools")
                .getJSONObject(0)
                .getJSONObject("function")
                .getString("name"));
        assertTrue(planningBody.getJSONArray("messages")
                .getJSONObject(0)
                .getString("content")
                .contains("Use current_time for questions about the current date"));
        assertFalse(planningBody.containsKey("managedWebSearch"));
        assertFalse(planningBody.containsKey("managedSearchQuery"));
        assertTrue(finalBody.getBooleanValue("stream"));
        assertFalse(finalBody.containsKey("tools"));
        assertFalse(finalBody.containsKey("tool_choice"));
        verify(planningCall).execute();
        verify(finalStreamCall).enqueue(any(Callback.class));
        verify(managedWebSearchService, never()).search(anyString(), anyString());
    }

    @Test
    void testChatStream_OpenAiToolPlanningFailure_FallbackDoesNotKeepToolInstruction() throws Exception {
        request.put("provider", "openai");
        request.put("model", "deepseek-chat");
        request.put("userId", "debug-user");
        request.put("tool_choice", "auto");
        request.put("tools", JSON.parseArray("""
                [
                  {
                    "type": "function",
                    "function": {
                      "name": "current_time",
                      "description": "Get current time.",
                      "parameters": {"type": "object", "properties": {}}
                    }
                  }
                ]
                """));
        request.put("messages", JSON.parseArray("""
                [
                  {"role":"system","content":"You are helpful."},
                  {"role":"user","content":"今天是周几"}
                ]
                """));

        Call planningCall = mock(Call.class);
        Call fallbackCall = mock(Call.class);
        when(httpClient.newCall(any(Request.class))).thenReturn(planningCall, fallbackCall);
        when(planningCall.execute()).thenThrow(new IOException("planning failed"));
        doNothing().when(fallbackCall).enqueue(any(Callback.class));

        promptChatService.chatStream(request, emitter, streamId, null, false, true);

        ArgumentCaptor<Request> requestCaptor = ArgumentCaptor.forClass(Request.class);
        verify(httpClient, times(2)).newCall(requestCaptor.capture());
        JSONObject fallbackBody = parseRequestBody(requestCaptor.getAllValues().get(1));
        assertFalse(fallbackBody.containsKey("tools"));
        assertFalse(fallbackBody.containsKey("tool_choice"));
        assertFalse(fallbackBody.getJSONArray("messages")
                .getJSONObject(0)
                .getString("content")
                .contains("current_time and web_search tools"));
        assertFalse(fallbackBody.getJSONArray("messages")
                .getJSONObject(0)
                .getString("content")
                .contains("current_time tool"));
        assertFalse(fallbackBody.getJSONArray("messages")
                .getJSONObject(0)
                .getString("content")
                .contains("Use current_time for questions"));
    }

    @Test
    void testChatStream_OpenAiSearchToolCall_ExecutesSearchAndAppendsToolMessages() throws Exception {
        request.put("provider", "openai");
        request.put("model", "deepseek-chat");
        request.put("userId", "debug-user");
        request.put("tool_choice", "auto");
        request.put("tools", JSON.parseArray("""
                [
                  {
                    "type": "function",
                    "function": {
                      "name": "web_search",
                      "description": "Search the live web.",
                      "parameters": {"type": "object", "properties": {"query": {"type": "string"}}}
                    }
                  }
                ]
                """));
        request.put("messages", JSON.parseArray("""
                [
                  {"role":"system","content":"You are helpful."},
                  {"role":"user","content":"今天是周几"}
                ]
                """));

        Call planningCall = mock(Call.class);
        Call finalPlanningCall = mock(Call.class);
        Call finalStreamCall = mock(Call.class);
        Response planningResponse = mock(Response.class);
        Response finalPlanningResponse = mock(Response.class);
        when(httpClient.newCall(any(Request.class))).thenReturn(planningCall, finalPlanningCall, finalStreamCall);
        when(planningCall.execute()).thenReturn(planningResponse);
        when(finalPlanningCall.execute()).thenReturn(finalPlanningResponse);
        when(planningResponse.isSuccessful()).thenReturn(true);
        when(finalPlanningResponse.isSuccessful()).thenReturn(true);
        when(planningResponse.body()).thenReturn(ResponseBody.create(
                """
                {
                  "id": "plan-id",
                  "choices": [
                    {
                      "message": {
                        "role": "assistant",
                        "content": "",
                        "tool_calls": [
                          {
                            "id": "call_1",
                            "type": "function",
                            "function": {
                              "name": "web_search",
                              "arguments": "{\\"query\\":\\"今天是周几\\"}"
                            }
                          }
                        ]
                      }
                    }
                  ]
                }
                """,
                MediaType.get("application/json; charset=utf-8")));
        when(finalPlanningResponse.body()).thenReturn(ResponseBody.create(
                """
                {
                  "id": "final-id",
                  "choices": [
                    {
                      "message": {
                        "role": "assistant",
                        "content": "今天是星期一。"
                      }
                    }
                  ]
                }
                """,
                MediaType.get("application/json; charset=utf-8")));
        doNothing().when(finalStreamCall).enqueue(any(Callback.class));
        when(managedWebSearchService.search(eq("今天是周几"), eq("debug-user")))
                .thenReturn(new ManagedWebSearchService.SearchAugmentation(
                        "今天是星期一。",
                        "[{\"type\":\"web_search\",\"deskToolName\":\"Web Search\"}]",
                        false,
                        null));

        promptChatService.chatStream(request, emitter, streamId, null, false, true);

        ArgumentCaptor<Request> requestCaptor = ArgumentCaptor.forClass(Request.class);
        verify(httpClient, times(3)).newCall(requestCaptor.capture());
        JSONObject planningBody = parseRequestBody(requestCaptor.getAllValues().get(0));
        JSONObject secondRoundBody = parseRequestBody(requestCaptor.getAllValues().get(1));
        JSONObject finalBody = parseRequestBody(requestCaptor.getAllValues().get(2));

        assertEquals("web_search", planningBody.getJSONArray("tools")
                .getJSONObject(0)
                .getJSONObject("function")
                .getString("name"));
        assertFalse(planningBody.containsKey("managedWebSearch"));
        assertFalse(planningBody.containsKey("managedSearchQuery"));
        assertEquals("web_search", secondRoundBody.getJSONArray("tools")
                .getJSONObject(0)
                .getJSONObject("function")
                .getString("name"));
        assertEquals("auto", secondRoundBody.getString("tool_choice"));
        assertFalse(secondRoundBody.containsKey("managedWebSearch"));
        assertFalse(secondRoundBody.containsKey("managedSearchQuery"));
        assertEquals("assistant", secondRoundBody.getJSONArray("messages").getJSONObject(2).getString("role"));
        assertEquals("tool", secondRoundBody.getJSONArray("messages").getJSONObject(3).getString("role"));
        assertEquals("call_1", secondRoundBody.getJSONArray("messages").getJSONObject(3).getString("tool_call_id"));
        assertTrue(secondRoundBody.getJSONArray("messages").getJSONObject(3).getString("content").contains("星期一"));
        assertTrue(finalBody.getBooleanValue("stream"));
        assertFalse(finalBody.containsKey("tools"));
        assertFalse(finalBody.containsKey("tool_choice"));
        verify(managedWebSearchService).search("今天是周几", "debug-user");
        verify(finalPlanningCall).execute();
        verify(finalStreamCall).enqueue(any(Callback.class));
    }

    @Test
    void testChatStream_OpenAiToolLoop_ExecutesMultipleToolRoundsBeforeFinalAnswer() throws Exception {
        request.put("provider", "openai");
        request.put("model", "deepseek-chat");
        request.put("managedWebSearch", true);
        request.put("managedSearchQuery", "今天热点新闻");
        request.put("userId", "debug-user");
        request.put("tool_choice", "auto");
        request.put("tools", JSON.parseArray("""
                [
                  {
                    "type": "function",
                    "function": {
                      "name": "current_time",
                      "description": "Get current time.",
                      "parameters": {"type": "object", "properties": {"timezone": {"type": "string"}}}
                    }
                  },
                  {
                    "type": "function",
                    "function": {
                      "name": "web_search",
                      "description": "Search the live web.",
                      "parameters": {"type": "object", "properties": {"query": {"type": "string"}}}
                    }
                  }
                ]
                """));
        request.put("messages", JSON.parseArray("""
                [
                  {"role":"system","content":"You are helpful."},
                  {"role":"user","content":"今天热点新闻"}
                ]
                """));

        Call timeCall = mock(Call.class);
        Call searchCall = mock(Call.class);
        Call finalStreamCall = mock(Call.class);
        Response timeResponse = mock(Response.class);
        Response searchResponse = mock(Response.class);
        when(httpClient.newCall(any(Request.class))).thenReturn(timeCall, searchCall, finalStreamCall);
        when(timeCall.execute()).thenReturn(timeResponse);
        when(searchCall.execute()).thenReturn(searchResponse);
        when(timeResponse.isSuccessful()).thenReturn(true);
        when(searchResponse.isSuccessful()).thenReturn(true);
        when(timeResponse.body()).thenReturn(ResponseBody.create(
                """
                {
                  "id": "plan-time",
                  "choices": [
                    {
                      "message": {
                        "role": "assistant",
                        "content": "",
                        "tool_calls": [
                          {
                            "id": "call_time",
                            "type": "function",
                            "function": {
                              "name": "current_time",
                              "arguments": "{\\"timezone\\":\\"Asia/Shanghai\\"}"
                            }
                          }
                        ]
                      }
                    }
                  ]
                }
                """,
                MediaType.get("application/json; charset=utf-8")));
        when(searchResponse.body()).thenReturn(ResponseBody.create(
                """
                {
                  "id": "plan-final",
                  "choices": [
                    {
                      "message": {
                        "role": "assistant",
                        "content": "今天是2026年6月9日，热点新闻如下。"
                      }
                    }
                  ]
                }
                """,
                MediaType.get("application/json; charset=utf-8")));
        doNothing().when(finalStreamCall).enqueue(any(Callback.class));

        promptChatService.chatStream(request, emitter, streamId, null, false, true);

        ArgumentCaptor<Request> requestCaptor = ArgumentCaptor.forClass(Request.class);
        verify(httpClient, times(3)).newCall(requestCaptor.capture());
        JSONObject secondRoundBody = parseRequestBody(requestCaptor.getAllValues().get(1));
        JSONObject finalBody = parseRequestBody(requestCaptor.getAllValues().get(2));
        assertEquals("assistant", secondRoundBody.getJSONArray("messages").getJSONObject(2).getString("role"));
        assertEquals("tool", secondRoundBody.getJSONArray("messages").getJSONObject(3).getString("role"));
        assertEquals("call_time", secondRoundBody.getJSONArray("messages").getJSONObject(3).getString("tool_call_id"));
        assertTrue(secondRoundBody.getJSONArray("messages").getJSONObject(3).getString("content").contains("Asia/Shanghai"));
        assertTrue(secondRoundBody.getJSONArray("messages").getJSONObject(3).getString("content").contains("weekday"));
        assertTrue(finalBody.getBooleanValue("stream"));
        assertFalse(finalBody.containsKey("tools"));
        assertFalse(finalBody.containsKey("tool_choice"));
        verify(managedWebSearchService, never()).search(anyString(), anyString());
        verify(timeCall).execute();
        verify(searchCall).execute();
        verify(finalStreamCall).enqueue(any(Callback.class));
    }

    @Test
    void testChatStream_OpenAiToolLoop_DoesNotExecuteUnadvertisedSearchTool() throws Exception {
        request.put("provider", "openai");
        request.put("model", "deepseek-chat");
        request.put("userId", "debug-user");
        request.put("tool_choice", "auto");
        request.put("tools", JSON.parseArray("""
                [
                  {
                    "type": "function",
                    "function": {
                      "name": "current_time",
                      "description": "Get current time.",
                      "parameters": {"type": "object", "properties": {"timezone": {"type": "string"}}}
                    }
                  }
                ]
                """));
        request.put("messages", JSON.parseArray("""
                [
                  {"role":"system","content":"You are helpful."},
                  {"role":"user","content":"今天是周几"}
                ]
                """));

        Call planningCall = mock(Call.class);
        Call finalPlanningCall = mock(Call.class);
        Call finalStreamCall = mock(Call.class);
        Response planningResponse = mock(Response.class);
        Response finalPlanningResponse = mock(Response.class);
        when(httpClient.newCall(any(Request.class))).thenReturn(planningCall, finalPlanningCall, finalStreamCall);
        when(planningCall.execute()).thenReturn(planningResponse);
        when(finalPlanningCall.execute()).thenReturn(finalPlanningResponse);
        when(planningResponse.isSuccessful()).thenReturn(true);
        when(finalPlanningResponse.isSuccessful()).thenReturn(true);
        when(planningResponse.body()).thenReturn(ResponseBody.create(
                """
                {"id":"plan-search","choices":[{"message":{"role":"assistant","content":"","tool_calls":[{"id":"call_search","type":"function","function":{"name":"web_search","arguments":"{\\"query\\":\\"今天热点新闻\\"}"}}]}}]}
                """,
                MediaType.get("application/json; charset=utf-8")));
        when(finalPlanningResponse.body()).thenReturn(ResponseBody.create(
                """
                {"id":"final-id","choices":[{"message":{"role":"assistant","content":"当前请求没有启用联网搜索。"}}]}
                """,
                MediaType.get("application/json; charset=utf-8")));
        doNothing().when(finalStreamCall).enqueue(any(Callback.class));
        promptChatService.chatStream(request, emitter, streamId, null, false, true);

        ArgumentCaptor<Request> requestCaptor = ArgumentCaptor.forClass(Request.class);
        verify(httpClient, times(3)).newCall(requestCaptor.capture());
        JSONObject secondRoundBody = parseRequestBody(requestCaptor.getAllValues().get(1));
        JSONObject finalBody = parseRequestBody(requestCaptor.getAllValues().get(2));
        JSONObject toolMessage = secondRoundBody.getJSONArray("messages").getJSONObject(3);
        assertEquals("tool", toolMessage.getString("role"));
        assertEquals("call_search", toolMessage.getString("tool_call_id"));
        assertTrue(toolMessage.getString("content").contains("TOOL_NOT_AVAILABLE"));
        assertTrue(finalBody.getBooleanValue("stream"));
        assertFalse(finalBody.containsKey("tools"));
        assertFalse(finalBody.containsKey("tool_choice"));
        verify(managedWebSearchService, never()).search(anyString(), anyString());
        verify(finalStreamCall).enqueue(any(Callback.class));
    }

    @Test
    void testChatStream_OpenAiToolLoop_SearchesAfterCurrentTimeTool() throws Exception {
        request.put("provider", "openai");
        request.put("model", "deepseek-chat");
        request.put("managedWebSearch", true);
        request.put("managedSearchQuery", "今天热点新闻");
        request.put("userId", "debug-user");
        request.put("tool_choice", "auto");
        request.put("tools", JSON.parseArray("""
                [
                  {
                    "type": "function",
                    "function": {
                      "name": "current_time",
                      "description": "Get current time.",
                      "parameters": {"type": "object", "properties": {"timezone": {"type": "string"}}}
                    }
                  },
                  {
                    "type": "function",
                    "function": {
                      "name": "web_search",
                      "description": "Search the live web.",
                      "parameters": {"type": "object", "properties": {"query": {"type": "string"}}}
                    }
                  }
                ]
                """));
        request.put("messages", JSON.parseArray("""
                [
                  {"role":"system","content":"You are helpful."},
                  {"role":"user","content":"今天热点新闻"}
                ]
                """));

        Call timeCall = mock(Call.class);
        Call searchPlanningCall = mock(Call.class);
        Call finalPlanningCall = mock(Call.class);
        Call finalStreamCall = mock(Call.class);
        Response timeResponse = mock(Response.class);
        Response searchPlanningResponse = mock(Response.class);
        Response finalPlanningResponse = mock(Response.class);
        when(httpClient.newCall(any(Request.class))).thenReturn(timeCall, searchPlanningCall, finalPlanningCall, finalStreamCall);
        when(timeCall.execute()).thenReturn(timeResponse);
        when(searchPlanningCall.execute()).thenReturn(searchPlanningResponse);
        when(finalPlanningCall.execute()).thenReturn(finalPlanningResponse);
        when(timeResponse.isSuccessful()).thenReturn(true);
        when(searchPlanningResponse.isSuccessful()).thenReturn(true);
        when(finalPlanningResponse.isSuccessful()).thenReturn(true);
        when(timeResponse.body()).thenReturn(ResponseBody.create(
                """
                {"id":"plan-time","choices":[{"message":{"role":"assistant","content":"","tool_calls":[{"id":"call_time","type":"function","function":{"name":"current_time","arguments":"{\\"timezone\\":\\"Asia/Shanghai\\"}"}}]}}]}
                """,
                MediaType.get("application/json; charset=utf-8")));
        when(searchPlanningResponse.body()).thenReturn(ResponseBody.create(
                """
                {"id":"plan-search","choices":[{"message":{"role":"assistant","content":"","tool_calls":[{"id":"call_search","type":"function","function":{"name":"web_search","arguments":"{\\"query\\":\\"2026年6月9日 今日热点新闻\\"}"}}]}}]}
                """,
                MediaType.get("application/json; charset=utf-8")));
        when(finalPlanningResponse.body()).thenReturn(ResponseBody.create(
                """
                {"id":"plan-final","choices":[{"message":{"role":"assistant","content":"今天热点新闻总结。"}}]}
                """,
                MediaType.get("application/json; charset=utf-8")));
        when(managedWebSearchService.search(eq("2026年6月9日 今日热点新闻"), eq("debug-user")))
                .thenReturn(new ManagedWebSearchService.SearchAugmentation(
                        "搜索结果摘要",
                        "[{\"type\":\"web_search\",\"deskToolName\":\"Web Search\"}]",
                        false,
                        null));
        doNothing().when(finalStreamCall).enqueue(any(Callback.class));

        promptChatService.chatStream(request, emitter, streamId, null, false, true);

        verify(httpClient, times(4)).newCall(any(Request.class));
        verify(finalStreamCall).enqueue(any(Callback.class));
        verify(managedWebSearchService).search("2026年6月9日 今日热点新闻", "debug-user");
    }

    @Test
    void testChatStream_OpenAiMcpToolCall_ExecutesConfiguredServerTool() throws Exception {
        String mcpServerUrl = "https://mcp.example.com/sse";
        request.put("provider", "openai");
        request.put("model", "deepseek-chat");
        request.put("userId", "debug-user");
        request.put("mcpServerUrls", "[\"" + mcpServerUrl + "\"]");
        request.put("messages", JSON.parseArray("""
                [
                  {"role":"system","content":"You are helpful."},
                  {"role":"user","content":"查一下北京天气"}
                ]
                """));
        JSONObject inputSchema = JSON.parseObject("""
                {
                  "type": "object",
                  "properties": {
                    "city": {"type": "string", "description": "城市名称"}
                  },
                  "required": ["city"]
                }
                """);
        McpRuntimeToolService.McpRuntimeTool weatherTool = new McpRuntimeToolService.McpRuntimeTool(
                "maps_weather",
                "",
                mcpServerUrl,
                "maps_weather",
                "Get weather for a city.",
                inputSchema);
        when(mcpRuntimeToolService.listTools(List.of(mcpServerUrl))).thenReturn(List.of(weatherTool));
        when(mcpRuntimeToolService.callTool(eq(weatherTool), argThat(args -> "北京".equals(args.getString("city")))))
                .thenReturn("北京今天晴。");

        Call planningCall = mock(Call.class);
        Call finalPlanningCall = mock(Call.class);
        Call finalStreamCall = mock(Call.class);
        Response planningResponse = mock(Response.class);
        Response finalPlanningResponse = mock(Response.class);
        when(httpClient.newCall(any(Request.class))).thenReturn(planningCall, finalPlanningCall, finalStreamCall);
        when(planningCall.execute()).thenReturn(planningResponse);
        when(finalPlanningCall.execute()).thenReturn(finalPlanningResponse);
        when(planningResponse.isSuccessful()).thenReturn(true);
        when(finalPlanningResponse.isSuccessful()).thenReturn(true);
        when(planningResponse.body()).thenReturn(ResponseBody.create(
                """
                {"id":"plan-mcp","choices":[{"message":{"role":"assistant","content":"","tool_calls":[{"id":"call_weather","type":"function","function":{"name":"maps_weather","arguments":"{\\"city\\":\\"北京\\"}"}}]}}]}
                """,
                MediaType.get("application/json; charset=utf-8")));
        when(finalPlanningResponse.body()).thenReturn(ResponseBody.create(
                """
                {"id":"plan-final","choices":[{"message":{"role":"assistant","content":"北京今天晴。"}}]}
                """,
                MediaType.get("application/json; charset=utf-8")));
        doNothing().when(finalStreamCall).enqueue(any(Callback.class));

        promptChatService.chatStream(request, emitter, streamId, null, false, true);

        ArgumentCaptor<Request> requestCaptor = ArgumentCaptor.forClass(Request.class);
        verify(httpClient, times(3)).newCall(requestCaptor.capture());
        JSONObject planningBody = parseRequestBody(requestCaptor.getAllValues().get(0));
        JSONObject secondRoundBody = parseRequestBody(requestCaptor.getAllValues().get(1));
        JSONObject finalBody = parseRequestBody(requestCaptor.getAllValues().get(2));
        JSONArray tools = planningBody.getJSONArray("tools");
        assertNotNull(tools);
        assertTrue(tools.toJSONString().contains("maps_weather"));
        assertFalse(planningBody.containsKey("mcpServerUrls"));
        assertFalse(planningBody.containsKey("managedMcpTools"));
        JSONObject toolMessage = secondRoundBody.getJSONArray("messages").getJSONObject(3);
        assertEquals("tool", toolMessage.getString("role"));
        assertEquals("call_weather", toolMessage.getString("tool_call_id"));
        assertTrue(toolMessage.getString("content").contains("北京今天晴"));
        assertFalse(finalBody.containsKey("mcpServerUrls"));
        assertFalse(finalBody.containsKey("managedMcpTools"));
        verify(mcpRuntimeToolService).listTools(List.of(mcpServerUrl));
        verify(mcpRuntimeToolService).callTool(eq(weatherTool), any(JSONObject.class));
        verify(managedWebSearchService, never()).search(anyString(), anyString());
    }

    @Test
    void testChatStream_OpenAiToolLoop_StopsOnDuplicateToolCall() throws Exception {
        request.put("provider", "openai");
        request.put("model", "deepseek-chat");
        request.put("userId", "debug-user");
        request.put("tool_choice", "auto");
        request.put("tools", JSON.parseArray("""
                [
                  {
                    "type": "function",
                    "function": {
                      "name": "current_time",
                      "description": "Get current time.",
                      "parameters": {"type": "object", "properties": {"timezone": {"type": "string"}}}
                    }
                  }
                ]
                """));
        request.put("messages", JSON.parseArray("""
                [
                  {"role":"system","content":"You are helpful."},
                  {"role":"user","content":"今天是周几"}
                ]
                """));

        Call firstCall = mock(Call.class);
        Call duplicateCall = mock(Call.class);
        Call finalStreamCall = mock(Call.class);
        Response firstResponse = mock(Response.class);
        Response duplicateResponse = mock(Response.class);
        when(httpClient.newCall(any(Request.class))).thenReturn(firstCall, duplicateCall, finalStreamCall);
        when(firstCall.execute()).thenReturn(firstResponse);
        when(duplicateCall.execute()).thenReturn(duplicateResponse);
        when(firstResponse.isSuccessful()).thenReturn(true);
        when(duplicateResponse.isSuccessful()).thenReturn(true);
        when(firstResponse.body()).thenReturn(ResponseBody.create(
                """
                {"id":"plan-1","choices":[{"message":{"role":"assistant","content":"","tool_calls":[{"id":"call_time_1","type":"function","function":{"name":"current_time","arguments":"{\\"timezone\\":\\"Asia/Shanghai\\"}"}}]}}]}
                """,
                MediaType.get("application/json; charset=utf-8")));
        when(duplicateResponse.body()).thenReturn(ResponseBody.create(
                """
                {"id":"plan-2","choices":[{"message":{"role":"assistant","content":"","tool_calls":[{"id":"call_time_2","type":"function","function":{"name":"current_time","arguments":"{\\"timezone\\":\\"Asia/Shanghai\\"}"}}]}}]}
                """,
                MediaType.get("application/json; charset=utf-8")));
        doNothing().when(finalStreamCall).enqueue(any(Callback.class));

        promptChatService.chatStream(request, emitter, streamId, null, false, true);

        ArgumentCaptor<Request> requestCaptor = ArgumentCaptor.forClass(Request.class);
        verify(httpClient, times(3)).newCall(requestCaptor.capture());
        JSONObject finalBody = parseRequestBody(requestCaptor.getAllValues().get(2));
        assertFalse(finalBody.containsKey("tools"));
        assertFalse(finalBody.containsKey("tool_choice"));
        assertTrue(finalBody.getJSONArray("messages")
                .getJSONObject(0)
                .getString("content")
                .contains("DUPLICATE_TOOL_CALL"));
        assertTrue(finalBody.getJSONArray("messages")
                .getJSONObject(5)
                .getString("content")
                .contains("Duplicate tool call skipped"));
        verify(finalStreamCall).enqueue(any(Callback.class));
    }

    @Test
    void testChatStream_OpenAiToolLoop_StopsWhenToolCallLimitExceeded() throws Exception {
        request.put("provider", "openai");
        request.put("model", "deepseek-chat");
        request.put("userId", "debug-user");
        request.put("tool_choice", "auto");
        request.put("tools", JSON.parseArray("""
                [
                  {
                    "type": "function",
                    "function": {
                      "name": "current_time",
                      "description": "Get current time.",
                      "parameters": {"type": "object", "properties": {"timezone": {"type": "string"}}}
                    }
                  }
                ]
                """));
        request.put("messages", JSON.parseArray("""
                [
                  {"role":"system","content":"You are helpful."},
                  {"role":"user","content":"请连续检查很多城市的当前时间"}
                ]
                """));

        JSONArray toolCalls = new JSONArray();
        for (int i = 0; i < 16; i++) {
            toolCalls.add(new JSONObject()
                    .fluentPut("id", "call_time_" + i)
                    .fluentPut("type", "function")
                    .fluentPut("function", new JSONObject()
                            .fluentPut("name", "current_time")
                            .fluentPut("arguments", "{\"timezone\":\"Asia/Shanghai\",\"round\":" + i + "}")));
        }
        JSONObject planningBody = new JSONObject()
                .fluentPut("id", "plan-limit")
                .fluentPut("choices", new JSONArray().fluentAdd(new JSONObject()
                        .fluentPut("message", new JSONObject()
                                .fluentPut("role", "assistant")
                                .fluentPut("content", "")
                                .fluentPut("tool_calls", toolCalls))));

        Call planningCall = mock(Call.class);
        Call finalStreamCall = mock(Call.class);
        Response planningResponse = mock(Response.class);
        when(httpClient.newCall(any(Request.class))).thenReturn(planningCall, finalStreamCall);
        when(planningCall.execute()).thenReturn(planningResponse);
        when(planningResponse.isSuccessful()).thenReturn(true);
        when(planningResponse.body()).thenReturn(ResponseBody.create(
                planningBody.toJSONString(),
                MediaType.get("application/json; charset=utf-8")));
        doNothing().when(finalStreamCall).enqueue(any(Callback.class));

        promptChatService.chatStream(request, emitter, streamId, null, false, true);

        ArgumentCaptor<Request> requestCaptor = ArgumentCaptor.forClass(Request.class);
        verify(httpClient, times(2)).newCall(requestCaptor.capture());
        JSONObject finalBody = parseRequestBody(requestCaptor.getAllValues().get(1));
        assertFalse(finalBody.containsKey("tools"));
        assertFalse(finalBody.containsKey("tool_choice"));
        assertTrue(finalBody.getJSONArray("messages")
                .getJSONObject(0)
                .getString("content")
                .contains("TOOL_CALL_LIMIT_EXCEEDED"));
        assertTrue(finalBody.getJSONArray("messages")
                .toJSONString()
                .contains("Tool call budget exhausted"));
        verify(finalStreamCall).enqueue(any(Callback.class));
    }

    @Test
    void testChatStream_OpenAiToolLoop_StopsWhenToolRoundLimitExceeded() throws Exception {
        request.put("provider", "openai");
        request.put("model", "deepseek-chat");
        request.put("userId", "debug-user");
        request.put("tool_choice", "auto");
        request.put("tools", JSON.parseArray("""
                [
                  {
                    "type": "function",
                    "function": {
                      "name": "current_time",
                      "description": "Get current time.",
                      "parameters": {"type": "object", "properties": {"timezone": {"type": "string"}}}
                    }
                  }
                ]
                """));
        request.put("messages", JSON.parseArray("""
                [
                  {"role":"system","content":"You are helpful."},
                  {"role":"user","content":"今天是周几"}
                ]
                """));

        Call[] calls = new Call[15];
        Response[] responses = new Response[15];
        for (int i = 0; i < calls.length; i++) {
            calls[i] = mock(Call.class);
            responses[i] = mock(Response.class);
            when(calls[i].execute()).thenReturn(responses[i]);
            when(responses[i].isSuccessful()).thenReturn(true);
        }
        for (int i = 0; i < 15; i++) {
            String responseBody = """
                    {"id":"plan-%d","choices":[{"message":{"role":"assistant","content":"","tool_calls":[{"id":"call_time_%d","type":"function","function":{"name":"current_time","arguments":"{\\"timezone\\":\\"Asia/Shanghai\\",\\"round\\":%d}"}}]}}]}
                    """.formatted(i, i, i);
            when(responses[i].body()).thenReturn(ResponseBody.create(
                    responseBody,
                    MediaType.get("application/json; charset=utf-8")));
        }
        Call finalStreamCall = mock(Call.class);
        doNothing().when(finalStreamCall).enqueue(any(Callback.class));

        AtomicInteger callIndex = new AtomicInteger();
        when(httpClient.newCall(any(Request.class))).thenAnswer(invocation -> {
            int index = callIndex.getAndIncrement();
            return index < calls.length ? calls[index] : finalStreamCall;
        });

        promptChatService.chatStream(request, emitter, streamId, null, false, true);

        ArgumentCaptor<Request> requestCaptor = ArgumentCaptor.forClass(Request.class);
        verify(httpClient, times(16)).newCall(requestCaptor.capture());
        JSONObject finalBody = parseRequestBody(requestCaptor.getAllValues().get(15));
        assertFalse(finalBody.containsKey("tools"));
        assertFalse(finalBody.containsKey("tool_choice"));
        assertTrue(finalBody.getJSONArray("messages")
                .getJSONObject(0)
                .getString("content")
                .contains("TOOL_ROUND_LIMIT_EXCEEDED"));
        assertEquals(32, finalBody.getJSONArray("messages").size());
        verify(finalStreamCall).enqueue(any(Callback.class));
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
