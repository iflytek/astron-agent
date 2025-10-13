package com.iflytek.astron.console.commons.dto.workflow;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * Workflow input type response DTO. Corresponds to the return result of the original interface:
 * getInputsType
 *
 * @author Omuigix
 */
@Data
@Schema(name = "WorkflowInputsResponseDto", description = "Workflow input type response")
public class WorkflowInputsResponseDto {

    @Schema(description = "Input parameter list")
    private List<InputParameter> parameters;

    /**
     * Input parameter definition
     */
    @Data
    @Schema(name = "InputParameter", description = "Input parameter definition")
    public static class InputParameter {
        @Schema(description = "Parameter ID")
        private String id;

        @Schema(description = "Parameter name")
        private String name;

        @Schema(description = "Parameter type")
        private String type;

        @Schema(description = "Whether required")
        private Boolean required;

        @Schema(description = "Parameter description")
        private String description;

        @Schema(description = "Parameter schema definition")
        private Map<String, Object> schema;

        @Schema(description = "Whether delete is disabled")
        private Boolean deleteDisabled;

        @Schema(description = "Name error message")
        private String nameErrMsg;
    }
}
