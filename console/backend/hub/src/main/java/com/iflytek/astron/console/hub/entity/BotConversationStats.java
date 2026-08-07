package com.iflytek.astron.console.hub.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Bot Conversation Statistics Entity Corresponds to bot_conversation_stats table
 *
 * @author Omuigix
 */
@Data
@TableName("bot_conversation_stats")
public class BotConversationStats {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /**
     * User ID
     */
    private String uid;

    /**
     * Space ID, NULL for personal agents
     */
    private Long spaceId;

    /**
     * Agent ID
     */
    private Integer botId;

    /**
     * Conversation ID
     */
    private Long chatId;

    /**
     * Session identifier
     */
    private String sid;

    /**
     * Token count consumed in this conversation
     */
    private Integer tokenConsumed;

    /**
     * Conversation date
     */
    private LocalDate conversationDate;

    /**
     * Creation time
     */
    private LocalDateTime createTime;

    /**
     * Whether deleted: 0=not deleted, 1=deleted
     */
    private Integer isDelete;

    /**
     * Builder pattern for creating instances
     */
    public static Builder createBuilder() {
        return new Builder();
    }

    public static class Builder {
        private final BotConversationStats instance = new BotConversationStats();

        public Builder uid(String uid) {
            instance.uid = uid;
            return this;
        }

        public Builder spaceId(Long spaceId) {
            instance.spaceId = spaceId;
            return this;
        }

        public Builder botId(Integer botId) {
            instance.botId = botId;
            return this;
        }

        public Builder chatId(Long chatId) {
            instance.chatId = chatId;
            return this;
        }

        public Builder sid(String sid) {
            instance.sid = sid;
            return this;
        }

        public Builder tokenConsumed(Integer tokenConsumed) {
            instance.tokenConsumed = tokenConsumed;
            return this;
        }

        public Builder conversationDate(LocalDate conversationDate) {
            instance.conversationDate = conversationDate;
            return this;
        }

        public Builder createTime(LocalDateTime createTime) {
            instance.createTime = createTime;
            return this;
        }

        public Builder isDelete(Integer isDelete) {
            instance.isDelete = isDelete;
            return this;
        }

        public BotConversationStats build() {
            if (instance.conversationDate == null) {
                instance.conversationDate = LocalDate.now();
            }
            if (instance.createTime == null) {
                instance.createTime = LocalDateTime.now();
            }
            if (instance.isDelete == null) {
                instance.isDelete = 0;
            }
            if (instance.tokenConsumed == null) {
                instance.tokenConsumed = 0;
            }
            return instance;
        }
    }
}
