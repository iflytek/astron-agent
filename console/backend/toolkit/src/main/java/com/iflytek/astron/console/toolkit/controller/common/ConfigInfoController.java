package com.iflytek.astron.console.toolkit.controller.common;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.toolkit.entity.table.ConfigInfo;
import com.iflytek.astron.console.toolkit.service.common.ConfigInfoService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;

/**
 * Config table REST controller.
 * <p>
 * Provides APIs to query and manage configuration data by category and code.
 * </p>
 *
 * @author xywang
 * @since 2022-05-05
 */
@RestController
@RequestMapping("/config-info")
@Tag(name = "Config management interface")
public class ConfigInfoController {
    @Resource
    private ConfigInfoService configInfoService;

    /**
     * Get configuration list by category and code.
     *
     * @param category configuration category
     * @param code configuration code
     * @return {@link ApiResult} containing a list of {@link ConfigInfo}
     * @throws IllegalArgumentException if no records are found
     */
    @GetMapping("/list-by-category-and-code")
    public ApiResult<List<ConfigInfo>> listByCategoryAndCode(@RequestParam("category") String category,
            @RequestParam("code") String code) {
        return ApiResult.success(
                configInfoService.list(
                        Wrappers.lambdaQuery(ConfigInfo.class)
                                .eq(ConfigInfo::getCategory, category)
                                .eq(ConfigInfo::getCode, code)
                                .eq(ConfigInfo::getIsValid, 1)));
    }

    /**
     * Get configuration tags by flag.
     *
     * @param flag filter flag
     * @return {@link ApiResult} containing a list of {@link ConfigInfo} tags
     * @throws IllegalArgumentException if no tags are found
     */
    @GetMapping("/tags")
    public ApiResult<List<ConfigInfo>> getTags(@RequestParam(value = "flag") String flag) {
        return ApiResult.success(configInfoService.getTags(flag));
    }

    /**
     * Get workflow categories from configuration.
     *
     * @return {@link ApiResult} containing a list of workflow category strings
     * @throws IllegalArgumentException if no workflow category config is found
     */
    @GetMapping("/workflow/categories")
    public ApiResult<List<String>> getTags() {
        ConfigInfo config = configInfoService.getOne(new LambdaQueryWrapper<ConfigInfo>()
                .eq(ConfigInfo::getCategory, "WORKFLOW_CATEGORY")
                .eq(ConfigInfo::getIsValid, 1));
        return ApiResult.success(Arrays.asList(config.getValue().split(",")));
    }

}
