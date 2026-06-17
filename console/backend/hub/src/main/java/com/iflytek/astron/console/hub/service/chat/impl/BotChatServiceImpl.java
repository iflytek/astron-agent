package com.iflytek.astron.console.hub.service.chat.impl;

import cn.hutool.core.collection.CollectionUtil;
import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.dto.bot.ChatBotReqDto;
import com.iflytek.astron.console.commons.dto.bot.DebugChatBotReqDto;
import com.iflytek.astron.console.commons.dto.chat.ChatListCreateResponse;
import com.iflytek.astron.console.commons.dto.llm.SparkChatRequest;
import com.iflytek.astron.console.commons.entity.bot.ChatBotBase;
import com.iflytek.astron.console.commons.entity.bot.ChatBotMarket;
import com.iflytek.astron.console.commons.entity.chat.ChatList;
import com.iflytek.astron.console.commons.entity.chat.ChatReqRecords;
import com.iflytek.astron.console.commons.enums.ShelfStatusEnum;
import com.iflytek.astron.console.commons.enums.bot.BotTypeEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.service.bot.BotService;
import com.iflytek.astron.console.commons.service.bot.ChatBotDataService;
import com.iflytek.astron.console.commons.service.data.ChatDataService;
import com.iflytek.astron.console.commons.service.data.ChatHistoryService;
import com.iflytek.astron.console.commons.service.data.ChatListDataService;
import com.iflytek.astron.console.commons.service.data.UserLangChainDataService;
import com.iflytek.astron.console.commons.service.workflow.WorkflowBotChatService;
import com.iflytek.astron.console.commons.util.I18nUtil;
import com.iflytek.astron.console.commons.util.RequestContextUtil;
import com.iflytek.astron.console.commons.util.SseEmitterUtil;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import com.iflytek.astron.console.hub.data.ReqKnowledgeRecordsDataService;
import com.iflytek.astron.console.hub.entity.ReqKnowledgeRecords;
import com.iflytek.astron.console.hub.enums.ConfigTypeEnum;
import com.iflytek.astron.console.hub.service.bot.PersonalityConfigService;
import com.iflytek.astron.console.hub.service.chat.BotChatService;
import com.iflytek.astron.console.hub.service.chat.ChatListService;
import com.iflytek.astron.console.hub.service.chat.springai.AgentChatTask;
import com.iflytek.astron.console.hub.service.chat.springai.SpringAiAgentChatService;
import com.iflytek.astron.console.hub.service.knowledge.KnowledgeService;
import com.iflytek.astron.console.toolkit.entity.biz.modelconfig.ModelDto;
import com.iflytek.astron.console.toolkit.entity.vo.CategoryTreeVO;
import com.iflytek.astron.console.toolkit.entity.vo.LLMInfoVo;
import com.iflytek.astron.console.toolkit.service.model.ModelService;
import com.iflytek.astron.console.toolkit.service.skill.SkillEnrichmentService;
import com.iflytek.astron.console.toolkit.service.workflow.WorkflowService;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * @author mingsuiyongheng
 */
@Slf4j
@Service
public class BotChatServiceImpl implements BotChatService {

    @Autowired
    private ChatBotDataService chatBotDataService;

    @Autowired
    private ChatDataService chatDataService;

    @Autowired
    private SpringAiAgentChatService springAiAgentChatService;

    @Autowired
    private SkillEnrichmentService skillEnrichmentService;

    @Autowired
    private ChatHistoryService chatHistoryService;

    @Autowired
    private WorkflowBotChatService workflowBotChatService;

    @Autowired
    private KnowledgeService knowledgeService;

    @Value("${spark.chat.max.input.tokens:8000}")
    private int maxInputTokens;

    @Autowired
    private ChatListDataService chatListDataService;

    @Autowired
    private ChatListService chatListService;

    @Autowired
    private BotService botService;

    @Autowired
    private ModelService modelService;

    @Autowired
    private WorkflowService workflowService;

    @Autowired
    private UserLangChainDataService userLangChainDataService;

    @Autowired
    private ReqKnowledgeRecordsDataService reqKnowledgeRecordsDataService;

    @Autowired
    private PersonalityConfigService personalityConfigService;

    /**
     * Function to handle chat messages
     *
     * @param chatBotReqDto Chat bot request data object
     * @param sseEmitter Server-sent events emitter
     * @param sseId Server-sent events ID
     * @param workflowOperation Workflow operation
     * @param workflowVersion Workflow version
     */
    @Override
    public void chatMessageBot(ChatBotReqDto chatBotReqDto, SseEmitter sseEmitter, String sseId, String workflowOperation, String workflowVersion) {
        try {
            log.info("Processing chat request, sseId: {}, chatId: {}, uid: {}", sseId, chatBotReqDto.getChatId(), chatBotReqDto.getUid());

            BotConfiguration botConfig = getBotConfiguration(chatBotReqDto.getBotId());
            if (botConfig.version.equals(BotTypeEnum.WORKFLOW_BOT.getType()) || botConfig.version.equals(BotTypeEnum.TALK.getType())) {
                syncWorkflowRuntimeModel(chatBotReqDto.getBotId(), botConfig, sseEmitter);
                workflowBotChatService.chatWorkflowBot(chatBotReqDto, sseEmitter, sseId, workflowOperation, workflowVersion);
            } else {
                ChatReqRecords chatReqRecords = createChatRequest(chatBotReqDto);
                ModelConfigResult modelConfig = resolveChatModelConfiguration(botConfig.modelId, botConfig.model, sseEmitter);
                int maxInputTokens = modelConfig == null ? this.maxInputTokens : modelConfig.maxInputTokens();
                List<SparkChatRequest.MessageDto> messages = buildMessageList(chatBotReqDto, botConfig.supportContext,
                        botConfig.supportDocument, botConfig.prompt, maxInputTokens, chatReqRecords.getId());
                AgentChatTask task = AgentChatTask.builder()
                        .llmInfoVo(modelConfig == null ? null : modelConfig.llmInfoVo())
                        .sparkModelName(modelConfig == null ? botConfig.model : null)
                        .messages(messages)
                        .openedTool(botConfig.openedTool)
                        .mcpServerUrls(botConfig.mcpServerUrls)
                        .skills(enrichBotSkills(botConfig.skills()))
                        .userId(chatBotReqDto.getUid())
                        .chatId(chatBotReqDto.getChatId())
                        .chatReqRecords(chatReqRecords)
                        .edit(false)
                        .debug(false)
                        .build();
                springAiAgentChatService.chat(task, sseEmitter, sseId);
            }
        } catch (Exception e) {
            log.error("Bot chat error for sseId: {}, chatId: {}, uid: {}", sseId, chatBotReqDto.getChatId(), chatBotReqDto.getUid(), e);
            SseEmitterUtil.completeWithError(sseEmitter, "Failed to process chat request: " + e.getMessage());
        }
    }

    /**
     * Method to re-answer messages
     *
     * @param requestId Request ID
     * @param botId Bot ID
     * @param sseEmitter SSE emitter
     * @param sseId SSE ID
     */
    @Override
    public void reAnswerMessageBot(Long requestId, Integer botId, SseEmitter sseEmitter, String sseId) {
        try {
            log.info("Processing re-answer request, sseId: {}, requestId: {}", sseId, requestId);

            ChatReqRecords chatReqRecords = chatDataService.findRequestById(requestId);
            BotConfiguration botConfig = getBotConfiguration(botId);
            ChatBotReqDto chatBotReqDto = new ChatBotReqDto();
            chatBotReqDto.setBotId(botId);
            chatBotReqDto.setChatId(chatReqRecords.getChatId());
            chatBotReqDto.setUid(chatReqRecords.getUid());
            chatBotReqDto.setAsk(chatReqRecords.getMessage());
            chatBotReqDto.setEdit(true);
            ModelConfigResult modelConfig = resolveChatModelConfiguration(botConfig.modelId, botConfig.model, sseEmitter);
            int maxInputTokens = modelConfig == null ? this.maxInputTokens : modelConfig.maxInputTokens();
            List<SparkChatRequest.MessageDto> messages = buildMessageList(chatBotReqDto, botConfig.supportContext,
                    botConfig.supportDocument, botConfig.prompt, maxInputTokens, chatReqRecords.getId());
            AgentChatTask task = AgentChatTask.builder()
                    .llmInfoVo(modelConfig == null ? null : modelConfig.llmInfoVo())
                    .sparkModelName(modelConfig == null ? botConfig.model : null)
                    .messages(messages)
                    .openedTool(botConfig.openedTool)
                    .mcpServerUrls(botConfig.mcpServerUrls)
                    .skills(enrichBotSkills(botConfig.skills()))
                    .userId(chatBotReqDto.getUid())
                    .chatId(chatBotReqDto.getChatId())
                    .chatReqRecords(chatReqRecords)
                    .edit(true)
                    .debug(false)
                    .build();
            springAiAgentChatService.chat(task, sseEmitter, sseId);
        } catch (Exception e) {
            log.error("Bot reAnswer error for sseId: {}, requestId: {}", sseId, requestId, e);
            SseEmitterUtil.completeWithError(sseEmitter, "Failed to process re-answer request: " + e.getMessage());
        }
    }

    /**
     * Debug chat bot messages
     *
     * @param request Debug chat bot request parameters
     * @param sseEmitter SSE emitter
     * @param sseId SSE ID
     */
    @Override
    public void debugChatMessageBot(DebugChatBotReqDto request, SseEmitter sseEmitter, String sseId) {
        try {
            List<SparkChatRequest.MessageDto> messageList;
            // get personality config prompt
            String prompt = personalityConfigService.getChatPrompt(request.getPersonalityConfig(), request.getPrompt());
            ModelConfigResult modelConfig = resolveChatModelConfiguration(request.getModelId(), request.getModel(), sseEmitter);
            int maxInputTokens = modelConfig == null ? this.maxInputTokens : modelConfig.maxInputTokens();
            messageList = buildDebugMessageList(request.getText(), prompt, request.getMessages(), maxInputTokens,
                    request.getMaasDatasetList());
            if (modelConfig != null) {
                Long spaceId = SpaceInfoUtil.getSpaceId();
                if (!modelService.checkModelBase(modelConfig.llmInfoVo().getLlmId(),
                        modelConfig.llmInfoVo().getServiceId(), modelConfig.llmInfoVo().getUrl(), request.getUid(), spaceId)) {
                    throw new BusinessException(ResponseEnum.MODEL_CHECK_FAILED);
                }
            }
            AgentChatTask task = AgentChatTask.builder()
                    .llmInfoVo(modelConfig == null ? null : modelConfig.llmInfoVo())
                    .sparkModelName(modelConfig == null ? request.getModel() : null)
                    .messages(messageList)
                    .openedTool(request.getOpenedTool())
                    .mcpServerUrls(request.getMcpServerUrls())
                    .skills(enrichBotSkills(request.getSkills()))
                    .userId(request.getUid())
                    .chatId(null)
                    .chatReqRecords(null)
                    .edit(false)
                    .debug(true)
                    .build();
            springAiAgentChatService.chat(task, sseEmitter, sseId);
        } catch (Exception e) {
            log.error("Bot debug error for sseId: {}, uid: {}", sseId, request.getUid(), e);
            SseEmitterUtil.completeWithError(sseEmitter, "Failed to process chat request: " + e.getMessage());
        }
    }

    /**
     * Clear chat window content
     *
     * @param chatId Chat window ID
     * @param uid User ID
     * @param botId Bot ID
     * @param botBase Chat bot base information
     * @return Chat window response object after clearing
     */
    @Override
    @Transactional
    public ChatListCreateResponse clear(Long chatId, String uid, Integer botId, ChatBotBase botBase) {
        // Check if this is the user's own assistant chat window
        ChatList chatList = chatListDataService.findByUidAndChatId(uid, chatId);
        if (chatList == null || !Objects.equals(chatList.getBotId(), botId)) {
            return new ChatListCreateResponse();
        }
        // Check if this window has chat history, if not, use this blank window directly
        if (chatDataService.countMessagesByChatId(chatId) == 0) {
            ChatListCreateResponse response = new ChatListCreateResponse();
            response.setId(chatId);
            response.setTitle(chatList.getTitle());
            response.setBotId(botId);
            response.setCreateTime(chatList.getCreateTime());
            return response;
        }
        // Delete window
        chatListService.logicDeleteChatList(chatId, uid);
        // Add new window based on botId
        ChatListCreateResponse chatListCreateResponse = chatListService.createRestartChat(uid, "", botId);
        // Add assistant to user's chat_bot_list
        if (!Objects.equals(botBase.getUid(), uid)) {
            botService.addV2Bot(uid, botId);
        }

        return chatListCreateResponse;
    }

    /**
     * Get model configuration and extract max input tokens
     *
     * @param modelId Model ID
     * @param sseEmitter SSE emitter for error handling
     * @return ModelConfigResult containing LLMInfoVo and maxInputTokens, or null if model doesn't exist
     */
    private ModelConfigResult getModelConfiguration(Long modelId, SseEmitter sseEmitter) {
        LLMInfoVo llmInfoVo = (LLMInfoVo) modelService.getDetail(0, modelId, null).data();
        if (llmInfoVo == null) {
            throw new BusinessException(ResponseEnum.MODEL_NOT_EXIST);
        }
        return buildModelConfigResult(llmInfoVo);
    }

    private ModelConfigResult resolveChatModelConfiguration(Long modelId, String model, SseEmitter sseEmitter) {
        if (modelId != null) {
            return getModelConfiguration(modelId, sseEmitter);
        }
        if (isSparkModel(model)) {
            return null;
        }
        return getModelConfigurationByDomain(model, sseEmitter);
    }

    private ModelConfigResult getModelConfigurationByDomain(String modelDomain, SseEmitter sseEmitter) {
        ModelDto modelDto = new ModelDto();
        modelDto.setType(0);
        modelDto.setPage(1);
        modelDto.setPageSize(1000);
        modelDto.setUid(RequestContextUtil.getUID());
        modelDto.setSpaceId(SpaceInfoUtil.getSpaceId());
        ApiResult<Page<LLMInfoVo>> listResult = modelService.getList(modelDto, null);
        Page<LLMInfoVo> page = listResult == null ? null : listResult.data();
        if (page == null || page.getRecords() == null) {
            log.error("Failed to get model list for domain: {}", modelDomain);
            SseEmitterUtil.completeWithError(sseEmitter, "Failed to get model config");
            throw new BusinessException(ResponseEnum.MODEL_CHECK_FAILED);
        }
        for (LLMInfoVo llmInfoVo : page.getRecords()) {
            if (llmInfoVo == null) {
                continue;
            }
            if (StringUtils.equalsIgnoreCase(modelDomain, llmInfoVo.getDomain())
                    || StringUtils.equalsIgnoreCase(modelDomain, llmInfoVo.getServiceId())) {
                return buildModelConfigResult(llmInfoVo);
            }
        }
        log.error("Failed to match model config by domain: {}", modelDomain);
        SseEmitterUtil.completeWithError(sseEmitter, "Failed to get model config");
        throw new BusinessException(ResponseEnum.MODEL_CHECK_FAILED);
    }

    private void syncWorkflowRuntimeModel(Integer botId, BotConfiguration botConfig, SseEmitter sseEmitter) {
        if (botId == null || botConfig == null) {
            return;
        }
        var userLangChainInfo = userLangChainDataService.findOneByBotId(botId);
        if (userLangChainInfo == null || StringUtils.isBlank(userLangChainInfo.getFlowId())) {
            return;
        }
        boolean remoteSynced = false;
        ModelConfigResult modelConfigResult = resolveChatModelConfiguration(botConfig.modelId, botConfig.model, sseEmitter);
        if (modelConfigResult != null) {
            remoteSynced = workflowService.syncWorkflowModelConfig(userLangChainInfo.getFlowId(), modelConfigResult.llmInfoVo());
        }
        if (!remoteSynced) {
            workflowService.refreshWorkflowRuntimeProtocol(userLangChainInfo.getFlowId());
        }
    }

    private boolean isSparkModel(String model) {
        if (StringUtils.isBlank(model)) {
            return true;
        }
        return "spark".equalsIgnoreCase(model)
                || "spark-x1".equalsIgnoreCase(model)
                || "x1".equalsIgnoreCase(model)
                || "general".equalsIgnoreCase(model)
                || "generalv3".equalsIgnoreCase(model)
                || "generalv3.5".equalsIgnoreCase(model)
                || "4.0Ultra".equalsIgnoreCase(model)
                || "cbm".equalsIgnoreCase(model)
                || "bm3".equalsIgnoreCase(model)
                || "bm3.5".equalsIgnoreCase(model)
                || "bm4".equalsIgnoreCase(model);
    }

    private ModelConfigResult buildModelConfigResult(LLMInfoVo llmInfoVo) {
        int maxInputTokens = this.maxInputTokens;
        List<CategoryTreeVO> categoryTree = llmInfoVo.getCategoryTree();
        if (categoryTree != null && !categoryTree.isEmpty()) {
            for (CategoryTreeVO categoryTreeVO : categoryTree) {
                if ("contextLengthTag".equals(categoryTreeVO.getKey())) {
                    maxInputTokens = Integer.parseInt(categoryTreeVO.getName().replace("k", "")) * 1000;
                    break;
                }
            }
        }
        return new ModelConfigResult(llmInfoVo, maxInputTokens);
    }

    /**
     * Get bot configuration
     *
     * @param botId Bot ID
     * @return Returns BotConfiguration object
     */
    private BotConfiguration getBotConfiguration(Integer botId) throws BusinessException {
        ChatBotMarket chatBotMarket = chatBotDataService.findMarketBotByBotId(botId);

        if (chatBotMarket != null && ShelfStatusEnum.isOnShelf(chatBotMarket.getBotStatus())) {
            return new BotConfiguration(
                    personalityConfigService.getChatPrompt(botId.longValue(), chatBotMarket.getPrompt(), ConfigTypeEnum.MARKET),
                    chatBotMarket.getSupportContext() == 1,
                    chatBotMarket.getModel(),
                    chatBotMarket.getOpenedTool(),
                    chatBotMarket.getVersion(),
                    chatBotMarket.getModelId(),
                    chatBotMarket.getSupportDocument() == 1,
                    resolveBaseMcpServerUrls(botId),
                    resolveBaseSkills(botId));
        } else {
            ChatBotBase chatBotBase = chatBotDataService.findById(botId)
                    .orElseThrow(() -> new BusinessException(ResponseEnum.BOT_NOT_EXISTS));
            return new BotConfiguration(
                    personalityConfigService.getChatPrompt(botId.longValue(), chatBotBase.getPrompt(), ConfigTypeEnum.DEBUG),
                    chatBotBase.getSupportContext() == 1,
                    chatBotBase.getModel(),
                    chatBotBase.getOpenedTool(),
                    chatBotBase.getVersion(),
                    chatBotBase.getModelId(),
                    chatBotBase.getSupportDocument() == 1,
                    chatBotBase.getMcpServerUrls(),
                    chatBotBase.getSkills());
        }
    }

    private String resolveBaseMcpServerUrls(Integer botId) {
        if (botId == null) {
            return null;
        }
        var botBase = chatBotDataService.findById(botId);
        return botBase == null ? null : botBase.map(ChatBotBase::getMcpServerUrls).orElse(null);
    }

    private String resolveBaseSkills(Integer botId) {
        if (botId == null) {
            return null;
        }
        return chatBotDataService.findById(botId).map(ChatBotBase::getSkills).orElse(null);
    }

    /** Parse the saved skills JSON and enrich each entry with downloadUrl/resources/sandbox. */
    private List<JSONObject> enrichBotSkills(String skillsJson) {
        if (StringUtils.isBlank(skillsJson)) {
            return List.of();
        }
        JSONArray array;
        try {
            array = JSON.parseArray(skillsJson);
        } catch (Exception e) {
            log.warn("Invalid skills json on bot: {}", skillsJson);
            return List.of();
        }
        skillEnrichmentService.enrichSkillEntries(array);
        List<JSONObject> result = new ArrayList<>();
        for (int i = 0; i < array.size(); i++) {
            JSONObject skill = array.getJSONObject(i);
            if (skill != null && StringUtils.isNotBlank(skill.getString("downloadUrl"))) {
                result.add(skill);
            }
        }
        return result;
    }

    /**
     * Create chat request record
     *
     * @param chatBotReqDto Chat bot request data transfer object
     * @return Generated chat request record
     */
    private ChatReqRecords createChatRequest(ChatBotReqDto chatBotReqDto) {
        ChatReqRecords chatReqRecords = new ChatReqRecords();
        chatReqRecords.setChatId(chatBotReqDto.getChatId());
        chatReqRecords.setUid(chatBotReqDto.getUid());
        chatReqRecords.setMessage(chatBotReqDto.getAsk());
        chatReqRecords.setClientType(0);
        chatReqRecords.setCreateTime(LocalDateTime.now());
        chatReqRecords.setUpdateTime(LocalDateTime.now());
        chatReqRecords.setNewContext(1);
        chatDataService.createRequest(chatReqRecords);
        return chatReqRecords;
    }

    /**
     * Get historical conversation messages
     *
     * @param chatBotReqDto Chat bot request data transfer object
     * @param supportContext Whether to support context
     * @param availableTokens Available token count for history messages
     * @return List of historical message data transfer objects
     */
    private List<SparkChatRequest.MessageDto> getHistoryMessages(ChatBotReqDto chatBotReqDto, boolean supportContext, boolean supportDocument, int availableTokens) {
        if (!supportContext || availableTokens <= 0) {
            return new ArrayList<>();
        }

        List<SparkChatRequest.MessageDto> historyMessages = chatHistoryService.getSystemBotHistory(chatBotReqDto.getUid(), chatBotReqDto.getChatId(), supportDocument);

        // delete current ask
        historyMessages.removeLast();
        // If it's a re-answer request, need to remove the last Q&A pair
        if (chatBotReqDto.getEdit()) {
            historyMessages.removeLast();
        }

        List<SparkChatRequest.MessageDto> truncatedHistory = truncateHistoryByTokens(historyMessages, availableTokens);
        log.debug("History message truncation completed - Original count: {}, After truncation: {}",
                historyMessages.size(), truncatedHistory.size());

        return truncatedHistory;
    }

    /**
     * Calculate token statistics for system and user messages
     *
     * @param prompt System prompt text
     * @param userMessage User message text
     * @return TokenStatistics object containing token counts
     */
    private TokenStatistics calculateTokenStatistics(String prompt, String userMessage, int maxInputTokens) {
        int systemTokens = estimateTokenCount(prompt);
        int currentUserTokens = estimateTokenCount(userMessage);
        int reservedTokens = systemTokens + currentUserTokens;
        int availableTokens = Math.max(0, maxInputTokens - reservedTokens);

        log.debug("Token statistics - System message: {}, Current user message: {}, Reserved total: {}, Available for history: {}, Maximum limit: {}",
                systemTokens, currentUserTokens, reservedTokens, availableTokens, maxInputTokens);

        return new TokenStatistics(systemTokens, currentUserTokens, reservedTokens, availableTokens);
    }

    /**
     * Build message list, truncate historical conversation data based on maximum input tokens
     *
     * @param chatBotReqDto Chat bot request data transfer object
     * @param supportContext Whether to support context
     * @param prompt Prompt text
     * @return List of message data transfer objects
     */
    private List<SparkChatRequest.MessageDto> buildMessageList(ChatBotReqDto chatBotReqDto, boolean supportContext, boolean supportDocument, String prompt, int maxInputTokens, Long reqId) {
        List<SparkChatRequest.MessageDto> messageDtoList = new ArrayList<>();

        SparkChatRequest.MessageDto systemMessage = new SparkChatRequest.MessageDto();
        systemMessage.setRole("system");
        systemMessage.setContent(prompt);


        SparkChatRequest.MessageDto queryMessage = new SparkChatRequest.MessageDto();
        StringBuilder askBuilder = new StringBuilder();
        if (supportDocument) {
            // Parse knowledge string (it's stored as a string representation of a list)
            List<String> knowledgeList = knowledgeService.getChuncksByBotId(chatBotReqDto.getBotId(), chatBotReqDto.getAsk(), 3);
            askBuilder.append(I18nUtil.getMessage("loose.prefix.prompt"));

            // Insert knowledge content into the placeholder
            String knowledgeStr = knowledgeList.toString();
            reqKnowledgeRecordsDataService.create(ReqKnowledgeRecords.builder()
                    .uid(chatBotReqDto.getUid())
                    .chatId(chatBotReqDto.getChatId())
                    .reqId(reqId)
                    .reqMessage(chatBotReqDto.getAsk())
                    .knowledge(knowledgeStr.substring(0, Math.min(3900, knowledgeStr.length())))
                    .build());
            askBuilder.insert(askBuilder.indexOf("[") + 1, knowledgeStr);
            askBuilder.append(I18nUtil.getMessage("loose.suffix.prompt"));
            askBuilder.insert(askBuilder.indexOf("{{") + 2, chatBotReqDto.getAsk());
        } else {
            askBuilder.append(chatBotReqDto.getAsk());
        }
        queryMessage.setRole("user");
        queryMessage.setContent(askBuilder.toString());

        TokenStatistics tokenStats = calculateTokenStatistics(prompt, askBuilder.toString(), maxInputTokens);

        messageDtoList.add(systemMessage);

        List<SparkChatRequest.MessageDto> historyMessages = getHistoryMessages(chatBotReqDto, supportContext, supportDocument, tokenStats.availableTokens());
        messageDtoList.addAll(historyMessages);
        messageDtoList.add(queryMessage);

        int totalTokens = messageDtoList.stream()
                .mapToInt(msg -> estimateTokenCount(msg.getContent()))
                .sum();

        log.info("Message list build completed - Total messages: {}, Estimated total tokens: {}, Maximum limit: {}",
                messageDtoList.size(), totalTokens, maxInputTokens);

        return messageDtoList;
    }

    /**
     * Build debug message list with token-based truncation
     *
     * @param text Current user message text
     * @param prompt System prompt text
     * @param messages List of history message strings
     * @param maxInputTokens Maximum input token limit
     * @return List of message data transfer objects with truncation applied
     */
    private List<SparkChatRequest.MessageDto> buildDebugMessageList(String text, String prompt, List<String> messages, int maxInputTokens, List<String> maasDatasetList) {
        List<SparkChatRequest.MessageDto> messageDtoList = new ArrayList<>();

        SparkChatRequest.MessageDto systemMessage = new SparkChatRequest.MessageDto();
        systemMessage.setRole("system");
        systemMessage.setContent(prompt);

        SparkChatRequest.MessageDto queryMessage = new SparkChatRequest.MessageDto();
        queryMessage.setRole("user");
        // Concatenate current question
        StringBuilder askBuilder = new StringBuilder();
        if (CollectionUtil.isNotEmpty(maasDatasetList)) {
            askBuilder.append(I18nUtil.getMessage("loose.prefix.prompt"));
            List<String> askKnowledgeList = knowledgeService.getChuncks(maasDatasetList, text, 3, true);
            askBuilder.insert(askBuilder.indexOf("[") + 1, askKnowledgeList);
            askBuilder.append(I18nUtil.getMessage("loose.suffix.prompt"));
            askBuilder.insert(askBuilder.indexOf("{{") + 2, text);
        } else {
            askBuilder.append(text);
        }
        queryMessage.setContent(askBuilder.toString());

        TokenStatistics tokenStats = calculateTokenStatistics(prompt, text, maxInputTokens);

        messageDtoList.add(systemMessage);

        if (tokenStats.availableTokens() > 0 && !messages.isEmpty()) {
            List<SparkChatRequest.MessageDto> historyMessages = convertStringMessagesToDto(messages);
            // MaaS dataset processing
            for (SparkChatRequest.MessageDto messageDto : historyMessages) {
                // Only concatenate user questions, do not process answers
                if ("user".equals(messageDto.getRole())) {
                    String ask = messageDto.getContent();
                    StringBuilder builder = new StringBuilder();
                    if (CollectionUtil.isNotEmpty(maasDatasetList)) {
                        builder.append(I18nUtil.getMessage("loose.prefix.prompt"));
                        List<String> knowledgeList = knowledgeService.getChuncks(maasDatasetList, ask, 3, true);
                        builder.insert(builder.indexOf("[") + 1, knowledgeList);
                        builder.append(I18nUtil.getMessage("loose.suffix.prompt"));
                        builder.insert(builder.indexOf("{{") + 2, ask);
                    } else {
                        builder.append(ask);
                    }
                    messageDto.setContent(builder.toString());
                }
            }
            List<SparkChatRequest.MessageDto> truncatedHistory = truncateHistoryByTokens(historyMessages, tokenStats.availableTokens());
            messageDtoList.addAll(truncatedHistory);

            log.debug("Debug history message truncation completed - Original count: {}, After truncation: {}",
                    historyMessages.size(), truncatedHistory.size());
        }

        messageDtoList.add(queryMessage);

        int totalTokens = messageDtoList.stream()
                .mapToInt(msg -> estimateTokenCount(msg.getContent()))
                .sum();

        log.info("Debug message list build completed - Total messages: {}, Estimated total tokens: {}, Maximum limit: {}",
                messageDtoList.size(), totalTokens, maxInputTokens);

        return messageDtoList;
    }

    /**
     * Convert string messages to MessageDto objects with alternating roles
     *
     * @param messages List of message strings
     * @return List of MessageDto objects
     */
    private List<SparkChatRequest.MessageDto> convertStringMessagesToDto(List<String> messages) {
        List<SparkChatRequest.MessageDto> historyMessages = new ArrayList<>();
        for (int i = 0; i < messages.size(); i++) {
            SparkChatRequest.MessageDto messageDto = new SparkChatRequest.MessageDto();
            messageDto.setRole(i % 2 == 0 ? "user" : "assistant");
            messageDto.setContent(messages.get(i));
            historyMessages.add(messageDto);
        }
        return historyMessages;
    }

    /**
     * Truncate history messages based on token limit, trim from front to back
     *
     * @param historyMessages History message list
     * @param maxHistoryTokens Maximum token count for history messages
     * @return Truncated history message list
     */
    private List<SparkChatRequest.MessageDto> truncateHistoryByTokens(List<SparkChatRequest.MessageDto> historyMessages, int maxHistoryTokens) {
        List<SparkChatRequest.MessageDto> result = new ArrayList<>();
        int currentTokens = 0;

        // Traverse from back to front (keep the newest conversations)
        for (int i = historyMessages.size() - 1; i >= 0; i--) {
            SparkChatRequest.MessageDto message = historyMessages.get(i);
            int messageTokens = estimateTokenCount(message.getContent());

            // Check if token limit is exceeded
            if (currentTokens + messageTokens > maxHistoryTokens) {
                log.debug("History message truncation - Stopped at index {}, current tokens: {}, message tokens: {}, limit: {}",
                        i, currentTokens, messageTokens, maxHistoryTokens);
                break;
            }

            currentTokens += messageTokens;
            // Add to the beginning of the list, maintain time order
            result.addFirst(message);
        }

        return result;
    }

    /**
     * Estimate token count for text (simple estimation: Chinese characters * 1.5, English words * 1.3)
     *
     * @param text Text content
     * @return Estimated token count
     */
    private int estimateTokenCount(String text) {
        if (StringUtils.isBlank(text)) {
            return 0;
        }

        // Simple estimation method:
        // - Chinese characters calculated as 1.5 tokens
        // - English characters calculated as 1.3 tokens (considering word segmentation)
        int chineseChars = 0;
        int englishChars = 0;

        for (char c : text.toCharArray()) {
            if (c >= 0x4e00 && c <= 0x9fff) {
                // Chinese character range
                chineseChars++;
            } else if (Character.isLetterOrDigit(c)) {
                // English characters and numbers
                englishChars++;
            }
        }

        int estimatedTokens = (int) (chineseChars * 1.5 + englishChars * 1.3);

        log.trace("Token estimation - Chinese characters: {}, English characters: {}, Estimated tokens: {}",
                chineseChars, englishChars, estimatedTokens);

        // At least 1 token
        return Math.max(estimatedTokens, 1);
    }

    private record BotConfiguration(String prompt, boolean supportContext, String model, String openedTool,
            Integer version, Long modelId, boolean supportDocument, String mcpServerUrls, String skills) {}

    private record TokenStatistics(int systemTokens, int currentUserTokens, int reservedTokens, int availableTokens) {}

    private record ModelConfigResult(LLMInfoVo llmInfoVo, int maxInputTokens) {}

}
