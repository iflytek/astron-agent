package com.iflytek.astron.console.hub.controller.publish;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.annotation.RateLimit;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.util.RequestContextUtil;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import com.iflytek.astron.console.hub.dto.publish.AppListDTO;
import com.iflytek.astron.console.hub.dto.publish.BotApiInfoDTO;
import com.iflytek.astron.console.hub.dto.publish.CreateAppVo;
import com.iflytek.astron.console.hub.dto.publish.CreateBotApiVo;
import com.iflytek.astron.console.hub.dto.publish.approval.PublishApprovalDecisionDto;
import com.iflytek.astron.console.hub.dto.publish.approval.PublishApprovalSubmitDto;
import com.iflytek.astron.console.hub.enums.publish.PublishApprovalActionEnum;
import com.iflytek.astron.console.hub.enums.publish.PublishApprovalResourceTypeEnum;
import com.iflytek.astron.console.hub.enums.publish.PublishApprovalTypeEnum;
import com.iflytek.astron.console.hub.service.publish.PublishApiService;
import com.iflytek.astron.console.hub.service.publish.PublishApprovalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * @author yun-zhi-ztl
 */
@Slf4j
@Tag(name = "Publish Api Controller", description = "Publish Aot As Api")
@RestController
@RequestMapping("/publish-api")
@RequiredArgsConstructor
@Validated
public class PublishApiController {

    private final PublishApiService publishApiService;
    private final PublishApprovalService publishApprovalService;

    @Operation(summary = "Create User App", description = "create user app")
    @RateLimit(limit = 30, window = 60, dimension = "USER")
    @PostMapping("/create-user-app")
    public ApiResult<Boolean> createUserApp(@RequestBody CreateAppVo createAppVo) {
        return ApiResult.success(publishApiService.createApp(createAppVo));
    }

    @Operation(summary = "Get App List", description = "Get user app list")
    @RateLimit(limit = 30, window = 60, dimension = "USER")
    @GetMapping("/app-list")
    public ApiResult<List<AppListDTO>> getAppList() {
        return ApiResult.success(publishApiService.getAppList());
    }

    @Operation(summary = "Create Bot Api", description = "create bot api with user app")
    @RateLimit(limit = 30, window = 60, dimension = "USER")
    @PostMapping("/create-bot-api")
    public ApiResult<Object> createBotApi(HttpServletRequest request, @RequestBody CreateBotApiVo createBotApiVo) {
        PublishApprovalSubmitDto approvalSubmit = buildBotApiApproval(createBotApiVo);
        PublishApprovalDecisionDto approvalDecision = publishApprovalService.submitIfRequired(approvalSubmit);
        if (Boolean.TRUE.equals(approvalDecision.getApprovalRequired())) {
            return ApiResult.success(approvalDecision);
        }
        return ApiResult.success(publishApiService.createBotApi(
                createBotApiVo,
                request,
                approvalSubmit.getRequesterUid(),
                approvalSubmit.getSpaceId()));
    }

    @Operation(summary = "Get Bot Api Info", description = "Get Bot Api Info")
    @RateLimit(limit = 30, window = 60, dimension = "USER")
    @GetMapping("/get-bot-api-info")
    public ApiResult<BotApiInfoDTO> usageRealTime(@RequestParam Long botId) {
        return ApiResult.success(publishApiService.getApiInfo(botId));
    }

    private PublishApprovalSubmitDto buildBotApiApproval(CreateBotApiVo createBotApiVo) {
        Long spaceId = SpaceInfoUtil.getSpaceId();
        String requesterUid = RequestContextUtil.getUID();
        String resourceId = String.valueOf(createBotApiVo.getBotId());
        JSONObject snapshot = new JSONObject();
        snapshot.put("schemaVersion", 1);
        snapshot.put("executorKey", PublishApprovalTypeEnum.API.name());
        snapshot.put("resourceType", PublishApprovalResourceTypeEnum.BOT.name());
        snapshot.put("resourceId", resourceId);
        snapshot.put("botId", createBotApiVo.getBotId());
        snapshot.put("spaceId", spaceId);
        snapshot.put("requesterUid", requesterUid);
        snapshot.put("publishType", PublishApprovalTypeEnum.API.name());
        snapshot.put("publishAction", PublishApprovalActionEnum.PUBLISH.name());
        snapshot.put("targetId", createBotApiVo.getAppId());
        snapshot.put("publishData", JSON.toJSON(createBotApiVo));

        return PublishApprovalSubmitDto.builder()
                .spaceId(spaceId)
                .requesterUid(requesterUid)
                .resourceType(PublishApprovalResourceTypeEnum.BOT)
                .resourceId(resourceId)
                .publishType(PublishApprovalTypeEnum.API)
                .publishAction(PublishApprovalActionEnum.PUBLISH)
                .targetId(createBotApiVo.getAppId())
                .appOwnerUid(requesterUid)
                .publishSnapshot(snapshot.toJSONString())
                .build();
    }

}
