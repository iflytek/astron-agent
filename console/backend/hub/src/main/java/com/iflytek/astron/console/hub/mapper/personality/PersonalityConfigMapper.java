package com.iflytek.astron.console.hub.mapper.personality;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.iflytek.astron.console.hub.entity.personality.PersonalityConfig;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/**
 * MyBatis mapper interface for PersonalityConfig entity operations Extends BaseMapper to inherit
 * basic CRUD operations
 */
@Mapper
public interface PersonalityConfigMapper extends BaseMapper<PersonalityConfig> {

    /**
     * Disable personality configurations for specified bot ID and config type Sets enabled = false and
     * updates the update_time
     *
     * @param botId the bot ID to disable configurations for
     * @param configType the configuration type to disable
     */
    void setDisabledByBotIdAndConfigType(@Param("botId") Long botId, @Param("configType") Integer configType);


}
