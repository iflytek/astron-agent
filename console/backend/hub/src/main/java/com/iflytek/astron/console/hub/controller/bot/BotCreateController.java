package com.iflytek.astron.console.hub.controller.bot;

import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.annotation.RateLimit;
import com.iflytek.astron.console.commons.annotation.space.SpacePreAuth;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.dto.bot.BotCreateForm;
import com.iflytek.astron.console.commons.dto.bot.BotInfoDto;
import com.iflytek.astron.console.commons.dto.bot.BotModelDto;
import com.iflytek.astron.console.commons.entity.bot.BotTemplate;
import com.iflytek.astron.console.commons.entity.bot.BotTypeList;
import com.iflytek.astron.console.commons.enums.bot.DefaultBotModelEnum;
import com.iflytek.astron.console.commons.mapper.bot.BotTemplateMapper;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.service.bot.BotDatasetService;
import com.iflytek.astron.console.commons.service.bot.BotService;
import com.iflytek.astron.console.commons.util.I18nUtil;
import com.iflytek.astron.console.commons.util.RequestContextUtil;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import com.iflytek.astron.console.hub.dto.bot.BotGenerationDTO;
import com.iflytek.astron.console.hub.service.bot.BotAIService;
import com.iflytek.astron.console.hub.util.BotPermissionUtil;
import com.iflytek.astron.console.toolkit.service.model.LLMService;
import com.iflytek.astron.console.toolkit.service.repo.MassDatasetInfoService;
import com.iflytek.astron.console.toolkit.util.RedisUtil;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Slf4j
@RestController
@RequestMapping("/bot")
public class BotCreateController {

    @Autowired
    private BotAIService botAIService;

    @Autowired
    private BotService botService;

    @Autowired
    private BotPermissionUtil botPermissionUtil;

    @Autowired
    private LLMService llmService;

    @Autowired
    private BotDatasetService botDatasetService;

    @Autowired
    private MassDatasetInfoService botDatasetMaasService;

    @Autowired
    private BotTemplateMapper botTemplateMapper;

    @Autowired
    private RedisUtil redisUtil;

    /**
     * Create workflow assistant
     *
     * @param request HTTP request containing space context
     * @param bot Assistant creation form
     * @return Created assistant ID
     */
    @SpacePreAuth(key = "BotCreateController_createBot_POST")
    @PostMapping("/create")
    @RateLimit(dimension = "USER", window = 1, limit = 1)
    @Transactional
    public ApiResult<Integer> createBot(HttpServletRequest request, @RequestBody BotCreateForm bot) {
        String uid = RequestContextUtil.getUID();
        Long spaceId = SpaceInfoUtil.getSpaceId();

        // Validate dataset ownership before creating bot
        List<Long> datasetList = bot.getDatasetList();
        List<Long> maasDatasetList = bot.getMaasDatasetList();
        if (!botDatasetService.checkDatasetBelong(uid, spaceId, datasetList)) {
            return ApiResult.error(ResponseEnum.BOT_BELONG_ERROR);
        }
        boolean selfDocumentExist = (datasetList != null && !datasetList.isEmpty());
        boolean maasDocumentExist = (maasDatasetList != null && !maasDatasetList.isEmpty());
        int supportDocument = (selfDocumentExist || maasDocumentExist) ? 1 : 0;
        bot.setSupportDocument(supportDocument);
        // Create bot basic information
        BotInfoDto botInfo = botService.insertBotBasicInfo(uid, bot, spaceId);
        Integer botId = botInfo.getBotId();

        // Handle dataset associations
        if (selfDocumentExist) {
            botDatasetService.botAssociateDataset(uid, botId, datasetList, supportDocument);
        }

        if (maasDocumentExist) {
            botDatasetMaasService.botAssociateDataset(uid, botId, maasDatasetList, supportDocument);
        }

        return ApiResult.success(botId);
    }

    /**
     * Get assistant type list
     *
     * @return Assistant type list
     */
    @PostMapping("/type-list")
    public ApiResult<List<BotTypeList>> getBotTypeList() {
        List<BotTypeList> typeList = botService.getBotTypeList();
        return ApiResult.success(typeList);
    }

    /**
     * AI generate assistant avatar
     *
     * @param requestBody Robot creation form
     * @return Generated avatar URL
     */
    @PostMapping("/ai-avatar-gen")
    @RateLimit(dimension = "USER", window = 86400, limit = 50)
    public ApiResult<String> generateAvatar(@Valid @RequestBody BotCreateForm requestBody) {
        String uid = RequestContextUtil.getUID();
        String botName = requestBody.getName();
        String botDesc = requestBody.getBotDesc();

        if (botName == null || botName.trim().isEmpty()) {
            return ApiResult.error(ResponseEnum.PARAMS_ERROR);
        }

        String avatar = botAIService.generateAvatar(uid, botName, botDesc);

        if (avatar == null || avatar.trim().isEmpty()) {
            return ApiResult.error(ResponseEnum.SYSTEM_ERROR);
        }

        return ApiResult.success(avatar);
    }

    /**
     * Generate assistant with one sentence
     *
     * @param sentence Input sentence
     * @return Generated assistant details
     */
    @PostMapping("/ai-sentence-gen")
    @RateLimit(dimension = "USER", window = 1, limit = 1)
    public ApiResult<BotGenerationDTO> sentence(@RequestParam String sentence) {
        if (sentence == null || sentence.trim().isEmpty()) {
            return ApiResult.error(ResponseEnum.PARAMS_ERROR);
        }

        String uid = RequestContextUtil.getUID();
        BotGenerationDTO botDetail = botAIService.sentenceBot(sentence, uid);
        return ApiResult.success(botDetail);
    }

    /**
     * AI generate input examples
     *
     * Path: /bot/generateInputExample
     */
    @PostMapping(value = "/generate-input-example")
    @RateLimit(dimension = "USER", window = 1, limit = 1)
    public ApiResult<List<String>> generateInputExample(@RequestParam String botName,
            @RequestParam String botDesc,
            @RequestParam String prompt) {
        if (botName == null || botName.trim().isEmpty()) {
            return ApiResult.error(ResponseEnum.PARAMS_ERROR);
        }
        List<String> examples = botAIService.generateInputExample(botName, botDesc, prompt);
        return ApiResult.success(examples);
    }

    /**
     * Large model generates assistant prologue
     *
     * @param form Robot creation form
     * @return Generated prologue
     */
    @PostMapping("/ai-prologue-gen")
    @RateLimit(dimension = "USER", window = 1, limit = 1)
    public ApiResult<String> aiGenPrologue(@Valid @RequestBody BotCreateForm form) {
        String botName = form.getName();
        if (botName == null || botName.trim().isEmpty()) {
            return ApiResult.error(ResponseEnum.PARAMS_ERROR);
        }
        String aiPrologue = botAIService.generatePrologue(botName);
        return ApiResult.success(aiPrologue);
    }

    /**
     * Update workflow assistant
     *
     * @param request HTTP request containing space context
     * @param bot Assistant update form (must contain botId)
     * @return Update result
     */
    @SpacePreAuth(key = "BotCreateController_updateBot_POST")
    @PostMapping("/update")
    @RateLimit(dimension = "USER", window = 1, limit = 1)
    @Transactional
    public ApiResult<Boolean> updateBot(HttpServletRequest request, @RequestBody BotCreateForm bot) {
        // Validate botId is provided
        if (bot.getBotId() == null) {
            return ApiResult.error(ResponseEnum.PARAMS_ERROR);
        }

        String uid = RequestContextUtil.getUID();
        Long spaceId = SpaceInfoUtil.getSpaceId();

        // Permission validation
        botPermissionUtil.checkBot(bot.getBotId());

        // Validate dataset ownership before updating bot
        List<Long> datasetList = bot.getDatasetList();
        List<Long> maasDatasetList = bot.getMaasDatasetList();
        if (!botDatasetService.checkDatasetBelong(uid, spaceId, datasetList)) {
            return ApiResult.error(ResponseEnum.BOT_BELONG_ERROR);
        }
        boolean selfDocumentExist = (datasetList != null && !datasetList.isEmpty());
        boolean maasDocumentExist = (maasDatasetList != null && !maasDatasetList.isEmpty());
        int supportDocument = (selfDocumentExist || maasDocumentExist) ? 1 : 0;
        bot.setSupportDocument(supportDocument);
        // Update bot basic information
        Boolean result = botService.updateBotBasicInfo(uid, bot, spaceId);

        // Handle dataset associations update
        botDatasetService.updateDatasetByBot(uid, bot.getBotId(), datasetList, supportDocument);
        botDatasetMaasService.updateDatasetByBot(uid, bot.getBotId(), maasDatasetList, supportDocument);

        return ApiResult.success(result);
    }

    /**
     * Handle request to get bot models
     *
     * @param request HTTP request object
     * @return API result containing all model lists
     */
    @Operation(summary = "Get bot model list", description = "Fetches both default and custom bot models")
    @GetMapping("/bot-model")
    public ApiResult<List<BotModelDto>> botModel(HttpServletRequest request) {
        List<BotModelDto> allModels = new ArrayList<>();

        // 1. Add default models: Spark 4.0 and x1
        BotModelDto x1Model = new BotModelDto();
        x1Model.setModelDomain(DefaultBotModelEnum.X1.getDomain());
        x1Model.setModelName(DefaultBotModelEnum.X1.getName());
        x1Model.setModelIcon(DefaultBotModelEnum.X1.getIcon());
        x1Model.setIsCustom(false);
        allModels.add(x1Model);

        BotModelDto sparkModel = new BotModelDto();
        sparkModel.setModelDomain(DefaultBotModelEnum.SPARK_4_0.getDomain());
        sparkModel.setModelName(DefaultBotModelEnum.SPARK_4_0.getName());
        sparkModel.setModelIcon(DefaultBotModelEnum.SPARK_4_0.getIcon());
        sparkModel.setIsCustom(false);
        allModels.add(sparkModel);

        // Add DeepSeek models
        BotModelDto deepseekV3Model = new BotModelDto();
        deepseekV3Model.setModelDomain(DefaultBotModelEnum.DEEPSEEK_V3.getDomain());
        deepseekV3Model.setModelName(DefaultBotModelEnum.DEEPSEEK_V3.getName());
        deepseekV3Model.setModelIcon(DefaultBotModelEnum.DEEPSEEK_V3.getIcon());
        deepseekV3Model.setIsCustom(false);
        allModels.add(deepseekV3Model);

        BotModelDto deepseekR1Model = new BotModelDto();
        deepseekR1Model.setModelDomain(DefaultBotModelEnum.DEEPSEEK_R1.getDomain());
        deepseekR1Model.setModelName(DefaultBotModelEnum.DEEPSEEK_R1.getName());
        deepseekR1Model.setModelIcon(DefaultBotModelEnum.DEEPSEEK_R1.getIcon());
        deepseekR1Model.setIsCustom(false);
        allModels.add(deepseekR1Model);

        // 2. Get custom models
        JSONObject result = JSONObject.from(llmService.getLlmAuthList(request, null, "workflow", "spark-llm"));

        try {
            if (result != null && result.containsKey("workflow")) {
                JSONArray workflowArray = result.getJSONArray("workflow");

                // Get the second array element (index 1, i.e., "Custom Models")
                if (workflowArray != null && workflowArray.size() > 1) {
                    JSONObject secondCategory = workflowArray.getJSONObject(1);

                    if (secondCategory != null && secondCategory.containsKey("modelList")) {
                        JSONArray modelList = secondCategory.getJSONArray("modelList");

                        if (modelList != null) {
                            for (int i = 0; i < modelList.size(); i++) {
                                JSONObject modelObj = modelList.getJSONObject(i);
                                if (modelObj != null) {
                                    BotModelDto customModel = convertToModelDto(modelObj);
                                    allModels.add(customModel);
                                }
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to extract custom models from LLM auth list", e);
        }

        return ApiResult.success(allModels);
    }

    /**
     * Convert JSONObject to BotModelDto object
     */
    private BotModelDto convertToModelDto(JSONObject modelJson) {
        BotModelDto model = new BotModelDto();

        // Set basic properties
        if (modelJson.containsKey("id") && modelJson.get("id") != null) {
            model.setModelId(modelJson.getLong("id"));
        }
        model.setModelName(modelJson.getString("name"));
        model.setModelDomain(modelJson.getString("domain"));
        model.setModelIcon(modelJson.getString("icon"));

        return model;
    }

    /**
     * Get robot templates
     *
     * @param botId Bot template ID (optional)
     * @return Template list or single template
     */
    @GetMapping("/template")
    public ApiResult<List<BotTemplate>> getTemplates(@RequestParam(required = false) Integer botId) {
        // Get current language from request
        String language = I18nUtil.getLanguage();
        // Default to 'zh' if language is not supported
        if (!"en".equals(language)) {
            language = "zh";
        }

        // Get templates from cache based on language
        String cacheKey = "bot:template:list:" + language;
        List<BotTemplate> templates = (List<BotTemplate>) redisUtil.get(cacheKey);

        if (templates == null) {
            templates = botTemplateMapper.selectListByLanguage(language);
            if (templates != null && !templates.isEmpty()) {
                redisUtil.put(cacheKey, templates, 10, TimeUnit.DAYS);
            }
        }

        if (templates == null) {
            templates = new ArrayList<>();
        }

        if (botId != null) {
            // Filter single template from the list
            BotTemplate template = templates.stream()
                    .filter(t -> botId.equals(t.getId()))
                    .findFirst()
                    .orElse(null);

            if (template == null) {
                return ApiResult.error(ResponseEnum.INTERNAL_SERVER_ERROR);
            }
            return ApiResult.success(Collections.singletonList(template));
        } else {
            // Return all templates
            return ApiResult.success(templates);
        }
    }
}
