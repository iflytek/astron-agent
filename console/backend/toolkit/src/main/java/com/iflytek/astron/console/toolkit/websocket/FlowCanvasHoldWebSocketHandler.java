package com.iflytek.astron.console.toolkit.websocket;

import com.iflytek.astron.console.toolkit.util.*;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.jetbrains.annotations.NotNull;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * WebSocket handler for maintaining flow canvas real-time connections.
 * <p>
 * This handler keeps track of active WebSocket sessions associated with workflow canvases. Each
 * session corresponds to a specific flowId and sends periodic heartbeat messages to Redis to
 * indicate the connection's liveness.
 * </p>
 *
 * <p>
 * <b>Key responsibilities:</b>
 * </p>
 * <ul>
 * <li>Track session-to-flowId mapping.</li>
 * <li>Record heartbeat timestamps in Redis for each session.</li>
 * <li>Respond to ping messages with "pong".</li>
 * <li>Count and return the number of alive sessions for each flow.</li>
 * <li>Automatically clean up expired heartbeats every 10 seconds.</li>
 * </ul>
 *
 * @author
 * @since 2025/10/09
 */
@Slf4j
public class FlowCanvasHoldWebSocketHandler extends TextWebSocketHandler {

    /** Redis key prefix used to store heartbeat timestamps. */
    private static final String REDIS_HEARTBEAT_PREFIX = "spark_bot:workflow:canvas_heartbeat:";

    /** Redis utility bean for interacting with Redis. */
    private static final RedisUtil redisUtil = SpringUtils.getBean(RedisUtil.class);

    /** Mapping between WebSocket sessionId and flowId. */
    private static final Map<String, String> flowIdMap = new ConcurrentHashMap<>();

    /** Heartbeat expiration time in milliseconds. */
    private static final long HEARTBEAT_EXPIRE_MS = 30_000;

    /**
     * Called when a new WebSocket connection is established.
     * <p>
     * Retrieves the flowId from query parameters, validates it, and records the session heartbeat
     * timestamp in Redis. Returns the number of alive sessions.
     * </p>
     *
     * @param session the {@link WebSocketSession} that has been established
     * @throws IOException if sending message or closing session fails
     */
    @Override
    public void afterConnectionEstablished(@NotNull WebSocketSession session) throws IOException {
        Map<String, String> queryParameters = URIUtils.getQueryParameters(session.getUri());
        String flowId = queryParameters.get("flowId");
        if (StringUtils.isEmpty(flowId)) {
            session.sendMessage(new TextMessage("flowId cannot be empty"));
            session.close();
            return;
        }

        String redisKey = REDIS_HEARTBEAT_PREFIX + flowId;
        long now = System.currentTimeMillis();
        redisUtil.hset(redisKey, session.getId(), String.valueOf(now));

        flowIdMap.put(session.getId(), flowId);

        int aliveCount = countAliveSessions(redisKey, now);
        session.sendMessage(new TextMessage(String.valueOf(aliveCount)));
    }

    /**
     * Handles text messages received from the WebSocket client.
     * <p>
     * If the message is a "ping", updates the heartbeat timestamp and replies with "pong". Otherwise,
     * calculates and sends the number of alive sessions.
     * </p>
     *
     * @param session the {@link WebSocketSession} associated with this message
     * @param message the {@link TextMessage} received from the client
     * @throws IOException if sending message fails
     */
    @Override
    public void handleTextMessage(@NotNull WebSocketSession session, @NotNull TextMessage message) throws IOException {
        String flowId = flowIdMap.get(session.getId());
        if (flowId == null)
            return;

        String redisKey = REDIS_HEARTBEAT_PREFIX + flowId;
        long now = System.currentTimeMillis();

        if ("ping".equals(message.getPayload())) {
            redisUtil.hset(redisKey, session.getId(), String.valueOf(now));
            session.sendMessage(new TextMessage("pong"));
            return;
        }

        int aliveCount = countAliveSessions(redisKey, now);
        session.sendMessage(new TextMessage(String.valueOf(aliveCount)));
    }

    /**
     * Handles transport-level errors during WebSocket communication.
     * <p>
     * Logs the error, notifies the client, and closes the session if necessary.
     * </p>
     *
     * @param session the {@link WebSocketSession} where the error occurred
     * @param exception the {@link Throwable} representing the error
     * @throws IOException if sending message or closing session fails
     */
    @Override
    public void handleTransportError(@NotNull WebSocketSession session, @NotNull Throwable exception) throws IOException {
        log.error("session[{}] handleTransportError, e = {}", session.getId(), exception.getMessage(), exception);
        if (session.isOpen()) {
            session.sendMessage(new TextMessage("Connection error: " + exception.getMessage()));
            session.close();
        }
    }

    /**
     * Called when a WebSocket connection is closed.
     * <p>
     * Removes the session from the flowId map and deletes its heartbeat record from Redis.
     * </p>
     *
     * @param session the {@link WebSocketSession} that was closed
     * @param status the {@link CloseStatus} indicating reason and code
     */
    @Override
    public void afterConnectionClosed(@NotNull WebSocketSession session, @NotNull CloseStatus status) {
        String flowId = flowIdMap.remove(session.getId());
        if (flowId == null)
            return;

        String redisKey = REDIS_HEARTBEAT_PREFIX + flowId;
        redisUtil.hdel(redisKey, session.getId());
    }

    /**
     * Counts the number of active (non-expired) heartbeat sessions.
     * <p>
     * Iterates through all heartbeat timestamps in Redis and counts sessions whose heartbeat time is
     * within the expiration window.
     * </p>
     *
     * @param redisKey the Redis hash key storing heartbeat data
     * @param now the current timestamp in milliseconds
     * @return the number of alive sessions
     */
    private int countAliveSessions(String redisKey, long now) {
        Map<Object, Object> allHeartbeats = redisUtil.hgetAll(redisKey);
        int count = 0;
        for (Map.Entry<Object, Object> entry : allHeartbeats.entrySet()) {
            try {
                long ts = Long.parseLong(entry.getValue().toString());
                if (now - ts <= HEARTBEAT_EXPIRE_MS) {
                    count++;
                }
            } catch (Exception e) {
                log.warn("Invalid heartbeat timestamp format: {}", entry, e);
            }
        }
        return count;
    }

    /**
     * Periodically clears expired session heartbeats.
     * <p>
     * This method runs every 10 seconds and removes entries older than {@link #HEARTBEAT_EXPIRE_MS}
     * from Redis.
     * </p>
     *
     * @implNote The scheduling interval is defined via {@code @Scheduled(fixedDelay = 10000)}.
     */
    @Scheduled(fixedDelay = 10000)
    public void clearExpiredHeartbeats() {
        long now = System.currentTimeMillis();
        long expireTime = now - HEARTBEAT_EXPIRE_MS;

        Set<String> keys = redisUtil.scan(REDIS_HEARTBEAT_PREFIX + "*");
        for (String key : keys) {
            Map<Object, Object> all = redisUtil.hgetAll(key);
            for (Map.Entry<Object, Object> entry : all.entrySet()) {
                try {
                    long ts = Long.parseLong(entry.getValue().toString());
                    if (ts < expireTime) {
                        redisUtil.hdel(key, entry.getKey().toString());
                    }
                } catch (Exception e) {
                    log.warn("Exception occurred while cleaning heartbeat: {} => {}", entry.getKey(), entry.getValue());
                }
            }
        }
    }
}
