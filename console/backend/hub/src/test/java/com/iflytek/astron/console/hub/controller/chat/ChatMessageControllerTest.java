package com.iflytek.astron.console.hub.controller.chat;

import com.iflytek.astron.console.commons.service.bot.ChatBotDataService;
import com.iflytek.astron.console.commons.service.data.ChatDataService;
import com.iflytek.astron.console.commons.service.data.ChatListDataService;
import com.iflytek.astron.console.commons.dto.bot.DebugChatBotReqDto;
import com.iflytek.astron.console.commons.entity.chat.ChatTreeIndex;
import com.iflytek.astron.console.commons.util.RequestContextUtil;
import com.iflytek.astron.console.commons.util.SseEmitterUtil;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import com.iflytek.astron.console.hub.dto.chat.BotDebugRequest;
import com.iflytek.astron.console.hub.service.chat.BotChatService;
import com.iflytek.astron.console.toolkit.service.workflow.AgentWorkflowRuntimeService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.redisson.api.RedissonClient;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatMessageControllerTest {

    @Mock
    private ChatBotDataService chatBotDataService;
    @Mock
    private ChatListDataService chatListDataService;
    @Mock
    private BotChatService botChatService;
    @Mock
    private ChatDataService chatDataService;
    @Mock
    private RedissonClient redissonClient;
    @Mock
    private AgentWorkflowRuntimeService agentWorkflowRuntimeService;

    @InjectMocks
    private ChatMessageController controller;

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "\t", "\u00A0", "\uFEFF", "\u3000"})
    void chatRejectsBlankTextBeforeLookingUpConversation(String text) {
        SseEmitter emitter = mock(SseEmitter.class);

        try (MockedStatic<SseEmitterUtil> sse = mockStatic(SseEmitterUtil.class)) {
            sse.when(SseEmitterUtil::createSseEmitter).thenReturn(emitter);

            SseEmitter result = controller.chat(1L, text, null, null, null);

            assertSame(emitter, result);
            verifyNoInteractions(chatListDataService, botChatService);
            sse.verify(() -> SseEmitterUtil.sendError(eq(emitter), eq("Please enter chat content")));
            sse.verify(() -> SseEmitterUtil.sendEndAndComplete(emitter));
        }
    }

    @Test
    void chatRejectsNullResolvedChatIdBeforeLookingUpContext() {
        SseEmitter emitter = mock(SseEmitter.class);
        ChatTreeIndex invalidIndex = ChatTreeIndex.builder().childChatId(null).build();
        when(chatListDataService.findChatTreeIndexByChatIdOrderById(1L))
                .thenReturn(List.of(invalidIndex));

        try (MockedStatic<SseEmitterUtil> sse = mockStatic(SseEmitterUtil.class)) {
            sse.when(SseEmitterUtil::createSseEmitter).thenReturn(emitter);

            SseEmitter result = controller.chat(1L, "hello", null, null, null);

            assertSame(emitter, result);
            verify(chatListDataService).findChatTreeIndexByChatIdOrderById(1L);
            verifyNoMoreInteractions(chatListDataService);
            verifyNoInteractions(botChatService);
            sse.verify(() -> SseEmitterUtil.sendError(eq(emitter), eq("Chat ID cannot be empty")));
            sse.verify(() -> SseEmitterUtil.sendEndAndComplete(emitter));
        }
    }

    @Test
    void botDebugRejectsSpaceHeaderFromNonMemberBeforeUsingSpaceResources() {
        BotDebugRequest debugRequest = new BotDebugRequest();
        debugRequest.setText("hello");
        SseEmitter emitter = mock(SseEmitter.class);
        lenient().when(agentWorkflowRuntimeService.checkWorkflowsAccessible("u1", null, (String) null))
                .thenReturn(true);

        try (MockedStatic<RequestContextUtil> requestContext = mockStatic(RequestContextUtil.class);
                MockedStatic<SpaceInfoUtil> spaceInfo = mockStatic(SpaceInfoUtil.class);
                MockedStatic<SseEmitterUtil> sse = mockStatic(SseEmitterUtil.class)) {
            requestContext.when(RequestContextUtil::getUID).thenReturn("u1");
            spaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(42L);
            spaceInfo.when(SpaceInfoUtil::checkUserBelongSpace).thenReturn(false);
            sse.when(SseEmitterUtil::createSseEmitter).thenReturn(emitter);

            SseEmitter result = controller.botDebug(
                    mock(HttpServletRequest.class), mock(HttpServletResponse.class), debugRequest);

            assertSame(emitter, result);
            verifyNoInteractions(agentWorkflowRuntimeService, botChatService);
            sse.verify(() -> SseEmitterUtil.completeWithError(eq(emitter), anyString()));
        }
    }

    @Test
    void botDebugPassesVerifiedSpaceIdToService() throws Exception {
        BotDebugRequest debugRequest = new BotDebugRequest();
        debugRequest.setText("hello");
        SseEmitter emitter = mock(SseEmitter.class);
        when(agentWorkflowRuntimeService.checkWorkflowsAccessible("u1", 42L, (String) null))
                .thenReturn(true);

        try (MockedStatic<RequestContextUtil> requestContext = mockStatic(RequestContextUtil.class);
                MockedStatic<SpaceInfoUtil> spaceInfo = mockStatic(SpaceInfoUtil.class);
                MockedStatic<SseEmitterUtil> sse = mockStatic(SseEmitterUtil.class)) {
            requestContext.when(RequestContextUtil::getUID).thenReturn("u1");
            spaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(42L);
            spaceInfo.when(SpaceInfoUtil::checkUserBelongSpace).thenReturn(true);
            sse.when(SseEmitterUtil::createSseEmitter).thenReturn(emitter);

            controller.botDebug(
                    mock(HttpServletRequest.class), mock(HttpServletResponse.class), debugRequest);

            ArgumentCaptor<DebugChatBotReqDto> requestCaptor =
                    ArgumentCaptor.forClass(DebugChatBotReqDto.class);
            verify(botChatService).debugChatMessageBot(requestCaptor.capture(), eq(emitter), anyString());
            Object spaceId = DebugChatBotReqDto.class.getMethod("getSpaceId").invoke(requestCaptor.getValue());
            assertEquals(42L, spaceId);
        }
    }
}
