package com.iflytek.astron.console.toolkit.entity.vo.openapi;

import com.alibaba.fastjson2.JSONObject;
import lombok.Data;

import java.util.List;

/**
 * Response VO for workflow IO transformation query
 */
@Data
public class WorkflowIoTransVo {

    /**
     * List of workflow IO transformation data
     */
    private List<JSONObject> transformations;

    /**
     * Total count of transformations found
     */
    private Integer count;

    /**
     * Application ID that was queried
     */
    private String appId;
}
