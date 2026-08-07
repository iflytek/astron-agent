package com.iflytek.astron.console.hub.enums;

/**
 * Configuration type enumeration for personality settings Used to distinguish between different
 * deployment environments
 */
public enum ConfigTypeEnum {

    /**
     * Debug configuration type - used for development and testing
     */
    DEBUG(0),

    /**
     * Market configuration type - used for production/market deployment
     */
    MARKET(1);

    /**
     * The integer value associated with this configuration type
     */
    private final int value;

    /**
     * Constructor for ConfigTypeEnum
     *
     * @param value the integer value for this configuration type
     */
    ConfigTypeEnum(int value) {
        this.value = value;
    }

    /**
     * Get the integer value of this configuration type
     *
     * @return the integer value
     */
    public int getValue() {
        return value;
    }

    /**
     * Get the ConfigTypeEnum corresponding to the given integer value
     *
     * @param value the integer value to look up
     * @return the corresponding ConfigTypeEnum, or null if not found
     */
    public static ConfigTypeEnum fromValue(int value) {
        for (ConfigTypeEnum type : values()) {
            if (type.value == value) {
                return type;
            }
        }
        return null;
    }
}
