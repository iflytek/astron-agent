package com.iflytek.astron.console.hub.service.bot;

import com.iflytek.astron.console.hub.entity.PronunciationPersonConfig;

import java.util.List;
import java.util.Map;

/**
 * Voice service interface for managing TTS (Text-to-Speech) functionality and pronunciation person
 * configurations. Provides methods for obtaining TTS authentication signatures and retrieving
 * available pronunciation persons.
 *
 * @author bowang
 */
public interface VoiceService {

    /**
     * Retrieves TTS (Text-to-Speech) authentication signature information. This method generates and
     * returns the necessary authentication credentials including appId, apiKey, apiSecret, and the
     * authenticated URL for accessing the TTS service.
     *
     * @return Map containing TTS authentication parameters with keys: appId, apiKey, apiSecret, url
     */
    Map<String, String> getTtsSign();

    /**
     * Retrieves a list of available pronunciation person configurations. This method queries and
     * returns all active pronunciation person configurations from XFYUN (iFLYTEK) manufacturer, sorted
     * by their sort order in ascending sequence.
     *
     * @return List of PronunciationPersonConfig objects representing available voice configurations
     */
    List<PronunciationPersonConfig> getPronunciationPerson();
}
