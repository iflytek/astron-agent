package com.iflytek.astron.console.hub.entity.personality;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;


import java.io.Serial;
import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@TableName("personality_config")
public class PersonalityConfig implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * Primary key ID
     */
    @Schema(description = "Primary key ID")
    @TableId(type = IdType.AUTO)
    private Long id;

    /**
     * Bot ID
     */
    @Schema(description = "Bot ID")
    private Long botId;

    /**
     * Personality information
     */
    @Schema(description = "Personality information")
    private String personality;


    /**
     * Scene type
     */
    @Schema(description = "Scene type")
    private Integer sceneType;

    /**
     * Scene information
     */
    @Schema(description = "Scene information")
    private String sceneInfo;


    /**
     * Configuration type (distinguish between debug and market)
     */
    @Schema(description = "Configuration type (distinguish between debug and market)")
    private Integer configType;


    /**
     * Deletion status 0: normal 1: deleted
     */
    @Schema(description = "Deletion status 0: normal 1: deleted")
    @TableLogic(value = "0", delval = "1")
    private Integer deleted;

    /**
     * Whether enabled
     */
    @Schema(description = "Whether enabled")
    private Integer enabled;

    /**
     * Create time
     */
    @Schema(description = "Create time")
    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime createTime;

    /**
     * Update time
     */
    @Schema(description = "Update time")
    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime updateTime;


}
