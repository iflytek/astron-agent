package com.iflytek.astron.console.hub.service.bot;

/** Preserves existing personality configuration when unmigrated workflows are copied. */
public interface PersonalityConfigService {
    void copyPersonalityConfig(Integer sourceBotId, Integer targetBotId);
}
