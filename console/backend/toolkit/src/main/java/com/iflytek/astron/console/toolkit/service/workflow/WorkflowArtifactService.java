package com.iflytek.astron.console.toolkit.service.workflow;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.entity.workflow.Workflow;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.util.S3ClientUtil;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import com.iflytek.astron.console.toolkit.entity.dto.workflow.WorkflowArtifactDto;
import com.iflytek.astron.console.toolkit.entity.table.workflow.WorkflowArtifact;
import com.iflytek.astron.console.toolkit.handler.UserInfoManagerHandler;
import com.iflytek.astron.console.toolkit.mapper.workflow.WorkflowArtifactMapper;
import com.iflytek.astron.console.toolkit.mapper.workflow.WorkflowMapper;
import com.iflytek.astron.console.toolkit.tool.DataPermissionCheckTool;
import com.iflytek.astron.console.toolkit.util.S3Util;
import jakarta.annotation.Resource;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@Slf4j
public class WorkflowArtifactService
        extends ServiceImpl<WorkflowArtifactMapper, WorkflowArtifact> {

    @Resource
    private WorkflowMapper workflowMapper;

    @Resource
    private DataPermissionCheckTool dataPermissionCheckTool;

    @Resource
    private S3ClientUtil s3ClientUtil;

    @Resource
    private S3Util s3Util;

    @Value("${skill.sandbox.artifact-upload-token:}")
    private String artifactUploadToken;

    public List<WorkflowArtifactDto> listArtifacts(Long workflowId) {
        assertWorkflowVisible(workflowId);
        return list(scopeQuery(workflowId)
                .orderByDesc(WorkflowArtifact::getCreateTime)
                .orderByDesc(WorkflowArtifact::getId))
                .stream()
                .map(this::toDto)
                .toList();
    }

    public WorkflowArtifactDto getDownloadInfo(Long artifactId) {
        WorkflowArtifact artifact = getScopedArtifact(artifactId);
        assertWorkflowVisible(artifact.getWorkflowId());
        return toDto(artifact);
    }

    @Transactional
    public void deleteArtifact(Long artifactId) {
        WorkflowArtifact artifact = getScopedArtifact(artifactId);
        assertWorkflowVisible(artifact.getWorkflowId());
        artifact.setDeleted(Boolean.TRUE);
        artifact.setUpdateTime(LocalDateTime.now());
        updateById(artifact);
    }

    @Transactional
    public WorkflowArtifactDto uploadInternal(
            String token,
            Long workflowId,
            String flowId,
            String uid,
            Long spaceId,
            String runId,
            String nodeId,
            String skillId,
            String source,
            MultipartFile file) {
        validateInternalToken(token);
        Workflow workflow = resolveWorkflow(workflowId, flowId, uid, spaceId);
        if (workflow == null
                || StringUtils.isBlank(uid)
                || file == null
                || file.isEmpty()
                || StringUtils.isBlank(file.getOriginalFilename())) {
            throw new BusinessException(ResponseEnum.PARAM_ERROR);
        }
        String fileName = normalizeFileName(file.getOriginalFilename());
        String contentType = StringUtils.defaultIfBlank(file.getContentType(), "application/octet-stream");
        String objectKey = buildObjectKey(workflow.getId(), runId, fileName);
        try (InputStream input = file.getInputStream()) {
            s3Util.putObject(objectKey, input, file.getSize(), contentType);
        } catch (Exception ex) {
            log.error("Upload workflow artifact failed, workflowId={}, fileName={}", workflow.getId(), fileName, ex);
            throw new BusinessException(ResponseEnum.S3_UPLOAD_ERROR);
        }
        WorkflowArtifact artifact = new WorkflowArtifact();
        LocalDateTime now = LocalDateTime.now();
        artifact.setUid(uid);
        artifact.setSpaceId(spaceId);
        artifact.setWorkflowId(workflow.getId());
        artifact.setRunId(StringUtils.trimToEmpty(runId));
        artifact.setNodeId(StringUtils.trimToEmpty(nodeId));
        artifact.setSkillId(StringUtils.trimToEmpty(skillId));
        artifact.setFileName(fileName);
        artifact.setObjectKey(objectKey);
        artifact.setContentType(contentType);
        artifact.setFileSize(file.getSize());
        artifact.setSource(normalizeSource(source));
        artifact.setDeleted(Boolean.FALSE);
        artifact.setCreateTime(now);
        artifact.setUpdateTime(now);
        save(artifact);
        return toDto(artifact);
    }

    private WorkflowArtifact getScopedArtifact(Long artifactId) {
        if (artifactId == null) {
            throw new BusinessException(ResponseEnum.PARAM_ERROR);
        }
        WorkflowArtifact artifact = getOne(Wrappers.lambdaQuery(WorkflowArtifact.class)
                .eq(WorkflowArtifact::getId, artifactId)
                .eq(WorkflowArtifact::getDeleted, Boolean.FALSE), false);
        if (artifact == null) {
            throw new BusinessException(ResponseEnum.DATA_NOT_EXIST);
        }
        return artifact;
    }

    private LambdaQueryWrapper<WorkflowArtifact> scopeQuery(Long workflowId) {
        LambdaQueryWrapper<WorkflowArtifact> wrapper = Wrappers.lambdaQuery(WorkflowArtifact.class)
                .eq(WorkflowArtifact::getWorkflowId, workflowId)
                .eq(WorkflowArtifact::getDeleted, Boolean.FALSE);
        Long spaceId = SpaceInfoUtil.getSpaceId();
        if (spaceId != null) {
            wrapper.eq(WorkflowArtifact::getSpaceId, spaceId);
        } else {
            wrapper.eq(WorkflowArtifact::getUid, UserInfoManagerHandler.getUserId());
        }
        return wrapper;
    }

    private void assertWorkflowVisible(Long workflowId) {
        Workflow workflow = workflowMapper.selectById(workflowId);
        dataPermissionCheckTool.checkWorkflowVisible(workflow, SpaceInfoUtil.getSpaceId());
    }

    private WorkflowArtifactDto toDto(WorkflowArtifact artifact) {
        WorkflowArtifactDto dto = new WorkflowArtifactDto();
        dto.setId(artifact.getId());
        dto.setWorkflowId(artifact.getWorkflowId());
        dto.setRunId(artifact.getRunId());
        dto.setNodeId(artifact.getNodeId());
        dto.setSkillId(artifact.getSkillId());
        dto.setFileName(artifact.getFileName());
        dto.setContentType(artifact.getContentType());
        dto.setFileSize(artifact.getFileSize());
        dto.setSource(artifact.getSource());
        dto.setCreateTime(artifact.getCreateTime());
        if (StringUtils.isNotBlank(artifact.getObjectKey())) {
            dto.setDownloadUrl(s3ClientUtil.generatePresignedGetUrl(artifact.getObjectKey()));
        }
        return dto;
    }

    private void validateInternalToken(String token) {
        if (StringUtils.isBlank(artifactUploadToken)) {
            return;
        }
        if (!StringUtils.equals(artifactUploadToken, token)) {
            throw new BusinessException(ResponseEnum.UNAUTHORIZED);
        }
    }

    private Workflow resolveWorkflow(Long workflowId, String flowId, String uid, Long spaceId) {
        LambdaQueryWrapper<Workflow> wrapper = Wrappers.lambdaQuery(Workflow.class)
                .eq(Workflow::getDeleted, Boolean.FALSE);
        if (workflowId != null) {
            wrapper.eq(Workflow::getId, workflowId);
        } else if (StringUtils.isNotBlank(flowId)) {
            wrapper.eq(Workflow::getFlowId, flowId);
        } else {
            return null;
        }
        if (spaceId != null) {
            wrapper.eq(Workflow::getSpaceId, spaceId);
        } else {
            wrapper.eq(Workflow::getUid, uid);
        }
        return workflowMapper.selectOne(wrapper.last("limit 1"));
    }

    private String buildObjectKey(Long workflowId, String runId, String fileName) {
        String runSegment = StringUtils.defaultIfBlank(normalizePathSegment(runId), "manual");
        return "workflow/artifacts/"
                + workflowId
                + "/"
                + runSegment
                + "/"
                + UUID.randomUUID().toString().replace("-", "")
                + "_"
                + fileName;
    }

    private String normalizeFileName(String fileName) {
        String normalized = StringUtils.defaultString(fileName)
                .replace("\\", "/");
        int slash = normalized.lastIndexOf('/');
        if (slash >= 0) {
            normalized = normalized.substring(slash + 1);
        }
        normalized = normalized.replaceAll("[\\\\/:*?\"<>|]+", "_").replaceAll("\\.\\.+", ".");
        normalized = normalized.replaceAll("^\\.+", "");
        return StringUtils.defaultIfBlank(normalized, "artifact");
    }

    private String normalizeSource(String source) {
        String normalized = StringUtils.trimToEmpty(source);
        if (StringUtils.equalsAny(normalized, "skill_sandbox", "code_sandbox")) {
            return normalized;
        }
        return "skill_sandbox";
    }

    private String normalizePathSegment(String value) {
        return StringUtils.defaultString(value).replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}
