package com.iflytek.astron.console.hub.service.chat.springai;

import com.iflytek.astron.console.hub.service.ManagedWebSearchService;
import com.iflytek.astron.console.hub.service.ManagedWebSearchService.SearchAugmentation;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class WebSearchToolCallbackTest {

    @Test
    void returnsSummaryAndCollectsTrace() {
        ManagedWebSearchService svc = mock(ManagedWebSearchService.class);
        when(svc.search("beijing weather", "u1")).thenReturn(new SearchAugmentation(
                "sunny [1]",
                "[{\"deskToolName\":\"Web Search\",\"web_search\":{\"outputs\":[{\"index\":1,\"url\":\"http://x\",\"title\":\"t\"}]}}]",
                false, null));
        ChatToolContext ctx = new ChatToolContext("u1");
        WebSearchToolCallback cb = new WebSearchToolCallback(svc, ctx);

        String out = cb.call("{\"query\":\"beijing weather\"}");

        assertTrue(out.contains("sunny"));
        assertEquals(1, ctx.drainTrace().size());
        assertEquals("web_search", cb.getToolDefinition().name());
    }

    @Test
    void failedSearchReturnsMessageNoTrace() {
        ManagedWebSearchService svc = mock(ManagedWebSearchService.class);
        when(svc.search(anyString(), anyString())).thenReturn(new SearchAugmentation("", "", true, "timeout"));
        ChatToolContext ctx = new ChatToolContext("u1");
        WebSearchToolCallback cb = new WebSearchToolCallback(svc, ctx);

        String out = cb.call("{\"query\":\"x\"}");

        assertNotNull(out);
        assertTrue(ctx.drainTrace().isEmpty());
    }

    @Test
    void malformedInputDoesNotThrow() {
        ManagedWebSearchService svc = mock(ManagedWebSearchService.class);
        WebSearchToolCallback cb = new WebSearchToolCallback(svc, new ChatToolContext("u1"));
        // Malformed JSON -> no query parsed -> graceful message, no exception
        assertEquals("No query provided.", cb.call("not-json{"));
    }
}
