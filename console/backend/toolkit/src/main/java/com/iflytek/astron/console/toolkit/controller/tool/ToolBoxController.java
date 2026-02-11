package com.iflytek.astron.console.toolkit.controller.tool;

import com.iflytek.astron.console.commons.annotation.space.SpacePreAuth;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.toolkit.common.anno.ResponseResultBody;
import com.iflytek.astron.console.toolkit.entity.dto.*;
import com.iflytek.astron.console.toolkit.service.tool.ToolBoxService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/tool")
@Slf4j
@ResponseResultBody
@Tag(name = "Plugin Management")
public class ToolBoxController {
    @Resource
    ToolBoxService toolBoxService;

    @PostMapping("/create-tool")
    @Operation(summary = "Create plugin")
    @SpacePreAuth(key = "ToolBoxController_createTool_POST")
    public Object createTool(@RequestBody ToolBoxDto toolBoxDto) {
        if (toolBoxDto.getName() == null) {
            throw new BusinessException(ResponseEnum.TOOLBOX_NAME_EMPTY);
        }
        if (toolBoxDto.getDescription() == null) {
            throw new BusinessException(ResponseEnum.TOOLBOX_NAME_EMPTY);
        }
        return toolBoxService.createTool(toolBoxDto);
    }

    @PostMapping("/temporary-tool")
    @Operation(summary = "Temporarily save plugin")
    @SpacePreAuth(key = "ToolBoxController_temporaryTool_POST")
    public Object temporaryTool(@RequestBody ToolBoxDto toolBoxDto) {
        if (toolBoxDto.getName() == null) {
            throw new BusinessException(ResponseEnum.TOOLBOX_NAME_EMPTY);
        }
        return toolBoxService.temporaryTool(toolBoxDto);
    }

    @PutMapping("/update-tool")
    @Operation(summary = "Edit plugin")
    @SpacePreAuth(key = "ToolBoxController_updateTool_PUT")
    public Object updateTool(@RequestBody ToolBoxDto toolBoxDto) {
        return toolBoxService.updateTool(toolBoxDto);
    }

    @GetMapping("/list-tools")
    @Operation(summary = "Plugin paginated list")
    @SpacePreAuth(key = "ToolBoxController_listTools_GET")
    public Object listTools(@RequestParam(value = "pageNo", defaultValue = "1") Integer pageNo,
            @RequestParam(value = "pageSize", defaultValue = "10") Integer pageSize,
            @RequestParam(value = "content", required = false) String content,
            @RequestParam(value = "status", required = false) Integer status) {
        return toolBoxService.pageListTools(pageNo, pageSize, content, status);
    }

    @GetMapping("/detail")
    @Operation(summary = "Plugin details")
    @SpacePreAuth(key = "ToolBoxController_getDetail_GET")
    public Object getDetail(@RequestParam("id") Long id, Boolean temporary) {
        return toolBoxService.getDetail(id, temporary);
    }

    @GetMapping("/get-tool-default-icon")
    @Operation(summary = "Plugin default icon")
    @SpacePreAuth(key = "ToolBoxController_getToolDefaultIcon_GET")
    public Object getToolDefaultIcon() {
        return toolBoxService.getToolDefaultIcon();
    }

    @DeleteMapping("/delete-tool")
    @Operation(summary = "Delete plugin")
    @SpacePreAuth(key = "ToolBoxController_deleteTool_DELETE")
    public Object deleteTool(@RequestParam("id") Long id) {
        return toolBoxService.deleteTool(id);
    }

    @PostMapping("/debug-tool")
    @Operation(summary = "Debug plugin")
    @SpacePreAuth(key = "ToolBoxController_debugToolV2_POST")
    public Object debugToolV2(@RequestBody ToolBoxDto toolBoxDto) {
        return toolBoxService.debugToolV2(toolBoxDto);
    }

    @Operation(summary = "Plugin square query list")
    @PostMapping("/list-tool-square")
    @SpacePreAuth(key = "ToolBoxController_listToolSquare_POST")
    public Object listToolSquare(@RequestBody ToolSquareDto dto) {
        return toolBoxService.listToolSquare(dto);
    }

    @Operation(summary = "Favorite/Unfavorite tool")
    @GetMapping("/favorite")
    @SpacePreAuth(key = "ToolBoxController_favorite_GET")
    public Object favorite(@RequestParam("toolId") String toolId,
            @RequestParam("favoriteFlag") Integer favoriteFlag,
            @RequestParam("isMcp") Boolean isMcp) {
        return toolBoxService.favorite(toolId, favoriteFlag, isMcp);
    }

    @Operation(summary = "Get plugin version history")
    @GetMapping("/get-tool-version")
    @SpacePreAuth(key = "ToolBoxController_getToolVersion_GET")
    public List<ToolBoxVo> getToolVersion(@RequestParam("toolId") String toolId) {
        return toolBoxService.getToolVersion(toolId);
    }

    @Operation(summary = "Get plugin latest version")
    @GetMapping("/get-tool-latestVersion")
    @SpacePreAuth(key = "ToolBoxController_getToolLatestVersion_GET")
    public Map<String, String> getToolLatestVersion(@RequestParam("toolIds") List<String> toolIds) {
        return toolBoxService.getToolLatestVersion(toolIds);
    }

    @Operation(summary = "Plugin user operation history")
    @GetMapping("/add-tool-operateHistory")
    public void addToolOperateHistory(@RequestParam("toolId") String toolId) {
        toolBoxService.addToolOperateHistory(toolId);
    }

    @Operation(summary = "User feedback")
    @PostMapping("/feedback")
    public void addToolOperateHistory(@RequestBody ToolBoxFeedbackReq toolBoxFeedbackReq) {
        toolBoxService.feedback(toolBoxFeedbackReq);
    }

    @Operation(summary = "Publish tool to square")
    @GetMapping("/publish-square")
    public void publishSquare(Long id) {
        toolBoxService.publishSquare(id);
    }

    @Operation(summary = "Export tool")
    @GetMapping("/export")
//    @SpacePreAuth(key = "ToolBoxController_exportTool_GET")
    public void exportTool(@RequestParam("id") Long id,
                          @RequestParam(value = "type", required = false) Integer type,
                          HttpServletResponse response) {
        toolBoxService.exportTool(id, type, response);
    }

    @Operation(summary = "Import tool")
    @PostMapping("/import")
//    @SpacePreAuth(key = "ToolBoxController_importTool_POST")
    public Object importTool(@RequestParam("file") MultipartFile file) {
        return toolBoxService.importTool(file);
    }

}
