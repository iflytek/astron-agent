package com.iflytek.astron.console.hub.service.publish.executor;

import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.hub.entity.PublishApproval;

public interface PublishApprovalExecutor {

    boolean supports(PublishApproval approval);

    ApiResult<Object> execute(PublishApproval approval);
}
