package com.iflytek.astron.console.hub.controller.bot;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.iflytek.astron.console.commons.annotation.space.SpacePreAuth;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.dto.bot.BotCreateForm;
import com.iflytek.astron.console.commons.dto.bot.BotInfoDto;
import com.iflytek.astron.console.commons.entity.bot.TakeoffList;
import com.iflytek.astron.console.commons.entity.bot.UserLangChainInfo;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.service.bot.BotService;
import com.iflytek.astron.console.commons.service.bot.ChatBotDataService;
import com.iflytek.astron.console.commons.service.data.UserLangChainDataService;
import com.iflytek.astron.console.commons.util.MaasUtil;
import com.iflytek.astron.console.commons.util.RequestContextUtil;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import com.iflytek.astron.console.hub.dto.bot.MaasDuplicate;
import com.iflytek.astron.console.commons.enums.bot.BotVersionEnum;
import com.iflytek.astron.console.hub.service.bot.BotTransactionalService;
import com.iflytek.astron.console.hub.util.BotPermissionUtil;
import com.iflytek.astron.console.toolkit.entity.biz.modelconfig.ModelDto;
import com.iflytek.astron.console.toolkit.entity.vo.LLMInfoVo;
import com.iflytek.astron.console.toolkit.service.model.ModelService;
import com.iflytek.astron.console.toolkit.service.workflow.WorkflowService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.redisson.api.RedissonClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;


/**
 * @author cherry
 */
@Slf4j
@Tag(name = "Workflow Assistant Interface")
@RestController
@RequestMapping(value = "/workflow")
public class BotController {

    @Autowired
    private BotPermissionUtil botPermissionUtil;

    @Autowired
    private BotService botService;

    @Autowired
    private ChatBotDataService chatBotDataService;

    @Autowired
    private MaasUtil maasUtil;

    @Autowired
    private UserLangChainDataService userLangChainDataService;

    @Autowired
    private RedissonClient redissonClient;

    @Autowired
    private BotTransactionalService botTransactionalService;

    @Autowired
    private WorkflowService workflowService;

    @Autowired
    private ModelService modelService;

    @Value("${maas.appid:}")
    String tenantId;

    /**
     * Save basic information of assistant
     */
    @PostMapping(path = "/base-save")
    @Operation(summary = "save base agent")
    public ApiResult<BotInfoDto> createBot(HttpServletRequest request, @RequestBody BotCreateForm bot) {
        String uid = RequestContextUtil.getUID();
        Long spaceId = SpaceInfoUtil.getSpaceId();
        // Update if not null
        if (bot.getBotId() != null) {
            botPermissionUtil.checkBot(bot.getBotId());
            if (botService.updateWorkflowBot(uid, bot, request, spaceId)) {
                syncWorkflowRuntimeModel(bot, request, uid, spaceId);
                return ApiResult.success();
            }
        } else {
            // Create workflow assistant
            BotInfoDto dto = botService.insertWorkflowBot(uid, bot, spaceId, BotVersionEnum.WORKFLOW.version);
            int botId = dto.getBotId();
            bot.setBotId(botId);
            JSONObject maas = maasUtil.synchronizeWorkFlow(null, bot, request, spaceId, BotVersionEnum.WORKFLOW.getVersion(), null);
            dto.setFlowId(maas.getJSONObject("data").getLong("flowId"));
            dto.setMaasId(maas.getJSONObject("data").getLong("id"));
            botService.addMaasInfo(uid, maas, botId, spaceId);
            syncWorkflowRuntimeModel(bot, request, uid, spaceId);
            return ApiResult.success(dto);
        }
        return ApiResult.error(ResponseEnum.CREATE_BOT_FAILED);
    }

    private void syncWorkflowRuntimeModel(
            BotCreateForm bot, HttpServletRequest request, String uid, Long spaceId) {
        if (bot == null || bot.getBotId() == null) {
            return;
        }
        LLMInfoVo llmInfoVo = resolveSelectedModel(bot, request, uid, spaceId);
        if (llmInfoVo == null) {
            log.warn("Skip workflow runtime model sync because selected model cannot be resolved, botId={}, modelId={}, model={}",
                    bot.getBotId(), bot.getModelId(), bot.getModel());
            return;
        }

        UserLangChainInfo userLangChainInfo = userLangChainDataService.findOneByBotId(bot.getBotId());
        if (userLangChainInfo == null || StringUtils.isBlank(userLangChainInfo.getFlowId())) {
            log.warn("Skip workflow runtime model sync because flowId is missing, botId={}", bot.getBotId());
            return;
        }
        workflowService.syncWorkflowModelConfig(userLangChainInfo.getFlowId(), llmInfoVo);
    }

    private LLMInfoVo resolveSelectedModel(
            BotCreateForm bot, HttpServletRequest request, String uid, Long spaceId) {
        if (bot.getModelId() != null) {
            LLMInfoVo llmInfoVo = modelService.getRuntimeModelDetail(bot.getModelId(), uid, spaceId);
            if (llmInfoVo != null) {
                return llmInfoVo;
            }
        }
        if (StringUtils.isBlank(bot.getModel())) {
            return null;
        }
        ModelDto modelDto = new ModelDto();
        modelDto.setPage(1);
        modelDto.setPageSize(1000);
        modelDto.setType(0);
        modelDto.setFilter(0);
        modelDto.setUid(uid);
        modelDto.setSpaceId(spaceId);
        ApiResult<Page<LLMInfoVo>> result = modelService.getList(modelDto, request);
        Page<LLMInfoVo> page = result.data();
        if (page == null || page.getRecords() == null) {
            return null;
        }
        return page.getRecords()
                .stream()
                .filter(item -> StringUtils.equals(bot.getModel(), item.getDomain())
                        || StringUtils.equals(bot.getModel(), item.getServiceId()))
                .findFirst()
                .orElse(null);
    }

    @PostMapping("/publish")
    @Operation(summary = "publish agent")
    public ApiResult<String> maasPublish(HttpServletRequest request, @RequestBody JSONObject botJson) {
        String uid = RequestContextUtil.getUID();
        String botId = (String) botJson.get("botId");
        botPermissionUtil.checkBot(Integer.parseInt(botId));
        maasUtil.setBotTag(botJson);
        log.info("***** uid: {}, botId: {} submit MAAS assistant", uid, botId);
        String flowId = botJson.getString("flowId");
        JSONObject result = maasUtil.createApi(flowId, tenantId);
        if (Objects.isNull(result)) {
            return ApiResult.success();
        }
        return ApiResult.success(flowId);
    }

    /**
     * Apply to take down assistant
     *
     * @param request
     * @param takeoffList
     * @return
     */
    @SpacePreAuth(key = "BotController_takeoffBot_POST")
    @PostMapping("/take-off-bot")
    @Operation(summary = "take off agent")
    public ApiResult<Boolean> takeoffBot(HttpServletRequest request, @RequestBody TakeoffList takeoffList) {
        botPermissionUtil.checkBot(takeoffList.getBotId());
        String uid = RequestContextUtil.getUID();
        Long spaceId = SpaceInfoUtil.getSpaceId();

        if (takeoffList.getReason().length() > 100) {
            throw new BusinessException(ResponseEnum.PARAM_ERROR);
        }
        return ApiResult.success(chatBotDataService.takeoffBot(uid, spaceId, takeoffList));
    }

    @PostMapping("/updateSynchronize")
    @Transactional(rollbackFor = Exception.class)
    public ApiResult<Long> updateSynchronize(@RequestBody MaasDuplicate update) {
        log.info("----- Xingchen canvas update: {}", JSON.toJSONString(update));
        Long maasId = update.getMaasId();
        List<UserLangChainInfo> list = userLangChainDataService.findByMaasId(maasId);
        if (Objects.isNull(list) || list.isEmpty()) {
            log.info("----- Xinghuo did not find Xingchen's workflow: {}", maasId);
            return ApiResult.error(ResponseEnum.DATA_NOT_FOUND);
        }
        Integer botId = list.getFirst().getBotId();
        if (redissonClient.getBucket(MaasUtil.generatePrefix(maasId.toString(), botId)).isExists()) {
            log.info("----- Xinghuo internal service, no processing needed: {}", JSON.toJSONString(update));
            redissonClient.getBucket(MaasUtil.generatePrefix(maasId.toString(), botId)).delete();
            return ApiResult.success(botId.longValue());
        }

        String inputExamples = update.getInputExample()
                .stream()
                // Limit to maximum of first 3 elements
                .limit(3)
                .collect(Collectors.joining(","));
        // Update description, opening remarks, input examples
        boolean updateResult = chatBotDataService.updateBotBasicInfo(botId, update.getBotDesc(), update.getPrologue(), inputExamples);
        if (!updateResult) {
            log.error("Failed to update bot basic info for botId: {}", botId);
            return ApiResult.error(ResponseEnum.UPDATE_BOT_FAILED);
        }
        return ApiResult.success(maasId);
    }

    /**
     * Copy assistant to specified assistant
     */
    @SpacePreAuth(key = "BotController_copyBot2_POST")
    @PostMapping("/copy-bot")
    public ApiResult<Void> copyBot2(HttpServletRequest request, @RequestParam Long botId) {
        botPermissionUtil.checkBot(Math.toIntExact(botId));
        String uid = RequestContextUtil.getUID();
        Long spaceId = SpaceInfoUtil.getSpaceId();
        log.info("***** uid: {} copy assistant: {}", uid, botId);
        botTransactionalService.copyBot(uid, Math.toIntExact(botId), request, spaceId);
        return ApiResult.success();
    }
}
