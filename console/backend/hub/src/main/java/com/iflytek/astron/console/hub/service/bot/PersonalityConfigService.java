package com.iflytek.astron.console.hub.service.bot;

import com.iflytek.astron.console.hub.dto.PageResponse;
import com.iflytek.astron.console.commons.dto.bot.PersonalityConfigDto;
import com.iflytek.astron.console.hub.enums.ConfigTypeEnum;
import com.iflytek.astron.console.hub.entity.personality.PersonalityCategory;
import com.iflytek.astron.console.hub.entity.personality.PersonalityRole;

import java.util.List;

/**
 * Service interface for managing personality configurations for chatbots Provides functionality for
 * generating, polishing, and retrieving personality settings
 */
public interface PersonalityConfigService {

    /**
     * Generate AI personality description based on bot information
     *
     * @param botName the name of the bot
     * @param category the category of the bot
     * @param info additional information about the bot
     * @param prompt the prompt template for personality generation
     * @return generated personality description
     */
    String aiGeneratedPersonality(String botName, String category, String info, String prompt);

    /**
     * Polish existing personality description using AI
     *
     * @param botName the name of the bot
     * @param category the category of the bot
     * @param info additional information about the bot
     * @param prompt the prompt template for personality polishing
     * @param personality the existing personality description to polish
     * @return polished personality description
     */
    String aiPolishing(String botName, String category, String info, String prompt, String personality);

    /**
     * Get chat prompt based on bot ID and user type
     *
     * @param botId the ID of the bot
     * @param originalPrompt the original prompt text
     * @param isCreator whether the user is the creator of the bot
     * @return processed chat prompt
     */
    String getChatPrompt(Long botId, String originalPrompt, ConfigTypeEnum configType);

    /**
     * Get chat prompt using personality configuration string
     *
     * @param personalityConfig the personality configuration as string
     * @param originalPrompt the original prompt text
     * @return processed chat prompt
     */
    String getChatPrompt(String personalityConfig, String originalPrompt);


    /**
     * Set personality config as disabled for the specified bot ID Uses DEBUG config type by default
     *
     * @param botId the ID of the bot
     */
    void setDisabledByBotId(Long botId);

    /**
     * Validate personality configuration data
     *
     * @param personalityConfigDto the personality configuration DTO to validate
     * @return true if valid, false otherwise
     */
    boolean checkPersonalityConfig(PersonalityConfigDto personalityConfigDto);

    /**
     * Insert or update personality configuration for a bot Performs upsert operation - inserts if not
     * exists, updates if exists
     *
     * @param personalityConfigDto the personality configuration DTO
     * @param botId the ID of the bot
     * @param configType the configuration type (DEBUG or MARKER)
     */
    void insertOrUpdate(PersonalityConfigDto personalityConfigDto, Long botId, ConfigTypeEnum configType);

    /**
     * Get personality configuration for a bot Retrieves DEBUG type configuration by default
     *
     * @param botId the ID of the bot
     * @return PersonalityConfigDto containing the configuration, or null if not found
     */
    PersonalityConfigDto getPersonalConfig(Long botId);

    /**
     * Get personality categories
     *
     * @return List of PersonalityCategory
     */
    List<PersonalityCategory> getPersonalityCategories();

    /**
     * Get personality roles by category ID
     *
     * @param categoryId the ID of the category
     * @param pageNum the page number
     * @param pageSize the page size
     * @return Page of PersonalityRole with pagination
     */
    PageResponse<PersonalityRole> getPersonalityRoles(Long categoryId, int pageNum, int pageSize);


    /**
     * Copy personality config from source bot to target bot
     *
     * @param sourceBotId the ID of the source bot
     * @param targetBotId the ID of the target bot
     */
    void copyPersonalityConfig(Integer sourceBotId, Integer targetBotId);
}
