package com.iflytek.astron.console.hub.service.publish.impl;

import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.entity.model.McpData;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.mapper.UserLangChainInfoMapper;
import com.iflytek.astron.console.commons.mapper.bot.ChatBotBaseMapper;
import com.iflytek.astron.console.commons.mapper.model.McpDataMapper;
import com.iflytek.astron.console.commons.service.data.UserLangChainDataService;
import com.iflytek.astron.console.hub.dto.publish.mcp.McpPublishRequestDto;
import com.iflytek.astron.console.hub.service.publish.BotPublishService;
import com.iflytek.astron.console.hub.service.workflow.WorkflowReleaseService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class McpServiceImplBusinessExceptionTest {

    @Mock
    private McpDataMapper mcpDataMapper;
    @Mock
    private ChatBotBaseMapper chatBotBaseMapper;
    @Mock
    private UserLangChainInfoMapper userLangChainInfoMapper;
    @Mock
    private BotPublishService botPublishService;
    @Mock
    private WorkflowReleaseService workflowReleaseService;
    @Mock
    private UserLangChainDataService userLangChainDataService;

    @Test
    void publishMcpShouldRejectBearerWithoutCiphertextBeforeReleaseMutation() {
        McpServiceImpl service = new McpServiceImpl(
                mcpDataMapper,
                chatBotBaseMapper,
                userLangChainInfoMapper,
                botPublishService,
                workflowReleaseService,
                userLangChainDataService);
        McpPublishRequestDto request = new McpPublishRequestDto();
        request.setBotId(25);
        request.setServerName("gitnexus");
        request.setAuthType("bearer");

        when(chatBotBaseMapper.checkBotPermission(25, "requester-uid", 1L)).thenReturn(1);
        when(userLangChainInfoMapper.selectOne(any())).thenReturn(
                new com.iflytek.astron.console.commons.entity.bot.UserLangChainInfo());

        assertThatThrownBy(() -> service.publishMcp(request, "requester-uid", 1L))
                .isInstanceOf(BusinessException.class)
                .extracting("code")
                .isEqualTo(ResponseEnum.PARAM_ERROR.getCode());

        verify(mcpDataMapper, never()).insert(any(McpData.class));
        verify(workflowReleaseService, never()).publishWorkflow(any(), any(), any(), any());
        verify(botPublishService, never()).updatePublishChannel(any(), any(), any(), any(), anyBoolean());
    }

    @Test
    void publishMcpShouldPreserveUnresolvedDependencyErrorBeforeAnyPublishMutation() {
        McpServiceImpl service = new McpServiceImpl(
                mcpDataMapper,
                chatBotBaseMapper,
                userLangChainInfoMapper,
                botPublishService,
                workflowReleaseService,
                userLangChainDataService);
        McpPublishRequestDto request = new McpPublishRequestDto();
        request.setBotId(25);
        request.setServerName("workflow-mcp");

        when(chatBotBaseMapper.checkBotPermission(25, "requester-uid", 1L)).thenReturn(1);
        when(userLangChainInfoMapper.selectOne(any())).thenReturn(
                new com.iflytek.astron.console.commons.entity.bot.UserLangChainInfo());
        when(userLangChainDataService.findFlowIdByBotId(25)).thenReturn("flow-1");
        BusinessException unresolved =
                new BusinessException(ResponseEnum.WORKFLOW_IMPORT_DEPENDENCY_UNRESOLVED);
        when(workflowReleaseService.publishWorkflow(25, "requester-uid", 1L, "MCP"))
                .thenThrow(unresolved);

        assertThatThrownBy(() -> service.publishMcp(request, "requester-uid", 1L))
                .isSameAs(unresolved)
                .extracting("code")
                .isEqualTo(ResponseEnum.WORKFLOW_IMPORT_DEPENDENCY_UNRESOLVED.getCode());

        verify(mcpDataMapper, never()).insert(any(McpData.class));
        verify(botPublishService, never()).updatePublishChannel(
                eq(25), eq("requester-uid"), eq(1L), any(), eq(true));
        verify(userLangChainDataService, times(1)).findFlowIdByBotId(25);
    }
}
