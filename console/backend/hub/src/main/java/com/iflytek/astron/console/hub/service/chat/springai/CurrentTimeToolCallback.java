package com.iflytek.astron.console.hub.service.chat.springai;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.hub.service.CurrentTimeTool;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.definition.ToolDefinition;

/** Spring AI tool wrapping {@link CurrentTimeTool}. */
@Slf4j
public class CurrentTimeToolCallback implements ToolCallback {

    private static final String INPUT_SCHEMA = """
            {"type":"object","properties":{"timezone":{"type":"string",\
            "description":"IANA timezone name. Defaults to Asia/Shanghai."}},"required":[]}""";

    @Override
    public ToolDefinition getToolDefinition() {
        return ToolDefinition.builder()
                .name("current_time")
                .description("Get the current date, time, weekday, timezone, and ISO timestamp.")
                .inputSchema(INPUT_SCHEMA)
                .build();
    }

    @Override
    public String call(String toolInput) {
        String timezone = null;
        if (StringUtils.isNotBlank(toolInput)) {
            try {
                JSONObject args = JSON.parseObject(toolInput);
                if (args != null) {
                    timezone = args.getString("timezone");
                }
            } catch (Exception e) {
                log.warn("Failed to parse current_time tool input as JSON: {}", toolInput);
            }
        }
        log.info("current_time tool invoked, timezone={}", timezone);
        return CurrentTimeTool.execute(timezone);
    }
}
