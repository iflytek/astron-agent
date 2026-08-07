package com.iflytek.astron.console.commons.service.workflow.impl;

import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.entity.bot.BotChatFileParam;
import com.iflytek.astron.console.commons.dto.chat.ChatFileReq;
import com.iflytek.astron.console.commons.entity.chat.ChatFileUser;
import com.iflytek.astron.console.commons.entity.chat.ChatReqModel;
import com.iflytek.astron.console.commons.dto.chat.ChatReqModelDto;
import com.iflytek.astron.console.commons.service.data.ChatDataService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkflowBotParamServiceImplTest {

    @Mock
    private ChatDataService chatDataService;

    @InjectMocks
    private WorkflowBotParamServiceImpl workflowBotParamService;

    private JSONObject inputs;
    private JSONObject extraInputs;
    private String uid;
    private Long chatId;
    private String sseId;
    private Long leftId;
    private String fileUrl;
    private Long reqId;
    private Integer botId;

    @BeforeEach
    void setUp() {
        uid = "testUser";
        chatId = 123L;
        sseId = "test-sse-id";
        leftId = 456L;
        fileUrl = "http://example.com/file.jpg";
        reqId = 789L;
        botId = 999;

        inputs = new JSONObject();
        extraInputs = new JSONObject();
        extraInputs.put("image", "");
    }

    @Test
    void testHandleSingleParam_WithFileUrl() {
        // Given
        when(chatDataService.createChatReqModel(any(ChatReqModel.class))).thenReturn(null);

        // When
        workflowBotParamService.handleSingleParam(uid, chatId, sseId, leftId, fileUrl, extraInputs, reqId, inputs, botId);

        // Then
        ArgumentCaptor<ChatReqModel> captor = ArgumentCaptor.forClass(ChatReqModel.class);
        verify(chatDataService).createChatReqModel(captor.capture());

        ChatReqModel captured = captor.getValue();
        assertEquals(reqId, captured.getChatReqId());
        assertEquals(chatId, captured.getChatId());
        assertEquals(uid, captured.getUid());
        assertEquals(sseId, captured.getDataId());
        assertEquals(Integer.valueOf(1), captured.getType());
        assertEquals(fileUrl, captured.getUrl());
        assertEquals(Integer.valueOf(1), captured.getNeedHis());
        assertNotNull(captured.getCreateTime());
        assertNotNull(captured.getUpdateTime());

        assertEquals(fileUrl, inputs.getString("image"));
    }

    @Test
    void testHandleSingleParam_WithFileUrlContainingComma() {
        // Given
        String fileUrlWithComma = "http://example.com/file.jpg,";
        when(chatDataService.createChatReqModel(any(ChatReqModel.class))).thenReturn(null);

        // When
        workflowBotParamService.handleSingleParam(uid, chatId, sseId, leftId, fileUrlWithComma, extraInputs, reqId, inputs, botId);

        // Then
        ArgumentCaptor<ChatReqModel> captor = ArgumentCaptor.forClass(ChatReqModel.class);
        verify(chatDataService).createChatReqModel(captor.capture());

        ChatReqModel captured = captor.getValue();
        assertEquals("http://example.com/file.jpg", captured.getUrl());
        assertEquals("http://example.com/file.jpg", inputs.getString("image"));
    }

    @Test
    void testHandleSingleParam_WithoutFileUrl_BothReqModelAndFileReq() {
        // Given
        ChatReqModelDto reqModelDto = new ChatReqModelDto();
        reqModelDto.setUrl("http://model.com/image.jpg");
        reqModelDto.setCreateTime(LocalDateTime.now());

        ChatFileReq fileReq = ChatFileReq.builder()
                .id(1L)
                .fileId("file123")
                .createTime(LocalDateTime.now().minusHours(1))
                .build();

        when(chatDataService.getFileList(uid, chatId)).thenReturn(List.of(fileReq));
        when(chatDataService.getReqModelWithImgByChatId(uid, chatId)).thenReturn(List.of(reqModelDto));

        // When
        workflowBotParamService.handleSingleParam(uid, chatId, sseId, leftId, "", extraInputs, reqId, inputs, botId);

        // Then
        // Since reqModelDto has later timestamp, it should be used
        assertEquals("http://model.com/image.jpg", inputs.getString("image"));
        verify(chatDataService, never()).getByFileId(anyString(), anyString());
    }

    @Test
    void testHandleSingleParam_WithoutFileUrl_FileReqNewer() {
        // Given
        ChatReqModelDto reqModelDto = new ChatReqModelDto();
        reqModelDto.setUrl("http://model.com/image.jpg");
        reqModelDto.setCreateTime(LocalDateTime.now().minusHours(1));

        ChatFileReq fileReq = ChatFileReq.builder()
                .id(1L)
                .fileId("file123")
                .createTime(LocalDateTime.now())
                .build();

        ChatFileUser fileUser = ChatFileUser.builder()
                .fileUrl("http://file.com/image.jpg")
                .build();

        when(chatDataService.getFileList(uid, chatId)).thenReturn(List.of(fileReq));
        when(chatDataService.getReqModelWithImgByChatId(uid, chatId)).thenReturn(List.of(reqModelDto));
        when(chatDataService.getByFileId("file123", uid)).thenReturn(fileUser);

        // When
        workflowBotParamService.handleSingleParam(uid, chatId, sseId, leftId, "", extraInputs, reqId, inputs, botId);

        // Then
        assertEquals("http://file.com/image.jpg", inputs.getString("image"));
        verify(chatDataService).getByFileId("file123", uid);
        verify(chatDataService).updateFileReqId(chatId, uid, Collections.singletonList("file123"), reqId, false, leftId);
    }

    @Test
    void testHandleSingleParam_WithoutFileUrl_OnlyReqModel() {
        // Given
        ChatReqModelDto reqModelDto = new ChatReqModelDto();
        reqModelDto.setUrl("http://model.com/image.jpg");
        reqModelDto.setCreateTime(LocalDateTime.now());

        when(chatDataService.getFileList(uid, chatId)).thenReturn(Collections.emptyList());
        when(chatDataService.getReqModelWithImgByChatId(uid, chatId)).thenReturn(List.of(reqModelDto));

        // When
        workflowBotParamService.handleSingleParam(uid, chatId, sseId, leftId, "", extraInputs, reqId, inputs, botId);

        // Then
        assertEquals("http://model.com/image.jpg", inputs.getString("image"));
    }

    @Test
    void testHandleSingleParam_WithoutFileUrl_OnlyFileReq() {
        // Given
        ChatFileReq fileReq = ChatFileReq.builder()
                .id(1L)
                .fileId("file123")
                .createTime(LocalDateTime.now())
                .build();

        ChatFileUser fileUser = ChatFileUser.builder()
                .fileUrl("http://file.com/image.jpg")
                .build();

        when(chatDataService.getFileList(uid, chatId)).thenReturn(List.of(fileReq));
        when(chatDataService.getReqModelWithImgByChatId(uid, chatId)).thenReturn(Collections.emptyList());
        when(chatDataService.getByFileId("file123", uid)).thenReturn(fileUser);

        // When
        workflowBotParamService.handleSingleParam(uid, chatId, sseId, leftId, "", extraInputs, reqId, inputs, botId);

        // Then
        assertEquals("http://file.com/image.jpg", inputs.getString("image"));
        verify(chatDataService).updateFileReqId(chatId, uid, Collections.singletonList("file123"), reqId, false, leftId);
    }

    @Test
    void testHandleSingleParam_NoExtraInputs() {
        // When
        workflowBotParamService.handleSingleParam(uid, chatId, sseId, leftId, fileUrl, null, reqId, inputs, botId);

        // Then
        verifyNoInteractions(chatDataService);
        assertTrue(inputs.isEmpty());
    }

    @Test
    void testHandleSingleParam_EmptyExtraInputs() {
        // Given
        JSONObject emptyExtraInputs = new JSONObject();

        // When
        workflowBotParamService.handleSingleParam(uid, chatId, sseId, leftId, fileUrl, emptyExtraInputs, reqId, inputs, botId);

        // Then
        verifyNoInteractions(chatDataService);
        assertTrue(inputs.isEmpty());
    }

    @Test
    void testHandleMultiFileParam_Success() {
        // Given
        List<JSONObject> extraInputsConfig = new ArrayList<>();
        JSONObject inputConfig = new JSONObject();
        inputConfig.put("name", "documents");
        inputConfig.put("schema", createSchemaJson("array-string"));
        extraInputsConfig.add(inputConfig);

        BotChatFileParam botChatFileParam = new BotChatFileParam();
        botChatFileParam.setName("documents");
        botChatFileParam.setFileUrls(List.of("http://file1.com", "http://file2.com"));

        when(chatDataService.findBotChatFileParamsByChatIdAndIsDelete(chatId, 0)).thenReturn(List.of(botChatFileParam));
        when(chatDataService.getFileList(uid, chatId)).thenReturn(Collections.emptyList());

        // When
        boolean result = workflowBotParamService.handleMultiFileParam(uid, chatId, leftId, extraInputsConfig, inputs, reqId);

        // Then
        assertTrue(result);
        assertNotNull(inputs.get("documents"));
        assertTrue(inputs.get("documents") instanceof List);
        List<?> fileUrls = (List<?>) inputs.get("documents");
        assertEquals(2, fileUrls.size());
        assertEquals("http://file1.com", fileUrls.get(0));
        assertEquals("http://file2.com", fileUrls.get(1));
    }

    @Test
    void testHandleMultiFileParam_SingleFileType() {
        // Given
        List<JSONObject> extraInputsConfig = new ArrayList<>();
        JSONObject inputConfig = new JSONObject();
        inputConfig.put("name", "document");
        inputConfig.put("schema", createSchemaJson("string"));
        extraInputsConfig.add(inputConfig);

        BotChatFileParam botChatFileParam = new BotChatFileParam();
        botChatFileParam.setName("document");
        botChatFileParam.setFileUrls(List.of("http://file1.com", "http://file2.com"));

        when(chatDataService.findBotChatFileParamsByChatIdAndIsDelete(chatId, 0)).thenReturn(List.of(botChatFileParam));
        when(chatDataService.getFileList(uid, chatId)).thenReturn(Collections.emptyList());

        // When
        boolean result = workflowBotParamService.handleMultiFileParam(uid, chatId, leftId, extraInputsConfig, inputs, reqId);

        // Then
        assertTrue(result);
        assertEquals("http://file2.com", inputs.getString("document")); // Should use the last file
    }

    @Test
    void testHandleMultiFileParam_NoMatchingFiles() {
        // Given
        List<JSONObject> extraInputsConfig = new ArrayList<>();
        JSONObject inputConfig = new JSONObject();
        inputConfig.put("name", "documents");
        extraInputsConfig.add(inputConfig);

        BotChatFileParam botChatFileParam = new BotChatFileParam();
        botChatFileParam.setName("other");
        botChatFileParam.setFileUrls(List.of("http://file1.com"));

        when(chatDataService.findBotChatFileParamsByChatIdAndIsDelete(chatId, 0)).thenReturn(List.of(botChatFileParam));
        when(chatDataService.getFileList(uid, chatId)).thenReturn(Collections.emptyList());

        // When
        boolean result = workflowBotParamService.handleMultiFileParam(uid, chatId, leftId, extraInputsConfig, inputs, reqId);

        // Then
        assertFalse(result);
        assertTrue(inputs.isEmpty());
    }

    @Test
    void testHandleMultiFileParam_EmptyConfig() {
        // When
        boolean result = workflowBotParamService.handleMultiFileParam(uid, chatId, leftId, Collections.emptyList(), inputs, reqId);

        // Then
        assertFalse(result);
        verify(chatDataService).findBotChatFileParamsByChatIdAndIsDelete(chatId, 0);
    }

    @Test
    void testHandleMultiFileParam_WithChatFileReqs() {
        // Given
        ChatFileReq chatFileReq = ChatFileReq.builder()
                .fileId("file123")
                .reqId(null)
                .build();

        when(chatDataService.findBotChatFileParamsByChatIdAndIsDelete(chatId, 0)).thenReturn(Collections.emptyList());
        when(chatDataService.getFileList(uid, chatId)).thenReturn(List.of(chatFileReq));

        // When
        boolean result = workflowBotParamService.handleMultiFileParam(uid, chatId, leftId, Collections.emptyList(), inputs, reqId);

        // Then
        assertFalse(result);
        verify(chatDataService).updateFileReqId(chatId, uid, List.of("file123"), reqId, false, leftId);
    }

    @Test
    void testIsFileArray_ArrayStringType() {
        // Given
        JSONObject param = new JSONObject();
        param.put("schema", createSchemaJson("array-string"));

        // When
        boolean result = WorkflowBotParamServiceImpl.isFileArray(param);

        // Then
        assertTrue(result);
    }

    @Test
    void testIsFileArray_NonArrayType() {
        // Given
        JSONObject param = new JSONObject();
        param.put("schema", createSchemaJson("string"));

        // When
        boolean result = WorkflowBotParamServiceImpl.isFileArray(param);

        // Then
        assertFalse(result);
    }

    @Test
    void testIsFileArray_InvalidSchema() {
        // Given
        JSONObject param = new JSONObject();
        param.put("invalid", "data");

        // When
        boolean result = WorkflowBotParamServiceImpl.isFileArray(param);

        // Then
        assertFalse(result);
    }

    @Test
    void testHandleFileReqInput_WithValidFileUser() {
        // Given
        ChatFileReq fileReq = ChatFileReq.builder()
                .fileId("file123")
                .reqId(null)
                .build();

        ChatFileUser fileUser = ChatFileUser.builder()
                .fileUrl("http://file.com/image.jpg")
                .build();

        JSONObject testInputs = new JSONObject();
        String key = "image";

        when(chatDataService.getByFileId("file123", uid)).thenReturn(fileUser);

        // When
        workflowBotParamService.handleSingleParam(uid, chatId, sseId, leftId, "", extraInputs, reqId, testInputs, botId);

        // Use reflection to test private method behavior indirectly through the public method
        when(chatDataService.getFileList(uid, chatId)).thenReturn(List.of(fileReq));
        when(chatDataService.getReqModelWithImgByChatId(uid, chatId)).thenReturn(Collections.emptyList());

        workflowBotParamService.handleSingleParam(uid, chatId, sseId, leftId, "", extraInputs, reqId, testInputs, botId);

        // Then
        verify(chatDataService).getByFileId("file123", uid);
        verify(chatDataService).updateFileReqId(chatId, uid, Collections.singletonList("file123"), reqId, false, leftId);
    }

    @Test
    void testHandleFileReqInput_FileUserNotFound() {
        // Given
        ChatFileReq fileReq = ChatFileReq.builder()
                .fileId("file123")
                .build();

        when(chatDataService.getFileList(uid, chatId)).thenReturn(List.of(fileReq));
        when(chatDataService.getReqModelWithImgByChatId(uid, chatId)).thenReturn(Collections.emptyList());
        when(chatDataService.getByFileId("file123", uid)).thenReturn(null);

        // When
        workflowBotParamService.handleSingleParam(uid, chatId, sseId, leftId, "", extraInputs, reqId, inputs, botId);

        // Then
        verify(chatDataService).getByFileId("file123", uid);
        verify(chatDataService, never()).updateFileReqId(anyLong(), anyString(), anyList(), anyLong(), anyBoolean(), anyLong());
        assertTrue(inputs.isEmpty());
    }

    private JSONObject createSchemaJson(String type) {
        JSONObject schema = new JSONObject();
        schema.put("type", type);
        return schema;
    }
}
