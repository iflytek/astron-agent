package com.iflytek.astron.console.hub.dto.publish.cbm;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CbmBody {

    @JsonProperty("app_id")
    private String appId;

    @JsonProperty("baseAssistant_id")
    private String baseAssistantId;

    @JsonProperty("uid")
    private String uid;

    @JsonProperty("prompt")
    private String prompt;

    @JsonProperty("plugin_id")
    private String pluginId;

    @JsonProperty("embedding_id")
    private String embeddingId;

    @JsonProperty("description")
    private String description;

    @JsonProperty("options")
    private Options options;

    @JsonProperty("history")
    private boolean history;

}
