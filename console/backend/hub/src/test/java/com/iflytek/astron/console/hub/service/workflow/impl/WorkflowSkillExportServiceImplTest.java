package com.iflytek.astron.console.hub.service.workflow.impl;

import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.entity.workflow.Workflow;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import com.iflytek.astron.console.hub.dto.publish.BotApiInfoDTO;
import com.iflytek.astron.console.hub.entity.maas.WorkflowSkillExportRequest;
import com.iflytek.astron.console.hub.entity.maas.WorkflowSkillExportResponse;
import com.iflytek.astron.console.hub.service.publish.PublishApiService;
import com.iflytek.astron.console.toolkit.service.bot.OpenAiModelProcessService;
import com.iflytek.astron.console.toolkit.service.workflow.WorkflowService;
import com.iflytek.astron.console.toolkit.tool.DataPermissionCheckTool;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.MockedStatic;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkflowSkillExportServiceImplTest {

    @Mock
    private WorkflowService workflowService;

    @Mock
    private PublishApiService publishApiService;

    @Mock
    private OpenAiModelProcessService openAiModelProcessService;

    @Mock
    private DataPermissionCheckTool dataPermissionCheckTool;

    @InjectMocks
    private WorkflowSkillExportServiceImpl workflowSkillExportService;

    private MockedStatic<SpaceInfoUtil> spaceInfoUtil;

    private WorkflowSkillExportRequest request;
    private Workflow workflow;
    private BotApiInfoDTO apiInfo;

    @BeforeEach
    void setUp() {
        request = new WorkflowSkillExportRequest();
        request.setBotId(10L);
        request.setWorkflowId(123L);
        request.setWorkflowName("Email Sender");
        request.setWorkflowDescription("Send an email to a specified recipient.");

        workflow = new Workflow();
        workflow.setId(123L);
        workflow.setName("Email Sender");
        workflow.setDescription("Send an email to a specified recipient.");
        workflow.setData(startNodeProtocol());
        workflow.setPublishedData(startNodeProtocol());

        apiInfo = BotApiInfoDTO.builder()
                .botId(10)
                .botName("Email Sender")
                .appId("app-1")
                .appKey("key-1")
                .appSecret("secret-1")
                .serviceUrl("https://api.example.com/workflow/v1/chat/completions")
                .flowId("flow-1")
                .build();

        spaceInfoUtil = mockStatic(SpaceInfoUtil.class);
        spaceInfoUtil.when(SpaceInfoUtil::getSpaceId).thenReturn(1L);
    }

    @AfterEach
    void tearDown() {
        spaceInfoUtil.close();
    }

    @Test
    void exportSkillIncludesGeneratedMetadataAndWorkflowInputs() {
        when(workflowService.getById(123L)).thenReturn(workflow);
        when(publishApiService.getApiInfo(10L)).thenReturn(apiInfo);
        when(openAiModelProcessService.processNonStreaming(any()))
                .thenReturn("{\"name\":\"send-email\",\"description\":\"Use when the user needs to send an email.\"}");

        WorkflowSkillExportResponse response = workflowSkillExportService.exportSkill(request);

        assertEquals("SKILL.md", response.getFileName());
        assertTrue(response.getAiGeneratedMetadata());
        assertTrue(response.getContent().contains("name: send-email"));
        assertTrue(response.getContent().contains("Use when the user needs to send an email."));
        assertTrue(response.getContent().contains("`AGENT_USER_INPUT`"));
        assertTrue(response.getContent().contains("`recipient`"));
        assertTrue(response.getContent().contains("'Authorization: Bearer key-1:secret-1'"));
        assertTrue(response.getContent().contains("\"flow_id\":\"flow-1\""));
        verify(dataPermissionCheckTool).checkWorkflowBelong(eq(workflow), any());
    }

    @Test
    void exportSkillRejectsWorkflowWithoutPublishedApiBinding() {
        when(workflowService.getById(123L)).thenReturn(workflow);
        when(publishApiService.getApiInfo(10L)).thenReturn(new BotApiInfoDTO());

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> workflowSkillExportService.exportSkill(request));

        assertEquals(ResponseEnum.WORKFLOW_SKILL_API_NOT_READY, exception.getResponseEnum());
        verify(openAiModelProcessService, never()).processNonStreaming(any());
    }

    @Test
    void exportSkillFallsBackWhenMetadataGenerationFails() {
        when(workflowService.getById(123L)).thenReturn(workflow);
        when(publishApiService.getApiInfo(10L)).thenReturn(apiInfo);
        when(openAiModelProcessService.processNonStreaming(any()))
                .thenThrow(new RuntimeException("timeout"));

        WorkflowSkillExportResponse response = workflowSkillExportService.exportSkill(request);

        assertFalse(response.getAiGeneratedMetadata());
        assertTrue(response.getContent().contains("name: email-sender"));
        assertTrue(response.getContent().contains("Use when the user needs to run the"));
    }

    @Test
    void exportSkillRejectsBlankWorkflowNameOrDescription() {
        request.setWorkflowDescription("");
        workflow.setDescription("");
        when(workflowService.getById(anyLong())).thenReturn(workflow);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> workflowSkillExportService.exportSkill(request));

        assertEquals(ResponseEnum.WORKFLOW_SKILL_NAME_DESC_EMPTY, exception.getResponseEnum());
        verify(publishApiService, never()).getApiInfo(anyLong());
    }

    private String startNodeProtocol() {
        return """
                {
                  "nodes": [
                    {
                      "id": "node-start::1",
                      "data": {
                        "outputs": [
                          {
                            "name": "AGENT_USER_INPUT",
                            "required": true,
                            "schema": {
                              "type": "string",
                              "default": "User request"
                            }
                          },
                          {
                            "name": "recipient",
                            "required": true,
                            "schema": {
                              "type": "string",
                              "default": "Email recipient"
                            }
                          }
                        ]
                      }
                    }
                  ],
                  "edges": []
                }
                """;
    }
}
