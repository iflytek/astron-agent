package com.iflytek.astron.console.toolkit.handler;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.toolkit.config.properties.ApiUrl;
import com.iflytek.astron.console.toolkit.util.OkHttpUtil;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/** Authorization used by the not-yet-migrated workflow publishing domain. */
@Component
@Slf4j
public class McpServerHandler {
    @Resource
    ApiUrl apiUrl;

    private static final String MCP_SERVER_AUTH = "/v2/auth";

    public JSONObject McpAuth(JSONObject req) {
        try {
            String url = apiUrl.getMcpAuthServer() + MCP_SERVER_AUTH;
            log.info("Mcp auth data url:{}\ndata:{}", url, JSON.toJSONString(req));
            String resp = OkHttpUtil.post(url, req.toString());
            JSONObject respObject = JSON.parseObject(resp);
            log.info("Mcp auth data response data:{}", resp);
            Integer ret = respObject.getInteger("ret");
            if (ret != null && ret == 0) {
                return respObject.getJSONObject("data");
            }
            throw new BusinessException(ResponseEnum.FAILED_AUTH);
        } catch (Exception e) {
            log.error("Mcp auth error", e);
            throw new BusinessException(ResponseEnum.FAILED_AUTH);
        }
    }

}
