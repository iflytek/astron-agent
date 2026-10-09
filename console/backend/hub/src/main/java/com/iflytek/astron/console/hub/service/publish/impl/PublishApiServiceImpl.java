package com.iflytek.astron.console.hub.service.publish.impl;

import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.dto.bot.ChatBotApi;
import com.iflytek.astron.console.commons.entity.bot.ChatBotBase;
import com.iflytek.astron.console.commons.entity.bot.UserLangChainInfo;
import com.iflytek.astron.console.commons.entity.user.AppMst;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.mapper.bot.BotDatasetMapper;
import com.iflytek.astron.console.commons.service.bot.ChatBotDataService;
import com.iflytek.astron.console.commons.service.data.UserLangChainDataService;
import com.iflytek.astron.console.commons.service.user.AppMstService;
import com.iflytek.astron.console.commons.util.MaasUtil;
import com.iflytek.astron.console.commons.util.RequestContextUtil;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import com.iflytek.astron.console.hub.dto.publish.AppListDTO;
import com.iflytek.astron.console.hub.dto.publish.BotApiInfoDTO;
import com.iflytek.astron.console.hub.dto.publish.CreateAppVo;
import com.iflytek.astron.console.hub.dto.publish.CreateBotApiVo;
import com.iflytek.astron.console.hub.dto.user.TenantAuth;
import com.iflytek.astron.console.commons.enums.bot.BotVersionEnum;
import com.iflytek.astron.console.hub.service.chat.ChatBotApiService;
import com.iflytek.astron.console.hub.service.publish.AgentRuntimeManagementClient;
import com.iflytek.astron.console.hub.service.publish.PublishApiService;
import com.iflytek.astron.console.hub.service.publish.ReleaseManageClientService;
import com.iflytek.astron.console.hub.service.publish.TenantService;
import com.iflytek.astron.console.toolkit.entity.vo.LLMInfoVo;
import com.iflytek.astron.console.toolkit.service.model.ModelService;
import com.iflytek.astron.console.toolkit.util.RedisUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * @author yun-zhi-ztl
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PublishApiServiceImpl implements PublishApiService {


    @Value("${maas.botApiCbmBaseUrl}")
    private String botApiCbmBaseUrl;

    @Value("${maas.botApiMaasBaseUrl}")
    private String botApiMaasBaseUrl;

    @Autowired
    private AppMstService appMstService;

    @Autowired
    private TenantService tenantService;

    @Autowired
    private RedisUtil redisUtil;

    @Autowired
    private ChatBotDataService chatBotDataService;

    @Autowired
    private ChatBotApiService chatBotApiService;

    @Autowired
    private BotDatasetMapper botDatasetMapper;

    @Autowired
    private UserLangChainDataService userLangChainDataService;

    @Autowired
    private MaasUtil maasUtil;

    @Autowired
    private ReleaseManageClientService releaseManageClientService;

    @Autowired
    private AgentRuntimeManagementClient agentRuntimeManagementClient;

    @Autowired
    private ModelService modelService;

    private static final String PUBLISH_API = "publish_api";

    private static final String BOT_API_RUNTIME_PREFIX = "/openapi/v1/agents/";
    private static final String SPARK_OPENAI_COMPLETIONS_URL =
            "https://spark-api-open.xf-yun.com/v1/chat/completions";

    @Override
    public Boolean createApp(CreateAppVo createAppVo) {
        String uid = RequestContextUtil.getUID();

        if (appMstService.exist(createAppVo.getAppName())) {
            throw new BusinessException(ResponseEnum.USER_APP_NAME_REPEAT);
        }

        String appId = tenantService.createApp(uid, createAppVo.getAppName(), createAppVo.getAppDescribe());
        if (StringUtils.isBlank(appId)) {
            throw new BusinessException(ResponseEnum.USER_APP_ID_CREATE_ERROR);
        }
        TenantAuth tenantAuth = tenantService.getAppDetail(appId);
        if (Objects.isNull(tenantAuth)) {
            throw new BusinessException(ResponseEnum.USER_APP_ID_CREATE_ERROR);
        }
        appMstService.insert(uid, appId, createAppVo.getAppName(), createAppVo.getAppDescribe(), tenantAuth.getApiKey(), tenantAuth.getApiSecret());

        return true;
    }

    @Override
    public List<AppListDTO> getAppList() {
        String uid = RequestContextUtil.getUID();
        return appMstService.getAppListByUid(uid)
                .stream()
                .map(appMst -> new AppListDTO(appMst.getAppId(), appMst.getAppName(), appMst.getAppDescribe(),
                        appMst.getAppKey(), appMst.getAppSecret(), appMst.getCreateTime()))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public BotApiInfoDTO createBotApi(CreateBotApiVo createBotApiVo, HttpServletRequest request) {
        String uid = RequestContextUtil.getUID();
        return createBotApi(createBotApiVo, request, uid);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public BotApiInfoDTO createBotApi(CreateBotApiVo createBotApiVo, HttpServletRequest request, String uid) {
        return createBotApi(createBotApiVo, request, uid, SpaceInfoUtil.getSpaceId());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public BotApiInfoDTO createBotApi(CreateBotApiVo createBotApiVo, HttpServletRequest request, String uid, Long spaceId) {
        String uuid = UUID.randomUUID().toString();

        ChatBotBase botBase = chatBotDataService.findOne(uid, createBotApiVo.getBotId(), spaceId);
        AppMst appMst = appMstService.getByAppId(uid, createBotApiVo.getAppId());
        if (Objects.isNull(botBase) || Objects.isNull(appMst)) {
            throw new BusinessException(ResponseEnum.USER_APP_ID_NOT_EXISTE);
        }

        if (!redisUtil.tryLock(PUBLISH_API + uid, 3000, uuid)) {
            throw new BusinessException(ResponseEnum.BOT_API_CREATE_LIMIT_ERROR);
        }
        try {
            List<Integer> workflowVersions = List.of(
                    BotVersionEnum.WORKFLOW.getVersion(), BotVersionEnum.TALK.getVersion());
            if (workflowVersions.contains(botBase.getVersion())) {
                return createMaasApi(uid, appMst, botBase, spaceId, request);
            } else if (BotVersionEnum.BASE_BOT.getVersion().equals(botBase.getVersion())) {
                return createAgentRuntimeApi(uid, appMst, botBase, spaceId);
            } else {
                throw new BusinessException(ResponseEnum.BOT_TYPE_NOT_SUPPORT);
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("PublishApiServiceImpl.createBotApi : create Bot api error, request: {}", createBotApiVo, e);
            throw new BusinessException(ResponseEnum.BOT_API_CREATE_ERROR);
        } finally {
            redisUtil.unlock(PUBLISH_API + uid, uuid);
        }

    }

    @Override
    public BotApiInfoDTO getApiInfo(Long botId) {
        String uid = RequestContextUtil.getUID();
        ChatBotBase botBase = chatBotDataService.findOne(uid, botId);
        if (Objects.isNull(botBase)) {
            throw new BusinessException(ResponseEnum.BOT_NOT_EXISTS);
        }
        ChatBotApi botApi = chatBotApiService.getOneByUidAndBotId(uid, botId);
        if (Objects.isNull(botApi)) {
            return new BotApiInfoDTO();
        }
        AppMst appMst = appMstService.getByAppId(uid, botApi.getAppId());
        if (Objects.isNull(appMst)) {
            throw new BusinessException(ResponseEnum.USER_APP_ID_NOT_EXISTE);
        }
        return BotApiInfoDTO.builder()
                .botId(Math.toIntExact(botId))
                .botName(botBase.getBotName())
                .appName(appMst.getAppName())
                .appId(appMst.getAppId())
                .appKey(appMst.getAppKey())
                .appSecret(appMst.getAppSecret())
                .serviceUrl(publicServiceUrl(botApi.getApiPath()))
                .flowId(botApi.getAssistantId())
                .build();
    }

    private BotApiInfoDTO createMaasApi(
            String uid,
            AppMst appMst,
            ChatBotBase botBase,
            Long spaceId,
            HttpServletRequest request) {
        Integer botId = botBase.getId();
        List<UserLangChainInfo> userLangChainInfoList = userLangChainDataService.findListByBotId(botId);
        if (Objects.isNull(userLangChainInfoList) || userLangChainInfoList.isEmpty()) {
            log.error("----- No assistant protocol found, uid: {}, botId: {}", uid, botId);
            throw new BusinessException(ResponseEnum.BOT_API_CREATE_ERROR);
        }

        UserLangChainInfo userLangChainInfo = userLangChainInfoList.get(0);
        String flowId = userLangChainInfo.getFlowId();
        // Synchronize with Maas service
        String versionName = releaseManageClientService.getVersionNameByBotId(Long.valueOf(botId), spaceId, request);
        releaseManageClientService.releaseBotApi(botId, flowId, versionName, uid, spaceId, request);
        maasUtil.createApi(flowId, appMst.getAppId(), versionName);

        JSONObject snapshot = new JSONObject();
        JSONObject workflow = new JSONObject();
        workflow.put("flow_id", flowId);
        workflow.put("version", versionName);
        snapshot.put("workflow", workflow);
        snapshot.put("source", "console-hub");
        AgentRuntimeManagementClient.RuntimeRelease runtimeRelease =
                agentRuntimeManagementClient.publish(
                        botId.toString(),
                        spaceId.toString(),
                        runtimeVersion(botBase),
                        "workflow",
                        snapshot,
                        appMst.getAppId());

        String apiPath = BOT_API_RUNTIME_PREFIX + botId + "/runs";

        ChatBotApi chatBotApi = ChatBotApi.builder()
                .uid(uid)
                .botId(botId)
                .assistantId(runtimeRelease.releaseId())
                .appId(appMst.getAppId())
                .apiSecret(appMst.getAppSecret())
                .apiKey(appMst.getAppKey())
                .prompt("")
                .pluginId("")
                .embeddingId("")
                .apiPath(apiPath)
                .description(botBase.getBotName())
                .build();

        persistRuntimeApi(chatBotApi, runtimeRelease);

        return BotApiInfoDTO.builder()
                .botId(botId)
                .botName(botBase.getBotName())
                .appName(appMst.getAppName())
                .appId(appMst.getAppId())
                .appKey(appMst.getAppKey())
                .appSecret(appMst.getAppSecret())
                .serviceUrl(publicServiceUrl(apiPath))
                .flowId(runtimeRelease.releaseId())
                .build();
    }

    private BotApiInfoDTO createAgentRuntimeApi(
            String uid, AppMst appMst, ChatBotBase botBase, Long spaceId) {
        rejectUngovernedAgentTools(botBase);
        JSONObject snapshot = new JSONObject();
        snapshot.put("source", "console-hub");
        snapshot.put("agent_request", buildAgentRequest(uid, botBase, spaceId));
        AgentRuntimeManagementClient.RuntimeRelease runtimeRelease =
                agentRuntimeManagementClient.publish(
                        botBase.getId().toString(),
                        spaceId.toString(),
                        runtimeVersion(botBase),
                        "chat",
                        snapshot,
                        appMst.getAppId());

        String apiPath = BOT_API_RUNTIME_PREFIX + botBase.getId() + "/runs";
        ChatBotApi chatBotApi = ChatBotApi.builder()
                .uid(uid)
                .botId(botBase.getId())
                .assistantId(runtimeRelease.releaseId())
                .appId(appMst.getAppId())
                .apiSecret(appMst.getAppSecret())
                .apiKey(appMst.getAppKey())
                .prompt("")
                .pluginId("")
                .embeddingId("")
                .apiPath(apiPath)
                .description(botBase.getBotName())
                .build();
        persistRuntimeApi(chatBotApi, runtimeRelease);

        return BotApiInfoDTO.builder()
                .botId(botBase.getId())
                .botName(botBase.getBotName())
                .appName(appMst.getAppName())
                .appId(appMst.getAppId())
                .appKey(appMst.getAppKey())
                .appSecret(appMst.getAppSecret())
                .serviceUrl(publicServiceUrl(apiPath))
                .flowId(runtimeRelease.releaseId())
                .build();
    }

    private JSONObject buildAgentRequest(String uid, ChatBotBase botBase, Long spaceId) {
        LLMInfoVo model = botBase.getModelId() == null
                ? null
                : modelService.getRuntimeModelDetail(botBase.getModelId(), uid, spaceId);
        String domain = model == null
                ? StringUtils.defaultIfBlank(botBase.getModel(), "generalv3.5")
                : StringUtils.defaultIfBlank(model.getDomain(), model.getServiceId());
        String api = model == null ? SPARK_OPENAI_COMPLETIONS_URL : model.getUrl();
        if (StringUtils.isBlank(api)) {
            throw new BusinessException(ResponseEnum.MODEL_CHECK_FAILED);
        }

        JSONObject modelConfig = new JSONObject();
        modelConfig.put("domain", domain);
        modelConfig.put("api", api);
        modelConfig.put("provider", model == null ? "openai" : model.getProvider());
        if (model != null) {
            modelConfig.put(
                    "credential_ref",
                    new JSONObject()
                            .fluentPut("type", "console_model")
                            .fluentPut("model_id", botBase.getModelId())
                            .fluentPut("owner_uid", uid)
                            .fluentPut("space_id", spaceId));
        }

        JSONObject instruction = new JSONObject();
        instruction.put("reasoning", "");
        instruction.put("answer", StringUtils.defaultString(botBase.getPrompt()));

        JSONObject plugin = new JSONObject();
        plugin.put("tools", List.of());
        plugin.put("mcp_server_ids", List.of());
        plugin.put("mcp_server_urls", List.of());
        plugin.put("workflow_ids", List.of());
        plugin.put("knowledge", List.of());
        plugin.put("skills", List.of());

        JSONObject agentRequest = new JSONObject();
        agentRequest.put("model_config", modelConfig);
        agentRequest.put("instruction", instruction);
        agentRequest.put("plugin", plugin);
        agentRequest.put("max_loop_count", 10);
        return agentRequest;
    }

    private void rejectUngovernedAgentTools(ChatBotBase botBase) {
        if (StringUtils.isNotBlank(botBase.getOpenedTool())
                || StringUtils.isNotBlank(botBase.getMcpServerUrls())
                || StringUtils.isNotBlank(botBase.getSkills())
                || StringUtils.isNotBlank(botBase.getTools())
                || StringUtils.isNotBlank(botBase.getWorkflows())) {
            log.warn(
                    "Rejecting API publish with tools not governed by Agent Runtime, botId={}",
                    botBase.getId());
            throw new BusinessException(ResponseEnum.BOT_API_CREATE_ERROR);
        }
    }

    private void persistRuntimeApi(
            ChatBotApi chatBotApi,
            AgentRuntimeManagementClient.RuntimeRelease runtimeRelease) {
        try {
            chatBotApiService.insertOrUpdate(chatBotApi);
        } catch (RuntimeException persistenceFailure) {
            try {
                agentRuntimeManagementClient.disable(runtimeRelease.releaseId());
            } catch (RuntimeException compensationFailure) {
                persistenceFailure.addSuppressed(compensationFailure);
                log.error(
                        "Agent Runtime persistence compensation failed, releaseId={}",
                        runtimeRelease.releaseId());
            }
            throw persistenceFailure;
        }
    }

    private String runtimeVersion(ChatBotBase botBase) {
        long updated = botBase.getUpdateTime() == null
                ? System.currentTimeMillis()
                : botBase.getUpdateTime()
                        .atZone(java.time.ZoneId.systemDefault())
                        .toInstant()
                        .toEpochMilli();
        return "v" + updated + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    private String publicServiceUrl(String apiPath) {
        String base = StringUtils.removeEnd(
                StringUtils.defaultIfBlank(botApiMaasBaseUrl, botApiCbmBaseUrl), "/");
        return base.endsWith(apiPath) ? base : base + apiPath;
    }
}
