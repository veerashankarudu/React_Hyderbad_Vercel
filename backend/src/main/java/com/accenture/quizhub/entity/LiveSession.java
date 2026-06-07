package com.accenture.quizhub.entity;

import com.accenture.quizhub.enums.LiveSessionStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "live_session", indexes = {
    @Index(name = "idx_live_session_pin", columnList = "pin"),
    @Index(name = "idx_live_session_status", columnList = "status"),
    @Index(name = "idx_live_session_host", columnList = "host_user_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "quiz_id", nullable = false)
    private Long quizId;

    @Column(name = "quiz_title", nullable = false)
    private String quizTitle;

    /** Comma-separated MCQ IDs in shuffled order, fixed at session creation */
    @Column(name = "mcq_ids", nullable = false, columnDefinition = "TEXT")
    private String mcqIds;

    @Column(name = "host_user_id", nullable = false)
    private Long hostUserId;

    @Column(name = "host_enterprise_id", nullable = false, length = 64)
    private String hostEnterpriseId;

    @Column(name = "pin", nullable = false, length = 6)
    private String pin;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private LiveSessionStatus status = LiveSessionStatus.WAITING;

    @Column(name = "current_question_index", nullable = false)
    @Builder.Default
    private int currentQuestionIndex = 0;

    @Column(name = "time_limit_seconds", nullable = false)
    @Builder.Default
    private int timeLimitSeconds = 30;

    @Column(name = "question_started_at")
    private LocalDateTime questionStartedAt;

    @Column(name = "is_paused", nullable = false)
    @Builder.Default
    private boolean paused = false;

    @Column(name = "host_disconnected_at")
    private LocalDateTime hostDisconnectedAt;

    /** Co-host user ID — auto-promoted to host on host disconnect */
    @Column(name = "cohost_user_id")
    private Long cohostUserId;

    @Column(name = "cohost_enterprise_id", length = 64)
    private String cohostEnterpriseId;

    /** Session mode: BATTLE (default scored) or POLL (anonymous, no scoring) */
    @Column(name = "session_mode", nullable = false, length = 16)
    @Builder.Default
    private String sessionMode = "BATTLE";

    /** Team mode: true = participants are assigned to teams */
    @Column(name = "team_mode", nullable = false)
    @Builder.Default
    private boolean teamMode = false;

    /** Adaptive difficulty: true = next question difficulty adjusts based on performance */
    @Column(name = "adaptive_difficulty", nullable = false)
    @Builder.Default
    private boolean adaptiveDifficulty = false;

    /** Recording enabled: true = events are recorded for replay */
    @Column(name = "recording_enabled", nullable = false)
    @Builder.Default
    private boolean recordingEnabled = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;
}
