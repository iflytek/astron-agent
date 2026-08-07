package com.iflytek.astron.console.hub.service.wechat;

import com.iflytek.astron.console.hub.dto.wechat.WechatAuthCallbackDto;

/**
 * WeChat third-party platform service interface
 *
 * @author Omuigix
 */
public interface WechatThirdpartyService {

    /**
     * Get pre-authorization code
     *
     * @param botId Bot ID
     * @param appid WeChat official account AppID
     * @param uid User ID
     * @return Pre-authorization code
     */
    String getPreAuthCode(Integer botId, String appid, String uid);

    /**
     * Build WeChat authorization link
     *
     * @param preAuthCode Pre-authorization code
     * @param appid WeChat official account AppID
     * @param redirectUrl Callback URL
     * @return Authorization link
     */
    String buildAuthUrl(String preAuthCode, String appid, String redirectUrl);

    /**
     * Handle WeChat authorization success callback
     *
     * @param callbackData Callback data
     */
    void handleAuthorizedCallback(WechatAuthCallbackDto callbackData);

    /**
     * Handle WeChat authorization update callback
     *
     * @param callbackData Callback data
     */
    void handleUpdateAuthorizedCallback(WechatAuthCallbackDto callbackData);

    /**
     * Handle WeChat cancel authorization callback
     *
     * @param callbackData Callback data
     */
    void handleUnauthorizedCallback(WechatAuthCallbackDto callbackData);

    /**
     * Refresh verification ticket
     *
     * @param decryptedXml Decrypted XML containing ComponentVerifyTicket
     */
    void refreshVerifyTicket(String decryptedXml);

    /**
     * Get third-party platform access token
     *
     * @return Access token
     */
    String getComponentAccessToken();
}
