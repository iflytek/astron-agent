package com.iflytek.astron.console.toolkit.service.common;

import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.toolkit.util.S3Util;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ImageServiceTest {

    @Mock
    S3Util s3UtilClient;
    @InjectMocks
    ImageService service;

    private static final long FIVE_MB = 5L * 1024 * 1024;

    private static MultipartFile mockFile(String name, String contentType, byte[] bytes, Long sizeOverride) throws Exception {
        MultipartFile f = mock(MultipartFile.class);

        // These two are usually called, keep strict verification
        when(f.isEmpty()).thenReturn(bytes == null || bytes.length == 0);
        lenient().when(f.getContentType()).thenReturn(contentType);

        // These won't be called in some exception cases → mark as lenient to avoid unused stub warnings
        lenient().when(f.getOriginalFilename()).thenReturn(name);
        lenient().when(f.getInputStream()).thenReturn(new ByteArrayInputStream(bytes == null ? new byte[0] : bytes));
        lenient().when(f.getSize()).thenReturn(sizeOverride != null ? sizeOverride : (bytes == null ? 0L : (long) bytes.length));

        return f;
    }

    // ------------------ Normal path ------------------

    @Test
    @DisplayName("upload - known length: should use putObject(key, in, size, contentType) and return canonical objectKey")
    void upload_shouldPutWithKnownLength_andReturnObjectKey() throws Exception {
        byte[] data = "pngdata".getBytes();
        MultipartFile file = mockFile("avatar.png", "image/png", data, null);

        String key = service.upload(file);

        assertThat(key).matches(Pattern.compile("^icon/user/sparkBot_[0-9a-f]{32}\\.png$"));
        // Calling "known length" overload: 3rd param is long, 4th param is String
        verify(s3UtilClient, times(1))
                .putObject(eq(key), any(InputStream.class), eq((long) data.length), eq("image/png"));
        // Won't call "unknown length" overload: 3rd param is String, 4th param is long
        verify(s3UtilClient, never())
                .putObject(anyString(), any(InputStream.class), anyString(), anyLong());
        verifyNoMoreInteractions(s3UtilClient);
    }

    @Test
    @DisplayName("upload - unknown length (size=0): should use putObject(key, in, contentType, 5MB) and infer jpg suffix from Content-Type")
    void upload_shouldFallbackToMultipart_whenSizeIsZero() throws Exception {
        MultipartFile file = mockFile(null, "image/jpeg", "x".getBytes(), 0L); // size=0 triggers multipart upload

        String key = service.upload(file);

        assertThat(key).matches(Pattern.compile("^icon/user/sparkBot_[0-9a-f]{32}\\.jpg$"));
        verify(s3UtilClient, times(1))
                .putObject(eq(key), any(InputStream.class), eq("image/jpeg"), eq(FIVE_MB));
        verify(s3UtilClient, never())
                .putObject(anyString(), any(InputStream.class), anyLong(), anyString());
        verifyNoMoreInteractions(s3UtilClient);
    }

    @Test
    @DisplayName("upload - Fallback allowed: image/bmp not explicitly whitelisted but starts with image/, allow upload (no suffix)")
    void upload_shouldAllowFallbackImageSubtype() throws Exception {
        MultipartFile file = mockFile("file", "image/bmp", "bmp".getBytes(), null);

        String key = service.upload(file);

        // Cannot infer extension from filename/type → no suffix
        assertThat(key).matches(Pattern.compile("^icon/user/sparkBot_[0-9a-f]{32}$"));
        verify(s3UtilClient).putObject(eq(key), any(InputStream.class), eq(3L), eq("image/bmp"));
    }

    @Test
    @DisplayName("upload - filename contains dangerous characters: still gets svg suffix and uploads successfully")
    void upload_shouldSanitizeOriginalName_andKeepSvgExt() throws Exception {
        MultipartFile file = mockFile("../a b/..\\evil?.svg", "image/svg+xml", "svg".getBytes(), null);

        String key = service.upload(file);

        assertThat(key).matches(Pattern.compile("^icon/user/sparkBot_[0-9a-f]{32}\\.svg$"));
        verify(s3UtilClient).putObject(eq(key), any(InputStream.class), eq(3L), eq("image/svg+xml"));
    }

    @Test
    @DisplayName("upload - Content-Type has leading/trailing spaces/mixed case: should be normalized and allowed")
    void upload_shouldNormalizeContentType_andAllow() throws Exception {
        MultipartFile file = mockFile("a.jpg", "  image/JPEG  ", "abc".getBytes(), null);

        String key = service.upload(file);

        assertThat(key).matches(Pattern.compile("^icon/user/sparkBot_[0-9a-f]{32}\\.jpg$"));
        // Content-Type passed to putObject after normalization should be original value without spaces
        // (case preserved)
        verify(s3UtilClient).putObject(eq(key), any(InputStream.class), eq(3L), eq("image/JPEG"));
    }

    // ------------------ Boundary conditions ------------------

    @Test
    @DisplayName("upload - file==null: throws BusinessException and doesn't reach S3")
    void upload_nullFile_shouldThrow() {
        assertThatThrownBy(() -> service.upload(null))
                .isInstanceOf(BusinessException.class);
        verifyNoInteractions(s3UtilClient);
    }

    @Test
    @DisplayName("upload - empty file: throws BusinessException and doesn't reach S3")
    void upload_emptyFile_shouldThrow() throws Exception {
        MultipartFile file = mockFile("x.png", "image/png", new byte[0], 0L);
        when(file.isEmpty()).thenReturn(true);

        assertThatThrownBy(() -> service.upload(file))
                .isInstanceOf(BusinessException.class);
        verifyNoInteractions(s3UtilClient);
    }

    @Test
    @DisplayName("upload - contentType=null: not allowed, throws BusinessException")
    void upload_nullContentType_shouldThrow() throws Exception {
        MultipartFile file = mockFile("x", null, "a".getBytes(), null);

        assertThatThrownBy(() -> service.upload(file))
                .isInstanceOf(BusinessException.class);
        verifyNoInteractions(s3UtilClient);
    }

    @Test
    @DisplayName("upload - contentType is blank string: normalized to application/octet-stream → not allowed")
    void upload_blankContentType_shouldThrow() throws Exception {
        MultipartFile file = mockFile("x", "   ", "a".getBytes(), null);

        assertThatThrownBy(() -> service.upload(file))
                .isInstanceOf(BusinessException.class);
        verifyNoInteractions(s3UtilClient);
    }

    // ------------------ Exception path ------------------

    @Test
    @DisplayName("upload - S3 putObject throws error: should log and wrap as BusinessException(S3_UPLOAD_ERROR)")
    void upload_s3Throws_shouldWrapAsBusinessException() throws Exception {
        MultipartFile file = mockFile("a.png", "image/png", "abc".getBytes(), null);

        // Throw on putObject (known length branch)
        doThrow(new RuntimeException("s3 down"))
                .when(s3UtilClient)
                .putObject(anyString(), any(InputStream.class), anyLong(), anyString());

        assertThatThrownBy(() -> service.upload(file))
                .isInstanceOf(BusinessException.class);

        // At least tried to call S3 once
        verify(s3UtilClient).putObject(anyString(), any(InputStream.class), anyLong(), anyString());
    }
}
