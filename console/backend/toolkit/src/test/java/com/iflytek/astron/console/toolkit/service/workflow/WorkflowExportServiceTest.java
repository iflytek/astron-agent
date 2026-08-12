package com.iflytek.astron.console.toolkit.service.workflow;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iflytek.astron.console.commons.config.JwtClaimsFilter;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.entity.workflow.Workflow;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.service.space.EnterpriseSpaceService;
import com.iflytek.astron.console.commons.util.BotUtil;
import com.iflytek.astron.console.toolkit.config.properties.CommonConfig;
import com.iflytek.astron.console.toolkit.entity.biz.modelconfig.ModelDto;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.BizWorkflowData;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.BizWorkflowNode;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.node.BizInputOutput;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.node.BizNodeData;
import com.iflytek.astron.console.toolkit.entity.table.tool.ToolBox;
import com.iflytek.astron.console.toolkit.entity.vo.LLMInfoVo;
import com.iflytek.astron.console.toolkit.entity.vo.WorkflowImportReport;
import com.iflytek.astron.console.toolkit.entity.vo.WorkflowImportVo;
import com.iflytek.astron.console.toolkit.service.model.ModelService;
import com.iflytek.astron.console.toolkit.service.tool.ToolBoxService;
import com.iflytek.astron.console.toolkit.tool.DataPermissionCheckTool;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.SafeConstructor;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.same;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkflowExportServiceTest {
    private static final String UID = "user-1";
    private static final String PLUGIN_NAME = "demo-cross-env-plugin";

    @Mock
    private WorkflowService workflowService;
    @Mock
    private ModelService modelService;
    @Mock
    private BotUtil botUtil;
    @Mock
    private ToolBoxService toolBoxService;
    @Mock
    private DataPermissionCheckTool dataPermissionCheckTool;
    @Mock
    private CommonConfig commonConfig;
    @Mock
    private EnterpriseSpaceService enterpriseSpaceService;

    private WorkflowExportService service;
    private MockHttpServletRequest request;

    @BeforeAll
    static void initializeMybatisMetadata() {
        TableInfoHelper.initTableInfo(
                new MapperBuilderAssistant(new MybatisConfiguration(), "workflow-import-test"), ToolBox.class);
    }

    @BeforeEach
    void setUp() {
        service = new WorkflowExportService();
        ReflectionTestUtils.setField(service, "workflowService", workflowService);
        ReflectionTestUtils.setField(service, "modelService", modelService);
        ReflectionTestUtils.setField(service, "botUtil", botUtil);
        ReflectionTestUtils.setField(service, "toolBoxService", toolBoxService);
        ReflectionTestUtils.setField(service, "dataPermissionCheckTool", dataPermissionCheckTool);
        ReflectionTestUtils.setField(service, "commonConfig", commonConfig);
        ReflectionTestUtils.setField(service, "enterpriseSpaceService", enterpriseSpaceService);

        request = new MockHttpServletRequest();
        request.setAttribute(JwtClaimsFilter.USER_ID_ATTRIBUTE, UID);
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
    }

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void exportAddsPortablePluginIdentityFromToolMetadata() {
        BizWorkflowData flowData = workflowData(pluginNode("source-tool", "source-operation", "source-app"));
        flowData.getNodes().get(0).getData().setLabel("renamed node label");
        Workflow workflow = workflow(flowData);
        ToolBox sourceTool = tool("source-tool", "source-operation", "source-app", UID, null,
                schema("input-a", "source description", false));
        when(toolBoxService.list(any(LambdaQueryWrapper.class))).thenReturn(List.of(sourceTool));

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        service.exportWorkflowDataAsYaml(workflow, output);

        BizWorkflowData exported = readFlowData(output.toByteArray());
        BizNodeData exportedData = exported.getNodes().get(0).getData();
        JSONObject portable = exportedData.getNodeParam().getJSONObject("portablePlugin");
        assertThat(exportedData.getPluginName()).isEqualTo(PLUGIN_NAME);
        assertThat(portable.getString("name")).isEqualTo(PLUGIN_NAME);
        assertThat(portable.getString("schemaFingerprint")).matches("[0-9a-f]{64}");
        assertThat(portable.getIntValue("schemaFingerprintVersion")).isEqualTo(1);
        assertThat(portable.toJSONString()).doesNotContain("source description", "input-a", "endpoint");
        verify(dataPermissionCheckTool).checkWorkflowVisible(workflow, null);
        ArgumentCaptor<ToolBox> permissionView = ArgumentCaptor.forClass(ToolBox.class);
        verify(dataPermissionCheckTool).checkToolVisible(permissionView.capture());
        assertThat(permissionView.getValue().getToolId()).isEqualTo("source-tool");
        assertThat(permissionView.getValue().getWebSchema()).isNull();
        assertThat(permissionView.getValue().getAuthInfo()).isNull();
    }

    @Test
    void uniqueCompatiblePluginRemapsRuntimeIdentityAndPreservesNodeSchema() {
        BizWorkflowNode node = pluginNode("source-tool", "source-operation", "source-app");
        addPortableIdentity(node, PLUGIN_NAME, fingerprintFor(schema("source-id", "source", false)));
        BizInputOutput input = node.getData().getInputs().get(0);
        BizInputOutput output = node.getData().getOutputs().get(0);
        ToolBox target = tool("target-tool", "target-operation", "target-app", UID, null,
                schema("target-id", "target", false));
        when(toolBoxService.list(any(LambdaQueryWrapper.class)))
                .thenReturn(Collections.emptyList())
                .thenReturn(List.of(target));
        stubModelList();

        WorkflowImportReport report = service.cleanNodesForImport(workflowData(node), UID, request);

        JSONObject param = node.getData().getNodeParam();
        assertThat(param.getString("pluginId")).isEqualTo("target-tool");
        assertThat(param.getString("operationId")).isEqualTo("target-operation");
        assertThat(param.getString("appId")).isEqualTo("target-app");
        assertThat(param.getString("version")).isEqualTo("V1.0");
        assertThat(param.getString("uid")).isEqualTo(UID);
        assertThat(param.getString("toolDescription")).isEqualTo("target description");
        assertThat(param.getList("businessInput", String.class)).containsExactly("query");
        assertThat(param).doesNotContainKey("portablePlugin");
        assertThat(node.getData().getInputs()).containsExactly(input);
        assertThat(node.getData().getOutputs()).containsExactly(output);
        assertThat(node.getData().getPluginName()).isEqualTo(PLUGIN_NAME);
        assertThat(report.getMappedPluginCount()).isEqualTo(1);
        assertThat(report.getUnresolvedPlugins()).isEmpty();
    }

    @Test
    void existingVisiblePluginIdKeepsBackwardCompatibilityWithoutNameFallback() {
        BizWorkflowNode node = pluginNode("target-tool", "target-operation", "target-app");
        ToolBox target = tool("target-tool", "target-operation", "target-app", UID, null,
                schema("target-id", "target", false));
        when(toolBoxService.list(any(LambdaQueryWrapper.class))).thenReturn(List.of(target));
        stubModelList();

        WorkflowImportReport report = service.cleanNodesForImport(workflowData(node), UID, request);

        assertThat(node.getData().getNodeParam().getString("pluginId")).isEqualTo("target-tool");
        assertThat(node.getData().getInputs()).hasSize(1);
        assertThat(node.getData().getOutputs()).hasSize(1);
        assertThat(report.getMappedPluginCount()).isZero();
        assertThat(report.getUnresolvedPlugins()).isEmpty();
        verify(toolBoxService, times(1)).list(any(LambdaQueryWrapper.class));
    }

    @Test
    void existingDraftPluginIdKeepsBackwardCompatibility() {
        BizWorkflowNode node = pluginNode("target-tool", "target-operation", "target-app");
        ToolBox target = tool("target-tool", "target-operation", "target-app", UID, null,
                schema("target-id", "target", false));
        target.setStatus(0);
        when(toolBoxService.list(any(LambdaQueryWrapper.class))).thenReturn(List.of(target));
        stubModelList();

        WorkflowImportReport report = service.cleanNodesForImport(workflowData(node), UID, request);

        assertThat(node.getData().getNodeParam().getString("pluginId")).isEqualTo("target-tool");
        assertThat(node.getData().getInputs()).hasSize(1);
        assertThat(node.getData().getOutputs()).hasSize(1);
        assertThat(report.getMappedPluginCount()).isZero();
        assertThat(report.getUnresolvedPlugins()).isEmpty();
    }

    @Test
    void inaccessibleDirectPluginIdFailsClosed() {
        BizWorkflowNode node = pluginNode("target-tool", "target-operation", "target-app");
        ToolBox target = tool("target-tool", "target-operation", "target-app", "other-user", null,
                schema("target-id", "target", false));
        when(toolBoxService.list(any(LambdaQueryWrapper.class))).thenReturn(List.of(target));
        doThrow(new BusinessException(ResponseEnum.DATA_NOT_FOUND))
                .when(dataPermissionCheckTool)
                .checkToolVisible(any(ToolBox.class));
        stubModelList();

        WorkflowImportReport report = service.cleanNodesForImport(workflowData(node), UID, request);

        assertPluginBindingCleared(node);
        assertThat(report.getUnresolvedPlugins()).singleElement()
                .extracting(WorkflowImportReport.UnresolvedPlugin::getReason)
                .isEqualTo("MISSING_METADATA");
    }

    @Test
    void duplicateCompatiblePluginNamesFailClosed() {
        BizWorkflowNode node = pluginNode("source-tool", "source-operation", "source-app");
        String fingerprint = fingerprintFor(schema("source-id", "source", false));
        addPortableIdentity(node, PLUGIN_NAME, fingerprint);
        ToolBox first = tool("target-a", "operation-a", "app-a", UID, null,
                schema("target-a", "target a", false));
        ToolBox second = tool("target-b", "operation-b", "app-b", UID, null,
                schema("target-b", "target b", false));
        when(toolBoxService.list(any(LambdaQueryWrapper.class)))
                .thenReturn(Collections.emptyList())
                .thenReturn(List.of(first, second));
        stubModelList();

        WorkflowImportReport report = service.cleanNodesForImport(workflowData(node), UID, request);

        assertPluginBindingCleared(node);
        assertThat(report.getMappedPluginCount()).isZero();
        assertThat(report.getUnresolvedPlugins()).singleElement()
                .extracting(WorkflowImportReport.UnresolvedPlugin::getReason)
                .isEqualTo("AMBIGUOUS");
    }

    @Test
    void multipleVersionsOfOnePluginAreNotTreatedAsNameAmbiguity() {
        BizWorkflowNode node = pluginNode("source-tool", "source-operation", "source-app");
        addPortableIdentity(node, PLUGIN_NAME, fingerprintFor(schema("source-id", "source", false)));
        ToolBox versionOne = tool("target-tool", "operation-v1", "target-app", UID, null,
                schema("target-v1", "target v1", false));
        ToolBox versionTwo = tool("target-tool", "operation-v2", "target-app", UID, null,
                schema("target-v2", "target v2", false));
        versionTwo.setVersion("V2.0");
        when(toolBoxService.list(any(LambdaQueryWrapper.class)))
                .thenReturn(Collections.emptyList())
                .thenReturn(List.of(versionOne, versionTwo));
        stubModelList();

        WorkflowImportReport report = service.cleanNodesForImport(workflowData(node), UID, request);

        assertThat(node.getData().getNodeParam().getString("pluginId")).isEqualTo("target-tool");
        assertThat(node.getData().getNodeParam().getString("operationId")).isEqualTo("operation-v1");
        assertThat(node.getData().getNodeParam().getString("version")).isEqualTo("V1.0");
        assertThat(report.getMappedPluginCount()).isEqualTo(1);
    }

    @Test
    void incompatibleSchemaFailsClosed() {
        BizWorkflowNode node = pluginNode("source-tool", "source-operation", "source-app");
        addPortableIdentity(node, PLUGIN_NAME, fingerprintFor(schema("source-id", "source", false)));
        ToolBox target = tool("target-tool", "target-operation", "target-app", UID, null,
                schema("target-id", "target", true));
        when(toolBoxService.list(any(LambdaQueryWrapper.class)))
                .thenReturn(Collections.emptyList())
                .thenReturn(List.of(target));
        stubModelList();

        WorkflowImportReport report = service.cleanNodesForImport(workflowData(node), UID, request);

        assertPluginBindingCleared(node);
        assertThat(report.getUnresolvedPlugins()).singleElement()
                .extracting(WorkflowImportReport.UnresolvedPlugin::getReason)
                .isEqualTo("INCOMPATIBLE");
    }

    @Test
    void draftPluginIsNotConsideredForNameFallback() {
        BizWorkflowNode node = pluginNode("source-tool", "source-operation", "source-app");
        addPortableIdentity(node, PLUGIN_NAME, fingerprintFor(schema("source-id", "source", false)));
        ToolBox target = tool("target-tool", "target-operation", "target-app", UID, null,
                schema("target-id", "target", false));
        target.setStatus(0);
        when(toolBoxService.list(any(LambdaQueryWrapper.class)))
                .thenReturn(Collections.emptyList())
                .thenReturn(List.of(target));
        stubModelList();

        WorkflowImportReport report = service.cleanNodesForImport(workflowData(node), UID, request);

        assertPluginBindingCleared(node);
        assertThat(report.getUnresolvedPlugins()).singleElement()
                .extracting(WorkflowImportReport.UnresolvedPlugin::getReason)
                .isEqualTo("NOT_FOUND");
    }

    @Test
    void sameSpacePluginCanBeMatchedForCurrentSpace() {
        request.addHeader("space-id", "100");
        BizWorkflowNode node = pluginNode("source-tool", "source-operation", "source-app");
        addPortableIdentity(node, PLUGIN_NAME, fingerprintFor(schema("source-id", "source", false)));
        ToolBox target = tool("target-tool", "target-operation", "target-app", "other-member", 100L,
                schema("target-id", "target", false));
        when(toolBoxService.list(any(LambdaQueryWrapper.class)))
                .thenReturn(Collections.emptyList())
                .thenReturn(List.of(target));
        stubModelList();

        WorkflowImportReport report = service.cleanNodesForImport(workflowData(node), UID, request);

        assertThat(node.getData().getNodeParam().getString("pluginId")).isEqualTo("target-tool");
        assertThat(report.getMappedPluginCount()).isEqualTo(1);
        verify(dataPermissionCheckTool).checkToolVisible(any(ToolBox.class));
    }

    @Test
    void crossSpacePluginIsNotConsideredForFallback() {
        request.addHeader("space-id", "100");
        BizWorkflowNode node = pluginNode("source-tool", "source-operation", "source-app");
        addPortableIdentity(node, PLUGIN_NAME, fingerprintFor(schema("source-id", "source", false)));
        ToolBox target = tool("target-tool", "target-operation", "target-app", "other-user", 200L,
                schema("target-id", "target", false));
        when(toolBoxService.list(any(LambdaQueryWrapper.class)))
                .thenReturn(Collections.emptyList())
                .thenReturn(List.of(target));
        stubModelList();

        WorkflowImportReport report = service.cleanNodesForImport(workflowData(node), UID, request);

        assertPluginBindingCleared(node);
        assertThat(report.getUnresolvedPlugins()).singleElement()
                .extracting(WorkflowImportReport.UnresolvedPlugin::getReason)
                .isEqualTo("NOT_FOUND");
    }

    @Test
    void publicPluginOwnedByAnotherUserIsNotGuessedByName() {
        BizWorkflowNode node = pluginNode("source-tool", "source-operation", "source-app");
        addPortableIdentity(node, PLUGIN_NAME, fingerprintFor(schema("source-id", "source", false)));
        ToolBox target = tool("target-tool", "target-operation", "target-app", "other-user", null,
                schema("target-id", "target", false));
        target.setIsPublic(true);
        when(toolBoxService.list(any(LambdaQueryWrapper.class)))
                .thenReturn(Collections.emptyList())
                .thenReturn(List.of(target));
        stubModelList();

        WorkflowImportReport report = service.cleanNodesForImport(workflowData(node), UID, request);

        assertPluginBindingCleared(node);
        assertThat(report.getUnresolvedPlugins()).singleElement()
                .extracting(WorkflowImportReport.UnresolvedPlugin::getReason)
                .isEqualTo("NOT_FOUND");
    }

    @Test
    void oldYamlWithoutPortableMetadataStillFailsClosedWhenIdIsMissing() {
        BizWorkflowNode node = pluginNode("missing-tool", "missing-operation", "source-app");
        when(toolBoxService.list(any(LambdaQueryWrapper.class))).thenReturn(Collections.emptyList());
        stubModelList();

        WorkflowImportReport report = service.cleanNodesForImport(workflowData(node), UID, request);

        assertPluginBindingCleared(node);
        assertThat(report.getUnresolvedPlugins()).singleElement()
                .extracting(WorkflowImportReport.UnresolvedPlugin::getReason)
                .isEqualTo("MISSING_METADATA");
    }

    @Test
    void malformedPortableMetadataFailsClosedWithoutAbortingImport() {
        BizWorkflowNode node = pluginNode("missing-tool", "missing-operation", "source-app");
        node.getData().getNodeParam().put("portablePlugin", "not-an-object");
        when(toolBoxService.list(any(LambdaQueryWrapper.class))).thenReturn(Collections.emptyList());
        stubModelList();

        WorkflowImportReport report = service.cleanNodesForImport(workflowData(node), UID, request);

        assertPluginBindingCleared(node);
        assertThat(report.getUnresolvedPlugins()).singleElement()
                .extracting(WorkflowImportReport.UnresolvedPlugin::getReason)
                .isEqualTo("MISSING_METADATA");
    }

    @Test
    void unsupportedFingerprintVersionFailsClosed() {
        BizWorkflowNode node = pluginNode("missing-tool", "missing-operation", "source-app");
        addPortableIdentity(node, PLUGIN_NAME, "0".repeat(64));
        node.getData()
                .getNodeParam()
                .getJSONObject("portablePlugin")
                .put("schemaFingerprintVersion", 2);
        when(toolBoxService.list(any(LambdaQueryWrapper.class))).thenReturn(Collections.emptyList());
        stubModelList();

        WorkflowImportReport report = service.cleanNodesForImport(workflowData(node), UID, request);

        assertPluginBindingCleared(node);
        assertThat(report.getUnresolvedPlugins()).singleElement()
                .extracting(WorkflowImportReport.UnresolvedPlugin::getReason)
                .isEqualTo("MISSING_METADATA");
    }

    @Test
    void exportImportRoundTripMatchesEquivalentSchemaWithDifferentPresentationFields() {
        BizWorkflowNode sourceNode = pluginNode("source-tool", "source-operation", "source-app");
        Workflow workflow = workflow(workflowData(sourceNode));
        ToolBox source = tool("source-tool", "source-operation", "source-app", UID, null,
                schema("source-id", "source description", false));
        ToolBox target = tool("target-tool", "target-operation", "target-app", UID, null,
                schema("target-id", "target description", false));
        when(toolBoxService.list(any(LambdaQueryWrapper.class)))
                .thenReturn(List.of(source))
                .thenReturn(Collections.emptyList())
                .thenReturn(List.of(target));

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        service.exportWorkflowDataAsYaml(workflow, output);
        BizWorkflowData imported = readFlowData(output.toByteArray());
        stubModelList();
        WorkflowImportReport report = service.cleanNodesForImport(imported, UID, request);

        BizWorkflowNode importedNode = imported.getNodes().get(0);
        assertThat(importedNode.getData().getNodeParam().getString("pluginId")).isEqualTo("target-tool");
        assertThat(importedNode.getData().getNodeParam().getString("operationId")).isEqualTo("target-operation");
        assertThat(importedNode.getData().getInputs()).hasSize(1);
        assertThat(importedNode.getData().getOutputs()).hasSize(1);
        assertThat(report.getMappedPluginCount()).isEqualTo(1);
    }

    @Test
    void importResponseKeepsWorkflowFieldsAtTopLevelAndIncludesReport() throws Exception {
        BizWorkflowNode node = pluginNode("target-tool", "target-operation", "target-app");
        ToolBox target = tool("target-tool", "target-operation", "target-app", UID, null,
                schema("target-id", "target", false));
        when(toolBoxService.list(any(LambdaQueryWrapper.class))).thenReturn(List.of(target));
        stubModelList();
        when(commonConfig.getAppId()).thenReturn("workflow-app");
        when(workflowService.callProtocolAdd(any())).thenReturn(ApiResult.success("flow-new"));
        doAnswer(invocation -> {
            Workflow saved = invocation.getArgument(0);
            saved.setId(42L);
            return true;
        }).when(workflowService).save(any(Workflow.class));
        when(botUtil.syncToSparkDatabase(any(Workflow.class), eq(UID), eq(null))).thenReturn(7);
        when(workflowService.updateById(any(Workflow.class))).thenReturn(true);
        byte[] yaml = yamlFor(workflowData(node));

        ApiResult<?> result = service.importWorkflowFromYaml(new ByteArrayInputStream(yaml), request);

        assertThat(result.code()).isZero();
        assertThat(result.data()).isInstanceOf(Workflow.class).isInstanceOf(WorkflowImportVo.class);
        WorkflowImportVo imported = (WorkflowImportVo) result.data();
        assertThat(imported.getFlowId()).isEqualTo("flow-new");
        assertThat(imported.getId()).isEqualTo(42L);
        assertThat(imported.getImportReport()).isNotNull();
        assertThat(imported.getImportReport().getUnresolvedPlugins()).isEmpty();
        JSONObject serialized = JSON.parseObject(new ObjectMapper().writeValueAsString(imported));
        assertThat(serialized.getString("flowId")).isEqualTo("flow-new");
        assertThat(serialized.getJSONObject("importReport")).isNotNull();
        assertThat(serialized).doesNotContainKey("workflow");
    }

    @Test
    void importRejectsSpaceHeaderWhenUserIsNotAMember() {
        request.addHeader("space-id", "100");
        byte[] yaml = yamlFor(workflowData(pluginNode("target-tool", "target-operation", "target-app")));

        assertThatThrownBy(() -> service.importWorkflowFromYaml(new ByteArrayInputStream(yaml), request))
                .isInstanceOf(BusinessException.class)
                .satisfies(error -> assertThat(((BusinessException) error).getResponseEnum())
                        .isEqualTo(ResponseEnum.PERMISSION_NOT_BELONG_SPACE));
        verify(enterpriseSpaceService).checkUserBelongSpace(100L, UID);
        verifyNoInteractions(workflowService, modelService, botUtil, toolBoxService);
    }

    private void stubModelList() {
        Page<LLMInfoVo> page = new Page<>();
        page.setRecords(Collections.emptyList());
        when(modelService.getConditionList(any(ModelDto.class), same(request))).thenReturn(ApiResult.success(page));
    }

    private Workflow workflow(BizWorkflowData flowData) {
        Workflow workflow = new Workflow();
        workflow.setId(1L);
        workflow.setName("portable workflow");
        workflow.setUid(UID);
        workflow.setData(JSON.toJSONString(flowData));
        return workflow;
    }

    private BizWorkflowData workflowData(BizWorkflowNode node) {
        BizWorkflowData flowData = new BizWorkflowData();
        flowData.setNodes(List.of(node));
        flowData.setEdges(Collections.emptyList());
        return flowData;
    }

    private BizWorkflowNode pluginNode(String pluginId, String operationId, String appId) {
        JSONObject param = new JSONObject();
        param.put("pluginId", pluginId);
        param.put("operationId", operationId);
        param.put("appId", appId);
        param.put("uid", "source-user");
        param.put("version", "V1.0");
        param.put("toolDescription", "source description");
        param.put("businessInput", List.of("old-business-input"));

        BizInputOutput input = new BizInputOutput();
        input.setId("input-ref-id");
        input.setName("query");
        BizInputOutput output = new BizInputOutput();
        output.setId("output-ref-id");
        output.setName("answer");

        BizNodeData data = new BizNodeData();
        data.setLabel("Plugin node");
        data.setNodeParam(param);
        data.setInputs(List.of(input));
        data.setOutputs(List.of(output));

        BizWorkflowNode node = new BizWorkflowNode();
        node.setId("plugin::node-1");
        node.setData(data);
        return node;
    }

    private ToolBox tool(String toolId, String operationId, String appId, String userId, Long spaceId,
            String webSchema) {
        ToolBox tool = new ToolBox();
        tool.setToolId(toolId);
        tool.setName(PLUGIN_NAME);
        tool.setOperationId(operationId);
        tool.setAppId(appId);
        tool.setUserId(userId);
        tool.setSpaceId(spaceId);
        tool.setVersion("V1.0");
        tool.setMethod("POST");
        tool.setWebSchema(webSchema);
        tool.setDescription("target description");
        tool.setDeleted(false);
        tool.setStatus(1);
        tool.setIsPublic(false);
        return tool;
    }

    private void addPortableIdentity(BizWorkflowNode node, String name, String fingerprint) {
        JSONObject portable = new JSONObject();
        portable.put("name", name);
        portable.put("schemaFingerprint", fingerprint);
        portable.put("schemaFingerprintVersion", 1);
        node.getData().setPluginName(name);
        node.getData().getNodeParam().put("portablePlugin", portable);
    }

    private String fingerprintFor(String webSchema) {
        BizWorkflowNode node = pluginNode("fingerprint-tool", "fingerprint-operation", "fingerprint-app");
        Workflow workflow = workflow(workflowData(node));
        ToolBox tool = tool("fingerprint-tool", "fingerprint-operation", "fingerprint-app", UID, null, webSchema);
        when(toolBoxService.list(any(LambdaQueryWrapper.class))).thenReturn(List.of(tool));
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        service.exportWorkflowDataAsYaml(workflow, output);
        String fingerprint = readFlowData(output.toByteArray()).getNodes()
                .get(0)
                .getData()
                .getNodeParam()
                .getJSONObject("portablePlugin")
                .getString("schemaFingerprint");
        clearInvocations(dataPermissionCheckTool);
        return fingerprint;
    }

    private String schema(String idPrefix, String description, boolean incompatible) {
        String inputType = incompatible ? "integer" : "string";
        return "{\"toolRequestInput\":["
                + "{\"id\":\"" + idPrefix + "-2\",\"name\":\"limit\",\"description\":\"" + description
                + "\",\"type\":\"integer\",\"location\":\"body\",\"required\":false,\"default\":10,"
                + "\"open\":true,\"from\":2},"
                + "{\"id\":\"" + idPrefix + "-1\",\"name\":\"query\",\"description\":\"" + description
                + "\",\"type\":\"" + inputType
                + "\",\"location\":\"body\",\"required\":true,\"default\":\"\",\"open\":true,\"from\":1}],"
                + "\"toolRequestOutput\":[{\"id\":\"" + idPrefix
                + "-3\",\"name\":\"answer\",\"description\":\"" + description
                + "\",\"type\":\"string\",\"open\":true}]}";
    }

    private void assertPluginBindingCleared(BizWorkflowNode node) {
        JSONObject param = node.getData().getNodeParam();
        assertThat(param).doesNotContainKeys(
                "pluginId", "operationId", "version", "appId", "uid", "toolDescription", "businessInput",
                "portablePlugin");
        assertThat(node.getData().getInputs()).isEmpty();
        assertThat(node.getData().getOutputs()).isEmpty();
    }

    private BizWorkflowData readFlowData(byte[] yamlBytes) {
        LoaderOptions options = new LoaderOptions();
        Map<String, Object> root = new Yaml(new SafeConstructor(options))
                .load(new ByteArrayInputStream(yamlBytes));
        return JSON.parseObject(JSON.toJSONString(root.get("flowData")), BizWorkflowData.class);
    }

    private byte[] yamlFor(BizWorkflowData flowData) {
        Map<String, Object> root = Map.of(
                "flowMeta", Map.of("name", "imported workflow"),
                "flowData", JSON.parseObject(JSON.toJSONString(flowData)));
        return new Yaml().dump(root).getBytes(StandardCharsets.UTF_8);
    }
}
