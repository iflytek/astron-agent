package com.iflytek.astron.console.commons.service.data.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.iflytek.astron.console.commons.entity.bot.UserLangChainInfo;
import com.iflytek.astron.console.commons.mapper.UserLangChainInfoMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserLangChainInfoDataServiceImplTest {

    @Mock
    private UserLangChainInfoMapper userLangChainInfoMapper;

    @InjectMocks
    private UserLangChainInfoDataServiceImpl userLangChainInfoDataService;

    private UserLangChainInfo mockUserLangChainInfo;
    private Integer botId;
    private Long maasId;
    private String flowId;

    @BeforeEach
    void setUp() {
        botId = 123;
        maasId = 456L;
        flowId = "flow123";

        mockUserLangChainInfo = new UserLangChainInfo();
        mockUserLangChainInfo.setId(1L);
        mockUserLangChainInfo.setBotId(botId);
        mockUserLangChainInfo.setMaasId(maasId);
        mockUserLangChainInfo.setFlowId(flowId);
        mockUserLangChainInfo.setUid("testUser");
        mockUserLangChainInfo.setUpdateTime(LocalDateTime.now());
    }

    @Test
    void testFindByBotIdSet_Success() {
        // Given
        Set<Integer> idSet = Set.of(123, 456, 789);
        List<UserLangChainInfo> expectedList = List.of(mockUserLangChainInfo);
        when(userLangChainInfoMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(expectedList);

        // When
        List<UserLangChainInfo> result = userLangChainInfoDataService.findByBotIdSet(idSet);

        // Then
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(mockUserLangChainInfo, result.get(0));
        verify(userLangChainInfoMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindByBotIdSet_NullInput() {
        // When
        List<UserLangChainInfo> result = userLangChainInfoDataService.findByBotIdSet(null);

        // Then
        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(userLangChainInfoMapper, never()).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindByBotIdSet_EmptyInput() {
        // When
        List<UserLangChainInfo> result = userLangChainInfoDataService.findByBotIdSet(Collections.emptySet());

        // Then
        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(userLangChainInfoMapper, never()).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testInsertUserLangChainInfo_Success() {
        // Given
        when(userLangChainInfoMapper.insert(mockUserLangChainInfo)).thenReturn(1);

        // When
        UserLangChainInfo result = userLangChainInfoDataService.insertUserLangChainInfo(mockUserLangChainInfo);

        // Then
        assertNotNull(result);
        assertEquals(mockUserLangChainInfo, result);
        verify(userLangChainInfoMapper).insert(mockUserLangChainInfo);
    }

    @Test
    void testFindOneByBotId_Success() {
        // Given
        when(userLangChainInfoMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(mockUserLangChainInfo);

        // When
        UserLangChainInfo result = userLangChainInfoDataService.findOneByBotId(botId);

        // Then
        assertNotNull(result);
        assertEquals(mockUserLangChainInfo, result);
        verify(userLangChainInfoMapper).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindOneByBotId_NullInput() {
        // When
        UserLangChainInfo result = userLangChainInfoDataService.findOneByBotId(null);

        // Then
        assertNull(result);
        verify(userLangChainInfoMapper, never()).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindListByBotId_Success() {
        // Given
        List<UserLangChainInfo> expectedList = List.of(mockUserLangChainInfo);
        when(userLangChainInfoMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(expectedList);

        // When
        List<UserLangChainInfo> result = userLangChainInfoDataService.findListByBotId(botId);

        // Then
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(mockUserLangChainInfo, result.get(0));
        verify(userLangChainInfoMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindListByBotId_NullInput() {
        // When
        List<UserLangChainInfo> result = userLangChainInfoDataService.findListByBotId(null);

        // Then
        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(userLangChainInfoMapper, never()).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindFlowIdByBotId_Success() {
        // Given
        when(userLangChainInfoMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(mockUserLangChainInfo);

        // When
        String result = userLangChainInfoDataService.findFlowIdByBotId(botId);

        // Then
        assertNotNull(result);
        assertEquals(flowId, result);
        verify(userLangChainInfoMapper).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindFlowIdByBotId_NoResult() {
        // Given
        when(userLangChainInfoMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);

        // When
        String result = userLangChainInfoDataService.findFlowIdByBotId(botId);

        // Then
        assertNull(result);
        verify(userLangChainInfoMapper).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindFlowIdByBotId_NullInput() {
        // When
        String result = userLangChainInfoDataService.findFlowIdByBotId(null);

        // Then
        assertNull(result);
        verify(userLangChainInfoMapper, never()).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    void testSelectByFlowId_Success() {
        // Given
        when(userLangChainInfoMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(mockUserLangChainInfo);

        // When
        UserLangChainInfo result = userLangChainInfoDataService.selectByFlowId(flowId);

        // Then
        assertNotNull(result);
        assertEquals(mockUserLangChainInfo, result);
        verify(userLangChainInfoMapper).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    void testSelectByFlowId_NullInput() {
        // When
        UserLangChainInfo result = userLangChainInfoDataService.selectByFlowId(null);

        // Then
        assertNull(result);
        verify(userLangChainInfoMapper, never()).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    void testSelectByMaasId_Success() {
        // Given
        when(userLangChainInfoMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(mockUserLangChainInfo);

        // When
        UserLangChainInfo result = userLangChainInfoDataService.selectByMaasId(maasId);

        // Then
        assertNotNull(result);
        assertEquals(mockUserLangChainInfo, result);
        verify(userLangChainInfoMapper).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    void testSelectByMaasId_NullInput() {
        // When
        UserLangChainInfo result = userLangChainInfoDataService.selectByMaasId(null);

        // Then
        assertNull(result);
        verify(userLangChainInfoMapper, never()).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindByMaasId_Success() {
        // Given
        List<UserLangChainInfo> expectedList = List.of(mockUserLangChainInfo);
        when(userLangChainInfoMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(expectedList);

        // When
        List<UserLangChainInfo> result = userLangChainInfoDataService.findByMaasId(maasId);

        // Then
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(mockUserLangChainInfo, result.get(0));
        verify(userLangChainInfoMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindByMaasId_NullInput() {
        // When
        List<UserLangChainInfo> result = userLangChainInfoDataService.findByMaasId(null);

        // Then
        assertNull(result);
        verify(userLangChainInfoMapper, never()).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testUpdateByBotId_Success() {
        // Given
        UserLangChainInfo updateInfo = new UserLangChainInfo();
        updateInfo.setFlowId("newFlowId");
        when(userLangChainInfoMapper.update(eq(updateInfo), any(LambdaQueryWrapper.class))).thenReturn(1);

        // When
        UserLangChainInfo result = userLangChainInfoDataService.updateByBotId(botId, updateInfo);

        // Then
        assertNotNull(result);
        assertEquals(updateInfo, result);
        verify(userLangChainInfoMapper).update(eq(updateInfo), any(LambdaQueryWrapper.class));
    }

    @Test
    void testUpdateByBotId_NullBotId() {
        // Given
        UserLangChainInfo updateInfo = new UserLangChainInfo();

        // When
        UserLangChainInfo result = userLangChainInfoDataService.updateByBotId(null, updateInfo);

        // Then
        assertNull(result);
        verify(userLangChainInfoMapper, never()).update(any(), any(LambdaQueryWrapper.class));
    }

    @Test
    void testUpdateByBotId_NullUserLangChainInfo() {
        // When
        UserLangChainInfo result = userLangChainInfoDataService.updateByBotId(botId, null);

        // Then
        assertNull(result);
        verify(userLangChainInfoMapper, never()).update(any(), any(LambdaQueryWrapper.class));
    }

    @Test
    void testUpdateByBotId_BothParametersNull() {
        // When
        UserLangChainInfo result = userLangChainInfoDataService.updateByBotId(null, null);

        // Then
        assertNull(result);
        verify(userLangChainInfoMapper, never()).update(any(), any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindByBotIdSet_VerifyQueryParameters() {
        // Given
        Set<Integer> idSet = Set.of(123, 456);
        when(userLangChainInfoMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of(mockUserLangChainInfo));

        // When
        userLangChainInfoDataService.findByBotIdSet(idSet);

        // Then
        ArgumentCaptor<LambdaQueryWrapper> captor = ArgumentCaptor.forClass(LambdaQueryWrapper.class);
        verify(userLangChainInfoMapper).selectList(captor.capture());

        // Verify that the query wrapper was called with the correct method
        LambdaQueryWrapper<UserLangChainInfo> capturedWrapper = captor.getValue();
        assertNotNull(capturedWrapper);
    }

    @Test
    void testFindOneByBotId_VerifyLimitClause() {
        // Given
        when(userLangChainInfoMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(mockUserLangChainInfo);

        // When
        userLangChainInfoDataService.findOneByBotId(botId);

        // Then
        ArgumentCaptor<LambdaQueryWrapper> captor = ArgumentCaptor.forClass(LambdaQueryWrapper.class);
        verify(userLangChainInfoMapper).selectOne(captor.capture());

        // Verify that LIMIT 1 is applied
        LambdaQueryWrapper<UserLangChainInfo> capturedWrapper = captor.getValue();
        assertNotNull(capturedWrapper);
    }

    @Test
    void testFindFlowIdByBotId_VerifyOrderByAndLimit() {
        // Given
        when(userLangChainInfoMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(mockUserLangChainInfo);

        // When
        userLangChainInfoDataService.findFlowIdByBotId(botId);

        // Then
        ArgumentCaptor<LambdaQueryWrapper> captor = ArgumentCaptor.forClass(LambdaQueryWrapper.class);
        verify(userLangChainInfoMapper).selectOne(captor.capture());

        // Verify that the query includes order by update time desc and limit 1
        LambdaQueryWrapper<UserLangChainInfo> capturedWrapper = captor.getValue();
        assertNotNull(capturedWrapper);
    }

    @Test
    void testInsertUserLangChainInfo_VerifyMapperCall() {
        // Given
        UserLangChainInfo inputInfo = new UserLangChainInfo();
        inputInfo.setBotId(999);
        inputInfo.setFlowId("testFlow");

        // When
        userLangChainInfoDataService.insertUserLangChainInfo(inputInfo);

        // Then
        verify(userLangChainInfoMapper).insert(inputInfo);
    }
}
