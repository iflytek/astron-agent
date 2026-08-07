package com.iflytek.astron.console.commons.dto.chat;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

/**
 * @author mingsuiyongheng
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ChatModelMeta {
    // Type: image_url for images, text for text
    private String type;
    // Image content, contains a JSON, like "url":"https:/test.jpg"
    private Object image_url;
    // Text content
    private String text;
}
