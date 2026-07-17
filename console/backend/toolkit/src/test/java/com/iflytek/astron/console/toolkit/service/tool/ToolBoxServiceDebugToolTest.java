package com.iflytek.astron.console.toolkit.service.tool;

import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.toolkit.common.constant.ToolConst;
import com.iflytek.astron.console.toolkit.config.properties.BizConfig;
import com.iflytek.astron.console.toolkit.entity.dto.ToolBoxDto;
import com.iflytek.astron.console.toolkit.entity.enumVo.ToolboxStatusEnum;
import com.iflytek.astron.console.toolkit.entity.table.tool.ToolBox;
import com.iflytek.astron.console.toolkit.entity.tool.Text;
import com.iflytek.astron.console.toolkit.entity.tool.ToolDebugRequest;
import com.iflytek.astron.console.toolkit.entity.tool.ToolHeader;
import com.iflytek.astron.console.toolkit.entity.tool.ToolPayload;
import com.iflytek.astron.console.toolkit.entity.tool.ToolProtocolDto;
import com.iflytek.astron.console.toolkit.handler.ToolServiceCallHandler;
import com.iflytek.astron.console.toolkit.handler.UserInfoManagerHandler;
import com.iflytek.astron.console.toolkit.mapper.tool.ToolBoxMapper;
import com.iflytek.astron.console.toolkit.mapper.tool.ToolBoxOperateHistoryMapper;
import com.iflytek.astron.console.toolkit.tool.UrlCheckTool;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.MockedStatic;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ToolBoxServiceDebugToolTest {

    private static final String INTERNAL_ENDPOINT =
            "http://core-aitools:18668/aitools/v1/image_generate";

    @Test
    void debugToolV2_allowsTrustedOfficialInternalEndpoint() {
        ToolBoxMapper toolBoxMapper = mock(ToolBoxMapper.class);
        ToolServiceCallHandler toolServiceCallHandler = mock(ToolServiceCallHandler.class);
        ToolBoxOperateHistoryMapper operateHistoryMapper = mock(ToolBoxOperateHistoryMapper.class);
        UrlCheckTool urlCheckTool = mock(UrlCheckTool.class);

        ToolBox toolBox = officialImageTool();
        when(toolBoxMapper.selectById(1L)).thenReturn(toolBox);
        doThrow(new BusinessException(ResponseEnum.TOOLBOX_URL_ILLEGAL))
                .when(urlCheckTool)
                .checkUrl(INTERNAL_ENDPOINT);

        ArgumentCaptor<ToolDebugRequest> requestCaptor =
                ArgumentCaptor.forClass(ToolDebugRequest.class);
        when(toolServiceCallHandler.toolDebug(requestCaptor.capture()))
                .thenReturn(successResponse("{\"code\":0,\"message\":\"ok\"}"));

        try (MockedStatic<UserInfoManagerHandler> userMock =
                mockStatic(UserInfoManagerHandler.class)) {
            userMock.when(UserInfoManagerHandler::getUserId).thenReturn("normal-user");

            Object result = newService(toolBoxMapper, toolServiceCallHandler,
                    operateHistoryMapper, urlCheckTool).debugToolV2(debugDto());

            assertThat(((JSONObject) result).getInteger("code")).isZero();
        }

        ToolDebugRequest request = requestCaptor.getValue();
        assertThat(request.getServer()).isEqualTo(INTERNAL_ENDPOINT);
        assertThat(request.getMethod()).isEqualTo("POST");
        assertThat(request.getBody().getString("prompt")).isEqualTo("生成一张小狗的图片");
        verify(urlCheckTool, never()).checkUrl(INTERNAL_ENDPOINT);
    }

    @Test
    void debugToolV2_allowsSeededOfficialInternalEndpointWhenOwnerIsNotAdminUid() {
        ToolBoxMapper toolBoxMapper = mock(ToolBoxMapper.class);
        ToolServiceCallHandler toolServiceCallHandler = mock(ToolServiceCallHandler.class);
        ToolBoxOperateHistoryMapper operateHistoryMapper = mock(ToolBoxOperateHistoryMapper.class);
        UrlCheckTool urlCheckTool = mock(UrlCheckTool.class);

        ToolBox toolBox = seededOfficialImageTool();
        when(toolBoxMapper.selectById(1L)).thenReturn(toolBox);
        doThrow(new BusinessException(ResponseEnum.TOOLBOX_URL_ILLEGAL))
                .when(urlCheckTool)
                .checkUrl(INTERNAL_ENDPOINT);

        when(toolServiceCallHandler.toolDebug(any()))
                .thenReturn(successResponse("{\"code\":0,\"message\":\"ok\"}"));

        try (MockedStatic<UserInfoManagerHandler> userMock =
                mockStatic(UserInfoManagerHandler.class)) {
            userMock.when(UserInfoManagerHandler::getUserId).thenReturn("normal-user");

            Object result = newService(toolBoxMapper, toolServiceCallHandler,
                    operateHistoryMapper, urlCheckTool).debugToolV2(debugDto());

            assertThat(((JSONObject) result).getInteger("code")).isZero();
        }

        verify(urlCheckTool, never()).checkUrl(INTERNAL_ENDPOINT);
    }

    @Test
    void debugToolV2_ignoresClientEndpointForTrustedOfficialTool() {
        ToolBoxMapper toolBoxMapper = mock(ToolBoxMapper.class);
        ToolServiceCallHandler toolServiceCallHandler = mock(ToolServiceCallHandler.class);
        ToolBoxOperateHistoryMapper operateHistoryMapper = mock(ToolBoxOperateHistoryMapper.class);
        UrlCheckTool urlCheckTool = mock(UrlCheckTool.class);

        when(toolBoxMapper.selectById(1L)).thenReturn(officialImageTool());

        ArgumentCaptor<ToolDebugRequest> requestCaptor =
                ArgumentCaptor.forClass(ToolDebugRequest.class);
        when(toolServiceCallHandler.toolDebug(requestCaptor.capture()))
                .thenReturn(successResponse("{\"code\":0,\"message\":\"ok\"}"));

        try (MockedStatic<UserInfoManagerHandler> userMock =
                mockStatic(UserInfoManagerHandler.class)) {
            userMock.when(UserInfoManagerHandler::getUserId).thenReturn("normal-user");

            newService(toolBoxMapper, toolServiceCallHandler,
                    operateHistoryMapper, urlCheckTool)
                    .debugToolV2(debugDto("https://attacker.example/evil"));
        }

        assertThat(requestCaptor.getValue().getServer()).isEqualTo(INTERNAL_ENDPOINT);
        verify(urlCheckTool, never()).checkUrl(any());
    }

    @Test
    void debugToolV2_keepsUrlValidationForUserPublishedPublicTool() {
        ToolBoxMapper toolBoxMapper = mock(ToolBoxMapper.class);
        ToolServiceCallHandler toolServiceCallHandler = mock(ToolServiceCallHandler.class);
        ToolBoxOperateHistoryMapper operateHistoryMapper = mock(ToolBoxOperateHistoryMapper.class);
        UrlCheckTool urlCheckTool = mock(UrlCheckTool.class);
        String publicUserEndpoint = "http://127.0.0.1/internal";

        when(toolBoxMapper.selectById(1L)).thenReturn(publicUserTool(publicUserEndpoint));
        doThrow(new BusinessException(ResponseEnum.TOOLBOX_URL_ILLEGAL))
                .when(urlCheckTool)
                .checkUrl(publicUserEndpoint);
        when(toolServiceCallHandler.toolDebug(any()))
                .thenReturn(successResponse("{\"code\":0,\"message\":\"ok\"}"));

        try (MockedStatic<UserInfoManagerHandler> userMock =
                mockStatic(UserInfoManagerHandler.class)) {
            userMock.when(UserInfoManagerHandler::getUserId).thenReturn("normal-user");

            assertThatThrownBy(() -> newService(toolBoxMapper, toolServiceCallHandler,
                    operateHistoryMapper, urlCheckTool)
                    .debugToolV2(debugDto(publicUserEndpoint)))
                    .isInstanceOf(BusinessException.class);
        }

        verify(urlCheckTool).checkUrl(publicUserEndpoint);
    }

    @Test
    void debugToolV2_keepsUrlValidationWhenOfficialOwnerDebugsOwnTool() {
        ToolBoxMapper toolBoxMapper = mock(ToolBoxMapper.class);
        ToolServiceCallHandler toolServiceCallHandler = mock(ToolServiceCallHandler.class);
        ToolBoxOperateHistoryMapper operateHistoryMapper = mock(ToolBoxOperateHistoryMapper.class);
        UrlCheckTool urlCheckTool = mock(UrlCheckTool.class);

        when(toolBoxMapper.selectById(1L)).thenReturn(officialImageTool());
        doThrow(new BusinessException(ResponseEnum.TOOLBOX_URL_ILLEGAL))
                .when(urlCheckTool)
                .checkUrl(INTERNAL_ENDPOINT);

        try (MockedStatic<UserInfoManagerHandler> userMock =
                mockStatic(UserInfoManagerHandler.class)) {
            userMock.when(UserInfoManagerHandler::getUserId).thenReturn("admin-user");

            assertThatThrownBy(() -> newService(toolBoxMapper, toolServiceCallHandler,
                    operateHistoryMapper, urlCheckTool).debugToolV2(debugDto()))
                    .isInstanceOf(BusinessException.class);
        }

        verify(urlCheckTool).checkUrl(INTERNAL_ENDPOINT);
    }

    @Test
    void debugToolV2_doesNotAllowHiddenOfficialParamsToBeOverridden() {
        ToolBoxMapper toolBoxMapper = mock(ToolBoxMapper.class);
        ToolServiceCallHandler toolServiceCallHandler = mock(ToolServiceCallHandler.class);
        ToolBoxOperateHistoryMapper operateHistoryMapper = mock(ToolBoxOperateHistoryMapper.class);
        UrlCheckTool urlCheckTool = mock(UrlCheckTool.class);

        ToolBox toolBox = officialImageTool();
        toolBox.setWebSchema(webSchemaWithHiddenHeader("server-secret"));
        when(toolBoxMapper.selectById(1L)).thenReturn(toolBox);

        ArgumentCaptor<ToolDebugRequest> requestCaptor =
                ArgumentCaptor.forClass(ToolDebugRequest.class);
        when(toolServiceCallHandler.toolDebug(requestCaptor.capture()))
                .thenReturn(successResponse("{\"code\":0,\"message\":\"ok\"}"));

        ToolBoxDto dto = debugDto();
        dto.setWebSchema(webSchemaWithHiddenHeader("client-secret"));

        try (MockedStatic<UserInfoManagerHandler> userMock =
                mockStatic(UserInfoManagerHandler.class)) {
            userMock.when(UserInfoManagerHandler::getUserId).thenReturn("normal-user");

            newService(toolBoxMapper, toolServiceCallHandler,
                    operateHistoryMapper, urlCheckTool).debugToolV2(dto);
        }

        assertThat(requestCaptor.getValue().getHeader().getString("api_key"))
                .isEqualTo("server-secret");
    }

    private ToolBoxService newService(ToolBoxMapper toolBoxMapper,
            ToolServiceCallHandler toolServiceCallHandler,
            ToolBoxOperateHistoryMapper operateHistoryMapper,
            UrlCheckTool urlCheckTool) {
        ToolBoxService service = new ToolBoxService();
        BizConfig bizConfig = new BizConfig();
        bizConfig.setAdminUid("admin-user");
        bizConfig.setTrustedToolOwnerUids(List.of("ccdd4277-2c77-4c36-b484-3935d5077ebf"));
        ReflectionTestUtils.setField(service, "bizConfig", bizConfig);
        ReflectionTestUtils.setField(service, "toolBoxMapper", toolBoxMapper);
        ReflectionTestUtils.setField(service, "toolServiceCallHandler", toolServiceCallHandler);
        ReflectionTestUtils.setField(service, "toolBoxOperateHistoryMapper", operateHistoryMapper);
        ReflectionTestUtils.setField(service, "urlCheckTool", urlCheckTool);
        return service;
    }

    private ToolBox officialImageTool() {
        ToolBox toolBox = new ToolBox();
        toolBox.setId(1L);
        toolBox.setName("文生图");
        toolBox.setDescription("根据输入的内容生成与内容有关的图片");
        toolBox.setUserId("admin-user");
        toolBox.setIsPublic(true);
        toolBox.setStatus(ToolboxStatusEnum.FORMAL.getCode());
        toolBox.setEndPoint(INTERNAL_ENDPOINT);
        toolBox.setMethod("post");
        toolBox.setAuthType(ToolConst.AuthType.NONE);
        toolBox.setWebSchema(webSchema());
        return toolBox;
    }

    private ToolBox publicUserTool(String endPoint) {
        ToolBox toolBox = officialImageTool();
        toolBox.setUserId("creator-user");
        toolBox.setEndPoint(endPoint);
        return toolBox;
    }

    private ToolBox seededOfficialImageTool() {
        ToolBox toolBox = officialImageTool();
        toolBox.setUserId("ccdd4277-2c77-4c36-b484-3935d5077ebf");
        toolBox.setSource(1);
        toolBox.setDisplaySource("1,2");
        toolBox.setStatus(1);
        return toolBox;
    }

    private ToolBoxDto debugDto() {
        return debugDto(INTERNAL_ENDPOINT);
    }

    private ToolBoxDto debugDto(String endPoint) {
        ToolBoxDto dto = new ToolBoxDto();
        dto.setId(1L);
        dto.setName("文生图");
        dto.setDescription("根据输入的内容生成与内容有关的图片");
        dto.setEndPoint(endPoint);
        dto.setMethod("post");
        dto.setAuthType(ToolConst.AuthType.NONE);
        dto.setWebSchema(webSchema());
        return dto;
    }

    private String webSchema() {
        return "{\"toolRequestInput\":["
                + "{\"name\":\"width\",\"description\":\"宽度\",\"type\":\"integer\","
                + "\"location\":\"body\",\"required\":true,\"default\":1024,\"open\":true},"
                + "{\"name\":\"height\",\"description\":\"高度\",\"type\":\"integer\","
                + "\"location\":\"body\",\"required\":true,\"default\":1024,\"open\":true},"
                + "{\"name\":\"prompt\",\"description\":\"图片描述信息\",\"type\":\"string\","
                + "\"location\":\"body\",\"required\":true,\"default\":\"生成一张小狗的图片\",\"open\":true}"
                + "],\"toolRequestOutput\":["
                + "{\"name\":\"code\",\"description\":\"状态码\",\"type\":\"integer\",\"open\":true},"
                + "{\"name\":\"message\",\"description\":\"操作消息\",\"type\":\"string\",\"open\":true}"
                + "]}";
    }

    private String webSchemaWithHiddenHeader(String secret) {
        return "{\"toolRequestInput\":["
                + "{\"name\":\"api_key\",\"description\":\"服务密钥\",\"type\":\"string\","
                + "\"location\":\"header\",\"required\":true,\"default\":\"" + secret
                + "\",\"open\":false},"
                + "{\"name\":\"prompt\",\"description\":\"图片描述信息\",\"type\":\"string\","
                + "\"location\":\"body\",\"required\":true,\"default\":\"生成一张小狗的图片\","
                + "\"open\":true}"
                + "],\"toolRequestOutput\":["
                + "{\"name\":\"code\",\"description\":\"状态码\",\"type\":\"integer\",\"open\":true}"
                + "]}";
    }

    private ToolProtocolDto successResponse(String text) {
        ToolProtocolDto response = new ToolProtocolDto();
        ToolHeader header = new ToolHeader();
        header.setCode(0);
        response.setHeader(header);
        ToolPayload payload = new ToolPayload();
        Text textObj = new Text();
        textObj.setText(text);
        payload.setText(textObj);
        response.setPayload(payload);
        return response;
    }
}
