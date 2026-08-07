package com.iflytek.astron.console.hub.dto.publish;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;

/**
 * @author yun-zhi-ztl
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "App List Info DTO")
public class AppListDTO {

    @Schema(description = "App Id")
    private String appId;

    @Schema(description = "App Name")
    private String appName;

    @Schema(description = "App Describe")
    private String appDescribe;

    @Schema(description = "App Key")
    private String appKey;

    @Schema(description = "App Secret")
    private String appSecret;

    @Schema(description = "create time")
    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime createTime;
}
