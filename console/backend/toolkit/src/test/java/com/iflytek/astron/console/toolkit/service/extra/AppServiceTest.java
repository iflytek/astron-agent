package com.iflytek.astron.console.toolkit.service.extra;

import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.toolkit.config.properties.ApiUrl;
import com.iflytek.astron.console.toolkit.config.properties.CommonConfig;
import com.iflytek.astron.console.toolkit.tool.CommonTool;
import com.iflytek.astron.console.toolkit.tool.http.HeaderAuthHttpTool;
import com.iflytek.astron.console.toolkit.util.RedisUtil;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link AppService}.
 */
@ExtendWith(MockitoExtension.class)
class AppServiceTest {

    @InjectMocks
    private AppService appService;

    @Mock
    private ApiUrl apiUrl;
    @Mock
    private RedisUtil redisUtil;
    // RedisTemplate not directly used, keep default Mock
    @Mock
    private CommonConfig commonConfig;
    // ↑ Add this import at the top

    @Test
    @DisplayName("getAkSk - 远程返回空数组：应抛BusinessException（包含APPID提示）")
    void getAkSk_shouldThrow_whenArrayEmpty() throws Exception {
        String appId = "APP-5";

        // 走“远程分支”：缓存未命中，且不是“特殊APPID”
        when(redisUtil.get("app_detail_cache:" + appId)).thenReturn(null);
        when(commonConfig.getAppId()).thenReturn("NOT-SPECIAL");

        // URL and auth parameters must be stubbed to avoid null/key/APP-5
        when(apiUrl.getAppUrl()).thenReturn("http://api");
        when(apiUrl.getApiKey()).thenReturn("ak");
        when(apiUrl.getApiSecret()).thenReturn("sk");

        // ---- Key: Prepare an available BeanFactory for CommonTool static initialization ----
        ConfigurableListableBeanFactory fakeBF = mock(ConfigurableListableBeanFactory.class, withSettings()
                .defaultAnswer(invocation -> {
                    if ("getBean".equals(invocation.getMethod().getName())) {
                        Class<?> type = invocation.getArgument(0);
                        // Return any type of mock to satisfy CommonTool.<clinit> dependencies
                        return Mockito.mock(type);
                    }
                    return RETURNS_DEFAULTS.answer(invocation);
                }));

        Class<?> springUtils = Class.forName("com.iflytek.astron.console.toolkit.util.SpringUtils");
        var bfField = springUtils.getDeclaredField("beanFactory");
        bfField.setAccessible(true);
        bfField.set(null, fakeBF);
        // ----------------------------------------------------------------------

        // Static mock: HTTP returns placeholder response; parsing returns empty array "[]"
        try (MockedStatic<HeaderAuthHttpTool> http = mockStatic(HeaderAuthHttpTool.class);
                MockedStatic<CommonTool> common = mockStatic(CommonTool.class)) {

            http.when(() -> HeaderAuthHttpTool.get("http://api/key/" + appId, "ak", "sk"))
                    .thenReturn("resp");
            common.when(() -> CommonTool.checkSystemCallResponse("resp"))
                    .thenReturn("[]");

            assertThatThrownBy(() -> appService.getAkSk(appId))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("common.response.failed");

            // Interaction verification (improve PIT killing power)
            verify(redisUtil).get("app_detail_cache:" + appId);
            http.verify(() -> HeaderAuthHttpTool.get("http://api/key/" + appId, "ak", "sk"));
            common.verify(() -> CommonTool.checkSystemCallResponse("resp"));
        }
    }

    // ================= getAkSk: HTTP 抛受检异常 → 包装成 RuntimeException =================

    @Test
    @DisplayName("getAkSk - HeaderAuthHttpTool.get 抛 IOException：应包装为 RuntimeException 并带有 cause")
    void getAkSk_shouldWrapHttpException() {
        String appId = "APP-6";
        when(redisUtil.get("app_detail_cache:" + appId)).thenReturn(null);
        when(apiUrl.getAppUrl()).thenReturn("http://api");
        when(apiUrl.getApiKey()).thenReturn("ak");
        when(apiUrl.getApiSecret()).thenReturn("sk");

        try (MockedStatic<HeaderAuthHttpTool> http = mockStatic(HeaderAuthHttpTool.class)) {
            http.when(() -> HeaderAuthHttpTool.get("http://api/key/" + appId, "ak", "sk"))
                    .thenThrow(new IOException("net down"));

            assertThatThrownBy(() -> appService.getAkSk(appId))
                    .isInstanceOf(RuntimeException.class)
                    .hasCauseInstanceOf(IOException.class)
                    .hasRootCauseMessage("net down");
        }
    }
}
