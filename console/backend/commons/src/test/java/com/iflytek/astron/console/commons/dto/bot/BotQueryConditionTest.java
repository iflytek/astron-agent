package com.iflytek.astron.console.commons.dto.bot;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class BotQueryConditionTest {

    @Test
    void validateNormalizesMaliciousSortDirection() {
        BotListRequestDto requestDto = BotListRequestDto.builder()
                .sortField("updateTime")
                .sortDirection("DESC,IF(SUBSTRING(database(),1,1)='a',SLEEP(5),0)--")
                .build();

        BotQueryCondition condition = BotQueryCondition.from(requestDto, "test-uid", 100L);
        condition.validate();

        assertEquals("DESC", condition.getSortDirection());
    }
}
