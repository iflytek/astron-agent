package com.iflytek.astron.console.hub.dto.publish;

import io.swagger.v3.oas.annotations.media.Schema;
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
@Schema(description = "create bot api vo")
public class CreateBotApiVo {

    @Schema(description = "Bot ID", example = "123")
    private Long botId;

    @Schema(description = "App Id")
    private String appId;

}
