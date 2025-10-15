package com.iflytek.astron.console.hub.service.bot.impl;

import cn.hutool.core.io.IoUtil;
import cn.hutool.core.util.StrUtil;
import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.util.I18nUtil;
import com.iflytek.astron.console.commons.util.S3ClientUtil;
import com.iflytek.astron.console.hub.dto.bot.BotGenerationDTO;
import com.iflytek.astron.console.hub.dto.bot.PromptStructDTO;
import com.iflytek.astron.console.hub.entity.AiPromptTemplate;
import com.iflytek.astron.console.hub.mapper.AiPromptTemplateMapper;
import com.iflytek.astron.console.hub.service.bot.BotAIService;
import com.iflytek.astron.console.hub.util.BotAIServiceClient;
import com.iflytek.astron.console.hub.util.ImageUtil;
import com.iflytek.astron.console.toolkit.util.RedisUtil;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.text.MessageFormat;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static com.iflytek.astron.console.commons.constant.ResponseEnum.PARAMETER_ERROR;

/**
 * AI service implementation class for creating intelligent agents
 */
@Slf4j
@Service
public class BotAIServiceImpl implements BotAIService {

    private static final float IMAGE_COMPRESS_SCALE = 0.2f;
    private static final int BASE_IMAGE_SIZE = 1024;

    @Autowired
    private S3ClientUtil s3ClientUtil;

    @Autowired
    private BotAIServiceClient aiServiceClient;

    @Autowired
    private AiPromptTemplateMapper promptTemplateMapper;

    @Autowired
    private RedisUtil redisUtil;

    /**
     * Get prompt template from database with Redis cache
     */
    private String getPromptTemplate(String promptKey) {
        String languageCode = I18nUtil.getLanguage();
        String cacheKey = "prompt_template:" + promptKey + ":" + languageCode;

        String cached = redisUtil.getStr(cacheKey);
        if (cached != null) {
            return cached;
        }

        AiPromptTemplate template = promptTemplateMapper.selectOne(
                new LambdaQueryWrapper<AiPromptTemplate>()
                        .eq(AiPromptTemplate::getPromptKey, promptKey)
                        .eq(AiPromptTemplate::getLanguageCode, languageCode)
                        .eq(AiPromptTemplate::getIsActive, 1));

        String result = null;
        if (template != null) {
            result = template.getPromptContent();
        }

        // Fallback to English if not found
        if (result == null && !"en".equals(languageCode)) {
            template = promptTemplateMapper.selectOne(
                    new LambdaQueryWrapper<AiPromptTemplate>()
                            .eq(AiPromptTemplate::getPromptKey, promptKey)
                            .eq(AiPromptTemplate::getLanguageCode, "en")
                            .eq(AiPromptTemplate::getIsActive, 1));
            if (template != null) {
                result = template.getPromptContent();
            }
        }

        // Fallback to default template
        if (result == null) {
            result = getDefaultPromptTemplate(promptKey);
        }

        redisUtil.put(cacheKey, result, 86400);

        return result;
    }

    /**
     * Format prompt with parameters
     */
    private String formatPrompt(String promptKey, Object... params) {
        try {
            String template = getPromptTemplate(promptKey);

            // Always trim and expand %n to newline
            template = template.trim().replace("%n", System.lineSeparator());

            // Special adaptation for generate input example: keep structure/newlines, support %s or {i}
            boolean isGenInputExample =
                    "input_example_generation".equals(promptKey)
                            || "generate-input-example".equals(promptKey)
                            || "generate_input_example".equals(promptKey);

            if (isGenInputExample) {
                if (template.contains("%s")) {
                    // Use classic formatter to support templates like {{%s}}
                    return String.format(template, params);
                }
                return MessageFormat.format(template, params);
            }

            // Default behavior (backward compatible): normalize spaces to one line
            template = template.replaceAll("\\s+", " ");

            // Keep compatibility with legacy %s templates by converting to MessageFormat
            if (template.contains("%s")) {
                StringBuilder buf = new StringBuilder();
                int from = 0;
                int idx = 0;
                while (true) {
                    int pos = template.indexOf("%s", from);
                    if (pos < 0) {
                        buf.append(template, from, template.length());
                        break;
                    }
                    buf.append(template, from, pos).append('{').append(idx++).append('}');
                    from = pos + 2;
                }
                template = buf.toString();
            }

            return MessageFormat.format(template, params);
        } catch (Exception e) {
            log.error("Failed to format prompt template: {}, error: {}", promptKey, e.getMessage());
            throw new BusinessException(ResponseEnum.SYSTEM_ERROR);
        }
    }

    /**
     * Get field mappings configuration
     */
    private Map<String, List<String>> getFieldMappings() {
        try {
            String content = getPromptTemplate("field_mappings");
            return parseJsonToFieldMappings(content);
        } catch (Exception e) {
            log.warn("Failed to get field mappings from database, using default configuration");
            return getDefaultFieldMappings();
        }
    }

    /**
     * Get bot type mappings configuration
     */
    private Map<String, Integer> getBotTypeMappings() {
        try {
            String content = getPromptTemplate("bot_type_mappings");
            return parseJsonToBotTypeMappings(content);
        } catch (Exception e) {
            log.warn("Failed to get bot type mappings from database, using default configuration");
            return getDefaultBotTypeMappings();
        }
    }

    /**
     * Get PromptStruct labels configuration
     */
    private Map<String, String> getPromptStructLabels() {
        try {
            String content = getPromptTemplate("prompt_struct_labels");
            return parseJsonToPromptStructLabels(content);
        } catch (Exception e) {
            log.warn("Failed to get prompt struct labels from database, using default configuration");
            return getDefaultPromptStructLabels();
        }
    }

    @Override
    public String generateAvatar(String uid, String botName, String botDesc) {
        if (uid == null || StrUtil.isBlank(botName)) {
            return null;
        }

        botDesc = StrUtil.isNotBlank(botDesc) ? botDesc : "Intelligent Assistant";
        String prompt = formatPrompt("avatar_generation", botName, botDesc);

        InputStream imageInput = null;
        InputStream compressImageInput = null;

        try {
            JSONObject response = aiServiceClient.generateImage(uid, prompt, BASE_IMAGE_SIZE);

            // Check response structure
            JSONObject header = response.getJSONObject("header");
            if (header == null) {
                return null;
            }

            int code = header.getIntValue("code");
            String sid = header.getString("sid");
            String message = header.getString("message");

            if (code != 0) {
                log.error("User [{}] AI avatar generation failed, response code: {}, message: {}, sid: {}", uid, code, message, sid);
                return null;
            }

            // Parse payload
            JSONObject payload = response.getJSONObject("payload");
            if (payload == null) {
                return null;
            }

            JSONObject choices = payload.getJSONObject("choices");
            if (choices == null) {
                return null;
            }

            JSONArray textArray = choices.getJSONArray("text");
            if (textArray == null || textArray.isEmpty()) {
                return null;
            }

            JSONObject textItem = textArray.getJSONObject(0);
            if (textItem == null) {
                return null;
            }

            String base64Image = textItem.getString("content");
            if (StrUtil.isBlank(base64Image)) {
                return null;
            }

            log.info("User [{}] received base64 image data, length: {}", uid, base64Image.length());

            // Check if it's really base64 image data
            if (base64Image.length() < 1000) {
                return null;
            }

            // Convert and compress image
            imageInput = ImageUtil.base64ToImageInputStream(base64Image);
            compressImageInput = ImageUtil.compressImage(imageInput, IMAGE_COMPRESS_SCALE);

            // Calculate compressed dimensions
            int compressedWidth = (int) (BASE_IMAGE_SIZE * IMAGE_COMPRESS_SCALE);
            int compressedHeight = (int) (BASE_IMAGE_SIZE * IMAGE_COMPRESS_SCALE);

            // Upload to object storage
            String fileName = "avatar/" + uid + "/" + System.currentTimeMillis() + ".jpg";
            String avatarUrl = s3ClientUtil.uploadObject(fileName, "image/jpeg", compressImageInput);

            avatarUrl = avatarUrl + (avatarUrl.contains("?") ? "&" : "?") +
                    "width=" + compressedWidth + "&height=" + compressedHeight;

            log.info("User [{}] avatar generated and uploaded successfully: {}", uid, avatarUrl);
            return avatarUrl;

        } catch (Exception e) {
            log.error("Exception occurred during AI avatar generation for user [{}]", uid, e);
            return "Should return fallback content";
        } finally {
            IoUtil.close(imageInput);
            IoUtil.close(compressImageInput);
        }
    }

    @Override
    public BotGenerationDTO sentenceBot(String sentence, String uid) {
        if (StringUtils.isBlank(sentence)) {
            throw new BusinessException(PARAMETER_ERROR);
        }

        if (sentence.length() > 2000) {
            log.error("One-sentence assistant generation input too long: length={}", sentence.length());
            throw new BusinessException(PARAMETER_ERROR);
        }

        try {
            // Use AI service to generate assistant configuration
            BotGenerationDTO botDetail = generateBotFromSentence(sentence);

            // Generate AI avatar (optional, enable as needed)
            String botName = botDetail.getBotName();
            String botDesc = botDetail.getBotDesc();
            if (StringUtils.isNotBlank(botName) && StringUtils.isNotBlank(botDesc)) {
                try {
                    String avatarUrl = generateAvatar(uid, botName, botDesc);
                    if (StringUtils.isNotBlank(avatarUrl) && !avatarUrl.equals("Should return fallback content")) {
                        botDetail.setAvatar(avatarUrl);
                    }
                } catch (Exception e) {
                    log.warn("Avatar generation failed, using default avatar: {}", e.getMessage());
                    // Continue execution, don't affect main functionality
                }
            }

            return botDetail;
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("One-sentence assistant generation failed: sentence={}", sentence, e);
            throw new BusinessException(PARAMETER_ERROR);
        }
    }

    /**
     * Generate assistant configuration based on one-sentence description
     */
    private BotGenerationDTO generateBotFromSentence(String sentence) throws Exception {
        // Build prompt - use original project prompt logic
        String prompt = formatPrompt("sentence_bot_generation", sentence);

        log.info("Starting one-sentence assistant generation, input: {}", sentence);

        // Call AI service to generate response
        String aiResponse = aiServiceClient.generateText(prompt, "gpt4", 120);

        if (StringUtils.isBlank(aiResponse)) {
            log.error("AI service returned empty response");
            throw new RuntimeException("AI service returned empty response");
        }

        log.info("AI generated response: {}", aiResponse);

        // Parse AI response
        return parseBotConfigFromResponse(aiResponse);
    }

    /**
     * Parse AI response and extract assistant configuration information
     */
    private BotGenerationDTO parseBotConfigFromResponse(String response) {
        BotGenerationDTO botDetail = new BotGenerationDTO();

        try {
            Map<String, List<String>> fieldMappings = getFieldMappings();
            String[] lines = response.split("\n");

            // Parse fields from response
            ParsedBotFields fields = parseFieldsFromLines(lines, fieldMappings);

            // Map assistant category to numeric type
            int botType = mapBotType(fields.botTypeName);

            // Build basic bot details
            populateBotBasicInfo(botDetail, fields, botType);

            // Build prompt structure
            List<PromptStructDTO> promptStructList = buildPromptStructList(fields);
            botDetail.setPromptStructList(promptStructList);

            // Process input examples
            List<String> examples = processInputExamples(fields.inputExample);
            botDetail.setInputExample(examples);

            log.info("Successfully parsed assistant configuration: botName={}, botType={}",
                    fields.botName, botType);

        } catch (Exception e) {
            log.error("Failed to parse assistant configuration", e);
            setDefaultBotDetails(botDetail);
        }

        return botDetail;
    }

    /**
     * Parse fields from response lines
     */
    private ParsedBotFields parseFieldsFromLines(String[] lines, Map<String, List<String>> fieldMappings) {
        ParsedBotFields fields = new ParsedBotFields();

        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim();

            if (matchesFieldMapping(line, fieldMappings.get("assistant_name"))) {
                fields.botName = extractValue(line);
            } else if (matchesFieldMapping(line, fieldMappings.get("assistant_category"))) {
                fields.botTypeName = extractValue(line);
            } else if (matchesFieldMapping(line, fieldMappings.get("assistant_description"))) {
                fields.botDesc = extractValue(line);
            } else if (matchesFieldMapping(line, fieldMappings.get("role_setting"))) {
                fields.roleDesc = extractValue(line);
            } else if (matchesFieldMapping(line, fieldMappings.get("target_task"))) {
                fields.targetTask = extractValue(line);
            } else if (matchesFieldMapping(line, fieldMappings.get("requirement_description"))) {
                fields.requirement = extractValue(line);
            } else if (matchesFieldMapping(line, fieldMappings.get("input_examples"))) {
                fields.inputExample = extractMultiLineExample(lines, i, fieldMappings);
                // Skip processed lines
                i = findNextFieldIndex(lines, i + 1, fieldMappings) - 1;
            }
        }

        return fields;
    }

    /**
     * Extract multi-line example text
     */
    private String extractMultiLineExample(String[] lines, int startIndex,
            Map<String, List<String>> fieldMappings) {
        StringBuilder exampleBuilder = new StringBuilder(extractValue(lines[startIndex].trim()));

        for (int j = startIndex + 1; j < lines.length; j++) {
            String nextLine = lines[j].trim();
            if (StringUtils.isBlank(nextLine)) {
                continue;
            }

            if (isAnyFieldMapping(nextLine, fieldMappings)) {
                break;
            }

            if (exampleBuilder.length() > 0) {
                exampleBuilder.append("\n");
            }
            exampleBuilder.append(nextLine);
        }

        return exampleBuilder.toString();
    }

    /**
     * Find next field index
     */
    private int findNextFieldIndex(String[] lines, int startIndex,
            Map<String, List<String>> fieldMappings) {
        for (int i = startIndex; i < lines.length; i++) {
            if (isAnyFieldMapping(lines[i].trim(), fieldMappings)) {
                return i;
            }
        }
        return lines.length;
    }

    /**
     * Check if line matches any field mapping
     */
    private boolean isAnyFieldMapping(String line, Map<String, List<String>> fieldMappings) {
        for (List<String> patterns : fieldMappings.values()) {
            if (matchesFieldMapping(line, patterns)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Populate basic bot information
     */
    private void populateBotBasicInfo(BotGenerationDTO botDetail, ParsedBotFields fields, int botType) {
        botDetail.setBotName(StringUtils.isNotBlank(fields.botName) ? fields.botName : "AI Assistant");
        botDetail.setBotDesc(StringUtils.isNotBlank(fields.botDesc) ? fields.botDesc : "Intelligent Assistant");
        botDetail.setBotType(botType);
        botDetail.setPromptType(1);
        botDetail.setSupportContext(0);
        botDetail.setSupportSystem(0);
        botDetail.setVersion(1);
        botDetail.setBotStatus(-9);
    }

    /**
     * Build prompt structure list
     */
    private List<PromptStructDTO> buildPromptStructList(ParsedBotFields fields) {
        List<PromptStructDTO> promptStructList = new ArrayList<>();
        Map<String, String> labels = getPromptStructLabels();

        addPromptStruct(promptStructList, labels.get("role_setting"), fields.roleDesc);
        addPromptStruct(promptStructList, labels.get("target_task"), fields.targetTask);
        addPromptStruct(promptStructList, labels.get("requirement_description"), fields.requirement);

        return promptStructList;
    }

    /**
     * Add prompt struct if value is not blank
     */
    private void addPromptStruct(List<PromptStructDTO> list, String key, String value) {
        if (StringUtils.isNotBlank(value)) {
            PromptStructDTO struct = new PromptStructDTO();
            struct.setPromptKey(key);
            struct.setPromptValue(value);
            list.add(struct);
        }
    }

    /**
     * Process input examples
     */
    private List<String> processInputExamples(String inputExample) {
        if (StringUtils.isBlank(inputExample)) {
            return new ArrayList<>();
        }

        List<String> exampleList;
        if (inputExample.contains("|")) {
            exampleList = parsePipeDelimitedExamples(inputExample);
        } else {
            exampleList = parseNumberedExamples(inputExample);
        }

        return exampleList.size() > 3 ? exampleList.subList(0, 3) : exampleList;
    }

    /**
     * Parse pipe-delimited examples
     */
    private List<String> parsePipeDelimitedExamples(String inputExample) {
        String[] examples = inputExample.replace("||", "|").split("\\|");
        List<String> exampleList = new ArrayList<>();
        for (String example : examples) {
            if (StringUtils.isNotBlank(example.trim()) && exampleList.size() < 3) {
                exampleList.add(example.trim());
            }
        }
        return exampleList;
    }

    /**
     * Set default bot details
     */
    private void setDefaultBotDetails(BotGenerationDTO botDetail) {
        botDetail.setBotName("AI Assistant");
        botDetail.setBotDesc("Intelligent Assistant");
        botDetail.setBotType(1);
        botDetail.setPromptStructList(new ArrayList<>());
        botDetail.setInputExample(new ArrayList<>());
    }

    /**
     * Inner class to hold parsed bot fields
     */
    private static class ParsedBotFields {
        String botName;
        String botTypeName;
        String botDesc;
        String roleDesc;
        String targetTask;
        String requirement;
        String inputExample;
    }

    /**
     * Extract value from line (remove prefix)
     */
    private String extractValue(String line) {
        int colonIndex = Math.max(line.indexOf(":"), line.indexOf("："));
        if (colonIndex > 0 && colonIndex < line.length() - 1) {
            return line.substring(colonIndex + 1).trim();
        }
        return "";
    }

    /**
     * Check if line matches any of the field mapping patterns
     */
    private boolean matchesFieldMapping(String line, List<String> fieldPatterns) {
        if (fieldPatterns == null || fieldPatterns.isEmpty()) {
            return false;
        }
        for (String pattern : fieldPatterns) {
            if (line.startsWith(pattern)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Map assistant category name to numeric type
     */
    private int mapBotType(String botTypeName) {
        if (StringUtils.isBlank(botTypeName)) {
            return 1; // Default type
        }

        // Get bot type mappings from database
        Map<String, Integer> typeMap = getBotTypeMappings();
        return typeMap.getOrDefault(botTypeName, 1);
    }

    @Override
    public String generatePrologue(String botName) {
        if (StringUtils.isBlank(botName)) {
            throw new BusinessException(PARAMETER_ERROR);
        }

        if (StringUtils.length(botName) > 520) {
            throw new BusinessException(PARAMETER_ERROR);
        }

        try {
            String question = formatPrompt("prologue_generation", botName);
            String prologue = String.valueOf(aiServiceClient.generateText(question, "gpt4", 60));

            if (StringUtils.isBlank(prologue)) {
                log.error("Failed to generate prologue: AI returned empty content");
                throw new BusinessException(PARAMETER_ERROR);
            }

            log.info("Robot [{}] prologue generated successfully, length: {}", botName, prologue.length());
            return prologue.trim();

        } catch (BusinessException e) {
            throw e;
        } catch (IllegalArgumentException e) {
            log.error("Parameter error when generating robot [{}] prologue", botName, e);
            throw new BusinessException(PARAMETER_ERROR);
        } catch (Exception e) {
            log.error("Exception occurred when generating robot [{}] prologue", botName, e);
            throw new BusinessException(PARAMETER_ERROR);
        }
    }

    /**
     * Parse JSON content to field mappings
     */
    private Map<String, List<String>> parseJsonToFieldMappings(String jsonContent) {
        try {
            Map<String, List<String>> mappings = new HashMap<>();
            JSONObject jsonObject = JSON.parseObject(jsonContent);
            for (String key : jsonObject.keySet()) {
                JSONArray array = jsonObject.getJSONArray(key);
                List<String> values = new ArrayList<>();
                for (int i = 0; i < array.size(); i++) {
                    values.add(array.getString(i));
                }
                mappings.put(key, values);
            }
            return mappings;
        } catch (Exception e) {
            log.error("Failed to parse field mappings JSON, using default configuration");
            return getDefaultFieldMappings();
        }
    }

    /**
     * Parse JSON content to bot type mappings
     */
    private Map<String, Integer> parseJsonToBotTypeMappings(String jsonContent) {
        try {
            Map<String, Integer> mappings = new HashMap<>();
            JSONObject jsonObject = JSON.parseObject(jsonContent);
            for (String key : jsonObject.keySet()) {
                mappings.put(key, jsonObject.getInteger(key));
            }
            return mappings;
        } catch (Exception e) {
            log.error("Failed to parse bot type mappings JSON, using default configuration");
            return getDefaultBotTypeMappings();
        }
    }

    /**
     * Parse JSON content to prompt struct labels
     */
    private Map<String, String> parseJsonToPromptStructLabels(String jsonContent) {
        try {
            Map<String, String> mappings = new HashMap<>();
            JSONObject jsonObject = JSON.parseObject(jsonContent);
            for (String key : jsonObject.keySet()) {
                mappings.put(key, jsonObject.getString(key));
            }
            return mappings;
        } catch (Exception e) {
            log.error("Failed to parse prompt struct labels JSON, using default configuration");
            return getDefaultPromptStructLabels();
        }
    }

    /**
     * Get default prompt template
     */
    private String getDefaultPromptTemplate(String promptKey) {
        return switch (promptKey) {
            case "avatar_generation" -> """
                    Please generate a professional avatar for an AI assistant named "{0}". Description: {1}. \
                    Requirements: 1.Modern and clean style 2.Harmonious color scheme 3.Professional AI assistant image \
                    4.Suitable for application interface display""";
            case "sentence_bot_generation" -> """
                    Based on the user description: "{0}", please generate a complete AI assistant configuration. \
                    Please output strictly in the following format: Assistant Name: [Concise and clear assistant name] \
                    Assistant Category: [Choose from: Workplace/Learning/Writing/Programming/Lifestyle/Health] \
                    Assistant Description: [One sentence describing the main function] \
                    Role Setting: [Detailed description of role identity and professional background] \
                    Target Task: [Clearly state the main tasks to be completed] \
                    Requirement Description: [Detailed functional requirements and usage scenarios] \
                    Input Examples: [Provide 2-3 possible user input examples, separated by |] \
                    Note: Please ensure each field has specific content, do not use placeholders.""";
            case "prologue_generation" -> """
                    Please generate a friendly and professional opening message for an AI assistant named "{0}". \
                    Requirements: 1.Friendly and natural tone 2.Highlight professional capabilities \
                    3.Guide users to start conversation 4.Keep within 50 words""";
            case "input_example_generation" ->
                """
                        Assistant name as follows:
                        ```
                        {0}
                        ```
                        Assistant description as follows:
                        ```
                        {1}
                        ```
                        Assistant instructions as follows:
                        ```
                        {2}
                        ```
                        Note:
                        An assistant sends an instruction template together with the user's detailed input to a large language model to complete a specific task.
                        The assistant description states what the assistant should accomplish and what the user needs to provide.
                        The assistant instructions are the template sent to the model; the template plus the user's detailed input enable the model to complete the task.

                        Please follow these steps:
                        1. Carefully read the assistant name, description, and instructions to understand the intended task.
                        2. Based on the above, generate three short task descriptions that a user would input when using this assistant.
                        3. Ensure each output matches the assistant task and does not repeat.
                        4. Be specific; avoid vague dimensions only.
                        5. Return results line by line, one description per line.
                        6. Each description must be no more than 20 words. [VERY IMPORTANT!!]
                        7. Be concise and avoid verbosity; use short phrases.

                        Ensure the three user input task descriptions are appropriate for this assistant.
                        Return results in the following format:
                        1.context1
                        2.context2
                        3.context3""";
            default -> throw new BusinessException(ResponseEnum.SYSTEM_ERROR);
        };
    }

    /**
     * Get default field mappings
     */
    private Map<String, List<String>> getDefaultFieldMappings() {
        Map<String, List<String>> mappings = new HashMap<>();
        mappings.put("assistant_name", Arrays.asList("Assistant Name:"));
        mappings.put("assistant_category", Arrays.asList("Assistant Category:"));
        mappings.put("assistant_description", Arrays.asList("Assistant Description:"));
        mappings.put("role_setting", Arrays.asList("Role Setting:"));
        mappings.put("target_task", Arrays.asList("Target Task:"));
        mappings.put("requirement_description", Arrays.asList("Requirement Description:"));
        mappings.put("input_examples", Arrays.asList("Input Examples:"));
        return mappings;
    }

    /**
     * Get default bot type mappings
     */
    private Map<String, Integer> getDefaultBotTypeMappings() {
        Map<String, Integer> mappings = new HashMap<>();
        mappings.put("Workplace", 10);
        mappings.put("Learning", 13);
        mappings.put("Writing", 14);
        mappings.put("Programming", 15);
        mappings.put("Lifestyle", 17);
        mappings.put("Health", 39);
        return mappings;
    }

    /**
     * Get default prompt struct labels
     */
    private Map<String, String> getDefaultPromptStructLabels() {
        Map<String, String> mappings = new HashMap<>();
        mappings.put("role_setting", "Role Setting");
        mappings.put("target_task", "Target Task");
        mappings.put("requirement_description", "Requirement Description");
        return mappings;
    }

    @Override
    public List<String> generateInputExample(String botName, String botDesc, String prompt) {
        if (StringUtils.isBlank(botName) || StringUtils.length(botName) > 128) {
            throw new BusinessException(PARAMETER_ERROR);
        }
        botDesc = StringUtils.defaultString(StringUtils.left(botDesc, 1000));
        prompt = StringUtils.defaultString(StringUtils.left(prompt, 2000));

        try {
            String question = formatPrompt("input_example_generation", botName, botDesc, prompt);
            String answer = aiServiceClient.generateText(question, "gpt4", 60);
            List<String> examples = parseNumberedExamples(answer);
            return examples.size() > 3 ? examples.subList(0, 3) : examples;
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to generate input examples, botName=[{}]", botName, e);
            return Collections.emptyList();
        }
    }

    /**
     * Parse text content and extract up to 3 numbered examples. Supports patterns like: 1. xxx\n2.
     * yyy\n3. zzz (optional 4. ... will be ignored) Fallback: take first 3 non-empty lines.
     */
    private List<String> parseNumberedExamples(String text) {
        List<String> result = new ArrayList<>();
        if (StringUtils.isBlank(text)) {
            return result;
        }

        // Try pattern-based extraction first
        result = tryPatternBasedExtraction(text);

        // Fallback to line-based extraction if needed
        if (result.isEmpty()) {
            result = tryLineBasedExtraction(text);
        }

        return result;
    }

    /**
     * Try to extract examples using pattern matching
     */
    private List<String> tryPatternBasedExtraction(String text) {
        List<String> result = new ArrayList<>();

        // Non-greedy capture between markers; DOTALL for multi-line
        Pattern p = Pattern.compile("(?s)1\\.\\s*(.*?)(?:\\n|\r|$)\\s*2\\.\\s*(.*?)(?:\\n|\r|$)\\s*3\\.\\s*(.*?)(?:(?:\\n|\r)\\s*4\\.|$)");
        Matcher m = p.matcher(text);

        if (m.find()) {
            for (int i = 1; i <= 3; i++) {
                String seg = cleanExtractedSegment(m.group(i));
                if (StringUtils.isNotBlank(seg)) {
                    result.add(seg);
                }
            }
        }

        return result;
    }

    /**
     * Clean extracted segment by removing unwanted patterns
     */
    private String cleanExtractedSegment(String segment) {
        String seg = StringUtils.trimToEmpty(segment);
        seg = seg.replaceAll("(?s)\\n\\s*[1-9]\\.\\s*.*$", "").trim();
        return removeQuotes(seg);
    }

    /**
     * Remove surrounding quotes from string
     */
    private String removeQuotes(String text) {
        if (text.startsWith("\"") && text.endsWith("\"") && text.length() > 1) {
            return text.substring(1, text.length() - 1).trim();
        }
        if (text.startsWith("'") && text.endsWith("'") && text.length() > 1) {
            return text.substring(1, text.length() - 1).trim();
        }
        return text;
    }

    /**
     * Try to extract examples using line-based approach
     */
    private List<String> tryLineBasedExtraction(String text) {
        List<String> result = new ArrayList<>();
        String[] lines = text.split("\r?\n");

        for (String line : lines) {
            String s = cleanLineForExtraction(line);
            if (!s.isEmpty()) {
                result.add(s);
            }
            if (result.size() == 3) {
                break;
            }
        }

        return result;
    }

    /**
     * Clean line for extraction
     */
    private String cleanLineForExtraction(String line) {
        String s = StringUtils.trimToEmpty(line);
        if (s.isEmpty()) {
            return "";
        }

        s = s.replaceFirst("^\\s*(?:[0-9]+[\\.)]|[-•])\\s*", "").trim();
        return removeQuotes(s);
    }
}
