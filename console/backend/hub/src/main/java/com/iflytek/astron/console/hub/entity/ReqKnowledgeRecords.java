package com.iflytek.astron.console.hub.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

import lombok.Builder;
import lombok.Data;

@Data
@TableName("req_knowledge_records")
@Schema(name = "ReqKnowledgeRecords", description = "Knowledge retrieval result record table")
@Builder
public class ReqKnowledgeRecords {

    @TableId(type = IdType.AUTO)
    private Long id;

    @Schema(description = "User ID")
    private String uid;

    @Schema(description = "Primary key of user question, corresponding to the primary key id of user question table")
    private Long reqId;

    @Schema(description = "Content of user question")
    private String reqMessage;

    @Schema(description = "Retrieved knowledge")
    private String knowledge;

    @Schema(description = "Creation time")
    private LocalDateTime createTime;

    @Schema(description = "Update time")
    private LocalDateTime updateTime;

    @Schema(description = "Chat window id, chat_list primary key")
    private Long chatId;
}
