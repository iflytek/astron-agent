package com.iflytek.astron.console.toolkit.controller.common;

import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.toolkit.service.common.ImageService;
import com.iflytek.astron.console.toolkit.util.S3Util;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link ImageController}.
 * <p>
 * Verifies file suffix validation, upload delegation, S3 URL generation and the wrapping of
 * responses into {@link ApiResult}. Also covers boundary and error branches.
 * </p>
 * <p>
 * Tech stack: JUnit 5 + Mockito + AssertJ.
 * </p>
 */
@ExtendWith(MockitoExtension.class)
class ImageControllerTest {

    @Mock
    private ImageService imageService;
    @Mock
    private S3Util s3UtilClient;

    @InjectMocks
    private ImageController controller;

    // ============== Happy path: png ==============

    /**
     * Test the happy path for {@code /image/upload}.
     * <p>
     * It should validate suffix, upload the file, generate the S3 URL, and wrap the payload into
     * {@link ApiResult}.
     * </p>
     *
     * @return nothing
     * @throws Exception no checked exceptions are expected in this test
     */
    @Test
    @DisplayName("upload - normal: validate suffix, upload, generate download link, and wrap as ApiResult")
    void upload_shouldUploadAndReturnApiResult() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.getOriginalFilename()).thenReturn("avatar.png");
        when(imageService.upload(file)).thenReturn("bucket/obj-1");
        when(s3UtilClient.getS3Url("bucket/obj-1")).thenReturn("http://s3/bucket/obj-1");

        @SuppressWarnings("unchecked")
        ApiResult<JSONObject> sentinel = (ApiResult<JSONObject>) mock(ApiResult.class);

        try (MockedStatic<ApiResult> mocked = mockStatic(ApiResult.class)) {
            ArgumentCaptor<JSONObject> jsonCap = ArgumentCaptor.forClass(JSONObject.class);
            mocked.when(() -> ApiResult.success(jsonCap.capture())).thenReturn(sentinel);

            ApiResult<JSONObject> ret = controller.upload(file);

            assertThat(ret).isSameAs(sentinel);

            // Verify order: upload first, then fetch URL
            InOrder inOrder = inOrder(imageService, s3UtilClient);
            inOrder.verify(imageService).upload(file);
            inOrder.verify(s3UtilClient).getS3Url("bucket/obj-1");

            // Verify JSON fields
            JSONObject body = jsonCap.getValue();
            assertThat(body.getString("s3Key")).isEqualTo("bucket/obj-1");
            assertThat(body.getString("downloadLink")).isEqualTo("http://s3/bucket/obj-1");

            verifyNoMoreInteractions(imageService, s3UtilClient);
        }
    }

    // ============== Boundary: allow uppercase/mixed-case suffix (JPEG/JPG/PNG) ==============

    /**
     * Test boundary where the file suffix is uppercase or mixed case.
     * <p>
     * Such suffixes should still be accepted and processed normally.
     * </p>
     *
     * @return nothing
     * @throws Exception no checked exceptions are expected in this test
     */
    @Test
    @DisplayName("upload - boundary: uppercase/mixed-case suffix should be accepted")
    void upload_shouldAcceptUppercaseSuffix() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.getOriginalFilename()).thenReturn("PHOTO.JPeG");
        when(imageService.upload(file)).thenReturn("k2");
        when(s3UtilClient.getS3Url("k2")).thenReturn("http://s3/k2");

        @SuppressWarnings("unchecked")
        ApiResult<JSONObject> sentinel = (ApiResult<JSONObject>) mock(ApiResult.class);

        try (MockedStatic<ApiResult> mocked = mockStatic(ApiResult.class)) {
            final JSONObject[] captured = new JSONObject[1];
            mocked.when(() -> ApiResult.success(any())).thenAnswer(inv -> {
                captured[0] = inv.getArgument(0);
                return sentinel;
            });

            ApiResult<JSONObject> ret = controller.upload(file);
            assertThat(ret).isSameAs(sentinel);
            assertThat(captured[0].getString("s3Key")).isEqualTo("k2");
            assertThat(captured[0].getString("downloadLink")).isEqualTo("http://s3/k2");
        }
    }

    // ============== Branch: illegal file name (null / no dot) ==============

    /**
     * Test branch where the original filename is {@code null}.
     * <p>
     * It should throw {@link BusinessException}.
     * </p>
     *
     * @return nothing
     * @throws BusinessException expected when filename is null
     */
    @Test
    @DisplayName("upload - illegal: null original filename should throw BusinessException")
    void upload_shouldThrow_whenFileNameNull() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.getOriginalFilename()).thenReturn(null);

        assertThatThrownBy(() -> controller.upload(file))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("common.response.failed");
        verifyNoInteractions(imageService, s3UtilClient);
    }

    /**
     * Test branch where the original filename does not contain a dot.
     * <p>
     * It should throw {@link BusinessException}.
     * </p>
     *
     * @return nothing
     * @throws BusinessException expected when suffix separator '.' is missing
     */
    @Test
    @DisplayName("upload - illegal: original filename without suffix dot should throw BusinessException")
    void upload_shouldThrow_whenNoDotInName() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.getOriginalFilename()).thenReturn("no_suffix");

        assertThatThrownBy(() -> controller.upload(file))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("common.response.failed");
        verifyNoInteractions(imageService, s3UtilClient);
    }

    // ============== Branch: unsupported suffix (gif, etc.) ==============

    /**
     * Test branch where the suffix is unsupported (e.g., {@code gif}).
     * <p>
     * It should throw {@link BusinessException}.
     * </p>
     *
     * @return nothing
     * @throws BusinessException expected for unsupported suffixes
     */
    @Test
    @DisplayName("upload - illegal: unsupported suffix (gif) should throw BusinessException")
    void upload_shouldThrow_whenUnsupportedSuffix() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.getOriginalFilename()).thenReturn("evil.gif");

        assertThatThrownBy(() -> controller.upload(file))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("common.response.failed");
        verifyNoInteractions(imageService, s3UtilClient);
    }

    // ============== Downstream failures: upload or getS3Url throws ==============

    /**
     * Test downstream failure when {@link ImageService#upload(MultipartFile)} throws an exception.
     * <p>
     * The exception should be propagated outward.
     * </p>
     *
     * @return nothing
     * @throws RuntimeException expected when the service layer fails on upload
     */
    @Test
    @DisplayName("upload - exception: imageService.upload throwing error should be propagated")
    void upload_shouldPropagate_whenServiceUploadFails() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.getOriginalFilename()).thenReturn("ok.jpg");
        when(imageService.upload(file)).thenThrow(new RuntimeException("S3 write fail"));

        assertThatThrownBy(() -> controller.upload(file))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("S3 write");
        verify(imageService).upload(file);
        verifyNoInteractions(s3UtilClient);
    }

    /**
     * Test downstream failure when {@link S3Util#getS3Url(String)} throws an exception.
     * <p>
     * The exception should be propagated outward.
     * </p>
     *
     * @return nothing
     * @throws IllegalStateException expected when generating the S3 URL fails
     */
    @Test
    @DisplayName("upload - exception: s3UtilClient.getS3Url throwing error should be propagated")
    void upload_shouldPropagate_whenGetUrlFails() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.getOriginalFilename()).thenReturn("ok.png");
        when(imageService.upload(file)).thenReturn("k3");
        when(s3UtilClient.getS3Url("k3")).thenThrow(new IllegalStateException("s3 error"));

        assertThatThrownBy(() -> controller.upload(file))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("s3 error");
        verify(imageService).upload(file);
        verify(s3UtilClient).getS3Url("k3");
    }
}
