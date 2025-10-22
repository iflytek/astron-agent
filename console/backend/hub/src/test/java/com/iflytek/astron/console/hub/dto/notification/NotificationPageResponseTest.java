package com.iflytek.astron.console.hub.dto.notification;

import com.iflytek.astron.console.hub.enums.NotificationType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * NotificationPageResponse unit test - Test paging response and grouping by type functionality
 */
class NotificationPageResponseTest {

    private List<NotificationDto> testNotifications;

    @BeforeEach
    void setUp() {
        testNotifications = createTestNotifications();
    }

    private List<NotificationDto> createTestNotifications() {
        LocalDateTime now = LocalDateTime.now();

        NotificationDto personal1 = new NotificationDto();
        personal1.setId(1L);
        personal1.setType(NotificationType.PERSONAL);
        personal1.setTitle("Personal Message 1");
        personal1.setCreatedAt(now);

        NotificationDto personal2 = new NotificationDto();
        personal2.setId(2L);
        personal2.setType(NotificationType.PERSONAL);
        personal2.setTitle("Personal Message 2");
        personal2.setCreatedAt(now.minusHours(1));

        NotificationDto broadcast1 = new NotificationDto();
        broadcast1.setId(3L);
        broadcast1.setType(NotificationType.BROADCAST);
        broadcast1.setTitle("Broadcast Message 1");
        broadcast1.setCreatedAt(now.minusHours(2));

        NotificationDto system1 = new NotificationDto();
        system1.setId(4L);
        system1.setType(NotificationType.SYSTEM);
        system1.setTitle("System Notification 1");
        system1.setCreatedAt(now.minusHours(3));

        NotificationDto promotion1 = new NotificationDto();
        promotion1.setId(5L);
        promotion1.setType(NotificationType.PROMOTION);
        promotion1.setTitle("Promotion Message 1");
        promotion1.setCreatedAt(now.minusHours(4));

        return Arrays.asList(personal1, personal2, broadcast1, system1, promotion1);
    }

    @Test
    void testBasicPageResponseFields() {
        NotificationPageResponse response = new NotificationPageResponse(
                testNotifications, 0, 10, 15L, 3L);

        assertEquals(testNotifications, response.getNotifications());
        assertEquals(0, response.getPageIndex());
        assertEquals(10, response.getPageSize());
        assertEquals(15L, response.getTotalCount());
        assertEquals(3L, response.getUnreadCount());
        assertEquals(2, response.getTotalPages()); // Math.ceil(15/10) = 2
    }

    @Test
    void testTotalPagesCalculation() {
        // Test different total pages calculation
        NotificationPageResponse response1 = new NotificationPageResponse(
                testNotifications, 0, 10, 25L, 5L);
        assertEquals(3, response1.getTotalPages()); // Math.ceil(25/10) = 3

        NotificationPageResponse response2 = new NotificationPageResponse(
                testNotifications, 0, 10, 10L, 2L);
        assertEquals(1, response2.getTotalPages()); // Math.ceil(10/10) = 1

        NotificationPageResponse response3 = new NotificationPageResponse(
                testNotifications, 0, 10, 0L, 0L);
        assertEquals(0, response3.getTotalPages()); // Math.ceil(0/10) = 0
    }

    @Test
    void testTotalPagesWithZeroPageSize() {
        // Test page size equals 0 case
        NotificationPageResponse response = new NotificationPageResponse(
                testNotifications, 0, 0, 15L, 3L);
        assertEquals(0, response.getTotalPages());
    }

    @Test
    void testNotificationsByTypeGrouping() {
        NotificationPageResponse response = new NotificationPageResponse(
                testNotifications, 0, 10, 15L, 3L);

        Map<NotificationType, List<NotificationDto>> groupedNotifications =
                response.getNotificationsByType();

        assertNotNull(groupedNotifications);
        assertEquals(4, groupedNotifications.size()); // 4 types

        // Verify PERSONAL type notifications
        List<NotificationDto> personalNotifications = groupedNotifications.get(NotificationType.PERSONAL);
        assertNotNull(personalNotifications);
        assertEquals(2, personalNotifications.size());
        assertTrue(personalNotifications.stream()
                .allMatch(n -> n.getType() == NotificationType.PERSONAL));
        assertTrue(personalNotifications.stream()
                .anyMatch(n -> "Personal Message 1".equals(n.getTitle())));
        assertTrue(personalNotifications.stream()
                .anyMatch(n -> "Personal Message 2".equals(n.getTitle())));

        // Verify BROADCAST type notifications
        List<NotificationDto> broadcastNotifications = groupedNotifications.get(NotificationType.BROADCAST);
        assertNotNull(broadcastNotifications);
        assertEquals(1, broadcastNotifications.size());
        assertEquals("Broadcast Message 1", broadcastNotifications.get(0).getTitle());

        // Verify SYSTEM type notifications
        List<NotificationDto> systemNotifications = groupedNotifications.get(NotificationType.SYSTEM);
        assertNotNull(systemNotifications);
        assertEquals(1, systemNotifications.size());
        assertEquals("System Notification 1", systemNotifications.get(0).getTitle());

        // Verify PROMOTION type notifications
        List<NotificationDto> promotionNotifications = groupedNotifications.get(NotificationType.PROMOTION);
        assertNotNull(promotionNotifications);
        assertEquals(1, promotionNotifications.size());
        assertEquals("Promotion Message 1", promotionNotifications.get(0).getTitle());
    }

    @Test
    void testEmptyNotificationsList() {
        List<NotificationDto> emptyList = Arrays.asList();
        NotificationPageResponse response = new NotificationPageResponse(
                emptyList, 0, 10, 0L, 0L);

        assertEquals(0, response.getNotifications().size());
        assertEquals(0, response.getTotalPages());
        Map<NotificationType, List<NotificationDto>> groupedNotifications =
                response.getNotificationsByType();
        assertNotNull(groupedNotifications);
        // Constructor will initialize empty lists for all NotificationType enum values
        assertEquals(NotificationType.values().length, groupedNotifications.size());
        // Verify all type lists are empty
        groupedNotifications.values().forEach(list -> assertTrue(list.isEmpty()));
    }

    @Test
    void testSingleTypeNotifications() {
        // Test only one type of notification
        List<NotificationDto> singleTypeNotifications = Arrays.asList(
                testNotifications.get(0), testNotifications.get(1)); // two PERSONAL types

        NotificationPageResponse response = new NotificationPageResponse(
                singleTypeNotifications, 0, 10, 2L, 1L);

        Map<NotificationType, List<NotificationDto>> groupedNotifications =
                response.getNotificationsByType();

        // Constructor will initialize all NotificationType enum values
        assertEquals(NotificationType.values().length, groupedNotifications.size());
        assertTrue(groupedNotifications.containsKey(NotificationType.PERSONAL));
        assertEquals(2, groupedNotifications.get(NotificationType.PERSONAL).size());
        // Verify other type lists are empty
        for (NotificationType type : NotificationType.values()) {
            if (type != NotificationType.PERSONAL) {
                assertTrue(groupedNotifications.get(type).isEmpty());
            }
        }
    }

    @Test
    void testNotificationsWithNullType() {
        // Create a notification with null type
        NotificationDto nullTypeNotification = new NotificationDto();
        nullTypeNotification.setId(99L);
        nullTypeNotification.setType(null);
        nullTypeNotification.setTitle("Null Type Message");

        List<NotificationDto> mixedNotifications = Arrays.asList(
                testNotifications.get(0), nullTypeNotification);

        NotificationPageResponse response = new NotificationPageResponse(
                mixedNotifications, 0, 10, 2L, 1L);

        Map<NotificationType, List<NotificationDto>> groupedNotifications =
                response.getNotificationsByType();

        // Verify null type is mapped to SYSTEM type
        assertTrue(groupedNotifications.containsKey(NotificationType.SYSTEM));
        // SYSTEM type should contain both original and null type notifications
        List<NotificationDto> systemNotifications = groupedNotifications.get(NotificationType.SYSTEM);
        assertTrue(systemNotifications.size() >= 1);

        // Verify at least one notification has the title "Null Type Message"
        boolean hasNullTypeNotification = systemNotifications.stream()
                .anyMatch(notification -> "Null Type Message".equals(notification.getTitle()));
        assertTrue(hasNullTypeNotification, "Should contain notification with title 'Null Type Message'");

        assertTrue(groupedNotifications.containsKey(NotificationType.PERSONAL));
        assertEquals(1, groupedNotifications.get(NotificationType.PERSONAL).size());
    }

    @Test
    void testResponseEquals() {
        NotificationPageResponse response1 = new NotificationPageResponse(
                testNotifications, 0, 10, 15L, 3L);

        NotificationPageResponse response2 = new NotificationPageResponse(
                testNotifications, 0, 10, 15L, 3L);

        // Due to Lombok generated equals method
        assertEquals(response1, response2);
        assertEquals(response1.hashCode(), response2.hashCode());
    }

    @Test
    void testResponseToString() {
        NotificationPageResponse response = new NotificationPageResponse(
                testNotifications, 1, 5, 20L, 8L);

        String toString = response.toString();
        assertNotNull(toString);
        assertTrue(toString.contains("NotificationPageResponse"));
    }
}
