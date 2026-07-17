package com.iflytek.astron.console.commons.service.workflow.impl;

import cn.hutool.core.util.StrUtil;
import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.constant.RedisKeyConstant;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.dto.chat.ChatModelMeta;
import com.iflytek.astron.console.commons.dto.chat.ChatReqModelDto;
import com.iflytek.astron.console.commons.dto.chat.ChatRequestDto;
import com.iflytek.astron.console.commons.dto.chat.ChatRequestDtoList;
import com.iflytek.astron.console.commons.entity.bot.ChatBotMarket;
import com.iflytek.astron.console.commons.dto.bot.ChatBotReqDto;
import com.iflytek.astron.console.commons.entity.chat.*;
import com.iflytek.astron.console.commons.dto.workflow.WorkflowApiRequest;
import com.iflytek.astron.console.commons.dto.workflow.WorkflowEventData;
import com.iflytek.astron.console.commons.dto.workflow.WorkflowResumeRequest;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.service.WssListenerService;
import com.iflytek.astron.console.commons.service.bot.ChatBotDataService;
import com.iflytek.astron.console.commons.service.data.ChatDataService;
import com.iflytek.astron.console.commons.service.data.ChatHistoryService;
import com.iflytek.astron.console.commons.service.data.UserLangChainDataService;
import com.iflytek.astron.console.commons.entity.bot.UserLangChainInfo;
import com.iflytek.astron.console.commons.enums.ShelfStatusEnum;
import com.iflytek.astron.console.commons.service.workflow.WorkflowBotChatService;
import com.iflytek.astron.console.commons.service.workflow.WorkflowBotParamService;
import com.iflytek.astron.console.commons.service.workflow.WorkflowVersionLookupService;
import com.iflytek.astron.console.commons.workflow.WorkflowClient;
import com.iflytek.astron.console.commons.workflow.WorkflowListener;
import lombok.extern.slf4j.Slf4j;
import okhttp3.MediaType;
import okhttp3.RequestBody;
import org.redisson.api.RedissonClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDateTime;
import java.util.LinkedList;
import java.util.List;

/**
 * @author mingsuiyongheng
 */
@Service
@Slf4j
public class WorkflowBotChatServiceImpl implements WorkflowBotChatService {

    @Autowired
    private UserLangChainDataService userLangChainDataService;

    @Autowired
    private ChatDataService chatDataService;

    @Autowired
    private WorkflowBotParamService workflowBotParamService;

    @Autowired
    private ChatHistoryService chatHistoryService;

    @Autowired
    private ChatBotDataService chatBotDataService;

    @Autowired
    private RedissonClient redissonClient;

    @Autowired
    private WssListenerService wssListenerService;

    @Autowired
    private WorkflowVersionLookupService workflowVersionLookupService;

    @Value("${workflow.chatUrl}")
    private String chatUrl;

    @Value("${workflow.debugUrl}")
    private String debugUrl;

    @Value("${workflow.resumeUrl}")
    private String resumeUrl;

    @Value("${common.appid}")
    private String appId;

    @Value("${common.apiKey}")
    private String appKey;

    @Value("${common.apiSecret}")
    private String appSecret;

    /**
     * Handle chatbot workflow requests
     *
     * @param chatBotReqDto Chat bot request data transfer object
     * @param sseEmitter Server-Sent Events emitter
     * @param sseId Server-sent event identifier
     * @param workflowOperation Workflow operation type
     * @param workflowVersion Workflow version
     */
    @Override
    public void chatWorkflowBot(ChatBotReqDto chatBotReqDto, SseEmitter sseEmitter, String sseId, String workflowOperation, String workflowVersion) {
        String uid = chatBotReqDto.getUid();
        Long chatId = chatBotReqDto.getChatId();
        String ask = chatBotReqDto.getAsk();
        String url = chatBotReqDto.getUrl();
        Integer botId = chatBotReqDto.getBotId();

        JSONObject inputs = new JSONObject();
        inputs.put("AGENT_USER_INPUT", ask);

        UserLangChainInfo userLangChainInfo = userLangChainDataService.findOneByBotId(botId);
        if (userLangChainInfo == null) {
            throw new BusinessException(ResponseEnum.BOT_CHAIN_SUBMIT_ERROR);
        }
        String flowId = userLangChainInfo.getFlowId();
        String effectiveWorkflowVersion = resolveWorkflowVersion(botId, flowId, workflowVersion);
        // Record current question
        ChatReqRecords chatReqRecords = new ChatReqRecords();
        chatReqRecords.setChatId(chatId);
        chatReqRecords.setUid(uid);
        chatReqRecords.setMessage(ask);
        chatReqRecords.setClientType(0);
        chatReqRecords.setCreateTime(LocalDateTime.now());
        chatReqRecords.setUpdateTime(LocalDateTime.now());
        chatReqRecords.setNewContext(1);
        chatReqRecords = chatDataService.createRequest(chatReqRecords);
        Long reqId = chatReqRecords.getId();

        JSONObject extraInputs = JSONObject.parseObject(userLangChainInfo.getExtraInputs());

        // Handle multi-file parameter type
        List<JSONObject> extraInputsConfig = JSON.parseArray(userLangChainInfo.getExtraInputsConfig(), JSONObject.class);

        boolean hasSet = workflowBotParamService.handleMultiFileParam(uid, chatId, null, extraInputsConfig, inputs, reqId);
        if (!hasSet) {
            workflowBotParamService.handleSingleParam(uid, chatId, sseId, null, url, extraInputs, reqId, inputs, botId);
        }

        // Get multimodal chat records for current chat question
        List<ChatReqModelDto> reqList = chatDataService.getReqModelBotHistoryByChatId(uid, chatId);
        ChatRequestDtoList requestDtoList = chatHistoryService.getHistory(uid, chatId, reqList);
        filterContent(requestDtoList);
        WorkflowApiRequest workflowApiRequest = new WorkflowApiRequest(flowId, uid, inputs, requestDtoList.getMessages(), effectiveWorkflowVersion);
        log.info("workflowApiRequest:{}", workflowApiRequest);
        RequestBody body = RequestBody.create(JSON.toJSONString(workflowApiRequest), MediaType.parse("application/json; charset=utf-8"));

        // Check if already published
        ChatBotMarket market = chatBotDataService.findMarketBotByBotId(botId);
        String apiUsedUrl;
        // If not submitted for publishing, use debug interface, otherwise use chat interface
        boolean isDebug = false;
        if (market == null || ShelfStatusEnum.isOffShelf(market.getBotStatus())) {
            apiUsedUrl = debugUrl;
            isDebug = true;
        } else {
            apiUsedUrl = chatUrl;
        }
        log.info("apiUsedUrl:{}, workflow request parameters:{}", apiUsedUrl, JSON.toJSONString(workflowApiRequest));
        // If resuming session, use resume interface
        if (WorkflowEventData.WorkflowOperation.resumeDial(workflowOperation)) {
            String valueType = redissonClient.<String>getBucket(StrUtil.format(RedisKeyConstant.MAAS_WORKFLOW_EVENT_VALUE_TYPE, uid, chatId)).get();
            if (WorkflowEventData.WorkflowValueType.OPTION.getTag().equals(valueType)) {
                try {
                    WorkflowEventData.EventValue.ValueOption askValue = JSON.parseObject(chatBotReqDto.getAsk(),
                            WorkflowEventData.EventValue.ValueOption.class);
                    if (askValue != null) {
                        ask = askValue.getId();
                    }
                } catch (Exception e) {
                    log.debug("Ask conversion exception, using original ask: {}", ask);
                }
            }
            WorkflowResumeRequest build = WorkflowResumeRequest.builder()
                    .eventId(redissonClient.<String>getBucket(StrUtil.format(RedisKeyConstant.MAAS_WORKFLOW_EVENT_ID, uid,
                            chatId)).get())
                    .eventType(workflowOperation)
                    .content(ask)
                    .build();
            body = RequestBody.create(JSON.toJSONString(build), MediaType.parse("application/json; charset=utf-8"));
            apiUsedUrl = resumeUrl;
        }
        WorkflowClient client = new WorkflowClient(apiUsedUrl, appId, appKey, appSecret, body);
        WorkflowListener listener = new WorkflowListener(client, chatReqRecords, sseId, wssListenerService, isDebug, sseEmitter);
        client.createWebSocketConnect(listener);
    }

    private String resolveWorkflowVersion(Integer botId, String flowId, String workflowVersion) {
        if (!StrUtil.isBlank(workflowVersion)
                && !"undefined".equalsIgnoreCase(workflowVersion)
                && !"null".equalsIgnoreCase(workflowVersion)) {
            boolean published = workflowVersionLookupService.isPublishedVersion(flowId, workflowVersion).orElse(false);
            if (published) {
                return workflowVersion;
            }
            log.warn("Requested workflow version is not published, fallback to latest successful version: botId={}, flowId={}, version={}",
                    botId, flowId, workflowVersion);
        }
        return workflowVersionLookupService.findLatestSuccessfulVersionName(botId)
                .orElseThrow(() -> new BusinessException(ResponseEnum.WORKFLOW_VERSION_NOT_FOUND));
    }

    /**
     * Filter chat request content
     *
     * @param requestDtoList Chat request list
     */
    private void filterContent(ChatRequestDtoList requestDtoList) {
        LinkedList<ChatRequestDto> filteredMessages = new LinkedList<>();
        boolean removeNext = false;
        for (ChatRequestDto dto : requestDtoList.getMessages()) {
            Object content = dto.getContent();
            if (content instanceof List<?> list) {
                // Type-safe iteration without unchecked cast
                for (Object item : list) {
                    if (item instanceof ChatModelMeta itemJson) {
                        String type = itemJson.getType();
                        if ("text".equals(type)) {
                            ChatRequestDto filteredDto = new ChatRequestDto();
                            filteredDto.setRole(dto.getRole());
                            filteredDto.setContent(itemJson.getText());
                            filteredDto.setContent_type(dto.getContent_type());
                            filteredMessages.add(filteredDto);
                            break;
                        }
                    }
                }
            } else {
                // Determine if this item should be removed when passed to large model
                boolean remove = shouldRemove(content);
                if (!removeNext && !remove) {
                    // Non-list type, keep directly
                    filteredMessages.add(dto);
                }
                // When this item needs to be removed when passed to large model, the next item should also be
                // removed
                removeNext = remove;
            }
        }
        requestDtoList.setMessages(filteredMessages);
    }

    /**
     * Determine whether the given content should be removed
     *
     * @param content Content object to be evaluated
     * @return Returns true if should be removed, otherwise false
     */
    private boolean shouldRemove(Object content) {
        try {
            WorkflowEventData.EventValue eventValue = JSON.parseObject(String.valueOf(content), WorkflowEventData.EventValue.class);
            if (eventValue != null && WorkflowEventData.WorkflowValueType.getTag(eventValue.getType()) != null) {
                return true;
            }
        } catch (Exception ignored) {
            // Ignore JSON parsing exceptions, content is not workflow event data
        }
        return false;
    }
}
