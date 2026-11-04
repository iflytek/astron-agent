package com.iflytek.astron.console.hub.mapper.personality;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.iflytek.astron.console.hub.entity.personality.PersonalityConfig;
import org.apache.ibatis.annotations.Mapper;

/**
 * MyBatis mapper interface for PersonalityConfig entity operations Extends BaseMapper to inherit
 * basic CRUD operations
 */
@Mapper
public interface PersonalityConfigMapper extends BaseMapper<PersonalityConfig> {
}
