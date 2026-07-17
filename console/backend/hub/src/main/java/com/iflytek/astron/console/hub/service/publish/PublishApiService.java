package com.iflytek.astron.console.hub.service.publish;

import com.iflytek.astron.console.hub.dto.publish.AppListDTO;
import com.iflytek.astron.console.hub.dto.publish.BotApiInfoDTO;
import com.iflytek.astron.console.hub.dto.publish.CreateAppVo;
import com.iflytek.astron.console.hub.dto.publish.CreateBotApiVo;
import jakarta.servlet.http.HttpServletRequest;

import java.util.List;

/**
 * @author yun-zhi-ztl
 */
public interface PublishApiService {
    Boolean createApp(CreateAppVo createAppVo);

    List<AppListDTO> getAppList();

    BotApiInfoDTO createBotApi(CreateBotApiVo createBotApiVo, HttpServletRequest request);

    BotApiInfoDTO createBotApi(CreateBotApiVo createBotApiVo, HttpServletRequest request, String uid);

    BotApiInfoDTO createBotApi(CreateBotApiVo createBotApiVo, HttpServletRequest request, String uid, Long spaceId);

    BotApiInfoDTO getApiInfo(Long botId);
}
