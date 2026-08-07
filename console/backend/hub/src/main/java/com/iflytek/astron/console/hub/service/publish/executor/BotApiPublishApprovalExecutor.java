package com.iflytek.astron.console.hub.service.publish.executor;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.hub.dto.publish.CreateBotApiVo;
import com.iflytek.astron.console.hub.entity.PublishApproval;
import com.iflytek.astron.console.hub.enums.publish.PublishApprovalActionEnum;
import com.iflytek.astron.console.hub.enums.publish.PublishApprovalResourceTypeEnum;
import com.iflytek.astron.console.hub.enums.publish.PublishApprovalTypeEnum;
import com.iflytek.astron.console.hub.service.publish.PublishApiService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BotApiPublishApprovalExecutor implements PublishApprovalExecutor {

    private final PublishApiService publishApiService;

    @Override
    public boolean supports(PublishApproval approval) {
        return PublishApprovalResourceTypeEnum.BOT.name().equals(approval.getResourceType())
                && PublishApprovalTypeEnum.API.name().equals(approval.getPublishType())
                && PublishApprovalActionEnum.PUBLISH.name().equals(approval.getPublishAction());
    }

    @Override
    public ApiResult<Object> execute(PublishApproval approval) {
        JSONObject snapshot = JSON.parseObject(approval.getPublishSnapshot());
        CreateBotApiVo createBotApiVo = JSON.parseObject(
                JSON.toJSONString(snapshot.get("publishData")),
                CreateBotApiVo.class);
        if (createBotApiVo == null) {
            createBotApiVo = new CreateBotApiVo();
        }
        if (createBotApiVo.getBotId() == null) {
            createBotApiVo.setBotId(snapshot.getLong("botId"));
        }
        if (createBotApiVo.getAppId() == null) {
            createBotApiVo.setAppId(approval.getTargetId());
        }
        return ApiResult.success(publishApiService.createBotApi(
                createBotApiVo,
                null,
                approval.getRequesterUid(),
                approval.getSpaceId()));
    }
}
