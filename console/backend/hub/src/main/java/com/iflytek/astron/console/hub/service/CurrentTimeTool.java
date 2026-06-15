package com.iflytek.astron.console.hub.service;

import com.alibaba.fastjson2.JSONObject;
import org.apache.commons.lang3.StringUtils;

import java.time.DateTimeException;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

public final class CurrentTimeTool {

    static final String TOOL_NAME = "current_time";
    static final String DEFAULT_TIMEZONE = "Asia/Shanghai";

    private CurrentTimeTool() {}

    public static String execute(String requestedTimezone) {
        ZoneId zoneId = resolveZoneId(requestedTimezone);
        ZonedDateTime now = ZonedDateTime.now(zoneId);
        JSONObject result = new JSONObject();
        result.put("timezone", zoneId.getId());
        result.put("date", now.toLocalDate().toString());
        result.put("time", now.toLocalTime().format(DateTimeFormatter.ofPattern("HH:mm:ss")));
        result.put("weekday", now.getDayOfWeek().getDisplayName(java.time.format.TextStyle.FULL, Locale.ENGLISH));
        result.put("weekday_zh", now.getDayOfWeek().getDisplayName(java.time.format.TextStyle.FULL, Locale.CHINA));
        result.put("iso", now.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME));
        return result.toJSONString();
    }

    private static ZoneId resolveZoneId(String requestedTimezone) {
        String timezone = StringUtils.defaultIfBlank(requestedTimezone, DEFAULT_TIMEZONE);
        try {
            return ZoneId.of(timezone);
        } catch (DateTimeException e) {
            return ZoneId.of(DEFAULT_TIMEZONE);
        }
    }
}
