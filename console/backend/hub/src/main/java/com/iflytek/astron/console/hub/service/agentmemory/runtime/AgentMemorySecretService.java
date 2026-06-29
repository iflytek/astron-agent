package com.iflytek.astron.console.hub.service.agentmemory.runtime;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.toolkit.entity.table.ConfigInfo;
import com.iflytek.astron.console.toolkit.mapper.ConfigInfoMapper;
import com.iflytek.astron.console.toolkit.util.idata.RSAUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.security.interfaces.RSAPrivateKey;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgentMemorySecretService {

    private static final String CAT_MODEL_SECRET_KEY = "MODEL_SECRET_KEY";
    private static final String CODE_PRIVATE_KEY = "private_key";

    private final ConfigInfoMapper configInfoMapper;

    public String decryptApiKey(String apiKeyCiphertext) {
        ConfigInfo modelSecretKey = configInfoMapper.selectOne(Wrappers.<ConfigInfo>lambdaQuery()
                .eq(ConfigInfo::getCategory, CAT_MODEL_SECRET_KEY)
                .eq(ConfigInfo::getCode, CODE_PRIVATE_KEY)
                .eq(ConfigInfo::getIsValid, 1)
                .last("LIMIT 1"));
        if (modelSecretKey == null) {
            throw new BusinessException(ResponseEnum.MODEL_API_KEY_NOT_FOUND);
        }

        try {
            RSAPrivateKey privateKey = RSAUtil.loadPrivateKey(modelSecretKey.getValue());
            return RSAUtil.decryptByPrivateKeyBase64(apiKeyCiphertext, privateKey);
        } catch (Exception e) {
            log.error("Decrypt agent memory API key failed", e);
            throw new BusinessException(ResponseEnum.MODEL_APIKEY_LOAD_ERROR);
        }
    }
}
