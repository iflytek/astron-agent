package com.iflytek.astron.console.hub.service.chat.springai;

import com.iflytek.astron.console.commons.dto.llm.SparkChatRequest;
import com.iflytek.astron.console.commons.entity.chat.ChatReqRecords;
import com.iflytek.astron.console.toolkit.entity.vo.LLMInfoVo;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/** Normalized input for a single standalone-agent chat turn (formal / re-answer / debug). */
@Data
@Builder
public class AgentChatTask {

    /**
     * Non-Spark custom model config; {@code null} means a Spark model (use {@link #sparkModelName}).
     */
    private LLMInfoVo llmInfoVo;

    /** Stored Spark model name, used when {@link #llmInfoVo} is {@code null}. */
    private String sparkModelName;

    private List<SparkChatRequest.MessageDto> messages;
    private String openedTool;
    private String mcpServerUrls;
    private String userId;
    private Long chatId;

    /** {@code null} for debug turns (no persistence). */
    private ChatReqRecords chatReqRecords;

    private boolean edit;
    private boolean debug;
}
