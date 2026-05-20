package com.accenture.quizhub.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "notifications",
    indexes = {
        @Index(name = "idx_notif_user",      columnList = "user_id"),
        @Index(name = "idx_notif_user_read",  columnList = "user_id, is_read")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "notif_type", nullable = false)
    private String type;

    @Column(name = "mcq_id")
    private Long mcqId;

    @Column(name = "actor_name")
    private String actorName;

    @Column(name = "actor_initials")
    private String actorInitials;

    @Column(name = "mcq_ref")
    private String mcqRef;

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private boolean read = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
