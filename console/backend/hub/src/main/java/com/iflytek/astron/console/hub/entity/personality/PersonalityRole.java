package com.iflytek.astron.console.hub.entity.personality;

import com.baomidou.mybatisplus.annotation.*;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;

import java.io.Serial;
import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * Personality Role Entity
 */
@Data
@TableName("personality_role")
public class PersonalityRole implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * Primary Key ID
     */
    @Schema(description = "Primary Key ID")
    @TableId(type = IdType.AUTO)
    private Long id;

    /**
     * Role Name
     */
    @Schema(description = "Role Name")
    @TableField("name")
    private String name;

    /**
     * Role Description
     */
    @Schema(description = "Role Description")
    @TableField("description")
    private String description;

    /**
     * Head Cover Image
     */
    @Schema(description = "Head Cover Image")
    @TableField("head_cover")
    private String headCover;

    /**
     * Role Prompt
     */
    @Schema(description = "Role Prompt")
    @TableField("prompt")
    private String prompt;

    /**
     * Cover Image
     */
    @Schema(description = "Cover Image")
    @TableField("cover")
    private String cover;

    /**
     * Sort
     */
    @Schema(description = "Sort")
    @TableField("sort")
    private Integer sort;

    /**
     * Category ID
     */
    @Schema(description = "Category ID")
    @TableField("category_id")
    private Long categoryId;

    /**
     * Deletion Status (0: normal, 1: deleted)
     */
    @Schema(description = "Deletion Status (0: normal, 1: deleted)")
    @TableField("deleted")
    private Integer deleted;

    /**
     * Creation Time
     */
    @Schema(description = "Creation Time")
    @TableField("create_time")
    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime createTime;

    /**
     * Update Time
     */
    @Schema(description = "Update Time")
    @TableField("update_time")
    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime updateTime;

}
