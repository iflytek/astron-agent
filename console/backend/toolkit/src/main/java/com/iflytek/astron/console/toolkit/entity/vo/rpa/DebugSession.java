package com.iflytek.astron.console.toolkit.entity.vo.rpa;

import com.iflytek.astron.console.toolkit.entity.enumVo.DebugStatus;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

public class DebugSession {
    private final String debugId = UUID.randomUUID().toString();

    private final String projectId;
    private final Integer version;
    private final String execPosition;
    private final Map<String, Object> params;


    private volatile String apiToken;
    // RPA return
    private volatile String executionId;
    private volatile DebugStatus status = DebugStatus.CREATED;
    // Error or prompt message
    private volatile String message;
    // If the third party does not provide, keep 0
    private volatile int progress = 0;
    private volatile Instant createdAt = Instant.now();
    private volatile Instant updatedAt = Instant.now();
    // Lifecycle (ms)
    private final long expireAtEpochMilli;
    private final AtomicInteger retries = new AtomicInteger(0);
    // Current polling interval (ms)
    private volatile long nextPollMs;

    public DebugSession(String projectId, Integer version, String execPosition, Map<String, Object> params, String apiToken, long timeoutSeconds, long initialPollMs) {
        this.projectId = projectId;
        this.version = version;
        this.execPosition = (execPosition == null || execPosition.isBlank()) ? "EXECUTOR" : execPosition;
        this.apiToken = apiToken;
        this.params = params;
        this.expireAtEpochMilli = System.currentTimeMillis() + timeoutSeconds * 1000;
        this.nextPollMs = initialPollMs;
    }

    public String getDebugId() {
        return debugId;
    }

    public String getProjectId() {
        return projectId;
    }

    public Integer getVersion() {
        return version;
    }

    public String getExecPosition() {
        return execPosition;
    }

    public Map<String, Object> getParams() {
        return params;
    }

    public String getExecutionId() {
        return executionId;
    }

    public void setExecutionId(String executionId) {
        this.executionId = executionId;
        touch();
    }

    public DebugStatus getStatus() {
        return status;
    }

    public void setStatus(DebugStatus status) {
        this.status = status;
        touch();
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
        touch();
    }

    public int getProgress() {
        return progress;
    }

    public void setProgress(int progress) {
        this.progress = progress;
        touch();
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void touch() {
        this.updatedAt = Instant.now();
    }

    public boolean isExpired() {
        return System.currentTimeMillis() > expireAtEpochMilli;
    }

    public int incRetries() {
        return retries.incrementAndGet();
    }

    public int getRetries() {
        return retries.get();
    }

    public long getNextPollMs() {
        return nextPollMs;
    }

    public void setNextPollMs(long nextPollMs) {
        this.nextPollMs = nextPollMs;
    }

    public String getApiToken() {
        return apiToken;
    }

    public void setApiToken(String apiToken) {
        this.apiToken = apiToken;
    }
}
