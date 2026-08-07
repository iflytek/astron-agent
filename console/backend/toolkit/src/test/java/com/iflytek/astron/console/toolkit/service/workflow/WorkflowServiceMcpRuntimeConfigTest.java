package com.iflytek.astron.console.toolkit.service.workflow;

import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.entity.bot.ChatBotBase;
import com.iflytek.astron.console.commons.entity.workflow.Workflow;
import com.iflytek.astron.console.commons.mapper.bot.ChatBotBaseMapper;
import com.iflytek.astron.console.toolkit.common.constant.WorkflowConst;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.BizWorkflowData;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.BizWorkflowNode;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.node.BizNodeData;
import com.iflytek.astron.console.toolkit.service.skill.SkillEnrichmentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkflowServiceMcpRuntimeConfigTest {

    @Mock
    private ChatBotBaseMapper chatBotBaseMapper;

    @Mock
    private SkillEnrichmentService skillEnrichmentService;

    private WorkflowService workflowService;

    @BeforeEach
    void setUp() {
        workflowService = new WorkflowService();
        ReflectionTestUtils.setField(workflowService, "chatBotBaseMapper", chatBotBaseMapper);
        ReflectionTestUtils.setField(workflowService, "skillEnrichmentService", skillEnrichmentService);
    }

    @Test
    void resolveBotMcpServerUrlsReadsBotConfigFromWorkflowExt() {
        Workflow workflow = new Workflow();
        workflow.setExt("{\"botId\":123}");
        ChatBotBase botBase = new ChatBotBase();
        botBase.setMcpServerUrls("[\"https://mcp.example.com/sse\"]");
        when(chatBotBaseMapper.selectById(123)).thenReturn(botBase);

        List<String> urls = ReflectionTestUtils.invokeMethod(
                workflowService,
                "resolveBotMcpServerUrls",
                null,
                workflow);

        assertThat(urls).containsExactly("https://mcp.example.com/sse");
    }

    @Test
    void checkAndEditDataMergesConfiguredMcpUrlsIntoAgentPlugin() {
        BizNodeData data = new BizNodeData();
        data.setNodeMeta(new JSONObject());
        JSONObject plugin = new JSONObject()
                .fluentPut("mcpServerUrls", new JSONArray(List.of("https://existing.example.com/sse")));
        data.setNodeParam(new JSONObject().fluentPut("plugin", plugin));

        ReflectionTestUtils.invokeMethod(
                workflowService,
                "checkAndEditData",
                data,
                WorkflowConst.NodeType.AGENT,
                List.of("https://existing.example.com/sse", "https://mcp.example.com/sse"));

        assertThat(plugin.getJSONArray("mcpServerUrls"))
                .containsExactly("https://existing.example.com/sse", "https://mcp.example.com/sse");
    }

    @Test
    void containsRuntimePluginConfigurationReturnsTrueForMcpUrls() {
        BizNodeData data = new BizNodeData();
        data.setNodeParam(new JSONObject().fluentPut("plugin", new JSONObject()
                .fluentPut("mcpServerUrls", new JSONArray(List.of("https://mcp.example.com/sse")))));
        BizWorkflowNode node = new BizWorkflowNode();
        node.setId(WorkflowConst.NodeType.AGENT + "::agent-1");
        node.setData(data);
        BizWorkflowData workflowData = new BizWorkflowData();
        workflowData.setNodes(List.of(node));

        Boolean result = ReflectionTestUtils.invokeMethod(
                workflowService,
                "containsRuntimePluginConfiguration",
                workflowData);

        assertThat(result).isTrue();
    }
}
