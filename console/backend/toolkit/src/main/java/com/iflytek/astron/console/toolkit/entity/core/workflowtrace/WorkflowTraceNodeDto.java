package com.iflytek.astron.console.toolkit.entity.core.workflowtrace;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Data
public class WorkflowTraceNodeDto {
    private String id;

    @JsonAlias("node_id")
    private String nodeId;

    @JsonAlias("node_name")
    private String nodeName;

    @JsonAlias("node_type")
    private String nodeType;

    @JsonAlias("next_log_ids")
    private List<String> nextLogIds = new ArrayList<>();

    @JsonAlias("start_time")
    private Long startTime;

    @JsonAlias("end_time")
    private Long endTime;

    private Integer duration = 0;

    @JsonAlias("first_frame_duration")
    private Integer firstFrameDuration = -1;

    private String status;

    @JsonAlias("raw_status")
    private Map<String, Object> rawStatus;

    private WorkflowTraceUsageDto usage = new WorkflowTraceUsageDto();

    private Map<String, Object> input;

    private Map<String, Object> config;

    private Map<String, Object> output;

    private List<String> logs = new ArrayList<>();
}
