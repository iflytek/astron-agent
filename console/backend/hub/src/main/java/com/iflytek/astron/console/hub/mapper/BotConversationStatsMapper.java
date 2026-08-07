package com.iflytek.astron.console.hub.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.iflytek.astron.console.hub.entity.BotConversationStats;
import com.iflytek.astron.console.hub.dto.publish.BotSummaryStatsVO;
import com.iflytek.astron.console.hub.dto.publish.BotTimeSeriesStatsVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDate;
import java.util.List;

/**
 * Bot Conversation Statistics Mapper
 *
 * @author Omuigix
 */
@Mapper
public interface BotConversationStatsMapper extends BaseMapper<BotConversationStats> {

    /**
     * Get bot summary statistics
     *
     * @param botId bot ID
     * @param uid user ID (nullable)
     * @param spaceId space ID (nullable)
     * @return summary statistics
     */
    BotSummaryStatsVO selectSummaryStats(@Param("botId") Integer botId,
            @Param("uid") String uid,
            @Param("spaceId") Long spaceId);

    /**
     * Get bot time series statistics
     *
     * @param botId bot ID
     * @param startDate start date
     * @param uid user ID (nullable)
     * @param spaceId space ID (nullable)
     * @return time series statistics list
     */
    List<BotTimeSeriesStatsVO> selectTimeSeriesStats(@Param("botId") Integer botId,
            @Param("startDate") LocalDate startDate,
            @Param("uid") String uid,
            @Param("spaceId") Long spaceId);
}
