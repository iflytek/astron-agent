package com.iflytek.astron.console.hub.controller.notification;

import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.util.RequestContextUtil;
import com.iflytek.astron.console.hub.dto.notification.MarkReadRequest;
import com.iflytek.astron.console.hub.dto.notification.NotificationPageResponse;
import com.iflytek.astron.console.hub.dto.notification.NotificationQueryRequest;
import com.iflytek.astron.console.hub.service.notification.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/notifications")
@Tag(name = "Notification Management", description = "Message notification management interface")
@Slf4j
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/list")
    @Operation(summary = "Query current user's notification list", description = "Paginated query of current user's notification message list")
    public ApiResult<NotificationPageResponse> getUserNotifications(
            @Parameter(description = "Query parameters") @Valid NotificationQueryRequest queryRequest) {

        String currentUserUid = RequestContextUtil.getUID();
        log.debug("Query user notification list: uid={}, pageIndex={}, pageSize={}",
                currentUserUid, queryRequest.getPageIndex(), queryRequest.getPageSize());

        NotificationPageResponse response = notificationService.getUserNotifications(currentUserUid, queryRequest);
        log.debug("Query successful, returned {} notifications, unread count: {}",
                response.getNotifications().size(), response.getUnreadCount());

        return ApiResult.success(response);
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Get current user's unread notification count", description = "Get the count of unread notification messages for current user")
    public ApiResult<Long> getUnreadNotificationCount() {
        String currentUserUid = RequestContextUtil.getUID();
        log.debug("Query user unread notification count: uid={}", currentUserUid);

        long unreadCount = notificationService.getUnreadNotificationCount(currentUserUid);
        log.debug("User unread notification count: {}", unreadCount);

        return ApiResult.success(unreadCount);
    }

    @PostMapping("/mark-read")
    @Operation(summary = "Mark notifications as read", description = "Mark specified notification messages as read status")
    public ApiResult<Boolean> markNotificationsAsRead(@Valid @RequestBody MarkReadRequest request) {
        String currentUserUid = RequestContextUtil.getUID();
        log.info("Mark notifications as read: uid={}, markAll={}, notificationIds={}",
                currentUserUid, request.getMarkAll(), request.getNotificationIds());

        boolean success = notificationService.markNotificationsAsRead(currentUserUid, request);
        log.info("Mark notifications as read operation completed: success={}", success);

        return ApiResult.success(success);
    }

    @DeleteMapping("/{notificationId}")
    @Operation(summary = "Delete notification", description = "Delete specified notification message")
    public ApiResult<Boolean> deleteNotification(
            @Parameter(description = "Notification ID") @PathVariable Long notificationId) {

        String currentUserUid = RequestContextUtil.getUID();
        log.info("Delete notification: uid={}, notificationId={}", currentUserUid, notificationId);

        boolean success = notificationService.deleteNotification(currentUserUid, notificationId);
        log.info("Delete notification operation completed: success={}", success);

        return ApiResult.success(success);
    }
}
