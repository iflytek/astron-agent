package com.iflytek.astron.console.toolkit.service.workflow;

import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.config.JwtClaimsFilter;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.node.BizNodeData;
import com.iflytek.astron.console.toolkit.entity.dto.skill.SkillSandboxRuntimeRefDto;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.BizWorkflowNode;
import com.iflytek.astron.console.toolkit.service.skill.SkillSandboxConfigService;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkflowServiceSandboxConfigTest {

    @Mock
    private SkillSandboxConfigService skillSandboxConfigService;

    private WorkflowService workflowService;

    @BeforeEach
    void setUp() {
        workflowService = new WorkflowService();
        ReflectionTestUtils.setField(workflowService, "skillSandboxConfigService", skillSandboxConfigService);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setAttribute(JwtClaimsFilter.USER_ID_ATTRIBUTE, "user-1");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
    }

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void injectScriptSandboxAddsRuntimeConfigToCodeNodes() {
        SkillSandboxRuntimeRefDto config = new SkillSandboxRuntimeRefDto();
        config.setProvider("e2b");
        config.setEnabled(Boolean.TRUE);
        config.setUid("user-1");
        config.setSpaceId(100L);
        when(skillSandboxConfigService.toRuntimeRefDto()).thenReturn(config);

        BizWorkflowNode codeNode = new BizWorkflowNode();
        codeNode.setId("ifly-code::code-1");
        BizNodeData codeData = new BizNodeData();
        codeData.setNodeParam(new JSONObject());
        codeNode.setData(codeData);

        ReflectionTestUtils.invokeMethod(
                workflowService,
                "injectCodeNodeRuntimeConfig",
                List.of(codeNode),
                "flow-1");

        JSONObject sandbox = codeData.getNodeParam().getJSONObject("sandbox");
        assertThat(codeData.getNodeParam().getString("uid")).isEqualTo("user-1");
        assertThat(sandbox.getString("provider")).isEqualTo("e2b");
        assertThat(sandbox.getBoolean("enabled")).isTrue();
        assertThat(sandbox.getString("workflowId")).isEqualTo("flow-1");
        assertThat(sandbox.getString("nodeId")).isEqualTo("ifly-code::code-1");
        assertThat(sandbox.getString("spaceId")).isEqualTo("100");
        assertThat(sandbox)
                .doesNotContainKey("apiKey")
                .doesNotContainKey("artifactUploadToken")
                .doesNotContainKey("runtimeConfigUrl");
    }

    @Test
    void injectCodeRuntimeConfigAddsUidEvenWhenSandboxIsNotConfigured() {
        SkillSandboxRuntimeRefDto config = new SkillSandboxRuntimeRefDto();
        config.setProvider("e2b");
        config.setEnabled(Boolean.FALSE);
        when(skillSandboxConfigService.toRuntimeRefDto()).thenReturn(config);

        BizWorkflowNode codeNode = new BizWorkflowNode();
        codeNode.setId("ifly-code::code-1");
        BizNodeData codeData = new BizNodeData();
        codeData.setNodeParam(new JSONObject());
        codeNode.setData(codeData);

        ReflectionTestUtils.invokeMethod(
                workflowService,
                "injectCodeNodeRuntimeConfig",
                List.of(codeNode),
                "flow-1");

        assertThat(codeData.getNodeParam().containsKey("sandbox")).isFalse();
        assertThat(codeData.getNodeParam().getString("uid")).isEqualTo("user-1");
    }

    @Test
    void injectCodeRuntimeConfigReplacesBlankAndForeignUidWithoutChangingOtherNodes() {
        BizWorkflowNode blankCode = codeNode("ifly-code::blank", " ");
        BizWorkflowNode importedCode = codeNode("ifly-code::imported", "former-user");
        BizWorkflowNode otherNode = codeNode("spark-llm::model", "model-user");

        ReflectionTestUtils.invokeMethod(
                workflowService, "injectCodeNodeRuntimeConfig",
                List.of(blankCode, importedCode, otherNode), "flow-1");

        assertThat(blankCode.getData().getNodeParam().getString("uid")).isEqualTo("user-1");
        assertThat(importedCode.getData().getNodeParam().getString("uid")).isEqualTo("user-1");
        assertThat(otherNode.getData().getNodeParam().getString("uid")).isEqualTo("model-user");
    }

    @Test
    void injectCodeRuntimeConfigRejectsMissingRequestIdentityInsteadOfTrustingDsl() {
        RequestContextHolder.resetRequestAttributes();
        BizWorkflowNode importedCode = codeNode("ifly-code::imported", "former-user");

        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(
                workflowService, "injectCodeNodeRuntimeConfig", List.of(importedCode), "flow-1"))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void injectCodeRuntimeConfigRejectsBlankExplicitIdentity() {
        BizWorkflowNode importedCode = codeNode("ifly-code::imported", "former-user");

        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(
                workflowService, "injectCodeNodeRuntimeConfig",
                List.of(importedCode), "flow-1", " ", 200L))
                .isInstanceOf(BusinessException.class);
    }

    private static BizWorkflowNode codeNode(String id, String uid) {
        BizWorkflowNode node = new BizWorkflowNode();
        node.setId(id);
        BizNodeData data = new BizNodeData();
        data.setNodeParam(new JSONObject().fluentPut("uid", uid));
        node.setData(data);
        return node;
    }

    @Test
    void injectScriptSandboxFailsClosedWhenRuntimeConfigCannotBeResolved() {
        when(skillSandboxConfigService.toRuntimeRefDto())
                .thenThrow(new RuntimeException("no user context"));

        BizWorkflowNode codeNode = new BizWorkflowNode();
        codeNode.setId("ifly-code::code-1");
        BizNodeData codeData = new BizNodeData();
        codeData.setNodeParam(new JSONObject());
        codeNode.setData(codeData);

        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(
                        workflowService,
                        "injectCodeNodeRuntimeConfig",
                        List.of(codeNode),
                        "flow-1"))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("no user context");
    }

    @Test
    void injectScriptSandboxFailsClosedWhenExplicitScopeCannotBeResolved() {
        when(skillSandboxConfigService.toRuntimeRefDto("former-member", 200L))
                .thenThrow(new RuntimeException("scope denied"));

        BizWorkflowNode codeNode = new BizWorkflowNode();
        codeNode.setId("ifly-code::code-1");
        BizNodeData codeData = new BizNodeData();
        codeData.setNodeParam(new JSONObject());
        codeNode.setData(codeData);

        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(
                        workflowService,
                        "injectCodeNodeRuntimeConfig",
                        List.of(codeNode),
                        "flow-1",
                        "former-member",
                        200L))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("scope denied");
    }

    @Test
    void injectScriptSandboxUsesExplicitScopeWithoutRequestContext() {
        RequestContextHolder.resetRequestAttributes();
        SkillSandboxRuntimeRefDto config = new SkillSandboxRuntimeRefDto();
        config.setProvider("e2b");
        config.setEnabled(Boolean.TRUE);
        config.setUid("approval-user");
        config.setSpaceId(200L);
        when(skillSandboxConfigService.toRuntimeRefDto("approval-user", 200L))
                .thenReturn(config);

        BizWorkflowNode codeNode = new BizWorkflowNode();
        codeNode.setId("ifly-code::approval-code");
        BizNodeData codeData = new BizNodeData();
        codeData.setNodeParam(new JSONObject());
        codeNode.setData(codeData);

        ReflectionTestUtils.invokeMethod(
                workflowService,
                "injectCodeNodeRuntimeConfig",
                List.of(codeNode),
                "flow-approval",
                "approval-user",
                200L);

        JSONObject sandbox = codeData.getNodeParam().getJSONObject("sandbox");
        assertThat(codeData.getNodeParam().getString("uid")).isEqualTo("approval-user");
        assertThat(sandbox).doesNotContainKey("apiKey");
        assertThat(sandbox.getString("spaceId")).isEqualTo("200");
        verify(skillSandboxConfigService).toRuntimeRefDto("approval-user", 200L);
    }

    @Test
    void workflowInternalHeadersUseConfiguredSecret() {
        ReflectionTestUtils.setField(
                workflowService,
                "workflowInternalApiKey",
                "0123456789abcdef0123456789abcdef");

        Map<String, String> headers = ReflectionTestUtils.invokeMethod(
                workflowService, "workflowInternalHeaders");

        assertThat(headers)
                .containsEntry(
                        "X-Workflow-Internal-Key",
                        "0123456789abcdef0123456789abcdef");
    }

    @Test
    void workflowInternalHeadersRejectPublishedPlaceholder() {
        ReflectionTestUtils.setField(
                workflowService,
                "workflowInternalApiKey",
                "CHANGE_ME_WORKFLOW_INTERNAL_API_KEY");

        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(
                workflowService, "workflowInternalHeaders"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageNotContaining("CHANGE_ME_WORKFLOW_INTERNAL_API_KEY");
    }
}
