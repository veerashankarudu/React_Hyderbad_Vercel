package com.valkey.quizhub.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat_messages")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sender_enterprise_id", nullable = false, length = 64)
    private String senderEnterpriseId;

    @Column(name = "sender_name", length = 128)
    private String senderName;

    /** "SME" or "ADMIN" — stored for display in chat */
    @Column(name = "sender_role", length = 16)
    private String senderRole;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    /** "USER" or "BOT" */
    @Column(name = "msg_type", length = 16)
    @Builder.Default
    private String msgType = "USER";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // ── Reply threading ──────────────────────────────────────────────────────

    @Column(name = "reply_to_id")
    private Long replyToId;

    @Column(name = "reply_to_content", columnDefinition = "TEXT")
    private String replyToContent;

    @Column(name = "reply_to_sender", length = 128)
    private String replyToSender;

    // ── Reactions: JSON {"👍":["alice","bob"],"❤️":["carol"]} ────────────────

    @Column(name = "reactions", columnDefinition = "TEXT")
    @Builder.Default
    private String reactions = "{}";

    // ── Moderation ───────────────────────────────────────────────────────────

    @Column(name = "pinned", columnDefinition = "boolean default false")
    @Builder.Default
    private Boolean pinned = false;

    @Column(name = "deleted", columnDefinition = "boolean default false")
    @Builder.Default
    private Boolean deleted = false;

    @Column(name = "edited_at")
    private LocalDateTime editedAt;
}
