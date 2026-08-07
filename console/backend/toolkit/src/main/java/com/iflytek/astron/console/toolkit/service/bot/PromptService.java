package com.iflytek.astron.console.toolkit.service.bot;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONValidator;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.iflytek.astron.console.commons.entity.workflow.Workflow;
import com.iflytek.astron.console.commons.util.SseEmitterUtil;
import com.iflytek.astron.console.toolkit.entity.biz.AiCode;
import com.iflytek.astron.console.toolkit.entity.biz.AiGenerate;
import com.iflytek.astron.console.toolkit.entity.table.ConfigInfo;
import com.iflytek.astron.console.toolkit.entity.table.bot.SparkBot;
import com.iflytek.astron.console.toolkit.mapper.ConfigInfoMapper;
import com.iflytek.astron.console.toolkit.mapper.bot.SparkBotMapper;
import com.iflytek.astron.console.toolkit.mapper.workflow.WorkflowMapper;
import com.iflytek.astron.console.toolkit.tool.spark.SparkApiTool;
import jakarta.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Arrays;

/**
 * Service for handling prompt-related operations, such as prompt enhancement, generating advice for
 * the next question, AI content generation, and AI code processing.
 *
 * @date 2025/09/26
 */
@Service
public class PromptService {

    @Resource
    SparkApiTool sparkApiTool;

    @Resource
    ConfigInfoMapper configInfoMapper;

    @Resource
    SparkBotMapper sparkBotMapper;

    @Resource
    WorkflowMapper workflowMapper;

    @Resource
    OpenAiModelProcessService openAiModelProcessService;

    /**
     * Enhance a given prompt by applying a configured template.
     *
     * @param name the assistant name
     * @param prompt the assistant description or input prompt
     * @return {@link SseEmitter} for streaming the enhanced prompt response
     */
    public SseEmitter enhance(String name, String prompt) {
        String template = configInfoMapper.getByCategoryAndCode("TEMPLATE", "prompt-enhance").getValue();
        String question = template.replace("{assistant_name}", name).replace("{assistant_description}", prompt);
        return openAiModelProcessService.processStreaming(question);
    }

    /**
     * Provide advice for the next question based on a given input question.
     *
     * @param question the input question
     * @return a JSON array with up to three advice strings; returns a list of three empty strings as
     *         fallback
     */
    public Object nextQuestionAdvice(String question) {
        String template = configInfoMapper.getByCategoryAndCode("TEMPLATE", "next-question-advice").getValue();
        String msg = template.replace("{q}", question);
        try {
            String threeAdvice = openAiModelProcessService.processNonStreaming(msg);
            if (JSONValidator.from(threeAdvice).validate()) {
                return JSON.parseArray(threeAdvice);
            } else {
                int i1 = StringUtils.indexOf(threeAdvice, "[");
                int i2 = StringUtils.lastIndexOf(threeAdvice, "]");
                return JSON.parseArray(threeAdvice.substring(i1, i2 + 1));
            }
        } catch (Exception e) {
            // Fallback
            return Arrays.asList("", "", "");
        }
    }

    /**
     * Generate AI content based on a given {@link AiGenerate} configuration.
     *
     * @param aiGenerate the generation request containing prompt code, bot ID, or flow ID
     * @return {@link SseEmitter} for streaming the AI-generated content
     */
    public SseEmitter aiGenerate(AiGenerate aiGenerate) {
        ConfigInfo configInfo = configInfoMapper.selectOne(
                Wrappers.lambdaQuery(ConfigInfo.class)
                        .eq(ConfigInfo::getCategory, "PROMPT")
                        .eq(ConfigInfo::getCode, aiGenerate.getCode()));
        if (configInfo == null) {
            return SseEmitterUtil.newSseAndSendMessageClose("Prompt config item not found");
        }
        String prompt = configInfo.getValue();
        if ("prologue".equals(aiGenerate.getCode())) {
            if (aiGenerate.getBotId() != null) {
                SparkBot sparkBot = sparkBotMapper.selectById(aiGenerate.getBotId());
                prompt = prompt.replace("{name}", sparkBot.getName()).replace("{desc}", sparkBot.getDescription());
            } else if (aiGenerate.getFlowId() != null) {
                Workflow workflow = workflowMapper.selectById(aiGenerate.getFlowId());
                prompt = prompt.replace("{name}", workflow.getName()).replace("{desc}", workflow.getDescription());
            }
        }
        return openAiModelProcessService.processStreaming(prompt);
    }

    /**
     * Handle AI code generation, update, or error fixing based on the provided {@link AiCode}.
     *
     * @param aiCode the AI code request containing prompt, variable, existing code, or error message
     * @return {@link SseEmitter} for streaming AI code response
     */
    public SseEmitter aiCode(AiCode aiCode) {
        String action = "create";
        if (StringUtils.isNotBlank(aiCode.getCode())) {
            // action = "update";
        }
        if (StringUtils.isNotBlank(aiCode.getErrMsg())) {
            action = "fix";
        }
        ConfigInfo prompt = configInfoMapper.selectOne(
                Wrappers.lambdaQuery(ConfigInfo.class)
                        .eq(ConfigInfo::getCategory, "PROMPT")
                        .eq(ConfigInfo::getCode, "ai-code")
                        .eq(ConfigInfo::getName, action));
        if (prompt == null) {
            return SseEmitterUtil.newSseAndSendMessageClose("Prompt config item not found");
        }
        if (StringUtils.isBlank(prompt.getValue())) {
            return SseEmitterUtil.newSseAndSendMessageClose("Prompt config item is empty");
        }

        String var = aiCode.getVar();
        String message = prompt.getValue();
        switch (action) {
            case "create":
                message = message.replace("{var}", var).replace("{prompt}", aiCode.getPrompt());
                break;
            case "update":
                message = message.replace("{var}", var)
                        .replace("{prompt}", aiCode.getPrompt())
                        .replace("{code}", aiCode.getCode());
                break;
            case "fix":
                String errMsg = aiCode.getErrMsg();
                int secLBracketIdx = StringUtils.ordinalIndexOf(errMsg, "(", 2);
                String pyErr = errMsg.substring(secLBracketIdx + 1, errMsg.length() - 2).trim();
                message = message.replace("{errMsg}", pyErr);
                break;
            default:
        }
        return openAiModelProcessService.processStreaming(message);
    }
}
