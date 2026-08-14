package com.iflytek.astron.console.toolkit.service.workflow;

import cn.hutool.core.collection.CollUtil;
import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.esotericsoftware.minlog.Log;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.entity.workflow.Workflow;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.util.BotUtil;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import com.iflytek.astron.console.toolkit.config.properties.BizConfig;
import com.iflytek.astron.console.toolkit.config.properties.CommonConfig;
import com.iflytek.astron.console.toolkit.entity.biz.modelconfig.ModelDto;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.BizWorkflowData;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.BizWorkflowNode;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.node.BizNodeData;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.node.BizInputOutput;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.node.BizProperty;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.node.BizSchema;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.node.BizValue;
import com.iflytek.astron.console.toolkit.entity.dto.RepoDto;
import com.iflytek.astron.console.toolkit.entity.dto.WorkflowReq;
import com.iflytek.astron.console.toolkit.entity.enumVo.ToolboxStatusEnum;
import com.iflytek.astron.console.toolkit.entity.table.database.DbInfo;
import com.iflytek.astron.console.toolkit.entity.table.group.GroupVisibility;
import com.iflytek.astron.console.toolkit.entity.table.repo.Repo;
import com.iflytek.astron.console.toolkit.entity.table.tool.ToolBox;
import com.iflytek.astron.console.toolkit.entity.tool.WebSchema;
import com.iflytek.astron.console.toolkit.entity.tool.WebSchemaItem;
import com.iflytek.astron.console.toolkit.entity.vo.LLMInfoVo;
import com.iflytek.astron.console.toolkit.entity.vo.WorkflowImportReport;
import com.iflytek.astron.console.toolkit.entity.vo.WorkflowImportReportEntry;
import com.iflytek.astron.console.toolkit.entity.vo.WorkflowImportResponse;
import com.iflytek.astron.console.toolkit.handler.UserInfoManagerHandler;
import com.iflytek.astron.console.toolkit.mapper.database.DbInfoMapper;
import com.iflytek.astron.console.toolkit.mapper.group.GroupVisibilityMapper;
import com.iflytek.astron.console.toolkit.mapper.repo.RepoMapper;
import com.iflytek.astron.console.toolkit.service.model.ModelService;
import com.iflytek.astron.console.toolkit.service.repo.RepoService;
import com.iflytek.astron.console.toolkit.service.tool.ToolBoxService;
import com.iflytek.astron.console.toolkit.tool.DataPermissionCheckTool;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.yaml.snakeyaml.DumperOptions;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.SafeConstructor;
import org.yaml.snakeyaml.representer.Representer;

import java.io.InputStream;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Workflow export/import service for handling YAML format workflow data exchange. Provides
 * functionality to export workflows as YAML files and import workflows from YAML. Handles data
 * cleaning, permission checks, and format conversions during import/export operations.
 *
 * @author clliu19
 * @since 2025/6/18 15:39
 */
@Service
@Slf4j
public class WorkflowExportService {
    private static final ObjectMapper objectMapper = new ObjectMapper();
    private static final int IMPORT_MODEL_PAGE_SIZE = 999;
    private static final int MAX_DEPENDENCY_MANIFEST_ENTRIES = 10_000;
    private static final int MAX_MANIFEST_ID_LENGTH = 512;
    private static final int MAX_MANIFEST_NAME_LENGTH = 512;
    private static final int MAX_MANIFEST_OPERATION_LENGTH = 512;
    private static final int MAX_MANIFEST_VERSION_LENGTH = 128;
    private static final int SHA256_HEX_LENGTH = 64;
    private static final Set<String> MANIFEST_FIELDS = Set.of(
            "type", "nodeId", "sourceId", "name", "operationId", "version",
            "contractHash", "stableKey");
    /** Runtime credentials injected by the console and never portable between environments. */
    private static final Set<String> RUNTIME_CREDENTIAL_KEYS = Set.of(
            "apiKey", "apiSecret", "authInfo", "authorization", "accessToken",
            "refreshToken", "artifactUploadToken");

    static {
        objectMapper.setSerializationInclusion(JsonInclude.Include.NON_NULL);
        objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    @Resource
    WorkflowService workflowService;
    @Resource
    ModelService modelService;
    @Autowired
    private BotUtil botUtil;
    @Resource
    BizConfig bizConfig;
    @Resource
    ToolBoxService toolBoxService;
    @Autowired
    DataPermissionCheckTool dataPermissionCheckTool;
    @Resource
    RepoMapper repoMapper;
    @Resource
    GroupVisibilityMapper groupVisibilityMapper;
    @Resource
    RepoService repoService;
    @Autowired
    DbInfoMapper dbInfoMapper;
    @Autowired
    CommonConfig commonConfig;

    /**
     * Export workflow data as YAML format.
     *
     * @param workflow Workflow to export
     * @param outputStream Output stream to write YAML data
     */
    public void exportWorkflowDataAsYaml(Workflow workflow, OutputStream outputStream) {
        // Permission check
        dataPermissionCheckTool.checkWorkflowVisible(workflow, SpaceInfoUtil.getSpaceId());
        // Prevent timestamp
        objectMapper.configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false);
        try {
            BizWorkflowData bizWorkflowData = JSON.parseObject(workflow.getData(), BizWorkflowData.class);
            removeRuntimeCredentialsForExport(bizWorkflowData);
            Map<String, Object> meta = objectMapper.convertValue(workflow, Map.class);

            // Keep only whitelist fields
            List<String> allowedKeys = new ArrayList<>(Arrays.asList(
                    "name", "description", "avatarIcon", "avatarColor",
                    "edgeType", "category", "advancedConfig"));
            meta.keySet().removeIf(k -> !allowedKeys.contains(k));

            // Remove null value fields
            meta.entrySet().removeIf(e -> e.getValue() == null);

            // Add DSL version
            meta.put("dslVersion", "v1");
            Map<String, Object> yamlWrapper = new LinkedHashMap<>();
            yamlWrapper.put("flowMeta", meta);
            Map<String, Object> flowData = objectMapper.convertValue(bizWorkflowData, Map.class);
            // A manifest makes cross-environment imports deterministic while keeping v1 YAMLs
            // readable. It contains only public contract metadata; credentials and endpoints
            // are intentionally excluded.
            yamlWrapper.put("dependencyManifest", buildDependencyManifest(bizWorkflowData));
            yamlWrapper.put("flowData", flowData);

            // YAML dump configuration
            DumperOptions options = new DumperOptions();
            options.setDefaultFlowStyle(DumperOptions.FlowStyle.BLOCK);
            options.setPrettyFlow(true);
            options.setIndent(2);
            options.setDefaultScalarStyle(DumperOptions.ScalarStyle.PLAIN);

            LoaderOptions loaderOptions = WorkflowYamlParser.createLoaderOptions();
            Representer representer = new Representer(options);
            representer.getPropertyUtils().setSkipMissingProperties(true);
            // Output
            Yaml yaml = new Yaml(new SafeConstructor(loaderOptions), representer, options, loaderOptions);
            yaml.dump(yamlWrapper, new OutputStreamWriter(outputStream, StandardCharsets.UTF_8));
        } catch (Exception e) {
            Log.error("Export YAML failed", e);
            throw new BusinessException(ResponseEnum.RESPONSE_FAILED, "Export YAML failed");
        }
    }

    /**
     * Import workflow from YAML format.
     *
     * @param inputStream Input stream containing YAML data
     * @param request HTTP request context
     * @return API result with imported workflow
     */
    @SneakyThrows
    @Transactional(rollbackFor = Exception.class)
    public ApiResult importWorkflowFromYaml(InputStream inputStream, HttpServletRequest request) {
        WorkflowYamlParser.ParsedWorkflowDsl dsl = WorkflowYamlParser.parse(inputStream);
        String uid = UserInfoManagerHandler.getUserId();
        Workflow wf = createImportedWorkflow(dsl.meta(), uid);
        BizWorkflowData bizWorkflowData = convertImportedWorkflowData(dsl.flow());
        normalizeImportedNodeParams(bizWorkflowData);
        WorkflowImportReport report = new WorkflowImportReport();
        List<Map<String, Object>> dependencyManifest =
                parseDependencyManifest(dsl.dependencyManifest());
        cleanNodesForImport(bizWorkflowData, uid, request, dependencyManifest, report);
        wf.setData(objectMapper.writeValueAsString(bizWorkflowData));

        WorkflowReq workflowReq = new WorkflowReq();
        workflowReq.setName(wf.getName());
        workflowReq.setDescription(wf.getDescription());
        workflowReq.setAppId(wf.getAppId());
        ApiResult<String> addResult = workflowService.callProtocolAdd(workflowReq);
        if (addResult.code() != 0) {
            return addResult;
        }
        wf.setFlowId(addResult.data());
        try {
            return persistImportedWorkflow(wf, report);
        } catch (Exception importFailure) {
            compensateProtocolCreation(wf.getAppId(), wf.getFlowId(), importFailure);
            throw importFailure;
        }
    }

    private Workflow createImportedWorkflow(Map<String, Object> meta, String uid) {
        Workflow wf = new Workflow();
        wf.setUid(uid);
        String name = (String) meta.get("name");
        String flowName = generateNameWithTimestamp(name);
        wf.setName(flowName);
        wf.setAppId(commonConfig.getAppId());
        wf.setDescription((String) meta.get("description"));
        wf.setAvatarIcon((String) meta.get("avatarIcon"));
        wf.setAvatarColor((String) meta.get("avatarColor"));
        wf.setEdgeType((String) meta.get("edgeType"));
        wf.setCategory(meta.get("category") instanceof Number category
                ? category.intValue()
                : null);
        wf.setAdvancedConfig(stringValue(meta.get("advancedConfig")));
        return wf;
    }

    private BizWorkflowData convertImportedWorkflowData(Map<String, Object> flow) {
        try {
            return objectMapper.convertValue(flow, BizWorkflowData.class);
        } catch (IllegalArgumentException e) {
            throw invalidWorkflowDsl(e);
        }
    }

    private ApiResult<WorkflowImportResponse> persistImportedWorkflow(
            Workflow wf, WorkflowImportReport report) {
        wf.setCreateTime(new Date());
        wf.setUpdateTime(new Date());
        if (wf.getSource() == null) {
            wf.setSource(0);
        }
        if (StringUtils.isBlank(wf.getAvatarColor())) {
            wf.setAvatarColor("#FFEAD5");
        }
        if (StringUtils.isBlank(wf.getAvatarIcon())) {
            wf.setAvatarIcon("icon/common/emojiitem_00_10@2x.png");
        }
        // All local writes participate in importWorkflowFromYaml's transaction.
        Long spaceId = SpaceInfoUtil.getSpaceId();
        wf.setSpaceId(spaceId);
        if (!workflowService.save(wf)) {
            throw new BusinessException(ResponseEnum.WORKFLOW_IMPORT_FAILED);
        }
        Integer botId = botUtil.syncToSparkDatabase(
                wf, UserInfoManagerHandler.getUserId(), spaceId);
        JSONObject jsonData = new JSONObject();
        jsonData.put("botId", botId);
        wf.setExt(jsonData.toJSONString());
        if (!workflowService.updateById(wf)) {
            throw new BusinessException(ResponseEnum.WORKFLOW_IMPORT_FAILED);
        }
        log.info(
                "workflow import dependency resolution completed, flowId={}, total={}, resolved={}, unresolved={}, ambiguous={}",
                wf.getFlowId(), report.getTotal(), report.getResolved(), report.getUnresolved(),
                report.getAmbiguous());
        WorkflowImportResponse response = new WorkflowImportResponse();
        org.springframework.beans.BeanUtils.copyProperties(wf, response);
        response.setImportReport(report);
        return ApiResult.success(response);
    }

    /** Best-effort compensation for the core resource created before the local transaction. */
    private void compensateProtocolCreation(String appId, String flowId, Exception importFailure) {
        try {
            workflowService.deleteProtocol(appId, flowId);
        } catch (Exception compensationFailure) {
            if (compensationFailure != importFailure) {
                importFailure.addSuppressed(compensationFailure);
            }
            log.error(
                    "failed to compensate core workflow protocol after local import failure, appId={}, flowId={}",
                    appId, flowId, compensationFailure);
        }
    }

    /** A missing nodeParam is valid for structural nodes; cleaners still expect a JSON object. */
    private void normalizeImportedNodeParams(BizWorkflowData workflowData) {
        if (workflowData == null || workflowData.getNodes() == null) {
            return;
        }
        workflowData.getNodes()
                .stream()
                .filter(Objects::nonNull)
                .map(BizWorkflowNode::getData)
                .filter(Objects::nonNull)
                .filter(data -> data.getNodeParam() == null)
                .forEach(data -> data.setNodeParam(new JSONObject()));
    }

    private BusinessException invalidWorkflowDsl(Throwable cause) {
        if (cause != null) {
            log.warn("workflow DSL validation failed: {}", cause.getMessage());
        }
        return new BusinessException(ResponseEnum.WORKFLOW_DLS_UPLOAD_FAILED);
    }

    /**
     * Generate a short name with timestamp, ensuring total length doesn't exceed specified limit.
     *
     * @param baseName Original name
     * @return Generated name with timestamp
     */
    public static String generateNameWithTimestamp(String baseName) {
        if (baseName == null) {
            baseName = "workflow";
        }
        String timestamp = new SimpleDateFormat("yyyyMMddHHmmss").format(new Date());
        int allowedBaseLength = 20 - timestamp.length();

        if (baseName.length() > allowedBaseLength) {
            baseName = baseName.substring(0, allowedBaseLength);
        }

        return baseName + timestamp;
    }

    /**
     * Clean private information during workflow import.
     *
     * @param bizWorkflowData Workflow data to clean
     * @param uid User ID
     * @param request HTTP request context
     */
    public void cleanNodesForImport(BizWorkflowData bizWorkflowData, String uid, HttpServletRequest request) {
        cleanNodesForImport(bizWorkflowData, uid, request, Collections.emptyList(), new WorkflowImportReport());
    }

    /**
     * Cleans private runtime credentials and resolves portable plugin dependencies. The manifest and
     * report are optional so v1 YAML and existing internal callers remain compatible.
     */
    public void cleanNodesForImport(BizWorkflowData bizWorkflowData, String uid,
            HttpServletRequest request, List<Map<String, Object>> dependencyManifest,
            WorkflowImportReport report) {
        if (bizWorkflowData == null || bizWorkflowData.getNodes() == null) {
            return;
        }
        List<BizWorkflowNode> nodes = bizWorkflowData.getNodes();
        Set<Long> allowedLlmSet = loadImportVisibleLlmIds(uid, request);
        ImportVisibleResources visibleResources = loadImportVisibleResources(
                nodes, dependencyManifest, uid, request);
        for (BizWorkflowNode node : nodes) {
            if (node == null) {
                continue;
            }
            BizNodeData data = node.getData();
            if (data == null || data.getNodeParam() == null)
                continue;
            JSONObject param = data.getNodeParam();
            // Legacy YAML may contain credentials produced by an older exporter.
            removeSensitivePluginFields(param);
            removeAgentSkillSandbox(param);
            String prefix = StringUtils.defaultString(
                    WorkflowKnowledgeBindingParser.nodeType(node.getId()));

            switch (prefix) {
                case "spark-llm":
                case "decision-making":
                case "extractor-parameter":
                case "question-answer":
                    cleanLlmNode(param, allowedLlmSet, uid);
                    break;
                case "plugin":
                    resolvePluginNode(node, param, data, dependencyManifest,
                            visibleResources.tools(), report);
                    break;
                case "flow":
                    cleanFlowNode(node, param, data, visibleResources.workflowIds(), report);
                    break;
                case "knowledge-base":
                case "knowledge-pro-base":
                case "knowledge-expert-base":
                    cleanKnowledgeNode(node, param, uid, allowedLlmSet, prefix,
                            visibleResources.repositoryIds(), report);
                    break;
                case "agent":
                    cleanAgentNode(node, param, uid, allowedLlmSet,
                            visibleResources.repositoryIds(), dependencyManifest,
                            visibleResources.tools(), report);
                    break;
                case "database":
                    // Database node
                    cleanDataBaseNode(node, param, visibleResources.databaseIds(), report);
                    break;
                default:
                    break;
            }
        }
    }

    /**
     * Loads every model visible through the existing model service. The service returns a manually
     * paged merged list and exposes the full count through {@link Page#getTotal()}, so the first
     * response gives this import a finite upper bound without duplicating its visibility rules.
     */
    private Set<Long> loadImportVisibleLlmIds(String uid, HttpServletRequest request) {
        Page<LLMInfoVo> firstPage = getImportVisibleModelPage(uid, request, 1);
        if (firstPage == null) {
            return Collections.emptySet();
        }

        Set<Long> allowedLlmIds = new HashSet<>();
        addVisibleLlmIds(allowedLlmIds, firstPage);

        long total = Math.max(0L, firstPage.getTotal());
        long pageCount = total == 0L ? 1L : ((total - 1L) / IMPORT_MODEL_PAGE_SIZE) + 1L;
        if (pageCount > Integer.MAX_VALUE) {
            log.warn("Visible model count exceeds supported import pagination, uid={}, total={}",
                    uid, total);
            return Collections.emptySet();
        }

        for (long pageNumber = 2L; pageNumber <= pageCount; pageNumber++) {
            Page<LLMInfoVo> page =
                    getImportVisibleModelPage(uid, request, Math.toIntExact(pageNumber));
            if (page == null) {
                // Preserve the existing fail-closed behavior if visibility cannot be established.
                return Collections.emptySet();
            }
            addVisibleLlmIds(allowedLlmIds, page);
        }
        return allowedLlmIds;
    }

    private Page<LLMInfoVo> getImportVisibleModelPage(
            String uid, HttpServletRequest request, int pageNumber) {
        ModelDto modelDto = new ModelDto();
        modelDto.setPage(pageNumber);
        modelDto.setPageSize(IMPORT_MODEL_PAGE_SIZE);
        modelDto.setType(0);
        modelDto.setUid(uid);
        modelDto.setSpaceId(SpaceInfoUtil.getSpaceId());
        ApiResult<Page<LLMInfoVo>> conditionList =
                modelService.getConditionList(modelDto, request);
        return conditionList == null ? null : conditionList.data();
    }

    private void addVisibleLlmIds(Set<Long> target, Page<LLMInfoVo> page) {
        if (page.getRecords() == null) {
            return;
        }
        page.getRecords()
                .stream()
                .filter(Objects::nonNull)
                .map(LLMInfoVo::getLlmId)
                .filter(Objects::nonNull)
                .forEach(target::add);
    }

    /** Resolve workflow and repository authorization once per import, not once per node. */
    private ImportVisibleResources loadImportVisibleResources(List<BizWorkflowNode> nodes,
            List<Map<String, Object>> dependencyManifest, String uid,
            HttpServletRequest request) {
        Set<String> flowIds = new LinkedHashSet<>();
        Set<String> repositoryIds = new LinkedHashSet<>();
        Set<Long> databaseIds = new LinkedHashSet<>();
        for (BizWorkflowNode node : nodes) {
            if (node == null || node.getId() == null || node.getData() == null
                    || node.getData().getNodeParam() == null) {
                continue;
            }
            String nodeType = WorkflowKnowledgeBindingParser.nodeType(node.getId());
            if ("flow".equals(nodeType)) {
                addNonBlank(flowIds, node.getData().getNodeParam().getString("flowId"));
            } else if ("database".equals(nodeType)) {
                addDatabaseId(databaseIds, node.getData().getNodeParam().getString("dbId"));
            } else if (WorkflowKnowledgeBindingParser.isDirectKnowledgeType(nodeType)) {
                repositoryIds.addAll(WorkflowKnowledgeBindingParser
                        .parse(nodeType, node.getData().getNodeParam())
                        .repositoryIds());
            } else if ("agent".equals(nodeType)) {
                collectAgentKnowledgeIds(node.getData().getNodeParam(), repositoryIds);
            }
        }

        Set<String> visibleFlowIds = new HashSet<>();
        if (!flowIds.isEmpty()) {
            List<Workflow> workflows = workflowService.list(new LambdaQueryWrapper<Workflow>()
                    .in(Workflow::getFlowId, flowIds)
                    .eq(Workflow::getDeleted, false));
            for (Workflow workflow : workflows == null ? Collections.<Workflow>emptyList() : workflows) {
                try {
                    dataPermissionCheckTool.checkWorkflowVisible(workflow, SpaceInfoUtil.getSpaceId());
                    addNonBlank(visibleFlowIds, workflow.getFlowId());
                } catch (BusinessException ignored) {
                    // A row that exists but is outside the current scope is deliberately unresolved.
                }
            }
        }

        Set<String> visibleRepositoryIds = loadVisibleRepositoryIds(repositoryIds, request);
        Set<Long> visibleDatabaseIds = loadVisibleDatabaseIds(databaseIds);
        ImportToolIndex tools = loadImportToolIndex(nodes, dependencyManifest, uid);
        return new ImportVisibleResources(
                visibleFlowIds, visibleRepositoryIds, visibleDatabaseIds, tools);
    }

    private void addDatabaseId(Set<Long> databaseIds, String rawId) {
        if (!StringUtils.isNumeric(rawId)) {
            return;
        }
        try {
            databaseIds.add(Long.valueOf(rawId));
        } catch (NumberFormatException ignored) {
            // Out-of-range IDs remain unresolved without widening the query.
        }
    }

    private Set<Long> loadVisibleDatabaseIds(Set<Long> databaseIds) {
        if (databaseIds.isEmpty()) {
            return Collections.emptySet();
        }
        List<DbInfo> databases = dbInfoMapper.selectList(new LambdaQueryWrapper<DbInfo>()
                .in(DbInfo::getDbId, databaseIds)
                .eq(SpaceInfoUtil.getSpaceId() == null,
                        DbInfo::getUid, UserInfoManagerHandler.getUserId())
                .isNull(SpaceInfoUtil.getSpaceId() == null, DbInfo::getSpaceId)
                .eq(SpaceInfoUtil.getSpaceId() != null,
                        DbInfo::getSpaceId, SpaceInfoUtil.getSpaceId())
                .eq(DbInfo::getDeleted, false));
        return (databases == null ? Collections.<DbInfo>emptyList() : databases).stream()
                .map(DbInfo::getDbId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    private ImportToolIndex loadImportToolIndex(List<BizWorkflowNode> nodes,
            List<Map<String, Object>> dependencyManifest, String uid) {
        Set<String> toolIds = new LinkedHashSet<>();
        Set<String> toolNames = new LinkedHashSet<>();
        for (BizWorkflowNode node : nodes) {
            collectImportToolReferences(node, dependencyManifest, toolIds, toolNames);
        }
        List<ToolBox> byId = toolIds.isEmpty() ? Collections.emptyList()
                : toolBoxService.list(new LambdaQueryWrapper<ToolBox>()
                        .in(ToolBox::getToolId, toolIds)
                        .eq(ToolBox::getDeleted, false)
                        .orderByDesc(ToolBox::getUpdateTime));
        List<ToolBox> byName = toolNames.isEmpty() ? Collections.emptyList()
                : toolBoxService.list(new LambdaQueryWrapper<ToolBox>()
                        .in(ToolBox::getName, toolNames)
                        .eq(ToolBox::getDeleted, false)
                        .orderByDesc(ToolBox::getUpdateTime));
        Map<String, List<ToolBox>> idIndex = visibleToolIndex(byId, uid, ToolBox::getToolId);
        Map<String, List<ToolBox>> nameIndex = visibleToolIndex(byName, uid, ToolBox::getName);
        return new ImportToolIndex(idIndex, nameIndex);
    }

    private Map<String, List<ToolBox>> visibleToolIndex(List<ToolBox> tools, String uid,
            java.util.function.Function<ToolBox, String> keyExtractor) {
        return (tools == null ? Collections.<ToolBox>emptyList() : tools).stream()
                .filter(tool -> isToolVisible(tool, uid))
                .filter(tool -> StringUtils.isNotBlank(keyExtractor.apply(tool)))
                .collect(Collectors.groupingBy(keyExtractor, LinkedHashMap::new,
                        Collectors.toList()));
    }

    private void collectImportToolReferences(BizWorkflowNode node,
            List<Map<String, Object>> dependencyManifest, Set<String> toolIds,
            Set<String> toolNames) {
        if (node == null || node.getId() == null || node.getData() == null
                || node.getData().getNodeParam() == null) {
            return;
        }
        JSONObject param = node.getData().getNodeParam();
        if (node.getId().startsWith("plugin::")) {
            collectPluginImportToolReference(
                    node, param, dependencyManifest, toolIds, toolNames);
            return;
        }
        if (node.getId().startsWith("agent::")) {
            collectAgentImportToolReferences(
                    node, param, dependencyManifest, toolIds, toolNames);
        }
    }

    private void collectPluginImportToolReference(BizWorkflowNode node, JSONObject param,
            List<Map<String, Object>> dependencyManifest, Set<String> toolIds,
            Set<String> toolNames) {
        String toolId = param.getString("pluginId");
        addNonBlank(toolIds, toolId);
        String sourceName = firstNonBlank(
                param.getString("pluginName"), node.getData().getPluginName());
        Map<String, Object> manifest = trustedManifest(
                dependencyManifest, node.getId(), toolId,
                sourceName, param.getString("operationId"));
        addNonBlank(toolNames, firstNonBlank(
                manifest == null ? null : stringValue(manifest.get("name")), sourceName));
    }

    private void collectAgentImportToolReferences(BizWorkflowNode node, JSONObject param,
            List<Map<String, Object>> dependencyManifest, Set<String> toolIds,
            Set<String> toolNames) {
        JSONObject plugin = param.getJSONObject("plugin");
        JSONArray tools = plugin == null ? null : plugin.getJSONArray("tools");
        JSONArray toolsList = plugin == null ? null : plugin.getJSONArray("toolsList");
        for (Object rawTool : tools == null ? new JSONArray() : tools) {
            collectAgentRuntimeToolReference(
                    node, rawTool, toolsList, dependencyManifest, toolIds, toolNames);
        }
        for (Object rawTool : toolsList == null ? new JSONArray() : toolsList) {
            JSONObject display = asJsonObject(rawTool);
            if (display == null || !"tool".equals(display.getString("type"))) {
                continue;
            }
            collectAgentDisplayToolReference(
                    node, display, dependencyManifest, toolIds, toolNames);
        }
    }

    private void collectAgentRuntimeToolReference(BizWorkflowNode node, Object rawTool,
            JSONArray toolsList, List<Map<String, Object>> dependencyManifest,
            Set<String> toolIds, Set<String> toolNames) {
        JSONObject runtime = asJsonObject(rawTool);
        String toolId = runtime == null ? stringValue(rawTool) : runtime.getString("tool_id");
        addNonBlank(toolIds, toolId);
        JSONObject display = findAgentTool(toolsList, toolId);
        String sourceName = display == null ? null : display.getString("pluginName");
        String sourceOperationId = display == null ? null : display.getString("operationId");
        Map<String, Object> manifest = trustedManifest(
                dependencyManifest, node.getId(), toolId, sourceName, sourceOperationId);
        addNonBlank(toolNames, firstNonBlank(
                manifest == null ? null : stringValue(manifest.get("name")), sourceName));
    }

    private void collectAgentDisplayToolReference(BizWorkflowNode node, JSONObject display,
            List<Map<String, Object>> dependencyManifest, Set<String> toolIds,
            Set<String> toolNames) {
        String toolId = display.getString("toolId");
        addNonBlank(toolIds, toolId);
        String sourceName = display.getString("pluginName");
        Map<String, Object> manifest = trustedManifest(
                dependencyManifest, node.getId(), toolId,
                sourceName, display.getString("operationId"));
        addNonBlank(toolNames, firstNonBlank(
                manifest == null ? null : stringValue(manifest.get("name")), sourceName));
    }

    private JSONObject findAgentTool(JSONArray toolsList, String toolId) {
        int index = findAgentToolIndex(toolsList, toolId);
        return index < 0 ? null : asJsonObject(toolsList.get(index));
    }

    /** Query only referenced repositories, so visibility does not depend on list pagination. */
    private Set<String> loadVisibleRepositoryIds(Set<String> repositoryIds,
            HttpServletRequest request) {
        repositoryIds.remove("__malformed_repository_binding__");
        if (repositoryIds.isEmpty()) {
            return Collections.emptySet();
        }
        List<Repo> repositories;
        try {
            repositories = repoMapper.selectList(new LambdaQueryWrapper<Repo>()
                    .and(query -> query.in(Repo::getCoreRepoId, repositoryIds)
                            .or()
                            .in(Repo::getOuterRepoId, repositoryIds))
                    .eq(Repo::getDeleted, false));
        } catch (RuntimeException e) {
            log.error("failed to load repository dependencies while importing workflow", e);
            throw new BusinessException(ResponseEnum.WORKFLOW_IMPORT_FAILED);
        }
        Set<String> sharedRowIds = loadVisibleRepositoryShareIds();
        String uid = UserInfoManagerHandler.getUserId();
        Long spaceId = SpaceInfoUtil.getSpaceId();
        boolean spaceMember = spaceId == null || SpaceInfoUtil.checkUserBelongSpace();
        Set<String> visibleIds = new HashSet<>();
        for (Repo repository : repositories == null ? Collections.<Repo>emptyList() : repositories) {
            boolean shared = repository != null
                    && Integer.valueOf(1).equals(repository.getVisibility())
                    && repository.getId() != null
                    && sharedRowIds.contains(String.valueOf(repository.getId()));
            boolean visible = repository != null && (spaceId == null
                    ? Objects.equals(repository.getUserId(), uid) || shared
                    : spaceMember
                            && (Objects.equals(repository.getSpaceId(), spaceId) || shared));
            if (visible) {
                addNonBlank(visibleIds, repository.getCoreRepoId());
                addNonBlank(visibleIds, repository.getOuterRepoId());
            }
        }
        // Personal selectors also contain remote SparkDesk-RAG datasets which have no local Repo row.
        if (spaceId == null && !visibleIds.containsAll(repositoryIds)) {
            addVisibleRemoteRepositoryIds(repositoryIds, visibleIds, request);
        }
        return visibleIds;
    }

    private void addVisibleRemoteRepositoryIds(Set<String> requestedIds, Set<String> visibleIds,
            HttpServletRequest request) {
        try {
            JSONArray remoteRepositories = repoService.getStarFireData(request);
            List<RepoDto> repositories = RepoService.convertAndMergeJsonArrays(
                    new ArrayList<>(), remoteRepositories, "", null);
            for (RepoDto repository : repositories) {
                if (repository != null && requestedIds.contains(repository.getCoreRepoId())) {
                    addNonBlank(visibleIds, repository.getCoreRepoId());
                }
            }
        } catch (RuntimeException e) {
            log.error("failed to load remote repository dependencies while importing workflow", e);
            throw new BusinessException(ResponseEnum.WORKFLOW_IMPORT_FAILED);
        }
    }

    private Set<String> loadVisibleRepositoryShareIds() {
        List<GroupVisibility> shares;
        try {
            shares = groupVisibilityMapper.getRepoVisibilityList(
                    UserInfoManagerHandler.getUserId(), SpaceInfoUtil.getSpaceId());
        } catch (RuntimeException e) {
            log.error("failed to load shared repository dependencies while importing workflow", e);
            throw new BusinessException(ResponseEnum.WORKFLOW_IMPORT_FAILED);
        }
        return (shares == null ? Collections.<GroupVisibility>emptyList() : shares).stream()
                .filter(Objects::nonNull)
                .map(GroupVisibility::getRelationId)
                .filter(StringUtils::isNotBlank)
                .collect(Collectors.toSet());
    }

    private void collectAgentKnowledgeIds(JSONObject param, Set<String> repositoryIds) {
        JSONObject plugin = param.getJSONObject("plugin");
        JSONArray knowledge = plugin == null ? null : plugin.getJSONArray("knowledge");
        for (Object rawKnowledge : knowledge == null ? new JSONArray() : knowledge) {
            JSONObject item = asJsonObject(rawKnowledge);
            JSONObject match = item == null ? null : item.getJSONObject("match");
            JSONArray ids = match == null ? null : match.getJSONArray("repoIds");
            if (ids == null) {
                repositoryIds.add("__malformed_repository_binding__");
            } else {
                collectStringValues(repositoryIds, ids);
            }
        }
    }

    private void addNonBlank(Set<String> values, String value) {
        if (StringUtils.isNotBlank(value)) {
            values.add(value);
        }
    }

    private record ImportVisibleResources(Set<String> workflowIds, Set<String> repositoryIds,
            Set<Long> databaseIds, ImportToolIndex tools) {}

    private record ImportToolIndex(Map<String, List<ToolBox>> byId,
            Map<String, List<ToolBox>> byName) {
        private List<ToolBox> findById(String id) {
            return byId.getOrDefault(id, Collections.emptyList());
        }

        private List<ToolBox> findByName(String name) {
            return byName.getOrDefault(name, Collections.emptyList());
        }
    }

    /**
     * Process database node during import.
     *
     * @param param Node parameters
     * @param request HTTP request context
     */
    private void cleanDataBaseNode(BizWorkflowNode node, JSONObject param,
            Set<Long> visibleDatabaseIds, WorkflowImportReport report) {
        String dbId = param.getString("dbId");
        Long parsedDbId = parseDatabaseId(dbId);
        if (StringUtils.isNotBlank(dbId)
                && (parsedDbId == null || !visibleDatabaseIds.contains(parsedDbId))) {
            markUnresolved(node, param, "database", "MISSING",
                    "database is not visible in target space", report);
        }
    }

    private Long parseDatabaseId(String rawId) {
        if (!StringUtils.isNumeric(rawId)) {
            return null;
        }
        try {
            return Long.valueOf(rawId);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    /**
     * Process LLM (Large Language Model) node during import.
     *
     * @param param Node parameters
     * @param allowedLlmSet Set of allowed LLM IDs
     * @param uid User ID
     */
    private void cleanLlmNode(JSONObject param, Set<Long> allowedLlmSet, String uid) {
        String source = param.getString("source");
        String paramUid = param.getString("uid");
        Long llmId = param.getLong("llmId");

        // If it's openai and uid matches, allow it to pass
        if ("openai".equals(source) && Objects.equals(paramUid, uid)) {
            return;
        }

        // Other cases: if llmId is not included, clean all
        if (llmId == null || !allowedLlmSet.contains(llmId)) {
            removeLlmParamNew(param);
        }
    }

    /**
     * Process plugin/tool node during import.
     *
     * @param param Node parameters
     * @param uid User ID
     * @param data Node data
     */
    private void resolvePluginNode(BizWorkflowNode node, JSONObject param,
            BizNodeData data, List<Map<String, Object>> dependencyManifest,
            ImportToolIndex tools, WorkflowImportReport report) {
        String sourceId = param.getString("pluginId");
        String sourceName = firstNonBlank(param.getString("pluginName"), data.getPluginName());
        String sourceOperationId = param.getString("operationId");
        String sourceVersion = param.getString("version");
        Map<String, Object> manifest = trustedManifest(
                dependencyManifest, node.getId(), sourceId, sourceName, sourceOperationId);
        if (manifest != null) {
            sourceName = firstNonBlank(stringValue(manifest.get("name")), sourceName);
            sourceOperationId = firstNonBlank(stringValue(manifest.get("operationId")), sourceOperationId);
            sourceVersion = firstNonBlank(stringValue(manifest.get("version")), sourceVersion);
        }

        ToolResolution resolution = resolvePluginTool(
                tools.findById(sourceId), sourceVersion,
                sourceOperationId, manifest, false, data);
        ToolBox target = resolution.target();
        String status = resolution.status();
        String reason = resolution.reason();

        if (target == null && ("MISSING".equals(status) || "INCOMPATIBLE".equals(status))
                && StringUtils.isNotBlank(sourceName)) {
            ToolResolution nameResolution = resolvePluginTool(
                    tools.findByName(sourceName), sourceVersion,
                    sourceOperationId, manifest, true, data);
            if (nameResolution.target() != null
                    || !"MISSING".equals(nameResolution.status())
                    || "MISSING".equals(status)) {
                resolution = nameResolution;
                target = resolution.target();
                status = resolution.status();
                reason = resolution.reason();
            }
        }

        WorkflowImportReportEntry entry = baseEntry(node, "plugin", sourceId, sourceName,
                sourceOperationId, sourceVersion, manifest);
        if (target == null) {
            entry.setStatus(status);
            entry.setReasonCode(resolution.reasonCode());
            entry.setReason(reason == null ? "tool is missing or not visible in target space" : reason);
            entry.setCandidatePluginIds(resolution.candidatePluginIds());
            clearPluginBinding(param, data, entry);
            report.add(entry);
            return;
        }

        IoMergeResult ioMerge = mergeToolIo(data, target);
        if (!ioMerge.compatible()) {
            entry.setStatus("INCOMPATIBLE");
            entry.setReasonCode(StringUtils.equals(sourceId, target.getToolId())
                    ? WorkflowImportReportEntry.REASON_CONTRACT_INCOMPATIBLE
                    : WorkflowImportReportEntry.REASON_SAME_NAME_CONTRACT_INCOMPATIBLE);
            entry.setReason(ioMerge.reason());
            clearPluginBinding(param, data, entry);
            report.add(entry);
            return;
        }

        applyToolTarget(param, data, target, ioMerge);
        entry.setStatus("MAPPED");
        entry.setMappingType(StringUtils.equals(sourceId, target.getToolId())
                ? WorkflowImportReportEntry.MAPPING_SOURCE_ID
                : WorkflowImportReportEntry.MAPPING_COMPATIBLE_NAME);
        entry.setReasonCode(StringUtils.equals(sourceId, target.getToolId())
                ? WorkflowImportReportEntry.REASON_SOURCE_ID_MATCHED
                : WorkflowImportReportEntry.REASON_UNIQUE_COMPATIBLE_NAME_MATCHED);
        entry.setReason(StringUtils.equals(sourceId, target.getToolId())
                ? "source id matched"
                : "unique compatible name matched");
        entry.setTargetPluginId(target.getToolId());
        entry.setTargetOperationId(target.getOperationId());
        entry.setTargetVersion(target.getVersion());
        clearImportMarker(data);
        report.add(entry);
    }

    /**
     * Process workflow node during import.
     *
     * @param param Node parameters
     * @param uid User ID
     * @param data Node data
     */
    private void cleanFlowNode(BizWorkflowNode node, JSONObject param,
            BizNodeData data, Set<String> visibleWorkflowIds, WorkflowImportReport report) {
        String flowId = param.getString("flowId");
        if (StringUtils.isNotBlank(flowId) && !visibleWorkflowIds.contains(flowId)) {
            param.remove("flowId");
            param.remove("uid");
            data.setInputs(Collections.emptyList());
            data.setOutputs(Collections.emptyList());
            addUnresolvedEntry(node, "workflow", flowId,
                    "nested workflow is not visible in target space", report);
        }
    }

    /**
     * Process knowledge base or knowledge base pro node during import.
     *
     * @param param Node parameters
     * @param uid User ID
     * @param allowedLlmSet Set of allowed LLM IDs
     * @param prefix Node type prefix
     */
    private void cleanKnowledgeNode(BizWorkflowNode node, JSONObject param, String uid,
            Set<Long> allowedLlmSet, String prefix, Set<String> visibleRepositoryIds,
            WorkflowImportReport report) {
        if ("knowledge-pro-base".equals(prefix)) {
            cleanLlmNode(param, allowedLlmSet, uid);
        }
        WorkflowKnowledgeBindingParser.KnowledgeBindings bindings =
                WorkflowKnowledgeBindingParser.parse(prefix, param);
        Set<String> boundRepositoryIds = bindings.repositoryIds();
        if (bindings.malformed() || !visibleRepositoryIds.containsAll(boundRepositoryIds)) {
            clearKnowledgeBinding(param);
            addUnresolvedEntry(node, "knowledge",
                    boundRepositoryIds.stream()
                            .filter(id -> !visibleRepositoryIds.contains(id))
                            .findFirst()
                            .orElseGet(() -> boundRepositoryIds.stream().findFirst().orElse(null)),
                    "knowledge base is not visible in target space", report);
        }
    }

    private void collectStringValues(Set<String> values, Object rawValue) {
        if (rawValue instanceof Collection<?> collection) {
            collection.forEach(value -> addNonBlank(values, stringValue(value)));
        } else if (rawValue != null) {
            addNonBlank(values, stringValue(rawValue));
        }
    }

    private void clearKnowledgeBinding(JSONObject param) {
        param.put("repos", Collections.emptyList());
        param.put("repoList", Collections.emptyList());
        param.put("repoId", Collections.emptyList());
        param.put("repoIds", Collections.emptyList());
    }

    /**
     * Process agent node during import.
     *
     * @param param Node parameters
     * @param allowedLlmSet Set of allowed LLM IDs
     * @param request HTTP request context
     */
    private void cleanAgentNode(BizWorkflowNode node, JSONObject param, String uid,
            Set<Long> allowedLlmSet, Set<String> visibleRepositoryIds,
            List<Map<String, Object>> dependencyManifest, ImportToolIndex toolIndex,
            WorkflowImportReport report) {
        cleanAgentLlmBinding(param, allowedLlmSet);
        JSONObject plugin = param.getJSONObject("plugin");
        if (plugin == null) {
            return;
        }
        JSONArray toolsList = plugin.getJSONArray("toolsList");
        cleanAgentKnowledgeBindings(
                node, plugin, toolsList, visibleRepositoryIds, report);
        JSONArray tools = plugin.getJSONArray("tools");
        Set<String> unresolvedToolIds = new HashSet<>();
        cleanAgentRuntimeTools(node, plugin, tools, unresolvedToolIds,
                dependencyManifest, toolIndex, report);
        cleanAgentDisplayTools(node, plugin, unresolvedToolIds,
                dependencyManifest, toolIndex, report);
    }

    private void cleanAgentLlmBinding(JSONObject param, Set<Long> allowedLlmSet) {
        if (allowedLlmSet.contains(param.getLong("llmId"))) {
            return;
        }
        param.remove("serviceId");
        param.remove("llmId");
        JSONObject modelConfig = param.getJSONObject("modelConfig");
        if (modelConfig != null) {
            modelConfig.remove("domain");
            modelConfig.remove("api");
            param.replace("modelConfig", modelConfig);
        }
        param.remove("uid");
    }

    private void cleanAgentKnowledgeBindings(BizWorkflowNode node, JSONObject plugin,
            JSONArray toolsList, Set<String> visibleRepositoryIds,
            WorkflowImportReport report) {
        JSONArray knowledgeArray = plugin.getJSONArray("knowledge");
        if (CollUtil.isEmpty(knowledgeArray) || !hasInvalidAgentKnowledge(
                knowledgeArray, visibleRepositoryIds)) {
            return;
        }
        plugin.put("knowledge", Collections.emptyList());
        if (toolsList != null) {
            toolsList.removeIf(tool -> {
                JSONObject display = asJsonObject(tool);
                return display == null || "knowledge".equals(display.getString("type"));
            });
        }
        addUnresolvedEntry(node, "knowledge", null,
                "one or more knowledge bases are not visible in target space", report);
    }

    private boolean hasInvalidAgentKnowledge(
            JSONArray knowledgeArray, Set<String> visibleRepositoryIds) {
        return knowledgeArray.stream().anyMatch(rawKnowledge -> {
            JSONObject knowledge = asJsonObject(rawKnowledge);
            JSONObject match = knowledge == null ? null : knowledge.getJSONObject("match");
            JSONArray repoIds = match == null ? null : match.getJSONArray("repoIds");
            return repoIds == null || repoIds.stream()
                    .anyMatch(repoId -> !visibleRepositoryIds.contains(String.valueOf(repoId)));
        });
    }

    private void cleanAgentRuntimeTools(BizWorkflowNode node, JSONObject plugin,
            JSONArray tools, Set<String> unresolvedToolIds,
            List<Map<String, Object>> dependencyManifest, ImportToolIndex toolIndex,
            WorkflowImportReport report) {
        for (int i = 0; tools != null && i < tools.size();) {
            boolean removed = cleanAgentRuntimeTool(node, plugin, tools, i,
                    unresolvedToolIds, dependencyManifest, toolIndex, report);
            if (!removed) {
                i++;
            }
        }
    }

    private boolean cleanAgentRuntimeTool(BizWorkflowNode node, JSONObject plugin,
            JSONArray tools, int toolIndexInRuntime, Set<String> unresolvedToolIds,
            List<Map<String, Object>> dependencyManifest, ImportToolIndex toolIndex,
            WorkflowImportReport report) {
        JSONObject toolConfig = asJsonObject(tools.get(toolIndexInRuntime));
        String toolId = toolConfig == null
                ? tools.getString(toolIndexInRuntime)
                : toolConfig.getString("tool_id");
        String sourceVersion = toolConfig == null ? null : toolConfig.getString("version");
        JSONArray toolsList = plugin.getJSONArray("toolsList");
        int toolListIndex = findAgentToolIndex(toolsList, toolId);
        JSONObject toolListItem = toolListIndex < 0
                ? null
                : asJsonObject(toolsList.get(toolListIndex));
        String toolName = toolListItem == null ? null : toolListItem.getString("pluginName");
        String nodeOperationId = toolListItem == null
                ? null
                : toolListItem.getString("operationId");
        AgentToolResolution resolution = resolveAgentTool(node, toolId, toolName,
                nodeOperationId, sourceVersion, toolListItem, dependencyManifest, toolIndex);
        if (resolution.resolution().target() != null) {
            mapAgentRuntimeTool(node, plugin, tools, toolIndexInRuntime, toolConfig,
                    toolListItem, toolListIndex, resolution, report);
            return false;
        }
        tools.remove(toolIndexInRuntime);
        unresolvedToolIds.add(toolId);
        WorkflowImportReportEntry entry = unresolvedAgentToolEntry(node, resolution);
        report.add(entry);
        if (toolListItem == null) {
            toolListItem = new JSONObject()
                    .fluentPut("type", "tool")
                    .fluentPut("toolId", toolId)
                    .fluentPut("name", resolution.toolName());
            toolsList = ensureAgentToolsList(plugin, toolsList);
            toolsList.add(toolListItem);
        }
        markAgentToolUnresolved(toolListItem, entry);
        markImportIssue(node.getData(), entry);
        return true;
    }

    private void mapAgentRuntimeTool(BizWorkflowNode node, JSONObject plugin,
            JSONArray tools, int runtimeIndex, JSONObject toolConfig,
            JSONObject toolListItem, int toolListIndex, AgentToolResolution resolution,
            WorkflowImportReport report) {
        ToolBox target = resolution.resolution().target();
        if (toolConfig == null) {
            tools.set(runtimeIndex, target.getToolId());
        } else {
            toolConfig.put("tool_id", target.getToolId());
            putNullableVersion(toolConfig, "version", target.getVersion());
            tools.set(runtimeIndex, toolConfig);
        }
        JSONArray toolsList = plugin.getJSONArray("toolsList");
        if (toolListItem == null) {
            toolListItem = new JSONObject().fluentPut("type", "tool");
            toolsList = ensureAgentToolsList(plugin, toolsList);
            toolListIndex = toolsList.size();
            toolsList.add(toolListItem);
        }
        applyAgentToolDisplayTarget(toolListItem, target);
        toolsList.set(toolListIndex, toolListItem);
        addMappedAgentToolReport(node, resolution, report);
    }

    private JSONArray ensureAgentToolsList(JSONObject plugin, JSONArray toolsList) {
        if (toolsList != null) {
            return toolsList;
        }
        JSONArray created = new JSONArray();
        plugin.put("toolsList", created);
        return created;
    }

    private void cleanAgentDisplayTools(BizWorkflowNode node, JSONObject plugin,
            Set<String> unresolvedToolIds,
            List<Map<String, Object>> dependencyManifest, ImportToolIndex toolIndex,
            WorkflowImportReport report) {
        JSONArray toolsList = plugin.getJSONArray("toolsList");
        JSONArray runtimeTools = plugin.getJSONArray("tools");
        for (int i = 0; toolsList != null && i < toolsList.size(); i++) {
            JSONObject toolListItem = asJsonObject(toolsList.get(i));
            if (toolListItem == null || !"tool".equals(toolListItem.getString("type"))) {
                continue;
            }
            String toolId = toolListItem.getString("toolId");
            if (containsAgentTool(runtimeTools, toolId) || unresolvedToolIds.contains(toolId)) {
                continue;
            }
            String toolName = toolListItem.getString("pluginName");
            String nodeOperationId = toolListItem.getString("operationId");
            AgentToolResolution resolution = resolveAgentTool(node, toolId, toolName,
                    nodeOperationId, toolListItem.getString("version"), toolListItem,
                    dependencyManifest, toolIndex);
            if (resolution.resolution().target() != null) {
                ToolBox target = resolution.resolution().target();
                applyAgentToolDisplayTarget(toolListItem, target);
                toolsList.set(i, toolListItem);
                if (runtimeTools == null) {
                    runtimeTools = new JSONArray();
                    plugin.put("tools", runtimeTools);
                }
                JSONObject runtimeTool = new JSONObject()
                        .fluentPut("tool_id", target.getToolId());
                putNullableVersion(runtimeTool, "version", target.getVersion());
                runtimeTools.add(runtimeTool);
                addMappedAgentToolReport(node, resolution, report);
            } else {
                unresolvedToolIds.add(toolId);
                WorkflowImportReportEntry entry = unresolvedAgentToolEntry(node, resolution);
                report.add(entry);
                markAgentToolUnresolved(toolListItem, entry);
                markImportIssue(node.getData(), entry);
            }
        }
    }

    private AgentToolResolution resolveAgentTool(BizWorkflowNode node, String toolId,
            String toolName, String nodeOperationId, String sourceVersion,
            JSONObject toolListItem, List<Map<String, Object>> dependencyManifest,
            ImportToolIndex toolIndex) {
        Map<String, Object> manifest = trustedManifest(
                dependencyManifest, node.getId(), toolId, toolName, nodeOperationId);
        String sourceOperationId = firstNonBlank(
                manifest == null ? null : stringValue(manifest.get("operationId")),
                nodeOperationId);
        String resolvedName = firstNonBlank(
                manifest == null ? null : stringValue(manifest.get("name")), toolName);
        String resolvedVersion = firstNonBlank(
                manifest == null ? null : stringValue(manifest.get("version")), sourceVersion);
        ToolResolution resolution = resolveTool(
                toolIndex.findById(toolId), resolvedVersion,
                sourceOperationId, manifest, false);
        boolean verifiableLegacyName = manifest != null
                || toolListItem != null
                        && StringUtils.isNotBlank(toolListItem.getString("pluginName"))
                        && StringUtils.isNotBlank(sourceOperationId);
        if (resolution.target() == null && "MISSING".equals(resolution.status())
                && verifiableLegacyName && StringUtils.isNotBlank(resolvedName)) {
            resolution = resolveTool(toolIndex.findByName(resolvedName), resolvedVersion,
                    sourceOperationId, manifest, true);
        }
        return new AgentToolResolution(toolId, resolvedName, sourceOperationId,
                resolvedVersion, manifest, resolution);
    }

    private void addMappedAgentToolReport(BizWorkflowNode node,
            AgentToolResolution resolution, WorkflowImportReport report) {
        ToolBox target = resolution.resolution().target();
        WorkflowImportReportEntry entry = baseEntry(node, "plugin", resolution.toolId(),
                resolution.toolName(), resolution.sourceOperationId(),
                resolution.sourceVersion(), resolution.manifest());
        entry.setStatus("MAPPED");
        boolean sourceIdMatched = Objects.equals(resolution.toolId(), target.getToolId());
        entry.setMappingType(sourceIdMatched
                ? WorkflowImportReportEntry.MAPPING_SOURCE_ID
                : WorkflowImportReportEntry.MAPPING_COMPATIBLE_NAME);
        entry.setReasonCode(sourceIdMatched
                ? WorkflowImportReportEntry.REASON_SOURCE_ID_MATCHED
                : WorkflowImportReportEntry.REASON_UNIQUE_COMPATIBLE_NAME_MATCHED);
        entry.setReason(sourceIdMatched
                ? "source id matched"
                : "unique compatible name matched");
        entry.setTargetPluginId(target.getToolId());
        entry.setTargetOperationId(target.getOperationId());
        entry.setTargetVersion(target.getVersion());
        report.add(entry);
    }

    private WorkflowImportReportEntry unresolvedAgentToolEntry(
            BizWorkflowNode node, AgentToolResolution resolution) {
        WorkflowImportReportEntry entry = baseEntry(node, "plugin", resolution.toolId(),
                resolution.toolName(), resolution.sourceOperationId(),
                resolution.sourceVersion(), resolution.manifest());
        ToolResolution toolResolution = resolution.resolution();
        entry.setStatus(toolResolution.status());
        entry.setReasonCode(toolResolution.reasonCode());
        entry.setReason(toolResolution.reason());
        entry.setCandidatePluginIds(toolResolution.candidatePluginIds());
        return entry;
    }

    private record AgentToolResolution(String toolId, String toolName,
            String sourceOperationId, String sourceVersion, Map<String, Object> manifest,
            ToolResolution resolution) {}

    private boolean containsAgentTool(JSONArray tools, String toolId) {
        for (int i = 0; tools != null && i < tools.size(); i++) {
            JSONObject tool = asJsonObject(tools.get(i));
            String configuredId = tool == null ? tools.getString(i) : tool.getString("tool_id");
            if (Objects.equals(toolId, configuredId)) {
                return true;
            }
        }
        return false;
    }

    private List<Map<String, Object>> buildDependencyManifest(BizWorkflowData workflowData) {
        if (workflowData == null || workflowData.getNodes() == null) {
            return Collections.emptyList();
        }
        Map<String, ManifestToolReference> references = new LinkedHashMap<>();
        for (BizWorkflowNode node : workflowData.getNodes()) {
            collectManifestToolReferences(node, references);
        }
        if (references.isEmpty()) {
            return Collections.emptyList();
        }
        return resolveDependencyManifest(references);
    }

    private void collectManifestToolReferences(BizWorkflowNode node,
            Map<String, ManifestToolReference> references) {
        if (node == null) {
            return;
        }
        BizNodeData data = node.getData();
        if (data == null || data.getNodeParam() == null || node.getId() == null) {
            return;
        }
        JSONObject param = data.getNodeParam();
        if (node.getId().startsWith("plugin::")) {
            addManifestToolReference(references, node.getId(), param.getString("pluginId"),
                    param.getString("operationId"), param.getString("version"));
        } else if (node.getId().startsWith("agent::")) {
            collectAgentManifestToolReferences(node.getId(), param, references);
        }
    }

    private void collectAgentManifestToolReferences(String nodeId, JSONObject param,
            Map<String, ManifestToolReference> references) {
        JSONObject plugin = param.getJSONObject("plugin");
        JSONArray tools = plugin == null ? null : plugin.getJSONArray("tools");
        for (int i = 0; tools != null && i < tools.size(); i++) {
            JSONObject tool = asJsonObject(tools.get(i));
            String toolId = tool == null ? tools.getString(i) : tool.getString("tool_id");
            String version = tool == null ? null : tool.getString("version");
            addManifestToolReference(references, nodeId, toolId, null, version);
        }
        JSONArray toolsList = plugin == null ? null : plugin.getJSONArray("toolsList");
        for (int i = 0; toolsList != null && i < toolsList.size(); i++) {
            JSONObject tool = asJsonObject(toolsList.get(i));
            if (tool != null && "tool".equals(tool.getString("type"))) {
                addManifestToolReference(references, nodeId, tool.getString("toolId"),
                        tool.getString("operationId"), tool.getString("version"));
            }
        }
    }

    private List<Map<String, Object>> resolveDependencyManifest(
            Map<String, ManifestToolReference> references) {
        Set<String> toolIds = references.values()
                .stream()
                .map(ManifestToolReference::toolId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        List<ToolBox> versions = toolBoxService.list(new LambdaQueryWrapper<ToolBox>()
                .in(ToolBox::getToolId, toolIds)
                .eq(ToolBox::getDeleted, false)
                .eq(ToolBox::getStatus, ToolboxStatusEnum.FORMAL.getCode())
                .orderByDesc(ToolBox::getUpdateTime));
        String uid = UserInfoManagerHandler.getUserId();
        Map<String, List<ToolBox>> versionsByToolId = visibleToolIndex(
                versions, uid, ToolBox::getToolId);
        List<Map<String, Object>> manifest = new ArrayList<>(references.size());
        for (ManifestToolReference reference : references.values()) {
            ToolBox tool = selectManifestVersion(
                    versionsByToolId.get(reference.toolId()), reference.sourceVersion());
            manifest.add(buildManifestTool(reference, tool));
        }
        return manifest;
    }

    private void addManifestToolReference(Map<String, ManifestToolReference> references,
            String nodeId, String toolId, String sourceOperationId, String sourceVersion) {
        if (StringUtils.isBlank(toolId)) {
            return;
        }
        String referenceKey = nodeId + "\u0000" + toolId;
        references.compute(referenceKey, (key, existing) -> existing == null
                ? new ManifestToolReference(nodeId, toolId, sourceOperationId, sourceVersion)
                : new ManifestToolReference(nodeId, toolId,
                        firstNonBlank(existing.sourceOperationId(), sourceOperationId),
                        firstNonBlank(existing.sourceVersion(), sourceVersion)));
    }

    private Map<String, Object> buildManifestTool(
            ManifestToolReference reference, ToolBox tool) {
        Map<String, Object> dependency = new LinkedHashMap<>();
        dependency.put("type", "plugin");
        dependency.put("nodeId", reference.nodeId());
        dependency.put("sourceId", reference.toolId());
        dependency.put("name", tool == null ? null : tool.getName());
        dependency.put("operationId", firstNonBlank(reference.sourceOperationId(),
                tool == null ? null : tool.getOperationId()));
        dependency.put("version", firstNonBlank(reference.sourceVersion(),
                tool == null ? null : tool.getVersion()));
        String contractHash = tool == null ? null : contractHash(tool.getWebSchema());
        dependency.put("contractHash", contractHash);
        dependency.put("stableKey", stableToolKey(tool == null ? null : tool.getName(), contractHash));
        dependency.entrySet().removeIf(entry -> entry.getValue() == null);
        return dependency;
    }

    private record ManifestToolReference(
            String nodeId, String toolId, String sourceOperationId, String sourceVersion) {}

    private ToolBox selectManifestVersion(List<ToolBox> versions, String sourceVersion) {
        if (versions == null || versions.isEmpty()) {
            return null;
        }
        if (StringUtils.isNotBlank(sourceVersion)) {
            Optional<ToolBox> exact = versions.stream()
                    .filter(tool -> StringUtils.equalsIgnoreCase(sourceVersion, tool.getVersion()))
                    .findFirst();
            if (exact.isPresent()) {
                return exact.get();
            }
        }
        return versions.stream()
                .filter(tool -> ToolboxStatusEnum.FORMAL.getCode().equals(tool.getStatus()))
                .max(Comparator.comparing(ToolBox::getVersion,
                        Comparator.nullsFirst(this::compareToolVersions)))
                .orElse(versions.get(0));
    }

    private List<Map<String, Object>> parseDependencyManifest(Object rawManifest) {
        if (rawManifest == null) {
            return Collections.emptyList();
        }
        if (!(rawManifest instanceof List<?> collection)
                || collection.size() > MAX_DEPENDENCY_MANIFEST_ENTRIES) {
            throw invalidWorkflowDsl(null);
        }
        List<Map<String, Object>> manifest = new ArrayList<>(collection.size());
        Set<String> manifestKeys = new HashSet<>();
        for (Object value : collection) {
            if (!(value instanceof Map<?, ?> rawItem)) {
                throw invalidWorkflowDsl(null);
            }
            Map<String, Object> item = parseManifestItem(rawItem);
            String key = item.get("nodeId") + "\u0000" + item.get("sourceId");
            if (!manifestKeys.add(key)) {
                throw invalidWorkflowDsl(null);
            }
            manifest.add(item);
        }
        return manifest;
    }

    private Map<String, Object> parseManifestItem(Map<?, ?> rawItem) {
        Map<String, Object> item = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : rawItem.entrySet()) {
            if (!(entry.getKey() instanceof String key) || !MANIFEST_FIELDS.contains(key)) {
                throw invalidWorkflowDsl(null);
            }
            if (entry.getValue() != null && !(entry.getValue() instanceof String)) {
                throw invalidWorkflowDsl(null);
            }
            item.put(key, entry.getValue());
        }

        String type = requiredManifestString(item, "type", MAX_MANIFEST_ID_LENGTH);
        String nodeId = requiredManifestString(item, "nodeId", MAX_MANIFEST_ID_LENGTH);
        requiredManifestString(item, "sourceId", MAX_MANIFEST_ID_LENGTH);
        if (!"plugin".equals(type)
                || !(nodeId.startsWith("plugin::") || nodeId.startsWith("agent::"))) {
            throw invalidWorkflowDsl(null);
        }
        optionalManifestString(item, "name", MAX_MANIFEST_NAME_LENGTH);
        optionalManifestString(item, "operationId", MAX_MANIFEST_OPERATION_LENGTH);
        optionalManifestString(item, "version", MAX_MANIFEST_VERSION_LENGTH);
        validateManifestDigest(item, "contractHash");
        validateManifestDigest(item, "stableKey");
        if (item.containsKey("stableKey") && !item.containsKey("contractHash")) {
            throw invalidWorkflowDsl(null);
        }
        return item;
    }

    private String requiredManifestString(
            Map<String, Object> item, String field, int maxLength) {
        String value = optionalManifestString(item, field, maxLength);
        if (StringUtils.isBlank(value)) {
            throw invalidWorkflowDsl(null);
        }
        return value;
    }

    private String optionalManifestString(
            Map<String, Object> item, String field, int maxLength) {
        if (!item.containsKey(field)) {
            return null;
        }
        String value = (String) item.get(field);
        if (StringUtils.isBlank(value) || value.length() > maxLength) {
            throw invalidWorkflowDsl(null);
        }
        return value;
    }

    private void validateManifestDigest(Map<String, Object> item, String field) {
        String value = optionalManifestString(item, field, SHA256_HEX_LENGTH);
        if (value != null && (value.length() != SHA256_HEX_LENGTH
                || !value.matches("[0-9a-f]{64}"))) {
            throw invalidWorkflowDsl(null);
        }
    }

    private Map<String, Object> findManifest(List<Map<String, Object>> manifest,
            String nodeId, String sourceId) {
        if (manifest == null || StringUtils.isBlank(sourceId)) {
            return null;
        }
        return manifest.stream()
                .filter(item -> "plugin".equals(stringValue(item.get("type"))))
                .filter(item -> Objects.equals(nodeId, stringValue(item.get("nodeId"))))
                .filter(item -> Objects.equals(sourceId, stringValue(item.get("sourceId"))))
                .findFirst()
                .orElse(null);
    }

    /**
     * A manifest is only a portable hint. Bind it back to stable source-node metadata before its name
     * or digest can influence cross-id matching; editable labels alone are insufficient.
     */
    private Map<String, Object> trustedManifest(List<Map<String, Object>> manifest,
            String nodeId, String sourceId, String sourceName, String sourceOperationId) {
        Map<String, Object> item = findManifest(manifest, nodeId, sourceId);
        if (item == null) {
            return null;
        }
        String manifestOperationId = stringValue(item.get("operationId"));
        if (StringUtils.isNotBlank(sourceOperationId)) {
            return Objects.equals(sourceOperationId, manifestOperationId) ? item : null;
        }
        String manifestName = stringValue(item.get("name"));
        return StringUtils.isNotBlank(sourceName) && Objects.equals(sourceName, manifestName)
                ? item
                : null;
    }

    /**
     * Chooses one deterministic, compatible version from a logical tool candidate set.
     *
     * <p>
     * Tool versions are stored as multiple rows sharing a tool ID. An exact source version wins;
     * otherwise the latest compatible version wins when that latest version is unique. Name fallback is
     * stricter: candidates are filtered by the exported contract before version selection.
     * </p>
     */
    private ToolResolution resolveTool(List<ToolBox> candidates, String sourceVersion,
            String sourceOperationId, Map<String, Object> manifest, boolean nameFallback) {
        return resolveTool(candidates, sourceVersion, sourceOperationId, manifest, nameFallback,
                null);
    }

    private ToolResolution resolvePluginTool(List<ToolBox> candidates, String sourceVersion,
            String sourceOperationId, Map<String, Object> manifest, boolean nameFallback,
            BizNodeData sourceData) {
        return resolveTool(candidates, sourceVersion, sourceOperationId, manifest, nameFallback,
                sourceData);
    }

    private ToolResolution resolveTool(List<ToolBox> candidates, String sourceVersion,
            String sourceOperationId, Map<String, Object> manifest, boolean nameFallback,
            BizNodeData sourceData) {
        if (candidates == null || candidates.isEmpty()) {
            return ToolResolution.missing();
        }

        boolean ioContractAvailable = hasExistingIo(sourceData);
        List<ToolBox> schemaValidCandidates = candidates.stream()
                .filter(candidate -> validateTargetWebSchema(candidate,
                        parseWebSchema(candidate.getWebSchema())) == null)
                .toList();
        if (schemaValidCandidates.isEmpty()) {
            String schemaIssue = candidates.stream()
                    .map(candidate -> validateTargetWebSchema(candidate,
                            parseWebSchema(candidate.getWebSchema())))
                    .filter(Objects::nonNull)
                    .findFirst()
                    .orElse("target webSchema cannot be parsed");
            return ToolResolution.incompatible(
                    nameFallback
                            ? WorkflowImportReportEntry.REASON_SAME_NAME_CONTRACT_INCOMPATIBLE
                            : WorkflowImportReportEntry.REASON_CONTRACT_INCOMPATIBLE,
                    schemaIssue);
        }
        List<ToolBox> compatible = schemaValidCandidates.stream()
                .filter(candidate -> !ioContractAvailable
                        || validateToolIoContract(sourceData, candidate) == null)
                .filter(candidate -> ioContractAvailable
                        || contractCompatible(sourceOperationId, manifest, candidate))
                .toList();
        if (compatible.isEmpty()) {
            String ioIssue = ioContractAvailable
                    ? schemaValidCandidates.stream()
                            .map(candidate -> validateToolIoContract(sourceData, candidate))
                            .filter(Objects::nonNull)
                            .findFirst()
                            .orElse(null)
                    : null;
            return ToolResolution.incompatible(
                    nameFallback
                            ? WorkflowImportReportEntry.REASON_SAME_NAME_CONTRACT_INCOMPATIBLE
                            : WorkflowImportReportEntry.REASON_CONTRACT_INCOMPATIBLE,
                    ioIssue != null
                            ? ioIssue
                            : nameFallback
                                    ? "same-name tool has an incompatible contract"
                                    : "operation or webSchema contract is incompatible");
        }

        List<ToolBox> logicalCandidates = compatible;
        String duplicateReason = "multiple visible tool rows share the source id and version";
        if (nameFallback) {
            Map<String, List<ToolBox>> logicalTools = compatible.stream()
                    .filter(candidate -> StringUtils.isNotBlank(candidate.getToolId()))
                    .collect(Collectors.groupingBy(ToolBox::getToolId, LinkedHashMap::new,
                            Collectors.toList()));
            if (logicalTools.isEmpty()) {
                return ToolResolution.missing();
            }
            if (logicalTools.size() > 1) {
                return ToolResolution.ambiguous(
                        WorkflowImportReportEntry.REASON_MULTIPLE_COMPATIBLE_TOOLS,
                        "multiple compatible tools have the same name",
                        logicalTools.keySet());
            }
            logicalCandidates = logicalTools.values().iterator().next();
            duplicateReason = "multiple visible tool rows share the same name, id and version";
        }

        List<ToolBox> scopedCandidates = logicalCandidates;
        boolean exactVersionFound = false;
        if (StringUtils.isNotBlank(sourceVersion)) {
            List<ToolBox> exactVersion = logicalCandidates.stream()
                    .filter(candidate -> StringUtils.equalsIgnoreCase(
                            sourceVersion, candidate.getVersion()))
                    .toList();
            if (!exactVersion.isEmpty()) {
                scopedCandidates = exactVersion;
                exactVersionFound = true;
            }
        }
        return resolveVersionWithinLogicalTool(scopedCandidates,
                exactVersionFound, duplicateReason);
    }

    private ToolResolution resolveVersionWithinLogicalTool(List<ToolBox> candidates,
            boolean exactVersionFound, String duplicateReason) {
        if (exactVersionFound) {
            return candidates.size() == 1
                    ? ToolResolution.mapped(candidates.get(0))
                    : ToolResolution.ambiguous(
                            WorkflowImportReportEntry.REASON_MULTIPLE_TOOL_VERSIONS,
                            duplicateReason,
                            candidates.stream().map(ToolBox::getToolId).filter(StringUtils::isNotBlank).toList());
        }
        ToolBox latestCandidate = candidates.stream()
                .max(Comparator.comparing(ToolBox::getVersion,
                        Comparator.nullsFirst(this::compareToolVersions)))
                .orElse(null);
        String latestVersion = latestCandidate == null ? null : latestCandidate.getVersion();
        List<ToolBox> latest = candidates.stream()
                .filter(candidate -> Objects.equals(latestVersion, candidate.getVersion()))
                .toList();
        return latest.size() == 1
                ? ToolResolution.mapped(latest.get(0))
                : ToolResolution.ambiguous(
                        WorkflowImportReportEntry.REASON_MULTIPLE_TOOL_VERSIONS,
                        duplicateReason,
                        latest.stream().map(ToolBox::getToolId).filter(StringUtils::isNotBlank).toList());
    }

    private int compareToolVersions(String left, String right) {
        List<Integer> leftParts = versionParts(left);
        List<Integer> rightParts = versionParts(right);
        int length = Math.max(leftParts.size(), rightParts.size());
        for (int i = 0; i < length; i++) {
            int leftPart = i < leftParts.size() ? leftParts.get(i) : 0;
            int rightPart = i < rightParts.size() ? rightParts.get(i) : 0;
            int compared = Integer.compare(leftPart, rightPart);
            if (compared != 0) {
                return compared;
            }
        }
        return StringUtils.defaultString(left).compareToIgnoreCase(StringUtils.defaultString(right));
    }

    private List<Integer> versionParts(String version) {
        if (StringUtils.isBlank(version)) {
            return Collections.emptyList();
        }
        List<Integer> result = new ArrayList<>();
        java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("\\d+").matcher(version);
        while (matcher.find()) {
            try {
                result.add(Integer.parseInt(matcher.group()));
            } catch (NumberFormatException ignored) {
                result.add(Integer.MAX_VALUE);
            }
        }
        return result;
    }

    private record ToolResolution(ToolBox target, String status, String reasonCode, String reason,
            List<String> candidatePluginIds) {
        private static ToolResolution mapped(ToolBox target) {
            return new ToolResolution(target, "MAPPED", null, null, Collections.emptyList());
        }

        private static ToolResolution missing() {
            return new ToolResolution(null, "MISSING", WorkflowImportReportEntry.REASON_TOOL_MISSING,
                    "tool is missing or not visible in target space", Collections.emptyList());
        }

        private static ToolResolution incompatible(String reasonCode, String reason) {
            return new ToolResolution(null, "INCOMPATIBLE", reasonCode, reason,
                    Collections.emptyList());
        }

        private static ToolResolution ambiguous(String reasonCode, String reason,
                Collection<String> candidatePluginIds) {
            return new ToolResolution(null, "AMBIGUOUS", reasonCode, reason,
                    candidatePluginIds == null ? Collections.emptyList()
                            : candidatePluginIds.stream()
                                    .filter(StringUtils::isNotBlank)
                                    .distinct()
                                    .sorted()
                                    .toList());
        }
    }

    private boolean isToolVisible(ToolBox tool, String uid) {
        if (tool == null || Boolean.TRUE.equals(tool.getDeleted())
                || !ToolboxStatusEnum.FORMAL.getCode().equals(tool.getStatus())) {
            return false;
        }
        if (Boolean.TRUE.equals(tool.getIsPublic())
                || Objects.equals(tool.getUserId(), bizConfig.getAdminUid())) {
            return true;
        }
        Long currentSpaceId = SpaceInfoUtil.getSpaceId();
        boolean ownedInCurrentScope = currentSpaceId == null
                ? Objects.equals(tool.getUserId(), uid) && tool.getSpaceId() == null
                : Objects.equals(tool.getSpaceId(), currentSpaceId)
                        && SpaceInfoUtil.checkUserBelongSpace();
        return ownedInCurrentScope;
    }

    private boolean contractCompatible(String sourceOperationId, Map<String, Object> manifest,
            ToolBox target) {
        if (target == null) {
            return false;
        }
        if (manifest == null) {
            return StringUtils.isBlank(sourceOperationId)
                    || Objects.equals(sourceOperationId, target.getOperationId());
        }
        String expectedHash = stringValue(manifest.get("contractHash"));
        if (StringUtils.isNotBlank(expectedHash)) {
            return Objects.equals(expectedHash, contractHash(target.getWebSchema()));
        }
        String expectedStableKey = stringValue(manifest.get("stableKey"));
        if (StringUtils.isNotBlank(expectedStableKey)) {
            return Objects.equals(expectedStableKey,
                    stableToolKey(target.getName(), contractHash(target.getWebSchema())));
        }
        return StringUtils.isBlank(sourceOperationId)
                || Objects.equals(sourceOperationId, target.getOperationId());
    }

    private void applyToolTarget(JSONObject param, BizNodeData data, ToolBox target,
            IoMergeResult ioMerge) {
        param.put("pluginId", target.getToolId());
        param.put("operationId", target.getOperationId());
        putNullableVersion(param, "version", target.getVersion());
        param.put("appId", commonConfig.getAppId());
        param.put("uid", UserInfoManagerHandler.getUserId());
        param.put("toolDescription", target.getDescription());
        param.remove("pluginName");
        removeSensitivePluginFields(param);

        data.setInputs(ioMerge.inputs());
        data.setOutputs(ioMerge.outputs());
        data.setPluginName(target.getName());
        data.setIsLatest(true);
        param.put("businessInput", businessInputNames(ioMerge.targetInputs()));
    }

    /**
     * Validates and merges plugin I/O before changing the binding. Existing fields must remain at the
     * same path with the same normalized type; the target may add fields. The returned lists follow the
     * target shape and retain portable runtime state from matching source fields.
     */
    private IoMergeResult mergeToolIo(BizNodeData data, ToolBox target) {
        WebSchema webSchema = parseWebSchema(target == null ? null : target.getWebSchema());
        String targetSchemaIssue = validateTargetWebSchema(target, webSchema);
        if (targetSchemaIssue != null) {
            return IoMergeResult.incompatible(targetSchemaIssue);
        }
        List<WebSchemaItem> targetInputs = visibleSchemaItems(
                webSchema == null ? null : webSchema.getToolRequestInput());
        List<WebSchemaItem> targetOutputs = visibleSchemaItems(
                webSchema == null ? null : webSchema.getToolRequestOutput());
        List<BizInputOutput> sourceInputs = safeIo(data == null ? null : data.getInputs());
        List<BizInputOutput> sourceOutputs = safeIo(data == null ? null : data.getOutputs());

        String inputIssue = validateIoContract(sourceInputs, targetInputs, "input");
        if (inputIssue != null) {
            return IoMergeResult.incompatible(inputIssue);
        }
        String outputIssue = validateIoContract(sourceOutputs, targetOutputs, "output");
        if (outputIssue != null) {
            return IoMergeResult.incompatible(outputIssue);
        }
        return IoMergeResult.compatible(
                mergeIoFields(sourceInputs, targetInputs, true),
                mergeIoFields(sourceOutputs, targetOutputs, false),
                targetInputs);
    }

    private boolean hasExistingIo(BizNodeData data) {
        return data != null && ((data.getInputs() != null && !data.getInputs().isEmpty())
                || (data.getOutputs() != null && !data.getOutputs().isEmpty()));
    }

    private String validateToolIoContract(BizNodeData data, ToolBox target) {
        WebSchema webSchema = parseWebSchema(target == null ? null : target.getWebSchema());
        String targetSchemaIssue = validateTargetWebSchema(target, webSchema);
        if (targetSchemaIssue != null) {
            return targetSchemaIssue;
        }
        String inputIssue = validateIoContract(safeIo(data == null ? null : data.getInputs()),
                visibleSchemaItems(webSchema == null ? null : webSchema.getToolRequestInput()),
                "input");
        return inputIssue != null
                ? inputIssue
                : validateIoContract(safeIo(data == null ? null : data.getOutputs()),
                        visibleSchemaItems(
                                webSchema == null ? null : webSchema.getToolRequestOutput()),
                        "output");
    }

    private String validateTargetWebSchema(ToolBox target, WebSchema schema) {
        if (target == null || schema == null) {
            return "target webSchema cannot be parsed";
        }
        String inputIssue = validateTargetItems(schema.getToolRequestInput(), "input");
        return inputIssue != null
                ? inputIssue
                : validateTargetItems(schema.getToolRequestOutput(), "output");
    }

    private String validateTargetItems(List<WebSchemaItem> items, String parentPath) {
        Set<String> names = new HashSet<>();
        for (WebSchemaItem item : visibleSchemaItems(items)) {
            if (StringUtils.isBlank(item.getName())) {
                return parentPath + " target contract contains a field without a name";
            }
            if (!names.add(item.getName())) {
                return parentPath + "." + item.getName()
                        + " is duplicated in target contract";
            }
            String path = parentPath + "." + item.getName();
            String type = normalizeType(item.getType());
            if ("array".equals(type) && firstSchemaChild(item) == null) {
                return path + " array item schema is missing";
            }
            String nestedIssue = validateTargetItems(targetProperties(item), path);
            if (nestedIssue != null) {
                return nestedIssue;
            }
        }
        return null;
    }

    private List<BizInputOutput> safeIo(List<BizInputOutput> values) {
        return values == null ? Collections.emptyList() : values;
    }

    private List<WebSchemaItem> visibleSchemaItems(List<WebSchemaItem> items) {
        if (items == null) {
            return Collections.emptyList();
        }
        return items.stream()
                .filter(Objects::nonNull)
                .filter(item -> !Boolean.FALSE.equals(item.getOpen()))
                .toList();
    }

    private String validateIoContract(List<BizInputOutput> source,
            List<WebSchemaItem> target, String direction) {
        String duplicateSource = duplicateIoName(source);
        if (duplicateSource != null) {
            return direction + "." + duplicateSource + " is duplicated in source contract";
        }
        String duplicateTarget = duplicateTargetName(target);
        if (duplicateTarget != null) {
            return direction + "." + duplicateTarget + " is duplicated in target contract";
        }
        Map<String, WebSchemaItem> targets = indexTargetItems(target);
        for (BizInputOutput field : source) {
            if (field == null || StringUtils.isBlank(field.getName())) {
                return direction + " contains a field without a name";
            }
            WebSchemaItem targetField = targets.get(field.getName());
            String path = direction + "." + field.getName();
            if (targetField == null) {
                return path + " is missing from target contract";
            }
            String sourceType = normalizeType(
                    field.getSchema() == null ? null : field.getSchema().getType());
            String targetType = normalizeTargetType(targetField);
            if (!Objects.equals(sourceType, targetType)) {
                return path + " changed type from " + sourceType + " to " + targetType;
            }
            String nestedIssue = validatePropertyContract(
                    field.getSchema() == null ? null : field.getSchema().getProperties(),
                    targetProperties(targetField), path);
            if (nestedIssue != null) {
                return nestedIssue;
            }
        }
        return null;
    }

    private String validatePropertyContract(List<BizProperty> source,
            List<WebSchemaItem> target, String parentPath) {
        String duplicateSource = duplicatePropertyName(source);
        if (duplicateSource != null) {
            return parentPath + "." + duplicateSource + " is duplicated in source contract";
        }
        String duplicateTarget = duplicateTargetName(target);
        if (duplicateTarget != null) {
            return parentPath + "." + duplicateTarget + " is duplicated in target contract";
        }
        Map<String, WebSchemaItem> targets = indexTargetItems(target);
        for (BizProperty property : source == null ? Collections.<BizProperty>emptyList() : source) {
            if (property == null || StringUtils.isBlank(property.getName())) {
                return parentPath + " contains a property without a name";
            }
            String path = parentPath + "." + property.getName();
            WebSchemaItem targetProperty = targets.get(property.getName());
            if (targetProperty == null) {
                return path + " is missing from target contract";
            }
            String sourceType = normalizeType(property.getType());
            String targetType = normalizeTargetType(targetProperty);
            if (!Objects.equals(sourceType, targetType)) {
                return path + " changed type from " + sourceType + " to " + targetType;
            }
            String nestedIssue = validatePropertyContract(property.getProperties(),
                    targetProperties(targetProperty), path);
            if (nestedIssue != null) {
                return nestedIssue;
            }
        }
        return null;
    }

    private String duplicateIoName(List<BizInputOutput> fields) {
        Set<String> names = new HashSet<>();
        for (BizInputOutput field : fields == null
                ? Collections.<BizInputOutput>emptyList()
                : fields) {
            if (field != null && StringUtils.isNotBlank(field.getName())
                    && !names.add(field.getName())) {
                return field.getName();
            }
        }
        return null;
    }

    private String duplicatePropertyName(List<BizProperty> fields) {
        Set<String> names = new HashSet<>();
        for (BizProperty field : fields == null
                ? Collections.<BizProperty>emptyList()
                : fields) {
            if (field != null && StringUtils.isNotBlank(field.getName())
                    && !names.add(field.getName())) {
                return field.getName();
            }
        }
        return null;
    }

    private String duplicateTargetName(List<WebSchemaItem> fields) {
        Set<String> names = new HashSet<>();
        for (WebSchemaItem field : visibleSchemaItems(fields)) {
            if (StringUtils.isNotBlank(field.getName()) && !names.add(field.getName())) {
                return field.getName();
            }
        }
        return null;
    }

    private Map<String, WebSchemaItem> indexTargetItems(List<WebSchemaItem> items) {
        Map<String, WebSchemaItem> result = new LinkedHashMap<>();
        for (WebSchemaItem item : visibleSchemaItems(items)) {
            if (StringUtils.isNotBlank(item.getName())) {
                result.putIfAbsent(item.getName(), item);
            }
        }
        return result;
    }

    private String normalizeTargetType(WebSchemaItem item) {
        if (item == null) {
            return normalizeType(null);
        }
        String type = normalizeType(item.getType());
        if (!"array".equals(type)) {
            return type;
        }
        WebSchemaItem arrayItem = firstSchemaChild(item);
        return "array-" + normalizeType(arrayItem == null ? "object" : arrayItem.getType());
    }

    private String normalizeType(String type) {
        String normalized = StringUtils.defaultIfBlank(type, "string")
                .trim()
                .toLowerCase(Locale.ROOT)
                .replace('_', '-');
        if ("int".equals(normalized)) {
            return "integer";
        }
        if ("bool".equals(normalized)) {
            return "boolean";
        }
        if (normalized.startsWith("array-")) {
            return "array-" + normalizeType(normalized.substring("array-".length()));
        }
        return normalized;
    }

    private WebSchemaItem firstSchemaChild(WebSchemaItem item) {
        return item == null || item.getChildren() == null || item.getChildren().isEmpty()
                ? null
                : item.getChildren().get(0);
    }

    private List<WebSchemaItem> targetProperties(WebSchemaItem item) {
        String type = normalizeTargetType(item);
        if ("array-object".equals(type)) {
            WebSchemaItem arrayItem = firstSchemaChild(item);
            return visibleSchemaItems(arrayItem == null ? null : arrayItem.getChildren());
        }
        if ("object".equals(type)) {
            return visibleSchemaItems(item == null ? null : item.getChildren());
        }
        return Collections.emptyList();
    }

    private List<BizInputOutput> mergeIoFields(List<BizInputOutput> source,
            List<WebSchemaItem> target, boolean input) {
        Map<String, BizInputOutput> sourceByName = source.stream()
                .filter(Objects::nonNull)
                .filter(field -> StringUtils.isNotBlank(field.getName()))
                .collect(Collectors.toMap(BizInputOutput::getName, field -> field,
                        (first, ignored) -> first, LinkedHashMap::new));
        List<BizInputOutput> merged = new ArrayList<>();
        for (WebSchemaItem targetField : visibleSchemaItems(target)) {
            BizInputOutput field = toBizInputOutput(targetField, input);
            BizInputOutput old = sourceByName.get(targetField.getName());
            if (old != null) {
                preserveIoRuntimeState(field, old);
                field.getSchema()
                        .setProperties(mergeProperties(
                                old.getSchema() == null ? null : old.getSchema().getProperties(),
                                targetProperties(targetField)));
            }
            merged.add(field);
        }
        return merged;
    }

    private void preserveIoRuntimeState(BizInputOutput target, BizInputOutput source) {
        if (StringUtils.isNotBlank(source.getId())) {
            target.setId(source.getId());
        }
        target.setNameErrMsg(source.getNameErrMsg());
        target.setAllowedFileType(source.getAllowedFileType());
        target.setFileType(source.getFileType());
        target.setRefId(source.getRefId());
        target.setDeleteDisabled(source.getDeleteDisabled());
        target.setDisabled(source.getDisabled());
        target.setCustomParameterType(source.getCustomParameterType());
        if (source.getSchema() != null) {
            if (source.getSchema().getValue() != null) {
                target.getSchema().setValue(source.getSchema().getValue());
            }
            if (source.getSchema().getDft() != null) {
                target.getSchema().setDft(source.getSchema().getDft());
            }
            target.getSchema().setItem(source.getSchema().getItem());
        }
    }

    private List<BizProperty> mergeProperties(List<BizProperty> source,
            List<WebSchemaItem> target) {
        Map<String, BizProperty> sourceByName = (source == null
                ? Collections.<BizProperty>emptyList()
                : source).stream()
                .filter(Objects::nonNull)
                .filter(field -> StringUtils.isNotBlank(field.getName()))
                .collect(Collectors.toMap(BizProperty::getName, field -> field,
                        (first, ignored) -> first, LinkedHashMap::new));
        List<BizProperty> merged = new ArrayList<>();
        for (WebSchemaItem targetField : visibleSchemaItems(target)) {
            BizProperty field = toBizProperty(targetField);
            BizProperty old = sourceByName.get(targetField.getName());
            if (old != null) {
                if (StringUtils.isNotBlank(old.getId())) {
                    field.setId(old.getId());
                }
                if (old.getDft() != null) {
                    field.setDft(old.getDft());
                }
                field.setProperties(mergeProperties(old.getProperties(),
                        targetProperties(targetField)));
            }
            merged.add(field);
        }
        return merged;
    }

    private record IoMergeResult(boolean compatible, String reason,
            List<BizInputOutput> inputs, List<BizInputOutput> outputs,
            List<WebSchemaItem> targetInputs) {
        private static IoMergeResult compatible(List<BizInputOutput> inputs,
                List<BizInputOutput> outputs, List<WebSchemaItem> targetInputs) {
            return new IoMergeResult(true, null, inputs, outputs, targetInputs);
        }

        private static IoMergeResult incompatible(String reason) {
            return new IoMergeResult(false, reason, Collections.emptyList(),
                    Collections.emptyList(), Collections.emptyList());
        }
    }

    private void clearPluginBinding(JSONObject param, BizNodeData data,
            WorkflowImportReportEntry entry) {
        param.remove("pluginId");
        param.remove("operationId");
        param.remove("version");
        param.remove("uid");
        param.put("businessInput", Collections.emptyList());
        removeSensitivePluginFields(param);
        data.setInputs(Collections.emptyList());
        data.setOutputs(Collections.emptyList());
        markImportIssue(data, entry);
    }

    private void applyAgentToolDisplayTarget(JSONObject toolListItem, ToolBox target) {
        toolListItem.put("toolId", target.getToolId());
        toolListItem.put("name", target.getName());
        toolListItem.put("pluginName", target.getName());
        putNullableVersion(toolListItem, "version", target.getVersion());
        toolListItem.put("description", target.getDescription());
        toolListItem.put("operationId", target.getOperationId());
        toolListItem.put("isLatest", true);
        toolListItem.remove("importDependencyStatus");
        toolListItem.remove("importDependencyReason");
        toolListItem.remove("sourcePluginId");
        toolListItem.remove("sourceOperationId");
        toolListItem.remove("sourceVersion");
        toolListItem.remove("candidatePluginIds");
    }

    private void markAgentToolUnresolved(JSONObject toolListItem,
            WorkflowImportReportEntry entry) {
        if (toolListItem == null) {
            return;
        }
        toolListItem.put("importDependencyStatus", entry.getStatus());
        toolListItem.put("importDependencyReason", entry.getReason());
        toolListItem.put("sourcePluginId", entry.getSourcePluginId());
        toolListItem.put("sourceOperationId", entry.getSourceOperationId());
        toolListItem.put("sourceVersion", entry.getSourceVersion());
        toolListItem.put("candidatePluginIds", entry.getCandidatePluginIds());
        toolListItem.put("isLatest", false);
    }

    /** Preserve the authoritative version value so execution validation sees the same identity. */
    private void putNullableVersion(JSONObject target, String key, String version) {
        if (StringUtils.isBlank(version)) {
            target.remove(key);
        } else {
            target.put(key, version);
        }
    }

    private List<BizInputOutput> toBizInputs(List<WebSchemaItem> items) {
        List<BizInputOutput> result = new ArrayList<>();
        for (WebSchemaItem item : items) {
            if (item == null || Boolean.FALSE.equals(item.getOpen())) {
                continue;
            }
            BizInputOutput input = toBizInputOutput(item, true);
            BizValue value = new BizValue();
            value.setType("ref");
            value.setContent(new JSONObject());
            input.getSchema().setValue(value);
            input.setDisabled(false);
            result.add(input);
        }
        return result;
    }

    private List<BizInputOutput> toBizOutputs(List<WebSchemaItem> items) {
        List<BizInputOutput> result = new ArrayList<>();
        for (WebSchemaItem item : items) {
            if (item == null || Boolean.FALSE.equals(item.getOpen())) {
                continue;
            }
            result.add(toBizInputOutput(item, false));
        }
        return result;
    }

    private BizInputOutput toBizInputOutput(WebSchemaItem item, boolean input) {
        BizInputOutput result = new BizInputOutput();
        result.setId(UUID.randomUUID().toString());
        result.setName(item.getName());
        result.setDescription(item.getDescription());
        result.setRequired(Boolean.TRUE.equals(item.getRequired()));
        BizSchema schema = new BizSchema();
        applySchema(schema, item);
        result.setSchema(schema);
        if (input) {
            BizValue value = new BizValue();
            value.setType("ref");
            value.setContent(new JSONObject());
            schema.setValue(value);
            result.setDisabled(false);
        } else {
            result.setRequired(false);
        }
        return result;
    }

    private void applySchema(BizSchema schema, WebSchemaItem item) {
        String type = StringUtils.defaultIfBlank(item.getType(), "string");
        if ("array".equals(type)) {
            WebSchemaItem child = firstSchemaChild(item);
            String childType = child == null ? "object"
                    : StringUtils.defaultIfBlank(child.getType(), "object");
            schema.setType("array-" + normalizeType(childType));
            if ("object".equals(childType)) {
                schema.setProperties(toBizProperties(child == null ? null : child.getChildren()));
            }
        } else {
            schema.setType(normalizeType(type));
            if ("object".equals(type)) {
                schema.setProperties(toBizProperties(item.getChildren()));
            }
        }
        schema.setDft(item.getDft());
        schema.setDescription(item.getDescription());
    }

    private List<BizProperty> toBizProperties(List<WebSchemaItem> items) {
        if (items == null) {
            return Collections.emptyList();
        }
        List<BizProperty> properties = new ArrayList<>();
        for (WebSchemaItem item : items) {
            if (item == null || Boolean.FALSE.equals(item.getOpen())) {
                continue;
            }
            properties.add(toBizProperty(item));
        }
        return properties;
    }

    private BizProperty toBizProperty(WebSchemaItem item) {
        BizProperty property = new BizProperty();
        property.setId(UUID.randomUUID().toString());
        property.setName(item.getName());
        property.setType(normalizeTargetType(item));
        property.setRequired(Boolean.TRUE.equals(item.getRequired()));
        property.setDft(item.getDft() == null ? null : String.valueOf(item.getDft()));
        property.setProperties(toBizProperties(targetProperties(item)));
        return property;
    }

    private List<String> businessInputNames(List<WebSchemaItem> items) {
        List<String> names = new ArrayList<>();
        collectBusinessInputNames(items, names, false);
        return names;
    }

    private void collectBusinessInputNames(List<WebSchemaItem> items, List<String> names,
            boolean insideArray) {
        if (items == null) {
            return;
        }
        for (WebSchemaItem item : items) {
            if (item == null) {
                continue;
            }
            if (!insideArray && Objects.equals(item.getFrom(), 1)
                    && StringUtils.isNotBlank(item.getName())) {
                names.add(item.getName());
            }
            collectBusinessInputNames(item.getChildren(), names,
                    insideArray || "array".equals(item.getType()));
        }
    }

    private WorkflowImportReportEntry baseEntry(BizWorkflowNode node, String dependencyType,
            String sourceId, String sourceName, String sourceOperationId, String sourceVersion,
            Map<String, Object> manifest) {
        WorkflowImportReportEntry entry = new WorkflowImportReportEntry();
        entry.setNodeId(node == null ? null : node.getId());
        entry.setNodeType(node == null || node.getId() == null
                ? null
                : node.getId().split("::")[0]);
        entry.setDependencyType(dependencyType);
        entry.setSourcePluginId(sourceId);
        entry.setSourceName(sourceName);
        entry.setSourceOperationId(sourceOperationId);
        entry.setSourceVersion(sourceVersion);
        entry.setSourceStableKey(manifest == null ? null
                : stringValue(manifest.get("stableKey")));
        return entry;
    }

    private void addUnresolvedEntry(BizWorkflowNode node, String dependencyType,
            String sourceId, String reason, WorkflowImportReport report) {
        WorkflowImportReportEntry entry = baseEntry(node, dependencyType, sourceId,
                node == null || node.getData() == null ? null : node.getData().getLabel(),
                null, null, null);
        entry.setStatus("MISSING");
        entry.setReason(reason);
        report.add(entry);
        if (node != null && node.getData() != null) {
            markImportIssue(node.getData(), entry);
        }
    }

    private void markUnresolved(BizWorkflowNode node, JSONObject param, String dependencyType,
            String status, String reason, WorkflowImportReport report) {
        WorkflowImportReportEntry entry = baseEntry(node, dependencyType,
                firstNonBlank(param.getString("dbId"), param.getString("flowId")),
                node == null || node.getData() == null ? null : node.getData().getLabel(),
                null, null, null);
        entry.setStatus(status);
        entry.setReason(reason);
        report.add(entry);
        if (node != null && node.getData() != null) {
            markImportIssue(node.getData(), entry);
        }
        if ("database".equals(dependencyType)) {
            param.remove("dbId");
            param.remove("sql");
        }
    }

    private void markImportIssue(BizNodeData data, WorkflowImportReportEntry entry) {
        JSONObject marker = data.getNodeMeta() == null ? new JSONObject() : data.getNodeMeta();
        JSONArray dependencies = marker.getJSONArray("importDependencies");
        if (dependencies == null) {
            dependencies = new JSONArray();
            marker.put("importDependencies", dependencies);
        }
        JSONObject issue = new JSONObject();
        issue.put("dependencyType", entry.getDependencyType());
        issue.put("status", entry.getStatus());
        issue.put("reason", entry.getReason());
        issue.put("sourcePluginId", entry.getSourcePluginId());
        issue.put("sourceName", entry.getSourceName());
        issue.put("sourceOperationId", entry.getSourceOperationId());
        issue.put("sourceVersion", entry.getSourceVersion());
        issue.put("sourceStableKey", entry.getSourceStableKey());
        issue.put("candidatePluginIds", entry.getCandidatePluginIds());
        issue.entrySet().removeIf(item -> item.getValue() == null);
        dependencies.add(issue);
        marker.put("importDependencyStatus", entry.getStatus());
        marker.put("importDependencyReason", entry.getReason());
        data.setNodeMeta(marker);
    }

    private void clearImportMarker(BizNodeData data) {
        if (data != null && data.getNodeMeta() != null) {
            data.getNodeMeta().remove("importDependencyStatus");
            data.getNodeMeta().remove("importDependencyReason");
            data.getNodeMeta().remove("importDependencies");
        }
    }

    private void removeRuntimeCredentialsForExport(BizWorkflowData workflowData) {
        if (workflowData == null || workflowData.getNodes() == null) {
            return;
        }
        for (BizWorkflowNode node : workflowData.getNodes()) {
            if (node == null || node.getData() == null) {
                continue;
            }
            JSONObject param = node.getData().getNodeParam();
            removeSensitivePluginFields(param);
            removeAgentSkillSandbox(param);
            if (param == null) {
                continue;
            }
            // Script sandbox credentials are injected at execution time and can contain both the
            // provider API key and the internal artifact-upload token.
            param.remove("sandbox");
            // RPA stores all assistant authentication fields under `header`. The target environment
            // must select its own assistant; exporting this object would leak arbitrary secrets.
            if (node.getId() != null && node.getId().startsWith("rpa::")) {
                param.remove("header");
            }
        }
    }

    private void removeSensitivePluginFields(JSONObject param) {
        if (param == null) {
            return;
        }
        RUNTIME_CREDENTIAL_KEYS.forEach(param::remove);
    }

    /** Remove only runtime sandbox credentials while retaining each exported skill definition. */
    private void removeAgentSkillSandbox(JSONObject param) {
        if (param == null) {
            return;
        }
        JSONObject plugin = param.getJSONObject("plugin");
        JSONArray skills = plugin == null ? null : plugin.getJSONArray("skills");
        for (int i = 0; skills != null && i < skills.size(); i++) {
            JSONObject skill = asJsonObject(skills.get(i));
            if (skill != null) {
                skill.remove("sandbox");
                skills.set(i, skill);
            }
        }
    }

    private WebSchema parseWebSchema(String webSchema) {
        if (StringUtils.isBlank(webSchema)) {
            return null;
        }
        try {
            return JSON.parseObject(webSchema, WebSchema.class);
        } catch (Exception ignored) {
            return null;
        }
    }

    private String contractHash(String webSchema) {
        WebSchema schema = parseWebSchema(webSchema);
        if (schema == null) {
            return null;
        }
        Map<String, Object> contract = new LinkedHashMap<>();
        contract.put("inputs", normalizeContractItems(schema.getToolRequestInput()));
        contract.put("outputs", normalizeContractItems(schema.getToolRequestOutput()));
        return sha256(JSON.toJSONString(contract));
    }

    private List<Map<String, Object>> normalizeContractItems(List<WebSchemaItem> items) {
        if (items == null) {
            return Collections.emptyList();
        }
        return items.stream()
                .filter(Objects::nonNull)
                .filter(item -> !Boolean.FALSE.equals(item.getOpen()))
                .map(item -> {
                    Map<String, Object> normalized = new TreeMap<>();
                    normalized.put("name", item.getName());
                    normalized.put("type", item.getType());
                    normalized.put("location", item.getLocation());
                    normalized.put("required", Boolean.TRUE.equals(item.getRequired()));
                    normalized.put("from", item.getFrom());
                    normalized.put("children", normalizeContractItems(item.getChildren()));
                    return normalized;
                })
                .sorted(Comparator.comparing(item -> String.valueOf(item.get("name"))))
                .toList();
    }

    private String stableToolKey(String name, String contractHash) {
        if (StringUtils.isBlank(name) || StringUtils.isBlank(contractHash)) {
            return null;
        }
        return sha256(name.trim() + "\n" + contractHash);
    }

    private String sha256(String value) {
        if (value == null) {
            return null;
        }
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }

    private int findAgentToolIndex(JSONArray toolsList, String toolId) {
        for (int i = 0; toolsList != null && i < toolsList.size(); i++) {
            JSONObject item = asJsonObject(toolsList.get(i));
            if (item != null && "tool".equals(item.getString("type"))
                    && Objects.equals(toolId, item.getString("toolId"))) {
                return i;
            }
        }
        return -1;
    }

    @SuppressWarnings("unchecked")
    private JSONObject asJsonObject(Object value) {
        if (value instanceof JSONObject jsonObject) {
            return jsonObject;
        }
        if (value instanceof Map<?, ?> map) {
            return new JSONObject((Map<String, Object>) map);
        }
        return null;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (StringUtils.isNotBlank(value)) {
                return value;
            }
        }
        return null;
    }

    private String stringValue(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private static void removeLlmParamNew(JSONObject nodeParam) {
        List<String> keys = Arrays.asList("domain", "serviceId", "maxTokens", "temperature",
                "topK", "llmId", "url", "uid", "patchId");
        keys.forEach(nodeParam::remove);
    }
}
