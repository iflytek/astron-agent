package com.iflytek.astron.console.commons.util;

import cn.hutool.core.thread.ThreadUtil;
import com.alibaba.fastjson2.JSON;
import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import lombok.extern.slf4j.Slf4j;
import okhttp3.sse.EventSource;
import org.apache.logging.log4j.util.Base64Util;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Supplier;
import java.util.stream.Stream;

/**
 * @author mingsuiyongheng
 */
@Slf4j
public class SseEmitterUtil {

    private static final long DEFAULT_SSE_TIMEOUT_MS = 8 * 60 * 1000L;
    private static final String END_DATA = "{\"end\":true,\"timestamp\":" + System.currentTimeMillis() + "}";

    private static final Cache<String, Boolean> streamStopSignalSet = CacheBuilder.newBuilder()
            .expireAfterWrite(16, TimeUnit.SECONDS)
            .build();

    /**
     * Use Map object for easy access to SseEmitter by userId, or store in Redis
     */
    private static final Map<String, SseEmitter> SESSION_MAP = new ConcurrentHashMap<>(256);

    public static final Map<String, EventSource> EVENTSOURCE_MAP = new ConcurrentHashMap<>(256);

    public static SseEmitter get(String sseId) {
        return SESSION_MAP.get(sseId);
    }

    public static boolean exist(String sseId) {
        return get(sseId) != null;
    }

    /**
     * SSE response
     */
    public static void sendMsgLikeTypeWriter(String content, String sseId, Long interval) {
        try {
            // String contains no English letters, output character by character
            for (int j = 0; j < content.length(); j++) {
                // Send character by character through SSE
                SseEmitterUtil.sendMessage(sseId, Base64Util.encode(String.valueOf(content.charAt(j))));
                char codePoint = content.charAt(j);
                if ((codePoint >= 65 && codePoint <= 90)
                        || (codePoint >= 97 && codePoint <= 122)) {
                    ThreadUtil.sleep(1);
                } else {
                    if (interval > 0) {
                        ThreadUtil.sleep(interval);
                    }
                }
            }
        } catch (Exception e) {
            // Close WS
            if (e instanceof IllegalStateException) {
                log.error("Expired send content, SSE already closed");
            } else {
                log.error("SSE send exception", e);
            }
        }
    }

    /**
     * Create user connection and return SseEmitter
     *
     * @return SseEmitter
     */
    public static SseEmitter create(String sseId) {
        SseEmitter sseEmitter = new SseEmitter();
        // Register callbacks
        sseEmitter.onCompletion(completionCallBack(sseId));
        sseEmitter.onError(errorCallBack(sseId));
        sseEmitter.onTimeout(timeoutCallBack(sseId));
        SESSION_MAP.put(sseId, sseEmitter);
        return sseEmitter;
    }

    /**
     * Create a new SseEmitter object and register corresponding callback functions.
     *
     * @param sseId Unique ID for identifying the SseEmitter
     * @param timeout Timeout duration in milliseconds
     * @return Newly created SseEmitter object
     */
    public static SseEmitter create(String sseId, long timeout) {
        SseEmitter sseEmitter = new SseEmitter(timeout);
        // Register callbacks
        sseEmitter.onCompletion(completionCallBack(sseId));
        sseEmitter.onError(errorCallBack(sseId));
        sseEmitter.onTimeout(timeoutCallBack(sseId));
        SESSION_MAP.put(sseId, sseEmitter);
        return sseEmitter;
    }

    /**
     * Send message to specific user
     */
    public static void sendMessage(String sseId, Object message) {
        if (SESSION_MAP.containsKey(sseId)) {
            try {
                SESSION_MAP.get(sseId).send(message);
            } catch (IOException e) {
                if (e.getMessage().contains("Broken pipe")) {
                    // Frontend browser connection disconnected, adjust to info level
                    log.info("SSE[{}] push exception:{}", sseId, e.getMessage());
                } else {
                    log.error("SSE[{}]push exception:{}", sseId, e.getMessage());
                }
                close(sseId);
            }
        }
    }

    /**
     * Remove user connection
     */
    public static void close(String sseId) {
        try {
            SseEmitter sseEmitter = SESSION_MAP.get(sseId);
            if (sseEmitter != null) {
                // Close SSE
                sseEmitter.complete();
                SESSION_MAP.remove(sseId);
            }
        } catch (IllegalStateException e) {
            log.info("SSE already closed: {}", e.getMessage());
        }
    }

    /**
     * Handle error and close related SSE connection
     *
     * @param sseId SSE connection ID to process
     * @param t Thrown exception
     */
    public static void error(String sseId, Throwable t) {
        try {
            SseEmitter sseEmitter = SESSION_MAP.get(sseId);
            if (sseEmitter != null) {
                // Close SSE
                sseEmitter.completeWithError(t);
                SESSION_MAP.remove(sseId);
            }
        } catch (IllegalStateException e) {
            log.info("SSE already closed: {}", e.getMessage());
        }
    }

    /**
     * Create a Runnable object for completion callback
     *
     * @param sseId Server-Sent Events ID
     * @return A Runnable object for calling callback function when event completes
     */
    private static Runnable completionCallBack(String sseId) {
        return () -> {
            log.info("SSE[{}] completionCallBack", sseId);
            close(sseId);

            EventSource eventSource = EVENTSOURCE_MAP.get(sseId);
            if (eventSource != null) {
                eventSource.cancel();
                EVENTSOURCE_MAP.remove(sseId);
            }
        };
    }

    /**
     * Generate a timeout callback function
     *
     * @param sseId Unique identifier for server-sent events
     * @return Returns a Runnable object that calls close method to close corresponding SSE connection
     *         when executed
     */
    private static Runnable timeoutCallBack(String sseId) {
        return () -> {
            log.warn("SSE[{}] timeoutCallBack", sseId);
            close(sseId);
        };
    }

    /**
     * Error callback function generator
     *
     * @param sseId SSE ID
     * @return A Consumer object that accepts Throwable parameter for handling error situations
     */
    private static Consumer<Throwable> errorCallBack(String sseId) {
        return throwable -> {
            log.error("SSE[{}] errorCallBack : {}", sseId, throwable.getMessage(), throwable);
            error(sseId, throwable);
        };
    }

    /**
     * Create a new SseEmitter object, send message, and then close it.
     *
     * @param message Message object to send
     * @return Closed SseEmitter object
     */
    public static SseEmitter newSseAndSendMessageClose(Object message) {
        SseEmitter sseEmitter = new SseEmitter(10_000L);
        try {
            sseEmitter.send(message);
        } catch (IOException e) {
            log.info("newSseAndSendMessageClose exception: {}", e.getMessage());
        }
        sseEmitter.complete();
        return sseEmitter;
    }

    /**
     * Send error message and close connection
     */
    public static void sendAndCompleteWithError(String sseId, Object errorResponse) {
        SseEmitter emitter = SESSION_MAP.get(sseId);
        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event().name("error").data(errorResponse));
            } catch (IOException e) {
                log.warn("SSE[{}] send error message exception: {}", sseId, e.getMessage(), e);
            } finally {
                try {
                    emitter.completeWithError(new RuntimeException(errorResponse.toString()));
                } catch (Exception ex) {
                    log.warn("SSE[{}] completeWithError exception: {}", sseId, ex.getMessage(), ex);
                }
                SESSION_MAP.remove(sseId);
            }
        } else {
            log.warn("SSE[{}] does not exist, cannot send error message", sseId);
        }
    }

    /**
     * Create an SseEmitter instance with default timeout
     *
     * @return The created SseEmitter instance
     */
    public static SseEmitter createSseEmitter() {
        return createSseEmitter(DEFAULT_SSE_TIMEOUT_MS);
    }

    /**
     * Create an SseEmitter instance and set timeout, completion, error and timeout handlers.
     *
     * @param timeoutMs Timeout duration in milliseconds
     * @return SseEmitter instance
     */
    public static SseEmitter createSseEmitter(long timeoutMs) {
        SseEmitter emitter = new SseEmitter(timeoutMs);
        emitter.onCompletion(() -> log.debug("SseEmitter completed: {}", emitter.hashCode()));
        emitter.onError(e -> log.error("SseEmitter error: {}, message: {}", emitter.hashCode(), e.getMessage()));
        emitter.onTimeout(() -> log.warn("SseEmitter timeout: {}", emitter.hashCode()));
        return emitter;
    }

    /**
     * Stop stream processing
     *
     * @param streamId Stream ID to stop
     */
    public static void stopStream(String streamId) {
        if (streamId != null) {
            streamStopSignalSet.put(streamId, true);
            log.debug("Stream stop signal set for streamId: {}", streamId);
        }
    }

    /**
     * Asynchronously send data stream and close SseEmitter
     *
     * @param emitter SseEmitter object for sending events
     * @param dataStream Data stream
     * @param streamId Data stream ID
     * @param dataMapper Data mapping function
     * @param errorHandler Error handling function
     * @param <T> Generic type
     */
    public static <T> void asyncSendStreamAndClose(
            SseEmitter emitter,
            Stream<T> dataStream,
            String streamId,
            Function<T, Object> dataMapper,
            Consumer<Exception> errorHandler) {
        Thread.startVirtualThread(() -> {
            try {
                sendStream(emitter, dataStream, streamId, dataMapper, errorHandler);
            } catch (Exception e) {
                log.error("Async stream processing failed for streamId: {}", streamId, e);
                if (errorHandler != null) {
                    errorHandler.accept(e);
                }
            } finally {
                sendEndAndComplete(emitter);
            }
        });
    }

    /**
     * Send stream data through SseEmitter
     *
     * @param emitter SseEmitter object for sending events
     * @param dataStream Data stream
     * @param streamId Unique identifier for the stream
     * @param dataMapper Data mapping function to convert data into sendable objects
     * @param errorHandler Error handling function to handle exceptions during data sending
     * @param <T> Data type in the data stream
     */
    public static <T> void sendStream(
            SseEmitter emitter,
            Stream<T> dataStream,
            String streamId,
            Function<T, Object> dataMapper,
            Consumer<Exception> errorHandler) {
        if (dataStream == null) {
            log.warn("Data stream is null for streamId: {}", streamId);
            return;
        }

        try (dataStream) {
            Iterator<T> iterator = dataStream.iterator();
            while (iterator.hasNext()) {
                // Check stop signal
                if (isStreamStopped(streamId)) {
                    log.info("Stream stopped by signal for streamId: {}", streamId);
                    break;
                }

                T data = iterator.next();
                if (data == null) {
                    continue;
                }

                try {
                    Object mappedData = dataMapper != null ? dataMapper.apply(data) : data;
                    sendData(emitter, mappedData);
                } catch (Exception e) {
                    log.error("Error processing stream data for streamId: {}", streamId, e);
                    if (errorHandler != null) {
                        errorHandler.accept(e);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Stream processing failed for streamId: {}", streamId, e);
            if (errorHandler != null) {
                errorHandler.accept(e);
            }
        }
    }

    /**
     * Method to send buffered stream data
     *
     * @param emitter SseEmitter object for sending events
     * @param dataStream Data stream
     * @param streamId Data stream ID
     * @param bufferSize Buffer size
     * @param onBufferReady Callback function when buffer is ready
     */
    public static void sendBufferedStream(
            SseEmitter emitter,
            Stream<String> dataStream,
            String streamId,
            int bufferSize,
            Consumer<String> onBufferReady) {
        if (dataStream == null) {
            log.warn("Data stream is null for streamId: {}", streamId);
            return;
        }

        StringBuilder buffer = new StringBuilder();

        try (dataStream) {
            Iterator<String> iterator = dataStream.iterator();
            while (iterator.hasNext()) {
                if (isStreamStopped(streamId)) {
                    log.info("Buffered stream stopped by signal for streamId: {}", streamId);
                    break;
                }

                String data = iterator.next();
                if (data != null) {
                    buffer.append(data);

                    if (buffer.length() >= bufferSize) {
                        flushBuffer(emitter, buffer, onBufferReady);
                    }
                }
            }

            // Send remaining buffer data
            if (!buffer.isEmpty()) {
                flushBuffer(emitter, buffer, onBufferReady);
            }

        } catch (Exception e) {
            log.error("Buffered stream processing failed for streamId: {}", streamId, e);
        }
    }

    /**
     * Send data with callback functions
     *
     * @param emitter SseEmitter object for sending events
     * @param dataSupplier Supplier function that provides data
     * @param beforeSend Callback function before sending
     * @param afterSend Callback function after sending
     * @param errorHandler Callback function when error occurs
     */
    public static void sendWithCallback(
            SseEmitter emitter,
            Supplier<Object> dataSupplier,
            Consumer<Object> beforeSend,
            Consumer<Object> afterSend,
            Consumer<Exception> errorHandler) {
        try {
            Object data = dataSupplier.get();

            if (beforeSend != null) {
                beforeSend.accept(data);
            }

            sendData(emitter, data);

            if (afterSend != null) {
                afterSend.accept(data);
            }

        } catch (Exception e) {
            log.error("Callback send failed", e);
            if (errorHandler != null) {
                errorHandler.accept(e);
            }
        }
    }

    /**
     * Send data to SseEmitter
     *
     * @param emitter SseEmitter object for sending data
     * @param data Data object to send
     */
    public static void sendData(SseEmitter emitter, Object data) {
        if (emitter == null) {
            log.warn("SseEmitter is null, cannot send data");
            return;
        }

        if (data == null) {
            log.warn("Attempted to send null data");
            return;
        }

        try {
            String jsonData = data instanceof String ? (String) data : JSON.toJSONString(data);
            emitter.send(SseEmitter.event().name("data").data(jsonData));

        } catch (AsyncRequestNotUsableException e) {
            log.warn("SSE client connection terminated: {}", e.getMessage());
        } catch (IOException e) {
            log.error("Failed to send SSE data: {}", e.getMessage(), e);
        } catch (IllegalStateException e) {
            log.debug("SseEmitter already completed: {}", e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error sending SSE data", e);
        }
    }

    /**
     * Send error message to SseEmitter
     *
     * @param emitter SseEmitter object for sending events
     * @param errorMessage Error message string, can be null
     */
    public static void sendError(SseEmitter emitter, String errorMessage) {
        if (emitter == null) {
            return;
        }

        try {
            Map<String, Object> errorData = Map.of(
                    "error", true,
                    "message", errorMessage != null ? errorMessage : "Unknown error",
                    "timestamp", System.currentTimeMillis());

            emitter.send(SseEmitter.event().name("error").data(JSON.toJSONString(errorData)));

        } catch (Exception e) {
            log.error("Failed to send error message via SSE", e);
        }
    }

    /**
     * Send completion event to SseEmitter
     *
     * @param emitter SseEmitter object for sending events
     */
    public static void sendComplete(SseEmitter emitter) {
        sendComplete(emitter, null);
    }

    /**
     * Method to send completion event
     *
     * @param emitter SseEmitter object for sending events
     * @param completionData Map object containing completion information
     */
    public static void sendComplete(SseEmitter emitter, Map<String, Object> completionData) {
        if (emitter == null) {
            return;
        }

        try {
            Map<String, Object> completeData = Map.of(
                    "complete", true,
                    "timestamp", System.currentTimeMillis(),
                    "data", completionData != null ? completionData : Map.of());

            emitter.send(SseEmitter.event().name("complete").data(JSON.toJSONString(completeData)));

        } catch (Exception e) {
            log.error("Failed to send completion message via SSE", e);
        }
    }

    /**
     * Send end signal and complete SseEmitter operation
     *
     * @param emitter SseEmitter instance for sending events and completion signal
     */
    public static void sendEndAndComplete(SseEmitter emitter) {
        if (emitter == null) {
            return;
        }

        try {
            emitter.send(SseEmitter.event().name("end").data(END_DATA));
        } catch (AsyncRequestNotUsableException e) {
            log.warn("Client connection already closed when sending end signal: {}", e.getMessage());
        } catch (Exception e) {
            log.error("Failed to send end signal via SSE", e);
        } finally {
            try {
                emitter.complete();
            } catch (IllegalStateException e) {
                log.debug("SseEmitter already completed: {}", e.getMessage());
            } catch (Exception e) {
                log.error("Failed to complete SseEmitter", e);
            }
        }
    }

    /**
     * Handle SseEmitter and send error information
     *
     * @param emitter SseEmitter object for sending events
     * @param errorMessage Error message string to inform error details
     */
    public static void completeWithError(SseEmitter emitter, String errorMessage) {
        if (emitter == null) {
            return;
        }

        sendError(emitter, errorMessage);

        try {
            emitter.complete();
        } catch (Exception e) {
            log.error("Failed to complete SseEmitter with error", e);
        }
    }

    /**
     * Check if the given stream is stopped.
     *
     * @param streamId The stream ID to check
     * @return Returns true if the stream is stopped, otherwise returns false
     */
    public static boolean isStreamStopped(String streamId) {
        if (streamId == null) {
            return false;
        }

        Boolean stopped = streamStopSignalSet.getIfPresent(streamId);
        if (stopped != null && stopped) {
            streamStopSignalSet.invalidate(streamId);
            return true;
        }
        return false;
    }

    /**
     * Flush buffer and send data through SseEmitter
     *
     * @param emitter SseEmitter instance for sending data
     * @param buffer StringBuilder buffer to be flushed and sent
     * @param onBufferReady Callback function when buffer content is ready
     */
    private static void flushBuffer(SseEmitter emitter, StringBuilder buffer, Consumer<String> onBufferReady) {
        String content = buffer.toString();
        buffer.setLength(0);

        if (onBufferReady != null) {
            onBufferReady.accept(content);
        }

        sendData(emitter, content);
    }

    public static class StreamProcessor<T> {
        private final SseEmitter emitter;
        private final String streamId;
        private Function<T, Object> dataMapper;
        private Consumer<Exception> errorHandler;
        private Consumer<T> beforeProcess;
        private Consumer<Object> afterProcess;
        private int bufferSize = 0;
        private StringBuilder buffer;

        public StreamProcessor(SseEmitter emitter, String streamId) {
            this.emitter = emitter;
            this.streamId = streamId;
            this.buffer = new StringBuilder();
        }

        /**
         * Set data mapper.
         *
         * @param dataMapper A function to map processed data to objects
         * @return Returns the current StreamProcessor instance
         */
        public StreamProcessor<T> withDataMapper(Function<T, Object> dataMapper) {
            this.dataMapper = dataMapper;
            return this;
        }

        /**
         * Set error handler
         *
         * @param errorHandler A consumer function to handle exceptions
         * @return Returns the current stream processor instance
         */
        public StreamProcessor<T> withErrorHandler(Consumer<Exception> errorHandler) {
            this.errorHandler = errorHandler;
            return this;
        }

        /**
         * Set a preprocessing function before processing
         *
         * @param beforeProcess Preprocessing function
         * @return Returns the current StreamProcessor object
         */
        public StreamProcessor<T> withBeforeProcess(Consumer<T> beforeProcess) {
            this.beforeProcess = beforeProcess;
            return this;
        }

        /**
         * Set an operation to execute after processing.
         *
         * @param afterProcess Post-processing consumer operation
         * @return Returns the current StreamProcessor object
         */
        public StreamProcessor<T> withAfterProcess(Consumer<Object> afterProcess) {
            this.afterProcess = afterProcess;
            return this;
        }

        /**
         * Set buffer size and initialize buffer
         *
         * @param bufferSize Buffer size
         * @return StreamProcessor object itself
         */
        public StreamProcessor<T> withBuffer(int bufferSize) {
            this.bufferSize = bufferSize;
            this.buffer = new StringBuilder();
            return this;
        }

        /**
         * Method to process data stream
         *
         * @param dataStream Data stream
         */
        public void processStream(Stream<T> dataStream) {
            if (bufferSize > 0 && buffer != null) {
                asyncSendStreamAndCloseWithBuffer(emitter, dataStream, streamId, data -> {
                    if (beforeProcess != null) {
                        beforeProcess.accept(data);
                    }

                    Object mappedData = dataMapper != null ? dataMapper.apply(data) : data;

                    if (afterProcess != null) {
                        afterProcess.accept(mappedData);
                    }

                    return mappedData;
                }, errorHandler);
            } else {
                asyncSendStreamAndClose(emitter, dataStream, streamId, data -> {
                    if (beforeProcess != null) {
                        beforeProcess.accept(data);
                    }

                    Object mappedData = dataMapper != null ? dataMapper.apply(data) : data;

                    if (afterProcess != null) {
                        afterProcess.accept(mappedData);
                    }

                    return mappedData;
                }, errorHandler);
            }
        }

        /**
         * Function to asynchronously send data stream and close connection
         *
         * @param emitter SseEmitter object for sending events
         * @param dataStream Data stream
         * @param streamId Data stream ID
         * @param processor Data processing function
         * @param errorHandler Error handling function
         */
        private void asyncSendStreamAndCloseWithBuffer(SseEmitter emitter, Stream<T> dataStream, String streamId,
                Function<T, Object> processor, Consumer<Exception> errorHandler) {
            Thread.startVirtualThread(() -> {
                try {
                    List<Object> processedDataList = new ArrayList<>();
                    dataStream.forEach(data -> {
                        try {
                            Object processedData = processor.apply(data);
                            buffer.append(processedData.toString());
                            processedDataList.add(processedData);

                            // Use bufferSize as batch size limit
                            if (processedDataList.size() >= bufferSize) {
                                sendData(emitter, buffer.toString());
                                buffer.setLength(0);
                                processedDataList.clear();
                            }
                        } catch (Exception e) {
                            log.error("Error processing stream data, streamId: {}", streamId, e);
                            if (errorHandler != null) {
                                errorHandler.accept(e);
                            }
                        }
                    });

                    // Send remaining buffered data
                    if (!buffer.isEmpty()) {
                        sendData(emitter, buffer.toString());
                        buffer.setLength(0);
                    }

                    sendEndAndComplete(emitter);
                } catch (Exception e) {
                    log.error("Error in async stream sending, streamId: {}", streamId, e);
                    if (errorHandler != null) {
                        errorHandler.accept(e);
                    }
                    completeWithError(emitter, e.getMessage());
                }
            });
        }
    }

}
