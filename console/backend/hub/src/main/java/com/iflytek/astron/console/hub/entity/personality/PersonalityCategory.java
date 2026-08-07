package com.iflytek.astron.console.hub.entity.personality;

import com.baomidou.mybatisplus.annotation.*;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;

import java.io.Serial;
import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * Personality Category Entity
 */
@Data
@TableName("personality_category")
public class PersonalityCategory implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * Primary Key ID
     */
    @TableId(type = IdType.AUTO)
    private Long id;

    /**
     * Category Name
     */
    @TableField("name")
    private String name;

    /**
     * Sort Order
     */
    @TableField("sort")
    private Integer sort;

    /**
     * Deletion Status (0: normal, 1: deleted)
     */
    @TableField("deleted")
    private Integer deleted;

    /**
     * Creation Time
     */
    @TableField("create_time")
    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime createTime;

    /**
     * Update Time
     */
    @TableField("update_time")
    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime updateTime;
}
