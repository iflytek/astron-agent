package com.iflytek.astron.console.hub.service.chat.impl;

import com.iflytek.astron.console.commons.dto.chat.ChatRespModelDto;
import com.iflytek.astron.console.commons.entity.chat.ChatTraceSource;
import com.iflytek.astron.console.hub.service.chat.TraceToSourceService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * @author mingsuiyongheng
 */
@Service
@Slf4j
public class TraceToSourceServiceImpl implements TraceToSourceService {

    /**
     * Add trace information to response
     *
     * @param respList Response list where each element will have trace information attached
     * @param traceList Trace source list used to get trace content and type
     */
    @Override
    public void respAddTrace(List<ChatRespModelDto> respList, List<ChatTraceSource> traceList) {
        // Iterate through responses, supplement traceability data based on reqId
        for (ChatRespModelDto dto : respList) {
            for (ChatTraceSource chatTraceSource : traceList) {
                if (chatTraceSource == null) {
                    continue;
                }
                dto.setTraceSource(chatTraceSource.getContent());
                dto.setSourceType(chatTraceSource.getType());
            }
        }
    }
}
