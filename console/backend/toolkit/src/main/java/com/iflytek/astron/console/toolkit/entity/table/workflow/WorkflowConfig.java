package com.iflytek.astron.console.toolkit.entity.table.workflow;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import lombok.Data;

import java.io.Serializable;
import java.util.Date;

/**
 * Entity class representing the workflow configuration table.
 * <p>
 * This class defines the schema mapping for workflow configurations, including version information,
 * configuration details, and metadata fields.
 * </p>
 *
 * @author your_name
 * @date 2025/10/23
 */
@Data
public class WorkflowConfig implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * Primary key ID (auto-incremented).
     */
    @TableId(type = IdType.AUTO)
    private Long id;

    /**
     * Version name (redundant field).
     */
    private String name;

    /**
     * Version number.
     */
    private String versionNum;

    /**
     * Configuration for the voice agent (stored as JSON string).
     */
    private String config;

    /**
     * Workflow unique identifier.
     */
    private String flowId;

    /**
     * Bot identifier corresponding to the workflow.
     */
    private Integer botId;

    /**
     * Deletion flag:
     * <ul>
     * <li>true (1) - deleted</li>
     * <li>false (0) - not deleted</li>
     * </ul>
     */
    private Boolean deleted;

    /**
     * Record creation time.
     */
    private Date createdTime;

    /**
     * Record last update time.
     */
    private Date updatedTime;
}
