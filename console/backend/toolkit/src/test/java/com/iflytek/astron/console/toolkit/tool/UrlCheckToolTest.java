package com.iflytek.astron.console.toolkit.tool;

import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.toolkit.entity.table.ConfigInfo;
import com.iflytek.astron.console.toolkit.mapper.ConfigInfoMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;

import java.net.InetSocketAddress;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class UrlCheckToolTest {

    @Test
    void checkUrlRejectsLoopbackAddressDirectly() {
        UrlCheckTool tool = new UrlCheckTool(mockConfigMapper("", ""));

        assertThrows(BusinessException.class,
                () -> tool.checkUrl("http://127.0.0.1/internal"));
    }

    @Test
    void checkUrlRejectsPrivateAddressOutsideWhitelist() {
        UrlCheckTool tool = new UrlCheckTool(mockConfigMapper(
                "", "", "192.168.1.10"));

        assertThrows(BusinessException.class,
                () -> tool.checkUrl("http://169.254.169.254/latest/meta-data"));
    }

    @Test
    void checkUrlAllowsIpLiteralInWhitelist() {
        UrlCheckTool tool = new UrlCheckTool(mockConfigMapper(
                "", "127.0.0.0/8", "127.0.0.1"));

        assertDoesNotThrow(() -> tool.checkUrl("http://127.0.0.1/allowed"));
    }

    @Test
    void checkUrlAllowsIpLiteralInWhitelistCidr() {
        UrlCheckTool tool = new UrlCheckTool(mockConfigMapper(
                "", "127.0.0.0/8", "127.0.0.0/8"));

        assertDoesNotThrow(() -> tool.checkUrl("http://127.0.0.1/allowed"));
    }

    @Test
    void domainWhitelistDoesNotBypassRestrictedAddressPolicy() {
        UrlCheckTool tool = new UrlCheckTool(mockConfigMapper(
                "", "", "", "localhost"));

        assertThrows(BusinessException.class,
                () -> tool.checkUrl("http://localhost/internal"));
    }

    @Test
    void checkUrlDoesNotProbeUserControlledEndpoint() throws Exception {
        AtomicInteger requestCount = new AtomicInteger();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/allowed", exchange -> {
            requestCount.incrementAndGet();
            exchange.sendResponseHeaders(200, -1);
            exchange.close();
        });
        server.start();
        try {
            UrlCheckTool tool = new UrlCheckTool(mockConfigMapper(
                    "", "127.0.0.0/8", "127.0.0.1"));
            String url = "http://127.0.0.1:" + server.getAddress().getPort() + "/allowed";

            assertDoesNotThrow(() -> tool.checkUrl(url));
            assertEquals(0, requestCount.get());
        } finally {
            server.stop(0);
        }
    }

    @Test
    void checkUrlRejectsNonHttpProtocol() {
        UrlCheckTool tool = new UrlCheckTool(mockConfigMapper("", ""));

        assertThrows(BusinessException.class,
                () -> tool.checkUrl("file:///etc/passwd"));
    }

    @Test
    void checkUrlRejectsUserInfo() {
        UrlCheckTool tool = new UrlCheckTool(mockConfigMapper("", ""));

        assertThrows(BusinessException.class,
                () -> tool.checkUrl("http://user@example.org/path"));
    }

    private static ConfigInfoMapper mockConfigMapper(
            String ipBlackList, String segmentBlackList) {
        return mockConfigMapper(ipBlackList, segmentBlackList, "");
    }

    private static ConfigInfoMapper mockConfigMapper(
            String ipBlackList, String segmentBlackList, String ipWhiteList) {
        return mockConfigMapper(ipBlackList, segmentBlackList, ipWhiteList, "");
    }

    private static ConfigInfoMapper mockConfigMapper(String ipBlackList,
            String segmentBlackList,
            String ipWhiteList,
            String domainWhiteList) {
        ConfigInfoMapper mapper = mock(ConfigInfoMapper.class);
        when(mapper.getListByCategory("IP_BLACK_LIST"))
                .thenReturn(List.of(config(ipBlackList)));
        when(mapper.getListByCategory("NETWORK_SEGMENT_BLACK_LIST"))
                .thenReturn(List.of(config(segmentBlackList)));
        when(mapper.getListByCategory("DOMAIN_WHITE_LIST"))
                .thenReturn(domainWhiteList.isBlank()
                        ? Collections.emptyList()
                        : List.of(config(domainWhiteList)));
        when(mapper.getListByCategory("IP_WHITE_LIST"))
                .thenReturn(List.of(config(ipWhiteList)));
        return mapper;
    }

    private static ConfigInfo config(String value) {
        ConfigInfo config = new ConfigInfo();
        config.setValue(value);
        return config;
    }
}
