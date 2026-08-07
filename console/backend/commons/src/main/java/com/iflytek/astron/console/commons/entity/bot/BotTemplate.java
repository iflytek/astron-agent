package com.iflytek.astron.console.commons.entity.bot;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import org.apache.commons.lang3.StringUtils;
import org.springframework.format.annotation.DateTimeFormat;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Bot template entity class
 */
@Data
@TableName("bot_template")
public class BotTemplate implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Integer id;

    private String botName;

    private String botDesc;

    private String botTemplate;

    private Integer botType;

    private String botTypeName;

    private String inputExample;

    private String prompt;

    private String promptStructList;

    private Integer promptType;

    private Integer supportContext;

    private Integer botStatus;

    private String language;

    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime createTime;

    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime updateTime;

    /**
     * Get input example list
     */
    public List<String> getInputExampleList() {
        if (StringUtils.isBlank(inputExample)) {
            return new ArrayList<>();
        }
        try {
            return com.alibaba.fastjson2.JSON.parseArray(inputExample, String.class);
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    /**
     * Get structured prompt list
     */
    public List<PromptStruct> getPromptStructList() {
        if (StringUtils.isBlank(promptStructList)) {
            return new ArrayList<>();
        }
        try {
            return com.alibaba.fastjson2.JSON.parseArray(promptStructList, PromptStruct.class);
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    /**
     * Structured prompt inner class
     */
    @Data
    public static class PromptStruct implements Serializable {
        private static final long serialVersionUID = 1L;

        private Long id;
        private String promptKey;
        private String promptValue;
    }
}
