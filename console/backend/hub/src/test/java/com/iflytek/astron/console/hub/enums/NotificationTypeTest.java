package com.iflytek.astron.console.hub.enums;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * NotificationType enum unit test - Test basic enum functionality and code mapping
 */
class NotificationTypeTest {

    @Test
    void testEnumValues() {
        NotificationType[] types = NotificationType.values();
        assertEquals(4, types.length);

        assertTrue(containsType(types, NotificationType.PERSONAL));
        assertTrue(containsType(types, NotificationType.BROADCAST));
        assertTrue(containsType(types, NotificationType.SYSTEM));
        assertTrue(containsType(types, NotificationType.PROMOTION));
    }

    @Test
    void testEnumCodeValues() {
        assertEquals("PERSONAL", NotificationType.PERSONAL.getCode());
        assertEquals("BROADCAST", NotificationType.BROADCAST.getCode());
        assertEquals("SYSTEM", NotificationType.SYSTEM.getCode());
        assertEquals("PROMOTION", NotificationType.PROMOTION.getCode());
    }

    @Test
    void testEnumDescriptions() {
        assertEquals("Personal message", NotificationType.PERSONAL.getDescription());
        assertEquals("Broadcast message", NotificationType.BROADCAST.getDescription());
        assertEquals("System notification", NotificationType.SYSTEM.getDescription());
        assertEquals("Promotion message", NotificationType.PROMOTION.getDescription());
    }

    @Test
    void testFromCode_ValidCodes() {
        assertEquals(NotificationType.PERSONAL, NotificationType.fromCode("PERSONAL"));
        assertEquals(NotificationType.BROADCAST, NotificationType.fromCode("BROADCAST"));
        assertEquals(NotificationType.SYSTEM, NotificationType.fromCode("SYSTEM"));
        assertEquals(NotificationType.PROMOTION, NotificationType.fromCode("PROMOTION"));
    }

    @Test
    void testFromCode_InvalidCode() {
        assertNull(NotificationType.fromCode("INVALID"));
        assertNull(NotificationType.fromCode("invalid"));
        assertNull(NotificationType.fromCode(""));
        assertNull(NotificationType.fromCode("personal")); // Case-sensitive
    }

    @Test
    void testFromCode_NullCode() {
        assertNull(NotificationType.fromCode(null));
    }

    @Test
    void testEnumName() {
        // Test enum constant name (for MyBatis default mapping)
        assertEquals("PERSONAL", NotificationType.PERSONAL.name());
        assertEquals("BROADCAST", NotificationType.BROADCAST.name());
        assertEquals("SYSTEM", NotificationType.SYSTEM.name());
        assertEquals("PROMOTION", NotificationType.PROMOTION.name());
    }

    @Test
    void testCodeEqualsName() {
        // Verify code value matches enum constant name (ensure MyBatis mapping is correct)
        for (NotificationType type : NotificationType.values()) {
            assertEquals(type.name(), type.getCode(),
                    "Enum " + type.name() + " code value should match constant name");
        }
    }

    @Test
    void testValueOf() {
        // Test valueOf method (MyBatis may use)
        assertEquals(NotificationType.PERSONAL, NotificationType.valueOf("PERSONAL"));
        assertEquals(NotificationType.BROADCAST, NotificationType.valueOf("BROADCAST"));
        assertEquals(NotificationType.SYSTEM, NotificationType.valueOf("SYSTEM"));
        assertEquals(NotificationType.PROMOTION, NotificationType.valueOf("PROMOTION"));
    }

    @Test
    void testValueOf_InvalidValue() {
        assertThrows(IllegalArgumentException.class,
                () -> NotificationType.valueOf("INVALID"));
        assertThrows(IllegalArgumentException.class,
                () -> NotificationType.valueOf("personal"));
    }

    @Test
    void testEnumOrdinal() {
        // Test enum ordinal (if using EnumOrdinalTypeHandler)
        assertEquals(0, NotificationType.PERSONAL.ordinal());
        assertEquals(1, NotificationType.BROADCAST.ordinal());
        assertEquals(2, NotificationType.SYSTEM.ordinal());
        assertEquals(3, NotificationType.PROMOTION.ordinal());
    }

    @Test
    void testEnumEquality() {
        NotificationType type1 = NotificationType.PERSONAL;
        NotificationType type2 = NotificationType.valueOf("PERSONAL");
        NotificationType type3 = NotificationType.fromCode("PERSONAL");

        assertEquals(type1, type2);
        assertEquals(type1, type3);
        assertEquals(type2, type3);

        // Test == comparison
        assertSame(type1, type2);
        // fromCode returns the one found by iteration, should still be the same instance
        assertSame(type1, type3);
    }

    @Test
    void testEnumToString() {
        // Default toString returns enum constant name
        assertEquals("PERSONAL", NotificationType.PERSONAL.toString());
        assertEquals("BROADCAST", NotificationType.BROADCAST.toString());
        assertEquals("SYSTEM", NotificationType.SYSTEM.toString());
        assertEquals("PROMOTION", NotificationType.PROMOTION.toString());
    }

    @Test
    void testMybatisCompatibility() {
        // Simulate possible MyBatis conversion scenarios

        // Scenario 1: Database value to enum (using code)
        String dbValue = "PERSONAL";
        NotificationType fromDb = NotificationType.fromCode(dbValue);
        assertEquals(NotificationType.PERSONAL, fromDb);

        // Scenario 2: Enum to database value (using name)
        String toDb = NotificationType.PERSONAL.name();
        assertEquals("PERSONAL", toDb);

        // Scenario 3: Verify bidirectional conversion consistency
        for (NotificationType type : NotificationType.values()) {
            String code = type.getCode();
            NotificationType converted = NotificationType.fromCode(code);
            assertEquals(type, converted);

            String name = type.name();
            NotificationType fromName = NotificationType.valueOf(name);
            assertEquals(type, fromName);
        }
    }

    private boolean containsType(NotificationType[] types, NotificationType target) {
        for (NotificationType type : types) {
            if (type == target) {
                return true;
            }
        }
        return false;
    }
}
