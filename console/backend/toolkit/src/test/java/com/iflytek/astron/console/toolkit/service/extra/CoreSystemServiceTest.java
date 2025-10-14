package com.iflytek.astron.console.toolkit.service.extra;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.toolkit.common.constant.CommonConst;
import com.iflytek.astron.console.toolkit.config.properties.ApiUrl;
import com.iflytek.astron.console.toolkit.config.properties.CommonConfig;
import com.iflytek.astron.console.toolkit.entity.core.workflow.FlowProtocol;
import com.iflytek.astron.console.toolkit.entity.enumVo.DBOperateEnum;
import com.iflytek.astron.console.toolkit.util.OkHttpUtil;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for CoreSystemService.
 */
@ExtendWith(MockitoExtension.class)
class CoreSystemServiceTest {

    @Mock
    ApiUrl apiUrl;
    @Mock
    CommonConfig commonConfig;
    @Mock
    AppService appService;

    @InjectMocks
    CoreSystemService service;

    // ================== helpers ==================

    private void setEnv(String env) throws Exception {
        Field f = CoreSystemService.class.getDeclaredField("env");
        f.setAccessible(true);
        f.set(service, env);
    }

    private static MultipartFile mockFile(String name, byte[] bytes) throws Exception {
        MultipartFile f = mock(MultipartFile.class);

        // These may not be called in some branches → use lenient() to avoid UnnecessaryStubbingException
        lenient().when(f.getOriginalFilename()).thenReturn(name);
        lenient().when(f.getInputStream()).thenReturn(new ByteArrayInputStream(bytes));
        lenient().when(f.isEmpty()).thenReturn(bytes == null || bytes.length == 0);

        // This will be used in the current upload success path → keep strict
        when(f.getBytes()).thenReturn(bytes);

        return f;
    }

    private static String ok(Object data) {
        Map<String, Object> m = new HashMap<>();
        m.put("code", 0);
        m.put("message", "ok");
        m.put("data", data);
        return JSON.toJSONString(m);
    }

    private static String fail(String msg) {
        Map<String, Object> m = new HashMap<>();
        m.put("code", 1);
        m.put("message", msg);
        m.put("data", null);
        return JSON.toJSONString(m);
    }

    // ================== publish / auth ==================

    @Test
    @DisplayName("publish(prod) - non-dev environment should sign and verify return code")
    void publish_prod_success() throws Exception {
        setEnv("prod");
        when(apiUrl.getWorkflow()).thenReturn("http://wf");
        when(apiUrl.getTenantKey()).thenReturn("tk");
        when(apiUrl.getTenantSecret()).thenReturn("ts");
        when(apiUrl.getTenantId()).thenReturn("tid");

        try (MockedStatic<OkHttpUtil> http = mockStatic(OkHttpUtil.class)) {
            http.when(() -> OkHttpUtil.post(anyString(), anyMap(), anyString()))
                    .thenAnswer(inv -> {
                        String url = inv.getArgument(0);
                        Map<String, String> header = inv.getArgument(1);
                        String body = inv.getArgument(2);
                        assertThat(url).isEqualTo("http://wf" + CoreSystemService.API_PUBLISH_PATH);
                        // header should contain username and signature fields
                        assertThat(header).containsEntry(CoreSystemService.X_CONSUMER_USERNAME, "tid");
                        assertThat(header).containsKeys("authorization", "host", "date", "digest");
                        JSONObject b = JSONObject.parseObject(body);
                        assertThat(b.getString("flow_id")).isEqualTo("F1");
                        assertThat(b.getInteger("plat")).isEqualTo(2);
                        assertThat(b.getInteger("release_status")).isEqualTo(1);
                        assertThat(b.getString("version")).isEqualTo("v1");
                        return ok(null);
                    });

            service.publish("F1", 2, 1, "v1");
        }
    }

    @Test
    @DisplayName("publish - non-zero return code should throw BusinessException")
    void publish_fail_throws() throws Exception {
        setEnv("prod");
        when(apiUrl.getWorkflow()).thenReturn("http://wf");
        when(apiUrl.getTenantKey()).thenReturn("tk");
        when(apiUrl.getTenantSecret()).thenReturn("ts");
        when(apiUrl.getTenantId()).thenReturn("tid");

        try (MockedStatic<OkHttpUtil> http = mockStatic(OkHttpUtil.class)) {
            http.when(() -> OkHttpUtil.post(anyString(), anyMap(), anyString()))
                    .thenReturn(fail("bad"));

            assertThatThrownBy(() -> service.publish("F1", 2, 1, null))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("bad");
        }
    }

    @Test
    @DisplayName("auth(dev) - dev environment forces app_id=a01c2bc7 and requires no signature")
    void auth_dev_forcedAppId() throws Exception {
        setEnv(CommonConst.ENV_DEV); // "dev"
        when(apiUrl.getWorkflow()).thenReturn("http://wf");
        when(apiUrl.getTenantId()).thenReturn("tid");

        try (MockedStatic<OkHttpUtil> http = mockStatic(OkHttpUtil.class)) {
            http.when(() -> OkHttpUtil.post(anyString(), anyMap(), anyString()))
                    .thenAnswer(inv -> {
                        Map<String, String> header = inv.getArgument(1);
                        String body = inv.getArgument(2);
                        // Only X-Consumer-Username, no signature headers
                        assertThat(header).containsOnlyKeys(CoreSystemService.X_CONSUMER_USERNAME);
                        assertThat(header).containsEntry(CoreSystemService.X_CONSUMER_USERNAME, "tid");
                        JSONObject b = JSONObject.parseObject(body);
                        assertThat(b.getString("app_id")).isEqualTo("a01c2bc7");
                        assertThat(b.getString("flow_id")).isEqualTo("F2");
                        return ok(null);
                    });
            service.auth("F2", "ignored", 1);
        }
    }

    @Test
    @DisplayName("auth(prod) - non-zero return code should throw BusinessException")
    void auth_prod_fail() throws Exception {
        setEnv("prod");
        when(apiUrl.getWorkflow()).thenReturn("http://wf");
        when(apiUrl.getTenantKey()).thenReturn("tk");
        when(apiUrl.getTenantSecret()).thenReturn("ts");
        when(apiUrl.getTenantId()).thenReturn("tid");

        try (MockedStatic<OkHttpUtil> http = mockStatic(OkHttpUtil.class)) {
            http.when(() -> OkHttpUtil.post(anyString(), anyMap(), anyString()))
                    .thenReturn(fail("auth-err"));

            assertThatThrownBy(() -> service.auth("F3", "APP", 1))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("auth-err");
        }
    }

    // ================== upload file(s) ==================

    @Test
    @DisplayName("uploadFile - success: return data.url and assemble necessary headers")
    void uploadFile_success() throws Exception {
        when(apiUrl.getWorkflow()).thenReturn("http://wf");
        when(apiUrl.getTenantId()).thenReturn("tid");

        MultipartFile file = mockFile("a.png", "PNG".getBytes(StandardCharsets.UTF_8));

        try (MockedStatic<OkHttpUtil> http = mockStatic(OkHttpUtil.class)) {
            http.when(() -> OkHttpUtil.postMultipart(anyString(), anyMap(), isNull(), anyMap()))
                .thenAnswer(inv -> {
                    String url = inv.getArgument(0);
                    Map<String, String> header = inv.getArgument(1);
                    Map<String, Object> param = inv.getArgument(3);
                    assertThat(url).isEqualTo("http://wf" + CoreSystemService.UPLOAD_FILE_PATH);
                    assertThat(header).containsEntry(CoreSystemService.X_CONSUMER_USERNAME, "tid");
                    assertThat(header).containsEntry("Content-Type", "multipart/form-data");
                    assertThat(param).containsKey("file");
                    return ok(new HashMap<String, Object>() {{
                        put("url", "http://cdn/u.png");
                    }});
                });

            String ret = service.uploadFile(file, "ak", "sk");
            assertThat(ret).isEqualTo("http://cdn/u.png");
        }
    }

    @Test
    @DisplayName("uploadFile - non-zero return code should throw BusinessException")
    void uploadFile_fail_code() throws Exception {
        when(apiUrl.getWorkflow()).thenReturn("http://wf");
        when(apiUrl.getTenantId()).thenReturn("tid");

        MultipartFile file = mockFile("a.png", "x".getBytes());

        try (MockedStatic<OkHttpUtil> http = mockStatic(OkHttpUtil.class)) {
            http.when(() -> OkHttpUtil.postMultipart(anyString(), anyMap(), isNull(), anyMap()))
                .thenReturn(fail("upload-err"));

            assertThatThrownBy(() -> service.uploadFile(file, "ak", "sk"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("upload-err");
        }
    }

    @Test
    @DisplayName("uploadFile - HTTP exception should be wrapped as BusinessException")
    void uploadFile_httpException() throws Exception {
        when(apiUrl.getWorkflow()).thenReturn("http://wf");
        when(apiUrl.getTenantId()).thenReturn("tid");

        MultipartFile file = mockFile("a.png", "x".getBytes());

        try (MockedStatic<OkHttpUtil> http = mockStatic(OkHttpUtil.class)) {
            http.when(() -> OkHttpUtil.postMultipart(anyString(), anyMap(), isNull(), anyMap()))
                .thenThrow(new IOException("io down"));

            assertThatThrownBy(() -> service.uploadFile(file, "ak", "sk"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("io down");
        }
    }

    @Test
    @DisplayName("batchUploadFile - success: return data.urls[]")
    void batchUploadFile_success() throws Exception {
        when(apiUrl.getWorkflow()).thenReturn("http://wf");
        when(apiUrl.getTenantId()).thenReturn("tid");

        MultipartFile[] files = new MultipartFile[]{
                mockFile("a.txt", "a".getBytes()), mockFile("b.txt", "b".getBytes())
        };

        try (MockedStatic<OkHttpUtil> http = mockStatic(OkHttpUtil.class)) {
            http.when(() -> OkHttpUtil.postMultipart(anyString(), anyMap(), isNull(), anyMap()))
                .thenAnswer(inv -> ok(new HashMap<String, Object>() {{
                    put("urls", Arrays.asList("u1", "u2"));
                }}));

            List<String> urls = service.batchUploadFile(files, "ak", "sk");
            assertThat(urls).containsExactly("u1", "u2");
        }
    }

    @Test
    @DisplayName("batchUploadFile - non-zero return code should throw BusinessException")
    void batchUploadFile_fail_code() throws Exception {
        when(apiUrl.getWorkflow()).thenReturn("http://wf");
        when(apiUrl.getTenantId()).thenReturn("tid");

        try (MockedStatic<OkHttpUtil> http = mockStatic(OkHttpUtil.class)) {
            http.when(() -> OkHttpUtil.postMultipart(anyString(), anyMap(), isNull(), anyMap()))
                .thenReturn(fail("bad"));

            assertThatThrownBy(() -> service.batchUploadFile(new MultipartFile[]{}, "ak", "sk"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("bad");
        }
    }

    // ================== header signature ==================

    @Test
    @DisplayName("assembleRequestHeader - normal: should generate authorization/host/date/digest")
    void assembleRequestHeader_success() {
        Map<String, String> h = service.assembleRequestHeader(
                "http://host:8080/path", "ak", "sk", "POST", "abc".getBytes(StandardCharsets.UTF_8));

        assertThat(h).containsKeys("authorization", "host", "date", "digest");
        assertThat(h.get("authorization"))
                .contains("api_key=\"ak\"")
                .contains("algorithm=\"hmac-sha256\"");
        assertThat(h.get("host")).isEqualTo("host:8080");
        assertThat(h.get("digest")).startsWith("SHA256=");
    }

    @Test
    @DisplayName("assembleRequestHeader - invalid URL should throw BusinessException")
    void assembleRequestHeader_badUrl() {
        assertThatThrownBy(() -> service.assembleRequestHeader("::::", "ak", "sk", "POST", "x".getBytes()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("assemble requestHeader  error");
    }

    // ================== compare add/delete ==================

    @Test
    @DisplayName("addComparisons - success")
    void addComparisons_success() {
        when(apiUrl.getWorkflow()).thenReturn("http://wf");

        try (MockedStatic<OkHttpUtil> http = mockStatic(OkHttpUtil.class)) {
            http.when(() -> OkHttpUtil.post(eq("http://wf" + CoreSystemService.ADD_COMPARISONS_PATH), anyString()))
                .thenReturn(ok(null));

            service.addComparisons(new FlowProtocol(), "F10", "v1");
        }
    }

    @Test
    @DisplayName("addComparisons - non-zero return code should throw BusinessException")
    void addComparisons_fail() {
        when(apiUrl.getWorkflow()).thenReturn("http://wf");

        try (MockedStatic<OkHttpUtil> http = mockStatic(OkHttpUtil.class)) {
            http.when(() -> OkHttpUtil.post(anyString(), anyString()))
                .thenReturn(fail("add-err"));

            assertThatThrownBy(() -> service.addComparisons(new FlowProtocol(), "F10", "v1"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("add-err");
        }
    }

    @Test
    @DisplayName("deleteComparisons - success")
    void deleteComparisons_success() {
        when(apiUrl.getWorkflow()).thenReturn("http://wf");

        try (MockedStatic<OkHttpUtil> http = mockStatic(OkHttpUtil.class)) {
            http.when(() -> OkHttpUtil.delete(eq("http://wf" + CoreSystemService.DELETE_COMPARISONS_PATH), anyString()))
                .thenReturn(ok(null));

            service.deleteComparisons("F10", "v1");
        }
    }

    @Test
    @DisplayName("deleteComparisons - non-zero return code should throw BusinessException")
    void deleteComparisons_fail() {
        when(apiUrl.getWorkflow()).thenReturn("http://wf");

        try (MockedStatic<OkHttpUtil> http = mockStatic(OkHttpUtil.class)) {
            http.when(() -> OkHttpUtil.delete(anyString(), anyString()))
                .thenReturn(fail("del-err"));

            assertThatThrownBy(() -> service.deleteComparisons("F10", "v1"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("del-err");
        }
    }

    // ================== SparkDB create/DDL/DML ==================

    @Test
    @DisplayName("createDatabase - success returns database_id")
    void createDatabase_success() {
        when(apiUrl.getSparkDB()).thenReturn("http://db");
        when(apiUrl.getTenantId()).thenReturn("tid");

        try (MockedStatic<OkHttpUtil> http = mockStatic(OkHttpUtil.class)) {
            http.when(() -> OkHttpUtil.post(eq("http://db" + CoreSystemService.CREATE_DATABASE_PATH), anyMap(), anyString()))
                    .thenReturn(ok(new HashMap<String, Object>() {{
                        put("database_id", 3_000_000_000L);
                    }}));

            Long id = service.createDatabase("n", "u", 1L, "d");
            assertThat(id).isEqualTo(3_000_000_000L);
        }
    }

    @Test
    @DisplayName("execDDL - success (just needs to not throw exception)")
    void execDDL_success() {
        when(apiUrl.getSparkDB()).thenReturn("http://db");
        when(apiUrl.getTenantId()).thenReturn("tid");

        try (MockedStatic<OkHttpUtil> http = mockStatic(OkHttpUtil.class)) {
            http.when(() -> OkHttpUtil.post(eq("http://db" + CoreSystemService.EXEC_DDL_PATH), anyMap(), anyString()))
                .thenReturn(ok(null));

            service.execDDL("create table t(a int)", "u", null, 11L);
        }
    }

    @Nested
    class ExecDmlTests {

        @Test
        @DisplayName("execDML - other operation types: should return null")
        void execDml_otherOp_returnsNull() {
            when(apiUrl.getSparkDB()).thenReturn("http://db");
            when(apiUrl.getTenantId()).thenReturn("tid");
            when(commonConfig.getAppId()).thenReturn("APP");

            try (MockedStatic<OkHttpUtil> http = mockStatic(OkHttpUtil.class)) {
                http.when(() -> OkHttpUtil.post(anyString(), anyMap(), anyString()))
                        .thenReturn(ok(Collections.singletonMap("exec_success", "[]")));

                //              sql               uid  dbId  spaceId opType envCode(✅changed to valid value 1)
                Object ret = service.execDML("update t set a=1", "u", null, 1L, 999, 1);
                assertThat(ret).isNull();
            }
        }

        @Test
        @DisplayName("execDML - parse exception should be wrapped as BusinessException (with fixed prefix)")
        void execDml_parseError_shouldWrap() {
            when(apiUrl.getSparkDB()).thenReturn("http://db");
            when(apiUrl.getTenantId()).thenReturn("tid");
            when(commonConfig.getAppId()).thenReturn("APP");

            // Invalid exec_success string, triggers parse exception
            Map<String, Object> data = new HashMap<>();
            data.put("exec_success", "not-json");

            try (MockedStatic<OkHttpUtil> http = mockStatic(OkHttpUtil.class)) {
                http.when(() -> OkHttpUtil.post(anyString(), anyMap(), anyString()))
                    .thenReturn(ok(data));

                // Use SELECT operation type to trigger the parsing logic that will fail
                assertThatThrownBy(() -> service.execDML("select *", "u", null, 1L, DBOperateEnum.SELECT.getCode(), 1))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("exec dml get search_data error = ,");
            }
        }
    }

    // ================== clone/drop/modify DB ==================

    @Test
    @DisplayName("cloneDataBase - success returns database_id")
    void cloneDatabase_success() {
        when(apiUrl.getSparkDB()).thenReturn("http://db");
        when(apiUrl.getTenantId()).thenReturn("tid");

        try (MockedStatic<OkHttpUtil> http = mockStatic(OkHttpUtil.class)) {
            http.when(() -> OkHttpUtil.post(eq("http://db" + CoreSystemService.CLONE_DATABASE_PATH), anyMap(), anyString()))
                    // Key: using long beyond int range, Fastjson2 will deserialize as Long
                    .thenReturn(ok(new HashMap<String, Object>() {{
                        put("database_id", 3_000_000_001L);
                    }}));

            Long id = service.cloneDataBase(9L, "db_new", "u");
            assertThat(id).isEqualTo(3_000_000_001L);
        }
    }

    @Test
    @DisplayName("cloneDataBase - HTTP exception should be wrapped as BusinessException")
    void cloneDatabase_httpException() {
        when(apiUrl.getSparkDB()).thenReturn("http://db");
        when(apiUrl.getTenantId()).thenReturn("tid");

        try (MockedStatic<OkHttpUtil> http = mockStatic(OkHttpUtil.class)) {
            http.when(() -> OkHttpUtil.post(anyString(), anyMap(), anyString()))
                .thenThrow(new RuntimeException("net"));

            assertThatThrownBy(() -> service.cloneDataBase(1L, "x", "u"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("net");
        }
    }

    @Test
    @DisplayName("dropDataBase - success (just needs to not throw exception)")
    void dropDatabase_success() {
        when(apiUrl.getSparkDB()).thenReturn("http://db");
        when(apiUrl.getTenantId()).thenReturn("tid");

        try (MockedStatic<OkHttpUtil> http = mockStatic(OkHttpUtil.class)) {
            http.when(() -> OkHttpUtil.post(eq("http://db" + CoreSystemService.DROP_DATABASE_PATH), anyMap(), anyString()))
                .thenReturn(ok(null));

            service.dropDataBase(3L, "u");
        }
    }

    @Test
    @DisplayName("dropDataBase - HTTP exception should be wrapped as BusinessException")
    void dropDatabase_httpException() {
        when(apiUrl.getSparkDB()).thenReturn("http://db");
        when(apiUrl.getTenantId()).thenReturn("tid");

        try (MockedStatic<OkHttpUtil> http = mockStatic(OkHttpUtil.class)) {
            http.when(() -> OkHttpUtil.post(anyString(), anyMap(), anyString()))
                .thenThrow(new RuntimeException("io"));

            assertThatThrownBy(() -> service.dropDataBase(3L, "u"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("io");
        }
    }

    @Test
    @DisplayName("modifyDataBase - success (just needs to not throw exception)")
    void modifyDatabase_success() {
        when(apiUrl.getSparkDB()).thenReturn("http://db");
        when(apiUrl.getTenantId()).thenReturn("tid");

        try (MockedStatic<OkHttpUtil> http = mockStatic(OkHttpUtil.class)) {
            http.when(() -> OkHttpUtil.post(eq("http://db" + CoreSystemService.MODIFY_DATABASE_PATH), anyMap(), anyString()))
                .thenReturn(ok(null));

            service.modifyDataBase(3L, "u", "desc");
        }
    }

    @Test
    @DisplayName("modifyDataBase - HTTP exception should be wrapped as BusinessException")
    void modifyDatabase_httpException() {
        when(apiUrl.getSparkDB()).thenReturn("http://db");
        when(apiUrl.getTenantId()).thenReturn("tid");

        try (MockedStatic<OkHttpUtil> http = mockStatic(OkHttpUtil.class)) {
            http.when(() -> OkHttpUtil.post(anyString(), anyMap(), anyString()))
                .thenThrow(new RuntimeException("io"));

            assertThatThrownBy(() -> service.modifyDataBase(3L, "u", "d"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("io");
        }
    }
}
