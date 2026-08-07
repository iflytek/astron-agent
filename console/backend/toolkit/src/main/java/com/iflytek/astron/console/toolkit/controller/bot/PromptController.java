package com.iflytek.astron.console.toolkit.controller.bot;

import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.toolkit.common.anno.ResponseResultBody;
import com.iflytek.astron.console.toolkit.entity.biz.AiCode;
import com.iflytek.astron.console.toolkit.entity.biz.AiGenerate;
import com.iflytek.astron.console.toolkit.service.bot.PromptService;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * REST controller for handling prompt-related operations, including prompt enhancement,
 * next-question advice, AI content generation, and AI code operations.
 *
 * @author YOUR_NAME
 * @date 2025/09/26
 */
@RestController
@ResponseResultBody
@RequestMapping("/prompt")
public class PromptController {

    @Resource
    PromptService promptService;

    /**
     * Enhance a given prompt description using the configured template.
     * <p>
     * The method returns an {@link SseEmitter} so that the result can be streamed back to the client.
     *
     * @param req request body containing "name" (assistant name) and "prompt" (assistant description)
     * @param response HTTP servlet response, used to add required SSE headers
     * @return {@link SseEmitter} that streams the enhanced prompt response
     */
    @PostMapping(path = "/enhance", produces = "text/event-stream;charset=UTF-8")
    public SseEmitter enhance(@RequestBody JSONObject req, HttpServletResponse response) {
        response.addHeader("X-Accel-Buffering", "no");
        return promptService.enhance(req.getString("name"), req.getString("prompt"));
    }

    /**
     * Provide advice for the next question based on the given input question.
     *
     * @param req request body containing "question"
     */
    @PostMapping("/next-question-advice")
    public Object nqa(@RequestBody JSONObject req) {
        return ApiResult.success(promptService.nextQuestionAdvice(req.getString("question")));
    }

    /**
     * Generate AI content based on the {@link AiGenerate} configuration.
     *
     * @param aiGenerate the AI generation request object, including assistant details and prompt code
     * @param response HTTP servlet response, used to add required SSE headers
     * @return {@link SseEmitter} that streams the generated AI content
     */
    @PostMapping(path = "/ai-generate", produces = "text/event-stream;charset=UTF-8")
    public SseEmitter aiGenerate(@RequestBody AiGenerate aiGenerate, HttpServletResponse response) {
        response.addHeader("X-Accel-Buffering", "no");
        return promptService.aiGenerate(aiGenerate);
    }

    /**
     * Perform AI code operations (generate, update, or fix) based on the {@link AiCode} input.
     *
     * @param aiCode the AI code request containing prompt, code, or error message
     * @param response HTTP servlet response, used to add required SSE headers
     * @return {@link SseEmitter} that streams the AI code operation result
     */
    @PostMapping(path = "/ai-code", produces = "text/event-stream;charset=UTF-8")
    public SseEmitter aiCode(@RequestBody AiCode aiCode, HttpServletResponse response) {
        response.addHeader("X-Accel-Buffering", "no");
        return promptService.aiCode(aiCode);
    }
}
