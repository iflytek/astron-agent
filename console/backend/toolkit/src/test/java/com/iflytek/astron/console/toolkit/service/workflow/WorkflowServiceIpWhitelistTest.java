package com.iflytek.astron.console.toolkit.service.workflow;

import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.BizWorkflowData;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.BizWorkflowNode;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.node.BizNodeData;
import com.iflytek.astron.console.toolkit.entity.table.ConfigInfo;
import com.iflytek.astron.console.toolkit.mapper.ConfigInfoMapper;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class WorkflowServiceIpWhitelistTest {

    @Test
    void workflowAllowsModelIpInWhitelist() {
        WorkflowService service = serviceWithIpRules("192.168.0.0/16", "192.168.60.12");

        assertDoesNotThrow(() -> validate(service, "http://192.168.60.12:5080"));
    }

    @Test
    void workflowRejectsModelIpOutsideWhitelist() {
        WorkflowService service = serviceWithIpRules("192.168.0.0/16", "192.168.60.12");

        assertThrows(BusinessException.class, () -> validate(service, "http://192.168.60.13:5080"));
    }

    @Test
    void workflowRejectsPrivateIpWhenBlacklistIsEmpty() {
        WorkflowService service = serviceWithIpRules("", "");

        assertThrows(BusinessException.class, () -> validate(service, "http://192.168.60.12:5080"));
    }

    private static WorkflowService serviceWithIpRules(String blacklist, String whitelist) {
        ConfigInfoMapper mapper = mock(ConfigInfoMapper.class);
        when(mapper.getListByCategory("NETWORK_SEGMENT_BLACK_LIST"))
                .thenReturn(List.of(config(blacklist)));
        when(mapper.getListByCategory("IP_WHITE_LIST"))
                .thenReturn(List.of(config(whitelist)));
        WorkflowService service = new WorkflowService();
        ReflectionTestUtils.setField(service, "configInfoMapper", mapper);
        return service;
    }

    private static void validate(WorkflowService service, String url) {
        JSONObject nodeParam = new JSONObject();
        nodeParam.put("url", url);
        BizNodeData nodeData = new BizNodeData();
        nodeData.setNodeParam(nodeParam);
        BizWorkflowNode node = new BizWorkflowNode();
        node.setId("http::test");
        node.setData(nodeData);
        BizWorkflowData workflowData = new BizWorkflowData();
        workflowData.setNodes(List.of(node));

        ReflectionTestUtils.invokeMethod(service, "validateSsrfForNodes", workflowData);
    }

    private static ConfigInfo config(String value) {
        ConfigInfo config = new ConfigInfo();
        config.setValue(value);
        return config;
    }
}
