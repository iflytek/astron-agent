package com.iflytek.astron.console.hub.controller.bot;

import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.hub.dto.PageResponse;
import com.iflytek.astron.console.hub.entity.personality.PersonalityCategory;
import com.iflytek.astron.console.hub.entity.personality.PersonalityRole;
import com.iflytek.astron.console.hub.service.bot.PersonalityConfigService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for personality configuration operations Provides endpoints for AI-powered
 * personality generation
 */
@RestController
@RequestMapping(value = "/personality")
@Tag(name = "Personality Configuration")
@RequiredArgsConstructor
public class PersonalityController {

    /**
     * Service for personality configuration operations
     */
    private final PersonalityConfigService personalityConfigService;

    /**
     * Generate personality description using AI
     *
     * @param botName the name of the bot
     * @param category the category of the bot
     * @param info additional information about the bot
     * @param prompt the prompt template for AI generation
     * @return ApiResult containing the generated personality description
     */
    @PostMapping("/aiGenerate")
    public ApiResult<String> aiGenerate(
            @RequestParam("botName") String botName,
            @RequestParam("category") String category,
            @RequestParam("info") String info,
            @RequestParam("prompt") String prompt) {
        return ApiResult.success(personalityConfigService.aiGeneratedPersonality(botName, category, info, prompt));
    }

    /**
     * Polish personality description using AI
     *
     * @param botName the name of the bot
     * @param category the category of the bot
     * @param info additional information about the bot
     * @param prompt the prompt template for personality polishing
     * @param personality the existing personality description to polish
     * @return ApiResult containing the polished personality description
     */
    @PostMapping("/aiPolishing")
    public ApiResult<String> aiPolishing(
            @RequestParam("botName") String botName,
            @RequestParam("category") String category,
            @RequestParam("info") String info,
            @RequestParam("prompt") String prompt,
            @RequestParam("personality") String personality) {
        return ApiResult.success(personalityConfigService.aiPolishing(botName, category, info, prompt, personality));
    }


    /**
     * Get personality category list
     *
     * @return ApiResult containing the personality category list
     */
    @GetMapping("/getCategory")
    public ApiResult<List<PersonalityCategory>> getCategory() {
        return ApiResult.success(personalityConfigService.getPersonalityCategories());
    }



    @GetMapping("/getRole")
    public ApiResult<PageResponse<PersonalityRole>> getRole(
            @RequestParam("categoryId") Long categoryId,
            @RequestParam("pageNum") Integer pageNum,
            @RequestParam("pageSize") Integer pageSize) {
        if (pageNum < 0) {
            pageNum = 0;
        }
        if (pageSize > 100) {
            pageSize = 100;
        }
        return ApiResult.success(personalityConfigService.getPersonalityRoles(categoryId, pageNum, pageSize));
    }

}
