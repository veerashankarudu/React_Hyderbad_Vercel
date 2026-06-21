package com.valkey.quizhub.dto.response;

import com.valkey.quizhub.enums.LiveSessionStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class LiveSessionSummaryResponse {
    private Long id;
    private String pin;
    private String quizTitle;
    private Long quizId;
    private LiveSessionStatus status;
    private int totalQuestions;
    private int participantCount;
    private int timeLimitSeconds;
    private LocalDateTime createdAt;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
    /** Top player display name — null if no participants */
    private String winnerDisplayName;
    /** Top player score — 0 if no participants */
    private int winnerScore;
}
