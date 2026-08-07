package com.iflytek.astron.console.commons.dto.chat;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * @author mingsuiyongheng
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ChatListDelRequest {

    private Long chatListId;

    private Integer changeSticky;

}
