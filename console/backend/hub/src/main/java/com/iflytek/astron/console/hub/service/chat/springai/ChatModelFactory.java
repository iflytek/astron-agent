package com.iflytek.astron.console.hub.service.chat.springai;

import com.iflytek.astron.console.toolkit.entity.platform.PlatformAccountConfigDto;
import com.iflytek.astron.console.toolkit.entity.vo.LLMInfoVo;
import com.iflytek.astron.console.toolkit.service.platform.PlatformAccountService;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.springframework.ai.model.tool.ToolCallingManager;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.Map;

/**
 * Builds {@link OpenAiChatModel} instances per request from a bot's model configuration. Custom
 * models use their stored OpenAI-compatible endpoint; Spark (decision A1) uses the iFlytek
 * OpenAI-compatible endpoint with the platform API password.
 */
@Service
@RequiredArgsConstructor
public class ChatModelFactory {

    /** Full Spark OpenAI-compatible completions URL. Confirm against Task 0 Step 1. */
    private static final String SPARK_OPENAI_COMPLETIONS_URL = "https://spark-api-open.xf-yun.com/v1/chat/completions";

    /** Maps stored Spark model names to Spark open-API model ids. Confirm/extend per Task 0 Step 1. */
    private static final Map<String, String> SPARK_MODEL_IDS = Map.of(
            "spark-x1", "x1",
            "spark-max", "generalv3.5",
            "spark-pro", "generalv3",
            "spark-lite", "lite");

    private final PlatformAccountService platformAccountService;

    public record AgentModel(OpenAiChatModel chatModel, String modelId) {}

    /** Custom (non-Spark) OpenAI-compatible model. */
    public AgentModel forCustomModel(LLMInfoVo info) {
        String modelId = info.getDomain();
        return new AgentModel(build(info.getUrl(), info.getApiKey(), modelId), modelId);
    }

    /** Spark via the OpenAI-compatible endpoint (decision A1). */
    public AgentModel forSparkModel(String sparkModelName) {
        PlatformAccountConfigDto.IflytekOpenPlatformConfig config = platformAccountService.requireIflytekOpenPlatform();
        String modelId = sparkModelToOpenAiModelId(sparkModelName);
        return new AgentModel(build(SPARK_OPENAI_COMPLETIONS_URL, config.getSparkApiPassword(), modelId), modelId);
    }

    private OpenAiChatModel build(String fullUrl, String apiKey, String model) {
        URI uri = URI.create(fullUrl);
        String baseUrl = uri.getScheme() + "://" + uri.getAuthority();
        String completionsPath = StringUtils.defaultIfBlank(uri.getRawPath(), "/v1/chat/completions");
        if (StringUtils.isNotBlank(uri.getRawQuery())) {
            completionsPath += "?" + uri.getRawQuery();
        }
        OpenAiApi api = OpenAiApi.builder()
                .baseUrl(baseUrl)
                .completionsPath(completionsPath)
                .apiKey(apiKey)
                .build();
        OpenAiChatOptions options = OpenAiChatOptions.builder().model(model).build();
        return OpenAiChatModel.builder()
                .openAiApi(api)
                .defaultOptions(options)
                .toolCallingManager(new BlankToolCallFilteringToolCallingManager(ToolCallingManager.builder().build()))
                .build();
    }

    static String sparkModelToOpenAiModelId(String sparkModelName) {
        if (StringUtils.isBlank(sparkModelName)) {
            return sparkModelName;
        }
        return SPARK_MODEL_IDS.getOrDefault(sparkModelName, sparkModelName);
    }
}
