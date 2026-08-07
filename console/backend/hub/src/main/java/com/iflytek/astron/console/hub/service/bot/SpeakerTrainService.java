package com.iflytek.astron.console.hub.service.bot;

import com.alibaba.fastjson2.JSONObject;
import org.springframework.web.multipart.MultipartFile;

public interface SpeakerTrainService {

    JSONObject getText();

    String create(MultipartFile file, String language, Integer sex, Long segId, Long spaceId, String uid) throws Exception;

    JSONObject trainStatus(String taskId, Long spaceId, String uid);
}
