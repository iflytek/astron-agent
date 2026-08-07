package com.iflytek.astron.console.toolkit.task.scheduler;

import com.iflytek.astron.console.toolkit.service.workflow.WorkflowAutomationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class WorkflowAutomationScheduler {

    private final WorkflowAutomationService workflowAutomationService;

    @Scheduled(cron = "0 * * * * ?")
    public void scanDueWorkflowAutomationTasks() {
        try {
            workflowAutomationService.scanAndRunDueTasks();
        } catch (Exception e) {
            log.warn("[workflow automation] scan failed: {}", e.getMessage(), e);
        }
    }
}
