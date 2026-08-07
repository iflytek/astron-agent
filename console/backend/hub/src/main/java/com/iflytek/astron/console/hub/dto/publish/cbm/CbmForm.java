package com.iflytek.astron.console.hub.dto.publish.cbm;

import lombok.Data;

@Data
public class CbmForm {

    private Integer botId;

    // Old version creation requires appId, new version creation only needs keyId
    private String appId;

    private Long publishBindId;

}
