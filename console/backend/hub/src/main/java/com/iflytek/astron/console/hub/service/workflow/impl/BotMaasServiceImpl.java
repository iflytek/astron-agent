package com.iflytek.astron.console.hub.service.workflow.impl;

import com.alibaba.fastjson2.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.dto.bot.BotInfoDto;
import com.iflytek.astron.console.commons.dto.workflow.CloneSynchronize;
import com.iflytek.astron.console.commons.entity.bot.ChatBotBase;
import com.iflytek.astron.console.commons.entity.bot.BotTypeList;
import com.iflytek.astron.console.commons.entity.bot.UserLangChainInfo;
import com.iflytek.astron.console.commons.entity.workflow.Workflow;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.service.bot.BotService;
import com.iflytek.astron.console.commons.service.bot.BotTypeListService;
import com.iflytek.astron.console.commons.service.data.UserLangChainDataService;
import com.iflytek.astron.console.commons.util.MaasUtil;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import com.iflytek.astron.console.hub.entity.maas.ExportedWorkflowTemplate;
import com.iflytek.astron.console.hub.entity.maas.MaasDuplicate;
import com.iflytek.astron.console.hub.entity.maas.MaasTemplate;
import com.iflytek.astron.console.hub.entity.maas.WorkflowTemplateExportRequest;
import com.iflytek.astron.console.hub.entity.maas.WorkflowTemplateQueryDto;
import com.iflytek.astron.console.commons.enums.bot.BotVersionEnum;
import com.iflytek.astron.console.hub.mapper.ExportedWorkflowTemplateMapper;
import com.iflytek.astron.console.hub.service.bot.BotAIService;
import com.iflytek.astron.console.hub.service.workflow.BotMaasService;
import com.iflytek.astron.console.toolkit.service.workflow.WorkflowExportService;
import com.iflytek.astron.console.toolkit.service.workflow.WorkflowService;
import com.iflytek.astron.console.toolkit.tool.DataPermissionCheckTool;
import jakarta.servlet.http.HttpServletRequest;
import org.apache.commons.lang3.StringUtils;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RedissonClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * @Author cherry
 */
@Service
@Slf4j
public class BotMaasServiceImpl implements BotMaasService {
    private static final String AI_AVATAR_FALLBACK = "Should return fallback content";
    private static final int TEMPLATE_COVER_TIMEOUT_SECONDS = 20;
    private static final int TEMPLATE_LIST_MAX_PAGE_SIZE = 200;

    @Autowired
    private MaasUtil maasUtil;

    @Autowired
    private UserLangChainDataService userLangChainDataService;

    @Autowired
    private RedissonClient redissonClient;

    @Autowired
    private BotService botService;

    @Autowired
    private BotTypeListService botTypeListService;

    @Autowired
    private ExportedWorkflowTemplateMapper exportedWorkflowTemplateMapper;

    @Autowired
    private WorkflowService workflowService;

    @Autowired
    private WorkflowExportService workflowExportService;

    @Autowired
    private DataPermissionCheckTool dataPermissionCheckTool;

    @Autowired
    private BotAIService botAIService;

    @Override
    public BotInfoDto createFromTemplate(String uid, MaasDuplicate maasDuplicate, HttpServletRequest request) {
        if (maasDuplicate.getTemplateId() != null
                || MaasTemplate.TEMPLATE_SOURCE_EXPORTED.equalsIgnoreCase(maasDuplicate.getTemplateSource())) {
            return createFromExportedTemplate(uid, maasDuplicate, request);
        }
        return createFromOfficialTemplate(uid, maasDuplicate, request);
    }

    private BotInfoDto createFromOfficialTemplate(String uid, MaasDuplicate maasDuplicate, HttpServletRequest request) {
        Long spaceId = SpaceInfoUtil.getSpaceId();
        // Create an event, consumed by /maasCopySynchronize
        Long maasId = maasDuplicate.getMaasId();
        UserLangChainInfo userLangChainInfo = userLangChainDataService.selectByMaasId(maasId);
        if (Objects.isNull(userLangChainInfo)) {
            log.info("----- Xinghuo did not find Astron workflow: {}", JSONObject.toJSONString(userLangChainInfo));
            throw new BusinessException(ResponseEnum.BOT_NOT_EXIST);
        }
        redissonClient.getBucket(MaasUtil.generatePrefix(uid, Math.toIntExact(userLangChainInfo.getId()))).set(userLangChainInfo.getId().toString(), Duration.ofSeconds(60));
        BotInfoDto botInfoDto = botService.insertWorkflowBot(uid, maasDuplicate, spaceId, BotVersionEnum.WORKFLOW.getVersion());
        // Check if response is successful
        if (botInfoDto == null) {
            throw new BusinessException(ResponseEnum.CREATE_BOT_FAILED);
        }
        // Copy a new workflow for the assistant
        JSONObject res = maasUtil.copyWorkFlow(maasDuplicate.getMaasId(), request, BotVersionEnum.WORKFLOW.getVersion(), Long.valueOf(botInfoDto.getBotId()), null);
        if (Objects.isNull(res) || res.isEmpty()) {
            throw new BusinessException(ResponseEnum.CREATE_BOT_FAILED);
        }
        Integer botId = botInfoDto.getBotId();
        botService.addMaasInfo(uid, res, botId, spaceId);
        botInfoDto.setFlowId(res.getJSONObject("data").getLong("id"));
        return botInfoDto;
    }

    private BotInfoDto createFromExportedTemplate(String uid, MaasDuplicate maasDuplicate, HttpServletRequest request) {
        Long templateId = maasDuplicate.getTemplateId();
        if (templateId == null) {
            throw new BusinessException(ResponseEnum.PARAMETER_ERROR);
        }

        ExportedWorkflowTemplate template = loadAvailableTemplate(uid, templateId);
        if (template == null || StringUtils.isBlank(template.getSnapshotYaml())) {
            log.warn("Create workflow from exported template failed, templateId={}, uid={}, spaceId={}, templateFound={}, snapshotBlank={}",
                    templateId,
                    uid,
                    SpaceInfoUtil.getSpaceId(),
                    template != null,
                    template == null || StringUtils.isBlank(template.getSnapshotYaml()));
            throw new BusinessException(ResponseEnum.BOT_NOT_EXIST);
        }

        ApiResult<?> importResult = workflowExportService.importWorkflowFromYaml(
                new ByteArrayInputStream(template.getSnapshotYaml().getBytes(StandardCharsets.UTF_8)),
                request);
        if (importResult.code() != 0 || !(importResult.data() instanceof Workflow importedWorkflow)) {
            throw new BusinessException(ResponseEnum.WORKFLOW_IMPORT_FAILED);
        }

        JSONObject ext = JSONObject.parseObject(importedWorkflow.getExt());
        BotInfoDto botInfoDto = new BotInfoDto();
        botInfoDto.setBotId(ext == null ? null : ext.getInteger("botId"));
        botInfoDto.setBotName(importedWorkflow.getName());
        botInfoDto.setBotDesc(importedWorkflow.getDescription());
        botInfoDto.setAvatar(importedWorkflow.getAvatarIcon());
        botInfoDto.setVersion(BotVersionEnum.WORKFLOW.getVersion());
        botInfoDto.setFlowId(importedWorkflow.getId());
        botInfoDto.setMaasId(importedWorkflow.getId());
        return botInfoDto;
    }

    private ExportedWorkflowTemplate loadAvailableTemplate(String uid, Long templateId) {
        ExportedWorkflowTemplate template = exportedWorkflowTemplateMapper.selectById(templateId);
        if (template == null || !Objects.equals(template.getIsDelete(), (byte) 0)) {
            log.warn("Exported workflow template unavailable, templateId={}, uid={}, templateFound={}, isDelete={}",
                    templateId,
                    uid,
                    template != null,
                    template == null ? null : template.getIsDelete());
            return null;
        }

        if (StringUtils.isNotBlank(template.getSnapshotYaml())) {
            return template;
        }

        if (template.getSourceWorkflowId() == null) {
            return template;
        }

        Workflow sourceWorkflow = workflowService.getById(template.getSourceWorkflowId());
        if (sourceWorkflow == null) {
            return template;
        }

        try {
            template.setSnapshotYaml(exportWorkflowSnapshot(sourceWorkflow));
            exportedWorkflowTemplateMapper.updateById(template);
            log.info("Repaired exported workflow template snapshot, templateId={}, sourceWorkflowId={}",
                    templateId,
                    template.getSourceWorkflowId());
        } catch (Exception e) {
            log.warn("Repair exported workflow template snapshot failed, templateId={}", templateId, e);
        }
        return template;
    }

    @Override
    public Integer maasCopySynchronize(CloneSynchronize synchronize) {
        log.info("------ Astron workflow copy synchronization: {}", JSONObject.toJSONString(synchronize));
        String uid = synchronize.getUid();
        Long originId = synchronize.getOriginId();
        Long maasId = synchronize.getCurrentId();
        String flowId = synchronize.getFlowId();
        Long spaceId = synchronize.getSpaceId();
        UserLangChainInfo userLangChainInfo = userLangChainDataService.selectByMaasId(originId);
        if (Objects.isNull(userLangChainInfo)) {
            log.info("----- Xinghuo did not find Astron workflow: {}", JSONObject.toJSONString(synchronize));
            throw new BusinessException(ResponseEnum.BOT_NOT_EXIST);
        }
        Integer botId = userLangChainInfo.getBotId();
        // If maasId already exists, end directly
        if (redissonClient.getBucket(MaasUtil.generatePrefix(uid, botId)).isExists()) {
            log.info("----- Xinghuo has obtained this workflow, ending task: {}", JSONObject.toJSONString(synchronize));
            redissonClient.getBucket(MaasUtil.generatePrefix(uid, botId)).delete();
            return botId;
        }
        ChatBotBase base = botService.copyBot(uid, botId, spaceId);
        Long currentBotId = Long.valueOf(base.getId());
        UserLangChainInfo userLangChainInfoNew = UserLangChainInfo.builder()
                .id(currentBotId)
                .botId(Math.toIntExact(currentBotId))
                .maasId(maasId)
                .flowId(flowId)
                .uid(uid)
                .updateTime(LocalDateTime.now())
                .build();
        userLangChainDataService.insertUserLangChainInfo(userLangChainInfoNew);
        log.info("----- Astron workflow synchronization successful, original maasId: {}, flowId: {}, new assistant: {}", originId, flowId, currentBotId);
        return base.getId();
    }

    @Override
    public List<MaasTemplate> templateList(WorkflowTemplateQueryDto queryDto) {
        int pageIndex = queryDto.getPageIndex();
        int pageSize = queryDto.getPageSize();
        pageSize = Math.min(Math.max(pageSize, 1), TEMPLATE_LIST_MAX_PAGE_SIZE);
        LambdaQueryWrapper<ExportedWorkflowTemplate> exportedQueryWrapper = new LambdaQueryWrapper<>();
        exportedQueryWrapper.eq(ExportedWorkflowTemplate::getIsDelete, 0)
                .orderByDesc(ExportedWorkflowTemplate::getCreateTime);
        withSpaceScope(exportedQueryWrapper);
        if (queryDto.getGroupId() != null) {
            exportedQueryWrapper.eq(ExportedWorkflowTemplate::getGroupId, queryDto.getGroupId());
        }

        String uid = com.iflytek.astron.console.commons.util.RequestContextUtil.getUID();
        Map<Integer, BotTypeList> botTypeMap = botTypeListService.getBotTypeList()
                .stream()
                .collect(Collectors.toMap(BotTypeList::getTypeKey, Function.identity(), (left, right) -> left));
        List<MaasTemplate> exportedTemplates = exportedWorkflowTemplateMapper.selectList(exportedQueryWrapper)
                .stream()
                .sorted(Comparator.comparing(ExportedWorkflowTemplate::getCreateTime, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(template -> convertExportedTemplate(template, uid, botTypeMap))
                .toList();

        int safePageIndex = Math.max(pageIndex, 1);
        int fromIndex = Math.min((safePageIndex - 1) * pageSize, exportedTemplates.size());
        int toIndex = Math.min(fromIndex + pageSize, exportedTemplates.size());
        return exportedTemplates.subList(fromIndex, toIndex);
    }

    @Override
    public MaasTemplate exportTemplate(String uid, WorkflowTemplateExportRequest exportRequest) {
        if (exportRequest == null || exportRequest.getWorkflowId() == null) {
            throw new BusinessException(ResponseEnum.PARAMETER_ERROR);
        }

        Workflow workflow = workflowService.getById(exportRequest.getWorkflowId());
        if (workflow == null) {
            throw new BusinessException(ResponseEnum.BOT_NOT_EXIST);
        }
        dataPermissionCheckTool.checkWorkflowBelong(workflow, SpaceInfoUtil.getSpaceId());

        ExportedWorkflowTemplate template = new ExportedWorkflowTemplate();
        template.setTitle(workflow.getName());
        template.setSubtitle(workflow.getDescription());
        template.setGroupId(workflow.getCategory() == null ? null : Long.valueOf(workflow.getCategory()));
        template.setSourceWorkflowId(workflow.getId());
        template.setSnapshotYaml(exportWorkflowSnapshot(workflow));
        template.setCoverUrl(generateTemplateCover(uid, workflow));
        template.setCreatorUid(uid);
        template.setSpaceId(SpaceInfoUtil.getSpaceId());
        template.setIsDelete((byte) 0);
        exportedWorkflowTemplateMapper.insert(template);

        Map<Integer, BotTypeList> botTypeMap = botTypeListService.getBotTypeList()
                .stream()
                .collect(Collectors.toMap(BotTypeList::getTypeKey, Function.identity(), (left, right) -> left));
        return convertExportedTemplate(exportedWorkflowTemplateMapper.selectById(template.getId()), uid, botTypeMap);
    }

    @Override
    public void deleteTemplate(String uid, Long templateId) {
        if (templateId == null) {
            throw new BusinessException(ResponseEnum.PARAMETER_ERROR);
        }

        ExportedWorkflowTemplate template = loadAvailableTemplate(uid, templateId);
        if (template == null) {
            log.warn("Delete exported workflow template failed, templateId={}, uid={}, spaceId={}",
                    templateId,
                    uid,
                    SpaceInfoUtil.getSpaceId());
            throw new BusinessException(ResponseEnum.BOT_NOT_EXIST);
        }
        if (StringUtils.isNotBlank(template.getCreatorUid()) && !Objects.equals(template.getCreatorUid(), uid)) {
            throw new BusinessException(ResponseEnum.PARAMETER_ERROR);
        }

        template.setIsDelete((byte) 1);
        exportedWorkflowTemplateMapper.updateById(template);
    }

    private MaasTemplate convertExportedTemplate(ExportedWorkflowTemplate template, String uid,
            Map<Integer, BotTypeList> botTypeMap) {
        MaasTemplate result = new MaasTemplate();
        result.setId(template.getId());
        result.setTemplateId(template.getId());
        result.setTitle(template.getTitle());
        result.setSubtitle(template.getSubtitle());
        result.setCoverUrl(template.getCoverUrl());
        result.setGroupId(template.getGroupId());
        if (template.getGroupId() != null) {
            BotTypeList botType = botTypeMap.get(template.getGroupId().intValue());
            if (botType != null) {
                result.setGroupName(botType.getTypeName());
                result.setGroupNameEn(botType.getTypeNameEn());
            }
        }
        result.setTemplateSource(MaasTemplate.TEMPLATE_SOURCE_EXPORTED);
        result.setDeletable(Objects.equals(template.getCreatorUid(), uid));
        result.setCreateTime(template.getCreateTime());
        result.setUpdateTime(template.getUpdateTime());
        return result;
    }

    private String exportWorkflowSnapshot(Workflow workflow) {
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            workflowExportService.exportWorkflowDataAsYaml(workflow, outputStream);
            return outputStream.toString(StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("Export workflow template snapshot failed, workflowId={}", workflow.getId(), e);
            throw new BusinessException(ResponseEnum.WORKFLOW_EXPORT_FAILED);
        }
    }

    private String generateTemplateCover(String uid, Workflow workflow) {
        String fallbackCover = workflow.getAvatarIcon();
        try {
            String coverUrl = CompletableFuture
                    .supplyAsync(() -> botAIService.generateAvatar(uid, workflow.getName(), workflow.getDescription()))
                    .orTimeout(TEMPLATE_COVER_TIMEOUT_SECONDS, TimeUnit.SECONDS)
                    .exceptionally(ex -> null)
                    .join();
            if (StringUtils.isBlank(coverUrl) || AI_AVATAR_FALLBACK.equals(coverUrl)) {
                return fallbackCover;
            }
            return coverUrl;
        } catch (Exception e) {
            log.warn("Generate workflow template cover failed, workflowId={}", workflow.getId(), e);
            return fallbackCover;
        }
    }

    private LambdaQueryWrapper<ExportedWorkflowTemplate> withSpaceScope(LambdaQueryWrapper<ExportedWorkflowTemplate> queryWrapper) {
        Long spaceId = SpaceInfoUtil.getSpaceId();
        if (spaceId == null) {
            queryWrapper.isNull(ExportedWorkflowTemplate::getSpaceId);
        } else {
            queryWrapper.eq(ExportedWorkflowTemplate::getSpaceId, spaceId);
        }
        return queryWrapper;
    }
}
