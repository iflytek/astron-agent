package com.iflytek.astron.console.hub.service.chat.springai;

import com.alibaba.fastjson2.JSONObject;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Builds {@code read_skill_*} (and, in a later phase, {@code run_skill_*}) Spring AI tool callbacks
 * from enriched skill entries. Entries missing skillId/name/downloadUrl are skipped (mirroring the
 * Python SkillPluginFactory's required-field check).
 */
@Service
@RequiredArgsConstructor
public class SkillToolCallbackFactory {

    private final SkillRuntimeToolService skillRuntimeToolService;

    public List<ToolCallback> build(List<JSONObject> skills) {
        List<ToolCallback> callbacks = new ArrayList<>();
        if (skills == null) {
            return callbacks;
        }
        Set<String> seenSkillIds = new HashSet<>();
        for (JSONObject skill : skills) {
            if (skill == null
                    || StringUtils.isBlank(skill.getString("skillId"))
                    || StringUtils.isBlank(skill.getString("name"))
                    || StringUtils.isBlank(skill.getString("downloadUrl"))) {
                continue;
            }
            // Skip duplicate skillIds so we never register two tools with the same name.
            if (!seenSkillIds.add(skill.getString("skillId"))) {
                continue;
            }
            callbacks.add(new ReadSkillToolCallback(skill, skillRuntimeToolService));
            callbacks.add(new RunSkillToolCallback(skill, skillRuntimeToolService));
        }
        return callbacks;
    }
}
