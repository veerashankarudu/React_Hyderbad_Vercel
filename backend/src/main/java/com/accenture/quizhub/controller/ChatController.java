package com.accenture.quizhub.controller;

import com.accenture.quizhub.entity.ChatMessage;
import com.accenture.quizhub.entity.User;
import com.accenture.quizhub.enums.Role;
import com.accenture.quizhub.repository.ChatMessageRepository;
import com.accenture.quizhub.repository.UserRepository;
import com.accenture.quizhub.service.AIService;
import com.accenture.quizhub.service.NotificationService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final AIService aiService;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /** In-memory presence: enterpriseId → last heartbeat timestamp */
    private static final Map<String, LocalDateTime> onlinePresence = new ConcurrentHashMap<>();

    // ── Heartbeat ─────────────────────────────────────────────────────────────
    @PostMapping("/heartbeat")
    public ResponseEntity<Void> heartbeat(Principal principal) {
        onlinePresence.put(principal.getName(), LocalDateTime.now());
        return ResponseEntity.ok().build();
    }

    // ── Online users (active in last 30 s) ───────────────────────────────────
    @GetMapping("/online-users")
    public ResponseEntity<List<Map<String, Object>>> onlineUsers() {
        LocalDateTime threshold = LocalDateTime.now().minusSeconds(30);
        List<Map<String, Object>> result = onlinePresence.entrySet().stream()
                .filter(e -> e.getValue().isAfter(threshold))
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("enterpriseId", e.getKey());
                    userRepository.findByEnterpriseId(e.getKey()).ifPresent(u -> {
                        m.put("fullName", u.getFullName());
                        m.put("role", u.getRole().name());
                    });
                    return m;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    // ── GET messages ─────────────────────────────────────────────────────────
    @GetMapping("/messages")
    public ResponseEntity<List<Map<String, Object>>> getMessages(
            @RequestParam(required = false) String since) {

        List<ChatMessage> msgs;
        if (since != null && !since.isBlank()) {
            try {
                LocalDateTime sinceTime = LocalDateTime.parse(since, DateTimeFormatter.ISO_DATE_TIME);
                msgs = chatMessageRepository.findByCreatedAtAfterOrderByCreatedAtAsc(sinceTime);
            } catch (Exception e) {
                msgs = chatMessageRepository.findTop100ByOrderByCreatedAtDesc();
                Collections.reverse(msgs);
            }
        } else {
            msgs = chatMessageRepository.findTop100ByOrderByCreatedAtDesc();
            Collections.reverse(msgs);
        }

        List<Map<String, Object>> result = msgs.stream().map(this::toMap).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    // ── GET pinned message ───────────────────────────────────────────────────
    @GetMapping("/pinned")
    public ResponseEntity<Map<String, Object>> getPinned() {
        return chatMessageRepository.findByPinnedTrue().stream()
                .filter(m -> !Boolean.TRUE.equals(m.getDeleted()))
                .findFirst()
                .map(m -> ResponseEntity.ok(toMap(m)))
                .orElse(ResponseEntity.noContent().build());
    }

    // ── POST send message ────────────────────────────────────────────────────
    @PostMapping("/messages")
    public ResponseEntity<List<Map<String, Object>>> sendMessage(
            @RequestBody Map<String, Object> body,
            Principal principal) {

        String content = ((String) body.getOrDefault("content", "")).trim();
        if (content.isBlank()) return ResponseEntity.badRequest().build();

        User sender = userRepository.findByEnterpriseId(principal.getName()).orElseThrow();

        // Reply threading
        Long replyToId = null;
        Object rawId = body.get("replyToId");
        if (rawId instanceof Number) replyToId = ((Number) rawId).longValue();

        String replyContent = null;
        String replySender = null;
        if (replyToId != null) {
            Optional<ChatMessage> origOpt = chatMessageRepository.findById(replyToId);
            if (origOpt.isPresent()) {
                ChatMessage orig = origOpt.get();
                replyContent = Boolean.TRUE.equals(orig.getDeleted()) ? "[deleted]" : truncate(orig.getContent(), 100);
                replySender  = orig.getSenderName();
            }
        }

        ChatMessage userMsg = chatMessageRepository.save(ChatMessage.builder()
                .senderEnterpriseId(sender.getEnterpriseId())
                .senderName(sender.getFullName())
                .senderRole(sender.getRole().name())
                .content(content)
                .msgType("USER")
                .replyToId(replyToId)
                .replyToContent(replyContent)
                .replyToSender(replySender)
                .build());

        List<Map<String, Object>> response = new ArrayList<>();
        response.add(toMap(userMsg));

        // @mention notifications
        Pattern mentionPattern = Pattern.compile("@([\\w.]+)");
        Matcher matcher = mentionPattern.matcher(content);
        Set<String> mentioned = new HashSet<>();
        while (matcher.find()) {
            String tag = matcher.group(1);
            if (!tag.equalsIgnoreCase("bot") && mentioned.add(tag)) {
                userRepository.findByEnterpriseId(tag).ifPresent(target -> {
                    if (!target.getId().equals(sender.getId())) {
                        notificationService.notify(target,
                                sender.getFullName() + " mentioned you in chat: \"" + truncate(content, 80) + "\"",
                                "MENTION", null, sender, null);
                    }
                });
            }
        }

        // @bot → AI reply with chat history context
        if (content.toLowerCase().contains("@bot")) {
            String question = content.replaceAll("(?i)@bot", "").trim();
            // Fetch last 8 non-deleted messages as conversation context
            List<ChatMessage> recent = chatMessageRepository.findTop100ByOrderByCreatedAtDesc();
            Collections.reverse(recent);
            List<String> history = recent.stream()
                    .filter(m -> !Boolean.TRUE.equals(m.getDeleted()) && m.getMsgType() != null)
                    .filter(m -> !m.getId().equals(userMsg.getId()))
                    .map(m -> ("BOT".equals(m.getMsgType()) ? "Assistant" : m.getSenderName()) + ": " + truncate(m.getContent(), 200))
                    .skip(Math.max(0, recent.size() - 10))
                    .collect(Collectors.toList());
            String aiReply = aiService.chatReplyWithHistory(question, history);
            ChatMessage botMsg = chatMessageRepository.save(ChatMessage.builder()
                    .senderEnterpriseId("bot")
                    .senderName("QuizHub AI")
                    .content(aiReply)
                    .msgType("BOT")
                    .replyToId(userMsg.getId())
                    .replyToContent(truncate(content, 100))
                    .replyToSender(sender.getFullName())
                    .build());
            response.add(toMap(botMsg));
        }

        return ResponseEntity.ok(response);
    }

    // ── React to message ─────────────────────────────────────────────────────
    @PostMapping("/messages/{id}/react")
    public ResponseEntity<Map<String, Object>> react(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Principal principal) {

        String emoji = body.getOrDefault("emoji", "").trim();
        if (emoji.isBlank()) return ResponseEntity.badRequest().build();

        ChatMessage msg = chatMessageRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        String reactJson = msg.getReactions();
        Map<String, List<String>> reactions;
        try {
            reactions = (reactJson != null && !reactJson.isBlank())
                    ? objectMapper.readValue(reactJson, new TypeReference<>() {})
                    : new LinkedHashMap<>();
        } catch (Exception e) {
            reactions = new LinkedHashMap<>();
        }

        String userId = principal.getName();
        List<String> users = reactions.computeIfAbsent(emoji, k -> new ArrayList<>());
        if (users.contains(userId)) {
            users.remove(userId);
            if (users.isEmpty()) reactions.remove(emoji);
        } else {
            users.add(userId);
        }

        try { msg.setReactions(objectMapper.writeValueAsString(reactions)); } catch (Exception ignored) {}
        chatMessageRepository.save(msg);
        return ResponseEntity.ok(toMap(msg));
    }

    // ── Delete message ───────────────────────────────────────────────────────
    @DeleteMapping("/messages/{id}")
    public ResponseEntity<Void> deleteMessage(@PathVariable Long id, Principal principal) {
        ChatMessage msg = chatMessageRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        User requester = userRepository.findByEnterpriseId(principal.getName()).orElseThrow();
        boolean isOwner = msg.getSenderEnterpriseId().equals(principal.getName());
        boolean isAdmin = requester.getRole() == Role.ADMIN;
        if (!isOwner && !isAdmin) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        msg.setDeleted(true);
        chatMessageRepository.save(msg);
        return ResponseEntity.noContent().build();
    }

    // ── Edit own message ─────────────────────────────────────────────────────
    @PutMapping("/messages/{id}")
    public ResponseEntity<Map<String, Object>> editMessage(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Principal principal) {

        ChatMessage msg = chatMessageRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!msg.getSenderEnterpriseId().equals(principal.getName()))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        String newContent = body.getOrDefault("content", "").trim();
        if (newContent.isBlank()) return ResponseEntity.badRequest().build();

        msg.setContent(newContent);
        msg.setEditedAt(LocalDateTime.now());
        chatMessageRepository.save(msg);
        return ResponseEntity.ok(toMap(msg));
    }

    // ── Pin / unpin message (admin only) ─────────────────────────────────────
    @PutMapping("/messages/{id}/pin")
    public ResponseEntity<Map<String, Object>> pinMessage(@PathVariable Long id, Principal principal) {
        User user = userRepository.findByEnterpriseId(principal.getName()).orElseThrow();
        if (user.getRole() != Role.ADMIN) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        ChatMessage msg = chatMessageRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        boolean newPinned = !Boolean.TRUE.equals(msg.getPinned());
        if (newPinned) {
            // Unpin any previously pinned message
            chatMessageRepository.findByPinnedTrue().forEach(m -> {
                if (!m.getId().equals(id)) {
                    m.setPinned(false);
                    chatMessageRepository.save(m);
                }
            });
        }
        msg.setPinned(newPinned);
        chatMessageRepository.save(msg);
        return ResponseEntity.ok(toMap(msg));
    }

    // ── toMap helper ─────────────────────────────────────────────────────────
    private Map<String, Object> toMap(ChatMessage m) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id",                 m.getId());
        map.put("senderEnterpriseId", m.getSenderEnterpriseId());
        map.put("senderName",         m.getSenderName());
        map.put("senderRole",         m.getSenderRole());
        map.put("content",            Boolean.TRUE.equals(m.getDeleted()) ? "[This message was deleted]" : m.getContent());
        map.put("msgType",            m.getMsgType());
        map.put("deleted",            Boolean.TRUE.equals(m.getDeleted()));
        map.put("pinned",             Boolean.TRUE.equals(m.getPinned()));
        map.put("editedAt",           m.getEditedAt() != null ? m.getEditedAt().format(DateTimeFormatter.ISO_DATE_TIME) : null);
        map.put("replyToId",          m.getReplyToId());
        map.put("replyToContent",     m.getReplyToContent());
        map.put("replyToSender",      m.getReplyToSender());
        map.put("reactions",          m.getReactions() != null ? m.getReactions() : "{}");
        map.put("createdAt",          m.getCreatedAt() != null ? m.getCreatedAt().format(DateTimeFormatter.ISO_DATE_TIME) : null);
        return map;
    }

    private String truncate(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }
}
