package com.accenture.quizhub.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "live_answer",
    uniqueConstraints = @UniqueConstraint(name = "uq_one_answer_per_question",
        columnNames = {"session_id", "participant_id", "question_id"}),
    indexes = {
        @Index(name = "idx_live_answer_session", columnList = "session_id"),
        @Index(name = "idx_live_answer_participant", columnList = "participant_id")
    })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @Column(name = "participant_id", nullable = false)
    private Long participantId;

    @Column(name = "question_id", nullable = false)
    private Long questionId;

    /** A | B | C | D */
    @Column(name = "selected_option", nullable = false, length = 1)
    private String selectedOption;

    @Column(name = "is_correct", nullable = false)
    private boolean correct;

    @Column(name = "points_earned", nullable = false)
    @Builder.Default
    private int pointsEarned = 0;

    @Column(name = "response_time_ms", nullable = false)
    private long responseTimeMs;

    @Column(name = "answered_at", nullable = false)
    private LocalDateTime answeredAt;
}
