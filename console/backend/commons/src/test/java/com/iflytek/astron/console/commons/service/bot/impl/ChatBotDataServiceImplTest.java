package com.iflytek.astron.console.commons.service.bot.impl;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.iflytek.astron.console.commons.dto.bot.BotDetail;
import com.iflytek.astron.console.commons.dto.vcn.CustomV2VCNDTO;
import com.iflytek.astron.console.commons.entity.bot.*;
import com.iflytek.astron.console.commons.entity.chat.ChatList;
import com.iflytek.astron.console.commons.entity.model.McpData;
import com.iflytek.astron.console.commons.enums.bot.ReleaseTypeEnum;
import com.iflytek.astron.console.commons.mapper.bot.*;
import com.iflytek.astron.console.commons.mapper.chat.ChatListMapper;
import com.iflytek.astron.console.commons.mapper.vcn.CustomVCNMapper;
import com.iflytek.astron.console.commons.service.bot.BotFavoriteService;
import com.iflytek.astron.console.commons.service.data.IDatasetInfoService;
import com.iflytek.astron.console.commons.service.mcp.McpDataService;
import com.iflytek.astron.console.commons.util.MaasUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatBotDataServiceImplTest {

    @Mock
    private ChatBotBaseMapper chatBotBaseMapper;

    @Mock
    private ChatBotListMapper chatBotListMapper;

    @Mock
    private ChatBotMarketMapper chatBotMarketMapper;

    @Mock
    private BotDatasetMapper botDatasetMapper;

    @Mock
    private MaasUtil maasUtil;

    @Mock
    private ChatListMapper chatListMapper;

    @Mock
    private ChatBotPromptStructMapper promptStructMapper;

    @Mock
    private BotFavoriteService botFavoriteService;

    @Mock
    private IDatasetInfoService datasetInfoService;

    @Mock
    private CustomVCNMapper customVCNMapper;

    @Mock
    private ChatBotApiMapper botApiMapper;

    @Mock
    private McpDataService mcpDataService;

    @InjectMocks
    private ChatBotDataServiceImpl chatBotDataService;

    private ChatBotBase testBot;
    private static final String TEST_UID = "test-uid";
    private static final Integer TEST_BOT_ID = 1;
    private static final Long TEST_SPACE_ID = 100L;

    @BeforeAll
    static void initMybatisPlus() {
        // Initialize MyBatis-Plus TableInfo to support Lambda expressions
        MybatisConfiguration configuration = new MybatisConfiguration();
        MapperBuilderAssistant assistant = new MapperBuilderAssistant(configuration, "");

        TableInfoHelper.initTableInfo(assistant, ChatBotBase.class);
        TableInfoHelper.initTableInfo(assistant, ChatBotList.class);
        TableInfoHelper.initTableInfo(assistant, ChatBotMarket.class);
        TableInfoHelper.initTableInfo(assistant, BotDataset.class);
        TableInfoHelper.initTableInfo(assistant, ChatList.class);
    }

    @BeforeEach
    void setUp() {
        testBot = new ChatBotBase();
        testBot.setId(TEST_BOT_ID);
        testBot.setUid(TEST_UID);
        testBot.setSpaceId(TEST_SPACE_ID);
        testBot.setBotName("Test Bot");
        testBot.setBotDesc("Test Description");
        testBot.setIsDelete(0);
        testBot.setCreateTime(LocalDateTime.now());
        testBot.setUpdateTime(LocalDateTime.now());
    }

    // ========== Query Method Tests ==========

    @Test
    void testFindById_Success() {
        when(chatBotBaseMapper.selectById(TEST_BOT_ID)).thenReturn(testBot);

        Optional<ChatBotBase> result = chatBotDataService.findById(TEST_BOT_ID);

        assertTrue(result.isPresent());
        assertEquals(TEST_BOT_ID, result.get().getId());
        verify(chatBotBaseMapper).selectById(TEST_BOT_ID);
    }

    @Test
    void testFindById_NotFound() {
        when(chatBotBaseMapper.selectById(TEST_BOT_ID)).thenReturn(null);

        Optional<ChatBotBase> result = chatBotDataService.findById(TEST_BOT_ID);

        assertFalse(result.isPresent());
        verify(chatBotBaseMapper).selectById(TEST_BOT_ID);
    }

    @Test
    void testFindByIdAndSpaceId_Success() {
        when(chatBotBaseMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(testBot);

        Optional<ChatBotBase> result = chatBotDataService.findByIdAndSpaceId(TEST_BOT_ID, TEST_SPACE_ID);

        assertTrue(result.isPresent());
        assertEquals(TEST_BOT_ID, result.get().getId());
        verify(chatBotBaseMapper).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindByUid_Success() {
        List<ChatBotBase> expectedBots = Arrays.asList(testBot);
        when(chatBotBaseMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(expectedBots);

        List<ChatBotBase> result = chatBotDataService.findByUid(TEST_UID);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(TEST_BOT_ID, result.get(0).getId());
        verify(chatBotBaseMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindByUidAndSpaceId_Success() {
        List<ChatBotBase> expectedBots = Arrays.asList(testBot);
        when(chatBotBaseMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(expectedBots);

        List<ChatBotBase> result = chatBotDataService.findByUidAndSpaceId(TEST_UID, TEST_SPACE_ID);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(chatBotBaseMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindBySpaceId_Success() {
        List<ChatBotBase> expectedBots = Arrays.asList(testBot);
        when(chatBotBaseMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(expectedBots);

        List<ChatBotBase> result = chatBotDataService.findBySpaceId(TEST_SPACE_ID);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(chatBotBaseMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindByBotType_Success() {
        Integer botType = 1;
        List<ChatBotBase> expectedBots = Arrays.asList(testBot);
        when(chatBotBaseMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(expectedBots);

        List<ChatBotBase> result = chatBotDataService.findByBotType(botType);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(chatBotBaseMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindByBotTypeAndSpaceId_Success() {
        Integer botType = 1;
        List<ChatBotBase> expectedBots = Arrays.asList(testBot);
        when(chatBotBaseMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(expectedBots);

        List<ChatBotBase> result = chatBotDataService.findByBotTypeAndSpaceId(botType, TEST_SPACE_ID);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(chatBotBaseMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindActiveBotsBy_WithUid() {
        List<ChatBotBase> expectedBots = Arrays.asList(testBot);
        when(chatBotBaseMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(expectedBots);

        List<ChatBotBase> result = chatBotDataService.findActiveBotsBy(TEST_UID);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(chatBotBaseMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindActiveBotsBy_WithUidAndSpaceId() {
        List<ChatBotBase> expectedBots = Arrays.asList(testBot);
        when(chatBotBaseMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(expectedBots);

        List<ChatBotBase> result = chatBotDataService.findActiveBotsBy(TEST_UID, TEST_SPACE_ID);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(chatBotBaseMapper).selectList(any(LambdaQueryWrapper.class));
    }

    // ========== Create and Update Method Tests ==========

    @Test
    void testCreateBot_Success() {
        when(chatBotBaseMapper.insert(any(ChatBotBase.class))).thenReturn(1);

        ChatBotBase result = chatBotDataService.createBot(testBot);

        assertNotNull(result);
        assertEquals(testBot.getBotName(), result.getBotName());
        verify(chatBotBaseMapper).insert(testBot);
    }

    @Test
    void testUpdateBot_Success() {
        when(chatBotBaseMapper.updateById(any(ChatBotBase.class))).thenReturn(1);

        ChatBotBase result = chatBotDataService.updateBot(testBot);

        assertNotNull(result);
        verify(chatBotBaseMapper).updateById(testBot);
    }

    @Test
    void testUpdateBotBasicInfo_Success() {
        String botDesc = "Updated Description";
        String prologue = "Updated Prologue";
        String inputExamples = "Example 1,Example 2";

        when(chatBotBaseMapper.update(isNull(), any(LambdaUpdateWrapper.class))).thenReturn(1);

        boolean result = chatBotDataService.updateBotBasicInfo(TEST_BOT_ID, botDesc, prologue, inputExamples);

        assertTrue(result);
        verify(chatBotBaseMapper).update(isNull(), any(LambdaUpdateWrapper.class));
    }

    @Test
    void testUpdateBotBasicInfo_Failure() {
        when(chatBotBaseMapper.update(isNull(), any(LambdaUpdateWrapper.class))).thenReturn(0);

        boolean result = chatBotDataService.updateBotBasicInfo(TEST_BOT_ID, "desc", "prologue", "examples");

        assertFalse(result);
    }

    // ========== Delete Method Tests ==========

    @Test
    void testDeleteBot_WithBotId_Success() {
        when(chatBotBaseMapper.updateById(any(ChatBotBase.class))).thenReturn(1);

        boolean result = chatBotDataService.deleteBot(TEST_BOT_ID);

        assertTrue(result);
        ArgumentCaptor<ChatBotBase> captor = ArgumentCaptor.forClass(ChatBotBase.class);
        verify(chatBotBaseMapper).updateById(captor.capture());
        assertEquals(1, captor.getValue().getIsDelete());
    }

    @Test
    void testDeleteBot_WithBotIdAndUid_Success() {
        when(chatBotBaseMapper.update(isNull(), any(LambdaUpdateWrapper.class))).thenReturn(1);
        when(chatBotListMapper.update(isNull(), any(LambdaUpdateWrapper.class))).thenReturn(1);
        when(chatListMapper.update(isNull(), any(LambdaUpdateWrapper.class))).thenReturn(1);
        when(chatBotMarketMapper.update(isNull(), any(LambdaUpdateWrapper.class))).thenReturn(1);

        boolean result = chatBotDataService.deleteBot(TEST_BOT_ID, TEST_UID);

        assertTrue(result);
        verify(chatBotBaseMapper).update(isNull(), any(LambdaUpdateWrapper.class));
        verify(chatBotListMapper).update(isNull(), any(LambdaUpdateWrapper.class));
        verify(chatListMapper).update(isNull(), any(LambdaUpdateWrapper.class));
        verify(chatBotMarketMapper).update(isNull(), any(LambdaUpdateWrapper.class));
    }

    @Test
    void testDeleteBot_WithBotIdAndSpaceId_Success() {
        when(chatBotBaseMapper.update(any(ChatBotBase.class), any(LambdaQueryWrapper.class))).thenReturn(1);

        boolean result = chatBotDataService.deleteBot(TEST_BOT_ID, TEST_SPACE_ID);

        assertTrue(result);
        verify(chatBotBaseMapper).update(any(ChatBotBase.class), any(LambdaQueryWrapper.class));
    }

    @Test
    void testDeleteBotsByIds_Success() {
        List<Integer> botIds = Arrays.asList(1, 2, 3);
        when(chatBotBaseMapper.update(any(ChatBotBase.class), any(LambdaQueryWrapper.class))).thenReturn(3);

        boolean result = chatBotDataService.deleteBotsByIds(botIds);

        assertTrue(result);
        verify(chatBotBaseMapper).update(any(ChatBotBase.class), any(LambdaQueryWrapper.class));
    }

    @Test
    void testDeleteBotsByIds_EmptyList() {
        List<Integer> botIds = new ArrayList<>();

        boolean result = chatBotDataService.deleteBotsByIds(botIds);

        assertFalse(result);
        verify(chatBotBaseMapper, never()).update(any(), any());
    }

    @Test
    void testDeleteBotsByIds_WithSpaceId_Success() {
        List<Integer> botIds = Arrays.asList(1, 2, 3);
        when(chatBotBaseMapper.update(any(ChatBotBase.class), any(LambdaQueryWrapper.class))).thenReturn(3);

        boolean result = chatBotDataService.deleteBotsByIds(botIds, TEST_SPACE_ID);

        assertTrue(result);
        verify(chatBotBaseMapper).update(any(ChatBotBase.class), any(LambdaQueryWrapper.class));
    }

    // ========== Statistics Method Tests ==========

    @Test
    void testCountBotsByUid_Success() {
        when(chatBotBaseMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(5L);

        long result = chatBotDataService.countBotsByUid(TEST_UID);

        assertEquals(5L, result);
        verify(chatBotBaseMapper).selectCount(any(LambdaQueryWrapper.class));
    }

    @Test
    void testCountBotsByUid_WithSpaceId_Success() {
        when(chatBotBaseMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(3L);

        long result = chatBotDataService.countBotsByUid(TEST_UID, TEST_SPACE_ID);

        assertEquals(3L, result);
        verify(chatBotBaseMapper).selectCount(any(LambdaQueryWrapper.class));
    }

    // ========== User Bot List Related Tests ==========

    @Test
    void testFindUserBotList_Success() {
        ChatBotList botList = new ChatBotList();
        botList.setUid(TEST_UID);
        botList.setIsAct(1);

        when(chatBotListMapper.selectList(any(LambdaQueryWrapper.class)))
                .thenReturn(Arrays.asList(botList));

        List<ChatBotList> result = chatBotDataService.findUserBotList(TEST_UID);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(chatBotListMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testAddBotToUserList_Success() {
        ChatBotList botList = new ChatBotList();
        botList.setUid(TEST_UID);
        when(chatBotListMapper.insert(any(ChatBotList.class))).thenReturn(1);

        ChatBotList result = chatBotDataService.addBotToUserList(botList);

        assertNotNull(result);
        verify(chatBotListMapper).insert(botList);
    }

    @Test
    void testRemoveBotFromUserList_Success() {
        Integer marketBotId = 1;
        when(chatBotListMapper.update(any(ChatBotList.class), any(LambdaQueryWrapper.class))).thenReturn(1);

        boolean result = chatBotDataService.removeBotFromUserList(TEST_UID, marketBotId);

        assertTrue(result);
        verify(chatBotListMapper).update(any(ChatBotList.class), any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindByUidAndBotId_Success() {
        ChatBotList botList = new ChatBotList();
        when(chatBotListMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(botList);

        ChatBotList result = chatBotDataService.findByUidAndBotId(TEST_UID, TEST_BOT_ID);

        assertNotNull(result);
        verify(chatBotListMapper).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    void testCreateUserBotList_Success() {
        ChatBotList botList = new ChatBotList();
        when(chatBotListMapper.insert(any(ChatBotList.class))).thenReturn(1);

        ChatBotList result = chatBotDataService.createUserBotList(botList);

        assertNotNull(result);
        verify(chatBotListMapper).insert(botList);
    }

    // ========== Market Related Tests ==========

    @Test
    void testFindMarketBots_Success() {
        ChatBotMarket marketBot = new ChatBotMarket();
        marketBot.setBotStatus(2);
        Page<ChatBotMarket> page = new Page<>();
        page.setRecords(Arrays.asList(marketBot));

        when(chatBotMarketMapper.selectPage(any(Page.class), any(LambdaQueryWrapper.class)))
                .thenReturn(page);

        List<ChatBotMarket> result = chatBotDataService.findMarketBots(2, 1, 10);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(chatBotMarketMapper).selectPage(any(Page.class), any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindMarketBotsByHot_Success() {
        ChatBotMarket marketBot = new ChatBotMarket();
        when(chatBotMarketMapper.selectList(any(LambdaQueryWrapper.class)))
                .thenReturn(Arrays.asList(marketBot));

        List<ChatBotMarket> result = chatBotDataService.findMarketBotsByHot(10);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(chatBotMarketMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testSearchMarketBots_WithKeyword() {
        ChatBotMarket marketBot = new ChatBotMarket();
        when(chatBotMarketMapper.selectList(any(LambdaQueryWrapper.class)))
                .thenReturn(Arrays.asList(marketBot));

        List<ChatBotMarket> result = chatBotDataService.searchMarketBots("test", 1);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(chatBotMarketMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testSearchMarketBots_WithoutKeyword() {
        ChatBotMarket marketBot = new ChatBotMarket();
        when(chatBotMarketMapper.selectList(any(LambdaQueryWrapper.class)))
                .thenReturn(Arrays.asList(marketBot));

        List<ChatBotMarket> result = chatBotDataService.searchMarketBots(null, 1);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(chatBotMarketMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindMarketBotByBotId_Success() {
        ChatBotMarket marketBot = new ChatBotMarket();
        when(chatBotMarketMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(marketBot);

        ChatBotMarket result = chatBotDataService.findMarketBotByBotId(TEST_BOT_ID);

        assertNotNull(result);
        verify(chatBotMarketMapper).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindMarketBotByBotId_Null() {
        ChatBotMarket result = chatBotDataService.findMarketBotByBotId(null);

        assertNull(result);
        verify(chatBotMarketMapper, never()).selectOne(any());
    }

    // ========== Business Logic Method Tests ==========

    @Test
    void testBotIsDeleted_BotDeleted() {
        when(chatBotBaseMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(testBot);

        boolean result = chatBotDataService.botIsDeleted(TEST_BOT_ID.longValue());

        assertTrue(result);
        verify(chatBotBaseMapper).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    void testBotIsDeleted_BotNotDeleted() {
        when(chatBotBaseMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);
        when(chatBotMarketMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);

        boolean result = chatBotDataService.botIsDeleted(TEST_BOT_ID.longValue());

        assertFalse(result);
    }

    @Test
    void testBotIsDeleted_NullBotId() {
        boolean result = chatBotDataService.botIsDeleted(null);

        assertFalse(result);
        verify(chatBotBaseMapper, never()).selectOne(any());
    }

    @Test
    void testCheckRepeatBotName_Duplicate() {
        when(chatBotBaseMapper.exists(any(QueryWrapper.class))).thenReturn(true);

        Boolean result = chatBotDataService.checkRepeatBotName(TEST_UID, TEST_BOT_ID, "Test Bot", TEST_SPACE_ID);

        assertTrue(result);
        verify(chatBotBaseMapper).exists(any(QueryWrapper.class));
    }

    @Test
    void testCheckRepeatBotName_NotDuplicate() {
        when(chatBotBaseMapper.exists(any(QueryWrapper.class))).thenReturn(false);

        Boolean result = chatBotDataService.checkRepeatBotName(TEST_UID, TEST_BOT_ID, "Test Bot", TEST_SPACE_ID);

        assertFalse(result);
        verify(chatBotBaseMapper).exists(any(QueryWrapper.class));
    }

    @Test
    void testCheckRepeatBotName_NullSpaceId() {
        when(chatBotBaseMapper.exists(any(QueryWrapper.class))).thenReturn(false);

        Boolean result = chatBotDataService.checkRepeatBotName(TEST_UID, TEST_BOT_ID, "Test Bot", null);

        assertFalse(result);
        verify(chatBotBaseMapper).exists(any(QueryWrapper.class));
    }

    @Test
    void testTakeoffBot_NotExist() {
        TakeoffList takeoffList = new TakeoffList();
        takeoffList.setBotId(TEST_BOT_ID);

        when(chatBotMarketMapper.exists(any(UpdateWrapper.class))).thenReturn(false);

        Boolean result = chatBotDataService.takeoffBot(TEST_UID, TEST_SPACE_ID, takeoffList);

        assertTrue(result);
        verify(chatBotMarketMapper).exists(any(UpdateWrapper.class));
        verify(chatBotMarketMapper, never()).update(any(), any());
    }

    @Test
    void testTakeoffBot_Success() {
        TakeoffList takeoffList = new TakeoffList();
        takeoffList.setBotId(TEST_BOT_ID);

        when(chatBotMarketMapper.exists(any(UpdateWrapper.class))).thenReturn(true);
        when(chatBotMarketMapper.update(isNull(), any(UpdateWrapper.class))).thenReturn(1);
        doNothing().when(botFavoriteService).delete(TEST_UID, TEST_BOT_ID);

        Boolean result = chatBotDataService.takeoffBot(TEST_UID, TEST_SPACE_ID, takeoffList);

        assertTrue(result);
        verify(chatBotMarketMapper).update(isNull(), any(UpdateWrapper.class));
        verify(botFavoriteService).delete(TEST_UID, TEST_BOT_ID);
    }

    @Test
    void testGetBotDetail_Success() {
        BotDetail botDetail = new BotDetail();
        botDetail.setId(TEST_BOT_ID);
        botDetail.setBotName("Test Bot");

        when(chatBotBaseMapper.botDetail(TEST_BOT_ID.intValue())).thenReturn(botDetail);

        BotDetail result = chatBotDataService.getBotDetail(TEST_BOT_ID.longValue());

        assertNotNull(result);
        assertEquals(TEST_BOT_ID, result.getId());
        verify(chatBotBaseMapper).botDetail(TEST_BOT_ID.intValue());
    }

    @Test
    void testGetVcnDetail_Success() {
        String vcnCode = "test-vcn";
        CustomV2VCNDTO vcnDTO = new CustomV2VCNDTO();
        vcnDTO.setVcnId("1");
        vcnDTO.setName("Test VCN");
        vcnDTO.setUid(TEST_UID);
        vcnDTO.setAvatar("avatar.png");
        vcnDTO.setTryVCNUrl("audio.mp3");

        when(customVCNMapper.getVcnByCode(vcnCode)).thenReturn(vcnDTO);

        Map<String, Object> result = chatBotDataService.getVcnDetail(vcnCode);

        assertNotNull(result);
        assertEquals("1", result.get("id")); // VcnId is a String type
        assertEquals("Test VCN", result.get("name"));
        assertEquals(vcnCode, result.get("vcn"));
        assertEquals(TEST_UID, result.get("mode"));
        verify(customVCNMapper).getVcnByCode(vcnCode);
    }

    @Test
    void testGetVcnDetail_NotFound() {
        String vcnCode = "test-vcn";
        when(customVCNMapper.getVcnByCode(vcnCode)).thenReturn(null);

        Map<String, Object> result = chatBotDataService.getVcnDetail(vcnCode);

        assertNull(result);
        verify(customVCNMapper).getVcnByCode(vcnCode);
    }

    @Test
    void testGetReleaseChannel_AllChannels() {
        when(chatBotMarketMapper.exists(any(LambdaQueryWrapper.class))).thenReturn(true);
        when(botApiMapper.exists(any(LambdaQueryWrapper.class))).thenReturn(true);

        McpData mcpData = new McpData();
        mcpData.setReleased(1);
        when(mcpDataService.getMcp(TEST_BOT_ID.longValue())).thenReturn(mcpData);

        List<Integer> result = chatBotDataService.getReleaseChannel(TEST_UID, TEST_BOT_ID);

        assertNotNull(result);
        assertEquals(3, result.size());
        assertTrue(result.contains(ReleaseTypeEnum.MARKET.getCode()));
        assertTrue(result.contains(ReleaseTypeEnum.BOT_API.getCode()));
        assertTrue(result.contains(ReleaseTypeEnum.MCP.getCode()));
    }

    @Test
    void testGetReleaseChannel_NoChannels() {
        when(chatBotMarketMapper.exists(any(LambdaQueryWrapper.class))).thenReturn(false);
        when(botApiMapper.exists(any(LambdaQueryWrapper.class))).thenReturn(false);
        when(mcpDataService.getMcp(TEST_BOT_ID.longValue())).thenReturn(null);

        List<Integer> result = chatBotDataService.getReleaseChannel(TEST_UID, TEST_BOT_ID);

        assertNotNull(result);
        assertEquals(0, result.size());
    }

    @Test
    void testDeleteBotForDeleteSpace_Success() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        List<ChatBotBase> bots = Arrays.asList(testBot);

        when(chatBotBaseMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(bots);
        when(chatBotBaseMapper.update(any(LambdaUpdateWrapper.class))).thenReturn(1);
        when(chatBotMarketMapper.update(isNull(), any(LambdaUpdateWrapper.class))).thenReturn(1);
        when(botDatasetMapper.update(isNull(), any(LambdaUpdateWrapper.class))).thenReturn(1);
        when(maasUtil.deleteSynchronize(anyInt(), anyLong(), any())).thenReturn(null);

        chatBotDataService.deleteBotForDeleteSpace(TEST_UID, TEST_SPACE_ID, request);

        verify(chatBotBaseMapper, atLeastOnce()).selectList(any(LambdaQueryWrapper.class));
        verify(chatBotMarketMapper).update(isNull(), any(LambdaUpdateWrapper.class));
        verify(botDatasetMapper).update(isNull(), any(LambdaUpdateWrapper.class));
        verify(maasUtil).deleteSynchronize(eq(TEST_BOT_ID), eq(TEST_SPACE_ID), eq(request));
    }

    @Test
    void testDeleteBotForDeleteSpace_NullSpaceId() {
        HttpServletRequest request = mock(HttpServletRequest.class);

        chatBotDataService.deleteBotForDeleteSpace(TEST_UID, null, request);

        verify(chatBotBaseMapper, never()).selectList(any());
    }

    @Test
    void testDeleteBotForDeleteSpace_EmptyBotList() {
        HttpServletRequest request = mock(HttpServletRequest.class);

        when(chatBotBaseMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(new ArrayList<>());
        when(chatBotBaseMapper.update(any(LambdaUpdateWrapper.class))).thenReturn(0);
        when(botDatasetMapper.update(isNull(), any(LambdaUpdateWrapper.class))).thenReturn(0);

        chatBotDataService.deleteBotForDeleteSpace(TEST_UID, TEST_SPACE_ID, request);

        verify(chatBotMarketMapper, never()).update(any(), any());
        verify(maasUtil, never()).deleteSynchronize(anyInt(), anyLong(), any());
    }

    @Test
    void testCopyBot_Success() {
        BotDetail botDetail = new BotDetail();
        botDetail.setId(TEST_BOT_ID);
        botDetail.setBotName("Original Bot");

        when(chatBotBaseMapper.botDetail(TEST_BOT_ID)).thenReturn(botDetail);
        when(chatBotBaseMapper.insert(any(ChatBotBase.class))).thenReturn(1);

        ChatBotBase result = chatBotDataService.copyBot(TEST_UID, TEST_BOT_ID, TEST_SPACE_ID);

        assertNotNull(result);
        assertEquals(TEST_UID, result.getUid());
        assertEquals(TEST_SPACE_ID, result.getSpaceId());
        verify(chatBotBaseMapper).botDetail(TEST_BOT_ID);
        verify(chatBotBaseMapper).insert(any(ChatBotBase.class));
    }

    // Note: testFindOne_WithSpaceId has been removed because it depends on the SpaceInfoUtil static
    // utility class,
    // which requires additional mockito-inline or integration test environment to support static method
    // mocking in unit tests
}
