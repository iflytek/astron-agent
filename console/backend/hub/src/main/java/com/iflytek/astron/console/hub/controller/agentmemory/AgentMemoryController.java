package com.iflytek.astron.console.hub.controller.agentmemory;

import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.util.RequestContextUtil;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import com.iflytek.astron.console.hub.dto.agentmemory.AgentMemoryConfigDto;
import com.iflytek.astron.console.hub.dto.agentmemory.AgentMemoryItemDto;
import com.iflytek.astron.console.hub.dto.agentmemory.SaveAgentMemoryConfigRequest;
import com.iflytek.astron.console.hub.service.agentmemory.AgentMemoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/agent-memory")
@Tag(name = "Agent Memory", description = "Agent conversation memory configuration and management")
@RequiredArgsConstructor
public class AgentMemoryController {

    private final AgentMemoryService agentMemoryService;

    @GetMapping("/config")
    @Operation(summary = "Get agent memory configuration")
    public ApiResult<AgentMemoryConfigDto> getConfig(@RequestParam Integer botId) {
        return ApiResult.success(agentMemoryService.getConfig(
                RequestContextUtil.getUID(), SpaceInfoUtil.getSpaceId(), botId));
    }

    @PutMapping("/config")
    @Operation(summary = "Save agent memory configuration")
    public ApiResult<AgentMemoryConfigDto> saveConfig(
            @Valid @RequestBody SaveAgentMemoryConfigRequest request) {
        return ApiResult.success(agentMemoryService.saveConfig(
                RequestContextUtil.getUID(), SpaceInfoUtil.getSpaceId(), request));
    }

    @GetMapping("/memories")
    @Operation(summary = "List scoped provider memories")
    public ApiResult<List<AgentMemoryItemDto>> listMemories(@RequestParam Integer botId) {
        return ApiResult.success(agentMemoryService.listMemories(
                RequestContextUtil.getUID(), SpaceInfoUtil.getSpaceId(), botId));
    }

    @DeleteMapping("/memories/{memoryId}")
    @Operation(summary = "Delete scoped provider memory")
    public ApiResult<Void> deleteMemory(@RequestParam Integer botId, @PathVariable String memoryId) {
        agentMemoryService.deleteMemory(RequestContextUtil.getUID(), SpaceInfoUtil.getSpaceId(), botId, memoryId);
        return ApiResult.success();
    }

    @DeleteMapping("/memories")
    @Operation(summary = "Clear scoped provider memories")
    public ApiResult<Void> clearMemories(@RequestParam Integer botId) {
        agentMemoryService.clearMemories(RequestContextUtil.getUID(), SpaceInfoUtil.getSpaceId(), botId);
        return ApiResult.success();
    }
}
