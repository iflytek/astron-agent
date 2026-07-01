package com.iflytek.astron.console.hub.service.agentmemory.impl;

import com.iflytek.astron.console.commons.entity.agentmemory.AgentMemoryConfig;
import com.iflytek.astron.console.commons.mapper.agentmemory.AgentMemoryConfigMapper;
import com.iflytek.astron.console.commons.mapper.bot.ChatBotBaseMapper;
import com.iflytek.astron.console.hub.dto.agentmemory.AgentMemoryConfigDto;
import com.iflytek.astron.console.hub.dto.agentmemory.SaveAgentMemoryConfigRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AgentMemoryServiceImplTest {

    @Mock
    private AgentMemoryConfigMapper configMapper;

    @Mock
    private ChatBotBaseMapper chatBotBaseMapper;

    @InjectMocks
    private AgentMemoryServiceImpl service;

    @Test
    void getConfigReturnsDisabledDefaultWhenNotConfigured() {
        when(chatBotBaseMapper.checkBotPermission(7, "u1", 3L)).thenReturn(1);
        when(configMapper.selectOne(any())).thenReturn(null);

        AgentMemoryConfigDto dto = service.getConfig("u1", 3L, 7);

        assertEquals(7, dto.getBotId());
        assertEquals("MEM0", dto.getProvider());
        assertFalse(dto.getEnabled());
        assertFalse(dto.getHasApiKey());
        assertTrue(dto.getAutoSearch());
        assertEquals(5, dto.getSearchTopK());
        assertEquals(0.0, dto.getMinScore());
    }

    @Test
    void saveConfigInsertsEncryptedMem0KeyAfterPermissionCheck() {
        when(chatBotBaseMapper.checkBotPermission(7, "u1", 3L)).thenReturn(1);
        when(configMapper.selectOne(any())).thenReturn(null);

        SaveAgentMemoryConfigRequest request = new SaveAgentMemoryConfigRequest();
        request.setBotId(7);
        request.setProvider("MEM0");
        request.setEnabled(true);
        request.setApiKeyCiphertext("cipher-new");
        request.setAutoSearch(true);
        request.setSearchTopK(8);
        request.setMinScore(0.35);

        AgentMemoryConfigDto dto = service.saveConfig("u1", 3L, request);

        ArgumentCaptor<AgentMemoryConfig> captor = ArgumentCaptor.forClass(AgentMemoryConfig.class);
        verify(configMapper).insert(captor.capture());
        AgentMemoryConfig saved = captor.getValue();
        assertEquals(7, saved.getBotId());
        assertEquals("u1", saved.getUid());
        assertEquals(3L, saved.getSpaceId());
        assertEquals("MEM0", saved.getProvider());
        assertEquals("cipher-new", saved.getApiKeyCiphertext());
        assertEquals(1, saved.getEnabled());
        assertEquals(1, saved.getAutoSearch());
        assertEquals(8, saved.getSearchTopK());
        assertEquals(0.35, saved.getMinScore());
        assertEquals(0, saved.getIsDelete());
        assertEquals(0L, saved.getDeleteTime());
        assertTrue(dto.getHasApiKey());
        assertTrue(dto.getEnabled());
    }

    @Test
    void saveConfigStoresNoSpaceAsZeroForUniqueIndex() {
        when(chatBotBaseMapper.checkBotPermission(7, "u1", null)).thenReturn(1);
        when(configMapper.selectOne(any())).thenReturn(null);

        SaveAgentMemoryConfigRequest request = new SaveAgentMemoryConfigRequest();
        request.setBotId(7);
        request.setProvider("MEM0");
        request.setEnabled(true);
        request.setApiKeyCiphertext("cipher-new");

        service.saveConfig("u1", null, request);

        ArgumentCaptor<AgentMemoryConfig> captor = ArgumentCaptor.forClass(AgentMemoryConfig.class);
        verify(configMapper).insert(captor.capture());
        AgentMemoryConfig saved = captor.getValue();
        assertEquals(0L, saved.getSpaceId());
        assertEquals(0, saved.getIsDelete());
        assertEquals(0L, saved.getDeleteTime());
    }

    @Test
    void saveConfigRetainsExistingKeyWhenRequestDoesNotIncludeANewKey() {
        when(chatBotBaseMapper.checkBotPermission(7, "u1", 3L)).thenReturn(1);
        AgentMemoryConfig existing = new AgentMemoryConfig();
        existing.setId(11L);
        existing.setBotId(7);
        existing.setUid("u1");
        existing.setSpaceId(3L);
        existing.setProvider("MEM0");
        existing.setEnabled(0);
        existing.setAutoSearch(1);
        existing.setSearchTopK(5);
        existing.setMinScore(0.0);
        existing.setApiKeyCiphertext("cipher-existing");
        when(configMapper.selectOne(any())).thenReturn(existing);

        SaveAgentMemoryConfigRequest request = new SaveAgentMemoryConfigRequest();
        request.setBotId(7);
        request.setEnabled(true);
        request.setAutoSearch(false);
        request.setSearchTopK(3);
        request.setMinScore(0.2);

        AgentMemoryConfigDto dto = service.saveConfig("u1", 3L, request);

        ArgumentCaptor<AgentMemoryConfig> captor = ArgumentCaptor.forClass(AgentMemoryConfig.class);
        verify(configMapper).updateById(captor.capture());
        AgentMemoryConfig updated = captor.getValue();
        assertEquals(11L, updated.getId());
        assertEquals("cipher-existing", updated.getApiKeyCiphertext());
        assertEquals(1, updated.getEnabled());
        assertEquals(0, updated.getAutoSearch());
        assertEquals(3, updated.getSearchTopK());
        assertEquals(0.2, updated.getMinScore());
        assertTrue(dto.getEnabled());
        assertTrue(dto.getHasApiKey());
        assertFalse(dto.getAutoSearch());
    }
}
