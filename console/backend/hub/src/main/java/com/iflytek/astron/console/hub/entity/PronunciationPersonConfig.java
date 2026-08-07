package com.iflytek.astron.console.hub.entity;


import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;

@Data
@TableName("pronunciation_person_config")
public class PronunciationPersonConfig {


    @TableId(type = IdType.AUTO)
    private Long id;


    /**
     * Pronunciation person name
     */
    private String name;

    /**
     * Pronunciation person cover image URL
     */
    private String coverUrl;

    /**
     * Pronunciation person parameters
     */
    private String voiceType;


    /**
     * Pronunciation person sort
     */
    private Integer sort;


    /**
     * Pronunciation person type
     */
    private SpeakerTypeEnum speakerType;


    public enum SpeakerTypeEnum {
        /**
         * Normal speaker
         */
        NORMAL
    }

    /**
     * Exquisite pronunciation person (0 = not exquisite, 1 = exquisite)
     */
    private Integer exquisite;

    /**
     * Pronunciation person deleted status
     */
    private Integer deleted;


    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime createTime;

    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime updateTime;

}
