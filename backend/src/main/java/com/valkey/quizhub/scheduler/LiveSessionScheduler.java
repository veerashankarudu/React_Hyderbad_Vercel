package com.valkey.quizhub.scheduler;

import com.valkey.quizhub.service.LiveSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Scheduled tasks for Live Quiz Battle session lifecycle management.
 * Requires @EnableScheduling on the main application class (already present via Spring Boot auto-config).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class LiveSessionScheduler {

    private static final int WAITING_EXPIRY_HOURS     = 2;
    private static final int HOST_DISCONNECT_TIMEOUT_MINUTES = 5;

    private final LiveSessionService liveSessionService;

    /**
     * Auto-expire WAITING sessions that have been open for more than 2 hours.
     * Runs every 10 minutes.
     */
    @Scheduled(fixedDelayString = "PT10M")
    public void expireStaleWaitingSessions() {
        LocalDateTime cutoff = LocalDateTime.now().minusHours(WAITING_EXPIRY_HOURS);
        log.debug("Running stale WAITING session expiry (cutoff={})", cutoff);
        liveSessionService.autoExpireWaitingSessions(cutoff);
    }

    /**
     * Auto-end ACTIVE sessions where the host has been disconnected for more than 5 minutes.
     * Runs every 2 minutes.
     */
    @Scheduled(fixedDelayString = "PT2M")
    public void endAbandonedActiveSessions() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(HOST_DISCONNECT_TIMEOUT_MINUTES);
        log.debug("Running abandoned session cleanup (cutoff={})", cutoff);
        liveSessionService.autoEndAbandonedSessions(cutoff);
    }
}
