package com.iflytek.astron.console.commons.dto.bot;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import cn.hutool.core.util.StrUtil;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Bot query condition encapsulation
 *
 * Best practices: 1. Use strongly typed objects instead of Map<String, Object> 2. Centralize
 * parameter validation and business logic 3. Provide type safety and IDE support 4. Facilitate unit
 * testing and maintenance
 *
 * @author Omuigix
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BotQueryCondition {

    /**
     * User ID (required)
     */
    private String uid;

    /**
     * Space ID (optional)
     */
    private Long spaceId;

    /**
     * Search keyword (optional)
     */
    private String keyword;


    /**
     * Version (optional)
     */
    private Integer version;

    /**
     * Publish status list (optional)
     */
    private List<Integer> publishStatus;

    /**
     * Sort field (required, has default value)
     */
    private String sortField;

    /**
     * Sort direction (required, has default value)
     */
    private String sortDirection;

    // ==================== Business Logic Methods ====================

    /**
     * Supported sort fields whitelist
     */
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "createTime", "updateTime", "applyTime", "publishTime");

    /**
     * Supported sort directions whitelist
     */
    private static final Set<String> ALLOWED_SORT_DIRECTIONS = Set.of("ASC", "DESC");

    /**
     * Validate and get safe sort field. Prevent SQL injection attacks. Convert camelCase naming to
     * database underscore naming
     */
    public String getSafeSortField() {
        String field = sortField;
        if (field == null || !ALLOWED_SORT_FIELDS.contains(field)) {
            field = "createTime"; // Default sort field
        }

        // Convert camelCase naming to underscore naming
        switch (field) {
            case "createTime":
                return "create_time";
            case "updateTime":
                return "update_time";
            case "applyTime":
                return "apply_time";
            case "publishTime":
                return "publish_time";
            default:
                return "create_time"; // Default value
        }
    }

    /**
     * Validate and get safe sort direction
     */
    public String getSafeSortDirection() {
        if (sortDirection == null || !ALLOWED_SORT_DIRECTIONS.contains(sortDirection.toUpperCase())) {
            return "DESC"; // Default sort direction
        }
        return sortDirection.toUpperCase();
    }

    /**
     * Check if there is keyword search
     */
    public boolean hasKeyword() {
        return keyword != null && !keyword.trim().isEmpty();
    }

    /**
     * Check if there is status filtering
     */
    public boolean hasPublishStatus() {
        return publishStatus != null && !publishStatus.isEmpty();
    }

    /**
     * Get publish status list (simplified version, only supports 0=offline, 1=online)
     */
    public List<Integer> getPublishStatus() {
        return publishStatus;
    }

    /**
     * Validate required parameters
     */
    public void validate() {
        if (uid == null) {
            throw new IllegalArgumentException("User ID cannot be null");
        }
        this.sortDirection = getSafeSortDirection();
    }

    /**
     * Convert to query parameters Map
     *
     * @return Query parameters for Mapper queries
     */
    public Map<String, Object> toQueryParams() {
        Map<String, Object> params = new HashMap<>();

        // Basic parameters
        params.put("uid", this.uid);
        params.put("spaceId", this.spaceId);

        // Search conditions
        if (this.keyword != null && !this.keyword.trim().isEmpty()) {
            params.put("keyword", this.keyword.trim());
        }

        // Version filtering
        if (this.version != null) {
            params.put("version", this.version);
        }

        // Publish status handling (simplified version)
        if (this.publishStatus != null && !this.publishStatus.isEmpty()) {
            params.put("publishStatus", this.publishStatus);
        }

        // Sort handling
        if (this.sortField != null) {
            String dbField = getSafeSortField();
            String direction = getSafeSortDirection();

            if ("createTime".equals(dbField)) {
                params.put("sort", "a.create_time " + direction);
            } else if ("updateTime".equals(dbField)) {
                params.put("sort", "a.update_time " + direction);
            }
        }

        return params;
    }

    // ==================== Static Builder Methods ====================

    /**
     * Build query condition from request DTO
     *
     * @param requestDto Request DTO
     * @param currentUid Current user ID
     * @param spaceId Space ID
     * @return Query condition object
     */
    public static BotQueryCondition from(BotListRequestDto requestDto, String currentUid, Long spaceId) {
        return BotQueryCondition.builder()
                .uid(currentUid)
                .spaceId(spaceId)
                .keyword(normalizeKeyword(requestDto.getKeyword()))
                .version(requestDto.getVersion())
                .publishStatus(requestDto.getPublishStatusList())
                .sortField(requestDto.getSortField())
                .sortDirection(requestDto.getSortDirection())
                .build();
    }

    /**
     * Normalize keyword. Handle whitespace characters to avoid invalid queries
     */
    private static String normalizeKeyword(String keyword) {
        if (StrUtil.isBlank(keyword)) {
            return null;
        }
        return keyword.trim();
    }
}
