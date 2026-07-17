package com.iflytek.astron.console.hub.service.agentmemory.runtime;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.iflytek.astron.console.toolkit.entity.table.ConfigInfo;
import com.iflytek.astron.console.toolkit.mapper.ConfigInfoMapper;
import com.iflytek.astron.console.toolkit.util.idata.RSAUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.security.interfaces.RSAPrivateKey;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AgentMemorySecretServiceTest {

    @Mock
    private ConfigInfoMapper configInfoMapper;

    @Test
    void decryptApiKeyCachesParsedPrivateKey() throws Exception {
        AgentMemorySecretService service = new AgentMemorySecretService(configInfoMapper);
        ConfigInfo privateKeyConfig = new ConfigInfo();
        privateKeyConfig.setValue("private-key");
        when(configInfoMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(privateKeyConfig);

        RSAPrivateKey privateKey = mock(RSAPrivateKey.class);
        try (MockedStatic<RSAUtil> rsa = mockStatic(RSAUtil.class)) {
            rsa.when(() -> RSAUtil.loadPrivateKey("private-key")).thenReturn(privateKey);
            rsa.when(() -> RSAUtil.decryptByPrivateKeyBase64("cipher-1", privateKey)).thenReturn("plain-1");
            rsa.when(() -> RSAUtil.decryptByPrivateKeyBase64("cipher-2", privateKey)).thenReturn("plain-2");

            assertEquals("plain-1", service.decryptApiKey("cipher-1"));
            assertEquals("plain-2", service.decryptApiKey("cipher-2"));

            verify(configInfoMapper, times(1)).selectOne(any(LambdaQueryWrapper.class));
            rsa.verify(() -> RSAUtil.loadPrivateKey("private-key"), times(1));
        }
    }
}
