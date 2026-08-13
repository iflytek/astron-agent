package com.iflytek.astron.console.toolkit.service.extra;

import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.toolkit.config.properties.ApiUrl;
import com.iflytek.astron.console.toolkit.util.OkHttpUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mockStatic;

class CoreSystemServiceComparisonTest {

    private CoreSystemService coreSystemService;

    @BeforeEach
    void setUp() {
        coreSystemService = new CoreSystemService();
        ApiUrl apiUrl = new ApiUrl();
        apiUrl.setWorkflow("http://core");
        ReflectionTestUtils.setField(coreSystemService, "apiUrl", apiUrl);
    }

    @Test
    void getComparisonReturnsExactProtocolData() {
        try (MockedStatic<OkHttpUtil> okHttp = mockStatic(OkHttpUtil.class)) {
            okHttp.when(() -> OkHttpUtil.post(
                    "http://core/workflow/v1/protocol/compare/get",
                    "{\"flow_id\":\"flow-1\",\"version\":\"cmp-1\"}"))
                    .thenReturn("{\"code\":0,\"message\":\"success\","
                            + "\"data\":{\"data\":{\"nodes\":[],\"edges\":[]}}}");

            JSONObject snapshot = coreSystemService.getComparison("flow-1", "cmp-1");

            assertThat(snapshot.getJSONObject("data").getJSONArray("nodes")).isEmpty();
        }
    }

    @Test
    void getComparisonFailsClosedForMissingOrInvalidData() {
        try (MockedStatic<OkHttpUtil> okHttp = mockStatic(OkHttpUtil.class)) {
            okHttp.when(() -> OkHttpUtil.post(
                    "http://core/workflow/v1/protocol/compare/get",
                    "{\"flow_id\":\"flow-1\",\"version\":\"missing\"}"))
                    .thenReturn("{\"code\":1001,\"message\":\"not found\"}");

            assertThatThrownBy(() -> coreSystemService.getComparison("flow-1", "missing"))
                    .isInstanceOf(BusinessException.class);
        }
    }
}
