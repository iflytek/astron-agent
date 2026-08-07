package com.iflytek.astron.console.commons.mapper.bot;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.iflytek.astron.console.commons.entity.bot.BotTemplate;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * Bot template Mapper interface
 */
@Mapper
public interface BotTemplateMapper extends BaseMapper<BotTemplate> {

    /**
     * Query all valid bot templates by language
     */
    @Select("SELECT * FROM bot_template WHERE language = #{language} ORDER BY id")
    List<BotTemplate> selectListByLanguage(String language);

}
