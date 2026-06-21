package com.valkey.quizhub.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "inbox_messages",
    indexes = {
        @Index(name = "idx_inbox_recipient", columnList = "recipient_id"),
        @Index(name = "idx_inbox_sender",    columnList = "sender_id")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InboxMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** null sender = system-generated message */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id")
    private User sender;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @Column(nullable = false)
    private String subject;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(name = "is_read", nullable = false)
    private boolean read = false;

    @Column(name = "is_starred", nullable = false)
    private boolean starred = false;

    /** USER = sent by a real user, SYSTEM = triggered by MCQ events */
    @Column(name = "message_type", nullable = false)
    private String messageType = "USER";

    @Column(name = "mcq_id")
    private Long mcqId;

    @CreationTimestamp
    @Column(name = "sent_at", nullable = false, updatable = false)
    private LocalDateTime sentAt;
}
