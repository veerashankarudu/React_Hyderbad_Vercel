package com.valkey.quizhub.controller;

import com.valkey.quizhub.entity.McqComment;
import com.valkey.quizhub.entity.User;
import com.valkey.quizhub.repository.McqCommentRepository;
import com.valkey.quizhub.repository.UserRepository;
import com.valkey.quizhub.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/v1/mcqs/{mcqId}/comments")
@RequiredArgsConstructor
public class McqCommentController {

    private final McqCommentRepository commentRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    private static final DateTimeFormatter FMT = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    // ── GET all comments for an MCQ ──────────────────────────────────────────
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getComments(@PathVariable Long mcqId) {
        List<McqComment> all = commentRepository.findByMcqIdOrderByCreatedAtAsc(mcqId);
        return ResponseEntity.ok(all.stream().map(this::toMap).toList());
    }

    // ── POST top-level comment ────────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<Map<String, Object>> addComment(
            @PathVariable Long mcqId,
            @RequestBody Map<String, String> body,
            Principal principal) {

        return saveComment(mcqId, null, body, principal);
    }

    // ── POST reply to a comment ───────────────────────────────────────────────
    @PostMapping("/{parentId}/reply")
    public ResponseEntity<Map<String, Object>> addReply(
            @PathVariable Long mcqId,
            @PathVariable Long parentId,
            @RequestBody Map<String, String> body,
            Principal principal) {

        return saveComment(mcqId, parentId, body, principal);
    }

    // ── DELETE own comment ────────────────────────────────────────────────────
    @DeleteMapping("/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Long mcqId,
            @PathVariable Long commentId,
            Principal principal) {

        commentRepository.findById(commentId).ifPresent(c -> {
            if (c.getAuthorEnterpriseId().equals(principal.getName())) {
                commentRepository.delete(c);
            }
        });
        return ResponseEntity.noContent().build();
    }

    // ── Shared save logic ─────────────────────────────────────────────────────
    private ResponseEntity<Map<String, Object>> saveComment(
            Long mcqId, Long parentId, Map<String, String> body, Principal principal) {

        String content = body.getOrDefault("content", "").trim();
        if (content.isBlank()) return ResponseEntity.badRequest().build();

        User author = userRepository.findByEnterpriseId(principal.getName()).orElseThrow();

        McqComment comment = commentRepository.save(McqComment.builder()
                .mcqId(mcqId)
                .authorEnterpriseId(author.getEnterpriseId())
                .authorName(author.getFullName())
                .content(content)
                .parentId(parentId)
                .build());

        // Notify @mentioned users
        Pattern pattern = Pattern.compile("@([\\w.]+)");
        Matcher matcher = pattern.matcher(content);
        Set<String> mentioned = new HashSet<>();
        while (matcher.find()) {
            String tag = matcher.group(1);
            if (mentioned.add(tag)) {
                userRepository.findByEnterpriseId(tag).ifPresent(target -> {
                    if (!target.getId().equals(author.getId())) {
                        notificationService.notify(target,
                                author.getFullName() + " mentioned you in a comment on MCQ #" + mcqId + ": \"" + truncate(content, 80) + "\"",
                                "MENTION", mcqId, author, "MCQ #" + mcqId);
                    }
                });
            }
        }

        // If this is a reply, notify the original comment author
        if (parentId != null) {
            commentRepository.findById(parentId).ifPresent(parent -> {
                if (!parent.getAuthorEnterpriseId().equals(author.getEnterpriseId())) {
                    userRepository.findByEnterpriseId(parent.getAuthorEnterpriseId()).ifPresent(target ->
                            notificationService.notify(target,
                                    author.getFullName() + " replied to your comment on MCQ #" + mcqId,
                                    "MENTION", mcqId, author, "MCQ #" + mcqId));
                }
            });
        }

        return ResponseEntity.ok(toMap(comment));
    }

    private Map<String, Object> toMap(McqComment c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("mcqId", c.getMcqId());
        m.put("authorEnterpriseId", c.getAuthorEnterpriseId());
        m.put("authorName", c.getAuthorName());
        m.put("content", c.getContent());
        m.put("parentId", c.getParentId());
        m.put("createdAt", c.getCreatedAt() != null ? FMT.format(c.getCreatedAt()) : null);
        return m;
    }

    private String truncate(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }
}
