package com.iflytek.astron.console.commons.service.user;

import com.iflytek.astron.console.commons.entity.user.AppMst;

import java.util.List;

/**
 * @author yun-zhi-ztl
 */
public interface AppMstService {
    boolean exist(String appName);

    void insert(String uid, String appId, String appName, String appDescribe, String apiKey, String apiSecret);

    List<AppMst> getAppListByUid(String uid);

    AppMst getByAppId(String uid, String appId);
}
