package com.iflytek.astron.console.hub.service;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.toolkit.config.properties.ApiUrl;
import okhttp3.Call;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;
import okio.Buffer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class McpRuntimeToolServiceTest {

    @Mock
    private OkHttpClient httpClient;

    @Mock
    private ApiUrl apiUrl;

    @Mock
    private Call call;

    @Mock
    private Response response;

    private McpRuntimeToolService service;

    @BeforeEach
    void setUp() {
        service = new McpRuntimeToolService(httpClient, apiUrl);
        when(apiUrl.getToolUrl()).thenReturn("http://core-link:18888");
    }

    @Test
    void testListTools_MapsGatewayResponseToRuntimeTools() throws Exception {
        String serverUrl = "https://mcp.example.com/sse";
        when(httpClient.newCall(any(Request.class))).thenReturn(call);
        when(call.execute()).thenReturn(response);
        when(response.isSuccessful()).thenReturn(true);
        when(response.body()).thenReturn(ResponseBody.create(
                """
                        {
                          "code": 0,
                          "message": "success",
                          "sid": "sid",
                          "data": {
                            "servers": [
                              {
                                "server_id": "",
                                "server_url": "https://mcp.example.com/sse",
                                "server_status": 0,
                                "server_message": "success",
                                "tools": [
                                  {
                                    "name": "get_weather",
                                    "description": "Get weather.",
                                    "inputSchema": {
                                      "type": "object",
                                      "properties": {
                                        "city": {"type": "string"}
                                      },
                                      "required": ["city"]
                                    }
                                  }
                                ]
                              }
                            ]
                          }
                        }
                        """,
                MediaType.get("application/json; charset=utf-8")));

        List<McpRuntimeToolService.McpRuntimeTool> tools = service.listTools(List.of(serverUrl));

        assertEquals(1, tools.size());
        McpRuntimeToolService.McpRuntimeTool tool = tools.getFirst();
        assertEquals(serverUrl, tool.serverUrl());
        assertEquals("get_weather", tool.toolName());
        assertEquals("get_weather", tool.functionName());
        assertEquals("Get weather.", tool.description());
        assertEquals("object", tool.inputSchema().getString("type"));

        ArgumentCaptor<Request> requestCaptor = ArgumentCaptor.forClass(Request.class);
        verify(httpClient).newCall(requestCaptor.capture());
        Request request = requestCaptor.getValue();
        assertEquals("http://core-link:18888/api/v1/mcp/tool_list", request.url().toString());
        JSONObject body = parseRequestBody(request);
        assertEquals(serverUrl, body.getJSONArray("mcp_server_urls").getString(0));
    }

    @Test
    void testCallTool_ReturnsTextContentFromGatewayResponse() throws Exception {
        McpRuntimeToolService.McpRuntimeTool tool = new McpRuntimeToolService.McpRuntimeTool(
                "mcp_weather_get_weather",
                "",
                "https://mcp.example.com/sse",
                "get_weather",
                "Get weather.",
                JSON.parseObject("{\"type\":\"object\",\"properties\":{}}"));
        when(httpClient.newCall(any(Request.class))).thenReturn(call);
        when(call.execute()).thenReturn(response);
        when(response.isSuccessful()).thenReturn(true);
        when(response.body()).thenReturn(ResponseBody.create(
                """
                        {
                          "code": 0,
                          "message": "success",
                          "sid": "sid",
                          "data": {
                            "isError": false,
                            "content": [
                              {"type": "text", "text": "北京今天晴。"}
                            ]
                          }
                        }
                        """,
                MediaType.get("application/json; charset=utf-8")));

        String result = service.callTool(tool, JSON.parseObject("{\"city\":\"北京\"}"));

        assertEquals("北京今天晴。", result);
        ArgumentCaptor<Request> requestCaptor = ArgumentCaptor.forClass(Request.class);
        verify(httpClient).newCall(requestCaptor.capture());
        Request request = requestCaptor.getValue();
        assertEquals("http://core-link:18888/api/v1/mcp/call_tool", request.url().toString());
        JSONObject body = parseRequestBody(request);
        assertEquals("https://mcp.example.com/sse", body.getString("mcp_server_url"));
        assertEquals("get_weather", body.getString("tool_name"));
        assertEquals("北京", body.getJSONObject("tool_args").getString("city"));
    }

    @Test
    void testListTools_ReservedFunctionNameUsesPrefixedFallback() throws Exception {
        String serverUrl = "https://mcp.example.com/sse";
        when(httpClient.newCall(any(Request.class))).thenReturn(call);
        when(call.execute()).thenReturn(response);
        when(response.isSuccessful()).thenReturn(true);
        when(response.body()).thenReturn(ResponseBody.create(
                """
                        {
                          "code": 0,
                          "message": "success",
                          "data": {
                            "servers": [
                              {
                                "server_id": "",
                                "server_url": "https://mcp.example.com/sse",
                                "server_status": 0,
                                "tools": [
                                  {
                                    "name": "web_search",
                                    "description": "Search through a remote MCP server.",
                                    "inputSchema": {"type": "object", "properties": {}}
                                  }
                                ]
                              }
                            ]
                          }
                        }
                        """,
                MediaType.get("application/json; charset=utf-8")));

        List<McpRuntimeToolService.McpRuntimeTool> tools = service.listTools(List.of(serverUrl));

        assertEquals(1, tools.size());
        assertEquals("web_search", tools.getFirst().toolName());
        assertTrue(tools.getFirst().functionName().startsWith("mcp_"));
        assertTrue(tools.getFirst().functionName().contains("web_search"));
    }

    private JSONObject parseRequestBody(Request request) throws IOException {
        assertNotNull(request.body());
        Buffer sink = new Buffer();
        request.body().writeTo(sink);
        return JSON.parseObject(sink.readUtf8());
    }
}
