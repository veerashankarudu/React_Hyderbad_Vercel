package com.accenture.quizhub.dto.websocket;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.accenture.quizhub.dto.response.LeaderboardEntryResponse;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * Sent to /topic/session/{id}/question-result when the timer ends or host ends the question.
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class QuestionResultPayload {
    private Long questionId;
    private int questionIndex;
    private String correctAnswer;
    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;
    private Map<String, Long> optionCounts;   // "A"->3, "B"->1 …
    private List<LeaderboardEntryResponse> leaderboard;
    private int answeredCount;
    private int totalParticipants;
}
