package com.iflytek.astron.console.hub.dto.publish.prepare;

import lombok.Data;

/**
 * Base prepare data DTO
 *
 * @author Omuigix
 */
@Data
public abstract class BasePrepareDto {

    /**
     * Publish type (market, mcp, feishu, api)
     */
    private String publishType;

    /**
     * Success flag
     */
    private Boolean success = true;

    /**
     * Error message if any
     */
    private String errorMessage;
}
