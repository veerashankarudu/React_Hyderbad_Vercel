package com.valkey.quizhub.dto.response;

import com.valkey.quizhub.dto.websocket.QuestionPayload;
import com.valkey.quizhub.enums.LiveSessionStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class LiveSessionResponse {
    private Long id;
    private String pin;
    private String quizTitle;
    private Long quizId;
    private LiveSessionStatus status;
    private int currentQuestionIndex;
    private int totalQuestions;
    private int timeLimitSeconds;
    private int participantCount;
    private String hostEnterpriseId;
    private LocalDateTime createdAt;
    private LocalDateTime startedAt;
    /** Seconds remaining on the current question (0 when not in question phase). For host reconnect. */
    private int questionTimeLeft;
    private boolean paused;
    /** Populated only when status=ACTIVE — the current question in progress (for host reconnect). */
    private QuestionPayload currentQuestion;
    /** Session mode: BATTLE or POLL */
    private String sessionMode;
    /** Team mode enabled */
    private boolean teamMode;
    /** Adaptive difficulty enabled */
    private boolean adaptiveDifficulty;
    /** Session recording enabled */
    private boolean recordingEnabled;
    /** Co-host enterprise ID */
    private String cohostEnterpriseId;
    /** Shareable invite link */
    private String inviteLink;
}
