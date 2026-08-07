package com.iflytek.astron.console.toolkit.websocket;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.*;

/**
 * WebSocket configuration class.
 * <p>
 * This class is used to register WebSocket handlers and define related WebSocket endpoints. It
 * enables WebSocket support for the application.
 * </p>
 *
 * <p>
 * <b>Specification reference:</b> According to the "Java Development Manual (Huangshan Edition)",
 * all configuration classes should include clear Javadoc annotations describing parameters and
 * functionality.
 * </p>
 *
 * @author
 * @since 2025/10/09
 */
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    /**
     * Registers WebSocket handlers for the application.
     * <p>
     * Defines two WebSocket endpoints:
     * <ul>
     * <li><b>/prompt-enhance</b>: Used for prompt enhancement features.</li>
     * <li><b>/flow-canvas-hold</b>: Used to maintain flow canvas real-time interaction.</li>
     * </ul>
     * Both endpoints allow requests from all origins (CORS set to "*").
     * </p>
     *
     * @param registry the WebSocketHandlerRegistry used to register WebSocket handlers
     * @throws IllegalArgumentException if the handler registration fails
     */
    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(flowCanvasHoldWebSocketHandler(), "/flow-canvas-hold")
                .setAllowedOrigins("*");
    }


    /**
     * Creates and registers a WebSocket handler for the "/flow-canvas-hold" endpoint.
     *
     * @return a {@link WebSocketHandler} instance responsible for handling flow canvas WebSocket
     *         messages
     * @throws Exception if handler instantiation fails
     */
    @Bean
    public WebSocketHandler flowCanvasHoldWebSocketHandler() {
        return new FlowCanvasHoldWebSocketHandler();
    }
}
