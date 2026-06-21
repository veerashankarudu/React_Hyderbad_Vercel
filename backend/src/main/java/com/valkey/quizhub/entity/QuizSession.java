package com.valkey.quizhub.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "quiz_sessions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    /** UUID share token — used in the public link */
    @Column(name = "share_token", nullable = false, unique = true, length = 64)
    private String shareToken;

    /** Comma-separated MCQ ids in the fixed order for this session */
    @Column(name = "mcq_ids", nullable = false, columnDefinition = "TEXT")
    private String mcqIds;

    @Column(name = "time_limit_minutes", nullable = false)
    @Builder.Default
    private int timeLimitMinutes = 30;

    /** Who created this session (enterprise ID) */
    @Column(name = "created_by", nullable = false, length = 64)
    private String createdBy;

    @Column(name = "created_by_name", length = 128)
    private String createdByName;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    /** Link expires 3 hours after creation */
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;
}
