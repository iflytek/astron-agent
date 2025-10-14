package com.iflytek.astron.console.commons.util;

import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.iflytek.astron.console.commons.dto.bot.BotTag;
import com.iflytek.astron.console.commons.entity.bot.*;
import com.iflytek.astron.console.commons.enums.bot.BotUploadEnum;
import com.iflytek.astron.console.commons.mapper.bot.ChatBotBaseMapper;
import com.iflytek.astron.console.commons.service.bot.ChatBotTagService;
import com.iflytek.astron.console.commons.service.data.UserLangChainDataService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.redisson.api.RBucket;
import org.redisson.api.RedissonClient;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MaasUtilTest {

    @Mock
    private ChatBotBaseMapper chatBotBaseMapper;

    @Mock
    private UserLangChainDataService userLangChainDataService;

    @Mock
    private ChatBotTagService chatBotTagService;

    @Mock
    private RedissonClient redissonClient;

    @Mock
    private HttpServletRequest request;

    @InjectMocks
    private MaasUtil maasUtil;

    private static final String TEST_UID = "test-uid";
    private static final Integer TEST_BOT_ID = 100;
    private static final Long TEST_SPACE_ID = 1L;
    private static final Long TEST_MAAS_ID = 999L;
    private static final String TEST_FLOW_ID = "flow-123";

    @BeforeAll
    static void initMybatisPlus() {
        MybatisConfiguration configuration = new MybatisConfiguration();
        MapperBuilderAssistant assistant = new MapperBuilderAssistant(configuration, "");

        TableInfoHelper.initTableInfo(assistant, ChatBotBase.class);
        TableInfoHelper.initTableInfo(assistant, UserLangChainInfo.class);
        TableInfoHelper.initTableInfo(assistant, ChatBotTag.class);
        TableInfoHelper.initTableInfo(assistant, BotTag.class);
    }

    @BeforeEach
    void setUp() {
        // Set @Value fields using ReflectionTestUtils
        ReflectionTestUtils.setField(maasUtil, "synchronizeUrl", "http://test.com/sync");
        ReflectionTestUtils.setField(maasUtil, "cloneWorkFlowUrl", "http://test.com/clone");
        ReflectionTestUtils.setField(maasUtil, "getInputsUrl", "http://test.com/inputs");
        ReflectionTestUtils.setField(maasUtil, "maasAppId", "test-app-id");
        ReflectionTestUtils.setField(maasUtil, "consumerId", "test-consumer-id");
        ReflectionTestUtils.setField(maasUtil, "consumerSecret", "test-secret");
        ReflectionTestUtils.setField(maasUtil, "consumerKey", "test-key");
        ReflectionTestUtils.setField(maasUtil, "publishApi", "http://test.com/publish");
        ReflectionTestUtils.setField(maasUtil, "authApi", "http://test.com/auth");
        ReflectionTestUtils.setField(maasUtil, "mcpHost", "http://test.com/mcp");
        ReflectionTestUtils.setField(maasUtil, "mcpReleaseUrl", "http://test.com/mcp/release");
    }

    // ========== Static Method Tests ==========

    @Test
    void testGetAuthorizationHeader_WithValidHeader() {
        String expectedToken = "Bearer test-token-123";
        when(request.getHeader("Authorization")).thenReturn(expectedToken);

        String result = MaasUtil.getAuthorizationHeader(request);

        assertEquals(expectedToken, result);
        verify(request).getHeader("Authorization");
    }

    @Test
    void testGetAuthorizationHeader_WithNullHeader() {
        when(request.getHeader("Authorization")).thenReturn(null);

        String result = MaasUtil.getAuthorizationHeader(request);

        assertEquals("", result);
        verify(request).getHeader("Authorization");
    }

    @Test
    void testGetAuthorizationHeader_WithEmptyHeader() {
        when(request.getHeader("Authorization")).thenReturn("");

        String result = MaasUtil.getAuthorizationHeader(request);

        assertEquals("", result);
        verify(request).getHeader("Authorization");
    }

    @Test
    void testGetAuthorizationHeader_WithBlankHeader() {
        when(request.getHeader("Authorization")).thenReturn("   ");

        String result = MaasUtil.getAuthorizationHeader(request);

        assertEquals("", result);
        verify(request).getHeader("Authorization");
    }

    @Test
    void testGetRequestCookies_WithValidCookies() {
        Cookie cookie1 = new Cookie("session", "abc123");
        Cookie cookie2 = new Cookie("user", "john");
        Cookie[] cookies = new Cookie[] {cookie1, cookie2};

        when(request.getCookies()).thenReturn(cookies);

        String result = MaasUtil.getRequestCookies(request);

        assertEquals("session=abc123; user=john", result);
        verify(request).getCookies();
    }

    @Test
    void testGetRequestCookies_WithNullCookies() {
        when(request.getCookies()).thenReturn(null);

        String result = MaasUtil.getRequestCookies(request);

        assertEquals("", result);
        verify(request).getCookies();
    }

    @Test
    void testGetRequestCookies_WithEmptyCookies() {
        Cookie[] cookies = new Cookie[] {};
        when(request.getCookies()).thenReturn(cookies);

        String result = MaasUtil.getRequestCookies(request);

        assertEquals("", result);
        verify(request).getCookies();
    }

    @Test
    void testGeneratePrefix_Success() {
        String uid = "user123";
        Integer botId = 456;

        String result = MaasUtil.generatePrefix(uid, botId);

        assertEquals("maas_copy_user123_456", result);
    }

    @Test
    void testGetFileType_PDF_Single() {
        JSONObject param = new JSONObject();
        param.put("schema", new JSONObject().fluentPut("type", "string"));

        int result = MaasUtil.getFileType("pdf", param);

        assertEquals(BotUploadEnum.DOC.getValue(), result);
    }

    @Test
    void testGetFileType_PDF_Array() {
        JSONObject param = new JSONObject();
        JSONObject schema = new JSONObject();
        schema.put("type", "array-string");
        param.put("schema", schema);

        int result = MaasUtil.getFileType("pdf", param);

        assertEquals(BotUploadEnum.DOC_ARRAY.getValue(), result);
    }

    @Test
    void testGetFileType_Image_Single() {
        JSONObject param = new JSONObject();
        param.put("schema", new JSONObject().fluentPut("type", "string"));

        int result = MaasUtil.getFileType("image", param);

        assertEquals(BotUploadEnum.IMG.getValue(), result);
    }

    @Test
    void testGetFileType_Image_Array() {
        JSONObject param = new JSONObject();
        JSONObject schema = new JSONObject();
        schema.put("type", "array-string");
        param.put("schema", schema);

        int result = MaasUtil.getFileType("image", param);

        assertEquals(BotUploadEnum.IMG_ARRAY.getValue(), result);
    }

    @Test
    void testGetFileType_Doc_Single() {
        JSONObject param = new JSONObject();
        param.put("schema", new JSONObject().fluentPut("type", "string"));

        int result = MaasUtil.getFileType("doc", param);

        assertEquals(BotUploadEnum.DOC2.getValue(), result);
    }

    @Test
    void testGetFileType_PPT_Single() {
        JSONObject param = new JSONObject();
        param.put("schema", new JSONObject().fluentPut("type", "string"));

        int result = MaasUtil.getFileType("ppt", param);

        assertEquals(BotUploadEnum.PPT.getValue(), result);
    }

    @Test
    void testGetFileType_Excel_Single() {
        JSONObject param = new JSONObject();
        param.put("schema", new JSONObject().fluentPut("type", "string"));

        int result = MaasUtil.getFileType("excel", param);

        assertEquals(BotUploadEnum.EXCEL.getValue(), result);
    }

    @Test
    void testGetFileType_TXT_Single() {
        JSONObject param = new JSONObject();
        param.put("schema", new JSONObject().fluentPut("type", "string"));

        int result = MaasUtil.getFileType("txt", param);

        assertEquals(BotUploadEnum.TXT.getValue(), result);
    }

    @Test
    void testGetFileType_Audio_Single() {
        JSONObject param = new JSONObject();
        param.put("schema", new JSONObject().fluentPut("type", "string"));

        int result = MaasUtil.getFileType("audio", param);

        assertEquals(BotUploadEnum.AUDIO.getValue(), result);
    }

    @Test
    void testGetFileType_Unknown_Type() {
        JSONObject param = new JSONObject();
        param.put("schema", new JSONObject().fluentPut("type", "string"));

        int result = MaasUtil.getFileType("unknown", param);

        assertEquals(BotUploadEnum.NONE.getValue(), result);
    }

    @Test
    void testGetFileType_NullType() {
        JSONObject param = new JSONObject();

        int result = MaasUtil.getFileType(null, param);

        assertEquals(BotUploadEnum.NONE.getValue(), result);
    }

    @Test
    void testGetFileType_EmptyType() {
        JSONObject param = new JSONObject();

        int result = MaasUtil.getFileType("", param);

        assertEquals(BotUploadEnum.NONE.getValue(), result);
    }

    @Test
    void testGetFileType_CaseInsensitive() {
        JSONObject param = new JSONObject();
        param.put("schema", new JSONObject().fluentPut("type", "string"));

        int result1 = MaasUtil.getFileType("PDF", param);
        int result2 = MaasUtil.getFileType("Pdf", param);
        int result3 = MaasUtil.getFileType("IMAGE", param);

        assertEquals(BotUploadEnum.DOC.getValue(), result1);
        assertEquals(BotUploadEnum.DOC.getValue(), result2);
        assertEquals(BotUploadEnum.IMG.getValue(), result3);
    }

    @Test
    void testIsFileArray_ArrayString() {
        JSONObject param = new JSONObject();
        JSONObject schema = new JSONObject();
        schema.put("type", "array-string");
        param.put("schema", schema);

        boolean result = MaasUtil.isFileArray(param);

        assertTrue(result);
    }

    @Test
    void testIsFileArray_NotArray() {
        JSONObject param = new JSONObject();
        JSONObject schema = new JSONObject();
        schema.put("type", "string");
        param.put("schema", schema);

        boolean result = MaasUtil.isFileArray(param);

        assertFalse(result);
    }

    @Test
    void testIsFileArray_NullSchema() {
        JSONObject param = new JSONObject();

        boolean result = MaasUtil.isFileArray(param);

        assertFalse(result);
    }

    @Test
    void testIsFileArray_ExceptionHandling() {
        JSONObject param = new JSONObject();
        param.put("schema", "invalid");

        boolean result = MaasUtil.isFileArray(param);

        assertFalse(result);
    }

    @Test
    void testKeepOldValue_EmptyList() {
        List<JSONObject> extraInputs = new ArrayList<>();

        JSONObject result = MaasUtil.keepOldValue(extraInputs);

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void testKeepOldValue_NullList() {
        JSONObject result = MaasUtil.keepOldValue(null);

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void testKeepOldValue_WithValidInput() {
        JSONObject input1 = new JSONObject();
        input1.put("type", "pdf");
        JSONObject schema1 = new JSONObject();
        schema1.put("type", "string");
        input1.put("schema", schema1);

        List<JSONObject> extraInputs = new ArrayList<>();
        extraInputs.add(input1);

        JSONObject result = MaasUtil.keepOldValue(extraInputs);

        assertNotNull(result);
        assertEquals("pdf", result.getString("type"));
    }

    @Test
    void testKeepOldValue_WithUnsupportedTypes() {
        JSONObject input1 = new JSONObject();
        input1.put("type", "string");
        JSONObject schema1 = new JSONObject();
        schema1.put("type", "string");
        input1.put("schema", schema1);

        JSONObject input2 = new JSONObject();
        input2.put("type", "integer");
        JSONObject schema2 = new JSONObject();
        schema2.put("type", "integer");
        input2.put("schema", schema2);

        List<JSONObject> extraInputs = Arrays.asList(input1, input2);

        JSONObject result = MaasUtil.keepOldValue(extraInputs);

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void testKeepOldValue_WithFileArray() {
        JSONObject input1 = new JSONObject();
        input1.put("type", "pdf");
        JSONObject schema1 = new JSONObject();
        schema1.put("type", "array-string");
        input1.put("schema", schema1);

        JSONObject input2 = new JSONObject();
        input2.put("type", "image");
        JSONObject schema2 = new JSONObject();
        schema2.put("type", "string");
        input2.put("schema", schema2);

        List<JSONObject> extraInputs = Arrays.asList(input1, input2);

        JSONObject result = MaasUtil.keepOldValue(extraInputs);

        assertNotNull(result);
        assertEquals("image", result.getString("type"));
    }

    // ========== deleteSynchronize Method Tests ==========

    @Test
    void testDeleteSynchronize_NullBotId_ReturnsEmptyJson() {
        JSONObject result = maasUtil.deleteSynchronize(null, TEST_SPACE_ID, request);

        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(chatBotBaseMapper, never()).selectById(anyInt());
    }

    @Test
    void testDeleteSynchronize_NullSpaceId_ReturnsEmptyJson() {
        JSONObject result = maasUtil.deleteSynchronize(TEST_BOT_ID, null, request);

        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(chatBotBaseMapper, never()).selectById(anyInt());
    }

    @Test
    void testDeleteSynchronize_NullRequest_ReturnsEmptyJson() {
        JSONObject result = maasUtil.deleteSynchronize(TEST_BOT_ID, TEST_SPACE_ID, null);

        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(chatBotBaseMapper, never()).selectById(anyInt());
    }

    @Test
    void testDeleteSynchronize_BotNotFound_ReturnsEmptyJson() {
        when(chatBotBaseMapper.selectById(TEST_BOT_ID)).thenReturn(null);

        JSONObject result = maasUtil.deleteSynchronize(TEST_BOT_ID, TEST_SPACE_ID, request);

        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(chatBotBaseMapper).selectById(TEST_BOT_ID);
    }

    @Test
    void testDeleteSynchronize_BotVersionNot3_ReturnsEmptyJson() {
        ChatBotBase botBase = new ChatBotBase();
        botBase.setId(TEST_BOT_ID);
        botBase.setVersion(1); // Not version 3

        when(chatBotBaseMapper.selectById(TEST_BOT_ID)).thenReturn(botBase);

        JSONObject result = maasUtil.deleteSynchronize(TEST_BOT_ID, TEST_SPACE_ID, request);

        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(chatBotBaseMapper).selectById(TEST_BOT_ID);
    }

    @Test
    void testDeleteSynchronize_BotInfoEmpty_ReturnsEmptyJson() {
        ChatBotBase botBase = new ChatBotBase();
        botBase.setId(TEST_BOT_ID);
        botBase.setVersion(3);

        when(chatBotBaseMapper.selectById(TEST_BOT_ID)).thenReturn(botBase);
        when(userLangChainDataService.findListByBotId(TEST_BOT_ID)).thenReturn(new ArrayList<>());

        JSONObject result = maasUtil.deleteSynchronize(TEST_BOT_ID, TEST_SPACE_ID, request);

        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(userLangChainDataService).findListByBotId(TEST_BOT_ID);
    }

    @Test
    void testDeleteSynchronize_MaasIdNull_ReturnsEmptyJson() {
        ChatBotBase botBase = new ChatBotBase();
        botBase.setId(TEST_BOT_ID);
        botBase.setVersion(3);

        UserLangChainInfo chainInfo = new UserLangChainInfo();
        chainInfo.setMaasId(null);

        when(chatBotBaseMapper.selectById(TEST_BOT_ID)).thenReturn(botBase);
        when(userLangChainDataService.findListByBotId(TEST_BOT_ID))
                .thenReturn(Arrays.asList(chainInfo));

        JSONObject result = maasUtil.deleteSynchronize(TEST_BOT_ID, TEST_SPACE_ID, request);

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    // ========== setBotTag Method Tests (Partial) ==========

    @Test
    void testSetBotTag_NullBotTagList() {
        JSONObject botInfo = new JSONObject();
        botInfo.put("botId", TEST_BOT_ID);
        botInfo.put("data", new JSONObject().fluentPut("nodes", new JSONArray()));

        RBucket<Object> bucket = mock(RBucket.class);
        when(redissonClient.getBucket("bot_tag_list")).thenReturn(bucket);
        when(bucket.get()).thenReturn(null);

        assertThrows(NullPointerException.class, () -> {
            maasUtil.setBotTag(botInfo);
        });
    }
}
