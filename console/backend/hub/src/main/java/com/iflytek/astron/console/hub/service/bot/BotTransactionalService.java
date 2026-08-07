package com.iflytek.astron.console.hub.service.bot;


import jakarta.servlet.http.HttpServletRequest;

/**
 * @description Helper transaction operations: Directly using the service itself within the service
 *              will cause AOP to fail, thereby leading to transaction failure.
 */
public interface BotTransactionalService {
    void copyBot(String uid, Integer botId, HttpServletRequest request, Long spaceId);
}
