package com.iflytek.astron.console.commons.dto.bot;

import lombok.Data;

/**
 * Data Transfer Object for personality configuration Used to transfer personality settings between
 * layers
 */
@Data
public class PersonalityConfigDto {

    /**
     * Personality description text for the bot
     */
    private String personality;

    /**
     * Scene category type
     */
    private Integer sceneType;

    /**
     * Scene information details
     */
    private String sceneInfo;

}
