package com.iflytek.astron.console.hub.service.chat.impl;

import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.dto.chat.*;
import com.iflytek.astron.console.commons.dto.llm.SparkChatRequest;
import com.iflytek.astron.console.commons.service.data.ChatDataService;
import com.iflytek.astron.console.commons.service.data.ChatHistoryService;
import com.iflytek.astron.console.commons.util.I18nUtil;
import com.iflytek.astron.console.hub.data.ReqKnowledgeRecordsDataService;
import com.iflytek.astron.console.hub.entity.ReqKnowledgeRecords;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.logging.log4j.util.Base64Util;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

import java.util.*;
import java.util.stream.Collectors;

/**
 * @author mingsuiyongheng
 */
@Service
@Slf4j
public class ChatHistoryServiceImpl implements ChatHistoryService {

    @Autowired
    private ChatDataService chatDataService;

    @Autowired
    private ReqKnowledgeRecordsDataService reqKnowledgeRecordsDataService;

    public static final int MAX_HISTORY_NUMBERS = 8000;

    /**
     * Get historical message records of system bot
     *
     * @param uid User ID
     * @param chatId Chat room ID
     * @return List of system bot message records
     */
    @Override
    public List<SparkChatRequest.MessageDto> getSystemBotHistory(String uid, Long chatId, Boolean supportDocument) {
        // Get question history
        List<ChatReqModelDto> chatReqModelDtos = chatDataService.getReqModelBotHistoryByChatId(uid, chatId);
        List<SparkChatRequest.MessageDto> messages = new ArrayList<>();
        if (CollectionUtils.isEmpty(chatReqModelDtos)) {
            return messages;
        }
        // Get answer history
        List<Long> reqIds = chatReqModelDtos.stream().map(ChatReqModelDto::getId).collect(Collectors.toList());
        List<ChatRespModelDto> chatRespModelDtos = chatDataService.getChatRespModelBotHistoryByChatId(uid, chatId, reqIds);

        // Group answer history by reqId
        Map<Long, ChatRespModelDto> respMap = new HashMap<>();
        if (!CollectionUtils.isEmpty(chatRespModelDtos)) {
            for (ChatRespModelDto respDto : chatRespModelDtos) {
                respMap.put(respDto.getReqId(), respDto);
            }
        }

        // Get knowledge records to enhance ask content
        Map<Long, ReqKnowledgeRecords> knowledgeRecordsMap = reqKnowledgeRecordsDataService.findByReqIds(reqIds);

        // Merge conversation history in chronological order of questions
        for (int i = chatReqModelDtos.size() - 1; i >= 0; i--) {
            ChatReqModelDto reqDto = chatReqModelDtos.get(i);
            // Add user message with knowledge enhancement
            SparkChatRequest.MessageDto userMessage = new SparkChatRequest.MessageDto();
            userMessage.setRole("user");

            // Enhance ask content with knowledge from reqKnowledgeRecords
            if (supportDocument) {
                String enhancedAsk = enhanceAskWithKnowledgeRecord(reqDto.getMessage(), knowledgeRecordsMap.get(reqDto.getId()));
                userMessage.setContent(enhancedAsk);
            } else {
                userMessage.setContent(reqDto.getMessage());
            }
            messages.add(userMessage);

            // Add corresponding assistant response
            ChatRespModelDto respDto = respMap.get(reqDto.getId());
            if (respDto != null && respDto.getMessage() != null && !respDto.getMessage().trim().isEmpty()) {
                SparkChatRequest.MessageDto assistantMessage = new SparkChatRequest.MessageDto();
                assistantMessage.setRole("assistant");
                assistantMessage.setContent(respDto.getMessage());
                messages.add(assistantMessage);
            }
        }
        return messages;
    }

    /**
     * Get history records for specified user and chat ID
     *
     * @param uid User ID
     * @param chatId Chat ID
     * @param reqList Request model list
     * @return Merged chat history records
     */
    @Override
    public ChatRequestDtoList getHistory(String uid, Long chatId, List<ChatReqModelDto> reqList) {
        if (reqList == null || reqList.isEmpty()) {
            return new ChatRequestDtoList();
        }
        List<Long> reqIdList = reqList.stream().filter(Objects::nonNull).map(ChatReqModelDto::getId).collect(Collectors.toList());
        List<ChatRespModelDto> respList = chatDataService.getChatRespModelBotHistoryByChatId(uid, chatId, reqIdList);
        ChatRequestDtoList chatRecordList = new ChatRequestDtoList();
        int tempLength = 0;

        // Group answer history by reqId
        Map<Long, ChatRespModelDto> respMap = new HashMap<>();
        if (respList != null && !respList.isEmpty()) {
            for (ChatRespModelDto respDto : respList) {
                respMap.put(respDto.getReqId(), respDto);
            }
        }

        // Flush historical sessions to cache, will automatically scroll update to maximum range
        /*** Add question ***/
        for (ChatReqModelDto reqDto : reqList) {
            ChatRespModelDto respDto = respMap.get(reqDto.getId());

            // Skip if no response found for this request
            if (respDto == null) {
                continue;
            }

            // Skip failed or empty exchanges. A request that carries no content (for
            // example an API call rejected for a missing required input) must not be
            // replayed, otherwise the blank message fails validation on every
            // following turn and permanently breaks the chat
            if (StringUtils.isBlank(reqDto.getMessage()) && StringUtils.isBlank(reqDto.getUrl())) {
                continue;
            }
            if (StringUtils.isBlank(respDto.getMessage()) && StringUtils.isBlank(respDto.getContent())) {
                continue;
            }

            // Add answer, history records answer first then question
            String answer = respDto.getMessage();
            int answerLength = answer == null ? 0 : answer.length();
            // If there is data in multimodal content, it means this is a multimodal return, append history in
            // multimodal design format
            if (StringUtils.isNotBlank(respDto.getContent())) {
                // Multimodal concatenation length defaults to 200
                answerLength = 200;
                String url = respDto.getUrl();
                String content = respDto.getContent();
                String type = respDto.getType();
                String dataId = respDto.getDataId();
                int needHis = respDto.getNeedHis();
                if (needHis == 0) {
                    ChatContentMeta contentMeta = new ChatContentMeta(null, content, true, dataId);
                    chatRecordList.getMessages().addFirst(new ChatRequestDto("assistant", url, type, contentMeta));
                } else if (needHis == 2) {
                    // Insert at the first position, the rest automatically shift down
                    chatRecordList.getMessages().addFirst(new ChatRequestDto("assistant", answer));
                    // This is the single round length for image description return set to 800
                    // answerLength = 800;
                }
            } else {
                // Insert at the first position, the rest automatically shift down
                chatRecordList.getMessages().addFirst(new ChatRequestDto("assistant", answer));
            }
            // Historical length concatenation
            tempLength = tempLength + answerLength;
            if (tempLength > MAX_HISTORY_NUMBERS) {
                return chatRecordList;
            }
            /*** Add question ***/
            String ask = reqDto.getMessage();
            int askLength = ask == null ? 0 : ask.length();
            // If the question is an image, set length to 800 to prevent history from exceeding 10 images
            if (StringUtils.isNotBlank(reqDto.getUrl())) {
                askLength = 800;
            }
            tempLength = tempLength + askLength;
            if (tempLength > MAX_HISTORY_NUMBERS) {
                return chatRecordList;
            }

            // If there is data in multimodal content, it means this is multimodal input, append history in
            // multimodal design QQA format
            if (StringUtils.isNotBlank(reqDto.getUrl())) {
                String url = reqDto.getUrl();
                List<ChatModelMeta> metaList = urlToArray(url, ask);
                chatRecordList.getMessages().addFirst(new ChatRequestDto("user", metaList));
            } else {
                chatRecordList.getMessages().addFirst(new ChatRequestDto("user", ask));
            }
        }
        chatRecordList.setLength(tempLength);
        return chatRecordList;
    }

    /**
     * Convert url to large model multimodal protocol content array
     */
    @Override
    public List<ChatModelMeta> urlToArray(String url, String ask) {
        List<ChatModelMeta> metaList = new ArrayList<>();
        // Image address concatenation
        if (StringUtils.isNotBlank(url)) {
            String[] urls = url.split(",");
            // Assemble images
            for (String tempUrl : urls) {
                // Skip if image address is empty
                if (StringUtils.isBlank(tempUrl) || "null".equals(tempUrl)) {
                    continue;
                }
                ChatModelMeta meta = new ChatModelMeta();
                JSONObject jb = new JSONObject();
                jb.put("url", Base64Util.encode(tempUrl));
                meta.setType("image_url");
                meta.setImage_url(jb);
                metaList.add(meta);
            }
        }

        // Text must be placed at the end of the array
        if (StringUtils.isNotBlank(ask)) {
            ChatModelMeta meta = new ChatModelMeta();
            meta.setType("text");
            meta.setText(ask);
            metaList.add(meta);
        }
        return metaList;
    }

    /**
     * Enhance ask content with knowledge from reqKnowledgeRecords
     *
     * @param originalAsk Original ask message
     * @param knowledgeRecord Knowledge record containing stored knowledge
     * @return Enhanced ask content with knowledge wrapped
     */
    private String enhanceAskWithKnowledgeRecord(String originalAsk, ReqKnowledgeRecords knowledgeRecord) {
        if (StringUtils.isBlank(originalAsk)) {
            return originalAsk;
        }

        // If no knowledge record found, return original ask
        if (knowledgeRecord == null || StringUtils.isBlank(knowledgeRecord.getKnowledge())) {
            return originalAsk;
        }

        try {
            // Parse knowledge string (it's stored as a string representation of a list)
            String knowledgeStr = knowledgeRecord.getKnowledge();

            // Build enhanced content with knowledge wrapping
            StringBuilder promptBuilder = new StringBuilder();
            promptBuilder.append(I18nUtil.getMessage("loose.prefix.prompt"));

            // Insert knowledge content into the placeholder
            promptBuilder.insert(promptBuilder.indexOf("[") + 1, knowledgeStr);
            promptBuilder.append(I18nUtil.getMessage("loose.suffix.prompt"));
            promptBuilder.insert(promptBuilder.indexOf("{{") + 2, originalAsk);

            String enhancedContent = promptBuilder.toString();

            log.debug("Enhanced ask with stored knowledge for reqId: {}, original length: {}, enhanced length: {}",
                    knowledgeRecord.getReqId(), originalAsk.length(), enhancedContent.length());

            return enhancedContent;
        } catch (Exception e) {
            log.warn("Failed to enhance ask with stored knowledge for reqId: {}, error: {}",
                    knowledgeRecord.getReqId(), e.getMessage());
            return originalAsk;
        }
    }
}
