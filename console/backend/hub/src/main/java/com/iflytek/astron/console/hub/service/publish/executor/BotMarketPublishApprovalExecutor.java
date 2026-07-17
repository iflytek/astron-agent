package com.iflytek.astron.console.hub.service.publish.executor;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.hub.entity.PublishApproval;
import com.iflytek.astron.console.hub.enums.publish.PublishApprovalActionEnum;
import com.iflytek.astron.console.hub.enums.publish.PublishApprovalResourceTypeEnum;
import com.iflytek.astron.console.hub.enums.publish.PublishApprovalTypeEnum;
import com.iflytek.astron.console.hub.strategy.publish.PublishStrategyFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BotMarketPublishApprovalExecutor implements PublishApprovalExecutor {

    private final PublishStrategyFactory publishStrategyFactory;

    @Override
    public boolean supports(PublishApproval approval) {
        return PublishApprovalResourceTypeEnum.BOT.name().equals(approval.getResourceType())
                && PublishApprovalTypeEnum.MARKET.name().equals(approval.getPublishType())
                && PublishApprovalActionEnum.PUBLISH.name().equals(approval.getPublishAction());
    }

    @Override
    public ApiResult<Object> execute(PublishApproval approval) {
        JSONObject snapshot = JSON.parseObject(approval.getPublishSnapshot());
        Integer botId = snapshot.getInteger("botId");
        Object publishData = snapshot.get("publishData");
        return publishStrategyFactory.getStrategy(PublishApprovalTypeEnum.MARKET.name())
                .publish(botId, publishData, approval.getRequesterUid(), approval.getSpaceId());
    }
}
