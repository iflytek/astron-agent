package com.iflytek.astron.console.toolkit.controller.skill;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.same;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.toolkit.entity.dto.skill.SkillDirectoryUploadResultDto;
import com.iflytek.astron.console.toolkit.entity.dto.skill.SkillFileContentDto;
import com.iflytek.astron.console.toolkit.entity.dto.skill.SkillFileTreeNodeDto;
import com.iflytek.astron.console.toolkit.service.skill.SkillFileService;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

@ExtendWith(MockitoExtension.class)
class SkillFileControllerTest {

    @Mock
    private SkillFileService skillFileService;

    @Mock
    private MultipartFile multipartFile;

    @InjectMocks
    private SkillFileController skillFileController;

    @Test
    @DisplayName("upload directory should delegate to service")
    void uploadDirectory_shouldDelegateToService() {
        List<String> paths = List.of("demo/SKILL.md", "demo/scripts/run.py");
        MultipartFile[] files = new MultipartFile[] {multipartFile, multipartFile};
        SkillFileTreeNodeDto root = new SkillFileTreeNodeDto();
        root.setId(1L);
        root.setName("demo");
        root.setEntryType("folder");
        SkillDirectoryUploadResultDto uploadResult = new SkillDirectoryUploadResultDto();
        uploadResult.setTree(List.of(root));
        uploadResult.setUploadedNodes(List.of(root));
        when(skillFileService.uploadDirectory(eq(paths), same(files))).thenReturn(uploadResult);

        ApiResult<SkillDirectoryUploadResultDto> result =
                skillFileController.uploadDirectory(paths, null, files);

        assertThat(result.code()).isEqualTo(0);
        assertThat(result.data().getTree()).containsExactly(root);
        assertThat(result.data().getUploadedNodes()).containsExactly(root);
        verify(skillFileService, times(1)).uploadDirectory(eq(paths), same(files));
    }

    @Test
    @DisplayName("upload directory should parse paths json and delegate to service")
    void uploadDirectory_shouldParsePathsJsonAndDelegateToService() {
        List<String> paths = List.of("demo/SKILL.md", "demo/scripts/run.py");
        MultipartFile[] files = new MultipartFile[] {multipartFile, multipartFile};
        SkillDirectoryUploadResultDto uploadResult = new SkillDirectoryUploadResultDto();
        when(skillFileService.uploadDirectory(eq(paths), same(files))).thenReturn(uploadResult);

        ApiResult<SkillDirectoryUploadResultDto> result =
                skillFileController.uploadDirectory(null, "[\"demo/SKILL.md\",\"demo/scripts/run.py\"]", files);

        assertThat(result.code()).isEqualTo(0);
        verify(skillFileService, times(1)).uploadDirectory(eq(paths), same(files));
    }

    @Test
    @DisplayName("upload file should delegate to service")
    void upload_shouldDelegateToService() {
        MultipartFile[] files = new MultipartFile[] {multipartFile};
        SkillFileContentDto dto = new SkillFileContentDto();
        dto.setId(2L);
        dto.setName("SKILL.md");
        when(skillFileService.uploadFiles(12L, files)).thenReturn(List.of(dto));

        ApiResult<List<SkillFileContentDto>> result = skillFileController.upload(12L, files);

        assertThat(result.code()).isEqualTo(0);
        assertThat(result.data()).containsExactly(dto);
        verify(skillFileService, times(1)).uploadFiles(12L, files);
    }
}
