package com.iflytek.astron.console.toolkit.controller.workflow;

import com.iflytek.astron.console.toolkit.service.workflow.WorkflowArtifactService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class WorkflowArtifactControllerSourceTest {

    @Mock
    private WorkflowArtifactService workflowArtifactService;

    @InjectMocks
    private WorkflowArtifactController controller;

    @Test
    void uploadInternalPassesArtifactSourceToService() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "output.txt",
                "text/plain",
                "hello".getBytes());

        controller.uploadInternal(
                "token",
                null,
                "flow-1",
                "user-1",
                100L,
                "run-1",
                "ifly-code::node-1",
                null,
                "code_sandbox",
                file);

        ArgumentCaptor<String> sourceCaptor = ArgumentCaptor.forClass(String.class);
        verify(workflowArtifactService).uploadInternal(
                eq("token"),
                eq(null),
                eq("flow-1"),
                eq("user-1"),
                eq(100L),
                eq("run-1"),
                eq("ifly-code::node-1"),
                eq(null),
                sourceCaptor.capture(),
                any());
        assertThat(sourceCaptor.getValue()).isEqualTo("code_sandbox");
    }
}
