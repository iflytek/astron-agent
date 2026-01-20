package com.iflytek.astron.console.hub.listener;

import com.iflytek.astron.console.commons.entity.bot.ChatBotBase;
import com.iflytek.astron.console.commons.enums.ShelfStatusEnum;
import com.iflytek.astron.console.commons.enums.bot.ReleaseTypeEnum;
import com.iflytek.astron.console.commons.enums.bot.BotTypeEnum;
import com.iflytek.astron.console.commons.mapper.bot.ChatBotBaseMapper;
import com.iflytek.astron.console.commons.service.data.UserLangChainDataService;
import com.iflytek.astron.console.hub.dto.workflow.WorkflowReleaseResponseDto;
import com.iflytek.astron.console.hub.event.BotPublishStatusChangedEvent;
import com.iflytek.astron.console.hub.service.workflow.WorkflowReleaseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Workflow bot publish listener Listens to BotPublishStatusChangedEvent and handles special publish
 * logic for workflow bots
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WorkflowBotPublishListener {

    private final ChatBotBaseMapper chatBotBaseMapper;
    private final UserLangChainDataService userLangChainDataService;
    private final WorkflowReleaseService workflowReleaseService;

    /**
     * Handle bot publish status change event Execute workflow-specific logic if it's a workflow bot
     * being published to market
     */
    @EventListener
    public void handleBotPublishStatusChanged(BotPublishStatusChangedEvent event) {
        // Only handle publish to market operations
        if (!ShelfStatusEnum.isPublishAction(event.getAction())) {
            return;
        }

        log.info("Checking if workflow bot publish handling is needed: botId={}, action={}", event.getBotId(), event.getAction());

        try {
            // 1. Query bot information to check if it's a workflow type
            ChatBotBase botBase = chatBotBaseMapper.selectById(event.getBotId());
            if (botBase == null) {
                log.warn("Bot not found, skipping workflow publish handling: botId={}", event.getBotId());
                return;
            }

            // 2. Check if it's a workflow bot
            if (!BotTypeEnum.isWorkflowBot(botBase.getVersion()) && !BotTypeEnum.isTalkBot(botBase.getVersion())) {
                log.debug("Not a workflow bot, skipping workflow publish handling: botId={}, version={}", event.getBotId(), botBase.getVersion());
                return;
            }

            log.info("Starting workflow bot publish handling: botId={}, version={}", event.getBotId(), botBase.getVersion());

            // 3. Get flowId for workflow-specific operations
            String flowId = userLangChainDataService.findFlowIdByBotId(event.getBotId());
            if (flowId == null || flowId.trim().isEmpty()) {
                log.warn("Workflow bot missing flowId, skipping workflow version creation: botId={}", event.getBotId());
                return;
            }

            // 4. Execute workflow publish logic (including version creation and API sync)
            WorkflowReleaseResponseDto response = workflowReleaseService.publishWorkflow(
                    event.getBotId(),
                    event.getUid(),
                    event.getSpaceId(),
                    ReleaseTypeEnum.MARKET.name());

            if (response.getSuccess()) {
                log.info("Workflow bot publish and sync successful: botId={}, versionId={}, versionName={}",
                        event.getBotId(), response.getWorkflowVersionId(), response.getWorkflowVersionName());
            } else {
                log.error("Workflow bot publish failed: botId={}, error={}",
                        event.getBotId(), response.getErrorMessage());
            }

        } catch (Exception e) {
            // Workflow publish failure should not affect the main process, just log the error
            log.error("Exception occurred while handling workflow bot publish: botId={}, uid={}, spaceId={}",
                    event.getBotId(), event.getUid(), event.getSpaceId(), e);
        }
    }
}
