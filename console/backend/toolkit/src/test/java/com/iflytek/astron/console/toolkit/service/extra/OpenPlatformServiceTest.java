package com.iflytek.astron.console.toolkit.service.extra;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.dto.workflow.CloneSynchronize;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.service.workflow.WorkflowBotService;
import com.iflytek.astron.console.toolkit.config.properties.ApiUrl;
import com.iflytek.astron.console.toolkit.config.properties.CommonConfig;
import com.iflytek.astron.console.toolkit.tool.OpenPlatformTool;
import com.iflytek.astron.console.toolkit.util.OkHttpUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OpenPlatformServiceTest {

    @Mock
    ApiUrl apiUrl;
    @Mock
    CommonConfig commonConfig;
    @Mock
    WorkflowBotService botMassService;

    @InjectMocks
    OpenPlatformService service;

    @BeforeEach
    void setSecret() throws Exception {
        // Private @Value fields manually injected in unit test environment
        Field f = OpenPlatformService.class.getDeclaredField("secret");
        f.setAccessible(true);
        f.set(service, "sec-xyz");
    }

    // ================ syncWorkflowClone ================

    @Test
    @DisplayName("syncWorkflowClone - 应组装 CloneSynchronize 并调用 botMassService，返回其结果")
    void syncWorkflowClone_shouldBuildDto_andDelegate() {
        ArgumentCaptor<CloneSynchronize> cap =
                ArgumentCaptor.forClass(CloneSynchronize.class);
        when(botMassService.maasCopySynchronize(any())).thenReturn(123);

        Integer ret = service.syncWorkflowClone("u1", 11L, 22L, "F-1", 33L);

        assertThat(ret).isEqualTo(123);
        verify(botMassService).maasCopySynchronize(cap.capture());
        var dto = cap.getValue();
        assertThat(dto.getUid()).isEqualTo("u1");
        assertThat(dto.getOriginId()).isEqualTo(11L);
        assertThat(dto.getCurrentId()).isEqualTo(22L);
        assertThat(dto.getFlowId()).isEqualTo("F-1");
        assertThat(dto.getSpaceId()).isEqualTo(33L);
    }

    @Test
    @DisplayName("syncWorkflowClone - 下游抛异常应向外传播")
    void syncWorkflowClone_shouldPropagateException() {
        when(botMassService.maasCopySynchronize(any()))
                .thenThrow(new RuntimeException("down"));

        assertThatThrownBy(() -> service.syncWorkflowClone("u", 1L, 2L, "F", 3L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("down");
    }

    // ================ syncWorkflowUpdate ================

    @Nested
    class SyncWorkflowUpdateTests {

        @Test
        @DisplayName("syncWorkflowUpdate - 成功：应正确拼 URL/Headers/Body 并返回 data")
        void syncWorkflowUpdate_success() {
            when(apiUrl.getOpenPlatform()).thenReturn("http://open");

            Map<String, Object> data = new LinkedHashMap<>();
            data.put("ok", true);

            try (MockedStatic<OpenPlatformTool> sign = mockStatic(OpenPlatformTool.class);
                 MockedStatic<OkHttpUtil> http = mockStatic(OkHttpUtil.class)) {

                // Signature stub: verify appId and secret, return fixed signature
                sign.when(() -> OpenPlatformTool.getSignature(eq(commonConfig.getAppId()), eq("sec-xyz"), anyLong()))
                    .thenReturn("SIG-123");

                // HTTP stub: precisely verify URL/Headers/Body, return code=0 response
                http.when(() -> OkHttpUtil.post(anyString(), anyMap(), anyString()))
                    .thenAnswer(inv -> {
                        String url = inv.getArgument(0);
                        @SuppressWarnings("unchecked")
                        Map<String, String> headers = inv.getArgument(1);
                        String body = inv.getArgument(2);

                        assertThat(url).isEqualTo("http://open/workflow/updateSynchronize");
                        // header: appId, signature, timestamp
                        assertThat(headers).containsEntry("appId", commonConfig.getAppId());
                        assertThat(headers).containsEntry("signature", "SIG-123");
                        assertThat(headers).containsKey("timestamp");
                        assertThat(headers.get("timestamp")).matches("\\d{10}"); // 秒级时间戳

                        // body: fields and values
                        JSONObject jo = JSON.parseObject(body);
                        assertThat(jo.getLong("massId")).isEqualTo(9L);
                        assertThat(jo.getString("botDesc")).isEqualTo("desc");
                        assertThat(jo.getString("prologue")).isEqualTo("pro");
                        JSONArray arr = jo.getJSONArray("inputExample");
                        assertThat(arr.toJavaList(String.class)).containsExactly("i1", "i2");

                        Map<String, Object> resp = new LinkedHashMap<>();
                        resp.put("code", 0);
                        resp.put("desc", "ok");
                        resp.put("data", data);
                        return JSON.toJSONString(resp);
                    });

                Object out = service.syncWorkflowUpdate(9L, "desc", "pro", Arrays.asList("i1", "i2"));

                // data returned as-is
                assertThat(out).isInstanceOfAny(Map.class, JSONObject.class);
                assertThat(JSON.toJSONString(out)).contains("\"ok\":true");

                // Verify signature function was called (appId/secret fixed, timestamp any long)
                sign.verify(() -> OpenPlatformTool.getSignature(
                        eq(commonConfig.getAppId()), eq("sec-xyz"), anyLong()));
            }
        }

        @Test
        @DisplayName("syncWorkflowUpdate - 平台返回非0应抛 BusinessException(common.response.failed)")
        void syncWorkflowUpdate_failed_shouldThrowBusinessException() {
            when(apiUrl.getOpenPlatform()).thenReturn("http://open");

            try (MockedStatic<OpenPlatformTool> sign = mockStatic(OpenPlatformTool.class);
                 MockedStatic<OkHttpUtil> http = mockStatic(OkHttpUtil.class)) {

                sign.when(() -> OpenPlatformTool.getSignature(anyString(), anyString(), anyLong()))
                    .thenReturn("SIG-X");

                Map<String, Object> resp = new LinkedHashMap<>();
                resp.put("code", 1);
                resp.put("desc", "bad");
                resp.put("data", null);

                http.when(() -> OkHttpUtil.post(anyString(), anyMap(), anyString()))
                    .thenReturn(JSON.toJSONString(resp));

                assertThatThrownBy(() ->
                        service.syncWorkflowUpdate(1L, "d", "p", Collections.emptyList()))
                        .isInstanceOf(BusinessException.class)
                        .hasMessageContaining("common.response.failed");
            }
        }

        @Test
        @DisplayName("syncWorkflowUpdate - 允许 null 参数并照常发起请求")
        void syncWorkflowUpdate_nulls_shouldStillCallHttp() {
            when(apiUrl.getOpenPlatform()).thenReturn("http://open");

            try (MockedStatic<OpenPlatformTool> sign = mockStatic(OpenPlatformTool.class);
                 MockedStatic<OkHttpUtil> http = mockStatic(OkHttpUtil.class)) {

                sign.when(() -> OpenPlatformTool.getSignature(anyString(), anyString(), anyLong()))
                    .thenReturn("SIG-N");

                http.when(() -> OkHttpUtil.post(anyString(), anyMap(), anyString()))
                    .thenAnswer(inv -> {
                        String body = inv.getArgument(2);
                        JSONObject jo = JSON.parseObject(body);
                        // Allow null
                        assertThat(jo.get("botDesc")).isNull();
                        assertThat(jo.get("prologue")).isNull();
                        assertThat(jo.get("inputExample")).isNull();
                        return JSON.toJSONString(new LinkedHashMap<String, Object>() {{
                            put("code", 0); put("desc", "ok"); put("data", Collections.singletonMap("x", 1));
                        }});
                    });

                Object out = service.syncWorkflowUpdate(2L, null, null, null);
                assertThat(JSON.toJSONString(out)).contains("\"x\":1");
            }
        }
    }
}
