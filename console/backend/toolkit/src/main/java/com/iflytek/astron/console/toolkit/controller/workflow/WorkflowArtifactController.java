package com.iflytek.astron.console.toolkit.controller.workflow;

import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.toolkit.common.anno.ResponseResultBody;
import com.iflytek.astron.console.toolkit.entity.dto.workflow.WorkflowArtifactDto;
import com.iflytek.astron.console.toolkit.service.workflow.WorkflowArtifactService;
import jakarta.annotation.Resource;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/workflow")
@ResponseResultBody
public class WorkflowArtifactController {

    @Resource
    private WorkflowArtifactService workflowArtifactService;

    @GetMapping("/{workflowId}/artifacts")
    public ApiResult<List<WorkflowArtifactDto>> list(@PathVariable Long workflowId) {
        return ApiResult.success(workflowArtifactService.listArtifacts(workflowId));
    }

    @GetMapping("/artifacts/{artifactId}/download")
    public ApiResult<WorkflowArtifactDto> download(@PathVariable Long artifactId) {
        return ApiResult.success(workflowArtifactService.getDownloadInfo(artifactId));
    }

    @DeleteMapping("/artifacts/{artifactId}")
    public ApiResult<Void> delete(@PathVariable Long artifactId) {
        workflowArtifactService.deleteArtifact(artifactId);
        return ApiResult.success();
    }

    @PostMapping("/artifacts/internal-upload")
    public ApiResult<WorkflowArtifactDto> uploadInternal(
            @RequestHeader(value = "X-Skill-Sandbox-Artifact-Token", required = false) String token,
            @RequestParam(value = "workflowId", required = false) Long workflowId,
            @RequestParam(value = "flowId", required = false) String flowId,
            @RequestParam("uid") String uid,
            @RequestParam(value = "spaceId", required = false) Long spaceId,
            @RequestParam(value = "runId", required = false) String runId,
            @RequestParam(value = "nodeId", required = false) String nodeId,
            @RequestParam(value = "skillId", required = false) String skillId,
            @RequestParam(value = "source", required = false) String source,
            @RequestPart("file") MultipartFile file) {
        return ApiResult.success(workflowArtifactService.uploadInternal(
                token, workflowId, flowId, uid, spaceId, runId, nodeId, skillId, source, file));
    }
}
