package com.iflytek.astron.console.commons.entity.agentmemory;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("agent_memory_config")
@Schema(name = "AgentMemoryConfig", description = "Agent memory provider configuration")
public class AgentMemoryConfig {

    @TableId(type = IdType.AUTO)
    @Schema(description = "Primary key")
    private Long id;

    @Schema(description = "Bot ID")
    private Integer botId;

    @Schema(description = "User ID")
    private String uid;

    @Schema(description = "Space ID")
    private Long spaceId;

    @Schema(description = "Memory provider")
    private String provider;

    @Schema(description = "Enable status: 0 disabled, 1 enabled")
    private Integer enabled;

    @Schema(description = "Auto-search memories before chat: 0 disabled, 1 enabled")
    private Integer autoSearch;

    @Schema(description = "RSA encrypted provider API key")
    private String apiKeyCiphertext;

    @Schema(description = "Memory search result count")
    private Integer searchTopK;

    @Schema(description = "Minimum relevance score")
    private Double minScore;

    @Schema(description = "Deletion status: 0 not deleted, 1 deleted")
    private Integer isDelete;

    @Schema(description = "Deletion timestamp, 0 means active")
    private Long deleteTime;

    @Schema(description = "Create time")
    private LocalDateTime createTime;

    @Schema(description = "Modify time")
    private LocalDateTime updateTime;
}
