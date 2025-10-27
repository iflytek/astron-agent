package com.iflytek.astron.console.toolkit.controller.knowledge;

import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.toolkit.entity.mongo.Knowledge;
import com.iflytek.astron.console.toolkit.entity.vo.repo.KnowledgeVO;
import com.iflytek.astron.console.toolkit.service.repo.KnowledgeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ExecutionException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for KnowledgeController
 *
 * <p>
 * Technology Stack: JUnit5 + Mockito + AssertJ
 * </p>
 *
 * <p>
 * Coverage Requirements:
 * </p>
 * <ul>
 * <li>JaCoCo Statement Coverage >= 80%</li>
 * <li>JaCoCo Branch Coverage >= 90%</li>
 * <li>High PIT Mutation Test Score</li>
 * <li>Covers normal flows, edge cases, and exceptions</li>
 * </ul>
 *
 * @author AI Assistant
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("KnowledgeController Unit Tests")
class KnowledgeControllerTest {

    @Mock
    private KnowledgeService knowledgeService;

    @InjectMocks
    private KnowledgeController knowledgeController;

    private Knowledge mockKnowledge;
    private KnowledgeVO knowledgeVO;

    /**
     * Set up test fixtures before each test method. Initializes common test data including mock
     * Knowledge entity and KnowledgeVO.
     */
    @BeforeEach
    void setUp() {
        // Initialize common test data
        mockKnowledge = Knowledge.builder()
                .id("knowledge-001")
                .fileId("file-001")
                .charCount(1000L)
                .enabled(1)
                .source(0)
                .testHitCount(0L)
                .dialogHitCount(0L)
                .coreRepoName("test-repo")
                .build();

        knowledgeVO = new KnowledgeVO();
        knowledgeVO.setId("knowledge-001");
        knowledgeVO.setFileId(1L);
        knowledgeVO.setContent("Test knowledge content");
    }

    /**
     * Test cases for the createKnowledge method. Validates knowledge creation functionality including
     * success scenarios and error handling.
     */
    @Nested
    @DisplayName("createKnowledge Tests")
    class CreateKnowledgeTests {

        /**
         * Test successful knowledge creation with valid input.
         *
         * @throws ExecutionException if the computation threw an exception
         * @throws InterruptedException if the current thread was interrupted
         */
        @Test
        @DisplayName("Create knowledge successfully with valid input")
        void testCreateKnowledge_Success() throws ExecutionException, InterruptedException {
            // Given
            when(knowledgeService.createKnowledge(any(KnowledgeVO.class))).thenReturn(mockKnowledge);

            // When
            ApiResult<Knowledge> result = knowledgeController.createKnowledge(knowledgeVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            assertThat(result.data()).isNotNull();
            assertThat(result.data().getId()).isEqualTo("knowledge-001");
            assertThat(result.data().getFileId()).isEqualTo("file-001");
            assertThat(result.data().getCharCount()).isEqualTo(1000L);

            verify(knowledgeService, times(1)).createKnowledge(any(KnowledgeVO.class));
        }

        /**
         * Test knowledge creation with empty VO object.
         *
         * @throws ExecutionException if the computation threw an exception
         * @throws InterruptedException if the current thread was interrupted
         */
        @Test
        @DisplayName("Create knowledge with empty VO object")
        void testCreateKnowledge_EmptyVO() throws ExecutionException, InterruptedException {
            // Given
            KnowledgeVO emptyVO = new KnowledgeVO();
            Knowledge emptyKnowledge = Knowledge.builder().build();
            when(knowledgeService.createKnowledge(any(KnowledgeVO.class))).thenReturn(emptyKnowledge);

            // When
            ApiResult<Knowledge> result = knowledgeController.createKnowledge(emptyVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            assertThat(result.data()).isNotNull();

            verify(knowledgeService, times(1)).createKnowledge(any(KnowledgeVO.class));
        }

        /**
         * Test knowledge creation when service throws RuntimeException.
         */
        @Test
        @DisplayName("Create knowledge - service throws RuntimeException")
        void testCreateKnowledge_ServiceThrowsRuntimeException() {
            // Given
            when(knowledgeService.createKnowledge(any(KnowledgeVO.class)))
                    .thenThrow(new RuntimeException("Service error"));

            // When & Then
            assertThatThrownBy(() -> knowledgeController.createKnowledge(knowledgeVO))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Service error");

            verify(knowledgeService, times(1)).createKnowledge(any(KnowledgeVO.class));
        }

        /**
         * Test knowledge creation when service throws BusinessException.
         */
        @Test
        @DisplayName("Create knowledge - service throws BusinessException")
        void testCreateKnowledge_ServiceThrowsBusinessException() {
            // Given
            when(knowledgeService.createKnowledge(any(KnowledgeVO.class)))
                    .thenThrow(new BusinessException(ResponseEnum.DATA_NOT_FOUND));

            // When & Then
            assertThatThrownBy(() -> knowledgeController.createKnowledge(knowledgeVO))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.DATA_NOT_FOUND);

            verify(knowledgeService, times(1)).createKnowledge(any(KnowledgeVO.class));
        }

        /**
         * Test knowledge creation when service returns null.
         *
         * @throws ExecutionException if the computation threw an exception
         * @throws InterruptedException if the current thread was interrupted
         */
        @Test
        @DisplayName("Create knowledge - service returns null")
        void testCreateKnowledge_ServiceReturnsNull() throws ExecutionException, InterruptedException {
            // Given
            when(knowledgeService.createKnowledge(any(KnowledgeVO.class))).thenReturn(null);

            // When
            ApiResult<Knowledge> result = knowledgeController.createKnowledge(knowledgeVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            assertThat(result.data()).isNull();

            verify(knowledgeService, times(1)).createKnowledge(any(KnowledgeVO.class));
        }
    }

    /**
     * Test cases for the updateKnowledge method. Validates knowledge update functionality including tag
     * validation and error handling.
     */
    @Nested
    @DisplayName("updateKnowledge Tests")
    class UpdateKnowledgeTests {

        /**
         * Test successful knowledge update without tags.
         *
         * @throws ExecutionException if the computation threw an exception
         * @throws InterruptedException if the current thread was interrupted
         */
        @Test
        @DisplayName("Update knowledge successfully without tags")
        void testUpdateKnowledge_NoTags_Success() throws ExecutionException, InterruptedException {
            // Given
            knowledgeVO.setTags(null);
            when(knowledgeService.updateKnowledge(any(KnowledgeVO.class))).thenReturn(mockKnowledge);

            // When
            ApiResult<Knowledge> result = knowledgeController.updateKnowledge(knowledgeVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            assertThat(result.data()).isNotNull();
            assertThat(result.data().getId()).isEqualTo("knowledge-001");

            verify(knowledgeService, times(1)).updateKnowledge(any(KnowledgeVO.class));
        }

        /**
         * Test successful knowledge update with empty tags list.
         *
         * @throws ExecutionException if the computation threw an exception
         * @throws InterruptedException if the current thread was interrupted
         */
        @Test
        @DisplayName("Update knowledge successfully with empty tags list")
        void testUpdateKnowledge_EmptyTags_Success() throws ExecutionException, InterruptedException {
            // Given
            knowledgeVO.setTags(Collections.emptyList());
            when(knowledgeService.updateKnowledge(any(KnowledgeVO.class))).thenReturn(mockKnowledge);

            // When
            ApiResult<Knowledge> result = knowledgeController.updateKnowledge(knowledgeVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            assertThat(result.data()).isNotNull();

            verify(knowledgeService, times(1)).updateKnowledge(any(KnowledgeVO.class));
        }

        /**
         * Test knowledge update with tag length equal to 30 (boundary value).
         *
         * @throws ExecutionException if the computation threw an exception
         * @throws InterruptedException if the current thread was interrupted
         */
        @Test
        @DisplayName("Update knowledge - tag length equals 30 (boundary value)")
        void testUpdateKnowledge_TagLengthEquals30_Success() throws ExecutionException, InterruptedException {
            // Given - Tag with exactly 30 characters
            String tag30Chars = "123456789012345678901234567890"; // 30 characters
            knowledgeVO.setTags(Collections.singletonList(tag30Chars));
            when(knowledgeService.updateKnowledge(any(KnowledgeVO.class))).thenReturn(mockKnowledge);

            // When
            ApiResult<Knowledge> result = knowledgeController.updateKnowledge(knowledgeVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            assertThat(result.data()).isNotNull();

            verify(knowledgeService, times(1)).updateKnowledge(any(KnowledgeVO.class));
        }

        /**
         * Test knowledge update with tag length equal to 29 (boundary value).
         *
         * @throws ExecutionException if the computation threw an exception
         * @throws InterruptedException if the current thread was interrupted
         */
        @Test
        @DisplayName("Update knowledge - tag length equals 29 (boundary value)")
        void testUpdateKnowledge_TagLengthEquals29_Success() throws ExecutionException, InterruptedException {
            // Given - Tag with 29 characters
            String tag29Chars = "12345678901234567890123456789"; // 29 characters
            knowledgeVO.setTags(Collections.singletonList(tag29Chars));
            when(knowledgeService.updateKnowledge(any(KnowledgeVO.class))).thenReturn(mockKnowledge);

            // When
            ApiResult<Knowledge> result = knowledgeController.updateKnowledge(knowledgeVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);

            verify(knowledgeService, times(1)).updateKnowledge(any(KnowledgeVO.class));
        }

        /**
         * Test knowledge update with tag length exceeding 30 (throws exception).
         */
        @Test
        @DisplayName("Update knowledge - tag length exceeds 30 (throws exception)")
        void testUpdateKnowledge_TagLengthExceeds30_ThrowsException() {
            // Given - Tag with 31 characters
            String tag31Chars = "1234567890123456789012345678901"; // 31 characters
            knowledgeVO.setTags(Collections.singletonList(tag31Chars));

            // When & Then
            assertThatThrownBy(() -> knowledgeController.updateKnowledge(knowledgeVO))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_KNOWLEDGE_TAG_TOO_LONG);

            verify(knowledgeService, never()).updateKnowledge(any(KnowledgeVO.class));
        }

        /**
         * Test knowledge update with multiple tags where one exceeds limit.
         */
        @Test
        @DisplayName("Update knowledge - multiple tags with one exceeding limit")
        void testUpdateKnowledge_MultipleTagsOneExceedsLimit_ThrowsException() {
            // Given
            List<String> tags = Arrays.asList(
                    "validTag1",
                    "validTag2",
                    "1234567890123456789012345678901" // 31 characters, too long
            );
            knowledgeVO.setTags(tags);

            // When & Then
            assertThatThrownBy(() -> knowledgeController.updateKnowledge(knowledgeVO))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_KNOWLEDGE_TAG_TOO_LONG);

            verify(knowledgeService, never()).updateKnowledge(any(KnowledgeVO.class));
        }

        /**
         * Test knowledge update with first tag exceeding limit.
         */
        @Test
        @DisplayName("Update knowledge - first tag exceeds limit")
        void testUpdateKnowledge_FirstTagExceedsLimit_ThrowsException() {
            // Given
            List<String> tags = Arrays.asList(
                    "1234567890123456789012345678901", // 31 characters, too long
                    "validTag");
            knowledgeVO.setTags(tags);

            // When & Then
            assertThatThrownBy(() -> knowledgeController.updateKnowledge(knowledgeVO))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_KNOWLEDGE_TAG_TOO_LONG);

            verify(knowledgeService, never()).updateKnowledge(any(KnowledgeVO.class));
        }

        /**
         * Test knowledge update with tags containing empty string.
         *
         * @throws ExecutionException if the computation threw an exception
         * @throws InterruptedException if the current thread was interrupted
         */
        @Test
        @DisplayName("Update knowledge - tags contain empty string")
        void testUpdateKnowledge_TagsContainEmptyString_Success() throws ExecutionException, InterruptedException {
            // Given
            List<String> tags = Arrays.asList("tag1", "", "tag3");
            knowledgeVO.setTags(tags);
            when(knowledgeService.updateKnowledge(any(KnowledgeVO.class))).thenReturn(mockKnowledge);

            // When
            ApiResult<Knowledge> result = knowledgeController.updateKnowledge(knowledgeVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);

            verify(knowledgeService, times(1)).updateKnowledge(any(KnowledgeVO.class));
        }

        /**
         * Test knowledge update with tags containing single character.
         *
         * @throws ExecutionException if the computation threw an exception
         * @throws InterruptedException if the current thread was interrupted
         */
        @Test
        @DisplayName("Update knowledge - tags contain single character")
        void testUpdateKnowledge_TagsContainSingleChar_Success() throws ExecutionException, InterruptedException {
            // Given
            List<String> tags = Collections.singletonList("x");
            knowledgeVO.setTags(tags);
            when(knowledgeService.updateKnowledge(any(KnowledgeVO.class))).thenReturn(mockKnowledge);

            // When
            ApiResult<Knowledge> result = knowledgeController.updateKnowledge(knowledgeVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);

            verify(knowledgeService, times(1)).updateKnowledge(any(KnowledgeVO.class));
        }

        /**
         * Test knowledge update when service throws RuntimeException.
         */
        @Test
        @DisplayName("Update knowledge - service throws RuntimeException")
        void testUpdateKnowledge_ServiceThrowsRuntimeException() {
            // Given
            knowledgeVO.setTags(Collections.singletonList("validTag"));
            when(knowledgeService.updateKnowledge(any(KnowledgeVO.class)))
                    .thenThrow(new RuntimeException("Update failed"));

            // When & Then
            assertThatThrownBy(() -> knowledgeController.updateKnowledge(knowledgeVO))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Update failed");

            verify(knowledgeService, times(1)).updateKnowledge(any(KnowledgeVO.class));
        }

        /**
         * Test knowledge update when service throws BusinessException.
         */
        @Test
        @DisplayName("Update knowledge - service throws BusinessException")
        void testUpdateKnowledge_ServiceThrowsBusinessException() {
            // Given
            knowledgeVO.setTags(Collections.singletonList("validTag"));
            when(knowledgeService.updateKnowledge(any(KnowledgeVO.class)))
                    .thenThrow(new BusinessException(ResponseEnum.REPO_KNOWLEDGE_NOT_EXIST));

            // When & Then
            assertThatThrownBy(() -> knowledgeController.updateKnowledge(knowledgeVO))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_KNOWLEDGE_NOT_EXIST);

            verify(knowledgeService, times(1)).updateKnowledge(any(KnowledgeVO.class));
        }

        /**
         * Test knowledge update with tag too long and service not called.
         */
        @Test
        @DisplayName("Update knowledge - tag too long and service not called")
        void testUpdateKnowledge_TagTooLong_ServiceNotCalled() {
            // Given
            String longTag = "x".repeat(31); // 31 characters
            knowledgeVO.setTags(Collections.singletonList(longTag));

            // When & Then
            assertThatThrownBy(() -> knowledgeController.updateKnowledge(knowledgeVO))
                    .isInstanceOf(BusinessException.class);

            // Verify service method was not called
            verify(knowledgeService, never()).updateKnowledge(any(KnowledgeVO.class));
        }

        /**
         * Test knowledge update with valid tags.
         *
         * @throws ExecutionException if the computation threw an exception
         * @throws InterruptedException if the current thread was interrupted
         */
        @Test
        @DisplayName("Update knowledge - with valid tags")
        void testUpdateKnowledge_ValidTags_Success() throws ExecutionException, InterruptedException {
            // Given - 10 characters
            String validTag = "TestTag123"; // 10 characters
            knowledgeVO.setTags(Collections.singletonList(validTag));
            when(knowledgeService.updateKnowledge(any(KnowledgeVO.class))).thenReturn(mockKnowledge);

            // When
            ApiResult<Knowledge> result = knowledgeController.updateKnowledge(knowledgeVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);

            verify(knowledgeService, times(1)).updateKnowledge(any(KnowledgeVO.class));
        }

        /**
         * Test knowledge update with tags that are too long.
         */
        @Test
        @DisplayName("Update knowledge - with tags that are too long")
        void testUpdateKnowledge_TagsTooLong_ThrowsException() {
            // Given - 31 characters
            String longTag = "VeryLongTagForBoundaryTest12345"; // 31 characters
            assertThat(longTag.length()).isEqualTo(31); // Verify it's indeed 31 characters
            knowledgeVO.setTags(Collections.singletonList(longTag));

            // When & Then
            assertThatThrownBy(() -> knowledgeController.updateKnowledge(knowledgeVO))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_KNOWLEDGE_TAG_TOO_LONG);

            verify(knowledgeService, never()).updateKnowledge(any(KnowledgeVO.class));
        }

        /**
         * Test knowledge update with many valid tags.
         *
         * @throws ExecutionException if the computation threw an exception
         * @throws InterruptedException if the current thread was interrupted
         */
        @Test
        @DisplayName("Update knowledge - with many valid tags")
        void testUpdateKnowledge_ManyValidTags_Success() throws ExecutionException, InterruptedException {
            // Given
            List<String> tags = new ArrayList<>();
            for (int i = 0; i < 100; i++) {
                tags.add("tag" + i); // Each tag does not exceed 30 characters
            }
            knowledgeVO.setTags(tags);
            when(knowledgeService.updateKnowledge(any(KnowledgeVO.class))).thenReturn(mockKnowledge);

            // When
            ApiResult<Knowledge> result = knowledgeController.updateKnowledge(knowledgeVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);

            verify(knowledgeService, times(1)).updateKnowledge(any(KnowledgeVO.class));
        }
    }

    /**
     * Test cases for the enableKnowledge method. Validates knowledge enable/disable functionality and
     * various input scenarios.
     */
    @Nested
    @DisplayName("enableKnowledge Tests")
    class EnableKnowledgeTests {

        /**
         * Test enabling knowledge with enabled=1.
         *
         * @throws ExecutionException if the computation threw an exception
         * @throws InterruptedException if the current thread was interrupted
         */
        @Test
        @DisplayName("Enable knowledge successfully with enabled=1")
        void testEnableKnowledge_EnableSuccess() throws ExecutionException, InterruptedException {
            // Given
            String knowledgeId = "knowledge-001";
            Integer enabled = 1;
            String expectedMessage = "Knowledge enabled successfully";
            when(knowledgeService.enableKnowledge(anyString(), anyInt())).thenReturn(expectedMessage);

            // When
            ApiResult<String> result = knowledgeController.enableKnowledge(knowledgeId, enabled);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            assertThat(result.data()).isEqualTo(expectedMessage);

            verify(knowledgeService, times(1)).enableKnowledge(eq(knowledgeId), eq(enabled));
        }

        /**
         * Test disabling knowledge with enabled=0.
         *
         * @throws ExecutionException if the computation threw an exception
         * @throws InterruptedException if the current thread was interrupted
         */
        @Test
        @DisplayName("Disable knowledge successfully with enabled=0")
        void testEnableKnowledge_DisableSuccess() throws ExecutionException, InterruptedException {
            // Given
            String knowledgeId = "knowledge-002";
            Integer enabled = 0;
            String expectedMessage = "Knowledge disabled successfully";
            when(knowledgeService.enableKnowledge(anyString(), anyInt())).thenReturn(expectedMessage);

            // When
            ApiResult<String> result = knowledgeController.enableKnowledge(knowledgeId, enabled);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            assertThat(result.data()).isEqualTo(expectedMessage);

            verify(knowledgeService, times(1)).enableKnowledge(eq(knowledgeId), eq(enabled));
        }

        /**
         * Test enabling knowledge with empty string ID.
         *
         * @throws ExecutionException if the computation threw an exception
         * @throws InterruptedException if the current thread was interrupted
         */
        @Test
        @DisplayName("Enable knowledge with empty string ID")
        void testEnableKnowledge_EmptyId() throws ExecutionException, InterruptedException {
            // Given
            String knowledgeId = "";
            Integer enabled = 1;
            when(knowledgeService.enableKnowledge(anyString(), anyInt())).thenReturn("success");

            // When
            ApiResult<String> result = knowledgeController.enableKnowledge(knowledgeId, enabled);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);

            verify(knowledgeService, times(1)).enableKnowledge(eq(knowledgeId), eq(enabled));
        }

        /**
         * Test enabling knowledge with non-standard enabled value.
         *
         * @throws ExecutionException if the computation threw an exception
         * @throws InterruptedException if the current thread was interrupted
         */
        @Test
        @DisplayName("Enable knowledge with non-standard enabled value")
        void testEnableKnowledge_NonStandardEnabledValue() throws ExecutionException, InterruptedException {
            // Given
            String knowledgeId = "knowledge-003";
            Integer enabled = 999; // Non-standard value
            when(knowledgeService.enableKnowledge(anyString(), anyInt())).thenReturn("success");

            // When
            ApiResult<String> result = knowledgeController.enableKnowledge(knowledgeId, enabled);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);

            verify(knowledgeService, times(1)).enableKnowledge(eq(knowledgeId), eq(enabled));
        }

        /**
         * Test enabling knowledge when service throws RuntimeException.
         */
        @Test
        @DisplayName("Enable knowledge - service throws RuntimeException")
        void testEnableKnowledge_ServiceThrowsRuntimeException() {
            // Given
            String knowledgeId = "knowledge-001";
            Integer enabled = 1;
            when(knowledgeService.enableKnowledge(anyString(), anyInt()))
                    .thenThrow(new RuntimeException("Enable failed"));

            // When & Then
            assertThatThrownBy(() -> knowledgeController.enableKnowledge(knowledgeId, enabled))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Enable failed");

            verify(knowledgeService, times(1)).enableKnowledge(eq(knowledgeId), eq(enabled));
        }

        /**
         * Test enabling knowledge when service throws BusinessException.
         */
        @Test
        @DisplayName("Enable knowledge - service throws BusinessException")
        void testEnableKnowledge_ServiceThrowsBusinessException() {
            // Given
            String knowledgeId = "knowledge-001";
            Integer enabled = 1;
            when(knowledgeService.enableKnowledge(anyString(), anyInt()))
                    .thenThrow(new BusinessException(ResponseEnum.REPO_KNOWLEDGE_NOT_EXIST));

            // When & Then
            assertThatThrownBy(() -> knowledgeController.enableKnowledge(knowledgeId, enabled))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_KNOWLEDGE_NOT_EXIST);

            verify(knowledgeService, times(1)).enableKnowledge(eq(knowledgeId), eq(enabled));
        }

        /**
         * Test enabling knowledge when service returns null.
         *
         * @throws ExecutionException if the computation threw an exception
         * @throws InterruptedException if the current thread was interrupted
         */
        @Test
        @DisplayName("Enable knowledge - service returns null")
        void testEnableKnowledge_ServiceReturnsNull() throws ExecutionException, InterruptedException {
            // Given
            String knowledgeId = "knowledge-001";
            Integer enabled = 1;
            when(knowledgeService.enableKnowledge(anyString(), anyInt())).thenReturn(null);

            // When
            ApiResult<String> result = knowledgeController.enableKnowledge(knowledgeId, enabled);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            assertThat(result.data()).isNull();

            verify(knowledgeService, times(1)).enableKnowledge(eq(knowledgeId), eq(enabled));
        }

        /**
         * Test enabling knowledge when service returns empty string.
         *
         * @throws ExecutionException if the computation threw an exception
         * @throws InterruptedException if the current thread was interrupted
         */
        @Test
        @DisplayName("Enable knowledge - service returns empty string")
        void testEnableKnowledge_ServiceReturnsEmptyString() throws ExecutionException, InterruptedException {
            // Given
            String knowledgeId = "knowledge-001";
            Integer enabled = 1;
            when(knowledgeService.enableKnowledge(anyString(), anyInt())).thenReturn("");

            // When
            ApiResult<String> result = knowledgeController.enableKnowledge(knowledgeId, enabled);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            assertThat(result.data()).isEmpty();

            verify(knowledgeService, times(1)).enableKnowledge(eq(knowledgeId), eq(enabled));
        }

        /**
         * Test enabling knowledge with negative enabled value.
         *
         * @throws ExecutionException if the computation threw an exception
         * @throws InterruptedException if the current thread was interrupted
         */
        @Test
        @DisplayName("Enable knowledge with negative enabled value")
        void testEnableKnowledge_NegativeEnabledValue() throws ExecutionException, InterruptedException {
            // Given
            String knowledgeId = "knowledge-001";
            Integer enabled = -1;
            when(knowledgeService.enableKnowledge(anyString(), anyInt())).thenReturn("success");

            // When
            ApiResult<String> result = knowledgeController.enableKnowledge(knowledgeId, enabled);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);

            verify(knowledgeService, times(1)).enableKnowledge(eq(knowledgeId), eq(enabled));
        }
    }

    /**
     * Test cases for the deleteKnowledge method. Validates knowledge deletion functionality with
     * various scenarios.
     */
    @Nested
    @DisplayName("deleteKnowledge Tests")
    class DeleteKnowledgeTests {

        /**
         * Test successful knowledge deletion.
         */
        @Test
        @DisplayName("Delete knowledge successfully")
        void testDeleteKnowledge_Success() {
            // Given
            String knowledgeId = "knowledge-001";
            doNothing().when(knowledgeService).deleteKnowledge(anyString());

            // When
            ApiResult<Void> result = knowledgeController.deleteKnowledge(knowledgeId);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            assertThat(result.data()).isNull();

            verify(knowledgeService, times(1)).deleteKnowledge(eq(knowledgeId));
        }

        /**
         * Test deleting knowledge with empty string ID.
         */
        @Test
        @DisplayName("Delete knowledge with empty string ID")
        void testDeleteKnowledge_EmptyId() {
            // Given
            String knowledgeId = "";
            doNothing().when(knowledgeService).deleteKnowledge(anyString());

            // When
            ApiResult<Void> result = knowledgeController.deleteKnowledge(knowledgeId);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);

            verify(knowledgeService, times(1)).deleteKnowledge(eq(knowledgeId));
        }

        /**
         * Test deleting knowledge with null ID.
         */
        @Test
        @DisplayName("Delete knowledge with null ID")
        void testDeleteKnowledge_NullId() {
            // Given
            String knowledgeId = null;
            doNothing().when(knowledgeService).deleteKnowledge(nullable(String.class));

            // When
            ApiResult<Void> result = knowledgeController.deleteKnowledge(knowledgeId);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);

            verify(knowledgeService, times(1)).deleteKnowledge(isNull());
        }

        /**
         * Test deleting knowledge when service throws RuntimeException.
         */
        @Test
        @DisplayName("Delete knowledge - service throws RuntimeException")
        void testDeleteKnowledge_ServiceThrowsRuntimeException() {
            // Given
            String knowledgeId = "knowledge-001";
            doThrow(new RuntimeException("Delete failed"))
                    .when(knowledgeService)
                    .deleteKnowledge(anyString());

            // When & Then
            assertThatThrownBy(() -> knowledgeController.deleteKnowledge(knowledgeId))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Delete failed");

            verify(knowledgeService, times(1)).deleteKnowledge(eq(knowledgeId));
        }

        /**
         * Test deleting knowledge when service throws BusinessException.
         */
        @Test
        @DisplayName("Delete knowledge - service throws BusinessException")
        void testDeleteKnowledge_ServiceThrowsBusinessException() {
            // Given
            String knowledgeId = "knowledge-001";
            doThrow(new BusinessException(ResponseEnum.REPO_KNOWLEDGE_NOT_EXIST))
                    .when(knowledgeService)
                    .deleteKnowledge(anyString());

            // When & Then
            assertThatThrownBy(() -> knowledgeController.deleteKnowledge(knowledgeId))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_KNOWLEDGE_NOT_EXIST);

            verify(knowledgeService, times(1)).deleteKnowledge(eq(knowledgeId));
        }

        /**
         * Test multiple deletions of the same ID.
         */
        @Test
        @DisplayName("Delete knowledge - multiple deletions of the same ID")
        void testDeleteKnowledge_MultipleDeletionsSameId() {
            // Given
            String knowledgeId = "knowledge-001";
            doNothing().when(knowledgeService).deleteKnowledge(anyString());

            // When
            ApiResult<Void> result1 = knowledgeController.deleteKnowledge(knowledgeId);
            ApiResult<Void> result2 = knowledgeController.deleteKnowledge(knowledgeId);

            // Then
            assertThat(result1).isNotNull();
            assertThat(result1.code()).isEqualTo(0);
            assertThat(result2).isNotNull();
            assertThat(result2.code()).isEqualTo(0);

            verify(knowledgeService, times(2)).deleteKnowledge(eq(knowledgeId));
        }

        /**
         * Test deleting knowledge with long ID string.
         */
        @Test
        @DisplayName("Delete knowledge with long ID string")
        void testDeleteKnowledge_LongId() {
            // Given
            String longId = "knowledge-" + "x".repeat(1000);
            doNothing().when(knowledgeService).deleteKnowledge(anyString());

            // When
            ApiResult<Void> result = knowledgeController.deleteKnowledge(longId);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);

            verify(knowledgeService, times(1)).deleteKnowledge(eq(longId));
        }

        /**
         * Test deleting knowledge with special character ID.
         */
        @Test
        @DisplayName("Delete knowledge with special character ID")
        void testDeleteKnowledge_SpecialCharacterId() {
            // Given
            String specialId = "knowledge-!@#$%^&*()";
            doNothing().when(knowledgeService).deleteKnowledge(anyString());

            // When
            ApiResult<Void> result = knowledgeController.deleteKnowledge(specialId);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);

            verify(knowledgeService, times(1)).deleteKnowledge(eq(specialId));
        }
    }

    /**
     * Integration scenario tests. Tests complete workflows combining multiple operations.
     */
    @Nested
    @DisplayName("Integration Scenario Tests")
    class IntegrationScenarioTests {

        /**
         * Test full lifecycle: create, update, enable, and delete knowledge.
         *
         * @throws ExecutionException if the computation threw an exception
         * @throws InterruptedException if the current thread was interrupted
         */
        @Test
        @DisplayName("Full lifecycle - create, update, enable, and delete")
        void testFullLifecycle() throws ExecutionException, InterruptedException {
            // Given
            String knowledgeId = "knowledge-full-test";
            KnowledgeVO createVO = new KnowledgeVO();
            createVO.setContent("Initial content");

            Knowledge createdKnowledge = Knowledge.builder()
                    .id(knowledgeId)
                    .enabled(0)
                    .build();

            Knowledge updatedKnowledge = Knowledge.builder()
                    .id(knowledgeId)
                    .enabled(0)
                    .build();

            when(knowledgeService.createKnowledge(any(KnowledgeVO.class))).thenReturn(createdKnowledge);
            when(knowledgeService.updateKnowledge(any(KnowledgeVO.class))).thenReturn(updatedKnowledge);
            when(knowledgeService.enableKnowledge(anyString(), anyInt())).thenReturn("enabled");
            doNothing().when(knowledgeService).deleteKnowledge(anyString());

            // When - Create
            ApiResult<Knowledge> createResult = knowledgeController.createKnowledge(createVO);
            assertThat(createResult.code()).isEqualTo(0);
            assertThat(createResult.data().getId()).isEqualTo(knowledgeId);

            // When - Update
            KnowledgeVO updateVO = new KnowledgeVO();
            updateVO.setId(knowledgeId);
            updateVO.setContent("Updated content");
            updateVO.setTags(Arrays.asList("tag1", "tag2"));
            ApiResult<Knowledge> updateResult = knowledgeController.updateKnowledge(updateVO);
            assertThat(updateResult.code()).isEqualTo(0);

            // When - Enable
            ApiResult<String> enableResult = knowledgeController.enableKnowledge(knowledgeId, 1);
            assertThat(enableResult.code()).isEqualTo(0);

            // When - Delete
            ApiResult<Void> deleteResult = knowledgeController.deleteKnowledge(knowledgeId);
            assertThat(deleteResult.code()).isEqualTo(0);

            // Then - Verify all invocations
            verify(knowledgeService, times(1)).createKnowledge(any(KnowledgeVO.class));
            verify(knowledgeService, times(1)).updateKnowledge(any(KnowledgeVO.class));
            verify(knowledgeService, times(1)).enableKnowledge(eq(knowledgeId), eq(1));
            verify(knowledgeService, times(1)).deleteKnowledge(eq(knowledgeId));
        }

        /**
         * Test boundary scenario where all tags have exactly 30 characters.
         *
         * @throws ExecutionException if the computation threw an exception
         * @throws InterruptedException if the current thread was interrupted
         */
        @Test
        @DisplayName("Boundary scenario - all tags have 30 characters")
        void testBoundaryScenario_AllTags30Chars() throws ExecutionException, InterruptedException {
            // Given
            List<String> tags = Arrays.asList(
                    "123456789012345678901234567890", // 30 chars
                    "abcdefghijklmnopqrstuvwxyz1234", // 30 chars
                    "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234" // 30 chars
            );
            knowledgeVO.setTags(tags);
            when(knowledgeService.updateKnowledge(any(KnowledgeVO.class))).thenReturn(mockKnowledge);

            // When
            ApiResult<Knowledge> result = knowledgeController.updateKnowledge(knowledgeVO);

            // Then
            assertThat(result.code()).isEqualTo(0);
            verify(knowledgeService, times(1)).updateKnowledge(any(KnowledgeVO.class));
        }

        /**
         * Test error scenario where tag validation fails and service is not called.
         */
        @Test
        @DisplayName("Error scenario - tag validation fails and service is not called")
        void testErrorScenario_TagValidationFailsNoServiceCall() {
            // Given
            knowledgeVO.setTags(Collections.singletonList("x".repeat(31)));

            // When & Then
            assertThatThrownBy(() -> knowledgeController.updateKnowledge(knowledgeVO))
                    .isInstanceOf(BusinessException.class);

            // Ensure service method is never called
            verifyNoInteractions(knowledgeService);
        }
    }

    /**
     * Parameter validation tests. Tests handling of null and edge-case parameter values.
     */
    @Nested
    @DisplayName("Parameter Validation Tests")
    class ParameterValidationTests {

        /**
         * Test createKnowledge with null parameter.
         *
         * @throws ExecutionException if the computation threw an exception
         * @throws InterruptedException if the current thread was interrupted
         */
        @Test
        @DisplayName("createKnowledge with null parameter")
        void testCreateKnowledge_NullParameter() throws ExecutionException, InterruptedException {
            // Given
            when(knowledgeService.createKnowledge(null)).thenReturn(null);

            // When
            ApiResult<Knowledge> result = knowledgeController.createKnowledge(null);

            // Then
            assertThat(result).isNotNull();
            verify(knowledgeService, times(1)).createKnowledge(null);
        }

        /**
         * Test updateKnowledge with all VO fields being null.
         *
         * @throws ExecutionException if the computation threw an exception
         * @throws InterruptedException if the current thread was interrupted
         */
        @Test
        @DisplayName("updateKnowledge with all VO fields being null")
        void testUpdateKnowledge_AllFieldsNull() throws ExecutionException, InterruptedException {
            // Given
            KnowledgeVO emptyVO = new KnowledgeVO();
            when(knowledgeService.updateKnowledge(any(KnowledgeVO.class))).thenReturn(mockKnowledge);

            // When
            ApiResult<Knowledge> result = knowledgeController.updateKnowledge(emptyVO);

            // Then
            assertThat(result.code()).isEqualTo(0);
            verify(knowledgeService, times(1)).updateKnowledge(any(KnowledgeVO.class));
        }

        /**
         * Test enableKnowledge with null parameters.
         *
         * @throws ExecutionException if the computation threw an exception
         * @throws InterruptedException if the current thread was interrupted
         */
        @Test
        @DisplayName("enableKnowledge with null parameters")
        void testEnableKnowledge_NullParameters() throws ExecutionException, InterruptedException {
            // Given
            when(knowledgeService.enableKnowledge(nullable(String.class), nullable(Integer.class)))
                    .thenReturn("success");

            // When
            ApiResult<String> result = knowledgeController.enableKnowledge(null, null);

            // Then
            assertThat(result.code()).isEqualTo(0);
            verify(knowledgeService, times(1)).enableKnowledge(isNull(), isNull());
        }
    }
}
