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
import com.iflytek.astron.console.toolkit.entity.table.relation.FlowRepoRel;
import com.iflytek.astron.console.toolkit.mapper.relation.FlowRepoRelMapper;
import com.iflytek.astron.console.toolkit.service.skill.SkillEnrichmentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.context.request.RequestContextHolder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;

@ExtendWith(MockitoExtension.class)
class WorkflowServiceMcpRuntimeConfigTest {

    @Mock
    private ChatBotBaseMapper chatBotBaseMapper;

    @Mock
    private SkillEnrichmentService skillEnrichmentService;

    @Mock
    private FlowRepoRelMapper flowRepoRelMapper;

    private WorkflowService workflowService;

    @BeforeEach
    void setUp() {
        workflowService = new WorkflowService();
        ReflectionTestUtils.setField(workflowService, "chatBotBaseMapper", chatBotBaseMapper);
        ReflectionTestUtils.setField(workflowService, "skillEnrichmentService", skillEnrichmentService);
        ReflectionTestUtils.setField(workflowService, "flowRepoRelMapper", flowRepoRelMapper);
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

    @Test
    void checkAndEditDataUsesExplicitSkillScopeWithoutRequestContext() {
        RequestContextHolder.resetRequestAttributes();
        BizNodeData data = new BizNodeData();
        data.setNodeMeta(new JSONObject());
        JSONObject plugin = new JSONObject()
                .fluentPut("skills", new JSONArray(List.of(
                        new JSONObject().fluentPut("skillId", "42"))));
        data.setNodeParam(new JSONObject().fluentPut("plugin", plugin));

        ReflectionTestUtils.invokeMethod(
                workflowService,
                "checkAndEditData",
                data,
                WorkflowConst.NodeType.AGENT,
                List.of(),
                "approval-user",
                200L);

        verify(skillEnrichmentService)
                .enrichSkillEntries(plugin.getJSONArray("skills"), "approval-user", 200L);
    }

    @Test
    void refreshRepoRelationsUsesEffectiveKnowledgeBindingsAndDeduplicatesThem() {
        BizWorkflowData workflow = new BizWorkflowData();
        workflow.setNodes(List.of(
                node("knowledge-base::normal", new JSONObject()
                        .fluentPut("repos", new JSONArray(List.of(
                                new JSONObject().fluentPut("repoId", "active-repo"))))
                        .fluentPut("repoId", new JSONArray(List.of("ignored-legacy")))),
                node("knowledge-pro-base::professional", new JSONObject()
                        .fluentPut("repoIds", new JSONArray(List.of("pro-repo", "active-repo")))
                        .fluentPut("repoList", new JSONArray(List.of(
                                new JSONObject().fluentPut("repoId", "ignored-display"))))),
                node("knowledge-expert-base::expert", new JSONObject()
                        .fluentPut("repos", new JSONArray(List.of(
                                new JSONObject().fluentPut("repoId", "expert-repo"))))),
                node("agent::agent", new JSONObject().fluentPut("plugin", new JSONObject()
                        .fluentPut("knowledge", new JSONArray(List.of(new JSONObject()
                                .fluentPut("match", new JSONObject().fluentPut("repoIds",
                                        new JSONArray(List.of("agent-repo", "active-repo")))))))))));
        when(flowRepoRelMapper.selectList(any())).thenReturn(List.of(
                new FlowRepoRel("flow-1", "stale-repo"),
                new FlowRepoRel("flow-1", "active-repo")));

        ReflectionTestUtils.invokeMethod(workflowService, "refreshRepoRelations", "flow-1", workflow);

        verify(flowRepoRelMapper).insert(new FlowRepoRel("flow-1", "pro-repo"));
        verify(flowRepoRelMapper).insert(new FlowRepoRel("flow-1", "expert-repo"));
        verify(flowRepoRelMapper).insert(new FlowRepoRel("flow-1", "agent-repo"));
        verify(flowRepoRelMapper, never()).insert(new FlowRepoRel("flow-1", "ignored-legacy"));
        verify(flowRepoRelMapper, never()).insert(new FlowRepoRel("flow-1", "ignored-display"));
        verify(flowRepoRelMapper, never()).insert(new FlowRepoRel("flow-1", "active-repo"));
        verify(flowRepoRelMapper).delete(any());
    }

    private BizWorkflowNode node(String id, JSONObject param) {
        BizNodeData data = new BizNodeData();
        data.setNodeMeta(new JSONObject());
        data.setNodeParam(param);
        BizWorkflowNode node = new BizWorkflowNode();
        node.setId(id);
        node.setData(data);
        return node;
    }
}
