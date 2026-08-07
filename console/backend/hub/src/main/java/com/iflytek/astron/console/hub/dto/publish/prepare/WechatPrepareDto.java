package com.iflytek.astron.console.hub.dto.publish.prepare;

import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * WeChat prepare data DTO
 *
 * @author Omuigix
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class WechatPrepareDto extends BasePrepareDto {

    /**
     * WeChat App ID
     */
    private String appId;

    /**
     * WeChat App Secret
     */
    private String appSecret;

    /**
     * WeChat Token
     */
    private String token;

    /**
     * WeChat Encoding AES Key
     */
    private String encodingAESKey;

    /**
     * Server URL for WeChat callbacks
     */
    private String serverUrl;

    /**
     * Whether the bot is verified
     */
    private Boolean verified = false;
}
