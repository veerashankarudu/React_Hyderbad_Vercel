package com.valkey.quizhub.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class JoinLiveSessionResponse {
    private Long sessionId;
    private Long participantId;
    private String displayName;
    private String rejoinToken;
    private String quizTitle;
    private int timeLimitSeconds;
    private LocalDateTime joinedAt;
}
