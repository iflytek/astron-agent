package com.iflytek.astron.console.hub.data.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.iflytek.astron.console.hub.data.ReqKnowledgeRecordsDataService;
import com.iflytek.astron.console.hub.entity.ReqKnowledgeRecords;
import com.iflytek.astron.console.hub.mapper.ReqKnowledgeRecordsMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * @author mingsuiyongheng
 */
@Service
@Slf4j
public class ReqKnowledgeRecordsDataServiceImpl implements ReqKnowledgeRecordsDataService {

    @Autowired
    private ReqKnowledgeRecordsMapper reqKnowledgeRecordsMapper;

    @Override
    public ReqKnowledgeRecords create(ReqKnowledgeRecords reqKnowledgeRecords) {
        reqKnowledgeRecordsMapper.insert(reqKnowledgeRecords);
        return reqKnowledgeRecords;
    }

    @Override
    public Map<Long, ReqKnowledgeRecords> findByReqIds(List<Long> reqIds) {
        Map<Long, ReqKnowledgeRecords> resultMap = new HashMap<>();
        if (reqIds == null || reqIds.isEmpty()) {
            return resultMap;
        }

        QueryWrapper<ReqKnowledgeRecords> queryWrapper = new QueryWrapper<>();
        queryWrapper.in("req_id", reqIds);
        List<ReqKnowledgeRecords> records = reqKnowledgeRecordsMapper.selectList(queryWrapper);

        for (ReqKnowledgeRecords record : records) {
            resultMap.put(record.getReqId(), record);
        }

        log.debug("Found {} knowledge records for {} request IDs", records.size(), reqIds.size());
        return resultMap;
    }
}
