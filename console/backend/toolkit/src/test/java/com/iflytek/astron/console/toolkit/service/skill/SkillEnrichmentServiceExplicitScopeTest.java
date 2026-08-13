package com.iflytek.astron.console.toolkit.service.skill;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.toolkit.entity.dto.skill.SkillImportDto;
import com.iflytek.astron.console.toolkit.entity.dto.skill.SkillImportResourceDto;
import com.iflytek.astron.console.toolkit.entity.dto.skill.SkillSandboxConfigDto;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.context.request.RequestContextHolder;

@ExtendWith(MockitoExtension.class)
class SkillEnrichmentServiceExplicitScopeTest {

    @Mock
    private SkillFileService skillFileService;

    @Mock
    private SkillSandboxConfigService skillSandboxConfigService;

    @InjectMocks
    private SkillEnrichmentService skillEnrichmentService;

    @Test
    void enrichesDownloadResourcesAndSandboxWithoutRequestContext() {
        RequestContextHolder.resetRequestAttributes();
        SkillImportResourceDto resource = new SkillImportResourceDto();
        resource.setPath("scripts/run.py");
        resource.setDownloadUrl("https://example.test/resource");
        SkillImportDto skill = new SkillImportDto();
        skill.setId(42L);
        skill.setName("approval-skill");
        skill.setDescription("approval description");
        skill.setDownloadUrl("https://example.test/skill");
        skill.setResources(List.of(resource));
        when(skillFileService.getSkillImportsByIds(List.of(42L), "approval-user", 200L))
                .thenReturn(List.of(skill));

        SkillSandboxConfigDto sandbox = new SkillSandboxConfigDto();
        sandbox.setEnabled(Boolean.TRUE);
        sandbox.setApiKey("approval-secret");
        sandbox.setSpaceId(200L);
        when(skillSandboxConfigService.toRuntimeDto("approval-user", 200L)).thenReturn(sandbox);

        JSONArray entries = new JSONArray(List.of(new JSONObject().fluentPut("skillId", "42")));
        skillEnrichmentService.enrichSkillEntries(entries, "approval-user", 200L);

        JSONObject enriched = entries.getJSONObject(0);
        assertThat(enriched.getString("name")).isEqualTo("approval-skill");
        assertThat(enriched.getString("downloadUrl")).isEqualTo("https://example.test/skill");
        assertThat(enriched.getJSONArray("resources").getJSONObject(0).getString("path"))
                .isEqualTo("scripts/run.py");
        assertThat(enriched.getJSONObject("sandbox").getString("apiKey"))
                .isEqualTo("approval-secret");
        verify(skillFileService).getSkillImportsByIds(List.of(42L), "approval-user", 200L);
        verify(skillFileService, never()).getSkillImportsByIds(List.of(42L));
    }
}
