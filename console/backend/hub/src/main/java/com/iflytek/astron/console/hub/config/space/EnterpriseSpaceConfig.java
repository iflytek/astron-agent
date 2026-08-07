package com.iflytek.astron.console.hub.config.space;


import com.iflytek.astron.console.commons.service.space.EnterpriseSpaceService;
import com.iflytek.astron.console.commons.util.space.EnterpriseInfoUtil;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;

@Configuration
public class EnterpriseSpaceConfig {

    @Value("${space.header.id-key:space-id}")
    private String spaceIdKey;
    @Value("${enterprise.header.id-key:enterprise-id}")
    private String enterpriseIdKey;

    @Autowired
    private EnterpriseSpaceService enterpriseSpaceService;


    @PostConstruct
    public void init() {
        SpaceInfoUtil.init(enterpriseSpaceService, spaceIdKey);
        EnterpriseInfoUtil.init(enterpriseIdKey);
    }

}
