package com.iflytek.astron.console.hub.dto.notification;

import com.iflytek.astron.console.hub.enums.NotificationType;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test notification grouping functionality, especially null type handling
 */
class NotificationGroupingTest {

    @Test
    void testNullTypeHandling() {
        // Create test data
        List<NotificationDto> notifications = createTestNotifications();

        // Simulate NotificationPageResponse grouping logic
        Map<NotificationType, List<NotificationDto>> groupedByType = notifications.stream()
                .collect(Collectors.groupingBy(notification -> notification.getType() != null ? notification.getType() : NotificationType.SYSTEM));

        // Verify grouping results
        assertNotNull(groupedByType);
        assertTrue(groupedByType.containsKey(NotificationType.PERSONAL));
        assertTrue(groupedByType.containsKey(NotificationType.SYSTEM));

        // Verify SYSTEM type contains both original and null type notifications
        List<NotificationDto> systemNotifications = groupedByType.get(NotificationType.SYSTEM);
        assertTrue(systemNotifications.size() >= 2); // At least contains original SYSTEM and null type notifications

        // Verify contains null type notification
        boolean hasNullTypeNotification = systemNotifications.stream()
                .anyMatch(n -> "Null Type Notification".equals(n.getTitle()));
        assertTrue(hasNullTypeNotification);
    }

    @Test
    void testNotificationPageResponseConstruction() {
        List<NotificationDto> notifications = createTestNotifications();

        // Test NotificationPageResponse construction
        NotificationPageResponse response = new NotificationPageResponse(
                notifications, 0, 10, 5L, 2L);

        assertNotNull(response);
        assertEquals(notifications, response.getNotifications());
        assertEquals(0, response.getPageIndex());
        assertEquals(10, response.getPageSize());
        assertEquals(5L, response.getTotalCount());
        assertEquals(2L, response.getUnreadCount());
        assertEquals(1, response.getTotalPages());

        // Verify grouping functionality
        Map<NotificationType, List<NotificationDto>> groupedNotifications =
                response.getNotificationsByType();
        assertNotNull(groupedNotifications);
        assertTrue(groupedNotifications.containsKey(NotificationType.PERSONAL));
        assertTrue(groupedNotifications.containsKey(NotificationType.BROADCAST));
        assertTrue(groupedNotifications.containsKey(NotificationType.SYSTEM));
        assertTrue(groupedNotifications.containsKey(NotificationType.PROMOTION));

        // Verify null type is mapped to SYSTEM
        List<NotificationDto> systemNotifications = groupedNotifications.get(NotificationType.SYSTEM);
        boolean hasNullTypeNotification = systemNotifications.stream()
                .anyMatch(n -> "Null Type Notification".equals(n.getTitle()));
        assertTrue(hasNullTypeNotification, "Null type notification should be mapped to SYSTEM type");
    }

    private List<NotificationDto> createTestNotifications() {
        NotificationDto personal = new NotificationDto();
        personal.setId(1L);
        personal.setType(NotificationType.PERSONAL);
        personal.setTitle("Personal Notification");

        NotificationDto broadcast = new NotificationDto();
        broadcast.setId(2L);
        broadcast.setType(NotificationType.BROADCAST);
        broadcast.setTitle("Broadcast Notification");

        NotificationDto system = new NotificationDto();
        system.setId(3L);
        system.setType(NotificationType.SYSTEM);
        system.setTitle("System Notification");

        NotificationDto promotion = new NotificationDto();
        promotion.setId(4L);
        promotion.setType(NotificationType.PROMOTION);
        promotion.setTitle("Promotion Notification");

        NotificationDto nullType = new NotificationDto();
        nullType.setId(5L);
        nullType.setType(null); // Null type
        nullType.setTitle("Null Type Notification");

        return Arrays.asList(personal, broadcast, system, promotion, nullType);
    }
}
