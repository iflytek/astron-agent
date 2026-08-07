package com.iflytek.astron.console.hub.dto.publish;

import com.iflytek.astron.console.hub.dto.publish.prepare.BasePrepareDto;
import lombok.Data;

/**
 * Unified prepare response DTO for all publish types
 *
 * @author Omuigix
 */
@Data
public class UnifiedPrepareDto {

    /**
     * Success flag
     */
    private Boolean success = true;

    /**
     * Error message if any
     */
    private String errorMessage;

    /**
     * Prepare data specific to the publish type Will be one of: MarketPrepareDto, McpPrepareDto,
     * FeishuPrepareDto, ApiPrepareDto
     */
    private BasePrepareDto data;
}
