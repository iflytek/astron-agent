package com.iflytek.astron.console.hub.dto.user;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * @author yun-zhi-ztl
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TenantAuth {
    @JsonProperty("api_key")
    private String apiKey;
    @JsonProperty("api_secret")
    private String apiSecret;
}
