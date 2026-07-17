package com.iflytek.astron.console.hub.service.chat.springai;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.AssistantMessage.ToolCall;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.model.tool.ToolCallingChatOptions;
import org.springframework.ai.model.tool.ToolCallingManager;
import org.springframework.ai.model.tool.ToolExecutionResult;
import org.springframework.ai.tool.definition.ToolDefinition;

import java.util.ArrayList;
import java.util.List;

/**
 * Wraps a {@link ToolCallingManager} to drop tool calls whose function name is blank before they
 * are executed. Some OpenAI-compatible providers (e.g. iFlytek Spark) stream a spurious empty-name
 * tool_call; without this, Spring AI's resolver throws "toolName cannot be null or empty" and
 * aborts the whole turn. Standard providers (e.g. deepseek) are unaffected since they never emit
 * blank names.
 */
@Slf4j
public class BlankToolCallFilteringToolCallingManager implements ToolCallingManager {

    private final ToolCallingManager delegate;

    public BlankToolCallFilteringToolCallingManager(ToolCallingManager delegate) {
        this.delegate = delegate;
    }

    @Override
    public List<ToolDefinition> resolveToolDefinitions(ToolCallingChatOptions chatOptions) {
        return delegate.resolveToolDefinitions(chatOptions);
    }

    @Override
    public ToolExecutionResult executeToolCalls(Prompt prompt, ChatResponse chatResponse) {
        return delegate.executeToolCalls(prompt, stripBlankToolCalls(chatResponse));
    }

    private ChatResponse stripBlankToolCalls(ChatResponse chatResponse) {
        if (chatResponse == null) {
            return null;
        }
        boolean changed = false;
        List<Generation> generations = new ArrayList<>();
        for (Generation generation : chatResponse.getResults()) {
            AssistantMessage message = generation.getOutput();
            if (message != null && message.hasToolCalls()) {
                List<ToolCall> valid = new ArrayList<>();
                for (ToolCall call : message.getToolCalls()) {
                    if (StringUtils.isNotBlank(call.name())) {
                        valid.add(call);
                    } else {
                        log.warn("Dropping tool call with blank name (provider sent a malformed tool_call)");
                    }
                }
                if (valid.size() != message.getToolCalls().size()) {
                    changed = true;
                    String text = message.getText();
                    AssistantMessage filtered = AssistantMessage.builder()
                            .content(text == null ? "" : text)
                            .properties(message.getMetadata())
                            .toolCalls(valid)
                            .media(message.getMedia())
                            .build();
                    generations.add(new Generation(filtered, generation.getMetadata()));
                    continue;
                }
            }
            generations.add(generation);
        }
        return changed ? new ChatResponse(generations, chatResponse.getMetadata()) : chatResponse;
    }
}
