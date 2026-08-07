package com.iflytek.astron.console.hub.service.notification.impl;

import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.hub.data.NotificationDataService;
import com.iflytek.astron.console.hub.dto.notification.*;
import com.iflytek.astron.console.hub.enums.NotificationType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * NotificationServiceImpl unit test - Test core business logic of notification service
 */
@ExtendWith(MockitoExtension.class)
class NotificationServiceImplTest {

    @Mock
    private NotificationDataService notificationDataService;

    @InjectMocks
    private NotificationServiceImpl notificationService;

    private NotificationQueryRequest queryRequest;
    private List<NotificationDto> testNotifications;

    @BeforeEach
    void setUp() {
        queryRequest = new NotificationQueryRequest();
        queryRequest.setPageIndex(0);
        queryRequest.setPageSize(10);

        testNotifications = createTestNotifications();
    }

    private List<NotificationDto> createTestNotifications() {
        LocalDateTime now = LocalDateTime.now();

        NotificationDto notification1 = new NotificationDto();
        notification1.setId(1L);
        notification1.setType(NotificationType.PERSONAL);
        notification1.setTitle("Personal message 1");
        notification1.setBody("This is a personal message");
        notification1.setIsRead(false);
        notification1.setCreatedAt(now);

        NotificationDto notification2 = new NotificationDto();
        notification2.setId(2L);
        notification2.setType(NotificationType.SYSTEM);
        notification2.setTitle("System notification");
        notification2.setBody("System maintenance notification");
        notification2.setIsRead(true);
        notification2.setCreatedAt(now.minusHours(1));

        return Arrays.asList(notification1, notification2);
    }

    @Test
    void testGetUserNotifications_Success() {
        // Prepare test data
        String receiverUid = "user123";
        long totalCount = 25L;
        long unreadCount = 8L;

        when(notificationDataService.getUserNotifications(eq(receiverUid), any()))
                .thenReturn(testNotifications);
        when(notificationDataService.countUserAllNotifications(receiverUid))
                .thenReturn(totalCount);
        when(notificationDataService.countUserUnreadNotifications(receiverUid))
                .thenReturn(unreadCount);

        // Execute test
        NotificationPageResponse response = notificationService.getUserNotifications(receiverUid, queryRequest);

        // Verify result
        assertNotNull(response);
        assertEquals(testNotifications, response.getNotifications());
        assertEquals(0, response.getPageIndex());
        assertEquals(10, response.getPageSize());
        assertEquals(totalCount, response.getTotalCount());
        assertEquals(unreadCount, response.getUnreadCount());

        // Verify grouping functionality
        assertNotNull(response.getNotificationsByType());
        assertTrue(response.getNotificationsByType().containsKey(NotificationType.PERSONAL));
        assertTrue(response.getNotificationsByType().containsKey(NotificationType.SYSTEM));

        // Verify method calls
        verify(notificationDataService).getUserNotifications(eq(receiverUid), any());
        verify(notificationDataService).countUserAllNotifications(receiverUid);
        verify(notificationDataService).countUserUnreadNotifications(receiverUid);
    }

    @Test
    void testGetUnreadNotificationCount_Success() {
        String receiverUid = "user123";
        long expectedCount = 5L;

        when(notificationDataService.countUserUnreadNotifications(receiverUid))
                .thenReturn(expectedCount);

        long result = notificationService.getUnreadNotificationCount(receiverUid);

        assertEquals(expectedCount, result);
        verify(notificationDataService).countUserUnreadNotifications(receiverUid);
    }

    @Test
    void testGetUnreadNotificationCount_NullUid() {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> notificationService.getUnreadNotificationCount(null));

        assertEquals(ResponseEnum.PARAMETER_ERROR, exception.getResponseEnum());
        verifyNoInteractions(notificationDataService);
    }

    @Test
    void testSendNotification_NullRequest() {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> notificationService.sendNotification(null));

        assertEquals(ResponseEnum.PARAMETER_ERROR, exception.getResponseEnum());
        verifyNoInteractions(notificationDataService);
    }

    @Test
    void testSendNotification_NullType() {
        SendNotificationRequest request = new SendNotificationRequest();
        request.setType(null);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> notificationService.sendNotification(request));

        assertEquals(ResponseEnum.PARAMETER_ERROR, exception.getResponseEnum());
        verifyNoInteractions(notificationDataService);
    }

    @Test
    void testMarkNotificationsAsRead_NullUid() {
        MarkReadRequest request = new MarkReadRequest();
        request.setMarkAll(true);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> notificationService.markNotificationsAsRead(null, request));

        assertEquals(ResponseEnum.PARAMETER_ERROR, exception.getResponseEnum());
        verifyNoInteractions(notificationDataService);
    }

    @Test
    void testDeleteNotification_Success() {
        String receiverUid = "user123";
        Long notificationId = 1L;

        when(notificationDataService.deleteUserNotification(receiverUid, notificationId))
                .thenReturn(1);

        boolean result = notificationService.deleteNotification(receiverUid, notificationId);

        assertTrue(result);
        verify(notificationDataService).deleteUserNotification(receiverUid, notificationId);
    }

    @Test
    void testDeleteNotification_NullParameters() {
        BusinessException exception1 = assertThrows(
                BusinessException.class,
                () -> notificationService.deleteNotification(null, 1L));

        BusinessException exception2 = assertThrows(
                BusinessException.class,
                () -> notificationService.deleteNotification("user123", null));

        assertEquals(ResponseEnum.PARAMETER_ERROR, exception1.getResponseEnum());
        assertEquals(ResponseEnum.PARAMETER_ERROR, exception2.getResponseEnum());
        verifyNoInteractions(notificationDataService);
    }

    @Test
    void testDeleteNotification_NotExists() {
        String receiverUid = "user123";
        Long notificationId = 1L;

        when(notificationDataService.deleteUserNotification(receiverUid, notificationId))
                .thenReturn(0);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> notificationService.deleteNotification(receiverUid, notificationId));

        assertEquals(ResponseEnum.NOTIFICATION_NOT_EXISTS, exception.getResponseEnum());
        verify(notificationDataService).deleteUserNotification(receiverUid, notificationId);
    }

    @Test
    void testCleanExpiredNotifications_Success() {
        int expectedDeleted = 10;

        when(notificationDataService.deleteExpiredNotifications(any(LocalDateTime.class)))
                .thenReturn(expectedDeleted);

        int result = notificationService.cleanExpiredNotifications();

        assertEquals(expectedDeleted, result);
        verify(notificationDataService).deleteExpiredNotifications(any(LocalDateTime.class));
    }

    @Test
    void testGetUserNotifications_EmptyResult() {
        String receiverUid = "user123";

        when(notificationDataService.getUserNotifications(eq(receiverUid), any()))
                .thenReturn(Arrays.asList());
        when(notificationDataService.countUserAllNotifications(receiverUid))
                .thenReturn(0L);
        when(notificationDataService.countUserUnreadNotifications(receiverUid))
                .thenReturn(0L);

        NotificationPageResponse response = notificationService.getUserNotifications(receiverUid, queryRequest);

        assertNotNull(response);
        assertTrue(response.getNotifications().isEmpty());
        assertEquals(0L, response.getTotalCount());
        assertEquals(0L, response.getUnreadCount());
        assertEquals(0, response.getTotalPages());
        assertNotNull(response.getNotificationsByType());
        // NotificationPageResponse constructor will initialize empty lists for all enum types
        assertFalse(response.getNotificationsByType().isEmpty());
        // But all type lists should be empty
        response.getNotificationsByType().values().forEach(list -> assertTrue(list.isEmpty()));
    }

    @Test
    void testGetUserNotifications_PaginationCalculation() {
        String receiverUid = "user123";
        long totalCount = 35L;
        long unreadCount = 10L;

        queryRequest.setPageIndex(2);
        queryRequest.setPageSize(10);

        when(notificationDataService.getUserNotifications(eq(receiverUid), any()))
                .thenReturn(testNotifications);
        when(notificationDataService.countUserAllNotifications(receiverUid))
                .thenReturn(totalCount);
        when(notificationDataService.countUserUnreadNotifications(receiverUid))
                .thenReturn(unreadCount);

        NotificationPageResponse response = notificationService.getUserNotifications(receiverUid, queryRequest);

        assertEquals(2, response.getPageIndex());
        assertEquals(10, response.getPageSize());
        assertEquals(35L, response.getTotalCount());
        assertEquals(4, response.getTotalPages()); // Math.ceil(35/10) = 4
        assertEquals(10L, response.getUnreadCount());
    }

    @Test
    void testGetUserNotifications_WithDifferentTypes() {
        String receiverUid = "user123";

        // Create notification list containing all types
        List<NotificationDto> allTypeNotifications = createAllTypeNotifications();

        when(notificationDataService.getUserNotifications(eq(receiverUid), any()))
                .thenReturn(allTypeNotifications);
        when(notificationDataService.countUserAllNotifications(receiverUid))
                .thenReturn(4L);
        when(notificationDataService.countUserUnreadNotifications(receiverUid))
                .thenReturn(2L);

        NotificationPageResponse response = notificationService.getUserNotifications(receiverUid, queryRequest);

        // Verify all types are correctly grouped
        assertEquals(4, response.getNotificationsByType().size());
        assertTrue(response.getNotificationsByType().containsKey(NotificationType.PERSONAL));
        assertTrue(response.getNotificationsByType().containsKey(NotificationType.BROADCAST));
        assertTrue(response.getNotificationsByType().containsKey(NotificationType.SYSTEM));
        assertTrue(response.getNotificationsByType().containsKey(NotificationType.PROMOTION));

        // Verify each type has only one notification
        assertEquals(1, response.getNotificationsByType().get(NotificationType.PERSONAL).size());
        assertEquals(1, response.getNotificationsByType().get(NotificationType.BROADCAST).size());
        assertEquals(1, response.getNotificationsByType().get(NotificationType.SYSTEM).size());
        assertEquals(1, response.getNotificationsByType().get(NotificationType.PROMOTION).size());
    }

    private List<NotificationDto> createAllTypeNotifications() {
        // Test data with Chinese titles for different notification types
        NotificationDto personal = new NotificationDto();
        personal.setId(1L);
        personal.setType(NotificationType.PERSONAL);
        personal.setTitle("Personal message");

        NotificationDto broadcast = new NotificationDto();
        broadcast.setId(2L);
        broadcast.setType(NotificationType.BROADCAST);
        broadcast.setTitle("Broadcast message");

        NotificationDto system = new NotificationDto();
        system.setId(3L);
        system.setType(NotificationType.SYSTEM);
        system.setTitle("System notification");

        NotificationDto promotion = new NotificationDto();
        promotion.setId(4L);
        promotion.setType(NotificationType.PROMOTION);
        promotion.setTitle("Promotion message");

        return Arrays.asList(personal, broadcast, system, promotion);
    }

    @Test
    void testGetUserNotifications_WithNullTypeNotification() {
        String receiverUid = "user123";

        // Create notification with null type
        NotificationDto nullTypeNotification = new NotificationDto();
        nullTypeNotification.setId(99L);
        nullTypeNotification.setType(null);
        nullTypeNotification.setTitle("Empty Type Notification");

        List<NotificationDto> mixedNotifications = Arrays.asList(
                testNotifications.getFirst(), nullTypeNotification);

        when(notificationDataService.getUserNotifications(eq(receiverUid), any()))
                .thenReturn(mixedNotifications);
        when(notificationDataService.countUserAllNotifications(receiverUid))
                .thenReturn(2L);
        when(notificationDataService.countUserUnreadNotifications(receiverUid))
                .thenReturn(1L);

        NotificationPageResponse response = notificationService.getUserNotifications(receiverUid, queryRequest);

        // Verify null type is mapped to SYSTEM type
        assertTrue(response.getNotificationsByType().containsKey(NotificationType.SYSTEM));
        List<NotificationDto> systemNotifications = response.getNotificationsByType().get(NotificationType.SYSTEM);
        assertTrue(systemNotifications.size() >= 1);

        // Verify notifications containing null type
        boolean hasNullTypeNotification = systemNotifications.stream()
                .anyMatch(notification -> "Empty Type Notification".equals(notification.getTitle()));
        assertTrue(hasNullTypeNotification, "Should contain notification with title 'Empty Type Notification'");

        assertTrue(response.getNotificationsByType().containsKey(NotificationType.PERSONAL));
        assertEquals(1, response.getNotificationsByType().get(NotificationType.PERSONAL).size());
    }
}
