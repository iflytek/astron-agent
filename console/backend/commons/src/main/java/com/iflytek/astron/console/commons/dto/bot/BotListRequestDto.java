package com.iflytek.astron.console.commons.dto.bot;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import com.fasterxml.jackson.annotation.JsonIgnore;

/**
 * Bot list query request DTO corresponding to BotMarketForm in legacy code
 *
 * @author Omuigix
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(
        description = "Bot list query request DTO",
        name = "BotListRequestDto",
        title = "Bot list query parameters")
public class BotListRequestDto {

    /**
     * Page number (starting from 1)
     */
    @Schema(
            description = "Page number, starting from 1",
            example = "1",
            defaultValue = "1",
            minimum = "1",
            required = false)
    @Min(value = 1, message = "Page number must be greater than 0")
    @Builder.Default
    private Integer page = 1;

    /**
     * Page size
     */
    @Schema(
            description = "Number of records per page, maximum 200",
            example = "10",
            defaultValue = "10",
            minimum = "1",
            maximum = "200",
            required = false)
    @Min(value = 1, message = "Page size must be greater than 0")
    @Max(value = 200, message = "Page size cannot exceed 200")
    @Builder.Default
    private Integer size = 10;

    /**
     * Search keyword (bot name)
     */
    @Schema(
            description = "Search keyword, supports fuzzy matching of bot name and description",
            example = "Customer Service Bot",
            maxLength = 100,
            required = false)
    @Size(max = 100, message = "Keyword length cannot exceed 100")
    private String keyword;


    /**
     * Publish status filter (comma-separated)
     * <ul>
     * <li>0 = Offline</li>
     * <li>1 = Online</li>
     * </ul>
     * Supported formats: "0" or "1" or "0,1"
     */
    @Schema(
            description = "Publish status filter, comma-separated multiple statuses. Example: \"0,1\" means query both offline and online bots. Status values: 0=Offline, 1=Online",
            example = "0,1",
            required = false)
    private String publishStatus;

    /**
     * Version filter
     * <ul>
     * <li>1 = Instruction-based bot version</li>
     * <li>3 = Workflow-based bot version</li>
     * <li>null = Query all versions</li>
     * </ul>
     */
    @Schema(
            description = "Version filter: 1=Instruction-based bot version, 3=Workflow-based bot version, omit to query all",
            example = "1",
            allowableValues = {"1", "3"},
            required = false)
    private Integer version;

    /**
     * Sort field
     * <ul>
     * <li>createTime = Sort by creation time</li>
     * <li>updateTime = Sort by update time</li>
     * </ul>
     */
    @Schema(
            description = "Sort field: createTime=Sort by creation time, updateTime=Sort by update time",
            example = "createTime",
            defaultValue = "createTime",
            allowableValues = {"createTime", "updateTime"},
            required = false)
    @Builder.Default
    private String sortField = "createTime";

    /**
     * Sort direction
     * <ul>
     * <li>ASC = Ascending order</li>
     * <li>DESC = Descending order</li>
     * </ul>
     */
    @Schema(
            description = "Sort direction: ASC=Ascending order, DESC=Descending order",
            example = "DESC",
            defaultValue = "DESC",
            allowableValues = {"ASC", "DESC"},
            required = false)
    @Builder.Default
    private String sortDirection = "DESC";

    /**
     * Parse the release status string into a list of integers
     *
     * Supported formats: - "1" -> [1] - "1,2" -> [1, 2] - "1,2,3" -> [1, 2, 3] - null or empty string
     * -> []
     *
     * Note: This method is only used for internal logic and will not appear in the API documentation.
     *
     * @return Parsed status list
     */
    @JsonIgnore
    public List<Integer> getPublishStatusList() {
        if (publishStatus == null || publishStatus.trim().isEmpty()) {
            return new ArrayList<>();
        }

        try {
            return Arrays.stream(publishStatus.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .map(Integer::parseInt)
                    .collect(Collectors.toList());
        } catch (NumberFormatException e) {
            // Return an empty list when parsing fails to avoid throwing an exception
            return new ArrayList<>();
        }
    }

}
