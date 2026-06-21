package com.valkey.quizhub.dto.websocket;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

/**
 * Generic WebSocket event broadcast to /topic/session/{id}/events
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class LiveSessionEvent {

    public enum Type {
        PARTICIPANT_JOINED,
        PARTICIPANT_LEFT,
        PARTICIPANT_KICKED,
        SESSION_STARTED,
        QUESTION_STARTED,
        QUESTION_ENDED,
        ANSWER_SUBMITTED,
        LEADERBOARD_UPDATE,
        SESSION_PAUSED,
        SESSION_RESUMED,
        SESSION_ENDED,
        HOST_RECONNECTED,
        HOST_DISCONNECTED
    }

    private Type type;
    private Object payload;
}
