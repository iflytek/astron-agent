package com.iflytek.astron.console.toolkit.entity.vo;

import lombok.Data;

import java.io.Serializable;

/**
 * ToolBox Export/Import VO
 * Used for plugin export and import functionality
 */
@Data
public class ToolBoxExportVo implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * Tool name
     */
    private String name;

    /**
     * Tool description
     */
    private String description;

    /**
     * Avatar icon
     */
    private String icon;

    /**
     * S3 address prefix
     */
    private String address;

    /**
     * Request endpoint
     */
    private String endPoint;

    /**
     * Request method
     */
    private String method;

    /**
     * Web protocol (JSON string)
     */
    private String webSchema;

    /**
     * Authentication type
     */
    private Integer authType;

    /**
     * Authentication information
     */
    private String authInfo;

    /**
     * Avatar color
     */
    private String avatarColor;
}
