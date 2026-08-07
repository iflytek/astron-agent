package com.iflytek.astron.console.hub.controller.publish;

import com.iflytek.astron.console.commons.config.JwtClaimsFilter;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.hub.dto.publish.BotApiInfoDTO;
import com.iflytek.astron.console.hub.dto.publish.CreateBotApiVo;
import com.iflytek.astron.console.hub.dto.publish.approval.PublishApprovalDecisionDto;
import com.iflytek.astron.console.hub.dto.publish.approval.PublishApprovalSubmitDto;
import com.iflytek.astron.console.hub.service.publish.PublishApiService;
import com.iflytek.astron.console.hub.service.publish.PublishApprovalService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PublishApiControllerTest {

    @Mock
    private PublishApiService publishApiService;
    @Mock
    private PublishApprovalService publishApprovalService;

    @InjectMocks
    private PublishApiController controller;

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void createBotApiShouldReturnApprovalDecisionBeforeBindingApp() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setAttribute(JwtClaimsFilter.USER_ID_ATTRIBUTE, "member-uid");
        request.addHeader("space-id", "100");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        CreateBotApiVo createBotApiVo = CreateBotApiVo.builder()
                .botId(42L)
                .appId("app-1")
                .build();
        PublishApprovalDecisionDto decision = PublishApprovalDecisionDto.builder()
                .approvalRequired(true)
                .approvalId(321L)
                .status("PENDING")
                .build();
        when(publishApprovalService.submitIfRequired(any())).thenReturn(decision);

        ApiResult<Object> result = controller.createBotApi(request, createBotApiVo);

        assertThat(result.data()).isSameAs(decision);
        verify(publishApiService, never()).createBotApi(any(), any());
    }

    @Test
    void createBotApiDirectExecutionShouldUseEffectiveSpaceId() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setAttribute(JwtClaimsFilter.USER_ID_ATTRIBUTE, "owner-uid");
        request.addHeader("space-id", "200");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        CreateBotApiVo createBotApiVo = CreateBotApiVo.builder()
                .botId(42L)
                .appId("app-1")
                .build();
        PublishApprovalDecisionDto decision = PublishApprovalDecisionDto.builder()
                .approvalRequired(false)
                .build();
        BotApiInfoDTO apiInfo = BotApiInfoDTO.builder()
                .botId(42)
                .appId("app-1")
                .build();
        when(publishApprovalService.submitIfRequired(any())).thenAnswer(invocation -> {
            PublishApprovalSubmitDto submitDto = invocation.getArgument(0);
            submitDto.setSpaceId(100L);
            return decision;
        });
        when(publishApiService.createBotApi(createBotApiVo, request, "owner-uid", 100L)).thenReturn(apiInfo);

        ApiResult<Object> result = controller.createBotApi(request, createBotApiVo);

        assertThat(result.data()).isSameAs(apiInfo);
        verify(publishApiService).createBotApi(createBotApiVo, request, "owner-uid", 100L);
        verify(publishApiService, never()).createBotApi(createBotApiVo, request, "owner-uid", 200L);
    }
}
