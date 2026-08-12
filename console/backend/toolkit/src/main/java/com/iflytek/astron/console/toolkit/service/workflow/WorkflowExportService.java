package com.iflytek.astron.console.toolkit.service.workflow;

import cn.hutool.core.collection.CollUtil;
import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.esotericsoftware.minlog.Log;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.entity.workflow.Workflow;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.service.space.EnterpriseSpaceService;
import com.iflytek.astron.console.commons.util.BotUtil;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import com.iflytek.astron.console.toolkit.config.properties.BizConfig;
import com.iflytek.astron.console.toolkit.config.properties.CommonConfig;
import com.iflytek.astron.console.toolkit.entity.biz.modelconfig.ModelDto;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.BizWorkflowData;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.BizWorkflowNode;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.node.BizNodeData;
import com.iflytek.astron.console.toolkit.entity.dto.WorkflowReq;
import com.iflytek.astron.console.toolkit.entity.enumVo.ToolboxStatusEnum;
import com.iflytek.astron.console.toolkit.entity.table.database.DbInfo;
import com.iflytek.astron.console.toolkit.entity.table.tool.ToolBox;
import com.iflytek.astron.console.toolkit.entity.vo.LLMInfoVo;
import com.iflytek.astron.console.toolkit.entity.vo.WorkflowImportReport;
import com.iflytek.astron.console.toolkit.entity.vo.WorkflowImportVo;
import com.iflytek.astron.console.toolkit.handler.UserInfoManagerHandler;
import com.iflytek.astron.console.toolkit.mapper.database.DbInfoMapper;
import com.iflytek.astron.console.toolkit.service.model.ModelService;
import com.iflytek.astron.console.toolkit.service.repo.RepoService;
import com.iflytek.astron.console.toolkit.service.tool.ToolBoxService;
import com.iflytek.astron.console.toolkit.tool.DataPermissionCheckTool;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import lombok.SneakyThrows;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
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
public class WorkflowExportService {
    private static final String DEFAULT_PLUGIN_VERSION = "V1.0";
    private static final String PORTABLE_PLUGIN_KEY = "portablePlugin";
    private static final String PORTABLE_PLUGIN_NAME_KEY = "name";
    private static final String PORTABLE_PLUGIN_FINGERPRINT_KEY = "schemaFingerprint";
    private static final String PORTABLE_PLUGIN_FINGERPRINT_VERSION_KEY = "schemaFingerprintVersion";
    private static final int PORTABLE_PLUGIN_FINGERPRINT_VERSION = 1;
    private static final String REASON_MISSING_METADATA = "MISSING_METADATA";
    private static final String REASON_NOT_FOUND = "NOT_FOUND";
    private static final String REASON_AMBIGUOUS = "AMBIGUOUS";
    private static final String REASON_INCOMPATIBLE = "INCOMPATIBLE";
    private static final int MAX_PLUGIN_NAME_LENGTH = 64;
    private static final List<String> PORTABLE_SCHEMA_FIELDS = List.of(
            "name", "type", "location", "required", "from", "open", "fatherType", "children");
    private static final ObjectMapper objectMapper = new ObjectMapper();

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
    RepoService repoService;
    @Autowired
    DbInfoMapper dbInfoMapper;
    @Autowired
    CommonConfig commonConfig;
    @Resource
    EnterpriseSpaceService enterpriseSpaceService;

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
            addPortablePluginMetadata(bizWorkflowData);
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
            yamlWrapper.put("flowData", objectMapper.convertValue(bizWorkflowData, Map.class));

            // YAML dump configuration
            DumperOptions options = new DumperOptions();
            options.setDefaultFlowStyle(DumperOptions.FlowStyle.BLOCK);
            options.setPrettyFlow(true);
            options.setIndent(2);
            options.setDefaultScalarStyle(DumperOptions.ScalarStyle.PLAIN);

            LoaderOptions loaderOptions = new LoaderOptions();
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
    public ApiResult importWorkflowFromYaml(InputStream inputStream, HttpServletRequest request) {
        String uid = UserInfoManagerHandler.getUserId();
        Long targetSpaceId = SpaceInfoUtil.getSpaceId();
        if (targetSpaceId != null && enterpriseSpaceService.checkUserBelongSpace(targetSpaceId, uid) == null) {
            throw new BusinessException(ResponseEnum.PERMISSION_NOT_BELONG_SPACE);
        }

        LoaderOptions loaderOptions = new LoaderOptions();
        Yaml yaml = new Yaml(new SafeConstructor(loaderOptions));
        Map<String, Object> rootMap = yaml.load(inputStream);
        JSONObject root = new JSONObject(rootMap);

        if (root == null || !root.containsKey("flowMeta") || !root.containsKey("flowData")) {
            throw new BusinessException(ResponseEnum.WORKFLOW_DLS_UPLOAD_FAILED);
        }
        Map<String, Object> meta = (Map<String, Object>) root.get("flowMeta");
        Map<String, Object> flow = (Map<String, Object>) root.get("flowData");

        // Build new Workflow entity
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
        wf.setCategory(meta.get("category") != null ? (Integer) meta.get("category") : null);
        wf.setAdvancedConfig((String) meta.get("advancedConfig"));
        BizWorkflowData bizWorkflowData = objectMapper.convertValue(flow, BizWorkflowData.class);
        // Clear node private information
        WorkflowImportReport importReport = cleanNodesForImport(bizWorkflowData, uid, request);
        String data = objectMapper.writeValueAsString(bizWorkflowData);
        wf.setData(data);
        // Call core system to get flowId
        WorkflowReq workflowReq = new WorkflowReq();
        workflowReq.setName(wf.getName());
        workflowReq.setDescription(wf.getDescription());
        workflowReq.setAppId(wf.getAppId());
        ApiResult<String> addResult = workflowService.callProtocolAdd(workflowReq);
        if (addResult.code() != 0) {
            return addResult;
        }
        wf.setCreateTime(new Date());
        wf.setUpdateTime(new Date());
        wf.setFlowId(addResult.data());
        if (wf.getSource() == null) {
            wf.setSource(0);
        }
        if (StringUtils.isBlank(wf.getAvatarColor())) {
            wf.setAvatarColor("#FFEAD5");
        }
        if (StringUtils.isBlank(wf.getAvatarIcon())) {
            wf.setAvatarIcon("icon/common/emojiitem_00_10@2x.png");
        }
        // Save
        wf.setSpaceId(targetSpaceId);
        workflowService.save(wf);
        // Sync to Spark database
        Integer botId = botUtil.syncToSparkDatabase(wf, UserInfoManagerHandler.getUserId(), targetSpaceId);
        JSONObject jsonData = new JSONObject();
        jsonData.put("botId", botId);
        // Update botId
        wf.setExt(jsonData.toJSONString());
        workflowService.updateById(wf);
        WorkflowImportVo response = new WorkflowImportVo();
        BeanUtils.copyProperties(wf, response);
        response.setImportReport(importReport);
        return ApiResult.success(response);
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
    public WorkflowImportReport cleanNodesForImport(BizWorkflowData bizWorkflowData, String uid,
            HttpServletRequest request) {
        WorkflowImportReport importReport = new WorkflowImportReport();
        List<BizWorkflowNode> nodes = Optional.ofNullable(bizWorkflowData)
                .map(BizWorkflowData::getNodes)
                .orElseGet(Collections::emptyList);
        ModelDto modelDto = new ModelDto();
        modelDto.setPage(1);
        modelDto.setPageSize(999);
        modelDto.setType(0);
        modelDto.setUid(uid);
        ApiResult<Page<LLMInfoVo>> conditionList = modelService.getConditionList(modelDto, request);
        Page<LLMInfoVo> page = conditionList.data();
        List<LLMInfoVo> records = page.getRecords();
        Set<Long> allowedLlmSet = records.stream().map(LLMInfoVo::getLlmId).collect(Collectors.toSet());
        for (BizWorkflowNode node : nodes) {
            BizNodeData data = node.getData();
            if (data == null || data.getNodeParam() == null)
                continue;
            JSONObject param = data.getNodeParam();
            String prefix = node.getId().split("::")[0];

            switch (prefix) {
                case "spark-llm":
                case "decision-making":
                case "extractor-parameter":
                case "question-answer":
                    cleanLlmNode(param, allowedLlmSet, uid);
                    break;
                case "plugin":
                    cleanPluginNode(node, uid, importReport);
                    break;
                case "flow":
                    cleanFlowNode(param, uid, data);
                    break;
                case "knowledge-base":
                case "knowledge-pro-base":
                    cleanKnowledgeNode(param, uid, allowedLlmSet, prefix);
                    break;
                case "agent":
                    cleanAgentNode(param, allowedLlmSet, request);
                    break;
                case "database":
                    // Database node
                    cleanDataBaseNode(param, request);
                    break;
                default:
                    break;
            }
        }
        if (importReport.getMappedPluginCount() > 0 || !importReport.getUnresolvedPlugins().isEmpty()) {
            Log.info(String.format("Workflow import plugin resolution: mapped=%d, unresolved=%d",
                    importReport.getMappedPluginCount(), importReport.getUnresolvedPlugins().size()));
        }
        return importReport;
    }

    /**
     * Process database node during import.
     *
     * @param param Node parameters
     * @param request HTTP request context
     */
    private void cleanDataBaseNode(JSONObject param, HttpServletRequest request) {
        List<DbInfo> dbInfos = dbInfoMapper.selectList(new QueryWrapper<DbInfo>().lambda()
                .eq(DbInfo::getUid, UserInfoManagerHandler.getUserId())
                .eq(DbInfo::getDeleted, false)
                .orderByDesc(DbInfo::getCreateTime));
        if (CollUtil.isNotEmpty(dbInfos)) {
            Set<Long> collect = dbInfos.stream().map(DbInfo::getDbId).collect(Collectors.toSet());
            String dbId = param.getString("dbId");
            if (StringUtils.isNotBlank(dbId) && !collect.contains(Long.valueOf(dbId))) {
                param.remove("dbId");
                param.remove("sql");
            }
        } else {
            param.remove("dbId");
            param.remove("sql");
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

    private void addPortablePluginMetadata(BizWorkflowData workflowData) {
        if (workflowData == null || CollUtil.isEmpty(workflowData.getNodes())) {
            return;
        }
        for (BizWorkflowNode node : workflowData.getNodes()) {
            if (node == null || StringUtils.isBlank(node.getId()) || !node.getId().startsWith("plugin::")) {
                continue;
            }
            BizNodeData data = node.getData();
            if (data == null || data.getNodeParam() == null) {
                continue;
            }
            ToolBox sourceTool = findDirectPlugin(data.getNodeParam(), null);
            if (sourceTool == null) {
                continue;
            }
            String fingerprint = pluginSchemaFingerprint(sourceTool);
            if (StringUtils.isBlank(sourceTool.getName()) || fingerprint == null) {
                continue;
            }
            JSONObject portablePlugin = new JSONObject();
            portablePlugin.put(PORTABLE_PLUGIN_NAME_KEY, sourceTool.getName());
            portablePlugin.put(PORTABLE_PLUGIN_FINGERPRINT_KEY, fingerprint);
            portablePlugin.put(PORTABLE_PLUGIN_FINGERPRINT_VERSION_KEY, PORTABLE_PLUGIN_FINGERPRINT_VERSION);
            data.setPluginName(sourceTool.getName());
            data.getNodeParam().put(PORTABLE_PLUGIN_KEY, portablePlugin);
        }
    }

    private PluginResolution resolvePlugin(JSONObject param, JSONObject portablePlugin, String uid) {
        Object rawFingerprint = portablePlugin == null
                ? null
                : portablePlugin.get(PORTABLE_PLUGIN_FINGERPRINT_KEY);
        String expectedFingerprint = rawFingerprint instanceof String fingerprint ? fingerprint : null;
        ToolBox directTool = findDirectPlugin(param, expectedFingerprint);
        if (directTool != null) {
            return new PluginResolution(directTool, false, null);
        }

        if (portablePlugin == null) {
            return new PluginResolution(null, false, REASON_MISSING_METADATA);
        }
        Object rawPluginName = portablePlugin.get(PORTABLE_PLUGIN_NAME_KEY);
        String pluginName = rawPluginName instanceof String name ? name : null;
        Object rawFingerprintVersion = portablePlugin.get(PORTABLE_PLUGIN_FINGERPRINT_VERSION_KEY);
        if (StringUtils.isBlank(pluginName)
                || pluginName.length() > MAX_PLUGIN_NAME_LENGTH
                || !(rawFingerprintVersion instanceof Number fingerprintVersion)
                || fingerprintVersion.intValue() != PORTABLE_PLUGIN_FINGERPRINT_VERSION
                || !isValidFingerprint(expectedFingerprint)) {
            return new PluginResolution(null, false, REASON_MISSING_METADATA);
        }

        Long spaceId = SpaceInfoUtil.getSpaceId();
        LambdaQueryWrapper<ToolBox> namedToolQuery = pluginLookupQuery()
                .eq(ToolBox::getName, pluginName)
                .eq(ToolBox::getDeleted, false)
                .eq(ToolBox::getStatus, ToolboxStatusEnum.FORMAL.getCode());
        if (spaceId == null) {
            namedToolQuery.isNull(ToolBox::getSpaceId).eq(ToolBox::getUserId, uid);
        } else {
            namedToolQuery.eq(ToolBox::getSpaceId, spaceId);
        }
        List<ToolBox> namedTools = safeToolList(namedToolQuery);
        List<ToolBox> scopedTools = namedTools.stream()
                .filter(this::isUsableFallbackTool)
                .filter(tool -> pluginName.equals(tool.getName()))
                .filter(tool -> isInCurrentImportScope(tool, uid))
                .filter(this::isToolVisible)
                .toList();
        if (scopedTools.isEmpty()) {
            return new PluginResolution(null, false, REASON_NOT_FOUND);
        }

        String sourceVersion = effectivePluginVersion(param.getString("version"));
        List<ToolBox> versionMatches = scopedTools.stream()
                .filter(tool -> sourceVersion.equals(effectivePluginVersion(tool.getVersion())))
                .toList();
        if (versionMatches.isEmpty()) {
            return new PluginResolution(null, false, REASON_INCOMPATIBLE);
        }

        List<ToolBox> compatibleTools = versionMatches.stream()
                .filter(tool -> expectedFingerprint.equals(pluginSchemaFingerprint(tool)))
                .toList();
        if (compatibleTools.isEmpty()) {
            return new PluginResolution(null, false, REASON_INCOMPATIBLE);
        }

        Map<String, List<ToolBox>> toolsById = compatibleTools.stream()
                .collect(Collectors.groupingBy(ToolBox::getToolId, LinkedHashMap::new, Collectors.toList()));
        if (toolsById.size() != 1) {
            return new PluginResolution(null, false, REASON_AMBIGUOUS);
        }
        ToolBox targetTool = selectUniqueRuntimeTool(toolsById.values().iterator().next(), null);
        if (targetTool == null) {
            return new PluginResolution(null, false, REASON_AMBIGUOUS);
        }
        return new PluginResolution(targetTool, true, null);
    }

    private ToolBox findDirectPlugin(JSONObject param, String expectedFingerprint) {
        String pluginId = param.getString("pluginId");
        if (StringUtils.isBlank(pluginId)) {
            return null;
        }
        String version = effectivePluginVersion(param.getString("version"));
        List<ToolBox> candidates = safeToolList(pluginLookupQuery()
                .eq(ToolBox::getToolId, pluginId)
                .eq(ToolBox::getDeleted, false)).stream()
                .filter(this::hasRuntimeIdentity)
                .filter(tool -> version.equals(effectivePluginVersion(tool.getVersion())))
                .filter(this::isToolVisible)
                .filter(tool -> expectedFingerprint == null
                        || expectedFingerprint.equals(pluginSchemaFingerprint(tool)))
                .toList();
        return selectUniqueRuntimeTool(candidates, param.getString("operationId"));
    }

    private List<ToolBox> safeToolList(LambdaQueryWrapper<ToolBox> query) {
        List<ToolBox> tools = toolBoxService.list(query);
        return tools == null ? Collections.emptyList() : tools;
    }

    private LambdaQueryWrapper<ToolBox> pluginLookupQuery() {
        return new LambdaQueryWrapper<ToolBox>().select(
                ToolBox::getId,
                ToolBox::getToolId,
                ToolBox::getName,
                ToolBox::getDescription,
                ToolBox::getUserId,
                ToolBox::getSpaceId,
                ToolBox::getAppId,
                ToolBox::getMethod,
                ToolBox::getWebSchema,
                ToolBox::getDeleted,
                ToolBox::getIsPublic,
                ToolBox::getOperationId,
                ToolBox::getStatus,
                ToolBox::getVersion);
    }

    private ToolBox selectUniqueRuntimeTool(List<ToolBox> candidates, String operationId) {
        if (candidates.isEmpty()) {
            return null;
        }
        if (StringUtils.isNotBlank(operationId)) {
            List<ToolBox> operationMatches = candidates.stream()
                    .filter(tool -> operationId.equals(tool.getOperationId()))
                    .toList();
            if (operationMatches.size() == 1) {
                return operationMatches.get(0);
            }
        }
        if (candidates.size() == 1) {
            return candidates.get(0);
        }
        long runtimeIdentities = candidates.stream()
                .map(tool -> String.join("\u0000",
                        StringUtils.defaultString(tool.getToolId()),
                        StringUtils.defaultString(tool.getOperationId()),
                        StringUtils.defaultString(tool.getAppId()),
                        effectivePluginVersion(tool.getVersion())))
                .distinct()
                .count();
        return runtimeIdentities == 1 ? candidates.get(0) : null;
    }

    private boolean isUsableFallbackTool(ToolBox tool) {
        return tool != null
                && !Boolean.TRUE.equals(tool.getDeleted())
                && ToolboxStatusEnum.FORMAL.getCode().equals(tool.getStatus())
                && hasRuntimeIdentity(tool);
    }

    private boolean hasRuntimeIdentity(ToolBox tool) {
        return tool != null
                && StringUtils.isNoneBlank(tool.getToolId(), tool.getOperationId(), tool.getAppId());
    }

    private boolean isToolVisible(ToolBox tool) {
        try {
            ToolBox permissionView = new ToolBox();
            permissionView.setId(tool.getId());
            permissionView.setToolId(tool.getToolId());
            permissionView.setUserId(tool.getUserId());
            permissionView.setSpaceId(tool.getSpaceId());
            permissionView.setIsPublic(tool.getIsPublic());
            dataPermissionCheckTool.checkToolVisible(permissionView);
            return true;
        } catch (BusinessException e) {
            return false;
        }
    }

    private boolean isInCurrentImportScope(ToolBox tool, String uid) {
        Long spaceId = SpaceInfoUtil.getSpaceId();
        if (spaceId == null) {
            return tool.getSpaceId() == null && Objects.equals(tool.getUserId(), uid);
        }
        return Objects.equals(tool.getSpaceId(), spaceId);
    }

    private void applyPluginBinding(JSONObject param, BizNodeData data, ToolBox targetTool, String uid) {
        param.put("pluginId", targetTool.getToolId());
        param.put("operationId", targetTool.getOperationId());
        param.put("version", effectivePluginVersion(targetTool.getVersion()));
        param.put("appId", targetTool.getAppId());
        param.put("uid", uid);
        param.put("toolDescription", targetTool.getDescription());
        extractBusinessInputs(targetTool.getWebSchema()).ifPresent(inputs -> param.put("businessInput", inputs));
        data.setPluginName(targetTool.getName());
    }

    private void clearPluginBinding(JSONObject param, BizNodeData data) {
        List.of("pluginId", "operationId", "version", "appId", "uid", "toolDescription", "businessInput")
                .forEach(param::remove);
        data.setInputs(Collections.emptyList());
        data.setOutputs(Collections.emptyList());
    }

    private Optional<List<String>> extractBusinessInputs(String webSchema) {
        if (StringUtils.isBlank(webSchema)) {
            return Optional.empty();
        }
        try {
            JsonNode inputs = objectMapper.readTree(webSchema).path("toolRequestInput");
            List<String> businessInputs = new ArrayList<>();
            collectBusinessInputs(inputs, businessInputs);
            return Optional.of(businessInputs);
        } catch (Exception e) {
            Log.warn("Unable to rebuild imported plugin business inputs", e);
            return Optional.empty();
        }
    }

    private void collectBusinessInputs(JsonNode node, List<String> businessInputs) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return;
        }
        if (node.isArray()) {
            node.forEach(child -> collectBusinessInputs(child, businessInputs));
            return;
        }
        if (!node.isObject()) {
            return;
        }
        if (node.path("from").asInt(-1) == 1
                && !"array".equals(node.path("fatherType").asText())
                && StringUtils.isNotBlank(node.path("name").asText())) {
            businessInputs.add(node.path("name").asText());
        }
        collectBusinessInputs(node.path("children"), businessInputs);
    }

    private String pluginSchemaFingerprint(ToolBox tool) {
        if (tool == null || StringUtils.isAnyBlank(tool.getMethod(), tool.getWebSchema())) {
            return null;
        }
        try {
            JsonNode webSchema = objectMapper.readTree(tool.getWebSchema());
            JsonNode requestInput = webSchema.path("toolRequestInput");
            JsonNode requestOutput = webSchema.path("toolRequestOutput");
            if (!requestInput.isArray() || !requestOutput.isArray()) {
                return null;
            }
            ObjectNode portableSchema = objectMapper.createObjectNode();
            portableSchema.put("method", StringUtils.lowerCase(StringUtils.trimToEmpty(tool.getMethod()), Locale.ROOT));
            portableSchema.set("toolRequestInput", canonicalizeSchema(requestInput));
            portableSchema.set("toolRequestOutput", canonicalizeSchema(requestOutput));
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(objectMapper.writeValueAsBytes(portableSchema));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        } catch (Exception e) {
            Log.warn("Unable to fingerprint plugin schema for workflow migration", e);
            return null;
        }
    }

    private JsonNode canonicalizeSchema(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return objectMapper.nullNode();
        }
        if (node.isArray()) {
            List<JsonNode> children = new ArrayList<>();
            node.forEach(child -> children.add(canonicalizeSchema(child)));
            children.sort(Comparator.comparing(JsonNode::toString));
            ArrayNode canonical = objectMapper.createArrayNode();
            children.forEach(canonical::add);
            return canonical;
        }
        if (node.isObject()) {
            ObjectNode canonical = objectMapper.createObjectNode();
            for (String field : PORTABLE_SCHEMA_FIELDS) {
                if (node.has(field)) {
                    canonical.set(field, canonicalizeSchema(node.get(field)));
                }
            }
            return canonical;
        }
        return node.deepCopy();
    }

    private String effectivePluginVersion(String version) {
        return StringUtils.defaultIfBlank(version, DEFAULT_PLUGIN_VERSION);
    }

    private boolean isValidFingerprint(String fingerprint) {
        return fingerprint != null && fingerprint.matches("[0-9a-f]{64}");
    }

    private record PluginResolution(ToolBox toolBox, boolean remapped, String reason) {}

    /**
     * Process plugin/tool node during import.
     *
     * @param node Plugin workflow node
     * @param uid User ID
     * @param importReport Import resource-resolution report
     */
    private void cleanPluginNode(BizWorkflowNode node, String uid, WorkflowImportReport importReport) {
        BizNodeData data = node.getData();
        JSONObject param = data.getNodeParam();
        JSONObject portablePlugin = readPortablePluginMetadata(param);
        PluginResolution resolution = resolvePlugin(param, portablePlugin, uid);
        param.remove(PORTABLE_PLUGIN_KEY);

        if (resolution.toolBox() != null) {
            applyPluginBinding(param, data, resolution.toolBox(), uid);
            if (resolution.remapped()) {
                importReport.pluginMapped();
            }
            return;
        }

        String pluginName = portablePlugin == null
                ? data.getPluginName()
                : portablePlugin.getString(PORTABLE_PLUGIN_NAME_KEY);
        clearPluginBinding(param, data);
        importReport.pluginUnresolved(node.getId(), data.getLabel(), pluginName, resolution.reason());
    }

    private JSONObject readPortablePluginMetadata(JSONObject param) {
        Object rawMetadata = param.get(PORTABLE_PLUGIN_KEY);
        if (rawMetadata instanceof JSONObject metadata) {
            return metadata;
        }
        if (rawMetadata instanceof Map<?, ?> map) {
            JSONObject metadata = new JSONObject();
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                if (entry.getKey() instanceof String key) {
                    metadata.put(key, entry.getValue());
                }
            }
            return metadata;
        }
        return null;
    }

    /**
     * Process workflow node during import.
     *
     * @param param Node parameters
     * @param uid User ID
     * @param data Node data
     */
    private void cleanFlowNode(JSONObject param, String uid, BizNodeData data) {
        String flowId = param.getString("flowId");
        if (flowId != null && !Objects.equals(param.getString("uid"), uid.toString())) {
            param.remove("flowId");
            param.remove("uid");
            data.setInputs(Collections.emptyList());
            data.setOutputs(Collections.emptyList());
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
    private void cleanKnowledgeNode(JSONObject param, String uid,
            Set<Long> allowedLlmSet, String prefix) {
        if ("knowledge-pro".equals(prefix)) {
            cleanLlmNode(param, allowedLlmSet, uid);
        }
        JSONArray repoList = param.getJSONArray("repoList");
        if (CollUtil.isEmpty(repoList)) {
            param.put("repoList", Collections.emptyList());
        } else {
            JSONObject repoObj = repoList.getJSONObject(0);
            if (!Objects.equals(repoObj.getString("userId"), uid.toString())) {
                param.put("repoList", Collections.emptyList());
            }
        }
    }

    /**
     * Process agent node during import.
     *
     * @param param Node parameters
     * @param allowedLlmSet Set of allowed LLM IDs
     * @param request HTTP request context
     */
    private void cleanAgentNode(JSONObject param,
            Set<Long> allowedLlmSet,
            HttpServletRequest request) {

        if (!allowedLlmSet.contains(param.getLong("llmId"))) {
            param.remove("serviceId");
            param.remove("llmId");
            JSONObject modelConfig = param.getJSONObject("modelConfig");
            modelConfig.remove("domain");
            modelConfig.remove("api");
            param.replace("modelConfig", modelConfig);
            param.remove("uid");
        }

        JSONObject plugin = param.getJSONObject("plugin");
        if (plugin == null)
            return;

        JSONArray toolsList = plugin.getJSONArray("toolsList");
        JSONArray knowledgeArray = plugin.getJSONArray("knowledge");

        if (CollUtil.isNotEmpty(knowledgeArray)) {
            Set<String> userRepos = repoService.list(1, 999, "", "create_time", request, "")
                    .getPageData()
                    .stream()
                    .map(r -> r.getCoreRepoId())
                    .collect(Collectors.toSet());

            boolean hasInvalidRepo = knowledgeArray.stream().anyMatch(o -> {
                JSONObject j = (JSONObject) o;
                JSONArray repoIds = j.getJSONObject("match").getJSONArray("repoIds");
                return repoIds.stream().anyMatch(r -> !userRepos.contains((String) r));
            });

            if (hasInvalidRepo) {
                plugin.put("knowledge", Collections.emptyList());
                if (toolsList != null) {
                    toolsList.removeIf(tool -> "knowledge".equals(((JSONObject) tool).getString("type")));
                }
            }
        }

        JSONArray tools = plugin.getJSONArray("tools");
        Set<String> toolSet = new HashSet<>();
        for (int i = 0; tools != null && i < tools.size(); i++) {
            String toolId = tools.getString(i);
            ToolBox toolBox = toolBoxService.getOnly(new LambdaQueryWrapper<ToolBox>()
                    .eq(ToolBox::getToolId, toolId));
            if (toolBox == null || (!toolBox.getIsPublic() && !Objects.equals(toolBox.getUserId(), bizConfig.getAdminUid()))) {
                tools.remove(i--);
                toolSet.add(toolId);
            }
        }

        if (toolsList != null && CollUtil.isNotEmpty(toolSet)) {
            toolsList.removeIf(tool -> {
                JSONObject toolJson = (tool instanceof JSONObject)
                        ? (JSONObject) tool
                        : new JSONObject((Map<String, Object>) tool);
                return "tool".equals(toolJson.getString("type"))
                        && toolSet.contains(toolJson.getString("toolId"));
            });
        }
    }

    private static void removeLlmParamNew(JSONObject nodeParam) {
        List<String> keys = Arrays.asList("domain", "serviceId", "maxTokens", "temperature",
                "topK", "llmId", "url", "uid", "patchId");
        keys.forEach(nodeParam::remove);
    }
}
