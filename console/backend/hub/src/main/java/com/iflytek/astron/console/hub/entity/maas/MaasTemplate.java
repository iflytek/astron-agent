package com.iflytek.astron.console.hub.entity.maas;

import com.alibaba.fastjson2.JSONObject;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;

@Data
public class MaasTemplate {

    public static final String TEMPLATE_SOURCE_OFFICIAL = "OFFICIAL";
    public static final String TEMPLATE_SOURCE_EXPORTED = "EXPORTED";

    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;
    private JSONObject coreAbilities;
    private JSONObject coreScenarios;
    private Byte isAct;
    @JsonSerialize(using = ToStringSerializer.class)
    private Long maasId;
    private String subtitle;
    private String title;
    private Integer botId;
    private String coverUrl;
    @JsonSerialize(using = ToStringSerializer.class)
    private Long groupId;
    private String groupName;
    private String groupNameEn;
    private Integer orderIndex;
    @JsonSerialize(using = ToStringSerializer.class)
    private Long templateId;
    private String templateSource;
    private Boolean deletable;

    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime createTime;

    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime updateTime;
}
