package com.valkey.quizhub.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CreateLiveSessionRequest {

    @NotNull(message = "Quiz ID is required")
    private Long quizId;

    @Min(value = 10, message = "Time limit must be at least 10 seconds")
    @Max(value = 300, message = "Time limit must not exceed 300 seconds")
    private int timeLimitSeconds = 30;

    /** Session mode: BATTLE (default) or POLL (anonymous, no scoring) */
    private String sessionMode = "BATTLE";

    /** Enable team mode (participants grouped into teams) */
    private boolean teamMode = false;

    /** Enable adaptive difficulty (questions adjust based on performance) */
    private boolean adaptiveDifficulty = false;

    /** Enable session recording for replay */
    private boolean recordingEnabled = false;

    /** Co-host enterprise ID (optional — auto-promoted on host disconnect) */
    private String cohostEnterpriseId;
}
