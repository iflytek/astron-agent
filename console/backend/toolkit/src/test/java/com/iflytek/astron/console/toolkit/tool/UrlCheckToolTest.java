package com.iflytek.astron.console.toolkit.tool;

import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.toolkit.entity.table.ConfigInfo;
import com.iflytek.astron.console.toolkit.mapper.ConfigInfoMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.net.InetSocketAddress;
import java.net.URL;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class UrlCheckToolTest {

    @Test
    void checkBlackListRejectsTemporaryRedirectToBlacklistedIp() throws Exception {
        ConfigInfoMapper mapper = mockConfigMapper("169.254.169.254", "");
        UrlCheckTool tool = new UrlCheckTool(mapper);
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/redirect", exchange -> {
            exchange.getResponseHeaders().set("Location", "http://169.254.169.254/latest/meta-data/");
            exchange.sendResponseHeaders(307, -1);
            exchange.close();
        });
        server.start();
        try {
            String url = "http://127.0.0.1:" + server.getAddress().getPort() + "/redirect";
            assertThrows(BusinessException.class, () -> tool.checkBlackList(url));
        } finally {
            server.stop(0);
        }
    }

    @Test
    void checkBlackListRejectsBlacklistedTargetAfterMultipleRedirects() {
        ConfigInfoMapper mapper = mockConfigMapper("169.254.169.254", "");
        UrlCheckTool tool = new RedirectingUrlCheckTool(mapper, Map.of(
                "http://example.com/start", "http://example.org/hop",
                "http://example.org/hop", "http://169.254.169.254/latest/meta-data/"));

        assertThrows(BusinessException.class, () -> tool.checkBlackList("http://example.com/start"));
    }

    @Test
    void checkUrlRejectsRedirectToNonHttpProtocol() throws Exception {
        ConfigInfoMapper mapper = mockConfigMapper("", "");
        UrlCheckTool tool = new UrlCheckTool(mapper);
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/redirect", exchange -> {
            exchange.getResponseHeaders().set("Location", "file:///etc/passwd");
            exchange.sendResponseHeaders(302, -1);
            exchange.close();
        });
        server.start();
        try {
            String url = "http://127.0.0.1:" + server.getAddress().getPort() + "/redirect";
            assertThrows(BusinessException.class, () -> tool.checkUrl(url));
        } finally {
            server.stop(0);
        }
    }

    @Test
    void checkUrlRejectsRedirectWithUserInfo() {
        ConfigInfoMapper mapper = mockConfigMapper("", "");
        UrlCheckTool tool = new RedirectingUrlCheckTool(mapper, Map.of(
                "http://example.com/start", "http://user@example.org/path"));

        assertThrows(BusinessException.class, () -> tool.checkUrl("http://example.com/start"));
    }

    @Test
    void checkUrlRejectsLoopbackAddressDirectly() {
        ConfigInfoMapper mapper = mockConfigMapper("", "");
        UrlCheckTool tool = new UrlCheckTool(mapper);

        assertThrows(BusinessException.class, () -> tool.checkUrl("http://127.0.0.1/internal"));
    }

    @Test
    void toSafeHttpUrlPreservesEncodedPathAndQuery() throws Exception {
        ConfigInfoMapper mapper = mockConfigMapper("", "");
        UrlCheckTool tool = new UrlCheckTool(mapper);
        Method method = UrlCheckTool.class.getDeclaredMethod("toSafeHttpUrl", String.class);
        method.setAccessible(true);

        URL safeUrl = (URL) method.invoke(tool, "https://example.com/a%20b?q=a%20b");

        assertEquals("https://example.com/a%20b?q=a%20b", safeUrl.toString());
    }

    private static ConfigInfoMapper mockConfigMapper(String ipBlackList, String segmentBlackList) {
        ConfigInfoMapper mapper = mock(ConfigInfoMapper.class);
        when(mapper.getListByCategory("IP_BLACK_LIST")).thenReturn(List.of(config(ipBlackList)));
        when(mapper.getListByCategory("NETWORK_SEGMENT_BLACK_LIST")).thenReturn(List.of(config(segmentBlackList)));
        when(mapper.getListByCategory("DOMAIN_WHITE_LIST")).thenReturn(Collections.emptyList());
        return mapper;
    }

    private static ConfigInfo config(String value) {
        ConfigInfo config = new ConfigInfo();
        config.setValue(value);
        return config;
    }

    private static final class RedirectingUrlCheckTool extends UrlCheckTool {
        private final Map<String, String> redirects;

        private RedirectingUrlCheckTool(ConfigInfoMapper configInfoMapper, Map<String, String> redirects) {
            super(configInfoMapper);
            this.redirects = redirects;
        }

        @Override
        public String getRedirectUrl(String url) {
            return redirects.getOrDefault(url, url);
        }
    }
}
