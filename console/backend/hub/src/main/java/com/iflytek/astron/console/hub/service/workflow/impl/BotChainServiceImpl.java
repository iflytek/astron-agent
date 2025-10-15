package com.iflytek.astron.console.hub.service.workflow.impl;

import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.entity.bot.UserLangChainInfo;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.service.data.UserLangChainDataService;
import com.iflytek.astron.console.commons.util.MaasUtil;
import com.iflytek.astron.console.hub.service.workflow.BotChainService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * @author mingsuiyongheng
 */
@Service
@Slf4j
public class BotChainServiceImpl implements BotChainService {

    @Autowired
    private UserLangChainDataService userLangChainDataService;

    @Autowired
    private MaasUtil maasUtil;

    /**
     * Copy assistant 2.0
     */
    @Override
    public void copyBot(String uid, Long sourceId, Long targetId, Long spaceId) {
        // Query source assistant
        List<UserLangChainInfo> botList = userLangChainDataService.findListByBotId(Math.toIntExact(sourceId));
        if (Objects.isNull(botList) || botList.isEmpty()) {
            log.info("***** Source assistant does not exist, id: {}", sourceId);
            return;
        }

        UserLangChainInfo chainInfo = botList.getFirst();
        // Replace node id to prevent data backflow confusion
        replaceNodeId(chainInfo);
        // Configure botId, flowId, uid, updateTime
        chainInfo.setId(null);
        chainInfo.setBotId(Math.toIntExact(targetId));
        chainInfo.setFlowId(null);
        if (null == spaceId) {
            chainInfo.setUid(uid);
        } else {
            chainInfo.setSpaceId(spaceId);
        }
        chainInfo.setUpdateTime(LocalDateTime.now());

        // Add new json
        userLangChainDataService.insertUserLangChainInfo(chainInfo);
    }

    /**
     * Copy workflow
     */
    @Override
    @Transactional
    public void cloneWorkFlow(String uid, Long sourceId, Long targetId, HttpServletRequest request, Long spaceId) {
        // Query source assistant
        List<UserLangChainInfo> botList = userLangChainDataService.findListByBotId(Math.toIntExact(sourceId));
        if (Objects.isNull(botList) || botList.isEmpty()) {
            log.info("***** Source assistant does not exist, id: {}", sourceId);
            return;
        }

        UserLangChainInfo chainInfo = botList.getFirst();
        Long massId = Long.valueOf(String.valueOf(chainInfo.getMaasId()));
        JSONObject res = maasUtil.copyWorkFlow(massId, request);
        if (Objects.isNull(res)) {
            // Throw exception to maintain data transactionality
            throw new BusinessException(ResponseEnum.BOT_CHAIN_UPDATE_ERROR);
        }
        JSONObject data = res.getJSONObject("data");
        Long currentMass = data.getLong("id");
        String flowId = data.getString("flowId");
        UserLangChainInfo chain = new UserLangChainInfo();
        chain.setBotId(Math.toIntExact(targetId));
        chain.setMaasId(currentMass);
        chain.setFlowId(flowId);
        if (null == spaceId) {
            chain.setUid(uid);
        } else {
            chain.setSpaceId(spaceId);
        }
        chain.setUpdateTime(LocalDateTime.now());
        userLangChainDataService.insertUserLangChainInfo(chain);
        log.info("----- Source assistant: {}, target assistant: {} got new canvas id: {}, flowId: {}", sourceId, targetId, currentMass, flowId);
    }

    /**
     * Replace node ID
     *
     * @param botMap UserLangChainInfo object containing open and GCY strings
     */
    public static void replaceNodeId(UserLangChainInfo botMap) {
        JSONObject open = JSONObject.parseObject(botMap.getOpen());
        String openStr = botMap.getOpen();
        String gcyStr = botMap.getGcy();

        JSONArray nodes = open.getJSONArray("nodes");
        for (Object o : nodes) {
            JSONObject node = (JSONObject) o;
            String oldNodeId = node.getString("id");
            String newNodeId = getNewNodeId(oldNodeId);
            // Directly match string and replace
            openStr = openStr.replace(oldNodeId, newNodeId);
            gcyStr = gcyStr.replace(oldNodeId, newNodeId);
        }
        botMap.setOpen(openStr);
        botMap.setGcy(gcyStr);
    }

    /**
     * Get new node ID
     *
     * @param original Original node ID string
     * @return New node ID string, if the original string contains a colon, add a random UUID after the
     *         colon, otherwise throw an exception
     */
    public static String getNewNodeId(String original) {
        int colonIndex = original.indexOf(':');
        if (colonIndex != -1) {
            return original.substring(0, colonIndex + 1) + UUID.randomUUID();
        }
        // If no colon is found, return the original string
        log.info("***** {} no colon found", original);
        throw new RuntimeException("Assistant backend data does not conform to specifications");
    }
}
