package com.iflytek.astron.console.hub.mapper.personality;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.iflytek.astron.console.hub.entity.personality.PersonalityCategory;
import org.apache.ibatis.annotations.Mapper;

/**
 * MyBatis mapper interface for PersonalityCategory entity operations Extends BaseMapper to inherit
 * basic CRUD operations
 */
@Mapper
public interface PersonalityCategoryMapper extends BaseMapper<PersonalityCategory> {

}
