package com.iflytek.astron.console.toolkit.service.workflow;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.iflytek.astron.console.commons.config.JwtClaimsFilter;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.entity.workflow.Workflow;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.util.BotUtil;
import com.iflytek.astron.console.toolkit.config.properties.BizConfig;
import com.iflytek.astron.console.toolkit.config.properties.CommonConfig;
import com.iflytek.astron.console.toolkit.entity.biz.modelconfig.ModelDto;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.BizWorkflowData;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.BizWorkflowNode;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.node.BizInputOutput;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.node.BizNodeData;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.node.BizProperty;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.node.BizSchema;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.node.BizValue;
import com.iflytek.astron.console.toolkit.entity.dto.WorkflowReq;
import com.iflytek.astron.console.toolkit.entity.table.database.DbInfo;
import com.iflytek.astron.console.toolkit.entity.table.group.GroupVisibility;
import com.iflytek.astron.console.toolkit.entity.table.repo.Repo;
import com.iflytek.astron.console.toolkit.entity.table.tool.ToolBox;
import com.iflytek.astron.console.toolkit.entity.vo.LLMInfoVo;
import com.iflytek.astron.console.toolkit.entity.vo.WorkflowImportReport;
import com.iflytek.astron.console.toolkit.service.model.ModelService;
import com.iflytek.astron.console.toolkit.service.repo.RepoService;
import com.iflytek.astron.console.toolkit.service.tool.ToolBoxService;
import com.iflytek.astron.console.toolkit.tool.DataPermissionCheckTool;
import com.iflytek.astron.console.toolkit.mapper.group.GroupVisibilityMapper;
import com.iflytek.astron.console.toolkit.mapper.repo.RepoMapper;
import com.iflytek.astron.console.toolkit.mapper.database.DbInfoMapper;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
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
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkflowExportServiceTest {

    private static final String USER_ID = "import-user";
    private static final String APP_ID = "target-app";

    @Mock
    private WorkflowService workflowService;
    @Mock
    private ModelService modelService;
    @Mock
    private ToolBoxService toolBoxService;
    @Mock
    private DataPermissionCheckTool dataPermissionCheckTool;
    @Mock
    private RepoMapper repoMapper;
    @Mock
    private GroupVisibilityMapper groupVisibilityMapper;
    @Mock
    private RepoService repoService;
    @Mock
    private DbInfoMapper dbInfoMapper;
    @Mock
    private BotUtil botUtil;
    private WorkflowExportService service;
    private MockHttpServletRequest request;

    @BeforeAll
    static void initTableInfo() {
        TableInfoHelper.initTableInfo(
                new MapperBuilderAssistant(new MybatisConfiguration(), ""), ToolBox.class);
        TableInfoHelper.initTableInfo(
                new MapperBuilderAssistant(new MybatisConfiguration(), ""), DbInfo.class);
    }

    @BeforeEach
    void setUp() {
        service = new WorkflowExportService();
        ReflectionTestUtils.setField(service, "workflowService", workflowService);
        ReflectionTestUtils.setField(service, "modelService", modelService);
        ReflectionTestUtils.setField(service, "toolBoxService", toolBoxService);
        ReflectionTestUtils.setField(service, "dataPermissionCheckTool", dataPermissionCheckTool);
        ReflectionTestUtils.setField(service, "repoMapper", repoMapper);
        ReflectionTestUtils.setField(service, "groupVisibilityMapper", groupVisibilityMapper);
        ReflectionTestUtils.setField(service, "repoService", repoService);
        ReflectionTestUtils.setField(service, "dbInfoMapper", dbInfoMapper);
        ReflectionTestUtils.setField(service, "botUtil", botUtil);

        BizConfig bizConfig = new BizConfig();
        bizConfig.setAdminUid("admin-user");
        ReflectionTestUtils.setField(service, "bizConfig", bizConfig);

        CommonConfig commonConfig = new CommonConfig();
        commonConfig.setAppId(APP_ID);
        ReflectionTestUtils.setField(service, "commonConfig", commonConfig);

        request = new MockHttpServletRequest();
        request.setAttribute(JwtClaimsFilter.USER_ID_ATTRIBUTE, USER_ID);
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        Page<LLMInfoVo> page = new Page<>(1, 999);
        page.setRecords(List.of());
        lenient().when(modelService.getConditionList(any(ModelDto.class), eq(request)))
                .thenReturn(new ApiResult<>(0, "ok", page, System.currentTimeMillis()));
        lenient().when(repoMapper.selectList(any(Wrapper.class))).thenReturn(List.of());
        lenient().when(groupVisibilityMapper.getRepoVisibilityList(USER_ID, null))
                .thenReturn(List.of());
        lenient().when(repoService.getStarFireData(request)).thenReturn(new JSONArray());
    }

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void cleanNodesKeepsVisibleModelReturnedAfterFirstImportPage() {
        long secondPageLlmId = 1_000L;
        Page<LLMInfoVo> firstPage = modelPageRange(1, 1_000, 1, 999);
        Page<LLMInfoVo> secondPage = modelPage(2, 1_000, secondPageLlmId);
        when(modelService.getConditionList(any(ModelDto.class), eq(request)))
                .thenAnswer(invocation -> {
                    ModelDto dto = invocation.getArgument(0);
                    return new ApiResult<>(0, "ok",
                            dto.getPage() == 1 ? firstPage : secondPage,
                            System.currentTimeMillis());
                });

        JSONObject param = new JSONObject()
                .fluentPut("llmId", secondPageLlmId)
                .fluentPut("domain", "visible-model")
                .fluentPut("serviceId", "visible-model")
                .fluentPut("uid", USER_ID);

        service.cleanNodesForImport(workflow(node("spark-llm::paged", param)),
                USER_ID, request);

        assertThat(param)
                .containsEntry("llmId", secondPageLlmId)
                .containsEntry("domain", "visible-model")
                .containsEntry("serviceId", "visible-model")
                .containsEntry("uid", USER_ID);
        ArgumentCaptor<ModelDto> requestCaptor = ArgumentCaptor.forClass(ModelDto.class);
        verify(modelService, times(2)).getConditionList(requestCaptor.capture(), eq(request));
        assertThat(requestCaptor.getAllValues())
                .extracting(ModelDto::getPage)
                .containsExactly(1, 2);
        assertThat(requestCaptor.getAllValues())
                .extracting(ModelDto::getPageSize)
                .containsOnly(999);
    }

    @Test
    void cleanNodesLoadsModelsFromCurrentSpaceScope() {
        request.addHeader("space-id", "42");
        BizWorkflowNode modelNode = node("spark-llm::space", new JSONObject());

        service.cleanNodesForImport(workflow(modelNode), USER_ID, request);

        verify(modelService).getConditionList(argThat(dto -> Long.valueOf(42L)
                .equals(dto.getSpaceId())), eq(request));
    }

    @Test
    void cleanNodesReportsExactIdAmbiguousAndIncompatibleResults() {
        ToolBox exactTarget = tool("same-id", "Exact Tool", "source-op", "V2.0",
                schema("exact-input"));
        ToolBox ambiguousA = tool("candidate-a", "Shared Tool", "op-a", "V1.0",
                schema("shared-input"));
        ToolBox ambiguousB = tool("candidate-b", "Shared Tool", "op-b", "V1.0",
                schema("shared-input"));
        ToolBox incompatibleTarget = tool("incompatible-id", "Changed Tool", "changed-op", "V3.0",
                schema("changed-input"));

        when(toolBoxService.list(any(Wrapper.class)))
                .thenReturn(List.of(exactTarget, incompatibleTarget))
                .thenReturn(List.of(ambiguousA, ambiguousB, incompatibleTarget));

        BizWorkflowNode exact = pluginNode("plugin::exact", "same-id", "source-op", "V1.0");
        BizWorkflowNode ambiguous = pluginNode(
                "plugin::ambiguous", "old-shared-id", "source-shared-op", "V1.0");
        BizWorkflowNode incompatible = pluginNode(
                "plugin::incompatible", "incompatible-id", "source-op", "V1.0");

        List<Map<String, Object>> manifest = List.of(
                manifest("plugin::ambiguous", "old-shared-id", "Shared Tool",
                        "source-shared-op", contractHash(schema("shared-input"))),
                manifest("plugin::incompatible", "incompatible-id", "Changed Tool",
                        "source-op", contractHash(schema("expected-input"))));
        WorkflowImportReport report = new WorkflowImportReport();

        service.cleanNodesForImport(workflow(exact, ambiguous, incompatible), USER_ID, request,
                manifest, report);

        assertThat(exact.getData().getNodeParam())
                .containsEntry("pluginId", "same-id")
                .containsEntry("operationId", "source-op")
                .containsEntry("version", "V2.0")
                .containsEntry("appId", APP_ID)
                .containsEntry("uid", USER_ID);
        assertThat(exact.getData().getInputs()).extracting(BizInputOutput::getName)
                .containsExactly("exact-input");

        assertUnresolved(ambiguous, "AMBIGUOUS");
        assertUnresolved(incompatible, "INCOMPATIBLE");

        assertThat(report.getTotal()).isEqualTo(3);
        assertThat(report.getResolved()).isEqualTo(1);
        assertThat(report.getAmbiguous()).isEqualTo(1);
        assertThat(report.getUnresolved()).isEqualTo(1);
        assertThat(report.getEntries()).extracting("status")
                .containsExactly("MAPPED", "AMBIGUOUS", "INCOMPATIBLE");
        assertThat(report.getEntries()).extracting("reasonCode")
                .containsExactly("SOURCE_ID_MATCHED", "MULTIPLE_COMPATIBLE_TOOLS",
                        "SAME_NAME_CONTRACT_INCOMPATIBLE");
        assertThat(report.getEntries()).extracting("mappingType")
                .containsExactly("SOURCE_ID", "NONE", "NONE");
        assertThat(report.getEntries().get(0).getTargetPluginId()).isEqualTo("same-id");
        assertThat(report.getEntries().get(1).getCandidatePluginIds())
                .containsExactly("candidate-a", "candidate-b");
    }

    @Test
    void cleanNodesMapsUniqueCompatibleManifestCandidateAcrossEnvironments() {
        String webSchema = schema("city");
        ToolBox target = tool("target-tool-id", "Weather Plugin", "target-random-op", "V2.1",
                webSchema);
        when(toolBoxService.list(any(Wrapper.class)))
                .thenReturn(List.of())
                .thenReturn(List.of(target));

        BizWorkflowNode node = pluginNode(
                "plugin::weather", "source-tool-id", "source-random-op", "V1.0");
        node.getData().getNodeParam().put("apiKey", "must-be-removed-on-import");
        WorkflowImportReport report = new WorkflowImportReport();

        service.cleanNodesForImport(workflow(node), USER_ID, request,
                List.of(manifest("plugin::weather", "source-tool-id", "Weather Plugin",
                        "source-random-op", contractHash(webSchema))),
                report);

        assertThat(node.getData().getNodeParam())
                .containsEntry("pluginId", "target-tool-id")
                .containsEntry("operationId", "target-random-op")
                .containsEntry("version", "V2.1")
                .doesNotContainKey("apiKey");
        assertThat(node.getData().getPluginName()).isEqualTo("Weather Plugin");
        assertThat(node.getData().getInputs()).extracting(BizInputOutput::getName)
                .containsExactly("city");
        assertThat(node.getData().getOutputs()).extracting(BizInputOutput::getName)
                .containsExactly("result");
        assertThat(report.getTotal()).isEqualTo(1);
        assertThat(report.getResolved()).isEqualTo(1);
        assertThat(report.getEntries().getFirst().getSourcePluginId()).isEqualTo("source-tool-id");
        assertThat(report.getEntries().getFirst().getTargetPluginId()).isEqualTo("target-tool-id");
        assertThat(report.getEntries().getFirst().getReason())
                .isEqualTo("unique compatible name matched");
        assertThat(report.getEntries().getFirst().getReasonCode())
                .isEqualTo("UNIQUE_COMPATIBLE_NAME_MATCHED");
        assertThat(report.getEntries().getFirst().getMappingType())
                .isEqualTo("COMPATIBLE_NAME");
    }

    @Test
    void sameToolIdPrefersExactSourceVersionOverLatestVersion() {
        ToolBox latest = tool("same-tool-id", "Versioned Plugin", "source-operation", "V3.0",
                schema("input-v3"));
        ToolBox exact = tool("same-tool-id", "Versioned Plugin", "source-operation", "V2.0",
                schema("input-v2"));
        when(toolBoxService.list(any(Wrapper.class))).thenReturn(List.of(latest, exact));

        BizWorkflowNode node = pluginNode(
                "plugin::version-exact", "same-tool-id", "source-operation", "V2.0");
        WorkflowImportReport report = new WorkflowImportReport();

        service.cleanNodesForImport(workflow(node), USER_ID, request, List.of(), report);

        assertThat(node.getData().getNodeParam())
                .containsEntry("pluginId", "same-tool-id")
                .containsEntry("operationId", "source-operation")
                .containsEntry("version", "V2.0");
        assertThat(node.getData().getInputs()).extracting(BizInputOutput::getName)
                .containsExactly("input-v2");
        assertThat(report.getResolved()).isEqualTo(1);
        assertThat(report.getEntries().getFirst().getTargetVersion()).isEqualTo("V2.0");
    }

    @Test
    void sameToolIdUsesNewestVisibleVersionWhenSourceVersionNoLongerExists() {
        ToolBox latest = tool("same-tool-id", "Versioned Plugin", "old-operation", "V3.0",
                schema("input-v3"));
        ToolBox older = tool("same-tool-id", "Versioned Plugin", "old-operation", "V2.0",
                schema("input-v2"));
        when(toolBoxService.list(any(Wrapper.class))).thenReturn(List.of(latest, older));

        BizWorkflowNode node = pluginNode(
                "plugin::version-fallback", "same-tool-id", "old-operation", "V1.0");
        WorkflowImportReport report = new WorkflowImportReport();

        service.cleanNodesForImport(workflow(node), USER_ID, request, List.of(), report);

        assertThat(node.getData().getNodeParam())
                .containsEntry("pluginId", "same-tool-id")
                .containsEntry("operationId", "old-operation")
                .containsEntry("version", "V3.0");
        assertThat(node.getData().getInputs()).extracting(BizInputOutput::getName)
                .containsExactly("input-v3");
        assertThat(report.getResolved()).isEqualTo(1);
        assertThat(report.getEntries().getFirst().getTargetVersion()).isEqualTo("V3.0");
    }

    @Test
    void sameToolIdWithNullTargetVersionDoesNotInventVersion() {
        ToolBox target = tool("legacy-id", "Legacy Plugin", "operation", null,
                schema("prompt"));
        when(toolBoxService.list(any(Wrapper.class))).thenReturn(List.of(target));
        BizWorkflowNode node = pluginNode(
                "plugin::legacy", "legacy-id", "operation", null);
        WorkflowImportReport report = new WorkflowImportReport();

        service.cleanNodesForImport(workflow(node), USER_ID, request, List.of(), report);

        assertThat(node.getData().getNodeParam())
                .containsEntry("pluginId", "legacy-id")
                .containsEntry("operationId", "operation")
                .doesNotContainKey("version");
        assertThat(report.getResolved()).isEqualTo(1);
        assertThat(report.getEntries().getFirst().getTargetVersion()).isNull();
    }

    @Test
    void sameToolIdWithoutIoRejectsOperationMismatch() {
        ToolBox target = tool("same-tool-id", "Changed Operation", "target-operation", "V2.0",
                schema("prompt"));
        when(toolBoxService.list(any(Wrapper.class))).thenReturn(List.of(target));
        BizWorkflowNode node = pluginNode(
                "plugin::operation-mismatch", "same-tool-id", "source-operation", "V1.0");
        WorkflowImportReport report = new WorkflowImportReport();

        service.cleanNodesForImport(workflow(node), USER_ID, request, List.of(), report);

        assertUnresolved(node, "INCOMPATIBLE");
        assertThat(report.getEntries().getFirst().getReasonCode())
                .isEqualTo("CONTRACT_INCOMPATIBLE");
    }

    @Test
    void sameNameMultipleVersionsMapWhenContractLeavesOneCompatibleCandidate() {
        String compatibleSchema = schema("stable-input");
        ToolBox incompatible = tool(
                "target-v3", "Portable Plugin", "operation-v3", "V3.0", schema("breaking-input"));
        ToolBox compatible = tool(
                "target-v2", "Portable Plugin", "operation-v2", "V2.0", compatibleSchema);
        when(toolBoxService.list(any(Wrapper.class)))
                .thenReturn(List.of())
                .thenReturn(List.of(incompatible, compatible));

        BizWorkflowNode node = pluginNode(
                "plugin::contract-filter", "source-id", "source-operation", "V1.0");
        WorkflowImportReport report = new WorkflowImportReport();

        service.cleanNodesForImport(workflow(node), USER_ID, request,
                List.of(manifest("plugin::contract-filter", "source-id", "Portable Plugin",
                        contractHash(compatibleSchema))),
                report);

        assertThat(node.getData().getNodeParam())
                .containsEntry("pluginId", "target-v2")
                .containsEntry("operationId", "operation-v2")
                .containsEntry("version", "V2.0");
        assertThat(report.getResolved()).isEqualTo(1);
        assertThat(report.getEntries().getFirst().getTargetPluginId()).isEqualTo("target-v2");
    }

    @Test
    void sameNameVersionsOfOneLogicalToolMapToNewestCompatibleVersion() {
        String compatibleSchema = schema("stable-input");
        ToolBox v3 = tool("target-id", "Portable Plugin", "operation-v3", "V3.0",
                compatibleSchema);
        ToolBox v2 = tool("target-id", "Portable Plugin", "operation-v2", "V2.0",
                compatibleSchema);
        when(toolBoxService.list(any(Wrapper.class)))
                .thenReturn(List.of())
                .thenReturn(List.of(v3, v2));

        BizWorkflowNode node = pluginNode(
                "plugin::logical-version", "source-id", "source-operation", "V1.0");
        WorkflowImportReport report = new WorkflowImportReport();

        service.cleanNodesForImport(workflow(node), USER_ID, request,
                List.of(manifest("plugin::logical-version", "source-id", "Portable Plugin",
                        contractHash(compatibleSchema))),
                report);

        assertThat(node.getData().getNodeParam())
                .containsEntry("pluginId", "target-id")
                .containsEntry("version", "V3.0");
        assertThat(report.getResolved()).isEqualTo(1);
        assertThat(report.getAmbiguous()).isZero();
    }

    @Test
    void blankSourceIdDoesNotReuseFirstManifestEntry() {
        BizWorkflowNode node = pluginNode("plugin::blank-id", "", "source-operation", "V1.0");
        WorkflowImportReport report = new WorkflowImportReport();

        service.cleanNodesForImport(workflow(node), USER_ID, request,
                List.of(manifest("plugin::blank-id", "different-source", "Wrong Plugin",
                        contractHash(schema("wrong")))),
                report);

        assertUnresolved(node, "MISSING");
        assertThat(report.getEntries().getFirst().getSourceName()).isNull();
        verify(toolBoxService, times(0)).list(any(Wrapper.class));
    }

    @Test
    void draftToolIsExcludedFromImportCandidates() {
        ToolBox draft = tool("source-id", "Draft Plugin", "draft-operation", "V1.0",
                schema("draft-input"));
        draft.setStatus(0);
        when(toolBoxService.list(any(Wrapper.class))).thenReturn(List.of(draft));
        BizWorkflowNode node = pluginNode("plugin::draft", "source-id", "source-operation", "V1.0");
        WorkflowImportReport report = new WorkflowImportReport();

        service.cleanNodesForImport(workflow(node), USER_ID, request, List.of(), report);

        assertUnresolved(node, "MISSING");
        assertThat(report.getResolved()).isZero();
    }

    @Test
    void groupSharedOnlyFormalToolIsExcludedFromImportCandidates() {
        ToolBox shared = tool("shared-id", "Shared Plugin", "shared-operation", "V1.0",
                schema("shared-input"));
        shared.setId(42L);
        shared.setIsPublic(false);
        shared.setVisibility(1);
        shared.setUserId("owner-user");
        when(toolBoxService.list(any(Wrapper.class))).thenReturn(List.of(shared));
        BizWorkflowNode node = pluginNode(
                "plugin::shared", "shared-id", "source-operation", "V1.0");
        WorkflowImportReport report = new WorkflowImportReport();

        service.cleanNodesForImport(workflow(node), USER_ID, request, List.of(), report);

        assertUnresolved(node, "MISSING");
        assertThat(report.getResolved()).isZero();
    }

    @Test
    void compatibleMappingPreservesExistingIoIdsValuesAndReferences() {
        ToolBox target = tool("same-id", "Stable Plugin", "target-operation", "V2.0",
                nestedSchemaWithAddedFields());
        when(toolBoxService.list(any(Wrapper.class))).thenReturn(List.of(target));
        BizWorkflowNode node = pluginNode("plugin::stable", "same-id", "source-operation", "V1.0");
        BizInputOutput input = inputOutput("input-id", "prompt");
        BizSchema inputSchema = new BizSchema();
        inputSchema.setType("string");
        BizValue inputValue = new BizValue();
        inputValue.setType("ref");
        inputValue.setContent(new JSONObject().fluentPut("nodeId", "upstream")
                .fluentPut("outputId", "upstream-output"));
        inputSchema.setValue(inputValue);
        inputSchema.setDft("user-default");
        input.setSchema(inputSchema);
        input.setDisabled(true);
        input.setDeleteDisabled(true);
        input.setCustomParameterType("custom-source");
        BizInputOutput options = inputOutput("options-id", "options");
        BizSchema optionsSchema = new BizSchema();
        optionsSchema.setType("object");
        BizProperty city = property("city-id", "city", "string");
        city.setDft("Shanghai");
        optionsSchema.setProperties(new ArrayList<>(List.of(city)));
        options.setSchema(optionsSchema);
        BizInputOutput output = inputOutput("output-id", "result");
        BizSchema outputSchema = new BizSchema();
        outputSchema.setType("string");
        output.setSchema(outputSchema);
        output.setRefId("downstream-input");
        output.setDeleteDisabled(true);
        node.getData().setInputs(new ArrayList<>(List.of(input, options)));
        node.getData().setOutputs(new ArrayList<>(List.of(output)));

        service.cleanNodesForImport(workflow(node), USER_ID, request, List.of(),
                new WorkflowImportReport());

        assertThat(node.getData().getInputs()).hasSize(3);
        assertThat(node.getData().getInputs().get(0)).satisfies(saved -> {
            assertThat(saved.getId()).isEqualTo("input-id");
            assertThat(saved.getSchema().getValue().getContent()).isEqualTo(inputValue.getContent());
            assertThat(saved.getSchema().getDft()).isEqualTo("user-default");
            assertThat(saved.getDisabled()).isEqualTo(true);
            assertThat(saved.getDeleteDisabled()).isEqualTo(true);
            assertThat(saved.getCustomParameterType()).isEqualTo("custom-source");
        });
        assertThat(node.getData().getInputs().get(1)).satisfies(saved -> {
            assertThat(saved.getId()).isEqualTo("options-id");
            assertThat(saved.getSchema().getProperties()).extracting(BizProperty::getName)
                    .containsExactly("city", "country");
            assertThat(saved.getSchema().getProperties().get(0).getId()).isEqualTo("city-id");
            assertThat(saved.getSchema().getProperties().get(0).getDft()).isEqualTo("Shanghai");
            assertThat(saved.getSchema().getProperties().get(1).getId()).isNotBlank();
        });
        assertThat(node.getData().getInputs().get(2).getName()).isEqualTo("language");
        assertThat(node.getData().getInputs().get(2).getId()).isNotBlank();
        assertThat(node.getData().getInputs()).allSatisfy(saved -> {
            assertThat(saved.getSchema().getValue()).isNotNull();
            assertThat(saved.getSchema().getValue().getType()).isEqualTo("ref");
            assertThat(saved.getSchema().getValue().getContent()).isNotNull();
        });
        assertThat(node.getData().getOutputs()).singleElement().satisfies(saved -> {
            assertThat(saved.getId()).isEqualTo("output-id");
            assertThat(saved.getRefId()).isEqualTo("downstream-input");
            assertThat(saved.getDeleteDisabled()).isEqualTo(true);
        });
    }

    @Test
    void exactIdWithoutManifestRejectsRemovedRenamedOrTypeChangedIoBeforeSwitchingVersion() {
        ToolBox target = tool("same-id", "Changed Plugin", "target-operation", "V2.0",
                schema("renamedPrompt"));
        when(toolBoxService.list(any(Wrapper.class))).thenReturn(List.of(target));
        BizWorkflowNode node = pluginNode("plugin::breaking", "same-id", "source-operation", "V1.0");
        BizInputOutput input = inputOutput("preserved-id", "prompt");
        BizSchema inputSchema = new BizSchema();
        inputSchema.setType("string");
        input.setSchema(inputSchema);
        node.getData().setInputs(new ArrayList<>(List.of(input)));
        WorkflowImportReport report = new WorkflowImportReport();

        service.cleanNodesForImport(workflow(node), USER_ID, request, List.of(), report);

        assertUnresolved(node, "INCOMPATIBLE");
        assertThat(report.getEntries().getFirst().getReasonCode())
                .isEqualTo("CONTRACT_INCOMPATIBLE");
        assertThat(report.getEntries().getFirst().getReason())
                .contains("input.prompt is missing from target contract");
    }

    @Test
    void exactIdWithoutManifestRejectsNestedTypeChange() {
        ToolBox target = tool("same-id", "Changed Plugin", "target-operation", "V2.0",
                nestedSchemaWithCityType("integer"));
        when(toolBoxService.list(any(Wrapper.class))).thenReturn(List.of(target));
        BizWorkflowNode node = pluginNode("plugin::nested-breaking", "same-id", "source-operation", "V1.0");
        BizInputOutput options = inputOutput("options-id", "options");
        BizSchema optionsSchema = new BizSchema();
        optionsSchema.setType("object");
        optionsSchema.setProperties(List.of(property("city-id", "city", "string")));
        options.setSchema(optionsSchema);
        node.getData().setInputs(new ArrayList<>(List.of(options)));
        WorkflowImportReport report = new WorkflowImportReport();

        service.cleanNodesForImport(workflow(node), USER_ID, request, List.of(), report);

        assertUnresolved(node, "INCOMPATIBLE");
        assertThat(report.getEntries().getFirst().getReason())
                .contains("input.options.city changed type from string to integer");
    }

    @Test
    void exactIdWithoutManifestValidatesArrayObjectChildPath() {
        ToolBox target = tool("same-id", "Array Plugin", "target-operation", "V2.0",
                arrayObjectSchema("integer"));
        when(toolBoxService.list(any(Wrapper.class))).thenReturn(List.of(target));
        BizWorkflowNode node = pluginNode("plugin::array-breaking", "same-id", "source-operation", "V1.0");
        BizInputOutput rows = inputOutput("rows-id", "rows");
        BizSchema rowsSchema = new BizSchema();
        rowsSchema.setType("array-object");
        rowsSchema.setProperties(List.of(property("city-id", "city", "string")));
        rows.setSchema(rowsSchema);
        node.getData().setInputs(new ArrayList<>(List.of(rows)));
        WorkflowImportReport report = new WorkflowImportReport();

        service.cleanNodesForImport(workflow(node), USER_ID, request, List.of(), report);

        assertUnresolved(node, "INCOMPATIBLE");
        assertThat(report.getEntries().getFirst().getReason())
                .contains("input.rows.city changed type from string to integer");
    }

    @Test
    void duplicateSourceFieldsAndInvalidTargetSchemaFailClosed() {
        ToolBox validTarget = tool("duplicate-id", "Duplicate Plugin", "target-operation", "V2.0",
                schema("prompt"));
        ToolBox invalidTarget = tool("invalid-id", "Invalid Plugin", "target-operation", "V2.0",
                "not-json");
        when(toolBoxService.list(any(Wrapper.class)))
                .thenReturn(List.of(validTarget, invalidTarget));
        BizWorkflowNode duplicate = pluginNode(
                "plugin::duplicate", "duplicate-id", "source-operation", "V1.0");
        BizInputOutput first = inputOutput("first-id", "prompt");
        BizSchema firstSchema = new BizSchema();
        firstSchema.setType("string");
        first.setSchema(firstSchema);
        BizInputOutput second = inputOutput("second-id", "prompt");
        BizSchema secondSchema = new BizSchema();
        secondSchema.setType("string");
        second.setSchema(secondSchema);
        duplicate.getData().setInputs(new ArrayList<>(List.of(first, second)));
        BizWorkflowNode invalid = pluginNode(
                "plugin::invalid", "invalid-id", "source-operation", "V1.0");
        WorkflowImportReport report = new WorkflowImportReport();

        service.cleanNodesForImport(workflow(duplicate, invalid), USER_ID, request, List.of(), report);

        assertUnresolved(duplicate, "INCOMPATIBLE");
        assertUnresolved(invalid, "INCOMPATIBLE");
        assertThat(report.getEntries().get(0).getReason())
                .contains("input.prompt is duplicated in source contract");
        assertThat(report.getEntries().get(1).getReason())
                .contains("target webSchema cannot be parsed");
    }

    @Test
    void legacyYamlDoesNotGuessPluginFromEditableNodeLabel() {
        when(toolBoxService.list(any(Wrapper.class))).thenReturn(List.of());
        BizWorkflowNode node = pluginNode(
                "plugin::legacy", "missing-source-id", "source-op", "V1.0");
        node.getData().setLabel("Existing Target Plugin");
        node.getData().setPluginName(null);
        WorkflowImportReport report = new WorkflowImportReport();

        service.cleanNodesForImport(workflow(node), USER_ID, request, List.of(), report);

        assertUnresolved(node, "MISSING");
        assertThat(report.getEntries().getFirst().getSourceName()).isNull();
        assertThat(report.getEntries().getFirst().getReason())
                .isEqualTo("tool is missing or not visible in target space");
        verify(toolBoxService, times(1)).list(any(Wrapper.class));
    }

    @Test
    void legacyYamlUsesPersistedPluginNameForUniqueCompatibleFallback() {
        ToolBox target = tool("target-id", "Portable Plugin", "target-operation", "V1.0",
                schema("prompt"));
        when(toolBoxService.list(any(Wrapper.class)))
                .thenReturn(List.of())
                .thenReturn(List.of(target));
        BizWorkflowNode node = pluginNode(
                "plugin::legacy-name", "source-id", "source-operation", "V1.0");
        node.getData().setPluginName("Portable Plugin");
        BizInputOutput input = inputOutput("prompt-id", "prompt");
        BizSchema inputSchema = new BizSchema();
        inputSchema.setType("string");
        input.setSchema(inputSchema);
        BizInputOutput output = inputOutput("result-id", "result");
        BizSchema outputSchema = new BizSchema();
        outputSchema.setType("string");
        output.setSchema(outputSchema);
        node.getData().setInputs(List.of(input));
        node.getData().setOutputs(List.of(output));
        WorkflowImportReport report = new WorkflowImportReport();

        service.cleanNodesForImport(workflow(node), USER_ID, request, List.of(), report);

        assertThat(node.getData().getNodeParam())
                .containsEntry("pluginId", "target-id")
                .containsEntry("operationId", "target-operation")
                .containsEntry("version", "V1.0");
        assertThat(report.getResolved()).isEqualTo(1);
        verify(toolBoxService, times(2)).list(any(Wrapper.class));
    }

    @Test
    void cleanAgentNodeMapsManifestToolInRuntimeAndDisplayLists() {
        String webSchema = schema("question");
        ToolBox target = tool("target-agent-tool", "Search Plugin", "target-search-op", "V4.0",
                webSchema);
        when(toolBoxService.list(any(Wrapper.class)))
                .thenReturn(List.of())
                .thenReturn(List.of(target));

        JSONObject runtimeTool = new JSONObject()
                .fluentPut("tool_id", "source-agent-tool")
                .fluentPut("version", "V1.0");
        JSONObject displayTool = new JSONObject()
                .fluentPut("type", "tool")
                .fluentPut("toolId", "source-agent-tool")
                .fluentPut("pluginName", "Search Plugin")
                .fluentPut("name", "old display name");
        JSONObject plugin = new JSONObject()
                .fluentPut("tools", new JSONArray(List.of(runtimeTool)))
                .fluentPut("toolsList", new JSONArray(List.of(displayTool)));
        BizWorkflowNode agent = node("agent::main", new JSONObject().fluentPut("plugin", plugin));
        WorkflowImportReport report = new WorkflowImportReport();

        service.cleanNodesForImport(workflow(agent), USER_ID, request,
                List.of(manifest("agent::main", "source-agent-tool", "Search Plugin",
                        contractHash(webSchema))),
                report);

        JSONObject cleanedPlugin = agent.getData().getNodeParam().getJSONObject("plugin");
        assertThat(cleanedPlugin.getJSONArray("tools").getJSONObject(0))
                .containsEntry("tool_id", "target-agent-tool")
                .containsEntry("version", "V4.0");
        assertThat(cleanedPlugin.getJSONArray("toolsList").getJSONObject(0))
                .containsEntry("toolId", "target-agent-tool")
                .containsEntry("name", "Search Plugin")
                .containsEntry("version", "V4.0")
                .containsEntry("description", "Search Plugin description")
                .containsEntry("isLatest", true);
        assertThat(report.getTotal()).isEqualTo(1);
        assertThat(report.getResolved()).isEqualTo(1);
        assertThat(report.getEntries().getFirst().getNodeType()).isEqualTo("agent");
        assertThat(report.getEntries().getFirst().getTargetOperationId())
                .isEqualTo("target-search-op");
    }

    @Test
    void importBatchesPluginAgentAndDatabaseDependencyQueries() {
        ToolBox pluginById = tool("plugin-id", "Direct Plugin", "direct-operation", "V1.0",
                schema("prompt"));
        ToolBox pluginByName = tool("target-by-name", "Portable Plugin", "portable-operation", "V2.0",
                schema("prompt"));
        ToolBox agentById = tool("agent-tool-id", "Agent Direct", "agent-operation", "V1.0",
                schema("question"));
        ToolBox agentByName = tool("target-agent-name", "Agent Portable", "agent-portable-operation", "V3.0",
                schema("question"));
        when(toolBoxService.list(any(Wrapper.class)))
                .thenReturn(List.of(pluginById, agentById))
                .thenReturn(List.of(pluginByName, agentByName));
        DbInfo firstDatabase = new DbInfo();
        firstDatabase.setDbId(101L);
        DbInfo secondDatabase = new DbInfo();
        secondDatabase.setDbId(202L);
        when(dbInfoMapper.selectList(any(Wrapper.class)))
                .thenReturn(List.of(firstDatabase, secondDatabase));

        BizWorkflowNode directPlugin = pluginNode(
                "plugin::direct", "plugin-id", "direct-operation", "V1.0");
        BizWorkflowNode portablePlugin = pluginNode(
                "plugin::portable", "missing-plugin-id", "source-operation", "V1.0");
        JSONObject directRuntime = new JSONObject()
                .fluentPut("tool_id", "agent-tool-id")
                .fluentPut("version", "V1.0");
        JSONObject directDisplay = new JSONObject()
                .fluentPut("type", "tool")
                .fluentPut("toolId", "agent-tool-id")
                .fluentPut("pluginName", "Agent Direct")
                .fluentPut("operationId", "agent-operation");
        JSONObject portableRuntime = new JSONObject()
                .fluentPut("tool_id", "missing-agent-id")
                .fluentPut("version", "V1.0");
        JSONObject portableDisplay = new JSONObject()
                .fluentPut("type", "tool")
                .fluentPut("toolId", "missing-agent-id")
                .fluentPut("pluginName", "Agent Portable")
                .fluentPut("operationId", "source-operation");
        BizWorkflowNode agent = node("agent::batched", new JSONObject().fluentPut("plugin",
                new JSONObject()
                        .fluentPut("tools", new JSONArray(List.of(directRuntime, portableRuntime)))
                        .fluentPut("toolsList", new JSONArray(List.of(directDisplay, portableDisplay)))));
        BizWorkflowNode firstDb = node("database::first", new JSONObject().fluentPut("dbId", "101"));
        BizWorkflowNode secondDb = node("database::second", new JSONObject().fluentPut("dbId", "202"));
        List<Map<String, Object>> manifest = List.of(
                manifest("plugin::portable", "missing-plugin-id", "Portable Plugin",
                        contractHash(schema("prompt"))),
                manifest("agent::batched", "missing-agent-id", "Agent Portable",
                        contractHash(schema("question"))));

        service.cleanNodesForImport(
                workflow(directPlugin, portablePlugin, agent, firstDb, secondDb),
                USER_ID, request, manifest, new WorkflowImportReport());

        assertThat(portablePlugin.getData().getNodeParam())
                .containsEntry("pluginId", "target-by-name");
        assertThat(agent.getData()
                .getNodeParam()
                .getJSONObject("plugin")
                .getJSONArray("tools")).extracting(raw -> ((JSONObject) raw).getString("tool_id"))
                .containsExactly("agent-tool-id", "target-agent-name");
        verify(toolBoxService, times(2)).list(any(Wrapper.class));
        verify(dbInfoMapper, times(1)).selectList(any(Wrapper.class));
    }

    @Test
    void outOfRangeDatabaseIdIsUnresolvedWithoutQueryFailure() {
        BizWorkflowNode database = node("database::overflow", new JSONObject()
                .fluentPut("dbId", "999999999999999999999999999999"));
        WorkflowImportReport report = new WorkflowImportReport();

        service.cleanNodesForImport(workflow(database), USER_ID, request, List.of(), report);

        assertThat(database.getData().getNodeMeta())
                .containsEntry("importDependencyStatus", "MISSING");
        assertThat(report.getUnresolved()).isEqualTo(1);
        verifyNoInteractions(dbInfoMapper);
    }

    @Test
    void personalImportDatabaseQueryExcludesDatabasesOwnedInOtherSpaces() {
        DbInfo personalDatabase = new DbInfo();
        personalDatabase.setDbId(303L);
        when(dbInfoMapper.selectList(any(Wrapper.class))).thenReturn(List.of(personalDatabase));
        BizWorkflowNode database = node("database::personal", new JSONObject()
                .fluentPut("dbId", "303"));

        service.cleanNodesForImport(workflow(database), USER_ID, request,
                List.of(), new WorkflowImportReport());

        verify(dbInfoMapper).selectList(argThat(wrapper -> {
            String sqlSegment = wrapper.getExpression().getNormal().getSqlSegment();
            return sqlSegment.contains("uid") && sqlSegment.contains("space_id IS NULL");
        }));
    }

    @Test
    void unresolvedAgentToolIsDisabledAtRuntimeButRetainedForRepair() {
        ToolBox candidateA = tool("candidate-a", "Shared Agent Tool", "op-a", "V1.0",
                schema("question"));
        ToolBox candidateB = tool("candidate-b", "Shared Agent Tool", "op-b", "V1.0",
                schema("question"));
        when(toolBoxService.list(any(Wrapper.class)))
                .thenReturn(List.of())
                .thenReturn(List.of(candidateA, candidateB));
        JSONObject runtimeTool = new JSONObject()
                .fluentPut("tool_id", "source-agent-tool")
                .fluentPut("version", "V1.0");
        JSONObject displayTool = new JSONObject()
                .fluentPut("type", "tool")
                .fluentPut("toolId", "source-agent-tool")
                .fluentPut("pluginName", "Shared Agent Tool")
                .fluentPut("name", "Shared Agent Tool")
                .fluentPut("operationId", "source-operation");
        JSONObject plugin = new JSONObject()
                .fluentPut("tools", new JSONArray(List.of(runtimeTool)))
                .fluentPut("toolsList", new JSONArray(List.of(displayTool)));
        BizWorkflowNode agent = node("agent::ambiguous", new JSONObject().fluentPut("plugin", plugin));
        WorkflowImportReport report = new WorkflowImportReport();

        service.cleanNodesForImport(workflow(agent), USER_ID, request,
                List.of(manifest("agent::ambiguous", "source-agent-tool", "Shared Agent Tool",
                        contractHash(schema("question")))),
                report);

        JSONObject cleanedPlugin = agent.getData().getNodeParam().getJSONObject("plugin");
        assertThat(cleanedPlugin.getJSONArray("tools")).isEmpty();
        assertThat(cleanedPlugin.getJSONArray("toolsList")).singleElement().satisfies(raw -> {
            JSONObject retained = (JSONObject) raw;
            assertThat(retained)
                    .containsEntry("toolId", "source-agent-tool")
                    .containsEntry("sourcePluginId", "source-agent-tool")
                    .containsEntry("importDependencyStatus", "AMBIGUOUS")
                    .containsEntry("isLatest", false);
            assertThat(retained.getJSONArray("candidatePluginIds"))
                    .containsExactly("candidate-a", "candidate-b");
        });
        assertThat(agent.getData().getNodeMeta().getJSONArray("importDependencies"))
                .singleElement();
        assertThat(report.getEntries().getFirst().getCandidatePluginIds())
                .containsExactly("candidate-a", "candidate-b");
    }

    @Test
    void agentEditableDisplayNameCannotTriggerLegacyCrossIdMapping() {
        ToolBox target = tool("target-agent-tool", "Editable Name", "target-operation", "V1.0",
                schema("question"));
        when(toolBoxService.list(any(Wrapper.class))).thenReturn(List.of());
        JSONObject runtimeTool = new JSONObject().fluentPut("tool_id", "source-agent-tool");
        JSONObject displayTool = new JSONObject()
                .fluentPut("type", "tool")
                .fluentPut("toolId", "source-agent-tool")
                .fluentPut("name", "Editable Name");
        JSONObject plugin = new JSONObject()
                .fluentPut("tools", new JSONArray(List.of(runtimeTool)))
                .fluentPut("toolsList", new JSONArray(List.of(displayTool)));
        BizWorkflowNode agent = node("agent::legacy", new JSONObject().fluentPut("plugin", plugin));

        service.cleanNodesForImport(workflow(agent), USER_ID, request, List.of(),
                new WorkflowImportReport());

        assertThat(plugin.getJSONArray("tools")).isEmpty();
        verify(toolBoxService, times(1)).list(any(Wrapper.class));
    }

    @Test
    void repositoryBindingsUseAuthoritativeIdsOwnerAndTypeOneShare() {
        Repo owned = repository(1001L, "core-owned", "outer-owned", USER_ID, null, 0);
        Repo shared = repository(1002L, "core-shared", "outer-shared", "other-user", null, 1);
        when(repoMapper.selectList(any(Wrapper.class))).thenReturn(List.of(owned, shared));
        GroupVisibility share = new GroupVisibility();
        share.setRelationId("1002");
        when(groupVisibilityMapper.getRepoVisibilityList(USER_ID, null)).thenReturn(List.of(share));
        JSONObject first = new JSONObject()
                .fluentPut("coreRepoId", "core-owned")
                .fluentPut("userId", "forged-user");
        JSONObject second = new JSONObject()
                .fluentPut("outerRepoId", "outer-shared")
                .fluentPut("userId", USER_ID);
        BizWorkflowNode knowledge = node("knowledge-base::authoritative", new JSONObject()
                .fluentPut("repoId", new JSONArray(List.of("core-owned", "outer-shared")))
                .fluentPut("repoList", new JSONArray(List.of(first, second))));

        service.cleanNodesForImport(workflow(knowledge), USER_ID, request, List.of(),
                new WorkflowImportReport());

        assertThat(knowledge.getData().getNodeParam().getJSONArray("repoList")).hasSize(2);
        verify(repoMapper, times(1)).selectList(any(Wrapper.class));
        verify(groupVisibilityMapper, times(1)).getRepoVisibilityList(USER_ID, null);
    }

    @Test
    void invisibleExpertKnowledgeRepoIsClearedAndReportedAsUnresolved() {
        Repo foreign = repository(
                1101L, "foreign-expert-repo", null, "other-user", null, 0);
        when(repoMapper.selectList(any(Wrapper.class))).thenReturn(List.of(foreign));
        JSONObject param = new JSONObject().fluentPut("repos", new JSONArray(List.of(
                new JSONObject()
                        .fluentPut("repoId", "foreign-expert-repo")
                        .fluentPut("docIds", new JSONArray(List.of("document-1"))))));
        BizWorkflowNode expert = node("knowledge-expert-base::invisible", param);
        WorkflowImportReport report = new WorkflowImportReport();

        service.cleanNodesForImport(workflow(expert), USER_ID, request, List.of(), report);

        assertThat(param.getJSONArray("repos")).isEmpty();
        assertThat(param.getJSONArray("repoList")).isEmpty();
        assertThat(param.getJSONArray("repoId")).isEmpty();
        assertThat(param.getJSONArray("repoIds")).isEmpty();
        assertThat(expert.getData().getNodeMeta())
                .containsEntry("importDependencyStatus", "MISSING")
                .containsKey("importDependencies");
        assertThat(expert.getData().getNodeMeta().getJSONArray("importDependencies"))
                .singleElement()
                .satisfies(rawIssue -> assertThat((JSONObject) rawIssue)
                        .containsEntry("dependencyType", "knowledge")
                        .containsEntry("status", "MISSING")
                        .containsEntry("sourcePluginId", "foreign-expert-repo"));
        assertThat(report.getTotal()).isEqualTo(1);
        assertThat(report.getUnresolved()).isEqualTo(1);
        assertThat(report.getEntries()).singleElement().satisfies(entry -> {
            assertThat(entry.getNodeId()).isEqualTo("knowledge-expert-base::invisible");
            assertThat(entry.getNodeType()).isEqualTo("knowledge-expert-base");
            assertThat(entry.getDependencyType()).isEqualTo("knowledge");
            assertThat(entry.getStatus()).isEqualTo("MISSING");
            assertThat(entry.getReasonCode()).isEqualTo("KNOWLEDGE_MISSING");
            assertThat(entry.getSourcePluginId()).isEqualTo("foreign-expert-repo");
        });
    }

    @Test
    void visibleExpertKnowledgeRepoIsRetainedWithoutUnresolvedReport() {
        Repo owned = repository(
                1102L, "owned-expert-repo", null, USER_ID, null, 0);
        when(repoMapper.selectList(any(Wrapper.class))).thenReturn(List.of(owned));
        JSONObject binding = new JSONObject()
                .fluentPut("repoId", "owned-expert-repo")
                .fluentPut("docIds", new JSONArray(List.of("document-1")));
        JSONObject param = new JSONObject().fluentPut(
                "repos", new JSONArray(List.of(binding)));
        BizWorkflowNode expert = node("knowledge-expert-base::visible", param);
        WorkflowImportReport report = new WorkflowImportReport();

        service.cleanNodesForImport(workflow(expert), USER_ID, request, List.of(), report);

        assertThat(param.getJSONArray("repos")).containsExactly(binding);
        assertThat(expert.getData().getNodeMeta()).isNull();
        assertThat(report.getTotal()).isZero();
        assertThat(report.getEntries()).isEmpty();
    }

    @Test
    void knowledgeReposTakePrecedenceOverLegacyRepoIdDuringImportValidation() {
        Repo owned = repository(1103L, "active-repo", null, USER_ID, null, 0);
        when(repoMapper.selectList(any(Wrapper.class))).thenReturn(List.of(owned));
        JSONObject binding = new JSONObject().fluentPut("repoId", "active-repo");
        JSONObject param = new JSONObject()
                .fluentPut("repos", new JSONArray(List.of(binding)))
                .fluentPut("repoId", new JSONArray(List.of("ignored-legacy-repo")));
        BizWorkflowNode knowledge = node("knowledge-base::new-format", param);
        WorkflowImportReport report = new WorkflowImportReport();

        service.cleanNodesForImport(workflow(knowledge), USER_ID, request, List.of(), report);

        assertThat(param.getJSONArray("repos")).containsExactly(binding);
        assertThat(param.getJSONArray("repoId")).containsExactly("ignored-legacy-repo");
        assertThat(knowledge.getData().getNodeMeta()).isNull();
        assertThat(report.getTotal()).isZero();
    }

    @Test
    void personalRemoteRepositoryWithoutLocalRowRemainsVisible() {
        when(repoMapper.selectList(any(Wrapper.class))).thenReturn(List.of());
        when(repoService.getStarFireData(request)).thenReturn(new JSONArray(List.of(
                new JSONObject()
                        .fluentPut("id", 2001L)
                        .fluentPut("uid", USER_ID)
                        .fluentPut("name", "Remote repository"))));
        BizWorkflowNode knowledge = node("knowledge-base::remote", new JSONObject()
                .fluentPut("repoId", new JSONArray(List.of("2001"))));

        service.cleanNodesForImport(workflow(knowledge), USER_ID, request, List.of(),
                new WorkflowImportReport());

        assertThat(knowledge.getData().getNodeParam().getJSONArray("repoId"))
                .containsExactly("2001");
    }

    @Test
    void successfulImportKeepsCoreProtocol() {
        when(workflowService.callProtocolAdd(any(WorkflowReq.class)))
                .thenReturn(ApiResult.success("core-flow-success"));
        when(workflowService.save(any(Workflow.class))).thenReturn(true);
        when(botUtil.syncToSparkDatabase(any(Workflow.class), eq(USER_ID), eq(null)))
                .thenReturn(42);
        when(workflowService.updateById(any(Workflow.class))).thenReturn(true);

        ApiResult<?> result = service.importWorkflowFromYaml(importableYaml(), request);

        assertThat(result.code()).isZero();
        verify(workflowService, never()).deleteProtocol(any(), any());
    }

    @Test
    void failedCoreProtocolCreationDoesNotAttemptCompensation() {
        ApiResult<String> addFailure = new ApiResult<>(501, "core unavailable", null,
                System.currentTimeMillis());
        when(workflowService.callProtocolAdd(any(WorkflowReq.class))).thenReturn(addFailure);

        ApiResult<?> result = service.importWorkflowFromYaml(importableYaml(), request);

        assertThat(result).isSameAs(addFailure);
        verify(workflowService, never()).save(any(Workflow.class));
        verify(workflowService, never()).deleteProtocol(any(), any());
    }

    @Test
    void failedLocalWorkflowSaveCompensatesCoreProtocolOnce() {
        when(workflowService.callProtocolAdd(any(WorkflowReq.class)))
                .thenReturn(ApiResult.success("core-flow-save-failure"));
        when(workflowService.save(any(Workflow.class)))
                .thenThrow(new IllegalStateException("workflow insert failed"));

        assertThatThrownBy(() -> service.importWorkflowFromYaml(importableYaml(), request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("workflow insert failed");
        verify(workflowService).deleteProtocol(APP_ID, "core-flow-save-failure");
    }

    @Test
    void failedBotSyncCompensatesCoreProtocolOnce() {
        when(workflowService.callProtocolAdd(any(WorkflowReq.class)))
                .thenReturn(ApiResult.success("core-flow-bot-failure"));
        when(workflowService.save(any(Workflow.class))).thenReturn(true);
        when(botUtil.syncToSparkDatabase(any(Workflow.class), eq(USER_ID), eq(null)))
                .thenThrow(new IllegalStateException("bot sync failed"));

        assertThatThrownBy(() -> service.importWorkflowFromYaml(importableYaml(), request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("bot sync failed");
        verify(workflowService).deleteProtocol(APP_ID, "core-flow-bot-failure");
    }

    @Test
    void failedWorkflowExtUpdateCompensatesCoreProtocolOnce() {
        when(workflowService.callProtocolAdd(any(WorkflowReq.class)))
                .thenReturn(ApiResult.success("core-flow-ext-failure"));
        when(workflowService.save(any(Workflow.class))).thenReturn(true);
        when(botUtil.syncToSparkDatabase(any(Workflow.class), eq(USER_ID), eq(null)))
                .thenReturn(42);
        when(workflowService.updateById(any(Workflow.class)))
                .thenThrow(new IllegalStateException("workflow ext update failed"));

        assertThatThrownBy(() -> service.importWorkflowFromYaml(importableYaml(), request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("workflow ext update failed");
        verify(workflowService).deleteProtocol(APP_ID, "core-flow-ext-failure");
    }

    @Test
    void failedCompensationDoesNotReplaceOriginalImportFailure() {
        IllegalStateException importFailure = new IllegalStateException("local write failed");
        IllegalStateException compensationFailure =
                new IllegalStateException("core delete failed");
        when(workflowService.callProtocolAdd(any(WorkflowReq.class)))
                .thenReturn(ApiResult.success("core-flow-compensation-failure"));
        when(workflowService.save(any(Workflow.class))).thenThrow(importFailure);
        doThrow(compensationFailure).when(workflowService)
                .deleteProtocol(APP_ID, "core-flow-compensation-failure");

        assertThatThrownBy(() -> service.importWorkflowFromYaml(importableYaml(), request))
                .isSameAs(importFailure)
                .satisfies(error -> assertThat(error.getSuppressed())
                        .containsExactly(compensationFailure));
        verify(workflowService).deleteProtocol(APP_ID, "core-flow-compensation-failure");
    }

    @Test
    void agentStablePluginNameAndOperationCanUseCompatibleLegacyFallback() {
        ToolBox target = tool("target-agent", "Stable Plugin", "stable-operation", "V1.0",
                schema("question"));
        when(toolBoxService.list(any(Wrapper.class)))
                .thenReturn(List.of())
                .thenReturn(List.of(target));
        JSONObject runtimeTool = new JSONObject().fluentPut("tool_id", "source-agent");
        JSONObject displayTool = new JSONObject()
                .fluentPut("type", "tool")
                .fluentPut("toolId", "source-agent")
                .fluentPut("pluginName", "Stable Plugin")
                .fluentPut("operationId", "stable-operation");
        JSONObject plugin = new JSONObject()
                .fluentPut("tools", new JSONArray(List.of(runtimeTool)))
                .fluentPut("toolsList", new JSONArray(List.of(displayTool)));
        BizWorkflowNode agent = node("agent::stable-legacy",
                new JSONObject().fluentPut("plugin", plugin));

        service.cleanNodesForImport(workflow(agent), USER_ID, request, List.of(),
                new WorkflowImportReport());

        assertThat(plugin.getJSONArray("tools").getJSONObject(0))
                .containsEntry("tool_id", "target-agent");
    }

    @Test
    void malformedRepositoryListFailsClosedAndRepositoryQueryFailureIsExplicit() {
        BizWorkflowNode malformed = node("knowledge-base::malformed", new JSONObject()
                .fluentPut("repos", new JSONArray(List.of(new JSONObject()))));
        WorkflowImportReport report = new WorkflowImportReport();

        service.cleanNodesForImport(workflow(malformed), USER_ID, request, List.of(), report);

        assertThat(malformed.getData().getNodeParam().getJSONArray("repos")).isEmpty();
        assertThat(report.getUnresolved()).isEqualTo(1);

        BizWorkflowNode bound = node("knowledge-base::failure", new JSONObject()
                .fluentPut("repoId", new JSONArray(List.of("core-repo"))));
        when(repoMapper.selectList(any(Wrapper.class))).thenThrow(new IllegalStateException("db down"));
        assertThatThrownBy(() -> service.cleanNodesForImport(
                workflow(bound), USER_ID, request, List.of(), new WorkflowImportReport()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("responseEnum", ResponseEnum.WORKFLOW_IMPORT_FAILED);
    }

    @Test
    @SuppressWarnings("unchecked")
    void exportAddsPortableManifestAndRemovesOnlyRuntimeCredentials() {
        String webSchema = schema("prompt");
        ToolBox sourceTool = tool("source-tool", "Image Plugin", "source-image-op", "V1.2",
                webSchema);
        sourceTool.setAuthInfo("database-tool-auth-secret");
        sourceTool.setEndPoint("https://private-tool-host.example/invoke");
        when(toolBoxService.list(any(Wrapper.class))).thenReturn(List.of(sourceTool));

        JSONObject nested = new JSONObject()
                .fluentPut("token", "business-token-value")
                .fluentPut("password", "business-password-value")
                .fluentPut("safe", "retained");
        JSONObject param = new JSONObject()
                .fluentPut("pluginId", "source-tool")
                .fluentPut("operationId", "source-image-op")
                .fluentPut("version", "V1.2")
                .fluentPut("apiKey", "top-level-api-key")
                .fluentPut("apiSecret", "top-level-api-secret")
                .fluentPut("authInfo", "top-level-auth-info")
                .fluentPut("nested", nested);
        JSONObject rpaParam = new JSONObject()
                .fluentPut("projectId", "project-1")
                .fluentPut("header", new JSONArray(List.of(
                        new JSONObject().fluentPut("key", "Authorization")
                                .fluentPut("value", "rpa-header-secret"))));
        JSONObject skill = new JSONObject()
                .fluentPut("id", "portable-skill")
                .fluentPut("description", "retained skill metadata")
                .fluentPut("sandbox", new JSONObject()
                        .fluentPut("apiKey", "skill-sandbox-api-key")
                        .fluentPut("artifactUploadToken", "skill-artifact-token"));
        JSONObject agentParam = new JSONObject().fluentPut("plugin", new JSONObject()
                .fluentPut("skills", new JSONArray(List.of(skill))));

        Workflow workflow = new Workflow();
        workflow.setName("portable workflow");
        workflow.setDescription("export test");
        workflow.setData(JSON.toJSONString(workflow(
                node("plugin::export", param), node("rpa::export", rpaParam),
                node("agent::export", agentParam))));

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        service.exportWorkflowDataAsYaml(workflow, output);

        String yamlText = output.toString(StandardCharsets.UTF_8);
        LoaderOptions loaderOptions = new LoaderOptions();
        Map<String, Object> root = new Yaml(new SafeConstructor(loaderOptions)).load(yamlText);

        List<Map<String, Object>> dependencies =
                (List<Map<String, Object>>) root.get("dependencyManifest");
        assertThat(dependencies).singleElement().satisfies(dependency -> {
            assertThat(dependency)
                    .containsEntry("type", "plugin")
                    .containsEntry("nodeId", "plugin::export")
                    .containsEntry("sourceId", "source-tool")
                    .containsEntry("name", "Image Plugin")
                    .containsEntry("operationId", "source-image-op")
                    .containsEntry("version", "V1.2")
                    .containsKeys("contractHash", "stableKey")
                    .doesNotContainKeys("authInfo", "endPoint", "webSchema");
        });

        Map<String, Object> flowData = (Map<String, Object>) root.get("flowData");
        Map<String, Object> exportedNode = ((List<Map<String, Object>>) flowData.get("nodes")).getFirst();
        Map<String, Object> exportedData = (Map<String, Object>) exportedNode.get("data");
        Map<String, Object> exportedParam = (Map<String, Object>) exportedData.get("nodeParam");
        assertThat(exportedParam)
                .doesNotContainKeys("apiKey", "apiSecret", "authInfo")
                .containsEntry("pluginId", "source-tool");
        assertThat((Map<String, Object>) exportedParam.get("nested"))
                .containsEntry("token", "business-token-value")
                .containsEntry("password", "business-password-value")
                .containsEntry("safe", "retained");
        Map<String, Object> exportedRpaNode =
                ((List<Map<String, Object>>) flowData.get("nodes")).get(1);
        Map<String, Object> exportedRpaData = (Map<String, Object>) exportedRpaNode.get("data");
        Map<String, Object> exportedRpaParam =
                (Map<String, Object>) exportedRpaData.get("nodeParam");
        assertThat(exportedRpaParam)
                .doesNotContainKey("header")
                .containsEntry("projectId", "project-1");
        Map<String, Object> exportedAgentNode =
                ((List<Map<String, Object>>) flowData.get("nodes")).get(2);
        Map<String, Object> exportedAgentData = (Map<String, Object>) exportedAgentNode.get("data");
        Map<String, Object> exportedAgentParam =
                (Map<String, Object>) exportedAgentData.get("nodeParam");
        Map<String, Object> exportedAgentPlugin =
                (Map<String, Object>) exportedAgentParam.get("plugin");
        Map<String, Object> exportedSkill =
                ((List<Map<String, Object>>) exportedAgentPlugin.get("skills")).getFirst();
        assertThat(exportedSkill)
                .doesNotContainKey("sandbox")
                .containsEntry("id", "portable-skill")
                .containsEntry("description", "retained skill metadata");

        assertThat(yamlText)
                .doesNotContain("top-level-api-key")
                .doesNotContain("top-level-api-secret")
                .doesNotContain("top-level-auth-info")
                .doesNotContain("rpa-header-secret")
                .doesNotContain("skill-sandbox-api-key")
                .doesNotContain("skill-artifact-token")
                .doesNotContain("database-tool-auth-secret")
                .doesNotContain("https://private-tool-host.example/invoke")
                .contains("business-token-value")
                .contains("business-password-value");
        verify(dataPermissionCheckTool).checkWorkflowVisible(workflow, null);
    }

    @Test
    @SuppressWarnings("unchecked")
    void exportManifestUsesTheExactSourceVersionContract() {
        ToolBox v3 = tool("source-tool", "Versioned Plugin", "operation-v3", "V3.0",
                schema("input-v3"));
        ToolBox v1 = tool("source-tool", "Versioned Plugin", "operation-v1", "V1.0",
                schema("input-v1"));
        when(toolBoxService.list(any(Wrapper.class))).thenReturn(List.of(v3, v1));
        Workflow workflow = new Workflow();
        workflow.setName("versioned workflow");
        workflow.setData(JSON.toJSONString(workflow(pluginNode(
                "plugin::versioned-export", "source-tool", "operation-v1", "V1.0"))));

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        service.exportWorkflowDataAsYaml(workflow, output);

        Map<String, Object> root = new Yaml(new SafeConstructor(new LoaderOptions()))
                .load(output.toString(StandardCharsets.UTF_8));
        Map<String, Object> dependency =
                ((List<Map<String, Object>>) root.get("dependencyManifest")).getFirst();
        assertThat(dependency)
                .containsEntry("version", "V1.0")
                .containsEntry("contractHash", contractHash(v1.getWebSchema()))
                .doesNotContainEntry("contractHash", contractHash(v3.getWebSchema()));
    }

    @Test
    @SuppressWarnings("unchecked")
    void exportBatchesManifestLookupAndRetainsEachNodeReference() {
        ToolBox shared = tool("shared-tool", "Shared Plugin", "shared-operation", "V1.0",
                schema("shared-input"));
        ToolBox distinct = tool("distinct-tool", "Distinct Plugin", "distinct-operation", "V2.0",
                schema("distinct-input"));
        when(toolBoxService.list(any(Wrapper.class))).thenReturn(List.of(shared, distinct));

        Workflow workflow = new Workflow();
        workflow.setName("batched manifest workflow");
        workflow.setData(JSON.toJSONString(workflow(
                pluginNode("plugin::shared-first", "shared-tool", "shared-operation", "V1.0"),
                pluginNode("plugin::shared-second", "shared-tool", "shared-operation", "V1.0"),
                pluginNode("plugin::distinct", "distinct-tool", "distinct-operation", "V2.0"))));

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        service.exportWorkflowDataAsYaml(workflow, output);

        Map<String, Object> root = new Yaml(new SafeConstructor(new LoaderOptions()))
                .load(output.toString(StandardCharsets.UTF_8));
        List<Map<String, Object>> dependencies =
                (List<Map<String, Object>>) root.get("dependencyManifest");
        assertThat(dependencies)
                .extracting(item -> item.get("nodeId"))
                .containsExactly("plugin::shared-first", "plugin::shared-second",
                        "plugin::distinct");
        assertThat(dependencies)
                .filteredOn(item -> "shared-tool".equals(item.get("sourceId")))
                .hasSize(2)
                .allSatisfy(item -> assertThat(item)
                        .containsEntry("name", "Shared Plugin")
                        .containsEntry("contractHash", contractHash(shared.getWebSchema())));
        verify(toolBoxService, times(1)).list(any(Wrapper.class));
    }

    @Test
    @SuppressWarnings("unchecked")
    void exportDoesNotEnrichManifestFromAnInvisiblePrivateTool() {
        ToolBox privateTool = tool("private-tool", "Private Secret Name", "private-operation",
                "V1.0", schema("private-contract-field"));
        privateTool.setUserId("other-user");
        privateTool.setIsPublic(false);
        when(toolBoxService.list(any(Wrapper.class))).thenReturn(List.of(privateTool));
        Workflow workflow = new Workflow();
        workflow.setName("portable workflow");
        workflow.setData(JSON.toJSONString(workflow(pluginNode(
                "plugin::private-export", "private-tool", "node-operation", "V9.0"))));

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        service.exportWorkflowDataAsYaml(workflow, output);

        String yamlText = output.toString(StandardCharsets.UTF_8);
        Map<String, Object> root = new Yaml(new SafeConstructor(new LoaderOptions()))
                .load(yamlText);
        Map<String, Object> dependency =
                ((List<Map<String, Object>>) root.get("dependencyManifest")).getFirst();
        assertThat(dependency)
                .containsEntry("sourceId", "private-tool")
                .containsEntry("operationId", "node-operation")
                .containsEntry("version", "V9.0")
                .doesNotContainKeys("name", "contractHash", "stableKey");
        assertThat(yamlText)
                .doesNotContain("Private Secret Name")
                .doesNotContain("private-contract-field");
    }

    @Test
    void importRejectsDuplicateYamlKeysBeforeCallingWorkflowService() {
        assertYamlRejected("""
                flowMeta:
                  name: first
                  name: second
                flowData:
                  nodes: []
                  edges: []
                """);
    }

    @Test
    void importRejectsMalformedDuplicateAndOversizedManifestBeforeCallingWorkflowService() {
        assertYamlRejected("""
                flowMeta: {}
                dependencyManifest: invalid
                flowData: {nodes: [], edges: []}
                """);
        assertYamlRejected("""
                flowMeta: {}
                dependencyManifest: [invalid]
                flowData: {nodes: [], edges: []}
                """);
        assertYamlRejected("""
                flowMeta: {}
                dependencyManifest:
                  - type: plugin
                    nodeId: plugin::one
                    sourceId: source-tool
                    contractHash: 123
                flowData: {nodes: [], edges: []}
                """);
        assertYamlRejected("""
                flowMeta: {}
                dependencyManifest:
                  - type: plugin
                    nodeId: plugin::one
                    sourceId: source-tool
                    unexpected: value
                flowData: {nodes: [], edges: []}
                """);
        assertYamlRejected("""
                flowMeta: {}
                dependencyManifest:
                  - {type: plugin, nodeId: plugin::one, sourceId: source-tool}
                  - {type: plugin, nodeId: plugin::one, sourceId: source-tool}
                flowData: {nodes: [], edges: []}
                """);

        String oversizedId = "x".repeat(513);
        assertYamlRejected("""
                flowMeta: {}
                dependencyManifest:
                  - type: plugin
                    nodeId: plugin::one
                    sourceId: %s
                flowData: {nodes: [], edges: []}
                """.formatted(oversizedId));

        StringBuilder tooManyEntries = new StringBuilder("""
                flowMeta: {}
                dependencyManifest:
                """);
        for (int i = 0; i <= 10_000; i++) {
            tooManyEntries.append("  - {type: plugin, nodeId: plugin::")
                    .append(i)
                    .append(", sourceId: source-")
                    .append(i)
                    .append("}\n");
        }
        tooManyEntries.append("flowData: {nodes: [], edges: []}\n");
        assertYamlRejected(tooManyEntries.toString());
    }

    @Test
    void forgedManifestHashCannotMapWithoutSourceOperationOrStableName() {
        String targetSchema = schema("prompt");
        ToolBox target = tool(
                "target-tool", "Forged Name", "target-operation", "V1.0", targetSchema);
        when(toolBoxService.list(any(Wrapper.class)))
                .thenReturn(List.of())
                .thenReturn(List.of(target));
        BizWorkflowNode node = pluginNode(
                "plugin::forged", "missing-source", null, "V1.0");
        Map<String, Object> forged = manifest(
                "plugin::forged", "missing-source", "Forged Name", contractHash(targetSchema));
        forged.put("stableKey", "a".repeat(64));

        service.cleanNodesForImport(workflow(node), USER_ID, request,
                List.of(forged), new WorkflowImportReport());

        assertUnresolved(node, "MISSING");
        verify(toolBoxService, times(1)).list(any(Wrapper.class));
    }

    @Test
    void importRejectsYamlBeyondNestingDepthLimitBeforeCallingWorkflowService() {
        String yaml = "flowMeta: {}\nflowData: "
                + "[".repeat(60) + "0" + "]".repeat(60);

        assertYamlRejected(yaml);
    }

    @Test
    void importRejectsYamlBeyondCollectionAliasLimitBeforeCallingWorkflowService() {
        StringBuilder yaml = new StringBuilder("""
                flowMeta: {}
                flowData: {nodes: [], edges: []}
                base: &base [value]
                refs:
                """);
        yaml.append("  - *base\n".repeat(51));

        assertYamlRejected(yaml.toString());
    }

    @Test
    void importRejectsCustomGlobalYamlTagBeforeCallingWorkflowService() {
        assertYamlRejected("""
                flowMeta: !<tag:example.com,2026:Unsafe> {}
                flowData: {nodes: [], edges: []}
                """);
    }

    @Test
    void importRejectsNonMappingRootAndMalformedWorkflowShapes() {
        assertYamlRejected("- flowMeta\n- flowData\n");
        assertYamlRejected("""
                flowMeta: []
                flowData: {nodes: [], edges: []}
                """);
        assertYamlRejected("""
                flowMeta: {}
                flowData: {nodes: null, edges: []}
                """);
        assertYamlRejected("""
                flowMeta: {}
                flowData:
                  nodes: [null]
                  edges: []
                """);
        assertYamlRejected("""
                flowMeta: {}
                flowData:
                  nodes:
                    - id: node-start::1
                      data: []
                  edges: []
                """);
        assertYamlRejected("""
                flowMeta: {}
                flowData:
                  nodes:
                    - id: node-start::1
                      data:
                        nodeParam: []
                  edges: []
                """);
    }

    @Test
    void importRejectsMalformedMetadataTypes() {
        assertYamlRejected("""
                flowMeta:
                  name: []
                flowData: {nodes: [], edges: []}
                """);
        assertYamlRejected("""
                flowMeta:
                  description: {}
                flowData: {nodes: [], edges: []}
                """);
        assertYamlRejected("""
                flowMeta:
                  category: invalid
                flowData: {nodes: [], edges: []}
                """);
    }

    @Test
    void importRejectsMalformedEdgesAndAgentDependencyContainers() {
        assertYamlRejected("""
                flowMeta: {}
                flowData:
                  nodes: []
                  edges: [{source: start}]
                """);
        assertYamlRejected("""
                flowMeta: {}
                flowData:
                  nodes:
                    - id: agent::1
                      data:
                        nodeParam:
                          plugin:
                            tools: {}
                  edges: []
                """);
        assertYamlRejected("""
                flowMeta: {}
                flowData:
                  nodes:
                    - id: agent::1
                      data:
                        nodeParam:
                          plugin:
                            toolsList: [editable-name]
                  edges: []
                """);
        assertYamlRejected("""
                flowMeta: {}
                flowData:
                  nodes:
                    - id: agent::1
                      data:
                        nodeParam:
                          plugin:
                            knowledge:
                              - match: {repoIds: invalid}
                  edges: []
                """);
    }

    private void assertYamlRejected(String yaml) {
        assertThatThrownBy(() -> service.importWorkflowFromYaml(
                new ByteArrayInputStream(yaml.getBytes(StandardCharsets.UTF_8)), request))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue(
                        "responseEnum", ResponseEnum.WORKFLOW_DLS_UPLOAD_FAILED);
        verifyNoInteractions(workflowService);
    }

    private ByteArrayInputStream importableYaml() {
        String yaml = """
                flowMeta:
                  name: portable
                flowData:
                  nodes: []
                  edges: []
                """;
        return new ByteArrayInputStream(yaml.getBytes(StandardCharsets.UTF_8));
    }

    private BizWorkflowData workflow(BizWorkflowNode... nodes) {
        BizWorkflowData data = new BizWorkflowData();
        data.setNodes(new ArrayList<>(List.of(nodes)));
        data.setEdges(List.of());
        return data;
    }

    private Page<LLMInfoVo> modelPage(long current, long total, Long... llmIds) {
        Page<LLMInfoVo> page = new Page<>(current, 999, total);
        List<LLMInfoVo> records = new ArrayList<>();
        for (Long llmId : llmIds) {
            LLMInfoVo model = new LLMInfoVo();
            model.setLlmId(llmId);
            records.add(model);
        }
        page.setRecords(records);
        return page;
    }

    private Page<LLMInfoVo> modelPageRange(
            long current, long total, long firstLlmId, long lastLlmId) {
        List<Long> llmIds = new ArrayList<>();
        for (long llmId = firstLlmId; llmId <= lastLlmId; llmId++) {
            llmIds.add(llmId);
        }
        return modelPage(current, total, llmIds.toArray(Long[]::new));
    }

    private BizWorkflowNode pluginNode(
            String nodeId, String pluginId, String operationId, String version) {
        JSONObject param = new JSONObject()
                .fluentPut("pluginId", pluginId)
                .fluentPut("operationId", operationId)
                .fluentPut("version", version);
        return node(nodeId, param);
    }

    private BizWorkflowNode node(String nodeId, JSONObject param) {
        BizNodeData data = new BizNodeData();
        data.setLabel("Node label");
        data.setNodeParam(param);
        data.setInputs(new ArrayList<>());
        data.setOutputs(new ArrayList<>());

        BizWorkflowNode node = new BizWorkflowNode();
        node.setId(nodeId);
        node.setType("custom");
        node.setData(data);
        return node;
    }

    private BizInputOutput inputOutput(String id, String name) {
        BizInputOutput value = new BizInputOutput();
        value.setId(id);
        value.setName(name);
        return value;
    }

    private BizProperty property(String id, String name, String type) {
        BizProperty value = new BizProperty();
        value.setId(id);
        value.setName(name);
        value.setType(type);
        value.setProperties(new ArrayList<>());
        return value;
    }

    private ToolBox tool(
            String id, String name, String operationId, String version, String webSchema) {
        ToolBox tool = new ToolBox();
        tool.setToolId(id);
        tool.setName(name);
        tool.setOperationId(operationId);
        tool.setVersion(version);
        tool.setWebSchema(webSchema);
        tool.setDescription(name + " description");
        tool.setIsPublic(true);
        tool.setDeleted(false);
        tool.setStatus(1);
        tool.setUserId("publisher");
        return tool;
    }

    private Repo repository(Long id, String coreId, String outerId, String userId,
            Long spaceId, Integer visibility) {
        Repo repository = new Repo();
        repository.setId(id);
        repository.setCoreRepoId(coreId);
        repository.setOuterRepoId(outerId);
        repository.setUserId(userId);
        repository.setSpaceId(spaceId);
        repository.setVisibility(visibility);
        repository.setDeleted(false);
        return repository;
    }

    private Map<String, Object> manifest(
            String nodeId, String sourceId, String name, String contractHash) {
        return manifest(nodeId, sourceId, name, "source-operation", contractHash);
    }

    private Map<String, Object> manifest(
            String nodeId, String sourceId, String name, String operationId, String contractHash) {
        Map<String, Object> manifest = new LinkedHashMap<>();
        manifest.put("type", "plugin");
        manifest.put("nodeId", nodeId);
        manifest.put("sourceId", sourceId);
        manifest.put("name", name);
        manifest.put("operationId", operationId);
        manifest.put("version", "V1.0");
        if (contractHash != null) {
            manifest.put("contractHash", contractHash);
        }
        return manifest;
    }

    private String contractHash(String webSchema) {
        return ReflectionTestUtils.invokeMethod(service, "contractHash", webSchema);
    }

    private String schema(String inputName) {
        return """
                {
                  "toolRequestInput": [
                    {
                      "name": "%s",
                      "type": "string",
                      "description": "input",
                      "from": 1,
                      "required": true,
                      "location": "body",
                      "open": true
                    }
                  ],
                  "toolRequestOutput": [
                    {
                      "name": "result",
                      "type": "string",
                      "description": "output",
                      "required": false,
                      "open": true
                    }
                  ]
                }
                """.formatted(inputName);
    }

    private String nestedSchemaWithAddedFields() {
        return """
                {
                  "toolRequestInput": [
                    {"name":"prompt","type":"string","open":true},
                    {"name":"options","type":"object","open":true,"children":[
                      {"name":"city","type":"string","open":true},
                      {"name":"country","type":"string","open":true}
                    ]},
                    {"name":"language","type":"string","open":true}
                  ],
                  "toolRequestOutput": [
                    {"name":"result","type":"string","open":true}
                  ]
                }
                """;
    }

    private String nestedSchemaWithCityType(String cityType) {
        return """
                {
                  "toolRequestInput": [
                    {"name":"options","type":"object","open":true,"children":[
                      {"name":"city","type":"%s","open":true}
                    ]}
                  ],
                  "toolRequestOutput": []
                }
                """.formatted(cityType);
    }

    private String arrayObjectSchema(String cityType) {
        return """
                {
                  "toolRequestInput": [
                    {"name":"rows","type":"array","open":true,"children":[
                      {"type":"object","children":[
                        {"name":"city","type":"%s","open":true}
                      ]}
                    ]}
                  ],
                  "toolRequestOutput": []
                }
                """.formatted(cityType);
    }

    private void assertUnresolved(BizWorkflowNode node, String status) {
        assertThat(node.getData().getNodeParam())
                .doesNotContainKeys("pluginId", "operationId", "version");
        assertThat(node.getData().getInputs()).isEmpty();
        assertThat(node.getData().getOutputs()).isEmpty();
        assertThat(node.getData().getNodeMeta())
                .containsEntry("importDependencyStatus", status)
                .containsKey("importDependencyReason");
    }
}
