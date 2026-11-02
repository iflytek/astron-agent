package com.iflytek.astron.console.toolkit.service.workflow;

import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.node.BizNodeData;
import com.iflytek.astron.console.toolkit.entity.vo.LLMInfoVo;
import com.iflytek.astron.console.toolkit.service.model.ModelService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class WorkflowModelProtocolTest {
    private WorkflowService workflowService;
    private ModelService modelService;

    @BeforeEach
    void setUp() {
        workflowService = new WorkflowService();
        modelService = mock(ModelService.class);
        ReflectionTestUtils.setField(workflowService, "modelService", modelService);
    }

    @ParameterizedTest
    @ValueSource(strings = {"openai", "anthropic", "google"})
    void modelNameDoesNotSelectTransport(String protocol) {
        LLMInfoVo model = new LLMInfoVo();
        model.setDomain("arbitrary-model-name");
        model.setProvider(protocol);

        assertThat((String) ReflectionTestUtils.invokeMethod(
                workflowService, "normalizeWorkflowModelSource", model)).isEqualTo(protocol);
    }

    @Test
    void absentProtocolUsesGenericDefaultWithoutGuessingModelName() {
        LLMInfoVo model = new LLMInfoVo();
        model.setDomain("claude-gemini-generalv3.5");

        assertThat((String) ReflectionTestUtils.invokeMethod(
                workflowService, "normalizeWorkflowModelSource", model)).isEqualTo("openai");
    }

    @Test
    void unsupportedTransportUsesGenericValidation() {
        assertThatThrownBy(() -> ModelService.normalizeModelProtocol("unsupported"))
                .isInstanceOf(BusinessException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"spark-llm", "agent"})
    void authorizedModelBindsMetadataWithoutPersistingCredentials(String nodeType) {
        BizNodeData data = nodeData();
        data.getNodeParam().put("modelId", 42L);
        data.getNodeParam().put("url", "https://untrusted.example/v1");
        data.getNodeParam().put("source", "untrusted");
        LLMInfoVo model = new LLMInfoVo();
        model.setProvider("anthropic");
        model.setDomain("configured-model");
        model.setUrl("https://configured.example/v1/messages");
        model.setApiKey("model-key");
        when(modelService.getRuntimeModelDetail(42L, "user", 7L)).thenReturn(model);

        inject(data, nodeType);

        verify(modelService).getRuntimeModelDetail(42L, "user", 7L);
        assertThat(data.getNodeParam()).doesNotContainKeys("apiKey", "apiSecret");
        assertThat(data.getNodeParam()).doesNotContainKey("apiSecret");
        assertThat(data.getNodeParam().getString("source")).isEqualTo("anthropic");
        JSONObject config = nodeType.equals("agent")
                ? data.getNodeParam().getJSONObject("modelConfig")
                : data.getNodeParam();
        assertThat(config.getString(nodeType.equals("agent") ? "api" : "url"))
                .isEqualTo(model.getUrl());
        assertThat(config.getString("domain")).isEqualTo("configured-model");
    }

    @Test
    void modelAccessFailureDoesNotFallBackToPlatformCredentials() {
        BizNodeData data = nodeData();
        data.getNodeParam().put("modelId", 42L);
        when(modelService.getRuntimeModelDetail(42L, "user", 7L))
                .thenThrow(new BusinessException(ResponseEnum.MODEL_NOT_EXIST));

        assertThatThrownBy(() -> inject(data, "spark-llm")).isInstanceOf(BusinessException.class);
        assertThat(data.getNodeParam()).doesNotContainKey("apiKey");
        assertThat(data.getNodeParam()).doesNotContainKey("apiSecret");
    }

    @Test
    void platformCredentialsStaySeparateFromUnconfiguredModels() {
        BizNodeData data = nodeData();
        inject(data, "spark-llm");
        assertThat(data.getNodeParam()).doesNotContainKey("apiKey");
        assertThat(data.getNodeParam()).doesNotContainKey("apiSecret");
        verifyNoInteractions(modelService);
    }

    @Test
    void nonModelNodesKeepTheirPlatformAuthentication() {
        BizNodeData data = nodeData();
        inject(data, "plugin");
        assertThat(data.getNodeParam().getString("apiKey")).isEqualTo("platform-key");
        assertThat(data.getNodeParam().getString("apiSecret")).isEqualTo("platform-secret");
        verifyNoInteractions(modelService);
    }

    private BizNodeData nodeData() {
        BizNodeData data = new BizNodeData();
        data.setNodeParam(new JSONObject());
        data.getNodeParam().put("apiKey", "platform-key");
        data.getNodeParam().put("apiSecret", "platform-secret");
        return data;
    }

    private void inject(BizNodeData data, String nodeType) {
        ReflectionTestUtils.invokeMethod(
                workflowService, "injectModelRuntimeConfig", data, nodeType, "user", 7L);
    }
}
