package com.accenture.quizhub.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AnswerResultResponse {
    private boolean correct;
    private String correctAnswer;
    private int pointsEarned;
    private int totalScore;
    private long responseTimeMs;
    private int rank;
    private int totalParticipants;
}
