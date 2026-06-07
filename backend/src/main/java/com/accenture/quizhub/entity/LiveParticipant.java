package com.accenture.quizhub.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "live_participant",
    uniqueConstraints = @UniqueConstraint(name = "uq_session_display_name",
        columnNames = {"session_id", "display_name"}),
    indexes = {
        @Index(name = "idx_live_participant_session", columnList = "session_id"),
        @Index(name = "idx_live_participant_token", columnList = "rejoin_token")
    })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    /** Null for guests */
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "display_name", nullable = false, length = 50)
    private String displayName;

    /** Team name for team battle mode (null for individual mode) */
    @Column(name = "team_name", length = 50)
    private String teamName;

    /** UUID issued on join — used to authenticate reconnects */
    @Column(name = "rejoin_token", nullable = false, length = 36, unique = true)
    private String rejoinToken;

    @Column(name = "total_score", nullable = false)
    @Builder.Default
    private int totalScore = 0;

    @Column(name = "participant_rank")
    private Integer rank;

    /** FALSE = kicked by host */
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "joined_at", nullable = false)
    private LocalDateTime joinedAt;
}
