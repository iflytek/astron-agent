package com.iflytek.astron.console.hub.data;

import com.iflytek.astron.console.hub.entity.ReqKnowledgeRecords;

import java.util.List;
import java.util.Map;

/**
 * @author mingsuiyongheng
 */
public interface ReqKnowledgeRecordsDataService {

    ReqKnowledgeRecords create(ReqKnowledgeRecords reqKnowledgeRecords);

    /**
     * Batch get knowledge records by request IDs
     *
     * @param reqIds List of request IDs
     * @return Map of reqId to ReqKnowledgeRecords
     */
    Map<Long, ReqKnowledgeRecords> findByReqIds(List<Long> reqIds);
}
