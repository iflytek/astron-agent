package com.iflytek.astron.console.hub.service.wechat;

import com.iflytek.astron.console.commons.entity.wechat.BotOffiaccount;

import java.util.List;

/**
 * Bot and WeChat official account binding service interface
 *
 * @author Omuigix
 */
public interface BotOffiaccountService {

    /**
     * Establish binding relationship between bot and WeChat official account
     *
     * @param botId Bot ID
     * @param appid WeChat official account AppID
     * @param uid User ID
     */
    void bind(Integer botId, String appid, String uid);

    /**
     * Unbind WeChat official account
     *
     * @param appid WeChat official account AppID
     */
    void unbind(String appid);

    /**
     * Get bound WeChat official account list by user ID
     *
     * @param uid User ID
     * @return Binding list
     */
    List<BotOffiaccount> getAccountList(String uid);

    /**
     * Get bound bot information by WeChat AppID
     *
     * @param appid WeChat official account AppID
     * @return Binding information
     */
    BotOffiaccount getByAppid(String appid);

    /**
     * Get bound WeChat official account information by bot ID
     *
     * @param botId Bot ID
     * @return Binding information
     */
    BotOffiaccount getByBotId(Integer botId);
}
