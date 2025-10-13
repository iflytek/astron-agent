package com.iflytek.astron.console.commons.mapper.bot;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.iflytek.astron.console.commons.dto.bot.BotQueryCondition;
import com.iflytek.astron.console.commons.dto.bot.BotPublishQueryResult;
import com.iflytek.astron.console.commons.entity.bot.ChatBotMarket;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * @author yun-zhi-ztl
 */
@Mapper
public interface ChatBotMarketMapper extends BaseMapper<ChatBotMarket> {

    List<ChatBotMarket> selectByBotIds(@Param("botIds") List<Long> botIds);

    /**
     * Paginated query for agent list. Uses multi-table join query to ensure data consistency and
     * integrity. Follows technical standards: use entity class to receive query results
     *
     * @param page Pagination parameters
     * @param condition Query conditions
     * @return Agent list
     */
    Page<BotPublishQueryResult> selectBotListByConditions(
            Page<BotPublishQueryResult> page,
            @Param("condition") BotQueryCondition condition);

    /**
     * Query agent details. Join chat_bot_base and chat_bot_market tables to get complete information
     *
     * @param botId Agent ID
     * @param uid User ID (for permission verification)
     * @param spaceId Space ID (optional, for space permission verification)
     * @return Agent details
     */
    BotPublishQueryResult selectBotDetail(
            @Param("botId") Integer botId,
            @Param("uid") String uid,
            @Param("spaceId") Long spaceId);

    /**
     * Update agent publish status and publish channels
     *
     * @param botId Agent ID
     * @param uid User ID (for permission verification)
     * @param spaceId Space ID (optional, for space permission verification)
     * @param botStatus New publish status
     * @param publishChannels New publish channels
     * @return Number of rows affected
     */
    int updatePublishStatus(
            @Param("botId") Integer botId,
            @Param("uid") String uid,
            @Param("spaceId") Long spaceId,
            @Param("botStatus") Integer botStatus,
            @Param("publishChannels") String publishChannels);
}
