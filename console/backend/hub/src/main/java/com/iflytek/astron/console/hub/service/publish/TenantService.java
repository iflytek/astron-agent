package com.iflytek.astron.console.hub.service.publish;

import com.iflytek.astron.console.hub.dto.user.TenantAuth;

/**
 * @author yun-zhi-ztl
 */
public interface TenantService {

    String createApp(String uid, String appName, String appDesc);

    TenantAuth getAppDetail(String appId);
}
