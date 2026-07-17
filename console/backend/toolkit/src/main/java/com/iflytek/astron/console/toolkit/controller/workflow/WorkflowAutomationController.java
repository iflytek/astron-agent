package com.iflytek.astron.console.toolkit.controller.workflow;

import com.iflytek.astron.console.commons.annotation.space.SpacePreAuth;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.toolkit.common.anno.ResponseResultBody;
import com.iflytek.astron.console.toolkit.entity.common.PageData;
import com.iflytek.astron.console.toolkit.entity.common.Pagination;
import com.iflytek.astron.console.toolkit.entity.dto.automation.WorkflowAutomationCronPreviewReq;
import com.iflytek.astron.console.toolkit.entity.dto.automation.WorkflowAutomationEnableReq;
import com.iflytek.astron.console.toolkit.entity.dto.automation.WorkflowAutomationTaskReq;
import com.iflytek.astron.console.toolkit.entity.table.workflow.WorkflowAutomationRun;
import com.iflytek.astron.console.toolkit.entity.table.workflow.WorkflowAutomationTask;
import com.iflytek.astron.console.toolkit.service.workflow.WorkflowAutomationService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/workflow/automation")
@ResponseResultBody
@Validated
@RequiredArgsConstructor
@Tag(name = "Workflow automation management interface")
public class WorkflowAutomationController {

    private final WorkflowAutomationService workflowAutomationService;

    @GetMapping("/page")
    @SpacePreAuth(
            key = "WorkflowAutomationController_page_GET",
            module = "Workflow Automation",
            point = "Workflow Automation List",
            description = "Workflow Automation List")
    public PageData<WorkflowAutomationTask> page(
            @NotNull(message = "Pagination parameters cannot be null") Pagination pagination,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean enabled) {
        if (pagination.isEmpty()) {
            throw new BusinessException(ResponseEnum.PAGE_SEPARATOR_MISS);
        }
        return workflowAutomationService.pageTasks(pagination.getCurrent(), pagination.getPageSize(), search, enabled);
    }

    @PostMapping
    @SpacePreAuth(
            key = "WorkflowAutomationController_create_POST",
            module = "Workflow Automation",
            point = "Workflow Automation Create",
            description = "Workflow Automation Create")
    public WorkflowAutomationTask create(@RequestBody @Valid WorkflowAutomationTaskReq req) {
        return workflowAutomationService.createTask(req);
    }

    @PutMapping("/{id}")
    @SpacePreAuth(
            key = "WorkflowAutomationController_update_PUT",
            module = "Workflow Automation",
            point = "Workflow Automation Update",
            description = "Workflow Automation Update")
    public WorkflowAutomationTask update(@PathVariable Long id, @RequestBody @Valid WorkflowAutomationTaskReq req) {
        return workflowAutomationService.updateTask(id, req);
    }

    @PostMapping("/{id}/enable")
    @SpacePreAuth(
            key = "WorkflowAutomationController_enable_POST",
            module = "Workflow Automation",
            point = "Workflow Automation Enable",
            description = "Workflow Automation Enable")
    public WorkflowAutomationTask enable(@PathVariable Long id, @RequestBody @Valid WorkflowAutomationEnableReq req) {
        return workflowAutomationService.enableTask(id, req.getEnabled());
    }

    @DeleteMapping("/{id}")
    @SpacePreAuth(
            key = "WorkflowAutomationController_delete_DELETE",
            module = "Workflow Automation",
            point = "Workflow Automation Delete",
            description = "Workflow Automation Delete")
    public Boolean delete(@PathVariable Long id) {
        return workflowAutomationService.deleteTask(id);
    }

    @GetMapping("/{id}/runs")
    @SpacePreAuth(
            key = "WorkflowAutomationController_runs_GET",
            module = "Workflow Automation",
            point = "Workflow Automation Runs",
            description = "Workflow Automation Runs")
    public PageData<WorkflowAutomationRun> runs(
            @PathVariable Long id,
            @NotNull(message = "Pagination parameters cannot be null") Pagination pagination) {
        if (pagination.isEmpty()) {
            throw new BusinessException(ResponseEnum.PAGE_SEPARATOR_MISS);
        }
        return workflowAutomationService.pageRuns(id, pagination.getCurrent(), pagination.getPageSize());
    }

    @PostMapping("/cron/preview")
    @SpacePreAuth(
            key = "WorkflowAutomationController_cronPreview_POST",
            module = "Workflow Automation",
            point = "Workflow Automation Cron Preview",
            description = "Workflow Automation Cron Preview")
    public List<String> preview(@RequestBody @Valid WorkflowAutomationCronPreviewReq req) {
        return workflowAutomationService.preview(req.getCronExpression(), req.getTimezone());
    }

    @PostMapping("/{id}/run-now")
    @SpacePreAuth(
            key = "WorkflowAutomationController_runNow_POST",
            module = "Workflow Automation",
            point = "Workflow Automation Run Now",
            description = "Workflow Automation Run Now")
    public WorkflowAutomationRun runNow(@PathVariable Long id) {
        return workflowAutomationService.runNow(id);
    }
}
