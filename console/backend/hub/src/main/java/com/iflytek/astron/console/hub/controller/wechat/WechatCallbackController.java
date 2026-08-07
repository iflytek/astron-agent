package com.iflytek.astron.console.hub.controller.wechat;

import com.iflytek.astron.console.hub.dto.wechat.WechatAuthCallbackDto;
import com.iflytek.astron.console.hub.service.wechat.WechatThirdpartyService;
import com.iflytek.astron.console.hub.util.wechat.AesException;
import com.iflytek.astron.console.hub.util.wechat.WXBizMsgCrypt;
import com.iflytek.astron.console.hub.util.wechat.WXBizMsgParse;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.util.StringUtils;
import cn.hutool.core.text.UnicodeUtil;

import java.util.Map;

/**
 * WeChat third-party platform callback controller Based on original WXOpenApiCallback design
 * Handles callbacks from WeChat third-party platform including: 1. System messages (verify ticket,
 * authorization events) 2. User messages from official accounts 3. Authorization callbacks from
 * frontend
 *
 * @author Omuigix
 */
@Slf4j
@RestController
@RequestMapping("/api/wx")
@RequiredArgsConstructor
public class WechatCallbackController {

    private final WechatThirdpartyService wechatThirdpartyService;

    @Value("${wechat.thirdparty.component-appid}")
    private String componentAppid;

    @Value("${wechat.thirdparty.token}")
    private String token;

    @Value("${wechat.thirdparty.encoding-aes-key}")
    private String encodingAesKey;

    /**
     * System message callback (unified entry point) Handles all WeChat third-party platform system
     * events: - component_verify_ticket: Verify ticket push - authorized: Authorization success -
     * updateauthorized: Authorization update - unauthorized: Authorization cancel
     *
     * Based on original WXOpenApiCallback.handleSysMsg()
     */
    @RequestMapping(value = "/callback", method = {RequestMethod.POST, RequestMethod.GET})
    public String handleSysMsg(@RequestParam(value = "signature", required = false) String signature,
            @RequestParam(value = "timestamp", required = false) String timestamp,
            @RequestParam(value = "nonce", required = false) String nonce,
            @RequestParam(value = "encrypt_type", required = false) String encryptType,
            @RequestParam(value = "msg_signature", required = false) String msgSignature,
            @RequestBody String postData) {
        log.info("WeChat third-party platform system message callback: signature={}, timestamp={}, nonce={}, encrypt_type={}, msg_signature={}",
                signature, timestamp, nonce, encryptType, msgSignature);

        // Clean up postData
        if (postData.endsWith("\\n")) {
            postData = postData.substring(0, postData.length() - 2);
        }
        postData = UnicodeUtil.toString(postData);

        try {
            Map<String, String> bodyMap = WXBizMsgParse.parseSysMsg(postData);
            String encrypt = bodyMap.get("Encrypt");
            WXBizMsgCrypt pc = new WXBizMsgCrypt(token, encodingAesKey, componentAppid);
            String decrypted = pc.decryptMsg(msgSignature, timestamp, nonce, encrypt);

            // Get message type
            String infoType = WXBizMsgParse.getInfoType(decrypted);
            switch (infoType) {
                case "component_verify_ticket":
                    // Verify ticket push
                    wechatThirdpartyService.refreshVerifyTicket(decrypted);
                    log.info("WeChat verify ticket refreshed successfully");
                    break;
                case "authorized":
                    // Authorization success
                    Map<String, String> authorizedMsg = WXBizMsgParse.parseAuthorizedMsg(decrypted);
                    WechatAuthCallbackDto authData = new WechatAuthCallbackDto();
                    authData.setAuthorizerAppid(authorizedMsg.get("AuthorizerAppid"));
                    authData.setAuthorizationCode(authorizedMsg.get("AuthorizationCode"));
                    wechatThirdpartyService.handleAuthorizedCallback(authData);
                    log.info("WeChat authorization success processed: authorizerAppid={}", authData.getAuthorizerAppid());
                    break;
                case "updateauthorized":
                    // Authorization update
                    Map<String, String> updateMsg = WXBizMsgParse.parseUpdateauthorizedMsg(decrypted);
                    WechatAuthCallbackDto updateData = new WechatAuthCallbackDto();
                    updateData.setAuthorizerAppid(updateMsg.get("AuthorizerAppid"));
                    updateData.setAuthorizationCode(updateMsg.get("AuthorizationCode"));
                    wechatThirdpartyService.handleUpdateAuthorizedCallback(updateData);
                    log.info("WeChat authorization update processed: authorizerAppid={}", updateData.getAuthorizerAppid());
                    break;
                case "unauthorized":
                    // Authorization cancel
                    Map<String, String> unauthorizedMsg = WXBizMsgParse.parseUnauthorizedMsg(decrypted);
                    WechatAuthCallbackDto cancelData = new WechatAuthCallbackDto();
                    cancelData.setAuthorizerAppid(unauthorizedMsg.get("AuthorizerAppid"));
                    wechatThirdpartyService.handleUnauthorizedCallback(cancelData);
                    log.info("WeChat authorization cancel processed: authorizerAppid={}", cancelData.getAuthorizerAppid());
                    break;
                default:
                    log.warn("Unknown WeChat system message type: {}", infoType);
                    break;
            }
        } catch (AesException e) {
            log.error("WeChat authorization event push data parsing failed! timestamp={}, nonce={}, msg_signature={}, postData={}",
                    timestamp, nonce, msgSignature, postData, e);
        }

        return "success";
    }

    /**
     * Frontend authorization callback Called by frontend after user completes authorization
     *
     * Based on original WXOpenApiCallback.authCallback()
     */
    @PostMapping("/authCallback")
    public ApiResult<Void> authCallback(@RequestBody com.alibaba.fastjson2.JSONObject jsonObject) {
        log.info("Frontend WeChat authorization callback: {}", jsonObject);

        try {
            // Process frontend authorization callback
            // This is typically used for UI state updates
            return ApiResult.success();
        } catch (Exception e) {
            log.error("Failed to process frontend authorization callback: {}", jsonObject, e);
            return ApiResult.error(ResponseEnum.SYSTEM_ERROR, "Failed to process authorization callback");
        }
    }

    /**
     * Test endpoint to manually set verify ticket for development/testing This should be removed in
     * production
     *
     * @param ticket Test verify ticket
     * @return Success response
     */
    @PostMapping("/test/set-verify-ticket")
    public ApiResult<String> setTestVerifyTicket(@RequestParam("ticket") String ticket) {
        log.warn("Setting test verify ticket (development only): ticket={}", ticket);

        if (!StringUtils.hasText(ticket)) {
            return ApiResult.error(ResponseEnum.PARAMS_ERROR, "Ticket cannot be empty");
        }

        try {
            wechatThirdpartyService.refreshVerifyTicket(ticket);
            return ApiResult.success("Test verify ticket set successfully");
        } catch (Exception e) {
            log.error("Failed to set test verify ticket: ticket={}", ticket, e);
            return ApiResult.error(ResponseEnum.SYSTEM_ERROR, "Failed to set test verify ticket");
        }
    }

}
