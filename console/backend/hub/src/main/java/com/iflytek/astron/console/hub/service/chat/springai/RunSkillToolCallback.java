package com.iflytek.astron.console.hub.service.chat.springai;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.definition.ToolDefinition;

/**
 * Spring AI tool: execute a command from the skill package in the configured E2B sandbox. Delegates
 * the actual sandbox execution to core/agent's sandbox-exec endpoint (E2B has no Java SDK). When no
 * sandbox is configured the endpoint returns a fixed unsupported-environment message.
 */
@Slf4j
public class RunSkillToolCallback implements ToolCallback {

    private static final String INPUT_SCHEMA = """
            {"type":"object","properties":{"command":{"type":"string",\
            "description":"Command to execute from the Skill workspace root, e.g. python -m scripts.clean_csv. \
            Choose this from SKILL.md instructions."},"stdin":{"description":"Optional JSON-serializable stdin."}},\
            "required":["command"]}""";

    private final String skillId;
    private final String name;
    private final JSONObject skill;
    private final SkillRuntimeToolService runtime;

    public RunSkillToolCallback(JSONObject skill, SkillRuntimeToolService runtime) {
        this.skill = skill;
        this.skillId = skill.getString("skillId");
        this.name = StringUtils.defaultString(skill.getString("name"));
        this.runtime = runtime;
    }

    @Override
    public ToolDefinition getToolDefinition() {
        return ToolDefinition.builder()
                .name("run_skill_" + skillId)
                .description("Execute a command from skill '" + name + "' in the configured script sandbox. "
                        + "Read SKILL.md first and follow its instructions. If no sandbox is configured, "
                        + "this returns a fixed unsupported-environment message.")
                .inputSchema(INPUT_SCHEMA)
                .build();
    }

    @Override
    public String call(String toolInput) {
        JSONObject args;
        try {
            args = StringUtils.isBlank(toolInput) ? new JSONObject() : JSON.parseObject(toolInput);
        } catch (Exception e) {
            args = new JSONObject();
        }
        String command = args == null ? null : args.getString("command");
        if (StringUtils.isBlank(command)) {
            return new JSONObject().fluentPut("skill_id", skillId)
                    .fluentPut("error", "command_required")
                    .toJSONString();
        }
        JSONObject body = new JSONObject();
        body.put("skill_id", skillId);
        body.put("command", command);
        body.put("stdin", args.get("stdin"));
        body.put("resources", skill.getJSONArray("resources"));
        body.put("sandbox", skill.getJSONObject("sandbox") == null ? new JSONObject() : skill.getJSONObject("sandbox"));
        log.info("run_skill invoked, skillId={}, command={}", skillId, command);
        try {
            return runtime.executeSandbox(body);
        } catch (Exception e) {
            log.warn("run_skill failed, skillId={}, error={}", skillId, e.getMessage());
            return new JSONObject().fluentPut("skill_id", skillId)
                    .fluentPut("error", "run_failed")
                    .fluentPut("message", e.getMessage())
                    .toJSONString();
        }
    }
}
