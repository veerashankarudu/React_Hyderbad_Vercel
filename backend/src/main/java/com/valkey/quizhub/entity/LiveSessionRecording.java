package com.valkey.quizhub.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "live_session_recording", indexes = {
    @Index(name = "idx_recording_session_seq", columnList = "session_id, sequence_num")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveSessionRecording {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    /** Monotonically increasing per session — used for ordered replay */
    @Column(name = "sequence_num", nullable = false)
    private int sequenceNum;

    /** Event type: QUESTION_STARTED, ANSWER_SUBMITTED, LEADERBOARD_UPDATE, SESSION_ENDED, etc. */
    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType;

    /** JSON payload of the event */
    @Column(name = "payload", columnDefinition = "TEXT")
    private String payload;

    /** Milliseconds since session started — used for timed replay */
    @Column(name = "elapsed_ms", nullable = false)
    @Builder.Default
    private long elapsedMs = 0;

    @CreationTimestamp
    @Column(name = "recorded_at", updatable = false)
    private LocalDateTime recordedAt;
}
