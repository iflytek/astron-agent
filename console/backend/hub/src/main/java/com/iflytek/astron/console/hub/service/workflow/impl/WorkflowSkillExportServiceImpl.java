package com.iflytek.astron.console.hub.service.workflow.impl;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.alibaba.fastjson2.JSONWriter;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.entity.workflow.Workflow;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import com.iflytek.astron.console.hub.dto.publish.BotApiInfoDTO;
import com.iflytek.astron.console.hub.entity.maas.WorkflowSkillExportRequest;
import com.iflytek.astron.console.hub.entity.maas.WorkflowSkillExportResponse;
import com.iflytek.astron.console.hub.service.publish.PublishApiService;
import com.iflytek.astron.console.hub.service.workflow.WorkflowSkillExportService;
import com.iflytek.astron.console.toolkit.common.constant.WorkflowConst;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.BizWorkflowData;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.BizWorkflowNode;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.node.BizInputOutput;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.node.BizSchema;
import com.iflytek.astron.console.toolkit.service.bot.OpenAiModelProcessService;
import com.iflytek.astron.console.toolkit.service.workflow.WorkflowService;
import com.iflytek.astron.console.toolkit.tool.DataPermissionCheckTool;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkflowSkillExportServiceImpl implements WorkflowSkillExportService {

    private static final int METADATA_GENERATION_TIMEOUT_SECONDS = 8;
    private static final int SKILL_NAME_MAX_LENGTH = 64;
    private static final int SKILL_DESCRIPTION_MAX_LENGTH = 1024;
    private static final String SKILL_FILE_NAME = "SKILL.md";

    private final WorkflowService workflowService;
    private final PublishApiService publishApiService;
    private final OpenAiModelProcessService openAiModelProcessService;
    private final DataPermissionCheckTool dataPermissionCheckTool;

    @Override
    public WorkflowSkillExportResponse exportSkill(WorkflowSkillExportRequest request) {
        if (request == null || request.getBotId() == null || request.getWorkflowId() == null) {
            throw new BusinessException(ResponseEnum.PARAMETER_ERROR);
        }

        Workflow workflow = workflowService.getById(request.getWorkflowId());
        if (workflow == null) {
            throw new BusinessException(ResponseEnum.BOT_NOT_EXIST);
        }
        dataPermissionCheckTool.checkWorkflowBelong(workflow, SpaceInfoUtil.getSpaceId());

        String workflowName = StringUtils.defaultIfBlank(request.getWorkflowName(), workflow.getName());
        String workflowDescription =
                StringUtils.defaultIfBlank(request.getWorkflowDescription(), workflow.getDescription());
        if (StringUtils.isBlank(workflowName) || StringUtils.isBlank(workflowDescription)) {
            throw new BusinessException(ResponseEnum.WORKFLOW_SKILL_NAME_DESC_EMPTY);
        }

        BotApiInfoDTO apiInfo = publishApiService.getApiInfo(request.getBotId());
        if (!hasPublishedApi(apiInfo)) {
            throw new BusinessException(ResponseEnum.WORKFLOW_SKILL_API_NOT_READY);
        }

        List<BizInputOutput> inputs = extractWorkflowInputs(workflow);
        SkillMetadata metadata = generateSkillMetadata(workflowName, workflowDescription, workflow.getId());
        String content = buildSkillContent(metadata, workflowName, workflowDescription, apiInfo, inputs);
        return new WorkflowSkillExportResponse(SKILL_FILE_NAME, content, metadata.aiGenerated());
    }

    private boolean hasPublishedApi(BotApiInfoDTO apiInfo) {
        return apiInfo != null
                && StringUtils.isNotBlank(apiInfo.getAppId())
                && StringUtils.isNotBlank(apiInfo.getAppKey())
                && StringUtils.isNotBlank(apiInfo.getAppSecret())
                && StringUtils.isNotBlank(apiInfo.getServiceUrl())
                && StringUtils.isNotBlank(apiInfo.getFlowId());
    }

    private List<BizInputOutput> extractWorkflowInputs(Workflow workflow) {
        String workflowProtocol = StringUtils.defaultIfBlank(workflow.getPublishedData(), workflow.getData());
        if (StringUtils.isBlank(workflowProtocol)) {
            return List.of();
        }

        try {
            BizWorkflowData workflowData = JSON.parseObject(workflowProtocol, BizWorkflowData.class);
            if (workflowData == null || workflowData.getNodes() == null) {
                return List.of();
            }
            for (BizWorkflowNode node : workflowData.getNodes()) {
                if (node != null
                        && StringUtils.startsWith(node.getId(), WorkflowConst.NodeType.START)
                        && node.getData() != null
                        && node.getData().getOutputs() != null) {
                    return node.getData().getOutputs();
                }
            }
        } catch (Exception e) {
            log.warn("Parse workflow inputs failed, workflowId={}", workflow.getId(), e);
        }
        return List.of();
    }

    private SkillMetadata generateSkillMetadata(String workflowName, String workflowDescription, Long workflowId) {
        SkillMetadata fallback = new SkillMetadata(
                toSkillName(workflowName, workflowId),
                toFallbackDescription(workflowName, workflowDescription),
                false);

        try {
            String prompt = buildMetadataPrompt(workflowName, workflowDescription);
            String content = CompletableFuture
                    .supplyAsync(() -> openAiModelProcessService.processNonStreaming(prompt))
                    .orTimeout(METADATA_GENERATION_TIMEOUT_SECONDS, TimeUnit.SECONDS)
                    .exceptionally(ex -> {
                        log.warn("Generate workflow skill metadata failed, workflowId={}", workflowId, ex);
                        return null;
                    })
                    .join();
            SkillMetadata generated = parseGeneratedMetadata(content);
            if (generated != null) {
                return generated;
            }
        } catch (Exception e) {
            log.warn("Generate workflow skill metadata failed, workflowId={}", workflowId, e);
        }
        return fallback;
    }

    private String buildMetadataPrompt(String workflowName, String workflowDescription) {
        return String.join(
                System.lineSeparator(),
                "You create Agent Skill metadata for a published workflow API.",
                "Return JSON only, without Markdown fences or explanations.",
                "",
                "Requirements:",
                "- name: lowercase ASCII kebab-case, 1-64 characters, using only a-z, 0-9, and hyphen.",
                "- description: English, third person, max 1024 characters. Clearly state when an agent should use the skill.",
                "- Do not mention implementation details, curl, API keys, or internal IDs.",
                "",
                "Workflow name: " + workflowName,
                "Workflow description: " + workflowDescription,
                "",
                "JSON schema:",
                "{\"name\":\"short-action-name\",\"description\":\"Use when the user needs ...\"}");
    }

    private SkillMetadata parseGeneratedMetadata(String content) {
        if (StringUtils.isBlank(content)) {
            return null;
        }

        int start = content.indexOf('{');
        int end = content.lastIndexOf('}');
        if (start < 0 || end <= start) {
            return null;
        }

        try {
            JSONObject json = JSON.parseObject(content.substring(start, end + 1));
            String name = StringUtils.trim(json.getString("name"));
            String description = StringUtils.trim(json.getString("description"));
            if (!isValidSkillName(name) || StringUtils.isBlank(description)) {
                return null;
            }
            if (description.length() > SKILL_DESCRIPTION_MAX_LENGTH) {
                description = description.substring(0, SKILL_DESCRIPTION_MAX_LENGTH);
            }
            return new SkillMetadata(name, description, true);
        } catch (Exception e) {
            log.warn("Parse generated skill metadata failed");
            return null;
        }
    }

    private boolean isValidSkillName(String name) {
        return StringUtils.isNotBlank(name)
                && name.length() <= SKILL_NAME_MAX_LENGTH
                && name.matches("[a-z0-9][a-z0-9-]*");
    }

    private String toSkillName(String workflowName, Long workflowId) {
        String normalizedText = Normalizer.normalize(
                StringUtils.defaultString(workflowName),
                Normalizer.Form.NFKD);
        StringBuilder normalizedBuilder = new StringBuilder(normalizedText.length());
        boolean previousHyphen = false;
        for (int i = 0; i < normalizedText.length(); i++) {
            char current = normalizedText.charAt(i);
            int charType = Character.getType(current);
            if (charType == Character.NON_SPACING_MARK
                    || charType == Character.COMBINING_SPACING_MARK
                    || charType == Character.ENCLOSING_MARK) {
                continue;
            }
            if (isAsciiAlphaNumeric(current)) {
                normalizedBuilder.append(Character.toLowerCase(current));
                previousHyphen = false;
                continue;
            }
            if (!previousHyphen && !normalizedBuilder.isEmpty()) {
                normalizedBuilder.append('-');
                previousHyphen = true;
            }
        }
        String normalized = trimEdgeHyphen(normalizedBuilder.toString());
        if (StringUtils.isBlank(normalized)) {
            normalized = "workflow-" + workflowId;
        }
        if (normalized.length() > SKILL_NAME_MAX_LENGTH) {
            normalized = trimEdgeHyphen(normalized.substring(0, SKILL_NAME_MAX_LENGTH));
        }
        return StringUtils.defaultIfBlank(normalized, "workflow-" + workflowId);
    }

    private String toFallbackDescription(String workflowName, String workflowDescription) {
        String description = "Use when the user needs to run the \"%s\" workflow. Workflow description: %s"
                .formatted(workflowName, workflowDescription);
        if (description.length() > SKILL_DESCRIPTION_MAX_LENGTH) {
            return description.substring(0, SKILL_DESCRIPTION_MAX_LENGTH);
        }
        return description;
    }

    private String buildSkillContent(
            SkillMetadata metadata,
            String workflowName,
            String workflowDescription,
            BotApiInfoDTO apiInfo,
            List<BizInputOutput> inputs) {
        JSONObject requestBody = buildRequestBodyExample(apiInfo, inputs);
        StringBuilder markdown = new StringBuilder();
        markdown.append("---\n");
        markdown.append("name: ").append(metadata.name()).append('\n');
        markdown.append("description: ").append(yamlQuote(metadata.description())).append('\n');
        markdown.append("---\n\n");
        markdown.append("# ").append(escapeMarkdown(workflowName)).append("\n\n");
        markdown.append("Use this skill when the user request matches this workflow capability.\n\n");
        markdown.append("Workflow description: ").append(escapeMarkdown(workflowDescription)).append("\n\n");
        markdown.append("## Inputs\n\n");
        if (inputs == null || inputs.isEmpty()) {
            markdown.append("- This workflow does not declare explicit input parameters.\n");
        } else {
            for (BizInputOutput input : inputs) {
                markdown.append("- `").append(escapeMarkdown(inputName(input))).append("`");
                markdown.append(" (").append(escapeMarkdown(inputType(input))).append(requiredText(input)).append(")");
                String description = inputDescription(input);
                if (StringUtils.isNotBlank(description)) {
                    markdown.append(": ").append(escapeMarkdown(description));
                }
                markdown.append('\n');
            }
        }
        markdown.append("\n## Workflow API\n\n");
        markdown.append("- Service URL: `").append(escapeMarkdown(apiInfo.getServiceUrl())).append("`\n");
        markdown.append("- App ID: `").append(escapeMarkdown(apiInfo.getAppId())).append("`\n");
        markdown.append("- Flow ID: `").append(escapeMarkdown(apiInfo.getFlowId())).append("`\n");
        markdown.append("- Authentication: `Authorization: Bearer <APP_KEY>:<APP_SECRET>`\n\n");
        markdown.append("## Procedure\n\n");
        markdown.append("1. Decide whether this skill applies to the user's request using the frontmatter description.\n");
        markdown.append("2. Collect every required input. If required information is missing, ask the user for it before calling the API.\n");
        markdown.append("3. Map the user's request into the `parameters` object. Keep `AGENT_USER_INPUT` as the user's current request when present.\n");
        markdown.append("4. Execute the curl command below. Replace placeholder values in `parameters` with valid JSON values matching the input types.\n");
        markdown.append("5. The API may stream Server-Sent Events. Aggregate useful response text from `data:` events and return the final result to the user.\n\n");
        markdown.append("```bash\n");
        markdown.append("curl -N -X POST '").append(shellSingleQuote(apiInfo.getServiceUrl())).append("' \\\n");
        markdown.append("  -H 'Content-Type: application/json' \\\n");
        markdown.append("  -H 'X-Consumer-Username: ").append(shellSingleQuote(apiInfo.getAppId())).append("' \\\n");
        markdown.append("  -H 'Authorization: Bearer ")
                .append(shellSingleQuote(apiInfo.getAppKey()))
                .append(':')
                .append(shellSingleQuote(apiInfo.getAppSecret()))
                .append("' \\\n");
        markdown.append("  -d '").append(shellSingleQuote(JSON.toJSONString(requestBody, JSONWriter.Feature.PrettyFormat))).append("'\n");
        markdown.append("```\n\n");
        markdown.append("## Notes\n\n");
        markdown.append("- Treat the embedded API credentials as sensitive. Do not expose them to users or logs.\n");
        markdown.append("- For file inputs, pass the file reference format expected by the Astron workflow API; do not send an unuploaded local file path.\n");
        markdown.append("- If the API returns an error, report the error message and the input parameters used, without revealing API credentials.\n");
        return markdown.toString();
    }

    private JSONObject buildRequestBodyExample(BotApiInfoDTO apiInfo, List<BizInputOutput> inputs) {
        JSONObject parameters = new JSONObject();
        if (inputs != null) {
            for (BizInputOutput input : inputs) {
                String name = inputName(input);
                if (StringUtils.isNotBlank(name)) {
                    parameters.put(name, exampleValue(input));
                }
            }
        }

        JSONObject requestBody = new JSONObject();
        requestBody.put("flow_id", apiInfo.getFlowId());
        requestBody.put("uid", "<caller-user-id>");
        requestBody.put("parameters", parameters);
        requestBody.put("history", new JSONArray());
        requestBody.put("stream", true);
        return requestBody;
    }

    private Object exampleValue(BizInputOutput input) {
        if (isFileInput(input)) {
            return "<uploaded file URL or file reference>";
        }
        String name = inputName(input);
        if ("AGENT_USER_INPUT".equals(name)) {
            return "<user request>";
        }
        String type = inputType(input);
        if (StringUtils.startsWith(type, "array")) {
            JSONArray array = new JSONArray();
            array.add("<value>");
            return array;
        }
        if ("object".equals(type)) {
            JSONObject object = new JSONObject();
            object.put("key", "value");
            return object;
        }
        if ("boolean".equals(type)) {
            return true;
        }
        if ("integer".equals(type) || "number".equals(type)) {
            return 0;
        }
        return "<value>";
    }

    private String inputName(BizInputOutput input) {
        return input == null ? "" : StringUtils.defaultString(input.getName());
    }

    private String inputType(BizInputOutput input) {
        BizSchema schema = input == null ? null : input.getSchema();
        return schema == null || StringUtils.isBlank(schema.getType()) ? "string" : schema.getType();
    }

    private String requiredText(BizInputOutput input) {
        return Boolean.TRUE.equals(input == null ? null : input.getRequired()) ? ", required" : ", optional";
    }

    private String inputDescription(BizInputOutput input) {
        if (input == null) {
            return "";
        }
        List<String> parts = new ArrayList<>();
        if (StringUtils.isNotBlank(input.getDescription())) {
            parts.add(input.getDescription());
        } else if (input.getSchema() != null && input.getSchema().getDft() != null) {
            parts.add(Objects.toString(input.getSchema().getDft()));
        }
        if (isFileInput(input)) {
            parts.add("file input");
        }
        if (input.getAllowedFileType() != null && !input.getAllowedFileType().isEmpty()) {
            parts.add("allowed file types: " + String.join(", ", input.getAllowedFileType()));
        }
        return String.join("; ", parts);
    }

    private boolean isFileInput(BizInputOutput input) {
        return input != null
                && (StringUtils.isNotBlank(input.getFileType())
                        || StringUtils.containsIgnoreCase(input.getCustomParameterType(), "file"));
    }

    private String yamlQuote(String value) {
        return "\"" + StringUtils.defaultString(value).replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    private String escapeMarkdown(String value) {
        return StringUtils.defaultString(value).replace("\n", " ").replace("\r", " ");
    }

    private String shellSingleQuote(String value) {
        return StringUtils.defaultString(value).replace("'", "'\"'\"'");
    }

    private boolean isAsciiAlphaNumeric(char value) {
        return (value >= 'a' && value <= 'z')
                || (value >= 'A' && value <= 'Z')
                || (value >= '0' && value <= '9');
    }

    private String trimEdgeHyphen(String value) {
        if (StringUtils.isBlank(value)) {
            return "";
        }
        int start = 0;
        int end = value.length();
        while (start < end && value.charAt(start) == '-') {
            start++;
        }
        while (end > start && value.charAt(end - 1) == '-') {
            end--;
        }
        return value.substring(start, end);
    }

    private record SkillMetadata(String name, String description, boolean aiGenerated) {}
}
