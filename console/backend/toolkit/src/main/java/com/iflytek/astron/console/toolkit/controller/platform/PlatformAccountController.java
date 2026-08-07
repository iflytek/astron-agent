package com.iflytek.astron.console.toolkit.controller.platform;

import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.toolkit.common.anno.ResponseResultBody;
import com.iflytek.astron.console.toolkit.entity.platform.PlatformAccountCardDto;
import com.iflytek.astron.console.toolkit.entity.platform.PlatformAccountConfigDto;
import com.iflytek.astron.console.toolkit.entity.platform.PlatformAccountRuntimeConfigDto;
import com.iflytek.astron.console.toolkit.entity.platform.PlatformAccountType;
import com.iflytek.astron.console.toolkit.service.platform.PlatformAccountService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@ResponseResultBody
@RequestMapping("/api/platform-account")
@Tag(name = "Platform account management")
public class PlatformAccountController {

    @Resource
    private PlatformAccountService platformAccountService;

    @GetMapping("/cards")
    public ApiResult<List<PlatformAccountCardDto>> listCards() {
        return ApiResult.success(platformAccountService.listCards());
    }

    @GetMapping("/{type}")
    public ApiResult<PlatformAccountConfigDto> getConfig(@PathVariable("type") String type) {
        return ApiResult.success(platformAccountService.getMaskedConfig(PlatformAccountType.fromValue(type)));
    }

    @PutMapping("/{type}")
    public ApiResult<PlatformAccountConfigDto> saveConfig(
            @PathVariable("type") String type,
            @RequestBody PlatformAccountConfigDto request) {
        return ApiResult.success(platformAccountService.saveConfig(PlatformAccountType.fromValue(type), request));
    }

    @GetMapping("/runtime-config")
    public ApiResult<PlatformAccountRuntimeConfigDto> runtimeConfig() {
        return ApiResult.success(platformAccountService.getRuntimeConfig());
    }
}
