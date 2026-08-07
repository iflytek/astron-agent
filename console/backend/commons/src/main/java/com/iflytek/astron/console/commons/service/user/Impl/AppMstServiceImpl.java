package com.iflytek.astron.console.commons.service.user.Impl;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.iflytek.astron.console.commons.entity.user.AppMst;
import com.iflytek.astron.console.commons.mapper.user.AppMstMapper;
import com.iflytek.astron.console.commons.service.user.AppMstService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * @author yun-zhi-ztl
 */
@Service
@Slf4j
public class AppMstServiceImpl implements AppMstService {

    @Autowired
    private AppMstMapper appMstMapper;


    @Override
    public boolean exist(String appName) {
        return appMstMapper.exists(Wrappers.lambdaQuery(AppMst.class)
                .eq(AppMst::getAppName, appName)
                .eq(AppMst::getIsDelete, 0));
    }

    @Override
    public void insert(String uid, String appId, String appName, String appDescribe, String apiKey, String apiSecret) {
        AppMst appMst = AppMst.builder()
                .uid(uid)
                .appId(appId)
                .appName(appName)
                .appDescribe(appDescribe)
                .appKey(apiKey)
                .appSecret(apiSecret)
                .isDelete(0)
                .createTime(LocalDateTime.now())
                .updateTime(LocalDateTime.now())
                .build();
        appMstMapper.insert(appMst);
    }

    @Override
    public List<AppMst> getAppListByUid(String uid) {
        return appMstMapper.selectList(Wrappers.lambdaQuery(AppMst.class)
                .eq(AppMst::getUid, uid)
                .eq(AppMst::getIsDelete, 0)
                .orderByDesc(AppMst::getCreateTime));
    }

    @Override
    public AppMst getByAppId(String uid, String appId) {
        return appMstMapper.selectOne(Wrappers.lambdaQuery(AppMst.class)
                .eq(AppMst::getUid, uid)
                .eq(AppMst::getAppId, appId)
                .eq(AppMst::getIsDelete, 0)
                .last("LIMIT 1"));
    }
}
