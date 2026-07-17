package com.iflytek.astron.console.hub.config;

import org.junit.jupiter.api.Test;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

import static org.junit.jupiter.api.Assertions.assertInstanceOf;

class AgentMemoryExecutorConfigTest {

    @Test
    void agentMemoryExecutorRejectsInsteadOfRunningOnCallerThread() {
        Executor executor = new AgentMemoryExecutorConfig().agentMemoryExecutor();
        ThreadPoolTaskExecutor taskExecutor = assertInstanceOf(ThreadPoolTaskExecutor.class, executor);
        try {
            assertInstanceOf(ThreadPoolExecutor.AbortPolicy.class,
                    taskExecutor.getThreadPoolExecutor().getRejectedExecutionHandler());
        } finally {
            taskExecutor.shutdown();
        }
    }
}
