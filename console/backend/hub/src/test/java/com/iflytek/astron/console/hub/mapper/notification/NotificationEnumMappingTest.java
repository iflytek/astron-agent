package com.iflytek.astron.console.hub.mapper.notification;

import com.iflytek.astron.console.hub.dto.notification.NotificationDto;
import com.iflytek.astron.console.hub.enums.NotificationType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit test specifically for NotificationType enum mapping compatibility - Verify MyBatis enum
 * mapping correctness without actual database connection
 */
class NotificationEnumMappingTest {

    @Test
    @DisplayName("Verify enum constant name and code value consistency (MyBatis mapping key)")
    void testEnumNameAndCodeConsistency() {
        for (NotificationType type : NotificationType.values()) {
            assertEquals(type.name(), type.getCode(),
                    String.format("Enum %s name() and getCode() must be consistent to ensure MyBatis correct mapping", type.name()));
        }
    }

    @Test
    @DisplayName("Verify MyBatis valueOf mapping compatibility")
    void testMybatisValueOfCompatibility() {
        // MyBatis will use valueOf(String) method during deserialization
        String[] dbStringValues = {"PERSONAL", "BROADCAST", "SYSTEM", "PROMOTION"};

        for (String dbValue : dbStringValues) {
            // Simulate MyBatis enum conversion process
            NotificationType enumValue = NotificationType.valueOf(dbValue);

            assertNotNull(enumValue);
            assertEquals(dbValue, enumValue.name());
            assertEquals(dbValue, enumValue.getCode());
        }
    }

    @Test
    @DisplayName("Verify MyBatis name() serialization compatibility")
    void testMybatisNameSerializationCompatibility() {
        // MyBatis will use name() method during serialization
        for (NotificationType type : NotificationType.values()) {
            String serializedValue = type.name();

            // Verify serialized value can be correctly deserialized
            NotificationType deserializedEnum = NotificationType.valueOf(serializedValue);
            assertEquals(type, deserializedEnum);

            // Verify consistency with code value
            assertEquals(type.getCode(), serializedValue);
        }
    }

    @Test
    @DisplayName("Verify fromCode method database compatibility")
    void testFromCodeDatabaseCompatibility() {
        // Simulate string value queried from database
        String[] potentialDbValues = {"PERSONAL", "BROADCAST", "SYSTEM", "PROMOTION",
                "personal", "broadcast", "invalid", null, ""};

        for (String dbValue : potentialDbValues) {
            NotificationType result = NotificationType.fromCode(dbValue);

            if (Arrays.asList("PERSONAL", "BROADCAST", "SYSTEM", "PROMOTION").contains(dbValue)) {
                assertNotNull(result, "Valid database value " + dbValue + " should return corresponding enum");
                assertEquals(dbValue, result.getCode());
            } else {
                assertNull(result, "Invalid database value " + dbValue + " should return null");
            }
        }
    }

    @Test
    @DisplayName("Verify NotificationDto type grouping functionality enum compatibility")
    void testNotificationDtoTypeGroupingCompatibility() {
        // Create mock NotificationDto list
        List<NotificationDto> notifications = createMockNotificationDtos();

        // Use Stream API to group by type (simulating NotificationPageResponse logic)
        Map<NotificationType, List<NotificationDto>> groupedByType = notifications.stream()
                .collect(Collectors.groupingBy(NotificationDto::getType));

        // Verify grouping result
        assertEquals(4, groupedByType.size(), "Should have 4 different notification types");

        for (NotificationType type : NotificationType.values()) {
            assertTrue(groupedByType.containsKey(type),
                    "Grouping result should contain " + type.name() + " type");

            List<NotificationDto> typeNotifications = groupedByType.get(type);
            assertFalse(typeNotifications.isEmpty());

            // Verify all notifications in the group are of the same type
            typeNotifications.forEach(dto -> assertEquals(type, dto.getType(), "Notification types in the group should be consistent"));
        }
    }

    @Test
    @DisplayName("Verify null type handling compatibility")
    void testNullTypeHandlingCompatibility() {
        // Create notification with null type
        NotificationDto nullTypeDto = new NotificationDto();
        nullTypeDto.setId(999L);
        nullTypeDto.setType(null);
        nullTypeDto.setTitle("空类型通知");

        List<NotificationDto> notifications = createMockNotificationDtos();
        notifications.add(nullTypeDto);

        // Test null type handling during grouping (using the same logic as NotificationPageResponse)
        Map<NotificationType, List<NotificationDto>> groupedByType = notifications.stream()
                .collect(Collectors.groupingBy(dto -> dto.getType() != null ? dto.getType() : NotificationType.SYSTEM));

        // Verify null type is mapped to SYSTEM type
        assertTrue(groupedByType.containsKey(NotificationType.SYSTEM), "Should contain SYSTEM type grouping");
        List<NotificationDto> systemNotifications = groupedByType.get(NotificationType.SYSTEM);
        assertTrue(systemNotifications.size() >= 1, "SYSTEM type grouping should have at least one element");

        // Verify notifications containing null type
        boolean hasNullTypeNotification = systemNotifications.stream()
                .anyMatch(dto -> "空类型通知".equals(dto.getTitle()));
        assertTrue(hasNullTypeNotification, "Should contain notification with title 'Empty Type Notification'");
    }

    @Test
    @DisplayName("Verify enum ordinal value stability")
    void testEnumOrdinalStability() {
        // Verify enum ordinal value (if using EnumOrdinalTypeHandler)
        assertEquals(0, NotificationType.PERSONAL.ordinal());
        assertEquals(1, NotificationType.BROADCAST.ordinal());
        assertEquals(2, NotificationType.SYSTEM.ordinal());
        assertEquals(3, NotificationType.PROMOTION.ordinal());

        // Warning: ordinal value should not be used for persistence as adding new enum values will change
        // ordinals
        // This test is mainly to ensure the order of enum values remains stable
    }

    @Test
    @DisplayName("模拟 MyBatis TypeHandler 转换过程")
    void testMybatisTypeHandlerSimulation() {
        for (NotificationType type : NotificationType.values()) {
            // Simulate conversion when MyBatis writes to database (enum -> string)
            String dbValue = type.name(); // 默认 EnumTypeHandler 使用 name()

            // Simulate conversion when MyBatis reads from database (string -> enum)
            NotificationType reconstructedEnum = NotificationType.valueOf(dbValue);

            // Verify correctness of round-trip conversion
            assertEquals(type, reconstructedEnum);
            assertEquals(type.getCode(), dbValue);
            assertEquals(type.name(), dbValue);
        }
    }

    /**
     * Create mock NotificationDto list for testing
     */
    private List<NotificationDto> createMockNotificationDtos() {
        return Arrays.stream(NotificationType.values())
                .map(type -> {
                    NotificationDto dto = new NotificationDto();
                    dto.setId((long) type.ordinal() + 1);
                    dto.setType(type);
                    dto.setTitle("测试通知 - " + type.getDescription());
                    dto.setBody("测试内容");
                    return dto;
                })
                .collect(Collectors.toList());
    }
}
