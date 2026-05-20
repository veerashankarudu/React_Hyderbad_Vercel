package com.accenture.quizhub.controller;

import com.accenture.quizhub.entity.User;
import com.accenture.quizhub.exception.ResourceNotFoundException;
import com.accenture.quizhub.repository.UserRepository;
import com.accenture.quizhub.service.InboxMessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/inbox")
@RequiredArgsConstructor
public class InboxController {

    private final InboxMessageService inboxService;
    private final UserRepository userRepository;

    private User resolve(String enterpriseId) {
        return userRepository.findByEnterpriseId(enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    /** Get received messages */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getInbox(@AuthenticationPrincipal String eid) {
        return ResponseEntity.ok(inboxService.getInbox(resolve(eid)));
    }

    /** Get sent messages */
    @GetMapping("/sent")
    public ResponseEntity<List<Map<String, Object>>> getSent(@AuthenticationPrincipal String eid) {
        return ResponseEntity.ok(inboxService.getSent(resolve(eid)));
    }

    /** Unread count */
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount(@AuthenticationPrincipal String eid) {
        return ResponseEntity.ok(Map.of("count", inboxService.countUnread(resolve(eid))));
    }

    /** Send a message to another user */
    @PostMapping("/send")
    public ResponseEntity<Map<String, Object>> send(
            @AuthenticationPrincipal String eid,
            @RequestBody Map<String, String> body) {
        String to = body.get("to");
        String subject = body.get("subject");
        String text = body.get("body");
        if (to == null || subject == null || text == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(inboxService.send(resolve(eid), to, subject, text));
    }

    /** Mark a specific message as read */
    @PostMapping("/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable Long id, @AuthenticationPrincipal String eid) {
        inboxService.markRead(id, resolve(eid));
        return ResponseEntity.ok().build();
    }

    /** Mark all messages as read */
    @PostMapping("/mark-all-read")
    public ResponseEntity<Void> markAllRead(@AuthenticationPrincipal String eid) {
        inboxService.markAllRead(resolve(eid));
        return ResponseEntity.ok().build();
    }

    /** Delete a message */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal String eid) {
        inboxService.delete(id, resolve(eid));
        return ResponseEntity.ok().build();
    }

    /** Get starred messages */
    @GetMapping("/starred")
    public ResponseEntity<List<Map<String, Object>>> getStarred(@AuthenticationPrincipal String eid) {
        return ResponseEntity.ok(inboxService.getStarred(resolve(eid)));
    }

    /** Toggle star on a message */
    @PostMapping("/{id}/star")
    public ResponseEntity<Map<String, Object>> toggleStar(@PathVariable Long id, @AuthenticationPrincipal String eid) {
        return ResponseEntity.ok(inboxService.toggleStar(id, resolve(eid)));
    }
}
