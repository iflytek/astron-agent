package com.iflytek.astron.console.toolkit.service.tool;

import cn.hutool.core.codec.Base64;
import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.toolkit.config.properties.BizConfig;
import com.iflytek.astron.console.toolkit.config.properties.CommonConfig;
import com.iflytek.astron.console.toolkit.entity.table.tool.ToolBox;
import com.iflytek.astron.console.toolkit.entity.tool.AgentToolDefinition;
import com.iflytek.astron.console.toolkit.entity.tool.Text;
import com.iflytek.astron.console.toolkit.entity.tool.ToolHeader;
import com.iflytek.astron.console.toolkit.entity.tool.ToolPayload;
import com.iflytek.astron.console.toolkit.entity.tool.ToolProtocolDto;
import com.iflytek.astron.console.toolkit.handler.ToolServiceCallHandler;
import com.iflytek.astron.console.toolkit.mapper.tool.ToolBoxMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AgentToolRuntimeServiceTest {

    private static final String WEB_SCHEMA = "{\"toolRequestInput\":["
            + "{\"name\":\"city\",\"type\":\"string\",\"description\":\"city name\",\"from\":0,"
            + "\"required\":true,\"location\":\"query\"},"
            + "{\"name\":\"id\",\"type\":\"string\",\"from\":0,\"location\":\"path\"},"
            + "{\"name\":\"token\",\"type\":\"string\",\"from\":1,\"default\":\"secret\",\"location\":\"header\"},"
            + "{\"name\":\"filter\",\"type\":\"object\",\"location\":\"body\",\"children\":["
            + "{\"name\":\"keyword\",\"type\":\"string\",\"from\":0,\"location\":\"body\"}]}"
            + "]}";

    private ToolBox sampleToolBox() {
        ToolBox toolBox = new ToolBox();
        toolBox.setToolId("tool@abc");
        toolBox.setName("Weather");
        toolBox.setDescription("Query weather");
        toolBox.setUserId("99");
        toolBox.setOperationId("getWeather");
        toolBox.setVersion("V2.0");
        toolBox.setWebSchema(WEB_SCHEMA);
        return toolBox;
    }

    private AgentToolRuntimeService newService(ToolBoxMapper mapper, ToolServiceCallHandler handler) {
        CommonConfig commonConfig = new CommonConfig();
        commonConfig.setAppId("app-123");
        BizConfig bizConfig = new BizConfig();
        bizConfig.setAdminUid("1");
        return new AgentToolRuntimeService(mapper, commonConfig, bizConfig, handler);
    }

    @Test
    void resolveTools_exposesOnlyModelVisibleParams() {
        ToolBoxMapper mapper = mock(ToolBoxMapper.class);
        when(mapper.getToolsLastVersion(anyList())).thenReturn(List.of(sampleToolBox()));

        List<AgentToolDefinition> defs =
                newService(mapper, mock(ToolServiceCallHandler.class)).resolveTools(List.of("tool@abc"));

        assertThat(defs).hasSize(1);
        AgentToolDefinition def = defs.get(0);
        assertThat(def.getFunctionName()).isEqualTo("getWeather");
        assertThat(def.getToolId()).isEqualTo("tool@abc");

        JSONObject schema = JSON.parseObject(def.getInputSchema());
        JSONObject properties = schema.getJSONObject("properties");
        // model-visible query/path params + nested model-visible body leaf are flattened in
        assertThat(properties.keySet()).containsExactlyInAnyOrder("city", "id", "keyword");
        // business-passthrough header param is hidden from the model
        assertThat(properties.containsKey("token")).isFalse();
        assertThat(schema.getJSONArray("required")).containsExactly("city");
    }

    @Test
    void runTool_routesModelArgsAndBusinessDefaults() {
        ToolBoxMapper mapper = mock(ToolBoxMapper.class);
        when(mapper.getToolsLastVersion(anyList())).thenReturn(List.of(sampleToolBox()));
        ToolServiceCallHandler handler = mock(ToolServiceCallHandler.class);

        ArgumentCaptor<ToolProtocolDto> captor = ArgumentCaptor.forClass(ToolProtocolDto.class);
        when(handler.toolRun(any())).thenReturn(successResponse("sunny"));

        AgentToolRuntimeService service = newService(mapper, handler);
        AgentToolDefinition def = service.resolveTools(List.of("tool@abc")).get(0);

        JSONObject args = new JSONObject().fluentPut("city", "Beijing")
                .fluentPut("keyword", "rain")
                .fluentPut("id", "42");
        String result = service.runTool(def, args);
        assertThat(result).isEqualTo("sunny");

        org.mockito.Mockito.verify(handler).toolRun(captor.capture());
        ToolProtocolDto request = captor.getValue();
        assertThat(request.getHeader().getAppId()).isEqualTo("app-123");
        assertThat(request.getHeader().getUid()).isEqualTo("99");
        assertThat(request.getParameter().getToolId()).isEqualTo("tool@abc");
        assertThat(request.getParameter().getOperationId()).isEqualTo("getWeather");
        // C1: the resolved latest version is forwarded so core-link picks the matching schema
        assertThat(request.getParameter().getVersion()).isEqualTo("V2.0");

        JSONObject query = decode(request.getPayload().getMessage().getQuery());
        JSONObject header = decode(request.getPayload().getMessage().getHeader());
        JSONObject body = decode(request.getPayload().getMessage().getBody());
        JSONObject path = decode(request.getPayload().getMessage().getPath());
        assertThat(query.getString("city")).isEqualTo("Beijing");
        assertThat(header.getString("token")).isEqualTo("secret");
        assertThat(body.getJSONObject("filter").getString("keyword")).isEqualTo("rain");
        // I1: path-location params go to message.path, not query
        assertThat(path.getString("id")).isEqualTo("42");
        assertThat(query.containsKey("id")).isFalse();
    }

    @Test
    void checkToolsAccessible_allowsPublicOwnAndSameSpace_rejectsOthers() {
        ToolBoxMapper mapper = mock(ToolBoxMapper.class);
        AgentToolRuntimeService service = newService(mapper, mock(ToolServiceCallHandler.class));

        ToolBox pub = box("tool@pub", "1000", true, 7L);
        ToolBox own = box("tool@own", "me", false, 7L);
        ToolBox space = box("tool@space", "1000", false, 7L);
        ToolBox official = box("tool@official", "1", false, 99L); // owned by admin (adminUid=1)
        ToolBox foreign = box("tool@foreign", "1000", false, 99L);
        when(mapper.getToolsLastVersion(anyList()))
                .thenReturn(List.of(pub, own, space, official, foreign));

        assertThat(service.checkToolsAccessible("me", 7L,
                List.of("tool@pub", "tool@own", "tool@space", "tool@official"))).isTrue();
        // a private tool owned by someone else in another space is rejected
        assertThat(service.checkToolsAccessible("me", 7L, List.of("tool@foreign"))).isFalse();
        // an unknown tool id is rejected
        assertThat(service.checkToolsAccessible("me", 7L, List.of("tool@missing"))).isFalse();
        // empty list is trivially accessible
        assertThat(service.checkToolsAccessible("me", 7L, List.of())).isTrue();
    }

    private ToolBox box(String toolId, String userId, boolean isPublic, Long spaceId) {
        ToolBox toolBox = new ToolBox();
        toolBox.setToolId(toolId);
        toolBox.setUserId(userId);
        toolBox.setIsPublic(isPublic);
        toolBox.setSpaceId(spaceId);
        return toolBox;
    }

    @Test
    void resolveTools_returnsEmptyWhenNoToolsFound() {
        ToolBoxMapper mapper = mock(ToolBoxMapper.class);
        when(mapper.getToolsLastVersion(anyList())).thenReturn(List.of());
        assertThat(newService(mapper, mock(ToolServiceCallHandler.class)).resolveTools(List.of("tool@x")))
                .isEmpty();
    }

    private JSONObject decode(String base64) {
        return JSON.parseObject(Base64.decodeStr(base64));
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
