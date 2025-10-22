package com.iflytek.astron.console.hub.service.chat.impl;

import com.iflytek.astron.console.commons.dto.chat.ChatRespModelDto;
import com.iflytek.astron.console.commons.entity.chat.ChatTraceSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class TraceToSourceServiceImplTest {

    @InjectMocks
    private TraceToSourceServiceImpl traceToSourceService;

    private List<ChatRespModelDto> respList;
    private List<ChatTraceSource> traceList;
    private ChatRespModelDto respDto1;
    private ChatRespModelDto respDto2;
    private ChatTraceSource traceSource1;
    private ChatTraceSource traceSource2;

    @BeforeEach
    void setUp() {
        // Setup response DTOs
        respDto1 = new ChatRespModelDto();
        respDto1.setId(1L);
        respDto1.setReqId(100L);
        respDto1.setMessage("First response");
        respDto1.setCreateTime(LocalDateTime.now());

        respDto2 = new ChatRespModelDto();
        respDto2.setId(2L);
        respDto2.setReqId(200L);
        respDto2.setMessage("Second response");
        respDto2.setCreateTime(LocalDateTime.now());

        respList = new ArrayList<>();
        respList.add(respDto1);
        respList.add(respDto2);

        // Setup trace sources
        traceSource1 = new ChatTraceSource();
        traceSource1.setId(1L);
        traceSource1.setReqId(100L);
        traceSource1.setType("knowledge_base");
        traceSource1.setContent("Knowledge base trace content");

        traceSource2 = new ChatTraceSource();
        traceSource2.setId(2L);
        traceSource2.setReqId(200L);
        traceSource2.setType("web_search");
        traceSource2.setContent("Web search trace content");

        traceList = new ArrayList<>();
        traceList.add(traceSource1);
        traceList.add(traceSource2);
    }

    @Test
    void testRespAddTrace_WithValidData_ShouldAddTraceToAllResponses() {
        // When
        traceToSourceService.respAddTrace(respList, traceList);

        // Then
        assertNotNull(respList);
        assertEquals(2, respList.size());

        // Verify first response has trace data (from last trace source due to overwriting)
        ChatRespModelDto firstResp = respList.get(0);
        assertEquals("Web search trace content", firstResp.getTraceSource());
        assertEquals("web_search", firstResp.getSourceType());

        // Verify second response has trace data (from last trace source due to overwriting)
        ChatRespModelDto secondResp = respList.get(1);
        assertEquals("Web search trace content", secondResp.getTraceSource());
        assertEquals("web_search", secondResp.getSourceType());
    }

    @Test
    void testRespAddTrace_WithEmptyRespList_ShouldHandleGracefully() {
        // Given
        List<ChatRespModelDto> emptyRespList = new ArrayList<>();

        // When
        traceToSourceService.respAddTrace(emptyRespList, traceList);

        // Then
        assertTrue(emptyRespList.isEmpty());
        // No exceptions should be thrown
    }

    @Test
    void testRespAddTrace_WithNullRespList_ShouldThrowException() {
        // When & Then
        assertThrows(NullPointerException.class, () -> {
            traceToSourceService.respAddTrace(null, traceList);
        });
    }

    @Test
    void testRespAddTrace_WithEmptyTraceList_ShouldNotModifyResponses() {
        // Given
        List<ChatTraceSource> emptyTraceList = new ArrayList<>();

        // Store original values
        String originalTraceSource1 = respDto1.getTraceSource();
        String originalSourceType1 = respDto1.getSourceType();
        String originalTraceSource2 = respDto2.getTraceSource();
        String originalSourceType2 = respDto2.getSourceType();

        // When
        traceToSourceService.respAddTrace(respList, emptyTraceList);

        // Then
        assertEquals(originalTraceSource1, respDto1.getTraceSource());
        assertEquals(originalSourceType1, respDto1.getSourceType());
        assertEquals(originalTraceSource2, respDto2.getTraceSource());
        assertEquals(originalSourceType2, respDto2.getSourceType());
    }

    @Test
    void testRespAddTrace_WithNullTraceList_ShouldThrowException() {
        // When & Then
        assertThrows(NullPointerException.class, () -> {
            traceToSourceService.respAddTrace(respList, null);
        });
    }

    @Test
    void testRespAddTrace_WithNullTraceSourceInList_ShouldSkipNullAndProcessOthers() {
        // Given
        List<ChatTraceSource> traceListWithNull = new ArrayList<>();
        traceListWithNull.add(traceSource1);
        traceListWithNull.add(null); // Null trace source
        traceListWithNull.add(traceSource2);

        // When
        traceToSourceService.respAddTrace(respList, traceListWithNull);

        // Then
        // Should have data from last non-null trace source
        ChatRespModelDto firstResp = respList.get(0);
        assertEquals("Web search trace content", firstResp.getTraceSource());
        assertEquals("web_search", firstResp.getSourceType());

        ChatRespModelDto secondResp = respList.get(1);
        assertEquals("Web search trace content", secondResp.getTraceSource());
        assertEquals("web_search", secondResp.getSourceType());
    }

    @Test
    void testRespAddTrace_WithAllNullTraceSourcesInList_ShouldNotModifyResponses() {
        // Given
        List<ChatTraceSource> allNullTraceList = new ArrayList<>();
        allNullTraceList.add(null);
        allNullTraceList.add(null);

        // Store original values
        String originalTraceSource1 = respDto1.getTraceSource();
        String originalSourceType1 = respDto1.getSourceType();
        String originalTraceSource2 = respDto2.getTraceSource();
        String originalSourceType2 = respDto2.getSourceType();

        // When
        traceToSourceService.respAddTrace(respList, allNullTraceList);

        // Then
        assertEquals(originalTraceSource1, respDto1.getTraceSource());
        assertEquals(originalSourceType1, respDto1.getSourceType());
        assertEquals(originalTraceSource2, respDto2.getTraceSource());
        assertEquals(originalSourceType2, respDto2.getSourceType());
    }

    @Test
    void testRespAddTrace_WithSingleTrace_ShouldApplyToAllResponses() {
        // Given
        List<ChatTraceSource> singleTraceList = Collections.singletonList(traceSource1);

        // When
        traceToSourceService.respAddTrace(respList, singleTraceList);

        // Then
        // Both responses should have the same trace data
        ChatRespModelDto firstResp = respList.get(0);
        assertEquals("Knowledge base trace content", firstResp.getTraceSource());
        assertEquals("knowledge_base", firstResp.getSourceType());

        ChatRespModelDto secondResp = respList.get(1);
        assertEquals("Knowledge base trace content", secondResp.getTraceSource());
        assertEquals("knowledge_base", secondResp.getSourceType());
    }

    @Test
    void testRespAddTrace_WithSingleResponse_ShouldProcessCorrectly() {
        // Given
        List<ChatRespModelDto> singleRespList = Collections.singletonList(respDto1);

        // When
        traceToSourceService.respAddTrace(singleRespList, traceList);

        // Then
        assertEquals(1, singleRespList.size());
        ChatRespModelDto response = singleRespList.get(0);
        assertEquals("Web search trace content", response.getTraceSource());
        assertEquals("web_search", response.getSourceType());
    }

    @Test
    void testRespAddTrace_WithNullContentInTraceSource_ShouldSetNullValues() {
        // Given
        ChatTraceSource nullContentTrace = new ChatTraceSource();
        nullContentTrace.setId(3L);
        nullContentTrace.setReqId(300L);
        nullContentTrace.setType("null_content_type");
        nullContentTrace.setContent(null); // Null content

        List<ChatTraceSource> nullContentTraceList = Collections.singletonList(nullContentTrace);

        // When
        traceToSourceService.respAddTrace(respList, nullContentTraceList);

        // Then
        ChatRespModelDto firstResp = respList.get(0);
        assertNull(firstResp.getTraceSource());
        assertEquals("null_content_type", firstResp.getSourceType());

        ChatRespModelDto secondResp = respList.get(1);
        assertNull(secondResp.getTraceSource());
        assertEquals("null_content_type", secondResp.getSourceType());
    }

    @Test
    void testRespAddTrace_WithNullTypeInTraceSource_ShouldSetNullType() {
        // Given
        ChatTraceSource nullTypeTrace = new ChatTraceSource();
        nullTypeTrace.setId(3L);
        nullTypeTrace.setReqId(300L);
        nullTypeTrace.setType(null); // Null type
        nullTypeTrace.setContent("Some content");

        List<ChatTraceSource> nullTypeTraceList = Collections.singletonList(nullTypeTrace);

        // When
        traceToSourceService.respAddTrace(respList, nullTypeTraceList);

        // Then
        ChatRespModelDto firstResp = respList.get(0);
        assertEquals("Some content", firstResp.getTraceSource());
        assertNull(firstResp.getSourceType());

        ChatRespModelDto secondResp = respList.get(1);
        assertEquals("Some content", secondResp.getTraceSource());
        assertNull(secondResp.getSourceType());
    }

    @Test
    void testRespAddTrace_WithEmptyStringContentAndType_ShouldSetEmptyValues() {
        // Given
        ChatTraceSource emptyStringTrace = new ChatTraceSource();
        emptyStringTrace.setId(3L);
        emptyStringTrace.setReqId(300L);
        emptyStringTrace.setType(""); // Empty type
        emptyStringTrace.setContent(""); // Empty content

        List<ChatTraceSource> emptyStringTraceList = Collections.singletonList(emptyStringTrace);

        // When
        traceToSourceService.respAddTrace(respList, emptyStringTraceList);

        // Then
        ChatRespModelDto firstResp = respList.get(0);
        assertEquals("", firstResp.getTraceSource());
        assertEquals("", firstResp.getSourceType());

        ChatRespModelDto secondResp = respList.get(1);
        assertEquals("", secondResp.getTraceSource());
        assertEquals("", secondResp.getSourceType());
    }

    @Test
    void testRespAddTrace_WithSpecialCharactersInContent_ShouldHandleCorrectly() {
        // Given
        ChatTraceSource specialCharTrace = new ChatTraceSource();
        specialCharTrace.setId(3L);
        specialCharTrace.setReqId(300L);
        specialCharTrace.setType("special_chars");
        // Test data with special characters
        specialCharTrace.setContent("Content with special chars: \"quotes\", {brackets}, [arrays], & symbols! 中文内容 🚀");

        List<ChatTraceSource> specialCharTraceList = Collections.singletonList(specialCharTrace);

        // When
        traceToSourceService.respAddTrace(respList, specialCharTraceList);

        // Then - Verify the Chinese content is preserved correctly
        String expectedContent = "Content with special chars: \"quotes\", {brackets}, [arrays], & symbols! 中文内容 🚀";

        ChatRespModelDto firstResp = respList.get(0);
        assertEquals(expectedContent, firstResp.getTraceSource());
        assertEquals("special_chars", firstResp.getSourceType());

        ChatRespModelDto secondResp = respList.get(1);
        assertEquals(expectedContent, secondResp.getTraceSource());
        assertEquals("special_chars", secondResp.getSourceType());
    }

    @Test
    void testRespAddTrace_WithLongContent_ShouldHandleCorrectly() {
        // Given
        StringBuilder longContentBuilder = new StringBuilder();
        for (int i = 0; i < 1000; i++) {
            longContentBuilder.append("This is a very long trace content. ");
        }
        String longContent = longContentBuilder.toString();

        ChatTraceSource longContentTrace = new ChatTraceSource();
        longContentTrace.setId(3L);
        longContentTrace.setReqId(300L);
        longContentTrace.setType("long_content");
        longContentTrace.setContent(longContent);

        List<ChatTraceSource> longContentTraceList = Collections.singletonList(longContentTrace);

        // When
        traceToSourceService.respAddTrace(respList, longContentTraceList);

        // Then
        ChatRespModelDto firstResp = respList.get(0);
        assertEquals(longContent, firstResp.getTraceSource());
        assertEquals("long_content", firstResp.getSourceType());
        assertTrue(firstResp.getTraceSource().length() > 30000);

        ChatRespModelDto secondResp = respList.get(1);
        assertEquals(longContent, secondResp.getTraceSource());
        assertEquals("long_content", secondResp.getSourceType());
        assertTrue(secondResp.getTraceSource().length() > 30000);
    }

    @Test
    void testRespAddTrace_OverwriteBehavior_ShouldUseLastTraceSource() {
        // Given - Multiple trace sources to verify overwrite behavior
        ChatTraceSource trace1 = new ChatTraceSource();
        trace1.setType("type1");
        trace1.setContent("content1");

        ChatTraceSource trace2 = new ChatTraceSource();
        trace2.setType("type2");
        trace2.setContent("content2");

        ChatTraceSource trace3 = new ChatTraceSource();
        trace3.setType("type3");
        trace3.setContent("content3");

        List<ChatTraceSource> multipleTraces = new ArrayList<>();
        multipleTraces.add(trace1);
        multipleTraces.add(trace2);
        multipleTraces.add(trace3);

        // When
        traceToSourceService.respAddTrace(respList, multipleTraces);

        // Then - Should have values from the last trace source
        ChatRespModelDto firstResp = respList.get(0);
        assertEquals("content3", firstResp.getTraceSource());
        assertEquals("type3", firstResp.getSourceType());

        ChatRespModelDto secondResp = respList.get(1);
        assertEquals("content3", secondResp.getTraceSource());
        assertEquals("type3", secondResp.getSourceType());
    }
}
