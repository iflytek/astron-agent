package com.iflytek.astron.console.hub.service.agentmemory.provider;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class Mem0MemoryProviderTest {

    private HttpServer server;

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void addTurnUsesMem0InferenceAndScopesByAppIdForSearchAndList() throws Exception {
        AtomicReference<JSONObject> addPayload = new AtomicReference<>();
        AtomicReference<JSONObject> searchPayload = new AtomicReference<>();
        AtomicReference<JSONObject> listPayload = new AtomicReference<>();
        AtomicReference<URI> listUri = new AtomicReference<>();
        AtomicReference<URI> clearUri = new AtomicReference<>();
        AtomicInteger eventPollCount = new AtomicInteger();
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/v3/memories/add/", exchange -> {
            addPayload.set(readJson(exchange));
            respond(exchange, 200, """
                    {"status":"PENDING","event_id":"event-1"}
                    """);
        });
        server.createContext("/v1/event/event-1/", exchange -> {
            int count = eventPollCount.incrementAndGet();
            respond(exchange, 200, count == 1
                    ? """
                            {"status":"RUNNING","event_id":"event-1"}
                            """
                    : """
                            {"status":"SUCCEEDED","event_id":"event-1","results":[{"id":"m1","data":{"memory":"用户喜欢打篮球"}}]}
                            """);
        });
        server.createContext("/v3/memories/search/", exchange -> {
            searchPayload.set(readJson(exchange));
            respond(exchange, 200, """
                    {"results":[
                        {"id":"m1","memory":"用户喜欢打篮球","score":0.3397,"metadata":{"source":"debug"}},
                        {"id":"m2","memory":"低相关记忆","score":0.09,"metadata":{"source":"debug"}}
                    ]}
                    """);
        });
        server.createContext("/v3/memories/", exchange -> {
            listPayload.set(readJson(exchange));
            listUri.set(exchange.getRequestURI());
            respond(exchange, 200, """
                    {"results":[{"id":"m1","memory":"用户喜欢打篮球","metadata":{"source":"debug"}}]}
                    """);
        });
        server.createContext("/v1/memories/", exchange -> {
            clearUri.set(exchange.getRequestURI());
            respond(exchange, 200, """
                    {"message":"Delete in progress"}
                    """);
        });
        server.start();

        Mem0MemoryProvider provider = new Mem0MemoryProvider(baseUrl(), Duration.ZERO);
        AgentMemoryProviderContext context = new AgentMemoryProviderContext(
                "test-key", "u1", 7, 3L, "bot-7", Map.of("bot_id", 7));

        provider.addTurn(context, new AgentMemoryTurn(
                "我喜欢打篮球", "已记住", "debug-session-1", "debug", Map.of()));
        List<AgentMemorySearchResult> results = provider.search(context, "我喜欢什么运动", 3, 0.1);
        List<AgentMemoryItem> items = provider.list(context, 2, 10);
        provider.clear(context);

        assertEquals(Boolean.TRUE, addPayload.get().getBoolean("infer"));
        assertEquals("u1", addPayload.get().getString("user_id"));
        assertEquals("bot-7", addPayload.get().getString("app_id"));
        assertFalse(addPayload.get().containsKey("agent_id"));
        assertEquals(2, eventPollCount.get());
        assertEquals("u1", searchPayload.get().getJSONObject("filters").getString("user_id"));
        assertEquals("bot-7", searchPayload.get().getJSONObject("filters").getString("app_id"));
        assertFalse(searchPayload.get().getJSONObject("filters").containsKey("agent_id"));
        assertEquals(3, searchPayload.get().getInteger("top_k"));
        assertEquals(0.1, searchPayload.get().getDouble("threshold"));
        assertFalse(searchPayload.get().containsKey("limit"));
        assertEquals("u1", listPayload.get().getJSONObject("filters").getString("user_id"));
        assertEquals("bot-7", listPayload.get().getJSONObject("filters").getString("app_id"));
        assertFalse(listPayload.get().getJSONObject("filters").containsKey("agent_id"));
        assertEquals("page=2&page_size=10", listUri.get().getRawQuery());
        assertEquals("user_id=u1&app_id=bot-7", clearUri.get().getRawQuery());
        assertFalse(listPayload.get().containsKey("page"));
        assertFalse(listPayload.get().containsKey("page_size"));
        assertEquals(1, results.size());
        assertEquals("用户喜欢打篮球", results.getFirst().memory());
        assertEquals(0.3397, results.getFirst().score());
        assertEquals(1, items.size());
        assertEquals("用户喜欢打篮球", items.getFirst().memory());
    }

    @Test
    void addTurnIgnoresNullAddResponseBody() throws Exception {
        AtomicInteger eventPollCount = new AtomicInteger();
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/v3/memories/add/", exchange -> respond(exchange, 200, "null"));
        server.createContext("/v1/event/event-1/", exchange -> {
            eventPollCount.incrementAndGet();
            respond(exchange, 200, """
                    {"status":"SUCCEEDED"}
                    """);
        });
        server.start();

        Mem0MemoryProvider provider = new Mem0MemoryProvider(baseUrl(), Duration.ZERO);
        provider.addTurn(context(), new AgentMemoryTurn(
                "我喜欢打篮球", "已记住", "debug-session-1", "debug", Map.of()));

        assertEquals(0, eventPollCount.get());
    }

    @Test
    void addTurnContinuesPollingWhenEventResponseBodyIsNull() throws Exception {
        AtomicInteger eventPollCount = new AtomicInteger();
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/v3/memories/add/", exchange -> respond(exchange, 200, """
                {"status":"PENDING","event_id":"event-1"}
                """));
        server.createContext("/v1/event/event-1/", exchange -> {
            int count = eventPollCount.incrementAndGet();
            respond(exchange, 200, count == 1 ? "null" : """
                    {"status":"SUCCEEDED"}
                    """);
        });
        server.start();

        Mem0MemoryProvider provider = new Mem0MemoryProvider(baseUrl(), Duration.ZERO);
        provider.addTurn(context(), new AgentMemoryTurn(
                "我喜欢打篮球", "已记住", "debug-session-1", "debug", Map.of()));

        assertEquals(2, eventPollCount.get());
    }

    private String baseUrl() {
        return "http://127.0.0.1:" + server.getAddress().getPort();
    }

    private AgentMemoryProviderContext context() {
        return new AgentMemoryProviderContext(
                "test-key", "u1", 7, 3L, "bot-7", Map.of("bot_id", 7));
    }

    private JSONObject readJson(HttpExchange exchange) throws IOException {
        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        return JSON.parseObject(body);
    }

    private void respond(HttpExchange exchange, int statusCode, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(statusCode, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }
}
