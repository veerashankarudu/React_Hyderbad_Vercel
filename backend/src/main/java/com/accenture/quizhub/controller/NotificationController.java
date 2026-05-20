package com.accenture.quizhub.controller;

import com.accenture.quizhub.entity.User;
import com.accenture.quizhub.exception.ResourceNotFoundException;
import com.accenture.quizhub.repository.UserRepository;
import com.accenture.quizhub.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    private User resolveUser(String enterpriseId) {
        return userRepository.findByEnterpriseId(enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getNotifications(
            @AuthenticationPrincipal String enterpriseId,
            @RequestParam(required = false) String type) {
        return ResponseEntity.ok(notificationService.getRecent(resolveUser(enterpriseId), type));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(
            @AuthenticationPrincipal String enterpriseId) {
        return ResponseEntity.ok(Map.of("count", notificationService.countUnread(resolveUser(enterpriseId))));
    }

    @PostMapping("/mark-all-read")
    public ResponseEntity<Void> markAllRead(@AuthenticationPrincipal String enterpriseId) {
        notificationService.markAllRead(resolveUser(enterpriseId));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Void> markRead(
            @PathVariable Long id,
            @AuthenticationPrincipal String enterpriseId) {
        notificationService.markRead(id, resolveUser(enterpriseId));
        return ResponseEntity.ok().build();
    }
}
