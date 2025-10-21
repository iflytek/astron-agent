package com.iflytek.astron.console.hub.service.wechat.impl;

import com.iflytek.astron.console.hub.dto.wechat.WechatAuthCallbackDto;
import com.iflytek.astron.console.hub.service.wechat.BotOffiaccountService;
import com.iflytek.astron.console.hub.service.wechat.WechatThirdpartyService;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RBucket;
import org.redisson.api.RedissonClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import com.iflytek.astron.console.toolkit.util.OkHttpUtil;
import com.alibaba.fastjson2.JSONObject;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.util.Map;

/**
 * WeChat third-party platform service implementation
 *
 * Optimization points: 1. Use Redisson instead of RedisUtil 2. Unified exception handling 3.
 * Optimize cache key management 4. Enhanced logging 5. Extract constant configuration
 *
 * @author Omuigix
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WechatThirdpartyServiceImpl implements WechatThirdpartyService {

    private final BotOffiaccountService botOffiaccountService;
    private final RedissonClient redissonClient;

    @Value("${wechat.thirdparty.component-appid}")
    private String componentAppid;

    @Value("${wechat.thirdparty.component-secret}")
    private String componentSecret;

    // Redis cache key prefix
    private static final String REDIS_KEY_PREFIX = "wechat:thirdparty:";
    private static final String PRE_AUTH_CODE_KEY = REDIS_KEY_PREFIX + "pre_auth_code:";
    private static final String PRE_BIND_KEY = REDIS_KEY_PREFIX + "pre_bind:";
    private static final String COMPONENT_ACCESS_TOKEN_KEY = REDIS_KEY_PREFIX + "component_access_token";
    private static final String COMPONENT_VERIFY_TICKET_KEY = REDIS_KEY_PREFIX + "component_verify_ticket";
    private static final String AUTHORIZATION_ACCESS_TOKEN_KEY = REDIS_KEY_PREFIX + "authorization_access_token:";
    private static final String AUTHORIZATION_REFRESH_TOKEN_KEY = REDIS_KEY_PREFIX + "authorization_refresh_token:";

    // Cache expiration time
    private static final Duration PRE_AUTH_CODE_EXPIRE = Duration.ofSeconds(5); // Short cache to prevent duplicate requests
    private static final Duration PRE_BIND_EXPIRE = Duration.ofSeconds(1800);
    private static final Duration ACCESS_TOKEN_EXPIRE = Duration.ofSeconds(6900); // WeChat access token expires in 2 hours, set to 6900s for safety
    private static final Duration VERIFY_TICKET_EXPIRE = Duration.ofSeconds(43200);
    private static final Duration REFRESH_TOKEN_EXPIRE = Duration.ofDays(365); // Refresh token should be long-term, set to 1 year

    @Override
    public String getPreAuthCode(Integer botId, String appid, String uid) {
        log.info("Getting pre-auth code: botId={}, appid={}, uid={}", botId, appid, uid);

        String preAuthCodeKey = PRE_AUTH_CODE_KEY + botId;
        RBucket<String> bucket = redissonClient.getBucket(preAuthCodeKey);

        String preAuthCode;
        if (bucket.isExists()) {
            preAuthCode = bucket.get();
            log.info("Using cached pre-auth code: botId={}, appid={}", botId, appid);
        } else {
            // Get third-party platform access token
            String componentAccessToken = getComponentAccessToken();

            // Call WeChat API to get pre-authorization code
            preAuthCode = requestPreAuthCodeFromWechat(componentAccessToken);

            // Cache pre-authorization code (short-term cache to prevent duplicate requests)
            bucket.set(preAuthCode, PRE_AUTH_CODE_EXPIRE);
            log.info("Got new pre-auth code: botId={}, appid={}", botId, appid);
        }

        // Set pre-binding status to prevent official account from being bound to multiple bots
        setPreBindStatus(appid, botId, uid);

        return preAuthCode;
    }

    @Override
    public String buildAuthUrl(String preAuthCode, String appid, String redirectUrl) {
        if (!StringUtils.hasText(preAuthCode) || !StringUtils.hasText(redirectUrl)) {
            throw new BusinessException(ResponseEnum.PARAMS_ERROR);
        }

        String authUrl = String.format(
                "https://mp.weixin.qq.com/cgi-bin/componentloginpage?" +
                        "component_appid=%s&pre_auth_code=%s&redirect_uri=%s&auth_type=1",
                componentAppid, preAuthCode, redirectUrl);

        log.info("Building WeChat authorization URL: appid={}, redirectUrl={}", appid, redirectUrl);
        return authUrl;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void handleAuthorizedCallback(WechatAuthCallbackDto callbackData) {
        log.info("Handling WeChat authorization success callback: authorizerAppid={}", callbackData.getAuthorizerAppid());

        String authorizerAppid = callbackData.getAuthorizerAppid();
        if (!StringUtils.hasText(authorizerAppid)) {
            log.error("WeChat authorization success callback failed: Official Account AppID is empty");
            return;
        }

        // Get pre-binding information
        Integer botId = getPreBindBotId(authorizerAppid);
        if (botId == null) {
            log.error("WeChat authorization success callback failed: Pre-binding information not found, authorizerAppid={}", authorizerAppid);
            return;
        }

        try {
            // Initialize authorization token
            initAuthorizationToken(authorizerAppid, callbackData.getAuthorizationCode());

            // Establish binding relationship
            // Note: Need to get user ID from pre-binding information, temporarily using placeholder
            String uid = getUidFromPreBindInfo(authorizerAppid, botId);
            botOffiaccountService.bind(botId, authorizerAppid, uid);

            // Clean up cache
            cleanupPreBindCache(authorizerAppid, botId);

            log.info("WeChat authorization success callback handled successfully: botId={}, authorizerAppid={}", botId, authorizerAppid);
        } catch (Exception e) {
            log.error("WeChat authorization success callback handling failed: botId={}, authorizerAppid={}", botId, authorizerAppid, e);
            throw new BusinessException(ResponseEnum.WECHAT_AUTH_FAILED);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void handleUpdateAuthorizedCallback(WechatAuthCallbackDto callbackData) {
        log.info("Handling WeChat authorization update callback: authorizerAppid={}", callbackData.getAuthorizerAppid());

        // Authorization update handling logic is similar to authorization success
        handleAuthorizedCallback(callbackData);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void handleUnauthorizedCallback(WechatAuthCallbackDto callbackData) {
        log.info("Handling WeChat unauthorized callback: authorizerAppid={}", callbackData.getAuthorizerAppid());

        String authorizerAppid = callbackData.getAuthorizerAppid();
        if (StringUtils.hasText(authorizerAppid)) {
            botOffiaccountService.unbind(authorizerAppid);
            log.info("WeChat unauthorized callback handled successfully: authorizerAppid={}", authorizerAppid);
        } else {
            log.error("WeChat unauthorized callback failed: Official Account AppID is empty");
        }
    }

    @Override
    public void refreshVerifyTicket(String decryptedXml) {
        if (!StringUtils.hasText(decryptedXml)) {
            log.error("Refresh verify ticket failed: decrypted XML is empty");
            return;
        }

        try {
            // Parse the decrypted XML to extract ComponentVerifyTicket
            Map<String, String> ticketMsg = com.iflytek.astron.console.hub.util.wechat.WXBizMsgParse.parseTicketMsg(decryptedXml);
            String ticket = ticketMsg.get("ComponentVerifyTicket");

            if (!StringUtils.hasText(ticket)) {
                log.error("Refresh WeChat component_verify_ticket failed: ticket is empty!");
                return;
            }

            RBucket<String> bucket = redissonClient.getBucket(COMPONENT_VERIFY_TICKET_KEY);
            bucket.set(ticket, VERIFY_TICKET_EXPIRE);

            log.info("WeChat component_verify_ticket refreshed successfully: ticket={}", ticket);
        } catch (Exception e) {
            log.error("Failed to parse verify ticket from decrypted XML: {}", decryptedXml, e);
        }
    }

    @Override
    public String getComponentAccessToken() {
        RBucket<String> bucket = redissonClient.getBucket(COMPONENT_ACCESS_TOKEN_KEY);

        if (bucket.isExists()) {
            return bucket.get();
        }

        // Get verification ticket
        RBucket<String> ticketBucket = redissonClient.getBucket(COMPONENT_VERIFY_TICKET_KEY);
        String componentVerifyTicket = ticketBucket.get();

        if (!StringUtils.hasText(componentVerifyTicket)) {
            throw new BusinessException(ResponseEnum.WECHAT_VERIFY_TICKET_MISSING);
        }

        // Call WeChat API to get access token
        String accessToken = requestComponentAccessTokenFromWechat(componentVerifyTicket);

        // Cache access token
        bucket.set(accessToken, ACCESS_TOKEN_EXPIRE);

        log.info("Third-party platform access token retrieved successfully");
        return accessToken;
    }

    /**
     * Set pre-binding status
     */
    private void setPreBindStatus(String appid, Integer botId, String uid) {
        String preBindKey = PRE_BIND_KEY + appid;
        RBucket<String> bucket = redissonClient.getBucket(preBindKey);

        // Store information in botId:uid format
        String preBindInfo = botId + ":" + uid;
        bucket.set(preBindInfo, PRE_BIND_EXPIRE);

        log.debug("Set pre-binding status: appid={}, botId={}, uid={}", appid, botId, uid);
    }

    /**
     * Get bot ID from pre-binding information
     */
    private Integer getPreBindBotId(String appid) {
        String preBindKey = PRE_BIND_KEY + appid;
        RBucket<String> bucket = redissonClient.getBucket(preBindKey);

        if (bucket.isExists()) {
            String preBindInfo = bucket.get();
            try {
                // Parse botId:uid format
                String[] parts = preBindInfo.split(":");
                if (parts.length >= 1) {
                    return Integer.valueOf(parts[0]);
                }
            } catch (NumberFormatException e) {
                log.warn("Pre-binding information format error: appid={}, preBindInfo={}", appid, preBindInfo);
            }
        }

        return null;
    }

    /**
     * Get user ID from pre-binding information
     */
    private String getUidFromPreBindInfo(String appid, Integer botId) {
        String preBindKey = PRE_BIND_KEY + appid;
        RBucket<String> bucket = redissonClient.getBucket(preBindKey);

        if (bucket.isExists()) {
            String preBindInfo = bucket.get();
            try {
                // Parse botId:uid format
                String[] parts = preBindInfo.split(":");
                if (parts.length >= 2) {
                    return parts[1];
                }
            } catch (Exception e) {
                log.warn("Failed to parse user ID from pre-binding information: appid={}, preBindInfo={}", appid, preBindInfo, e);
            }
        }

        log.warn("Pre-binding user ID not found: appid={}, botId={}", appid, botId);
        return null;
    }

    /**
     * Clean up pre-binding cache
     */
    private void cleanupPreBindCache(String appid, Integer botId) {
        // Clean up pre-binding status
        String preBindKey = PRE_BIND_KEY + appid;
        redissonClient.getBucket(preBindKey).delete();

        // Clean up pre-authorization code
        String preAuthCodeKey = PRE_AUTH_CODE_KEY + botId;
        redissonClient.getBucket(preAuthCodeKey).delete();

        log.debug("Cleaned up pre-binding cache: appid={}, botId={}", appid, botId);
    }

    /**
     * Get pre-authorization code from WeChat API
     */
    private String requestPreAuthCodeFromWechat(String componentAccessToken) {
        String url = "https://api.weixin.qq.com/cgi-bin/component/api_create_preauthcode?component_access_token=" + componentAccessToken;

        JSONObject requestBody = new JSONObject();
        requestBody.put("component_appid", componentAppid);

        try {
            log.info("Calling WeChat API to get pre-authorization code: url={}", url);
            String response = OkHttpUtil.post(url, requestBody.toJSONString());
            log.info("WeChat API returned pre-authorization code response: {}", response);

            JSONObject responseJson = JSONObject.parseObject(response);
            String preAuthCode = responseJson.getString("pre_auth_code");

            if (StringUtils.hasText(preAuthCode)) {
                return preAuthCode;
            } else {
                log.error("Failed to get pre-authorization code: {}", response);
                throw new BusinessException(ResponseEnum.WECHAT_AUTH_FAILED);
            }
        } catch (Exception e) {
            log.error("Exception occurred while calling WeChat API to get pre-authorization code", e);
            throw new BusinessException(ResponseEnum.WECHAT_AUTH_FAILED);
        }
    }

    /**
     * Get third-party platform access token from WeChat API
     */
    private String requestComponentAccessTokenFromWechat(String componentVerifyTicket) {
        String url = "https://api.weixin.qq.com/cgi-bin/component/api_component_token";

        JSONObject requestBody = new JSONObject();
        requestBody.put("component_appid", componentAppid);
        requestBody.put("component_appsecret", componentSecret);
        requestBody.put("component_verify_ticket", componentVerifyTicket);

        try {
            log.info("Calling WeChat API to get third-party platform access token: componentVerifyTicket={}", componentVerifyTicket);
            String response = OkHttpUtil.post(url, requestBody.toJSONString());
            log.info("WeChat API returned access token response: {}", response);

            JSONObject responseJson = JSONObject.parseObject(response);
            String componentAccessToken = responseJson.getString("component_access_token");

            if (StringUtils.hasText(componentAccessToken)) {
                return componentAccessToken;
            } else {
                log.error("Failed to get third-party platform access token: {}", response);
                throw new BusinessException(ResponseEnum.WECHAT_AUTH_FAILED);
            }
        } catch (Exception e) {
            log.error("Exception occurred while calling WeChat API to get third-party platform access token", e);
            throw new BusinessException(ResponseEnum.WECHAT_AUTH_FAILED);
        }
    }

    /**
     * Initialize authorization token
     */
    private void initAuthorizationToken(String authorizerAppid, String authorizationCode) {
        String componentAccessToken = getComponentAccessToken();
        String url = "https://api.weixin.qq.com/cgi-bin/component/api_query_auth?component_access_token=" + componentAccessToken;

        JSONObject requestBody = new JSONObject();
        requestBody.put("component_appid", componentAppid);
        requestBody.put("authorization_code", authorizationCode);

        try {
            log.info("Initializing authorization token: authorizerAppid={}, authorizationCode={}", authorizerAppid, authorizationCode);
            String response = OkHttpUtil.post(url, requestBody.toJSONString());
            log.info("WeChat API returned authorization information: {}", response);

            JSONObject responseJson = JSONObject.parseObject(response);
            if (responseJson.containsKey("errcode")) {
                log.error("Failed to initialize authorization token: {}", response);
                throw new BusinessException(ResponseEnum.WECHAT_AUTH_FAILED);
            }

            JSONObject authorizationInfo = responseJson.getJSONObject("authorization_info");
            if (authorizationInfo == null) {
                log.error("Authorization information is empty: {}", response);
                throw new BusinessException(ResponseEnum.WECHAT_AUTH_FAILED);
            }

            String authorizationAccessToken = authorizationInfo.getString("authorizer_access_token");
            String authorizationRefreshToken = authorizationInfo.getString("authorizer_refresh_token");

            if (StringUtils.hasText(authorizationAccessToken) && StringUtils.hasText(authorizationRefreshToken)) {
                String accessTokenKey = AUTHORIZATION_ACCESS_TOKEN_KEY + authorizerAppid;
                String refreshTokenKey = AUTHORIZATION_REFRESH_TOKEN_KEY + authorizerAppid;

                redissonClient.getBucket(accessTokenKey).set(authorizationAccessToken, ACCESS_TOKEN_EXPIRE);
                redissonClient.getBucket(refreshTokenKey).set(authorizationRefreshToken, REFRESH_TOKEN_EXPIRE);

                log.info("Authorization token initialized successfully: authorizerAppid={}", authorizerAppid);
            } else {
                log.error("Authorization token information incomplete: accessToken={}, refreshToken={}",
                        authorizationAccessToken, authorizationRefreshToken);
                throw new BusinessException(ResponseEnum.WECHAT_AUTH_FAILED);
            }
        } catch (Exception e) {
            log.error("Exception occurred while initializing authorization token: authorizerAppid={}", authorizerAppid, e);
            throw new BusinessException(ResponseEnum.WECHAT_AUTH_FAILED);
        }
    }
}
