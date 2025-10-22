package com.iflytek.astron.console.toolkit.service.common;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.iflytek.astron.console.toolkit.entity.table.ConfigInfo;
import com.iflytek.astron.console.toolkit.mapper.ConfigInfoMapper;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for ConfigInfoService.
 */
@ExtendWith(MockitoExtension.class)
class ConfigInfoServiceTest {

    @Mock
    private ConfigInfoMapper configInfoMapper; // Will be injected into ServiceImpl#baseMapper by @InjectMocks

    // Use Spy so we can stub ServiceImpl#list / #getOne while keeping real method names for verify
    @Spy
    @InjectMocks
    private ConfigInfoService service;

    @BeforeEach
    void wireBaseMapper() throws NoSuchFieldException, IllegalAccessException {
        Field f = ServiceImpl.class.getDeclaredField("baseMapper");
        f.setAccessible(true);
        f.set(service, configInfoMapper);
    }

    // ---------- Helpers ----------

    /** Set env field via reflection (@Value injection not available in unit tests) */
    private void setEnv(String env) throws Exception {
        Field f = ConfigInfoService.class.getDeclaredField("env");
        f.setAccessible(true);
        f.set(service, env);
    }

    /**
     * Read MyBatis-Plus Wrapper last("...") content via reflection (for verifying getOnly limit 1
     * behavior)
     */
    private static String readLastSql(Object wrapper) {
        // lastSql field defined somewhere in AbstractWrapper level (SharedString), search along inheritance
        // chain here
        Class<?> c = wrapper.getClass();
        while (c != null) {
            try {
                Field f = c.getDeclaredField("lastSql");
                f.setAccessible(true);
                Object shared = f.get(wrapper);
                return shared == null ? null : shared.toString();
            } catch (NoSuchFieldException ignore) {
                c = c.getSuperclass();
            } catch (IllegalAccessException e) {
                return null;
            }
        }
        return null;
    }

    // ---------- getOnly(...) ----------

    @Test
    @DisplayName("getOnly(QueryWrapper) - Should append limit 1 and call getOne")
    void getOnly_withQueryWrapper_shouldAppendLimitAndCallGetOne() {
        QueryWrapper<ConfigInfo> qw = new QueryWrapper<>();
        ConfigInfo expected = new ConfigInfo();

        // Stub ServiceImpl#getOne, return expected value and verify last(...)
        doAnswer(inv -> {
            Object arg = inv.getArgument(0);
            assertThat(arg).isInstanceOf(QueryWrapper.class);
            String last = readLastSql(arg);
            // last may contain leading/trailing spaces, do lenient verification here
            assertThat(last).isNotNull().containsIgnoringCase("limit 1");
            return expected;
        }).when(service).getOne(any(QueryWrapper.class));

        ConfigInfo out = service.getOnly(qw);

        assertThat(out).isSameAs(expected);
        verify(service, times(1)).getOne(any(QueryWrapper.class));
    }

    @Test
    @DisplayName("getOnly(LambdaQueryWrapper) - Should append limit 1 and call getOne")
    void getOnly_withLambdaWrapper_shouldAppendLimitAndCallGetOne() {
        LambdaQueryWrapper<ConfigInfo> lw = new QueryWrapper<ConfigInfo>().lambda();
        ConfigInfo expected = new ConfigInfo();

        doAnswer(inv -> {
            Object arg = inv.getArgument(0);
            assertThat(arg).isInstanceOf(LambdaQueryWrapper.class);
            String last = readLastSql(arg);
            assertThat(last).isNotNull().containsIgnoringCase("limit 1");
            return expected;
        }).when(service).getOne(any(LambdaQueryWrapper.class));

        ConfigInfo out = service.getOnly(lw);
        assertThat(out).isSameAs(expected);
        verify(service).getOne(any(LambdaQueryWrapper.class));
    }

    @Test
    @DisplayName("getOnly(QueryWrapper) - Should propagate exception when getOne throws error")
    void getOnly_shouldPropagateException() {
        QueryWrapper<ConfigInfo> qw = new QueryWrapper<>();
        doThrow(new IllegalStateException("db down")).when(service).getOne(any(QueryWrapper.class));

        assertThatThrownBy(() -> service.getOnly(qw))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("db down");
    }

    // ---------- getTags(flag) ----------

    @Nested
    class GetTagsTests {

        @Test
        @DisplayName("getTags(tool) - Should call Mapper.TAG/TOOL_TAGS and return result")
        void getTags_tool_shouldDelegateToMapper() throws Exception {
            setEnv("prod");
            List<ConfigInfo> rows = Arrays.asList(new ConfigInfo(), new ConfigInfo());
            when(configInfoMapper.getTags("TAG", "TOOL_TAGS")).thenReturn(rows);

            List<ConfigInfo> out = service.getTags("tool");

            assertThat(out).isSameAs(rows);
            verify(configInfoMapper).getTags("TAG", "TOOL_TAGS");
            verifyNoMoreInteractions(configInfoMapper);
        }

        @Test
        @DisplayName("getTags(bot) - Should call Mapper.TAG/BOT_TAGS and return result")
        void getTags_bot_shouldDelegateToMapper() throws Exception {
            setEnv("test");
            List<ConfigInfo> rows = Collections.singletonList(new ConfigInfo());
            when(configInfoMapper.getTags("TAG", "BOT_TAGS")).thenReturn(rows);

            List<ConfigInfo> out = service.getTags("bot");

            assertThat(out).isSameAs(rows);
            verify(configInfoMapper).getTags("TAG", "BOT_TAGS");
            verifyNoMoreInteractions(configInfoMapper);
        }

        @Test
        @DisplayName("getTags(tool_v2 & prod) - Should not modify id, return Mapper result directly")
        void getTags_toolV2_prod_shouldNotRewriteId() throws Exception {
            setEnv("prod");
            ConfigInfo a = new ConfigInfo();
            a.setId(1L);
            a.setRemarks("2");
            ConfigInfo b = new ConfigInfo();
            b.setId(3L);
            b.setRemarks("");
            List<ConfigInfo> rows = Arrays.asList(a, b);
            when(configInfoMapper.getTags("TAG", "TOOL_TAGS_V2")).thenReturn(rows);

            List<ConfigInfo> out = service.getTags("tool_v2");

            assertThat(out).isSameAs(rows);
            assertThat(a.getId()).isEqualTo(1L);
            assertThat(b.getId()).isEqualTo(3L);
            verify(configInfoMapper).getTags("TAG", "TOOL_TAGS_V2");
        }

        @Test
        @DisplayName("getTags(tool_v2 & dev/test) - Non-empty remarks should override with new id; empty remarks keep original value")
        void getTags_toolV2_dev_shouldRewriteIdFromRemarks() throws Exception {
            setEnv("dev"); // or test
            ConfigInfo a = new ConfigInfo();
            a.setId(1L);
            a.setRemarks("2");
            ConfigInfo b = new ConfigInfo();
            b.setId(3L);
            b.setRemarks("");
            List<ConfigInfo> rows = Arrays.asList(a, b);
            when(configInfoMapper.getTags("TAG", "TOOL_TAGS_V2")).thenReturn(rows);

            List<ConfigInfo> out = service.getTags("tool_v2");

            assertThat(out).isSameAs(rows);
            assertThat(a.getId()).isEqualTo(2L); // Override
            assertThat(b.getId()).isEqualTo(3L); // Keep original
            verify(configInfoMapper).getTags("TAG", "TOOL_TAGS_V2");
        }

        @Test
        @DisplayName("getTags(tool_v2 & dev) - remarks with non-numeric value should throw NumberFormatException")
        void getTags_toolV2_dev_shouldThrowOnInvalidRemarks() throws Exception {
            setEnv("dev");
            ConfigInfo a = new ConfigInfo();
            a.setId(1L);
            a.setRemarks("abc"); // Non-numeric
            when(configInfoMapper.getTags("TAG", "TOOL_TAGS_V2")).thenReturn(Collections.singletonList(a));

            assertThatThrownBy(() -> service.getTags("tool_v2"))
                    .isInstanceOf(NumberFormatException.class);
        }

        @Test
        @DisplayName("getTags(Unknown) - Should return empty list without calling Mapper")
        void getTags_unknown_shouldReturnEmptyAndNoMapperCall() throws Exception {
            setEnv("prod");
            List<ConfigInfo> out = service.getTags("unknown");

            assertThat(out).isEmpty();
            verifyNoInteractions(configInfoMapper);
        }
    }

    // ---------- getListByIds(List<String>) ----------

    @Test
    @DisplayName("getListByIds(null) - Should return empty list directly without calling list")
    void getListByIds_null_shouldReturnEmpty() {
        List<ConfigInfo> out = service.getListByIds(null);
        assertThat(out).isEmpty();
        verify(service, never()).list(any(LambdaQueryWrapper.class));
    }

    @Test
    @DisplayName("getListByIds(empty) - Should return empty list directly without calling list")
    void getListByIds_empty_shouldReturnEmpty() {
        List<ConfigInfo> out = service.getListByIds(Collections.emptyList());
        assertThat(out).isEmpty();
        verify(service, never()).list(any(LambdaQueryWrapper.class));
    }

    @Test
    @DisplayName("getListByIds - Non-empty list should construct wrapper and call list")
    void getListByIds_shouldBuildWrapper_andCallList() {
        List<ConfigInfo> expected = Arrays.asList(new ConfigInfo(), new ConfigInfo());
        // Stub ServiceImpl#list to return expected result and verify wrapper is not null
        doAnswer(inv -> {
            Object arg = inv.getArgument(0);
            assertThat(arg).isInstanceOf(LambdaQueryWrapper.class);
            return expected;
        }).when(service).list(any(LambdaQueryWrapper.class));

        List<ConfigInfo> out = service.getListByIds(Arrays.asList("1", "2", "3"));

        assertThat(out).isSameAs(expected);
        verify(service).list(any(LambdaQueryWrapper.class));
    }
}
