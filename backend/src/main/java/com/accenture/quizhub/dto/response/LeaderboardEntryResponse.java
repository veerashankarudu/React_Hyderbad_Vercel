package com.accenture.quizhub.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LeaderboardEntryResponse {
    private int rank;
    private Long participantId;
    private String displayName;
    private int totalScore;
    private int correctCount;
    private int totalQuestions;
    private boolean isCurrentUser;
}
