package com.iflytek.astron.console.toolkit.controller.skill;

import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.toolkit.common.anno.ResponseResultBody;
import com.iflytek.astron.console.toolkit.entity.dto.skill.SkillSandboxConfigDto;
import com.iflytek.astron.console.toolkit.entity.vo.skill.SkillSandboxConfigReq;
import com.iflytek.astron.console.toolkit.service.skill.SkillSandboxConfigService;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/skill-sandbox")
@ResponseResultBody
public class SkillSandboxConfigController {

    @Resource
    private SkillSandboxConfigService skillSandboxConfigService;

    @GetMapping("/config")
    public ApiResult<SkillSandboxConfigDto> config() {
        return ApiResult.success(skillSandboxConfigService.getMaskedConfig());
    }

    @PutMapping("/config")
    public ApiResult<SkillSandboxConfigDto> save(@RequestBody SkillSandboxConfigReq req) {
        return ApiResult.success(skillSandboxConfigService.saveConfig(req));
    }

    @PostMapping("/test")
    public ApiResult<SkillSandboxConfigDto> test(@RequestBody SkillSandboxConfigReq req) {
        return ApiResult.success(skillSandboxConfigService.testConfig(req));
    }
}
