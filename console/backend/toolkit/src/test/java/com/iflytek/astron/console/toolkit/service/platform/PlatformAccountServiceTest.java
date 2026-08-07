package com.iflytek.astron.console.toolkit.service.platform;

import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.toolkit.entity.platform.PlatformAccountConfigDto;
import com.iflytek.astron.console.toolkit.entity.platform.PlatformAccountRuntimeConfigDto;
import com.iflytek.astron.console.toolkit.entity.platform.PlatformAccountType;
import com.iflytek.astron.console.toolkit.entity.table.ConfigInfo;
import com.iflytek.astron.console.toolkit.mapper.ConfigInfoMapper;
import com.iflytek.astron.console.toolkit.util.RedisUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PlatformAccountServiceTest {

    @Mock
    private ConfigInfoMapper configInfoMapper;

    @Mock
    private RedisUtil redisUtil;

    @InjectMocks
    private PlatformAccountService platformAccountService;

    @Test
    void getConfigReadsFromRedisBeforeDatabase() {
        when(redisUtil.getStr("platform_account:iflytek_open_platform"))
                .thenReturn("{\"platformAppId\":\"appid\",\"platformApiKey\":\"key\","
                        + "\"platformApiSecret\":\"secret\",\"sparkApiPassword\":\"pwd\","
                        + "\"sparkRtasrApiKey\":\"rtasr\"}");

        PlatformAccountConfigDto config =
                platformAccountService.getConfig(PlatformAccountType.IFLYTEK_OPEN_PLATFORM);

        assertThat(config.getIflytekOpenPlatform().getPlatformAppId()).isEqualTo("appid");
        verify(redisUtil).putString("platform_account_text:iflytek_open_platform",
                "{\"platformAppId\":\"appid\",\"platformApiKey\":\"key\","
                        + "\"platformApiSecret\":\"secret\",\"sparkApiPassword\":\"pwd\","
                        + "\"sparkRtasrApiKey\":\"rtasr\"}");
        verify(configInfoMapper, never()).getByCategoryAndCode(any(), any());
    }

    @Test
    void getConfigPublishesPlainRedisCacheForCoreServices() {
        when(redisUtil.getStr("platform_account:iflytek_open_platform")).thenReturn(null);
        ConfigInfo configInfo = new ConfigInfo();
        configInfo.setValue("{\"platformAppId\":\"appid\",\"platformApiKey\":\"key\","
                + "\"platformApiSecret\":\"secret\"}");
        when(configInfoMapper.getByCategoryAndCode("PLATFORM_ACCOUNT", "IFLYTEK_OPEN_PLATFORM"))
                .thenReturn(configInfo);

        platformAccountService.getConfig(PlatformAccountType.IFLYTEK_OPEN_PLATFORM);

        verify(redisUtil).put("platform_account:iflytek_open_platform", configInfo.getValue());
        verify(redisUtil).putString("platform_account_text:iflytek_open_platform", configInfo.getValue());
    }

    @Test
    void saveConfigUpsertsDatabaseAndInvalidatesRedisCache() {
        ConfigInfo existing = new ConfigInfo();
        existing.setId(12L);
        existing.setCategory("PLATFORM_ACCOUNT");
        existing.setCode("AI_ABILITY_CHAT");
        when(configInfoMapper.getByCategoryAndCode("PLATFORM_ACCOUNT", "AI_ABILITY_CHAT"))
                .thenReturn(existing);

        PlatformAccountConfigDto request = new PlatformAccountConfigDto();
        PlatformAccountConfigDto.AiAbilityChatConfig aiAbilityChat =
                new PlatformAccountConfigDto.AiAbilityChatConfig();
        aiAbilityChat.setBaseUrl("https://example.test/v1");
        aiAbilityChat.setModel("spark-model");
        aiAbilityChat.setApiKey("api-key");
        request.setAiAbilityChat(aiAbilityChat);

        platformAccountService.saveConfig(PlatformAccountType.AI_ABILITY_CHAT, request);

        ArgumentCaptor<ConfigInfo> captor = ArgumentCaptor.forClass(ConfigInfo.class);
        verify(configInfoMapper).updateById(captor.capture());
        assertThat(captor.getValue().getValue()).contains("https://example.test/v1");
        verify(redisUtil).remove("platform_account:ai_ability_chat");
        verify(redisUtil).removeString("platform_account_text:ai_ability_chat");
    }

    @Test
    void runtimeConfigReturnsOnlyFrontendSafeValues() {
        when(redisUtil.getStr("platform_account:iflytek_open_platform"))
                .thenReturn("{\"platformAppId\":\"platform-app\",\"platformApiKey\":\"key\","
                        + "\"platformApiSecret\":\"secret\",\"sparkApiPassword\":\"pwd\","
                        + "\"sparkRtasrApiKey\":\"rtasr\"}");
        when(redisUtil.getStr("platform_account:virtual_man"))
                .thenReturn("{\"sparkVirtualManAppId\":\"virtual-app\","
                        + "\"sparkVirtualManApiKey\":\"v-key\","
                        + "\"sparkVirtualManApiSecret\":\"v-secret\"}");

        PlatformAccountRuntimeConfigDto runtimeConfig = platformAccountService.getRuntimeConfig();

        assertThat(runtimeConfig.getSparkAppId()).isEqualTo("platform-app");
        assertThat(runtimeConfig.getSparkVirtualManAppId()).isEqualTo("virtual-app");
        assertThat(runtimeConfig.isIflytekOpenPlatformConfigured()).isTrue();
        assertThat(runtimeConfig.isVirtualManConfigured()).isTrue();
    }

    @Test
    void requireAiAbilityChatThrowsWhenConfigMissing() {
        when(redisUtil.getStr("platform_account:ai_ability_chat")).thenReturn(null);
        when(configInfoMapper.getByCategoryAndCode("PLATFORM_ACCOUNT", "AI_ABILITY_CHAT"))
                .thenReturn(null);

        assertThatThrownBy(platformAccountService::requireAiAbilityChat)
                .isInstanceOf(BusinessException.class);

        verify(redisUtil, never()).put(eq("platform_account:ai_ability_chat"), any());
    }

    @Test
    void requireXinghuoKnowledgePlatformCredentialsOnlyNeedsAppIdAndApiSecret() {
        when(redisUtil.getStr("platform_account:iflytek_open_platform"))
                .thenReturn("{\"platformAppId\":\"platform-app\",\"platformApiSecret\":\"secret\"}");

        PlatformAccountConfigDto.IflytekOpenPlatformConfig config =
                platformAccountService.requireXinghuoKnowledgePlatformCredentials();

        assertThat(config.getPlatformAppId()).isEqualTo("platform-app");
        assertThat(config.getPlatformApiSecret()).isEqualTo("secret");
    }
}
