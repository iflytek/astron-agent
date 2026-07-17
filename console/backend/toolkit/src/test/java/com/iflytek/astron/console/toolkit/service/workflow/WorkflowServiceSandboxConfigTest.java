package com.iflytek.astron.console.toolkit.service.workflow;

import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.node.BizNodeData;
import com.iflytek.astron.console.toolkit.entity.dto.skill.SkillSandboxConfigDto;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.BizWorkflowNode;
import com.iflytek.astron.console.toolkit.service.skill.SkillSandboxConfigService;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
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
    }

    @Test
    void injectScriptSandboxAddsRuntimeConfigToCodeNodes() {
        SkillSandboxConfigDto config = new SkillSandboxConfigDto();
        config.setProvider("e2b");
        config.setEnabled(Boolean.TRUE);
        config.setApiKey("secret");
        config.setTimeoutSeconds(60);
        config.setAllowInternetAccess(Boolean.TRUE);
        config.setArtifactUploadUrl("http://hub/workflow/artifacts/internal-upload");
        config.setArtifactUploadToken("token");
        config.setSpaceId(100L);
        when(skillSandboxConfigService.toRuntimeDto()).thenReturn(config);

        BizWorkflowNode codeNode = new BizWorkflowNode();
        codeNode.setId("ifly-code::code-1");
        BizNodeData codeData = new BizNodeData();
        codeData.setNodeParam(new JSONObject());
        codeNode.setData(codeData);

        ReflectionTestUtils.invokeMethod(
                workflowService,
                "injectScriptSandboxIntoCodeNodes",
                List.of(codeNode),
                "flow-1");

        JSONObject sandbox = codeData.getNodeParam().getJSONObject("sandbox");
        assertThat(sandbox.getString("provider")).isEqualTo("e2b");
        assertThat(sandbox.getBoolean("enabled")).isTrue();
        assertThat(sandbox.getString("apiKey")).isEqualTo("secret");
        assertThat(sandbox.getString("workflowId")).isEqualTo("flow-1");
        assertThat(sandbox.getString("nodeId")).isEqualTo("ifly-code::code-1");
        assertThat(sandbox.getString("spaceId")).isEqualTo("100");
    }

    @Test
    void injectScriptSandboxSkipsCodeNodesWhenSandboxIsNotConfigured() {
        SkillSandboxConfigDto config = new SkillSandboxConfigDto();
        config.setProvider("e2b");
        config.setEnabled(Boolean.FALSE);
        config.setApiKey("");
        when(skillSandboxConfigService.toRuntimeDto()).thenReturn(config);

        BizWorkflowNode codeNode = new BizWorkflowNode();
        codeNode.setId("ifly-code::code-1");
        BizNodeData codeData = new BizNodeData();
        codeData.setNodeParam(new JSONObject());
        codeNode.setData(codeData);

        ReflectionTestUtils.invokeMethod(
                workflowService,
                "injectScriptSandboxIntoCodeNodes",
                List.of(codeNode),
                "flow-1");

        assertThat(codeData.getNodeParam().containsKey("sandbox")).isFalse();
    }

    @Test
    void injectScriptSandboxSkipsCodeNodesWhenRuntimeConfigCannotBeResolved() {
        when(skillSandboxConfigService.toRuntimeDto()).thenThrow(new RuntimeException("no user context"));

        BizWorkflowNode codeNode = new BizWorkflowNode();
        codeNode.setId("ifly-code::code-1");
        BizNodeData codeData = new BizNodeData();
        codeData.setNodeParam(new JSONObject());
        codeNode.setData(codeData);

        ReflectionTestUtils.invokeMethod(
                workflowService,
                "injectScriptSandboxIntoCodeNodes",
                List.of(codeNode),
                "flow-1");

        assertThat(codeData.getNodeParam().containsKey("sandbox")).isFalse();
    }
}
