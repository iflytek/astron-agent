package com.iflytek.astron.console.hub.controller.agentdebug;

import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.util.RequestContextUtil;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import com.iflytek.astron.console.hub.dto.agentdebug.AgentDebugSessionDto;
import com.iflytek.astron.console.hub.dto.agentdebug.CreateAgentDebugSessionRequest;
import com.iflytek.astron.console.hub.dto.agentdebug.SaveAgentDebugMessagesRequest;
import com.iflytek.astron.console.hub.service.agentdebug.AgentDebugService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/agent-debug")
@Tag(name = "Agent Debug History", description = "Agent debug session history")
@RequiredArgsConstructor
public class AgentDebugController {

    private final AgentDebugService agentDebugService;

    @GetMapping("/sessions")
    @Operation(summary = "List agent debug sessions")
    public ApiResult<List<AgentDebugSessionDto>> listSessions(@RequestParam Integer botId) {
        return ApiResult.success(
                agentDebugService.listSessions(RequestContextUtil.getUID(), SpaceInfoUtil.getSpaceId(), botId));
    }

    @PostMapping("/sessions")
    @Operation(summary = "Create agent debug session")
    public ApiResult<AgentDebugSessionDto> createSession(
            @Valid @RequestBody CreateAgentDebugSessionRequest request) {
        return ApiResult.success(
                agentDebugService.createSession(RequestContextUtil.getUID(), SpaceInfoUtil.getSpaceId(), request));
    }

    @GetMapping("/sessions/{sessionId}/messages")
    @Operation(summary = "Get agent debug session messages")
    public ApiResult<List<Map<String, Object>>> getMessages(@PathVariable String sessionId) {
        return ApiResult.success(
                agentDebugService.getMessages(RequestContextUtil.getUID(), SpaceInfoUtil.getSpaceId(), sessionId));
    }

    @PutMapping("/sessions/{sessionId}/messages")
    @Operation(summary = "Save agent debug session messages")
    public ApiResult<Void> saveMessages(
            @PathVariable String sessionId,
            @Valid @RequestBody SaveAgentDebugMessagesRequest request) {
        agentDebugService.saveMessages(
                RequestContextUtil.getUID(), SpaceInfoUtil.getSpaceId(), sessionId, request.getMessages());
        return ApiResult.success();
    }

    @DeleteMapping("/sessions/{sessionId}")
    @Operation(summary = "Delete agent debug session")
    public ApiResult<Void> deleteSession(@PathVariable String sessionId) {
        agentDebugService.deleteSession(RequestContextUtil.getUID(), SpaceInfoUtil.getSpaceId(), sessionId);
        return ApiResult.success();
    }

    @DeleteMapping("/sessions")
    @Operation(summary = "Clear agent debug sessions")
    public ApiResult<Void> clearSessions(@RequestParam Integer botId) {
        agentDebugService.clearSessions(RequestContextUtil.getUID(), SpaceInfoUtil.getSpaceId(), botId);
        return ApiResult.success();
    }
}
