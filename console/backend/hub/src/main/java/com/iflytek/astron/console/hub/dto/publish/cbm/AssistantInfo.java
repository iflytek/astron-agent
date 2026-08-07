package com.iflytek.astron.console.hub.dto.publish.cbm;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;

import java.util.Date;

@Data
public class AssistantInfo {

    @JsonProperty("assistant_id")
    private String assistantId;

    @JsonProperty("prompt")
    private String prompt;

    @JsonProperty("plugin_id")
    private String pluginId;

    @JsonProperty("embedding_id")
    private String embeddingId;

    @JsonProperty("api_path")
    private String apiPath;

    @JsonProperty("description")
    private String description;

    @JsonProperty("history")
    private Boolean history;

    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    @JsonProperty("create_time")
    private Date createTime;

    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    @JsonProperty("update_time")
    private Date updateTime;

}
