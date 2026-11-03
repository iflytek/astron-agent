package com.iflytek.astron.console.toolkit.service.model;

import com.iflytek.astron.console.commons.entity.workflow.Workflow;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.toolkit.controller.model.WorkflowModelRuntimeController;
import com.iflytek.astron.console.toolkit.entity.table.model.Model;
import com.iflytek.astron.console.toolkit.mapper.model.ModelMapper;
import com.iflytek.astron.console.toolkit.mapper.workflow.WorkflowMapper;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class WorkflowModelRuntimeServiceTest {
    private static final String TOKEN = "0123456789abcdef0123456789abcdef";
    private WorkflowMapper workflows;
    private ModelMapper models;
    private WorkflowModelRuntimeService service;
    private Workflow workflow;
    private Model model;

    @BeforeEach
    void setUp() {
        workflows = mock(WorkflowMapper.class);
        models = mock(ModelMapper.class);
        service = new WorkflowModelRuntimeService(workflows, models);
        ReflectionTestUtils.setField(service, "workflowInternalApiKey", TOKEN);
        workflow = new Workflow();
        workflow.setFlowId("flow-1");
        workflow.setUid("publisher");
        workflow.setDeleted(false);
        model = new Model();
        model.setId(42L);
        model.setUid("publisher");
        model.setIsDeleted(false);
        model.setProvider("openai");
        model.setUrl("https://model.example/v1");
        model.setDomain("configured-model");
        model.setApiKey("first-key");
        when(workflows.selectList(any())).thenReturn(List.of(workflow));
        when(models.selectById(42L)).thenReturn(model);
    }

    @Test
    void executionReadsCurrentCredentialAndMetadataWithoutCaching() {
        assertThat(service.resolve(TOKEN, "flow-1", 42L).apiKey()).isEqualTo("first-key");
        model.setApiKey("rotated-key");
        model.setProvider("anthropic");
        model.setUrl("https://new.example/v1/messages");
        var current = service.resolve(TOKEN, "flow-1", 42L);
        assertThat(current.apiKey()).isEqualTo("rotated-key");
        assertThat(current.provider()).isEqualTo("anthropic");
        assertThat(current.api()).isEqualTo(model.getUrl());
        assertThat(current.domain()).isEqualTo(model.getDomain());
        verify(models, times(2)).selectById(42L);
    }

    @Test
    void deletionAndMissingModelImmediatelyRevokeExecution() {
        model.setIsDeleted(true);
        assertDenied();
        when(models.selectById(42L)).thenReturn(null);
        assertDenied();
    }

    @Test
    void personalModelsMustBelongToWorkflowPublisher() {
        model.setUid("other-user");
        assertDenied();
    }

    @Test
    void spaceModelsMustBelongToTheSameSpace() {
        workflow.setSpaceId(7L);
        model.setSpaceId(8L);
        assertDenied();
        model.setSpaceId(7L);
        model.setUid("another-space-member");
        assertThat(service.resolve(TOKEN, "flow-1", 42L).modelId()).isEqualTo(42L);
        model.setSpaceId(null);
        assertDenied();
    }

    @Test
    void deletedMissingAndAmbiguousFlowsCannotResolveCredentials() {
        workflow.setDeleted(true);
        assertDenied();
        when(workflows.selectList(any())).thenReturn(List.of());
        assertDenied();
        when(workflows.selectList(any())).thenReturn(List.of(workflow, workflow));
        assertDenied();
    }

    @Test
    void tokenIsRequiredEvenForDirectServiceCalls() {
        clearInvocations(workflows, models);
        assertThatThrownBy(() -> service.resolve(null, "flow-1", 42L)).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.resolve("invalid", "flow-1", 42L)).isInstanceOf(BusinessException.class);
        ReflectionTestUtils.setField(service, "workflowInternalApiKey", "");
        assertThatThrownBy(() -> service.resolve("", "flow-1", 42L)).isInstanceOf(BusinessException.class);
        verifyNoInteractions(workflows, models);
    }

    @Test
    void responseMustNotBeCached() {
        MockHttpServletResponse response = new MockHttpServletResponse();
        var result = new WorkflowModelRuntimeController(service).runtimeConfig(TOKEN, "flow-1", 42L, response);
        assertThat(response.getHeader("Cache-Control")).isEqualTo("no-store");
        assertThat(result.data().apiKey()).isEqualTo("first-key");
    }

    private void assertDenied() {
        assertThatThrownBy(() -> service.resolve(TOKEN, "flow-1", 42L)).isInstanceOf(BusinessException.class);
    }
}
