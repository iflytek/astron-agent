package com.iflytek.astron.console.toolkit.entity.enumVo;

import java.util.Arrays;

/**
 * Enum representing mapping between system varType and JSON Schema type.
 *
 * <p>
 * Provides lookup and fallback logic.
 * </p>
 */
public enum VarType {

    // --- String-like types ---
    STR("Str", "string"),
    PATH("PATH", "string"),
    DIRPATH("DIRPATH", "string"),
    DATE("Date", "string"),
    PASSWORD("Password", "string"),

    // --- Numeric types ---
    FLOAT("Float", "number"),
    INT("Int", "integer"),

    // --- Unknown/others ---
    UNKNOWN(null, "string");

    private final String code;
    private final String jsonType;

    VarType(String code, String jsonType) {
        this.code = code;
        this.jsonType = jsonType;
    }

    public String getCode() {
        return code;
    }

    public String getJsonType() {
        return jsonType;
    }

    /**
     * Lookup by varType string (case-sensitive). If not found, returns {@link #UNKNOWN}.
     *
     * @param code varType string
     * @return VarType enum
     */
    public static VarType fromCode(String code) {
        if (code == null || code.isBlank()) {
            return UNKNOWN;
        }
        return Arrays.stream(values())
                .filter(v -> code.equals(v.code))
                .findFirst()
                .orElse(UNKNOWN);
    }
}
