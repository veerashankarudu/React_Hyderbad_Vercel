package com.accenture.quizhub.dto.websocket;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Sent to /topic/session/{id}/question when host advances to a question.
 * correctAnswer is OMITTED here — only revealed in QuestionResultPayload.
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class QuestionPayload {
    private Long questionId;
    private int questionIndex;
    private int totalQuestions;
    private String questionStem;
    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;
    private String difficulty;
    private int timeLimitSeconds;
    private LocalDateTime questionStartedAt;
}
