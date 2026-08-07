package com.iflytek.astron.console.toolkit.entity.dto.external;

import lombok.Data;

/**
 * Response DTO for third-party API app info query
 */
@Data
public class AppInfoResponse {

    private String sid;
    private Integer code;
    private String message;
    private AppInfoData data;

    @Data
    public static class AppInfoData {
        private String appid;
        private String name;
        private String source;
        private String desc;
        private String createTime;
    }
}
