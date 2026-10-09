package com.iflytek.astron.console.hub.controller.runtime;

import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.toolkit.service.model.ModelService;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Internal, service-authenticated credential resolution for immutable releases. */
@RestController
@RequestMapping("/internal/agent-runtime")
@RequiredArgsConstructor
public class AgentRuntimeCredentialController {

    private final ModelService modelService;

    @GetMapping("/model-credentials/{modelId}")
    public Map<String, String> resolveModelCredential(
            @PathVariable Long modelId,
            @RequestParam String ownerUid,
            @RequestParam Long spaceId) {
        String apiKey = modelService.getPublishedRuntimeModelCredential(modelId, ownerUid, spaceId);
        if (StringUtils.isBlank(apiKey)) {
            throw new BusinessException(ResponseEnum.MODEL_CHECK_FAILED);
        }
        return Map.of("api_key", apiKey);
    }
}
