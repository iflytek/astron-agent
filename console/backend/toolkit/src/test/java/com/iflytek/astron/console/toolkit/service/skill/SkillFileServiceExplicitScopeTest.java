package com.iflytek.astron.console.toolkit.service.skill;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.enums.space.SpaceRoleEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.service.space.SpaceUserService;
import com.iflytek.astron.console.commons.util.S3ClientUtil;
import com.iflytek.astron.console.toolkit.entity.dto.skill.SkillImportDto;
import com.iflytek.astron.console.toolkit.entity.table.skill.SkillFile;
import com.iflytek.astron.console.toolkit.mapper.skill.SkillFileMapper;
import com.iflytek.astron.console.toolkit.util.S3Util;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.context.request.RequestContextHolder;

@ExtendWith(MockitoExtension.class)
class SkillFileServiceExplicitScopeTest {

    @Mock
    private SkillFileMapper mapper;

    @Mock
    private S3Util s3Util;

    @Mock
    private S3ClientUtil s3ClientUtil;

    @Mock
    private SpaceUserService spaceUserService;

    private SkillFileService service;

    @BeforeEach
    void setUp() {
        service = new SkillFileService();
        ReflectionTestUtils.setField(service, "baseMapper", mapper);
        ReflectionTestUtils.setField(service, "s3Util", s3Util);
        ReflectionTestUtils.setField(service, "s3ClientUtil", s3ClientUtil);
        ReflectionTestUtils.setField(service, "spaceUserService", spaceUserService);
    }

    @Test
    void resolvesExplicitTeamScopeForCurrentMemberWithoutRequestContext() {
        RequestContextHolder.resetRequestAttributes();
        SkillFile folder = entry(10L, 0L, "team-skill", "folder");
        folder.setSpaceId(100L);
        SkillFile skillFile = entry(42L, 10L, "SKILL.md", "file");
        skillFile.setSpaceId(100L);
        skillFile.setObjectKey("team/SKILL.md");
        when(spaceUserService.getRole(100L, "current-member"))
                .thenReturn(SpaceRoleEnum.MEMBER);
        when(mapper.selectList(any())).thenReturn(List.of(folder, skillFile));
        when(s3ClientUtil.generatePresignedGetUrl("team/SKILL.md"))
                .thenReturn("https://example.test/team-skill");

        List<SkillImportDto> result = service.getSkillImportsByIds(
                List.of(42L), "current-member", 100L);

        assertThat(result).singleElement().satisfies(skill -> {
            assertThat(skill.getName()).isEqualTo("team-skill");
            assertThat(skill.getDownloadUrl()).isEqualTo("https://example.test/team-skill");
        });
        verify(spaceUserService).getRole(100L, "current-member");
    }

    @Test
    void rejectsExplicitTeamScopeForFormerMemberBeforeQuery() {
        RequestContextHolder.resetRequestAttributes();
        when(spaceUserService.getRole(100L, "former-member")).thenReturn(null);

        assertThatThrownBy(() -> service.getSkillImportsByIds(
                List.of(42L), "former-member", 100L))
                .isInstanceOf(BusinessException.class)
                .extracting("responseEnum")
                .isEqualTo(ResponseEnum.INSUFFICIENT_PERMISSIONS);

        verify(spaceUserService).getRole(100L, "former-member");
        verifyNoInteractions(mapper);
    }

    @Test
    void resolvesExplicitSkillFilesWithoutRequestContext() {
        RequestContextHolder.resetRequestAttributes();
        SkillFile folder = entry(10L, 0L, "approval-skill", "folder");
        SkillFile skillFile = entry(42L, 10L, "SKILL.md", "file");
        skillFile.setSkillDescription("approval description");
        skillFile.setObjectKey("approval/SKILL.md");
        SkillFile resource = entry(43L, 10L, "run.py", "file");
        resource.setObjectKey("approval/run.py");
        resource.setFileExt("py");
        when(mapper.selectList(any())).thenReturn(List.of(folder, skillFile, resource));
        when(s3ClientUtil.generatePresignedGetUrl("approval/SKILL.md"))
                .thenReturn("https://example.test/skill");
        when(s3ClientUtil.generatePresignedGetUrl("approval/run.py"))
                .thenReturn("https://example.test/resource");

        List<SkillImportDto> result = service.getSkillImportsByIds(
                List.of(42L), "approval-user", null);

        assertThat(result).singleElement().satisfies(skill -> {
            assertThat(skill.getName()).isEqualTo("approval-skill");
            assertThat(skill.getDownloadUrl()).isEqualTo("https://example.test/skill");
            assertThat(skill.getResources()).singleElement().satisfies(file -> {
                assertThat(file.getPath()).isEqualTo("run.py");
                assertThat(file.getDownloadUrl()).isEqualTo("https://example.test/resource");
            });
        });
    }

    @Test
    void rejectsBlankExplicitPersonalUidWithoutRequestContext() {
        RequestContextHolder.resetRequestAttributes();

        assertThatThrownBy(() -> service.getSkillImportsByIds(List.of(42L), " ", null))
                .isInstanceOf(BusinessException.class)
                .extracting("responseEnum")
                .isEqualTo(ResponseEnum.UNAUTHORIZED);

        verifyNoInteractions(spaceUserService, mapper);
    }

    private SkillFile entry(Long id, Long parentId, String name, String type) {
        SkillFile file = new SkillFile();
        file.setId(id);
        file.setUid("approval-user");
        file.setParentId(parentId);
        file.setName(name);
        file.setEntryType(type);
        file.setSortOrder(1);
        file.setDeleted(Boolean.FALSE);
        return file;
    }
}
