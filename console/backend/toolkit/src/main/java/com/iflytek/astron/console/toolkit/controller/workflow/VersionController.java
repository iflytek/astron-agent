package com.iflytek.astron.console.toolkit.controller.workflow;

import com.alibaba.fastjson2.JSONObject;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.toolkit.common.anno.ResponseResultBody;
import com.iflytek.astron.console.toolkit.entity.table.workflow.WorkflowVersion;
import com.iflytek.astron.console.toolkit.service.workflow.VersionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for managing workflow versions.
 * <p>
 * Provides APIs for listing, creating, restoring, updating, and querying workflow version
 * information.
 * </p>
 */
@RestController
@RequestMapping("/workflow/version")
@Slf4j
@ResponseResultBody
@Tag(name = "Workflow version management interface")
public class VersionController {

    @Resource
    VersionService versionService;

    /**
     * Update workflow version publish result.
     *
     * @param createDto workflow version data with ID and publish result
     * @return update result
     * @throws IllegalArgumentException if {@code id} is null
     */
    @PostMapping("/update-channel-result")
    public ApiResult<JSONObject> update_channel_result(@RequestBody WorkflowVersion createDto) {
        return versionService.update_channel_result(createDto);
    }

    /**
     * Get workflow version name.
     *
     * @param createDto workflow version filter object
     * @return version name
     * @throws IllegalArgumentException if required parameters are missing
     */
    @PostMapping("/get-version-name")
    public Object getVersionName(@RequestBody WorkflowVersion createDto) {
        return versionService.getVersionName(createDto);
    }

    /**
     * Get the maximum version number of a workflow by botId.
     *
     * @param botId bot identifier
     * @return maximum version information
     * @throws IllegalArgumentException if {@code botId} is blank
     */
    @GetMapping("/get-max-version")
    public Object getMaxVersion(@RequestParam String botId) {
        return versionService.getMaxVersion(botId);
    }

    /**
     * Query publish result of a workflow version by flowId and name.
     *
     * @param flowId workflow identifier
     * @param name version name
     * @return publish result object
     * @throws IllegalArgumentException if {@code flowId} or {@code name} is blank
     */
    @GetMapping("/publish-result")
    public Object publishResult(@RequestParam String flowId,
            @RequestParam String name) {
        return versionService.publishResult(flowId, name);
    }
}
