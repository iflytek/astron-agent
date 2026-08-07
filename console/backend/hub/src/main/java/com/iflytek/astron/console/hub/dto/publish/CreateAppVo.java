package com.iflytek.astron.console.hub.dto.publish;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


/**
 * @author yun-zhi-ztl
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Create User App Vo")
public class CreateAppVo {

    @Schema(description = "App Name", example = "translate")
    private String appName;

    @Builder.Default
    @Schema(description = "App Describe", example = "Assistant application for translation")
    private String appDescribe = "";
}
