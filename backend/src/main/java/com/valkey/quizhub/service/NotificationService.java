package com.valkey.quizhub.service;

import com.valkey.quizhub.entity.Notification;
import com.valkey.quizhub.entity.User;
import com.valkey.quizhub.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public void notify(User recipient, String message, String type, Long mcqId, User actor, String mcqRef) {
        String initials = actor == null ? "SY" : buildInitials(actor.getFullName());
        String actorName = actor == null ? "System" : actor.getFullName();
        Notification n = Notification.builder()
                .user(recipient)
                .message(message)
                .type(type)
                .mcqId(mcqId)
                .actorName(actorName)
                .actorInitials(initials)
                .mcqRef(mcqRef)
                .build();
        notificationRepository.save(n);
    }

    // Backward-compatible overload (no actor)
    public void notify(User recipient, String message, String type, Long mcqId) {
        notify(recipient, message, type, mcqId, null, null);
    }

    public List<Map<String, Object>> getRecent(User user, String type) {
        LocalDateTime since = LocalDateTime.now().minusDays(30);
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .filter(n -> n.getCreatedAt() != null && n.getCreatedAt().isAfter(since))
                .filter(n -> type == null || type.isBlank() || type.equalsIgnoreCase(n.getType()))
                .map(this::toMap)
                .toList();
    }

    public long countUnread(User user) {
        return notificationRepository.countByUserIdAndReadFalse(user.getId());
    }

    @Transactional
    public void markAllRead(User user) {
        notificationRepository.markAllReadByUserId(user.getId());
    }

    @Transactional
    public void markRead(Long notifId, User user) {
        notificationRepository.findById(notifId).ifPresent(n -> {
            if (n.getUser().getId().equals(user.getId())) {
                n.setRead(true);
                notificationRepository.save(n);
            }
        });
    }

    private String buildInitials(String fullName) {
        if (fullName == null || fullName.isBlank()) return "??";
        String[] parts = fullName.trim().split("\\s+");
        if (parts.length == 1) return parts[0].substring(0, Math.min(2, parts[0].length())).toUpperCase();
        return (parts[0].charAt(0) + "" + parts[parts.length - 1].charAt(0)).toUpperCase();
    }

    private Map<String, Object> toMap(Notification n) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", n.getId());
        m.put("message", n.getMessage());
        m.put("type", n.getType());
        m.put("mcqId", n.getMcqId());
        m.put("mcqRef", n.getMcqRef());
        m.put("actorName", n.getActorName());
        m.put("actorInitials", n.getActorInitials());
        m.put("read", n.isRead());
        m.put("createdAt", n.getCreatedAt());
        return m;
    }
}
