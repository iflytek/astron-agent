package com.iflytek.astron.console.hub.strategy.publish;

import com.iflytek.astron.console.commons.enums.bot.ReleaseTypeEnum;
import com.iflytek.astron.console.commons.response.ApiResult;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PublishStrategyFactoryTest {

    @Test
    void apiAliasShouldResolveBotApiStrategy() {
        PublishStrategy apiStrategy = new StubStrategy(ReleaseTypeEnum.BOT_API.name());
        PublishStrategyFactory factory = new PublishStrategyFactory(List.of(apiStrategy));

        assertThat(factory.isSupported("API")).isTrue();
        assertThat(factory.getStrategy("API")).isSameAs(apiStrategy);
    }

    private record StubStrategy(String publishType) implements PublishStrategy {

    @Override
    public ApiResult<Object> publish(Integer botId, Object publishData, String currentUid, Long spaceId) {
        return ApiResult.success(null);
    }

    @Override
    public ApiResult<Object> offline(Integer botId, Object publishData, String currentUid, Long spaceId) {
        return ApiResult.success(null);
    }

    @Override
    public String getPublishType() {
        return publishType;
    }
}}
