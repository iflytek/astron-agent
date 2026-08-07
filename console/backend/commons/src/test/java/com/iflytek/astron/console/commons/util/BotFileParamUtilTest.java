package com.iflytek.astron.console.commons.util;

import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.entity.bot.UserLangChainInfo;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mockStatic;

class BotFileParamUtilTest {

    // ==================== getOldExtraInputsConfig Tests ====================

    @Test
    void testGetOldExtraInputsConfig_SimpleFormat() {
        try (MockedStatic<MaasUtil> maasUtilMock = mockStatic(MaasUtil.class)) {
            maasUtilMock.when(() -> MaasUtil.getFileType(anyString(), any(JSONObject.class)))
                    .thenReturn(1); // DOC type

            UserLangChainInfo info = UserLangChainInfo.builder()
                    .extraInputs("{\"file\":\"pdf\",\"required\":true}")
                    .build();

            List<JSONObject> result = BotFileParamUtil.getOldExtraInputsConfig(info);

            assertNotNull(result);
            assertEquals(1, result.size());

            JSONObject item = result.get(0);
            assertEquals("file", item.getString("name"));
            assertEquals("pdf", item.getString("type"));
            assertEquals(true, item.getBoolean("required"));
            assertEquals("document", item.getString("icon"));
            assertEquals("pdf", item.getString("tip"));
            assertEquals(".pdf", item.getString("accept"));
            assertEquals(1, item.getInteger("value"));
        }
    }

    @Test
    void testGetOldExtraInputsConfig_ComplexFormat() {
        try (MockedStatic<MaasUtil> maasUtilMock = mockStatic(MaasUtil.class)) {
            maasUtilMock.when(() -> MaasUtil.getFileType(anyString(), any(JSONObject.class)))
                    .thenReturn(2); // IMG type

            UserLangChainInfo info = UserLangChainInfo.builder()
                    .extraInputs("{\"name\":\"image\",\"type\":\"png\",\"required\":false,\"schema\":{\"maxSize\":5},\"other\":\"value\"}")
                    .build();

            List<JSONObject> result = BotFileParamUtil.getOldExtraInputsConfig(info);

            assertNotNull(result);
            assertEquals(1, result.size());

            JSONObject item = result.get(0);
            assertEquals("image", item.getString("name"));
            assertEquals("png", item.getString("type"));
            assertEquals(false, item.getBoolean("required"));
            assertNotNull(item.get("schema"));
            assertEquals("image", item.getString("icon"));
            assertEquals("Image", item.getString("tip"));
            assertEquals(".png,.jpg,.jpeg", item.getString("accept"));
            assertEquals(2, item.getInteger("value"));
        }
    }

    @Test
    void testGetOldExtraInputsConfig_AudioType() {
        try (MockedStatic<MaasUtil> maasUtilMock = mockStatic(MaasUtil.class)) {
            maasUtilMock.when(() -> MaasUtil.getFileType(anyString(), any(JSONObject.class)))
                    .thenReturn(7); // AUDIO type

            UserLangChainInfo info = UserLangChainInfo.builder()
                    .extraInputs("{\"audio\":\"mp3\",\"required\":true}")
                    .build();

            List<JSONObject> result = BotFileParamUtil.getOldExtraInputsConfig(info);

            assertNotNull(result);
            assertEquals(1, result.size());

            JSONObject item = result.get(0);
            assertEquals("audio", item.getString("name"));
            assertEquals("mp3", item.getString("type"));
            assertEquals(true, item.getBoolean("required"));
            assertEquals("audio", item.getString("icon"));
            assertEquals("Audio", item.getString("tip"));
            assertEquals(7, item.getInteger("value"));
        }
    }

    @Test
    void testGetOldExtraInputsConfig_UnknownTypeReturnsNone() {
        try (MockedStatic<MaasUtil> maasUtilMock = mockStatic(MaasUtil.class)) {
            maasUtilMock.when(() -> MaasUtil.getFileType(anyString(), any(JSONObject.class)))
                    .thenReturn(999); // Unknown type, should default to NONE

            UserLangChainInfo info = UserLangChainInfo.builder()
                    .extraInputs("{\"file\":\"unknown\"}")
                    .build();

            List<JSONObject> result = BotFileParamUtil.getOldExtraInputsConfig(info);

            assertNotNull(result);
            assertEquals(1, result.size());

            JSONObject item = result.get(0);
            assertEquals("", item.getString("icon")); // NONE enum values
            assertEquals(0, item.getInteger("value"));
        }
    }

    @Test
    void testGetOldExtraInputsConfig_ComplexFormat_WithoutRequired() {
        try (MockedStatic<MaasUtil> maasUtilMock = mockStatic(MaasUtil.class)) {
            maasUtilMock.when(() -> MaasUtil.getFileType(anyString(), any(JSONObject.class)))
                    .thenReturn(3); // DOC2 type

            UserLangChainInfo info = UserLangChainInfo.builder()
                    .extraInputs("{\"name\":\"document\",\"type\":\"doc\",\"schema\":{\"maxSize\":10},\"extra\":\"data\",\"more\":\"fields\"}")
                    .build();

            List<JSONObject> result = BotFileParamUtil.getOldExtraInputsConfig(info);

            assertNotNull(result);
            assertEquals(1, result.size());

            JSONObject item = result.get(0);
            assertEquals("document", item.getString("name"));
            assertEquals("doc", item.getString("type"));
            assertNull(item.get("required")); // Should be null when not present
            assertNotNull(item.get("schema"));
            assertEquals("doc", item.getString("icon"));
            assertEquals(3, item.getInteger("value"));
        }
    }

    // ==================== mergeSupportUploadFields Tests ====================

    @Test
    void testMergeSupportUploadFields_BothEmpty() {
        List<JSONObject> supportUpload = new ArrayList<>();
        List<JSONObject> supportUploadConfig = new ArrayList<>();

        List<JSONObject> result = BotFileParamUtil.mergeSupportUploadFields(supportUpload, supportUploadConfig);

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void testMergeSupportUploadFields_OnlyUploadHasItems() {
        List<JSONObject> supportUpload = new ArrayList<>();
        JSONObject item1 = new JSONObject();
        item1.put("name", "file1");
        item1.put("type", "pdf");
        supportUpload.add(item1);

        List<JSONObject> supportUploadConfig = new ArrayList<>();

        List<JSONObject> result = BotFileParamUtil.mergeSupportUploadFields(supportUpload, supportUploadConfig);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("file1", result.get(0).getString("name"));
    }

    @Test
    void testMergeSupportUploadFields_OnlyConfigHasItems() {
        List<JSONObject> supportUpload = new ArrayList<>();

        List<JSONObject> supportUploadConfig = new ArrayList<>();
        JSONObject item1 = new JSONObject();
        item1.put("name", "file1");
        item1.put("type", "doc");
        supportUploadConfig.add(item1);

        List<JSONObject> result = BotFileParamUtil.mergeSupportUploadFields(supportUpload, supportUploadConfig);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("file1", result.get(0).getString("name"));
    }

    @Test
    void testMergeSupportUploadFields_NoOverlap() {
        List<JSONObject> supportUpload = new ArrayList<>();
        JSONObject item1 = new JSONObject();
        item1.put("name", "file1");
        item1.put("type", "pdf");
        supportUpload.add(item1);

        List<JSONObject> supportUploadConfig = new ArrayList<>();
        JSONObject item2 = new JSONObject();
        item2.put("name", "file2");
        item2.put("type", "doc");
        supportUploadConfig.add(item2);

        List<JSONObject> result = BotFileParamUtil.mergeSupportUploadFields(supportUpload, supportUploadConfig);

        assertNotNull(result);
        assertEquals(2, result.size());

        List<String> names = result.stream().map(obj -> obj.getString("name")).toList();
        assertTrue(names.contains("file1"));
        assertTrue(names.contains("file2"));
    }

    @Test
    void testMergeSupportUploadFields_WithOverlap_ConfigOverrides() {
        List<JSONObject> supportUpload = new ArrayList<>();
        JSONObject item1 = new JSONObject();
        item1.put("name", "file1");
        item1.put("type", "pdf");
        item1.put("version", 1);
        supportUpload.add(item1);

        List<JSONObject> supportUploadConfig = new ArrayList<>();
        JSONObject item2 = new JSONObject();
        item2.put("name", "file1");
        item2.put("type", "doc");
        item2.put("version", 2);
        supportUploadConfig.add(item2);

        List<JSONObject> result = BotFileParamUtil.mergeSupportUploadFields(supportUpload, supportUploadConfig);

        assertNotNull(result);
        assertEquals(1, result.size());

        JSONObject merged = result.get(0);
        assertEquals("file1", merged.getString("name"));
        assertEquals("doc", merged.getString("type")); // Config should override
        assertEquals(2, merged.getInteger("version")); // Config should override
    }

    @Test
    void testMergeSupportUploadFields_MultipleOverlaps() {
        List<JSONObject> supportUpload = new ArrayList<>();
        JSONObject item1 = new JSONObject();
        item1.put("name", "file1");
        item1.put("type", "pdf");
        supportUpload.add(item1);

        JSONObject item2 = new JSONObject();
        item2.put("name", "file2");
        item2.put("type", "doc");
        supportUpload.add(item2);

        JSONObject item3 = new JSONObject();
        item3.put("name", "file3");
        item3.put("type", "txt");
        supportUpload.add(item3);

        List<JSONObject> supportUploadConfig = new ArrayList<>();
        JSONObject config1 = new JSONObject();
        config1.put("name", "file1");
        config1.put("type", "audio");
        supportUploadConfig.add(config1);

        JSONObject config2 = new JSONObject();
        config2.put("name", "file2");
        config2.put("type", "image");
        supportUploadConfig.add(config2);

        List<JSONObject> result = BotFileParamUtil.mergeSupportUploadFields(supportUpload, supportUploadConfig);

        assertNotNull(result);
        assertEquals(3, result.size());

        // Find each by name and verify
        JSONObject file1 = result.stream().filter(obj -> "file1".equals(obj.getString("name"))).findFirst().orElse(null);
        assertNotNull(file1);
        assertEquals("audio", file1.getString("type")); // Config should override

        JSONObject file2 = result.stream().filter(obj -> "file2".equals(obj.getString("name"))).findFirst().orElse(null);
        assertNotNull(file2);
        assertEquals("image", file2.getString("type")); // Config should override

        JSONObject file3 = result.stream().filter(obj -> "file3".equals(obj.getString("name"))).findFirst().orElse(null);
        assertNotNull(file3);
        assertEquals("txt", file3.getString("type")); // No override, original value
    }

    @Test
    void testMergeSupportUploadFields_NullNamesIgnored() {
        List<JSONObject> supportUpload = new ArrayList<>();
        JSONObject item1 = new JSONObject();
        item1.put("name", null);
        item1.put("type", "pdf");
        supportUpload.add(item1);

        JSONObject item2 = new JSONObject();
        item2.put("name", "file1");
        item2.put("type", "doc");
        supportUpload.add(item2);

        List<JSONObject> supportUploadConfig = new ArrayList<>();
        JSONObject config1 = new JSONObject();
        config1.put("type", "txt");
        supportUploadConfig.add(config1); // Missing name

        List<JSONObject> result = BotFileParamUtil.mergeSupportUploadFields(supportUpload, supportUploadConfig);

        assertNotNull(result);
        assertEquals(1, result.size()); // Only item2 should be in result
        assertEquals("file1", result.get(0).getString("name"));
    }

    // ==================== getExtraInputsConfig Tests ====================

    @Test
    void testGetExtraInputsConfig_ValidArray() {
        try (MockedStatic<MaasUtil> maasUtilMock = mockStatic(MaasUtil.class)) {
            maasUtilMock.when(() -> MaasUtil.getFileType(anyString(), any(JSONObject.class)))
                    .thenReturn(1); // DOC type

            UserLangChainInfo info = UserLangChainInfo.builder()
                    .extraInputsConfig("[{\"name\":\"file1\",\"type\":\"pdf\",\"required\":true,\"schema\":{\"maxSize\":10}}]")
                    .build();

            List<JSONObject> result = BotFileParamUtil.getExtraInputsConfig(info);

            assertNotNull(result);
            assertEquals(1, result.size());

            JSONObject item = result.get(0);
            assertEquals("file1", item.getString("name"));
            assertEquals("pdf", item.getString("type"));
            assertEquals(true, item.getBoolean("required"));
            assertNotNull(item.get("schema"));
            assertEquals("document", item.getString("icon"));
            assertEquals(1, item.getInteger("value"));
        }
    }

    @Test
    void testGetExtraInputsConfig_EmptyArray() {
        UserLangChainInfo info = UserLangChainInfo.builder()
                .extraInputsConfig("[]")
                .build();

        List<JSONObject> result = BotFileParamUtil.getExtraInputsConfig(info);

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void testGetExtraInputsConfig_MissingName() {
        try (MockedStatic<MaasUtil> maasUtilMock = mockStatic(MaasUtil.class)) {
            maasUtilMock.when(() -> MaasUtil.getFileType(anyString(), any(JSONObject.class)))
                    .thenReturn(2);

            UserLangChainInfo info = UserLangChainInfo.builder()
                    .extraInputsConfig("[{\"type\":\"png\",\"required\":true}]")
                    .build();

            List<JSONObject> result = BotFileParamUtil.getExtraInputsConfig(info);

            assertNotNull(result);
            assertTrue(result.isEmpty()); // Should be filtered out due to missing name
        }
    }

    @Test
    void testGetExtraInputsConfig_MissingType() {
        try (MockedStatic<MaasUtil> maasUtilMock = mockStatic(MaasUtil.class)) {
            maasUtilMock.when(() -> MaasUtil.getFileType(anyString(), any(JSONObject.class)))
                    .thenReturn(3);

            UserLangChainInfo info = UserLangChainInfo.builder()
                    .extraInputsConfig("[{\"name\":\"file1\",\"required\":false}]")
                    .build();

            List<JSONObject> result = BotFileParamUtil.getExtraInputsConfig(info);

            assertNotNull(result);
            assertTrue(result.isEmpty()); // Should be filtered out due to missing type
        }
    }

    @Test
    void testGetExtraInputsConfig_MissingBothNameAndType() {
        UserLangChainInfo info = UserLangChainInfo.builder()
                .extraInputsConfig("[{\"required\":true,\"schema\":{}}]")
                .build();

        List<JSONObject> result = BotFileParamUtil.getExtraInputsConfig(info);

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void testGetExtraInputsConfig_MultipleItems() {
        try (MockedStatic<MaasUtil> maasUtilMock = mockStatic(MaasUtil.class)) {
            maasUtilMock.when(() -> MaasUtil.getFileType(anyString(), any(JSONObject.class)))
                    .thenAnswer(invocation -> {
                        String type = invocation.getArgument(0);
                        return switch (type) {
                            case "pdf" -> 1;
                            case "png" -> 2;
                            case "mp3" -> 7;
                            default -> 0;
                        };
                    });

            UserLangChainInfo info = UserLangChainInfo.builder()
                    .extraInputsConfig("[" +
                            "{\"name\":\"file1\",\"type\":\"pdf\",\"required\":true}," +
                            "{\"name\":\"file2\",\"type\":\"png\",\"required\":false}," +
                            "{\"name\":\"file3\",\"type\":\"mp3\",\"required\":true,\"schema\":{\"maxSize\":20}}" +
                            "]")
                    .build();

            List<JSONObject> result = BotFileParamUtil.getExtraInputsConfig(info);

            assertNotNull(result);
            assertEquals(3, result.size());

            JSONObject item1 = result.get(0);
            assertEquals("file1", item1.getString("name"));
            assertEquals("pdf", item1.getString("type"));
            assertEquals(true, item1.getBoolean("required"));
            assertEquals(1, item1.getInteger("value"));

            JSONObject item2 = result.get(1);
            assertEquals("file2", item2.getString("name"));
            assertEquals("png", item2.getString("type"));
            assertEquals(false, item2.getBoolean("required"));
            assertEquals(2, item2.getInteger("value"));

            JSONObject item3 = result.get(2);
            assertEquals("file3", item3.getString("name"));
            assertEquals("mp3", item3.getString("type"));
            assertEquals(true, item3.getBoolean("required"));
            assertNotNull(item3.get("schema"));
            assertEquals(7, item3.getInteger("value"));
        }
    }

    @Test
    void testGetExtraInputsConfig_MixedValidAndInvalid() {
        try (MockedStatic<MaasUtil> maasUtilMock = mockStatic(MaasUtil.class)) {
            maasUtilMock.when(() -> MaasUtil.getFileType(anyString(), any(JSONObject.class)))
                    .thenReturn(1);

            UserLangChainInfo info = UserLangChainInfo.builder()
                    .extraInputsConfig("[" +
                            "{\"name\":\"file1\",\"type\":\"pdf\",\"required\":true}," +
                            "{\"name\":\"file2\",\"required\":false}," + // Missing type
                            "{\"type\":\"png\",\"required\":true}," + // Missing name
                            "{\"name\":\"file4\",\"type\":\"doc\",\"required\":false}" +
                            "]")
                    .build();

            List<JSONObject> result = BotFileParamUtil.getExtraInputsConfig(info);

            assertNotNull(result);
            assertEquals(2, result.size()); // Only valid items should be included

            List<String> names = result.stream().map(obj -> obj.getString("name")).toList();
            assertTrue(names.contains("file1"));
            assertTrue(names.contains("file4"));
        }
    }

    @Test
    void testGetExtraInputsConfig_ArrayType() {
        try (MockedStatic<MaasUtil> maasUtilMock = mockStatic(MaasUtil.class)) {
            maasUtilMock.when(() -> MaasUtil.getFileType(anyString(), any(JSONObject.class)))
                    .thenReturn(21); // DOC_ARRAY type

            UserLangChainInfo info = UserLangChainInfo.builder()
                    .extraInputsConfig("[{\"name\":\"files\",\"type\":\"pdf[]\",\"required\":true,\"schema\":{\"maxFiles\":5}}]")
                    .build();

            List<JSONObject> result = BotFileParamUtil.getExtraInputsConfig(info);

            assertNotNull(result);
            assertEquals(1, result.size());

            JSONObject item = result.get(0);
            assertEquals("files", item.getString("name"));
            assertEquals("pdf[]", item.getString("type"));
            assertEquals(true, item.getBoolean("required"));
            assertEquals(21, item.getInteger("value"));
            assertEquals(10, item.getInteger("limit")); // Array types have limit 10
        }
    }
}
