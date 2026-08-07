package com.iflytek.astron.console.hub.dto.wechat;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * WeChat authorization callback data DTO
 *
 * @author Omuigix
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "WeChat authorization callback data DTO")
public class WechatAuthCallbackDto {

    @Schema(description = "Third-party platform AppID")
    private String appId;

    @Schema(description = "Information type: authorized/updateauthorized/unauthorized")
    private String infoType;

    @Schema(description = "Authorizer AppID")
    private String authorizerAppid;

    @Schema(description = "Authorization code")
    private String authorizationCode;

    @Schema(description = "Authorization code expiration time")
    private String authorizationCodeExpiredTime;

    @Schema(description = "Pre-authorization code")
    private String preAuthCode;

    @Schema(description = "Creation time")
    private String createTime;

    @Schema(description = "Component verification ticket")
    private String componentVerifyTicket;
}
