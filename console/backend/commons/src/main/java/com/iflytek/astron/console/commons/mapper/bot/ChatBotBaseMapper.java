package com.iflytek.astron.console.commons.mapper.bot;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.iflytek.astron.console.commons.dto.bot.BotDetail;
import com.iflytek.astron.console.commons.entity.bot.ChatBotBase;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ChatBotBaseMapper extends BaseMapper<ChatBotBase> {
    BotDetail botDetail(Integer botId);

    List<ChatBotBase> selectByBotIds(@Param("botIds") List<Long> botIds);

    /**
     * Verify if user has permission to access this agent
     *
     * @param botId Agent ID
     * @param uid User ID
     * @param spaceId Space ID (optional)
     * @return Permission count (>0 means has permission, 0 means no permission)
     */
    int checkBotPermission(@Param("botId") Integer botId,
            @Param("uid") String uid,
            @Param("spaceId") Long spaceId);

    /**
     * Verify if user has permission to access this agent (overload method for Long type botId)
     *
     * @param botId Agent ID
     * @param uid User ID
     * @param spaceId Space ID (optional)
     * @return Permission count (>0 means has permission, 0 means no permission)
     */
    default int checkBotPermission(Long botId, String uid, Long spaceId) {
        return checkBotPermission(botId.intValue(), uid, spaceId);
    }
}
