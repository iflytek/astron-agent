package com.iflytek.astron.console.toolkit.service.model;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.entity.workflow.Workflow;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.security.WorkflowInternalApiKey;
import com.iflytek.astron.console.toolkit.entity.table.model.Model;
import com.iflytek.astron.console.toolkit.mapper.model.ModelMapper;
import com.iflytek.astron.console.toolkit.mapper.workflow.WorkflowMapper;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/** Resolve a workflow's model credentials only at execution, using database-owned scope. */
@Service
@RequiredArgsConstructor
@Slf4j
public class WorkflowModelRuntimeService {
    private final WorkflowMapper workflowMapper;
    private final ModelMapper modelMapper;

    @Value("${workflow.internal-api-key:}")
    private String workflowInternalApiKey;

    public RuntimeModelConfig resolve(String serviceToken, String flowId, Long modelId) {
        if (!WorkflowInternalApiKey.matches(workflowInternalApiKey, serviceToken)) {
            throw new BusinessException(ResponseEnum.UNAUTHORIZED);
        }
        if (StringUtils.isBlank(flowId) || modelId == null || modelId <= 0) {
            throw new BusinessException(ResponseEnum.PARAM_ERROR);
        }
        // Core authenticates the execution and supplies its canonical group id, never a node's
        // claimed owner. Published versions inherit this scope without trusting a consumer uid.
        List<Workflow> workflows = workflowMapper.selectList(Wrappers.lambdaQuery(Workflow.class)
                .eq(Workflow::getFlowId, flowId.trim())
                .eq(Workflow::getDeleted, Boolean.FALSE)
                .last("limit 2"));
        if (workflows == null || workflows.size() != 1) {
            throw new BusinessException(ResponseEnum.WORKFLOW_NOT_EXIST);
        }
        Workflow workflow = workflows.getFirst();
        Model model = modelMapper.selectById(modelId);
        // Explicit checks also protect mocked/cached mapper results and future mapper changes.
        if (Boolean.TRUE.equals(workflow.getDeleted()) || model == null
                || Boolean.TRUE.equals(model.getIsDeleted())
                || !Objects.equals(model.getId(), modelId)
                || !Objects.equals(workflow.getSpaceId(), model.getSpaceId())
                || (workflow.getSpaceId() == null
                        && (StringUtils.isBlank(workflow.getUid())
                                || !Objects.equals(workflow.getUid(), model.getUid())))) {
            throw new BusinessException(ResponseEnum.MODEL_NOT_EXIST);
        }
        String protocol = ModelService.normalizeModelProtocol(model.getProvider());
        log.debug("Resolved workflow runtime model, flowId={}, modelId={}", flowId, modelId);
        return new RuntimeModelConfig(modelId, protocol, model.getUrl(), model.getDomain(), model.getApiKey());
    }

    /** Secret response: never persist it in workflow DSL, traces, or a shared cache. */
    public record RuntimeModelConfig(Long modelId, String provider, String api, String domain, String apiKey) {}
}
