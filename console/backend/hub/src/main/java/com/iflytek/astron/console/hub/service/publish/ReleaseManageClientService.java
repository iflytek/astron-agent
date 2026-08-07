package com.iflytek.astron.console.hub.service.publish;

import jakarta.servlet.http.HttpServletRequest;

/**
 * @author yun-zhi-ztl
 */
public interface ReleaseManageClientService {
    String getVersionNameByBotId(Long botId, Long spaceId, HttpServletRequest request);

    void releaseBotApi(Integer botId, String flowId, String versionName, Long spaceId, HttpServletRequest request);
}
