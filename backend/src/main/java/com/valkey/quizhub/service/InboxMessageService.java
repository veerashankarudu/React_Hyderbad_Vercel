package com.valkey.quizhub.service;

import com.valkey.quizhub.entity.InboxMessage;
import com.valkey.quizhub.entity.User;
import com.valkey.quizhub.exception.ResourceNotFoundException;
import com.valkey.quizhub.repository.InboxMessageRepository;
import com.valkey.quizhub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class InboxMessageService {

    private final InboxMessageRepository inboxRepository;
    private final UserRepository userRepository;

    // ── System-generated messages (MCQ events) ────────────────────────────────

    public void sendSystem(User recipient, String subject, String body, Long mcqId) {
        inboxRepository.save(InboxMessage.builder()
                .recipient(recipient)
                .sender(null)
                .subject(subject)
                .body(body)
                .messageType("SYSTEM")
                .mcqId(mcqId)
                .build());
    }

    // ── User-to-user messages ─────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> send(User sender, String recipientEnterpriseId, String subject, String body) {
        User recipient = userRepository.findByEnterpriseId(recipientEnterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + recipientEnterpriseId));
        InboxMessage msg = inboxRepository.save(InboxMessage.builder()
                .sender(sender)
                .recipient(recipient)
                .subject(subject)
                .body(body)
                .messageType("USER")
                .build());
        return toMap(msg);
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getInbox(User user) {
        return inboxRepository.findByRecipientIdOrderBySentAtDesc(user.getId())
                .stream().map(this::toMap).toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getSent(User user) {
        return inboxRepository.findBySenderIdOrderBySentAtDesc(user.getId())
                .stream().map(this::toMap).toList();
    }

    public long countUnread(User user) {
        return inboxRepository.countByRecipientIdAndReadFalse(user.getId());
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getStarred(User user) {
        return inboxRepository.findByRecipientIdAndStarredTrueOrderBySentAtDesc(user.getId())
                .stream().map(this::toMap).toList();
    }

    @Transactional
    public Map<String, Object> toggleStar(Long messageId, User user) {
        InboxMessage msg = inboxRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));
        if (!msg.getRecipient().getId().equals(user.getId())) return toMap(msg);
        msg.setStarred(!msg.isStarred());
        return toMap(inboxRepository.save(msg));
    }

    @Transactional
    public void markRead(Long messageId, User user) {
        InboxMessage msg = inboxRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));
        if (!msg.getRecipient().getId().equals(user.getId())) return;
        msg.setRead(true);
        inboxRepository.save(msg);
    }

    @Transactional
    public void markAllRead(User user) {
        inboxRepository.markAllReadForUser(user.getId());
    }

    @Transactional
    public void delete(Long messageId, User user) {
        InboxMessage msg = inboxRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));
        // allow sender or recipient to delete
        if (msg.getRecipient().getId().equals(user.getId()) || (msg.getSender() != null && msg.getSender().getId().equals(user.getId()))) {
            inboxRepository.delete(msg);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Map<String, Object> toMap(InboxMessage m) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", m.getId());
        map.put("subject", m.getSubject());
        map.put("body", m.getBody());
        map.put("read", m.isRead());
        map.put("starred", m.isStarred());
        map.put("messageType", m.getMessageType());
        map.put("mcqId", m.getMcqId());
        map.put("sentAt", m.getSentAt());
        if (m.getSender() != null) {
            map.put("senderName", m.getSender().getFullName());
            map.put("senderEnterpriseId", m.getSender().getEnterpriseId());
        } else {
            map.put("senderName", "QuizHub System");
            map.put("senderEnterpriseId", "system");
        }
        map.put("recipientName", m.getRecipient().getFullName());
        map.put("recipientEnterpriseId", m.getRecipient().getEnterpriseId());
        return map;
    }
}
