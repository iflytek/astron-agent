package com.iflytek.astron.console.hub.service.chat.springai;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.definition.ToolDefinition;

/**
 * Spring AI tool: read a skill's SKILL.md (called with empty parameters) or a specific referenced
 * resource (called with a relative {@code path}). Mirrors the Python read_skill runtime: pure HTTP
 * download of the presigned URLs resolved by skill enrichment.
 */
@Slf4j
public class ReadSkillToolCallback implements ToolCallback {

    private static final String INPUT_SCHEMA = """
            {"type":"object","properties":{"path":{"type":"string",\
            "description":"Optional relative resource path under the skill folder, e.g. references/beijing.md. \
            Leave empty to read SKILL.md and list available resources."}},"required":[]}""";

    private final String skillId;
    private final String name;
    private final String description;
    private final String downloadUrl;
    private final JSONArray resources;
    private final SkillRuntimeToolService runtime;

    public ReadSkillToolCallback(JSONObject skill, SkillRuntimeToolService runtime) {
        this.skillId = skill.getString("skillId");
        this.name = StringUtils.defaultString(skill.getString("name"));
        this.description = StringUtils.defaultString(skill.getString("description"));
        this.downloadUrl = StringUtils.defaultString(skill.getString("downloadUrl"));
        this.resources = skill.getJSONArray("resources") == null ? new JSONArray() : skill.getJSONArray("resources");
        this.runtime = runtime;
    }

    @Override
    public ToolDefinition getToolDefinition() {
        return ToolDefinition.builder()
                .name("read_skill_" + skillId)
                .description("Read SKILL.md and referenced files for skill '" + name
                        + "'. First call with empty parameters to read SKILL.md and get the resource manifest. "
                        + "If SKILL.md references a relative path like references/beijing.md, call again with that path.")
                .inputSchema(INPUT_SCHEMA)
                .build();
    }

    @Override
    public String call(String toolInput) {
        String requestedPath = parsePath(toolInput);
        log.info("read_skill invoked, skillId={}, path={}", skillId, requestedPath);
        JSONObject result = new JSONObject();
        result.put("skill_id", skillId);
        result.put("name", name);
        result.put("description", description);
        try {
            if (StringUtils.isNotBlank(requestedPath)) {
                JSONObject resource = findResource(requestedPath);
                if (resource == null) {
                    result.put("path", requestedPath);
                    result.put("error", "resource_not_found");
                    result.put("available_resources", manifest());
                    return result.toJSONString();
                }
                result.put("path", normalizePath(resource.getString("path")));
                result.put("content", runtime.downloadText(resource.getString("downloadUrl")));
                return result.toJSONString();
            }
            result.put("content", runtime.downloadText(downloadUrl));
            result.put("resources", manifest());
            return result.toJSONString();
        } catch (Exception e) {
            log.warn("read_skill failed, skillId={}, error={}", skillId, e.getMessage());
            result.put("error", "read_failed");
            result.put("message", e.getMessage());
            return result.toJSONString();
        }
    }

    private String parsePath(String toolInput) {
        if (StringUtils.isBlank(toolInput)) {
            return "";
        }
        try {
            JSONObject args = JSON.parseObject(toolInput);
            return args == null ? "" : normalizePath(args.getString("path"));
        } catch (Exception e) {
            return "";
        }
    }

    private JSONObject findResource(String path) {
        for (int i = 0; i < resources.size(); i++) {
            JSONObject r = resources.getJSONObject(i);
            if (r != null && path.equals(normalizePath(r.getString("path")))) {
                return r;
            }
        }
        return null;
    }

    private JSONArray manifest() {
        JSONArray out = new JSONArray();
        for (int i = 0; i < resources.size(); i++) {
            JSONObject r = resources.getJSONObject(i);
            if (r == null) {
                continue;
            }
            out.add(new JSONObject()
                    .fluentPut("path", r.getString("path"))
                    .fluentPut("name", r.getString("name"))
                    .fluentPut("file_ext", r.getString("fileExt"))
                    .fluentPut("file_size", r.get("fileSize")));
        }
        return out;
    }

    private String normalizePath(String value) {
        String p = StringUtils.defaultString(value).trim().replace("\\", "/");
        while (p.startsWith("./")) {
            p = p.substring(2);
        }
        return StringUtils.stripStart(p, "/");
    }
}
