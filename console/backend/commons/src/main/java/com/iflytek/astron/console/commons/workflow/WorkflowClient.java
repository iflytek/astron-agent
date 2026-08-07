package com.iflytek.astron.console.commons.workflow;

import lombok.extern.slf4j.Slf4j;
import okhttp3.ConnectionPool;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.sse.EventSource;
import okhttp3.sse.EventSourceListener;
import okhttp3.sse.EventSources;

import java.util.concurrent.TimeUnit;

/**
 * @author mingsuiyongheng
 */
@Slf4j
public class WorkflowClient {

    String chatUrl;

    private String appId;

    private String appKey;

    private String appSecret;

    private Request request;

    private RequestBody requestBody;

    private EventSource eventSource;

    private static final OkHttpClient okHttpClient = new OkHttpClient.Builder()
            .connectTimeout(180, TimeUnit.SECONDS)
            .readTimeout(180, TimeUnit.SECONDS)
            .writeTimeout(180, TimeUnit.SECONDS)
            .callTimeout(420, TimeUnit.SECONDS)
            .connectionPool(new ConnectionPool(1000, 10, TimeUnit.MINUTES))
            .build();

    public WorkflowClient(String chatUrl, String appId, String appKey, String appSecret, RequestBody requestBody) {
        this.chatUrl = chatUrl;
        this.appId = appId;
        this.appKey = appKey;
        this.appSecret = appSecret;
        this.requestBody = requestBody;
    }

    /**
     * Create WebSocket connection
     *
     * @param sseListener Listener for handling SSE events
     */
    public void createWebSocketConnect(EventSourceListener sseListener) {
        // Platform chain large model interface wsURL
        String wsURL = chatUrl;
        this.request = new Request.Builder()
                .header("X-Consumer-Username", appId)
                .header("Authorization", genAuthorization())
                .url(wsURL)
                .post(requestBody)
                .build();
        this.newSSE(sseListener);
    }

    /**
     * Create a new EventSource object and handle events using the given listener.
     *
     * @param listener EventSourceListener object for handling events
     */
    private void newSSE(EventSourceListener listener) {
        EventSource.Factory factory = EventSources.createFactory(okHttpClient);
        eventSource = factory.newEventSource(request, listener);
    }

    /**
     * Method to close SSE event source. Cancels the event source if eventSource is not null.
     */
    public void closeSse() {
        if (this.eventSource != null) {
            this.eventSource.cancel();
        }
    }

    /**
     * Generate authorization information
     *
     * @return Returns authorization string with appKey and appSecret, format: Bearer
     *         <appKey>:<appSecret>
     */
    public String genAuthorization() {
        return "Bearer " + appKey + ":" + appSecret;
    }
}
