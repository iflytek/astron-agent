package com.iflytek.astron.console.hub.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * @TableName custom_speaker
 */
@TableName(value = "custom_speaker")
@Data
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class CustomSpeaker {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    private String createUid;

    private Long spaceId;


    private String name;


    private String taskId;


    private String assetId;


    private Integer deleted;


    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
