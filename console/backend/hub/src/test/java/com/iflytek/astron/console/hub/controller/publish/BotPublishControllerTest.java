package com.iflytek.astron.console.hub.controller.publish;

import com.iflytek.astron.console.commons.config.JwtClaimsFilter;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.hub.dto.publish.UnifiedPublishRequestDto;
import com.iflytek.astron.console.hub.dto.publish.approval.PublishApprovalDecisionDto;
import com.iflytek.astron.console.hub.dto.publish.approval.PublishApprovalSubmitDto;
import com.iflytek.astron.console.hub.service.publish.BotPublishService;
import com.iflytek.astron.console.hub.service.publish.McpService;
import com.iflytek.astron.console.hub.service.publish.PublishApprovalService;
import com.iflytek.astron.console.hub.strategy.publish.PublishStrategy;
import com.iflytek.astron.console.hub.strategy.publish.PublishStrategyFactory;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BotPublishControllerTest {

    @Mock
    private BotPublishService botPublishService;
    @Mock
    private McpService mcpService;
    @Mock
    private PublishStrategyFactory publishStrategyFactory;
    @Mock
    private PublishApprovalService publishApprovalService;
    @Mock
    private PublishStrategy publishStrategy;

    @InjectMocks
    private BotPublishController controller;

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void unifiedPublishShouldReturnApprovalDecisionBeforeExecutingStrategy() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setAttribute(JwtClaimsFilter.USER_ID_ATTRIBUTE, "member-uid");
        request.addHeader("space-id", "100");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        UnifiedPublishRequestDto publishRequest = new UnifiedPublishRequestDto();
        publishRequest.setPublishType("MARKET");
        publishRequest.setAction("PUBLISH");
        publishRequest.setPublishData(Map.of("reason", "submit"));

        PublishApprovalDecisionDto decision = PublishApprovalDecisionDto.builder()
                .approvalRequired(true)
                .approvalId(123L)
                .status("PENDING")
                .build();
        when(publishStrategyFactory.isSupported("MARKET")).thenReturn(true);
        when(publishApprovalService.submitIfRequired(any())).thenReturn(decision);

        ApiResult<Object> result = controller.unifiedPublish(42, publishRequest);

        assertThat(result.data()).isSameAs(decision);
        verify(publishStrategyFactory, never()).getStrategy(any());
    }

    @Test
    void unifiedPublishDirectExecutionShouldUseEffectiveSpaceId() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setAttribute(JwtClaimsFilter.USER_ID_ATTRIBUTE, "owner-uid");
        request.addHeader("space-id", "200");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        UnifiedPublishRequestDto publishRequest = new UnifiedPublishRequestDto();
        publishRequest.setPublishType("MARKET");
        publishRequest.setAction("PUBLISH");
        publishRequest.setPublishData(Map.of("reason", "submit"));

        PublishApprovalDecisionDto decision = PublishApprovalDecisionDto.builder()
                .approvalRequired(false)
                .build();
        when(publishStrategyFactory.isSupported("MARKET")).thenReturn(true);
        when(publishApprovalService.submitIfRequired(any())).thenAnswer(invocation -> {
            PublishApprovalSubmitDto submitDto = invocation.getArgument(0);
            submitDto.setSpaceId(100L);
            return decision;
        });
        when(publishStrategyFactory.getStrategy("MARKET")).thenReturn(publishStrategy);
        when(publishStrategy.publish(42, publishRequest.getPublishData(), "owner-uid", 100L))
                .thenReturn(ApiResult.success("ok"));

        ApiResult<Object> result = controller.unifiedPublish(42, publishRequest);

        assertThat(result.data()).isEqualTo("ok");
        verify(publishStrategy).publish(42, publishRequest.getPublishData(), "owner-uid", 100L);
        verify(publishStrategy, never()).publish(42, publishRequest.getPublishData(), "owner-uid", 200L);
    }
}
