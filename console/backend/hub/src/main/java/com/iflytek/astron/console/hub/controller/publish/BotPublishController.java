package com.iflytek.astron.console.hub.controller.publish;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.annotation.RateLimit;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.util.RequestContextUtil;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import com.iflytek.astron.console.hub.dto.PageResponse;
import com.iflytek.astron.console.commons.dto.bot.BotListRequestDto;
import com.iflytek.astron.console.hub.dto.publish.BotPublishInfoDto;
import com.iflytek.astron.console.hub.dto.publish.BotDetailResponseDto;
import com.iflytek.astron.console.hub.dto.publish.BotSummaryStatsVO;
import com.iflytek.astron.console.hub.dto.publish.BotTimeSeriesResponseDto;
import com.iflytek.astron.console.hub.dto.publish.BotVersionVO;
import com.iflytek.astron.console.hub.dto.publish.BotTraceRequestDto;
import com.iflytek.astron.console.hub.dto.publish.UnifiedPrepareDto;
import com.iflytek.astron.console.hub.dto.publish.UnifiedPublishRequestDto;
import com.iflytek.astron.console.hub.dto.publish.approval.PublishApprovalDecisionDto;
import com.iflytek.astron.console.hub.dto.publish.approval.PublishApprovalSubmitDto;
import com.iflytek.astron.console.hub.enums.publish.PublishApprovalActionEnum;
import com.iflytek.astron.console.hub.enums.publish.PublishApprovalResourceTypeEnum;
import com.iflytek.astron.console.hub.enums.publish.PublishApprovalTypeEnum;
import com.iflytek.astron.console.hub.service.publish.BotPublishService;
import com.iflytek.astron.console.hub.service.publish.McpService;
import com.iflytek.astron.console.hub.service.publish.PublishApprovalService;
import com.iflytek.astron.console.hub.strategy.publish.PublishStrategy;
import com.iflytek.astron.console.hub.strategy.publish.PublishStrategyFactory;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import io.swagger.v3.oas.annotations.Parameter;
import org.springframework.validation.annotation.Validated;


/**
 * Bot Publishing Management Controller
 *
 * Provides comprehensive bot publishing management capabilities including: - Bot list querying with
 * filtering and pagination - Publishing status management (publish/unpublish) - Multi-channel
 * publishing (Market, API, WeChat, MCP) - Publishing analytics and statistics - Version management
 * for workflow bots
 *
 * @author Omuigix
 */
@Slf4j
@Tag(name = "Bot Publishing Management", description = "Comprehensive bot publishing management and analytics APIs")
@RestController
@RequestMapping("/publish")
@RequiredArgsConstructor
@Validated
public class BotPublishController {

    private final BotPublishService botPublishService;
    private final McpService mcpService;
    private final PublishStrategyFactory publishStrategyFactory;
    private final PublishApprovalService publishApprovalService;

    /**
     * Retrieve paginated bot list with advanced filtering
     */
    @Operation(
            summary = "Get bot list",
            description = "Retrieve paginated bot list with support for filtering by status, type, and search terms")
    @RateLimit(limit = 30, window = 60, dimension = "USER")
    @GetMapping("/bots")
    public ApiResult<PageResponse<BotPublishInfoDto>> getBotList(
            @ModelAttribute @Valid BotListRequestDto requestDto) {

        String currentUid = RequestContextUtil.getUID();
        Long spaceId = SpaceInfoUtil.getSpaceId();

        PageResponse<BotPublishInfoDto> result = botPublishService.getBotList(requestDto, currentUid, spaceId);

        log.info("Bot list retrieved successfully: uid={}, total={}", currentUid, result.getTotal());

        return ApiResult.success(result);
    }

    /**
     * Get detailed information for a specific bot
     */
    @Operation(
            summary = "Get bot details",
            description = "Retrieve comprehensive bot information including publishing status, channels, and metadata")
    @RateLimit(limit = 100, window = 60, dimension = "USER")
    @GetMapping("/bots/{botId}")
    public ApiResult<BotDetailResponseDto> getBotDetail(
            @Parameter(description = "Unique bot identifier", required = true)
            @PathVariable Integer botId) {

        String currentUid = RequestContextUtil.getUID();
        Long spaceId = SpaceInfoUtil.getSpaceId();

        log.info("Retrieving bot details: botId={}, uid={}, spaceId={}", botId, currentUid, spaceId);

        BotDetailResponseDto result = botPublishService.getBotDetail(botId, currentUid, spaceId);

        log.info("Bot details retrieved successfully: botId={}, channels={}", botId, result.getPublishChannels());

        return ApiResult.success(result);
    }

    /**
     * Get Publish Prepare Data
     *
     * Unified endpoint to get preparation data for different publish types
     */
    @Operation(
            summary = "Get publish prepare data",
            description = "Get preparation data needed for publishing to different channels (market, mcp, feishu, api)")
    @RateLimit(limit = 50, window = 60, dimension = "USER")
    @GetMapping("/bots/{botId}/prepare")
    public ApiResult<UnifiedPrepareDto> getPrepareData(
            @Parameter(description = "Unique bot identifier", required = true)
            @PathVariable Integer botId,
            @Parameter(description = "Publish type: market, mcp, feishu, api", required = true)
            @RequestParam String type) {

        String currentUid = RequestContextUtil.getUID();
        Long spaceId = SpaceInfoUtil.getSpaceId();

        log.info("Getting publish prepare data: botId={}, type={}, uid={}, spaceId={}",
                botId, type, currentUid, spaceId);

        UnifiedPrepareDto prepareData = botPublishService.getPrepareData(botId, type, currentUid, spaceId);
        return ApiResult.success(prepareData);
    }

    /**
     * Unified publish endpoint for all publish types Supports MARKET, MCP, WECHAT, API, FEISHU
     * publishing with strategy pattern
     */
    @Operation(
            summary = "Unified bot publish endpoint",
            description = "Publish or offline bot to different channels using strategy pattern")
    @RateLimit(limit = 10, window = 60, dimension = "USER")
    @PostMapping("/bots/{botId}")
    public ApiResult<Object> unifiedPublish(
            @Parameter(description = "Bot ID", required = true)
            @PathVariable Integer botId,
            @Valid @RequestBody UnifiedPublishRequestDto request) {

        String currentUid = RequestContextUtil.getUID();
        Long spaceId = SpaceInfoUtil.getSpaceId();

        log.info("Unified publish request: botId={}, publishType={}, action={}, currentUid={}, spaceId={}",
                botId, request.getPublishType(), request.getAction(), currentUid, spaceId);

        try {
            // Validate publish type
            if (!publishStrategyFactory.isSupported(request.getPublishType())) {
                return ApiResult.error(ResponseEnum.PARAMETER_ERROR,
                        "Unsupported publish type: " + request.getPublishType() +
                                ". Supported types: " + publishStrategyFactory.getSupportedTypes());
            }
            if (!isSupportedPublishAction(request.getAction())) {
                return ApiResult.error(ResponseEnum.PARAMETER_ERROR,
                        "Unsupported action: " + request.getAction() +
                                ". Supported actions: PUBLISH, OFFLINE");
            }

            PublishApprovalSubmitDto approvalSubmit = buildApprovalSubmitDto(botId, request, currentUid, spaceId);
            PublishApprovalDecisionDto approvalDecision = publishApprovalService.submitIfRequired(approvalSubmit);
            if (Boolean.TRUE.equals(approvalDecision.getApprovalRequired())) {
                log.info("Unified publish submitted for approval: botId={}, publishType={}, action={}, approvalId={}",
                        botId, request.getPublishType(), request.getAction(), approvalDecision.getApprovalId());
                return ApiResult.success(approvalDecision);
            }
            Long effectiveSpaceId = approvalSubmit.getSpaceId();

            ApiResult<Object> result;
            if ("PUBLISH".equalsIgnoreCase(request.getAction())) {
                PublishStrategy strategy = publishStrategyFactory.getStrategy(request.getPublishType());
                result = strategy.publish(botId, request.getPublishData(), currentUid, effectiveSpaceId);
            } else if ("OFFLINE".equalsIgnoreCase(request.getAction())) {
                PublishStrategy strategy = publishStrategyFactory.getStrategy(request.getPublishType());
                result = strategy.offline(botId, request.getPublishData(), currentUid, effectiveSpaceId);
            } else {
                return ApiResult.error(ResponseEnum.PARAMETER_ERROR,
                        "Unsupported action: " + request.getAction() +
                                ". Supported actions: PUBLISH, OFFLINE");
            }

            log.info("Unified publish completed: botId={}, publishType={}, action={}, success={}",
                    botId, request.getPublishType(), request.getAction(), result.code() == 0);

            return result;

        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("Unified publish failed: botId={}, publishType={}, action={}",
                    botId, request.getPublishType(), request.getAction(), e);
            return ApiResult.error(ResponseEnum.OPERATION_FAILED, e.getMessage());
        }
    }

    private boolean isSupportedPublishAction(String action) {
        return "PUBLISH".equalsIgnoreCase(action) || "OFFLINE".equalsIgnoreCase(action);
    }

    private PublishApprovalSubmitDto buildApprovalSubmitDto(
            Integer botId,
            UnifiedPublishRequestDto request,
            String currentUid,
            Long spaceId) {
        PublishApprovalTypeEnum publishType = PublishApprovalTypeEnum.normalize(request.getPublishType());
        PublishApprovalActionEnum action = PublishApprovalActionEnum.valueOf(request.getAction().trim().toUpperCase());
        String targetId = resolvePublishTargetId(publishType, request.getPublishData());
        JSONObject snapshot = new JSONObject();
        snapshot.put("schemaVersion", 1);
        snapshot.put("executorKey", "BOT_" + publishType.name());
        snapshot.put("resourceType", PublishApprovalResourceTypeEnum.BOT.name());
        snapshot.put("resourceId", String.valueOf(botId));
        snapshot.put("botId", botId);
        snapshot.put("spaceId", spaceId);
        snapshot.put("requesterUid", currentUid);
        snapshot.put("publishType", publishType.name());
        snapshot.put("publishAction", action.name());
        snapshot.put("targetId", targetId);
        snapshot.put("publishData", request.getPublishData());

        return PublishApprovalSubmitDto.builder()
                .spaceId(spaceId)
                .requesterUid(currentUid)
                .resourceType(PublishApprovalResourceTypeEnum.BOT)
                .resourceId(String.valueOf(botId))
                .publishType(publishType)
                .publishAction(action)
                .targetId(targetId)
                .publishSnapshot(snapshot.toJSONString())
                .build();
    }

    private String resolvePublishTargetId(PublishApprovalTypeEnum publishType, Object publishData) {
        if (PublishApprovalTypeEnum.API != publishType || publishData == null) {
            return "SQUARE";
        }
        JSONObject data = JSON.parseObject(JSON.toJSONString(publishData));
        String appId = data.getString("appId");
        return appId == null || appId.isBlank() ? "API" : appId;
    }

    /**
     * Get comprehensive usage statistics for a bot
     */
    @Operation(
            summary = "Get bot summary statistics",
            description = "Retrieve overall bot usage metrics including total conversations, users, and tokens")
    @RateLimit(limit = 20, window = 60, dimension = "USER")
    @GetMapping("/bots/{botId}/summary")
    public ApiResult<BotSummaryStatsVO> getBotSummaryStats(
            @Parameter(description = "Unique bot identifier", required = true)
            @PathVariable Integer botId) {

        String currentUid = RequestContextUtil.getUID();
        Long currentSpaceId = SpaceInfoUtil.getSpaceId();

        log.info("Retrieving bot summary statistics: botId={}, uid={}, spaceId={}",
                botId, currentUid, currentSpaceId);

        BotSummaryStatsVO summaryStats = botPublishService.getBotSummaryStats(
                botId, currentUid, currentSpaceId);

        log.info("Bot summary statistics retrieved successfully: botId={}", botId);
        return ApiResult.success(summaryStats);
    }

    /**
     * Get time-series usage statistics for a bot
     */
    @Operation(
            summary = "Get bot time series statistics",
            description = "Retrieve daily usage metrics over a specified time period for trend analysis")
    @RateLimit(limit = 20, window = 60, dimension = "USER")
    @GetMapping("/bots/{botId}/timeseries")
    public ApiResult<BotTimeSeriesResponseDto> getBotTimeSeriesStats(
            @Parameter(description = "Unique bot identifier", required = true)
            @PathVariable Integer botId,

            @Parameter(description = "Number of days to analyze (1-365)", example = "7")
            @RequestParam(value = "days", defaultValue = "7")
            @Min(value = 1, message = "Days must be at least 1")
            @Max(value = 365, message = "Days cannot exceed 365") Integer days) {

        String currentUid = RequestContextUtil.getUID();
        Long currentSpaceId = SpaceInfoUtil.getSpaceId();

        log.info("Retrieving bot time series statistics: botId={}, days={}, uid={}, spaceId={}",
                botId, days, currentUid, currentSpaceId);

        BotTimeSeriesResponseDto timeSeriesData = botPublishService.getBotTimeSeriesStats(
                botId, days, currentUid, currentSpaceId);

        log.info("Bot time series statistics retrieved successfully: botId={}", botId);
        return ApiResult.success(timeSeriesData);
    }

    /**
     * Get version history for workflow-based bots
     */
    @Operation(
            summary = "Get bot version history",
            description = "Retrieve paginated list of workflow bot versions with metadata and deployment history")
    @RateLimit(limit = 50, window = 60, dimension = "USER")
    @GetMapping("/bots/{botId}/versions")
    public ApiResult<PageResponse<BotVersionVO>> getBotVersions(
            @Parameter(description = "Unique bot identifier", required = true)
            @PathVariable Integer botId,

            @Parameter(description = "Page number (1-based)", example = "1")
            @RequestParam(value = "page", defaultValue = "1")
            @Min(value = 1, message = "Page number must be at least 1") Integer page,

            @Parameter(description = "Number of items per page (1-100)", example = "10")
            @RequestParam(value = "size", defaultValue = "10")
            @Min(value = 1, message = "Page size must be at least 1")
            @Max(value = 100, message = "Page size cannot exceed 100") Integer size) {

        String currentUid = RequestContextUtil.getUID();
        Long currentSpaceId = SpaceInfoUtil.getSpaceId();

        log.info("Retrieving bot version history: botId={}, page={}, size={}, uid={}, spaceId={}",
                botId, page, size, currentUid, currentSpaceId);

        PageResponse<BotVersionVO> result = botPublishService.getBotVersions(
                botId, page, size, currentUid, currentSpaceId);

        log.info("Bot version history retrieved successfully: botId={}, total={}", botId, result.getTotal());
        return ApiResult.success(result);
    }


    // ==================== Trace Log Management ====================

    /**
     * Get bot trace logs with pagination
     */
    @Operation(
            summary = "Get bot trace logs",
            description = "Retrieve paginated trace logs for bot debugging and monitoring with advanced filtering options")
    @RateLimit(limit = 50, window = 60, dimension = "USER")
    @GetMapping("/bots/{botId}/trace")
    public ApiResult<PageResponse<Object>> getBotTrace(
            @Parameter(description = "Unique bot identifier", required = true)
            @PathVariable Integer botId,
            @ModelAttribute @Valid BotTraceRequestDto requestDto) {

        String currentUid = RequestContextUtil.getUID();
        Long spaceId = SpaceInfoUtil.getSpaceId();

        log.info("Retrieving bot trace logs: botId={}, request={}, uid={}, spaceId={}",
                botId, requestDto, currentUid, spaceId);

        // Bot permission validation is handled by the service layer
        PageResponse<Object> result = botPublishService.getBotTrace(currentUid, botId, requestDto, spaceId);

        log.info("Bot trace logs retrieved successfully: botId={}, total={}", botId, result.getTotal());
        return ApiResult.success(result);
    }
}
