package com.iflytek.astron.console.hub.controller;

import com.iflytek.astron.console.commons.response.ApiResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/health")
public class HealthController {
    @GetMapping
    public ApiResult<String> health() {
        return ApiResult.success();
    }
}
