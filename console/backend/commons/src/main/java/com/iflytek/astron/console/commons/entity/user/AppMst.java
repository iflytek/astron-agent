package com.iflytek.astron.console.commons.entity.user;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;

/**
 * @author yun-zhi-ztl
 */
@Data
@Builder
@TableName("app_mst")
@Schema(name = "AppMst", description = "User app info table")
public class AppMst {

    @TableId(type = IdType.AUTO)
    @Schema(description = "Non-business primary key")
    private Long id;

    @Schema(description = "User Id")
    private String uid;

    @Schema(description = "App Name")
    private String appName;

    @Schema(description = "App Describe")
    private String appDescribe;

    @Schema(description = "App Id")
    private String appId;

    @Schema(description = "App Key")
    private String appKey;

    @Schema(description = "App Secret")
    private String appSecret;

    @Schema(description = "App Is Delete")
    private Integer isDelete;

    @Schema(description = "Create time")
    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime createTime;

    @Schema(description = "Update time")
    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime updateTime;

}
