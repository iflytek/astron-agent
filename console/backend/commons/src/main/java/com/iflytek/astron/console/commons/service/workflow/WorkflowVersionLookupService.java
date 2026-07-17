package com.iflytek.astron.console.commons.service.workflow;

import java.util.Optional;

public interface WorkflowVersionLookupService {

    Optional<String> findLatestSuccessfulVersionName(Integer botId);

    Optional<Boolean> isPublishedVersion(String flowId, String versionName);
}
