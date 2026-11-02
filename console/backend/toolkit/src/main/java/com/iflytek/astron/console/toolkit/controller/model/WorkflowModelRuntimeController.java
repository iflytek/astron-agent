package com.iflytek.astron.console.toolkit.controller.model;

import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.security.WorkflowInternalApiKey;
import com.iflytek.astron.console.toolkit.common.anno.ResponseResultBody;
import com.iflytek.astron.console.toolkit.service.model.WorkflowModelRuntimeService;
import com.iflytek.astron.console.toolkit.service.model.WorkflowModelRuntimeService.RuntimeModelConfig;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@ResponseResultBody
@RequiredArgsConstructor
public class WorkflowModelRuntimeController {
    private final WorkflowModelRuntimeService runtimeService;

    @GetMapping("/model/internal-runtime-config")
    public ApiResult<RuntimeModelConfig> runtimeConfig(
            @RequestHeader(value = WorkflowInternalApiKey.HEADER, required = false) String serviceToken,
            @RequestParam("flowId") String flowId,
            @RequestParam("modelId") Long modelId,
            HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-store");
        return ApiResult.success(runtimeService.resolve(serviceToken, flowId, modelId));
    }
}
