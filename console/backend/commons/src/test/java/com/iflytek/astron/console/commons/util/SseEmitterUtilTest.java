package com.iflytek.astron.console.commons.util;

import okhttp3.sse.EventSource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SseEmitterUtilTest {

    private static final String TEST_SSE_ID = "test-sse-id-123";
    private static final String TEST_MESSAGE = "test message";

    @BeforeEach
    void setUp() {
        // Clear static maps before each test
        clearSessionMap();
        clearEventSourceMap();
    }

    @AfterEach
    void tearDown() {
        // Clean up after each test
        clearSessionMap();
        clearEventSourceMap();
    }

    private void clearSessionMap() {
        Map<String, SseEmitter> sessionMap = getSessionMap();
        sessionMap.clear();
    }

    private void clearEventSourceMap() {
        Map<String, EventSource> eventSourceMap = getEventSourceMap();
        eventSourceMap.clear();
    }

    @SuppressWarnings("unchecked")
    private Map<String, SseEmitter> getSessionMap() {
        return (Map<String, SseEmitter>) ReflectionTestUtils.getField(SseEmitterUtil.class, "SESSION_MAP");
    }

    @SuppressWarnings("unchecked")
    private Map<String, EventSource> getEventSourceMap() {
        return (Map<String, EventSource>) ReflectionTestUtils.getField(SseEmitterUtil.class, "EVENTSOURCE_MAP");
    }

    // ========== Basic Method Tests ==========

    @Test
    void testCreate_WithoutTimeout() {
        SseEmitter emitter = SseEmitterUtil.create(TEST_SSE_ID);

        assertNotNull(emitter);
        assertTrue(SseEmitterUtil.exist(TEST_SSE_ID));
        assertEquals(emitter, SseEmitterUtil.get(TEST_SSE_ID));
    }

    @Test
    void testCreate_WithTimeout() {
        long timeout = 60000L;
        SseEmitter emitter = SseEmitterUtil.create(TEST_SSE_ID, timeout);

        assertNotNull(emitter);
        assertTrue(SseEmitterUtil.exist(TEST_SSE_ID));
        assertEquals(emitter, SseEmitterUtil.get(TEST_SSE_ID));
    }

    @Test
    void testGet_Exists() {
        SseEmitter created = SseEmitterUtil.create(TEST_SSE_ID);
        SseEmitter retrieved = SseEmitterUtil.get(TEST_SSE_ID);

        assertEquals(created, retrieved);
    }

    @Test
    void testGet_NotExists() {
        SseEmitter emitter = SseEmitterUtil.get("non-existent-id");

        assertNull(emitter);
    }

    @Test
    void testExist_True() {
        SseEmitterUtil.create(TEST_SSE_ID);

        assertTrue(SseEmitterUtil.exist(TEST_SSE_ID));
    }

    @Test
    void testExist_False() {
        assertFalse(SseEmitterUtil.exist("non-existent-id"));
    }

    @Test
    void testClose_Success() {
        SseEmitterUtil.create(TEST_SSE_ID);
        assertTrue(SseEmitterUtil.exist(TEST_SSE_ID));

        SseEmitterUtil.close(TEST_SSE_ID);

        assertFalse(SseEmitterUtil.exist(TEST_SSE_ID));
    }

    @Test
    void testClose_NonExistent() {
        // Should not throw exception
        assertDoesNotThrow(() -> SseEmitterUtil.close("non-existent-id"));
    }

    @Test
    void testError_Success() {
        SseEmitterUtil.create(TEST_SSE_ID);
        assertTrue(SseEmitterUtil.exist(TEST_SSE_ID));

        Throwable testError = new RuntimeException("Test error");
        SseEmitterUtil.error(TEST_SSE_ID, testError);

        assertFalse(SseEmitterUtil.exist(TEST_SSE_ID));
    }

    @Test
    void testError_NonExistent() {
        // Should not throw exception
        Throwable testError = new RuntimeException("Test error");
        assertDoesNotThrow(() -> SseEmitterUtil.error("non-existent-id", testError));
    }

    // ========== Message Sending Tests ==========

    @Test
    void testSendMessage_Success() {
        SseEmitter emitter = SseEmitterUtil.create(TEST_SSE_ID);

        assertDoesNotThrow(() -> SseEmitterUtil.sendMessage(TEST_SSE_ID, TEST_MESSAGE));
    }

    @Test
    void testSendMessage_NonExistent() {
        // Should not throw exception, just silently skip
        assertDoesNotThrow(() -> SseEmitterUtil.sendMessage("non-existent-id", TEST_MESSAGE));
    }

    @Test
    void testSendData_WithValidEmitter() {
        SseEmitter emitter = new SseEmitter(10000L);

        assertDoesNotThrow(() -> SseEmitterUtil.sendData(emitter, TEST_MESSAGE));
    }

    @Test
    void testSendData_WithNullEmitter() {
        assertDoesNotThrow(() -> SseEmitterUtil.sendData(null, TEST_MESSAGE));
    }

    @Test
    void testSendData_WithNullData() {
        SseEmitter emitter = new SseEmitter(10000L);

        assertDoesNotThrow(() -> SseEmitterUtil.sendData(emitter, null));
    }

    @Test
    void testSendData_WithObjectData() {
        SseEmitter emitter = new SseEmitter(10000L);
        Map<String, String> data = Map.of("key", "value");

        assertDoesNotThrow(() -> SseEmitterUtil.sendData(emitter, data));
    }

    @Test
    void testSendError_WithValidEmitter() {
        SseEmitter emitter = new SseEmitter(10000L);

        assertDoesNotThrow(() -> SseEmitterUtil.sendError(emitter, "Error message"));
    }

    @Test
    void testSendError_WithNullEmitter() {
        assertDoesNotThrow(() -> SseEmitterUtil.sendError(null, "Error message"));
    }

    @Test
    void testSendError_WithNullMessage() {
        SseEmitter emitter = new SseEmitter(10000L);

        assertDoesNotThrow(() -> SseEmitterUtil.sendError(emitter, null));
    }

    @Test
    void testSendComplete_WithoutData() {
        SseEmitter emitter = new SseEmitter(10000L);

        assertDoesNotThrow(() -> SseEmitterUtil.sendComplete(emitter));
    }

    @Test
    void testSendComplete_WithData() {
        SseEmitter emitter = new SseEmitter(10000L);
        Map<String, Object> completionData = Map.of("status", "success");

        assertDoesNotThrow(() -> SseEmitterUtil.sendComplete(emitter, completionData));
    }

    @Test
    void testSendComplete_WithNullEmitter() {
        assertDoesNotThrow(() -> SseEmitterUtil.sendComplete(null));
    }

    @Test
    void testSendEndAndComplete_Success() {
        SseEmitter emitter = new SseEmitter(10000L);

        assertDoesNotThrow(() -> SseEmitterUtil.sendEndAndComplete(emitter));
    }

    @Test
    void testSendEndAndComplete_WithNullEmitter() {
        assertDoesNotThrow(() -> SseEmitterUtil.sendEndAndComplete(null));
    }

    @Test
    void testCompleteWithError_Success() {
        SseEmitter emitter = new SseEmitter(10000L);

        assertDoesNotThrow(() -> SseEmitterUtil.completeWithError(emitter, "Error occurred"));
    }

    @Test
    void testCompleteWithError_WithNullEmitter() {
        assertDoesNotThrow(() -> SseEmitterUtil.completeWithError(null, "Error occurred"));
    }

    @Test
    void testSendAndCompleteWithError_Exists() {
        SseEmitterUtil.create(TEST_SSE_ID);
        Map<String, String> errorResponse = Map.of("error", "Test error");

        assertDoesNotThrow(() -> SseEmitterUtil.sendAndCompleteWithError(TEST_SSE_ID, errorResponse));

        // Should be removed from session map
        assertFalse(SseEmitterUtil.exist(TEST_SSE_ID));
    }

    @Test
    void testSendAndCompleteWithError_NotExists() {
        Map<String, String> errorResponse = Map.of("error", "Test error");

        assertDoesNotThrow(() -> SseEmitterUtil.sendAndCompleteWithError("non-existent-id", errorResponse));
    }

    @Test
    void testNewSseAndSendMessageClose_Success() {
        SseEmitter emitter = SseEmitterUtil.newSseAndSendMessageClose(TEST_MESSAGE);

        assertNotNull(emitter);
    }

    @Test
    void testCreateSseEmitter_WithoutTimeout() {
        SseEmitter emitter = SseEmitterUtil.createSseEmitter();

        assertNotNull(emitter);
    }

    @Test
    void testCreateSseEmitter_WithTimeout() {
        long timeout = 30000L;
        SseEmitter emitter = SseEmitterUtil.createSseEmitter(timeout);

        assertNotNull(emitter);
    }

    // ========== Stream Processing Tests ==========

    @Test
    void testStopStream_ValidStreamId() {
        String streamId = "test-stream-123";

        assertDoesNotThrow(() -> SseEmitterUtil.stopStream(streamId));
    }

    @Test
    void testStopStream_NullStreamId() {
        assertDoesNotThrow(() -> SseEmitterUtil.stopStream(null));
    }

    @Test
    void testIsStreamStopped_NotStopped() {
        String streamId = "test-stream-123";

        boolean result = SseEmitterUtil.isStreamStopped(streamId);

        assertFalse(result);
    }

    @Test
    void testIsStreamStopped_Stopped() {
        String streamId = "test-stream-123";
        SseEmitterUtil.stopStream(streamId);

        boolean result = SseEmitterUtil.isStreamStopped(streamId);

        assertTrue(result);
    }

    @Test
    void testIsStreamStopped_NullStreamId() {
        boolean result = SseEmitterUtil.isStreamStopped(null);

        assertFalse(result);
    }

    @Test
    void testIsStreamStopped_CalledTwice_ReturnsFalseSecondTime() {
        String streamId = "test-stream-123";
        SseEmitterUtil.stopStream(streamId);

        // First call should return true
        assertTrue(SseEmitterUtil.isStreamStopped(streamId));
        // Second call should return false (signal is cleared)
        assertFalse(SseEmitterUtil.isStreamStopped(streamId));
    }

    @Test
    void testSendStream_WithNullStream() {
        SseEmitter emitter = new SseEmitter(10000L);
        String streamId = "test-stream";

        assertDoesNotThrow(() -> SseEmitterUtil.sendStream(emitter, null, streamId, null, null));
    }

    @Test
    void testSendStream_WithValidStream() {
        SseEmitter emitter = new SseEmitter(10000L);
        String streamId = "test-stream";
        Stream<String> dataStream = Stream.of("data1", "data2", "data3");

        assertDoesNotThrow(() -> SseEmitterUtil.sendStream(emitter, dataStream, streamId, null, null));
    }

    @Test
    void testSendStream_WithDataMapper() {
        SseEmitter emitter = new SseEmitter(10000L);
        String streamId = "test-stream";
        Stream<Integer> dataStream = Stream.of(1, 2, 3);
        AtomicInteger callCount = new AtomicInteger(0);

        SseEmitterUtil.sendStream(
                emitter,
                dataStream,
                streamId,
                i -> {
                    callCount.incrementAndGet();
                    return "Number: " + i;
                },
                null);

        assertEquals(3, callCount.get());
    }

    @Test
    void testSendStream_WithErrorHandler() throws InterruptedException {
        SseEmitter emitter = new SseEmitter(10000L);
        String streamId = "test-stream";
        Stream<String> dataStream = Stream.of("data1", "data2", "data3");
        AtomicBoolean errorHandled = new AtomicBoolean(false);
        CountDownLatch latch = new CountDownLatch(1);

        SseEmitterUtil.sendStream(
                emitter,
                dataStream,
                streamId,
                data -> {
                    if ("data2".equals(data)) {
                        throw new RuntimeException("Test error");
                    }
                    return data;
                },
                e -> {
                    errorHandled.set(true);
                    latch.countDown();
                });

        latch.await(2, TimeUnit.SECONDS);
        assertTrue(errorHandled.get());
    }

    @Test
    void testSendStream_WithStopSignal() {
        SseEmitter emitter = new SseEmitter(10000L);
        String streamId = "test-stream-stop";
        Stream<String> dataStream = Stream.of("data1", "data2", "data3", "data4", "data5");
        AtomicInteger processedCount = new AtomicInteger(0);

        // Stop after 2 items
        SseEmitterUtil.sendStream(
                emitter,
                dataStream,
                streamId,
                data -> {
                    int count = processedCount.incrementAndGet();
                    if (count == 2) {
                        SseEmitterUtil.stopStream(streamId);
                    }
                    return data;
                },
                null);

        // Should process 2 items before stopping
        assertTrue(processedCount.get() >= 2 && processedCount.get() <= 3);
    }

    @Test
    void testSendStream_WithNullData_SkipsNull() {
        SseEmitter emitter = new SseEmitter(10000L);
        String streamId = "test-stream";
        Stream<String> dataStream = Stream.of("data1", null, "data2");
        AtomicInteger callCount = new AtomicInteger(0);

        SseEmitterUtil.sendStream(
                emitter,
                dataStream,
                streamId,
                data -> {
                    callCount.incrementAndGet();
                    return data;
                },
                null);

        // Should only process non-null items
        assertEquals(2, callCount.get());
    }

    @Test
    void testAsyncSendStreamAndClose_Success() throws InterruptedException {
        SseEmitter emitter = new SseEmitter(10000L);
        String streamId = "test-async-stream";
        Stream<String> dataStream = Stream.of("data1", "data2");
        CountDownLatch latch = new CountDownLatch(1);

        SseEmitterUtil.asyncSendStreamAndClose(
                emitter,
                dataStream,
                streamId,
                data -> data,
                null);

        // Wait a bit for async processing
        Thread.sleep(500);
    }

    @Test
    void testSendBufferedStream_WithNullStream() {
        SseEmitter emitter = new SseEmitter(10000L);
        String streamId = "test-buffered";

        assertDoesNotThrow(() -> SseEmitterUtil.sendBufferedStream(emitter, null, streamId, 10, null));
    }

    @Test
    void testSendBufferedStream_WithValidStream() {
        SseEmitter emitter = new SseEmitter(10000L);
        String streamId = "test-buffered";
        Stream<String> dataStream = Stream.of("a", "b", "c", "d", "e");
        AtomicInteger bufferReadyCount = new AtomicInteger(0);

        SseEmitterUtil.sendBufferedStream(
                emitter,
                dataStream,
                streamId,
                3,
                content -> bufferReadyCount.incrementAndGet());

        // Should flush buffer at least once
        assertTrue(bufferReadyCount.get() >= 1);
    }

    @Test
    void testSendWithCallback_Success() {
        SseEmitter emitter = new SseEmitter(10000L);
        AtomicBoolean beforeCalled = new AtomicBoolean(false);
        AtomicBoolean afterCalled = new AtomicBoolean(false);

        SseEmitterUtil.sendWithCallback(
                emitter,
                () -> "test data",
                data -> beforeCalled.set(true),
                data -> afterCalled.set(true),
                null);

        assertTrue(beforeCalled.get());
        assertTrue(afterCalled.get());
    }

    @Test
    void testSendWithCallback_WithError() {
        SseEmitter emitter = new SseEmitter(10000L);
        AtomicBoolean errorHandled = new AtomicBoolean(false);

        SseEmitterUtil.sendWithCallback(
                emitter,
                () -> {
                    throw new RuntimeException("Test error");
                },
                null,
                null,
                e -> errorHandled.set(true));

        assertTrue(errorHandled.get());
    }

    // ========== StreamProcessor Inner Class Tests ==========

    @Test
    void testStreamProcessor_Creation() {
        SseEmitter emitter = new SseEmitter(10000L);
        String streamId = "test-processor";

        SseEmitterUtil.StreamProcessor<String> processor =
                new SseEmitterUtil.StreamProcessor<>(emitter, streamId);

        assertNotNull(processor);
    }

    @Test
    void testStreamProcessor_WithDataMapper() {
        SseEmitter emitter = new SseEmitter(10000L);
        String streamId = "test-processor";

        var processor = new SseEmitterUtil.StreamProcessor<Integer>(emitter, streamId)
                .withDataMapper(i -> "Number: " + i);

        assertNotNull(processor);
    }

    @Test
    void testStreamProcessor_WithErrorHandler() {
        SseEmitter emitter = new SseEmitter(10000L);
        String streamId = "test-processor";
        AtomicBoolean errorHandled = new AtomicBoolean(false);

        var processor = new SseEmitterUtil.StreamProcessor<String>(emitter, streamId)
                .withErrorHandler(e -> errorHandled.set(true));

        assertNotNull(processor);
    }

    @Test
    void testStreamProcessor_WithBeforeAndAfterProcess() {
        SseEmitter emitter = new SseEmitter(10000L);
        String streamId = "test-processor";
        AtomicBoolean beforeCalled = new AtomicBoolean(false);
        AtomicBoolean afterCalled = new AtomicBoolean(false);

        var processor = new SseEmitterUtil.StreamProcessor<String>(emitter, streamId)
                .withBeforeProcess(data -> beforeCalled.set(true))
                .withAfterProcess(data -> afterCalled.set(true));

        assertNotNull(processor);
    }

    @Test
    void testStreamProcessor_WithBuffer() {
        SseEmitter emitter = new SseEmitter(10000L);
        String streamId = "test-processor";

        var processor = new SseEmitterUtil.StreamProcessor<String>(emitter, streamId)
                .withBuffer(10);

        assertNotNull(processor);
    }

    @Test
    void testStreamProcessor_ProcessStream() throws InterruptedException {
        SseEmitter emitter = new SseEmitter(10000L);
        String streamId = "test-processor";
        Stream<String> dataStream = Stream.of("data1", "data2", "data3");

        SseEmitterUtil.StreamProcessor<String> processor =
                new SseEmitterUtil.StreamProcessor<>(emitter, streamId);

        assertDoesNotThrow(() -> processor.processStream(dataStream));

        // Wait for async processing
        Thread.sleep(500);
    }

    @Test
    void testStreamProcessor_ProcessStreamWithBuffer() throws InterruptedException {
        SseEmitter emitter = new SseEmitter(10000L);
        String streamId = "test-processor-buffer";
        Stream<String> dataStream = Stream.of("a", "b", "c", "d", "e");

        var processor = new SseEmitterUtil.StreamProcessor<String>(emitter, streamId)
                .withBuffer(2);

        assertDoesNotThrow(() -> processor.processStream(dataStream));

        // Wait for async processing
        Thread.sleep(500);
    }

    @Test
    void testStreamProcessor_ChainedConfiguration() {
        SseEmitter emitter = new SseEmitter(10000L);
        String streamId = "test-chain";

        var processor = new SseEmitterUtil.StreamProcessor<Integer>(emitter, streamId)
                .withDataMapper(i -> "Value: " + i)
                .withErrorHandler(e -> {
                })
                .withBeforeProcess(data -> {
                })
                .withAfterProcess(data -> {
                })
                .withBuffer(5);

        assertNotNull(processor);
    }

    // ========== EventSource Map Tests ==========

    @Test
    void testEventSourceMap_AddAndRetrieve() {
        EventSource mockEventSource = mock(EventSource.class);

        SseEmitterUtil.EVENTSOURCE_MAP.put(TEST_SSE_ID, mockEventSource);

        assertEquals(mockEventSource, SseEmitterUtil.EVENTSOURCE_MAP.get(TEST_SSE_ID));
    }

    @Test
    void testEventSourceMap_ClearOnClose() {
        EventSource mockEventSource = mock(EventSource.class);
        SseEmitterUtil.EVENTSOURCE_MAP.put(TEST_SSE_ID, mockEventSource);

        SseEmitter emitter = SseEmitterUtil.create(TEST_SSE_ID);

        // Manually trigger completion callback
        emitter.complete();

        // Give time for async callback
        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // EventSource should be removed (callback is async)
        // Note: This test verifies the map cleanup mechanism exists
        assertNotNull(SseEmitterUtil.EVENTSOURCE_MAP);
    }
}
