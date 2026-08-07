package com.iflytek.astron.console.hub.service.publish.impl;

import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.iflytek.astron.console.commons.entity.bot.UserLangChainInfo;
import com.iflytek.astron.console.hub.dto.PageResponse;
import com.iflytek.astron.console.commons.dto.bot.BotListRequestDto;
import com.iflytek.astron.console.hub.dto.publish.BotPublishInfoDto;
import com.iflytek.astron.console.hub.dto.publish.BotDetailResponseDto;
import com.iflytek.astron.console.hub.dto.publish.BotVersionVO;
import com.iflytek.astron.console.hub.dto.publish.BotSummaryStatsVO;
import com.iflytek.astron.console.hub.dto.publish.BotTimeSeriesResponseDto;
import com.iflytek.astron.console.hub.dto.publish.BotTimeSeriesStatsVO;
import com.iflytek.astron.console.hub.dto.publish.WechatAuthUrlResponseDto;
import com.iflytek.astron.console.hub.dto.publish.BotTraceRequestDto;
import com.iflytek.astron.console.hub.dto.publish.UnifiedPrepareDto;
import com.iflytek.astron.console.hub.dto.publish.prepare.*;
import com.iflytek.astron.console.hub.dto.publish.prepare.WechatPrepareDto;
import com.iflytek.astron.console.commons.enums.bot.ReleaseTypeEnum;
import com.iflytek.astron.console.commons.service.data.UserLangChainDataService;
import com.iflytek.astron.console.commons.enums.PublishChannelEnum;
import com.iflytek.astron.console.commons.enums.ShelfStatusEnum;
import com.iflytek.astron.console.commons.mapper.bot.ChatBotMarketMapper;
import com.iflytek.astron.console.commons.mapper.bot.ChatBotApiMapper;
import com.iflytek.astron.console.hub.mapper.BotConversationStatsMapper;
import com.iflytek.astron.console.commons.mapper.bot.ChatBotBaseMapper;
import com.iflytek.astron.console.hub.converter.BotPublishConverter;
import com.iflytek.astron.console.hub.converter.WorkflowVersionConverter;
import com.iflytek.astron.console.hub.service.publish.PublishChannelService;
import com.iflytek.astron.console.hub.service.wechat.WechatThirdpartyService;
import com.iflytek.astron.console.commons.dto.bot.BotPublishQueryResult;
import com.iflytek.astron.console.commons.dto.bot.ChatBotApi;
import com.iflytek.astron.console.hub.entity.BotConversationStats;
import com.iflytek.astron.console.hub.service.publish.BotPublishService;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.util.BotFileParamUtil;
import com.iflytek.astron.console.toolkit.entity.table.workflow.WorkflowVersion;
import com.iflytek.astron.console.toolkit.mapper.workflow.WorkflowVersionMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import com.iflytek.astron.console.commons.dto.bot.BotQueryCondition;
import com.iflytek.astron.console.hub.event.BotPublishStatusChangedEvent;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Bot Publishing Management Service Implementation
 *
 * Unified bot publishing management service implementation, including: - Bot list query and detail
 * retrieval - Publishing status management (publish/take offline) - Version management - Statistics
 * data query
 *
 * @author Omuigix
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BotPublishServiceImpl implements BotPublishService {

    private final ChatBotMarketMapper chatBotMarketMapper;
    private final ChatBotBaseMapper chatBotBaseMapper;
    private final BotPublishConverter botPublishConverter;
    private final PublishChannelService publishChannelService;
    private final WechatThirdpartyService wechatThirdpartyService;
    private final ApplicationEventPublisher eventPublisher;
    private final UserLangChainDataService userLangChainDataService;

    // Version management related
    private final WorkflowVersionMapper workflowVersionMapper;
    private final WorkflowVersionConverter workflowVersionConverter;

    // Statistics data related
    private final BotConversationStatsMapper botConversationStatsMapper;

    // MaaS API related
    private final ChatBotApiMapper chatBotApiMapper;

    @Value("${maas.appId}")
    private String maasAppId;

    @Override
    public PageResponse<BotPublishInfoDto> getBotList(
            BotListRequestDto requestDto,
            String currentUid,
            Long spaceId) {

        log.info("Query bot list: uid={}, spaceId={}, request={}", currentUid, spaceId, requestDto);

        // 1. Build type-safe query condition
        BotQueryCondition condition = BotQueryCondition.from(requestDto, currentUid, spaceId);
        condition.validate();

        // 2. Execute multi-table join pagination query (using entity class to receive results)
        Page<BotPublishQueryResult> page = new Page<>(requestDto.getPage(), requestDto.getSize());
        Page<BotPublishQueryResult> queryResult = chatBotMarketMapper.selectBotListByConditions(page, condition);

        // 3. Use MapStruct for type-safe object mapping
        List<BotPublishInfoDto> botList = botPublishConverter.queryResultsToDtoList(queryResult.getRecords());

        // 4. Build response result
        return PageResponse.of(
                requestDto.getPage(),
                requestDto.getSize(),
                queryResult.getTotal(),
                botList);
    }


    @Override
    public BotDetailResponseDto getBotDetail(Integer botId, String currentUid, Long spaceId) {
        log.info("Query bot details: botId={}, uid={}, spaceId={}", botId, currentUid, spaceId);

        // 1. Permission validation and query bot basic information
        BotPublishQueryResult queryResult = chatBotMarketMapper.selectBotDetail(botId, currentUid, spaceId);
        if (queryResult == null) {
            throw new BusinessException(ResponseEnum.BOT_NOT_EXISTS);
        }

        // 2. Basic information conversion (including publish channel parsing)
        BotDetailResponseDto detailDto = botPublishConverter.queryResultToDetailDto(queryResult);

        // 3. Get WeChat binding information (only query when published to WeChat)
        if (detailDto.getPublishChannels().contains(PublishChannelEnum.WECHAT.getCode())) {
            String[] wechatInfo = publishChannelService.getWechatInfo(currentUid, botId);
            detailDto.setWechatRelease(Integer.valueOf(wechatInfo[0]));
            detailDto.setWechatAppid(wechatInfo[1]);
        } else {
            detailDto.setWechatRelease(0);
            detailDto.setWechatAppid(null);
        }

        // 4. Get MaaS App ID
        String maasId = getMaasIdByBotId(botId);
        detailDto.setMaasId(maasId);

        log.info("Bot details query completed: botId={}, channels={}, maasId={}",
                botId, detailDto.getPublishChannels(), maasId);
        return detailDto;
    }



    // ==================== MaaS Integration ====================

    /**
     * Get MaaS App ID by Bot ID Query chat_bot_api table to find appId, fallback to configured maas
     * appId
     */
    private String getMaasIdByBotId(Integer botId) {
        try {
            LambdaQueryWrapper<ChatBotApi> queryWrapper = new LambdaQueryWrapper<ChatBotApi>()
                    .eq(ChatBotApi::getBotId, botId)
                    .last("LIMIT 1");

            ChatBotApi chatBotApi = chatBotApiMapper.selectOne(queryWrapper);

            if (chatBotApi != null && chatBotApi.getAppId() != null) {
                log.debug("Found maasId for botId {}: {}", botId, chatBotApi.getAppId());
                return chatBotApi.getAppId();
            } else {
                log.debug("No maasId found for botId: {}, using configured maas appId: {}", botId, maasAppId);
                return maasAppId;
            }
        } catch (Exception e) {
            log.error("Failed to get maasId for botId: {}, using configured maas appId: {}", botId, maasAppId, e);
            return maasAppId;
        }
    }


    // ==================== Version Management ====================

    @Override
    public PageResponse<BotVersionVO> getBotVersions(Integer botId, Integer page, Integer size, String uid, Long spaceId) {
        log.info("Query workflow version list: botId={}, page={}, size={}, uid={}, spaceId={}",
                botId, page, size, uid, spaceId);

        // 1. Permission validation - ensure user has permission to access the bot
        validateBotPermission(botId, uid, spaceId);

        // 2. Get flowId from botId
        String flowId = userLangChainDataService.findFlowIdByBotId(botId);
        if (flowId == null || flowId.trim().isEmpty()) {
            log.warn("No flowId found for botId={}", botId);
            return PageResponse.of(page, size, 0L, new ArrayList<>());
        }

        // 3. Pagination query version list - query workflow_version table using flowId
        Page<WorkflowVersion> pageParam = new Page<>(page, size);
        Page<WorkflowVersion> resultPage = workflowVersionMapper.selectPageByCondition(pageParam, flowId);

        // 4. Use MapStruct batch conversion to VO
        List<WorkflowVersion> versions = resultPage.getRecords();
        List<BotVersionVO> versionList = workflowVersionConverter.toVersionVOList(versions);

        log.info("Query workflow version list successful: botId={}, flowId={}, total={}", botId, flowId, resultPage.getTotal());
        return PageResponse.of(page, size, resultPage.getTotal(), versionList);
    }

    // ==================== Statistics Data ====================

    @Override
    public BotSummaryStatsVO getBotSummaryStats(Integer botId, String currentUid, Long currentSpaceId) {
        log.info("Get bot summary statistics: botId={}, uid={}, spaceId={}",
                botId, currentUid, currentSpaceId);

        // 1. Permission validation
        int hasPermission = chatBotBaseMapper.checkBotPermission(botId, currentUid, currentSpaceId);
        if (hasPermission == 0) {
            throw new BusinessException(ResponseEnum.BOT_NOT_EXISTS);
        }

        // 2. Query summary statistics data
        BotSummaryStatsVO summaryStats = botConversationStatsMapper.selectSummaryStats(botId, null, null);
        if (summaryStats == null) {
            // If no statistics data, return default values (using primitive type long, will be 0 automatically)
            summaryStats = new BotSummaryStatsVO();
        }

        log.info("Bot summary statistics query completed: botId={}, totalChats={}, totalUsers={}",
                botId, summaryStats.getTotalChats(), summaryStats.getTotalUsers());

        return summaryStats;
    }

    @Override
    public BotTimeSeriesResponseDto getBotTimeSeriesStats(Integer botId, Integer overviewDays,
            String currentUid, Long currentSpaceId) {
        log.info("Get bot time series statistics: botId={}, overviewDays={}, uid={}, spaceId={}",
                botId, overviewDays, currentUid, currentSpaceId);

        // 1. Permission validation
        int hasPermission = chatBotBaseMapper.checkBotPermission(botId, currentUid, currentSpaceId);
        if (hasPermission == 0) {
            throw new BusinessException(ResponseEnum.BOT_NOT_EXISTS);
        }

        // 2. Query time series statistics data
        LocalDate startDate = LocalDate.now().minusDays(overviewDays);
        List<BotTimeSeriesStatsVO> timeSeriesStats = botConversationStatsMapper.selectTimeSeriesStats(
                botId, startDate, null, null);

        // 3. Build time series data response
        BotTimeSeriesResponseDto timeSeries = new BotTimeSeriesResponseDto();
        timeSeries.setActivityUser(convertToTimeSeriesItems(timeSeriesStats, "user"));
        timeSeries.setTokenUsed(convertToTimeSeriesItems(timeSeriesStats, "token"));
        timeSeries.setChatMessages(convertToTimeSeriesItems(timeSeriesStats, "message"));
        timeSeries.setAvgChatMessages(calculateAvgMessages(timeSeriesStats));

        log.info("Bot time series statistics query completed: botId={}, data points count={}",
                botId, timeSeriesStats.size());

        return timeSeries;
    }

    @Override
    public void recordDashboardCountLog(String uid, Long spaceId, Integer botId, Long chatId,
            String sid, Integer tokenConsumed) {
        log.info("Record conversation statistics: uid={}, spaceId={}, botId={}, chatId={}, tokenConsumed={}",
                uid, spaceId, botId, chatId, tokenConsumed);

        try {
            BotConversationStats conversationStats = BotConversationStats.createBuilder()
                    .uid(uid)
                    .spaceId(spaceId)
                    .botId(botId)
                    .chatId(chatId)
                    .sid(sid)
                    .tokenConsumed(tokenConsumed)
                    .build();
            int result = botConversationStatsMapper.insert(conversationStats);

            if (result > 0) {
                log.info("Conversation statistics recorded successfully: chatId={}, statsId={}", chatId, conversationStats.getId());

            } else {
                log.warn("Conversation statistics record failed: chatId={}", chatId);
            }
        } catch (Exception e) {
            log.error("Record conversation statistics exception: chatId={}", chatId, e);
            // Do not throw exception to avoid affecting main business flow
        }
    }

    // ==================== Private Helper Methods ====================

    /**
     * Validate bot permission
     */
    private void validateBotPermission(Integer botId, String uid, Long spaceId) {
        Integer count = chatBotBaseMapper.checkBotPermission(botId, uid, spaceId);
        if (count == null || count == 0) {
            throw new BusinessException(ResponseEnum.BOT_NOT_EXISTS);
        }
    }


    /**
     * Get current publish channel
     */
    private String getCurrentPublishChannels(Integer botId, String uid, Long spaceId) {
        try {
            var queryResult = chatBotMarketMapper.selectBotDetail(botId, uid, spaceId);
            return queryResult != null ? queryResult.getPublishChannels() : null;
        } catch (Exception e) {
            log.warn("Query current publish channel failed: botId={}, uid={}, spaceId={}", botId, uid, spaceId, e);
            return null;
        }
    }

    /**
     * Create market record (for publish channel) Note: This method now delegates to event-driven
     * architecture
     */
    private void createMarketRecordForChannel(Integer botId, String uid, Long spaceId, String channels) {
        // Publish event to create market record - handled by InstructionalBotPublishListener
        eventPublisher.publishEvent(new BotPublishStatusChangedEvent(
                this, botId, uid, spaceId, "PUBLISH",
                null, ShelfStatusEnum.OFF_SHELF.getCode(), channels));
        log.info("Create market record event published: botId={}, uid={}, spaceId={}, channels={}",
                botId, uid, spaceId, channels);
    }

    /**
     * Update market record publish channel
     */
    private void updateMarketRecordChannels(Integer botId, String uid, Long spaceId, String channels) {
        try {
            int updateCount = chatBotMarketMapper.updatePublishStatus(botId, uid, spaceId, null, channels);
            if (updateCount > 0) {
                log.info("Update market record publish channel successfully: botId={}, channels={}", botId, channels);
            } else {
                log.warn("Update market record publish channel failed, record not found: botId={}, uid={}, spaceId={}",
                        botId, uid, spaceId);
            }
        } catch (Exception e) {
            log.error("Update market record publish channel exception: botId={}, uid={}, spaceId={}, channels={}",
                    botId, uid, spaceId, channels, e);
        }
    }

    /**
     * Convert time series data items
     */
    private List<BotTimeSeriesResponseDto.TimeSeriesItem> convertToTimeSeriesItems(
            List<BotTimeSeriesStatsVO> timeSeriesStats, String type) {
        return timeSeriesStats.stream()
                .map(stats -> {
                    Integer count = switch (type) {
                        case "user" -> stats.getUserCount();
                        case "token" -> stats.getTokenCount();
                        case "message" -> stats.getMessageCount();
                        case "chat" -> stats.getChatCount();
                        default -> 0;
                    };
                    return new BotTimeSeriesResponseDto.TimeSeriesItem(
                            stats.getDate().toString(), count);
                })
                .collect(Collectors.toList());
    }

    /**
     * Calculate average messages per conversation
     */
    private List<BotTimeSeriesResponseDto.TimeSeriesItem> calculateAvgMessages(
            List<BotTimeSeriesStatsVO> timeSeriesStats) {
        return timeSeriesStats.stream()
                .map(stats -> {
                    Integer avgCount = stats.getChatCount() > 0
                            ? stats.getMessageCount() / stats.getChatCount()
                            : 0;
                    return new BotTimeSeriesResponseDto.TimeSeriesItem(
                            stats.getDate().toString(), avgCount);
                })
                .collect(Collectors.toList());
    }

    // ==================== publishchannelmanagement ====================

    @Override
    public void updatePublishChannel(Integer botId, String uid, Long spaceId, PublishChannelEnum channel, boolean isAdd) {
        log.info("Update bot publish channel: botId={}, uid={}, spaceId={}, channel={}, isAdd={}",
                botId, uid, spaceId, channel.getCode(), isAdd);

        try {
            // 1. Permission validation
            int hasPermission = chatBotBaseMapper.checkBotPermission(botId, uid, spaceId);
            if (hasPermission == 0) {
                log.warn("Bot permission validation failed: botId={}, uid={}, spaceId={}", botId, uid, spaceId);
                return;
            }

            // 2. Query current publish channel
            String currentChannels = getCurrentPublishChannels(botId, uid, spaceId);

            // 3. Update publish channel
            String newChannels = publishChannelService.updatePublishChannels(currentChannels, channel.getCode(), isAdd);

            // 4. Update database
            if (!Objects.equals(currentChannels, newChannels)) {
                if (currentChannels == null) {
                    // If no market record exists, need to create first
                    createMarketRecordForChannel(botId, uid, spaceId, newChannels);
                } else {
                    // Update existing record
                    updateMarketRecordChannels(botId, uid, spaceId, newChannels);
                }

                log.info("Bot publish channel updated successfully: botId={}, {} -> {}", botId, currentChannels, newChannels);
            } else {
                log.debug("Bot publish channel unchanged: botId={}, channels={}", botId, currentChannels);
            }
        } catch (Exception e) {
            log.error("Update bot publish channel failed: botId={}, uid={}, spaceId={}, channel={}, isAdd={}",
                    botId, uid, spaceId, channel.getCode(), isAdd, e);
            // Do not throw exception to avoid affecting main business flow
        }
    }

    // ==================== WeChat Publish Management ====================

    @Override
    public WechatAuthUrlResponseDto getWechatAuthUrl(Integer botId, String appid, String redirectUrl,
            String uid, Long spaceId) {
        log.info("Get WeChat authorization URL: botId={}, appid={}, redirectUrl={}, uid={}, spaceId={}",
                botId, appid, redirectUrl, uid, spaceId);

        // 1. Permission validation
        int hasPermission = chatBotBaseMapper.checkBotPermission(botId, uid, spaceId);
        if (hasPermission == 0) {
            throw new BusinessException(ResponseEnum.BOT_NOT_EXISTS);
        }

        // 2. Get pre-authorization code
        String preAuthCode = wechatThirdpartyService.getPreAuthCode(botId, appid, uid);

        // 3. Generate authorization URL
        String authUrl = wechatThirdpartyService.buildAuthUrl(preAuthCode, appid, redirectUrl);

        // 4. Build response
        WechatAuthUrlResponseDto response = WechatAuthUrlResponseDto.of(authUrl);
        response.setPreAuthCode(preAuthCode);

        log.info("WeChat authorization URL generated successfully: botId={}, authUrl={}", botId, authUrl);
        return response;
    }

    // ==================== Trace Log Management ====================

    @Override
    public PageResponse<Object> getBotTrace(String uid, Integer botId, BotTraceRequestDto requestDto, Long spaceId) {
        log.info("Getting trace logs for bot: botId={}, uid={}, spaceId={}, request={}",
                botId, uid, spaceId, requestDto);

        // TODO: Implement actual trace log retrieval logic when ElasticSearch is available
        // This is a placeholder implementation until ES integration is ready
        //
        // When implementing:
        // 1. Validate bot permissions (check if user has access to this bot)
        // 2. Get bot flow ID from bot configuration
        // 3. Query trace logs from ElasticSearch with time range and filters
        // 4. Apply additional filters (logLevel, keyword, traceId, sessionId)
        // 5. Return paginated results

        log.warn("Trace log functionality not yet implemented - ElasticSearch integration pending");

        // Return empty result for now
        return PageResponse.of(requestDto.getPage(), requestDto.getPageSize(), 0L, new ArrayList<>());
    }

    // ==================== Publish Prepare Data Management ====================

    @Override
    public UnifiedPrepareDto getPrepareData(Integer botId, String type, String currentUid, Long spaceId) {
        log.info("Getting prepare data: botId={}, type={}, uid={}, spaceId={}", botId, type, currentUid, spaceId);

        try {
            // Validate publish type
            ReleaseTypeEnum publishTypeEnum = ReleaseTypeEnum.getByName(type);
            if (publishTypeEnum == null) {
                return createErrorPrepareResponse("Invalid publish type: " + type);
            }

            // Get bot basic info first
            BotDetailResponseDto botDetail = getBotDetail(botId, currentUid, spaceId);
            if (botDetail == null) {
                return createErrorPrepareResponse("Bot not found");
            }

            BasePrepareDto prepareData;
            switch (publishTypeEnum) {
                case MARKET:
                    prepareData = getMarketPrepareData(botId, botDetail, currentUid, spaceId);
                    break;
                case MCP:
                    prepareData = getMcpPrepareData(botId, botDetail, currentUid, spaceId);
                    break;
                case FEISHU:
                    prepareData = getFeishuPrepareData(botId, botDetail, currentUid, spaceId);
                    break;
                case BOT_API:
                    prepareData = getApiPrepareData(botId, botDetail, currentUid, spaceId);
                    break;
                case WECHAT:
                    prepareData = getWechatPrepareData(botId, botDetail, currentUid, spaceId);
                    break;
                default:
                    return createErrorPrepareResponse("Unsupported publish type: " + type);
            }

            if (prepareData == null) {
                return createErrorPrepareResponse("Failed to prepare data for type: " + type);
            }

            UnifiedPrepareDto response = new UnifiedPrepareDto();
            response.setSuccess(true);
            response.setData(prepareData);

            log.info("Prepare data retrieved successfully: botId={}, type={}", botId, type);
            return response;

        } catch (Exception e) {
            log.error("Failed to get prepare data: botId={}, type={}, uid={}, spaceId={}",
                    botId, type, currentUid, spaceId, e);
            return createErrorPrepareResponse("Failed to get prepare data: " + e.getMessage());
        }
    }

    private MarketPrepareDto getMarketPrepareData(Integer botId, BotDetailResponseDto botDetail, String currentUid, Long spaceId) {
        log.info("Getting market prepare data: botId={}", botId);

        MarketPrepareDto marketData = new MarketPrepareDto();
        marketData.setPublishType(ReleaseTypeEnum.MARKET.name());

        // Get workflow configuration JSON
        try {
            String flowId = userLangChainDataService.findFlowIdByBotId(botId);
            if (flowId != null) {
                // TODO: Get complete workflow configuration JSON
                // This should call the workflow service to get the full configuration
                marketData.setWorkflowConfigJson("{}");
            }
        } catch (Exception e) {
            log.warn("Failed to get workflow config for market prepare: botId={}", botId, e);
        }

        // Set bot basic info
        marketData.setBotName(botDetail.getBotName());
        marketData.setBotDescription(botDetail.getBotDesc());
        marketData.setBotAvatar(null);

        // Set multi-file parameter support based on extraInputsConfig
        boolean isMultiFileParam = false;
        try {
            UserLangChainInfo chainInfo = userLangChainDataService.findOneByBotId(botId);
            if (chainInfo != null && chainInfo.getExtraInputsConfig() != null) {
                List<JSONObject> extraInputsConfig = JSONArray.parseArray(chainInfo.getExtraInputsConfig(), JSONObject.class);
                isMultiFileParam = BotFileParamUtil.isMultiFileParam(botId, extraInputsConfig);
            }
        } catch (Exception e) {
            log.warn("Failed to determine multi-file parameter support: botId={}", botId, e);
        }
        marketData.setBotMultiFileParam(isMultiFileParam);

        // Set suggested tags and categories
        marketData.setSuggestedTags(List.of("AI Assistant", "Productivity Tool"));
        marketData.setCategoryOptions(List.of("Education", "Finance", "Healthcare", "Customer Service"));

        return marketData;
    }

    private McpPrepareDto getMcpPrepareData(Integer botId, BotDetailResponseDto botDetail, String currentUid, Long spaceId) {
        log.info("Getting MCP prepare data: botId={}", botId);

        McpPrepareDto result = new McpPrepareDto();
        result.setPublishType(ReleaseTypeEnum.MCP.name());

        // TODO: Implement MCP prepare data logic
        // For now, return basic structure
        result.setInputTypes(new ArrayList<>());
        result.setSuggestedConfig(new McpPrepareDto.SuggestedConfig());
        result.setContentInfo(new McpPrepareDto.McpContentInfo());

        return result;
    }

    private FeishuPrepareDto getFeishuPrepareData(Integer botId, BotDetailResponseDto botDetail, String currentUid, Long spaceId) {
        log.info("Getting Feishu prepare data: botId={}", botId);

        FeishuPrepareDto feishuData = new FeishuPrepareDto();
        feishuData.setPublishType(ReleaseTypeEnum.FEISHU.name());

        // TODO: Get actual Feishu app configuration
        feishuData.setAppId("cli_xxx");
        feishuData.setAppSecret("xxx");

        // Set bot info
        feishuData.setBotName(botDetail.getBotName());
        feishuData.setBotDescription(botDetail.getBotDesc());
        feishuData.setBotAvatar(null);

        // Set suggested configuration
        FeishuPrepareDto.SuggestedConfig suggestedConfig = new FeishuPrepareDto.SuggestedConfig();
        suggestedConfig.setDisplayName("AI Assistant");
        suggestedConfig.setDescription("Workflow-based AI Assistant");
        feishuData.setSuggestedConfig(suggestedConfig);

        return feishuData;
    }

    private ApiPrepareDto getApiPrepareData(Integer botId, BotDetailResponseDto botDetail, String currentUid, Long spaceId) {
        log.info("Getting API prepare data: botId={}", botId);

        ApiPrepareDto apiData = new ApiPrepareDto();
        apiData.setPublishType(ReleaseTypeEnum.BOT_API.name());

        // Set API endpoint
        apiData.setApiEndpoint("/api/v1/chat/" + botId);
        apiData.setDocumentation("API Documentation URL");
        apiData.setApiKey("Generated API Key");
        apiData.setAuthType("Bearer");

        // Set suggested configuration
        ApiPrepareDto.SuggestedConfig suggestedConfig = new ApiPrepareDto.SuggestedConfig();
        suggestedConfig.setRateLimitPerMinute(100);
        suggestedConfig.setEnableAuth(true);
        apiData.setSuggestedConfig(suggestedConfig);

        return apiData;
    }

    private WechatPrepareDto getWechatPrepareData(Integer botId, BotDetailResponseDto botDetail, String currentUid, Long spaceId) {
        log.info("Getting WeChat prepare data: botId={}", botId);

        WechatPrepareDto wechatData = new WechatPrepareDto();
        wechatData.setPublishType(ReleaseTypeEnum.WECHAT.name());

        // TODO: Get actual WeChat configuration
        wechatData.setAppId("wx_xxx");
        wechatData.setAppSecret("xxx");
        wechatData.setToken("xxx");
        wechatData.setEncodingAESKey("xxx");

        return wechatData;
    }

    private UnifiedPrepareDto createErrorPrepareResponse(String errorMessage) {
        UnifiedPrepareDto response = new UnifiedPrepareDto();
        response.setSuccess(false);
        response.setErrorMessage(errorMessage);
        return response;
    }
}
