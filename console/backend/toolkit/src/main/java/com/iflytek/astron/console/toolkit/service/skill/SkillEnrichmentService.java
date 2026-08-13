package com.iflytek.astron.console.toolkit.service.skill;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.iflytek.astron.console.toolkit.entity.dto.skill.SkillImportDto;
import com.iflytek.astron.console.toolkit.entity.dto.skill.SkillSandboxConfigDto;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

/**
 * Shared skill enrichment: augments skill entries (each carrying a skillId) in place with
 * name/description/downloadUrl/resources and, when the sandbox is enabled, sandbox config. Used by
 * both the workflow agent node and the standalone agent runtime.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SkillEnrichmentService {

    private final SkillFileService skillFileService;
    private final SkillSandboxConfigService skillSandboxConfigService;

    public void enrichSkillEntries(JSONArray skillArray) {
        enrichSkillEntries(skillArray, null, null);
    }

    /**
     * Enriches skills for the supplied execution identity. When {@code uid} is absent the legacy
     * request-scoped behavior is preserved for synchronous callers.
     */
    public void enrichSkillEntries(JSONArray skillArray, String uid, Long spaceId) {
        if (skillArray == null || skillArray.isEmpty()) {
            return;
        }
        List<Long> skillIds = new ArrayList<>();
        for (int i = 0; i < skillArray.size(); i++) {
            Object obj = skillArray.get(i);
            if (!(obj instanceof Map skillObj)) {
                continue;
            }
            Object skillIdObj = skillObj.get("skillId");
            if (skillIdObj == null) {
                skillIdObj = skillObj.get("id");
            }
            if (skillIdObj == null) {
                continue;
            }
            try {
                skillIds.add(Long.parseLong(String.valueOf(skillIdObj)));
            } catch (NumberFormatException ex) {
                log.warn("Ignore invalid skill id: {}", skillIdObj);
            }
        }
        if (skillIds.isEmpty()) {
            return;
        }
        List<SkillImportDto> imports = uid == null
                ? skillFileService.getSkillImportsByIds(skillIds)
                : skillFileService.getSkillImportsByIds(skillIds, uid, spaceId);
        Map<Long, SkillImportDto> importMap = imports
                .stream()
                .collect(Collectors.toMap(SkillImportDto::getId, item -> item, (a, b) -> a));
        SkillSandboxConfigDto sandboxConfig = uid == null
                ? skillSandboxConfigService.toRuntimeDto()
                : skillSandboxConfigService.toRuntimeDto(uid, spaceId);
        for (int i = 0; i < skillArray.size(); i++) {
            Object obj = skillArray.get(i);
            if (!(obj instanceof Map skillObj)) {
                continue;
            }
            Object skillIdObj = skillObj.get("skillId");
            if (skillIdObj == null) {
                skillIdObj = skillObj.get("id");
            }
            if (skillIdObj == null) {
                continue;
            }
            try {
                Long skillId = Long.parseLong(String.valueOf(skillIdObj));
                SkillImportDto importDto = importMap.get(skillId);
                if (importDto == null) {
                    continue;
                }
                skillObj.put("skillId", String.valueOf(importDto.getId()));
                skillObj.put("name", StringUtils.defaultString(importDto.getName()));
                skillObj.put("description", StringUtils.defaultString(importDto.getDescription()));
                skillObj.put("downloadUrl", StringUtils.defaultString(importDto.getDownloadUrl()));
                skillObj.put("resources", importDto.getResources());
                if (Boolean.TRUE.equals(sandboxConfig.getEnabled())
                        && StringUtils.isNotBlank(sandboxConfig.getApiKey())) {
                    skillObj.put("sandbox", JSON.parseObject(JSON.toJSONString(sandboxConfig)));
                }
            } catch (NumberFormatException ex) {
                log.warn("Ignore invalid skill id while enriching: {}", skillIdObj);
            }
        }
    }
}
