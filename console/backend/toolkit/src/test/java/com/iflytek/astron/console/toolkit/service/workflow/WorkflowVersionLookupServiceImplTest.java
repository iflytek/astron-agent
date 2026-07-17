package com.iflytek.astron.console.toolkit.service.workflow;

import com.iflytek.astron.console.toolkit.common.constant.WorkflowConst;
import com.iflytek.astron.console.toolkit.entity.table.workflow.WorkflowVersion;
import com.iflytek.astron.console.toolkit.mapper.workflow.WorkflowVersionMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkflowVersionLookupServiceImplTest {

    @Mock
    private WorkflowVersionMapper workflowVersionMapper;

    private WorkflowVersionLookupServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new WorkflowVersionLookupServiceImpl(workflowVersionMapper);
    }

    @Test
    void findLatestSuccessfulVersionNameShouldReturnLatestVersionName() {
        WorkflowVersion latest = new WorkflowVersion();
        latest.setName("v1.0");
        when(workflowVersionMapper.selectOne(any())).thenReturn(latest);

        Optional<String> versionName = service.findLatestSuccessfulVersionName(25);

        assertThat(versionName).contains("v1.0");
    }

    @Test
    void isPublishedVersionShouldUnderstandSuccessPublishResult() {
        WorkflowVersion version = new WorkflowVersion();
        version.setPublishResult(WorkflowConst.PublishResult.SUCCESS);
        when(workflowVersionMapper.selectOne(any())).thenReturn(version);

        Optional<Boolean> published = service.isPublishedVersion("flow-1", "v1.0");

        assertThat(published).contains(true);
    }
}
