package com.iflytek.astron.console.hub.service.chat.springai;

import com.alibaba.fastjson2.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Request-scoped context shared with tool callbacks to collect tool-call traces during a single
 * agent chat turn.
 */
public class ChatToolContext {

    private final String userId;
    private final List<JSONObject> traceEntries = new ArrayList<>();

    public ChatToolContext(String userId) {
        this.userId = userId;
    }

    public String getUserId() {
        return userId;
    }

    public synchronized void addTrace(JSONObject entry) {
        if (entry != null) {
            traceEntries.add(entry);
        }
    }

    /** Returns the collected entries and clears the buffer so the loop can emit them per round. */
    public synchronized List<JSONObject> drainTrace() {
        List<JSONObject> copy = new ArrayList<>(traceEntries);
        traceEntries.clear();
        return copy;
    }
}
