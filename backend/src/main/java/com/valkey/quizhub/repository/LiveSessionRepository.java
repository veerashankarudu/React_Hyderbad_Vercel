package com.valkey.quizhub.repository;

import com.valkey.quizhub.entity.LiveSession;
import com.valkey.quizhub.enums.LiveSessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface LiveSessionRepository extends JpaRepository<LiveSession, Long> {

    Optional<LiveSession> findByPin(String pin);

    Optional<LiveSession> findByPinAndStatusIn(String pin, List<LiveSessionStatus> statuses);

    boolean existsByPinAndStatusIn(String pin, List<LiveSessionStatus> statuses);

    List<LiveSession> findByStatus(LiveSessionStatus status);

    List<LiveSession> findByHostUserIdAndStatus(Long hostUserId, LiveSessionStatus status);

    /** Sessions stuck in WAITING for more than the given time — for auto-expiry */
    @Query("SELECT s FROM LiveSession s WHERE s.status = 'WAITING' AND s.createdAt < :cutoff")
    List<LiveSession> findExpiredWaitingSessions(LocalDateTime cutoff);

    /** Active sessions where host has been disconnected beyond the given time */
    @Query("SELECT s FROM LiveSession s WHERE s.status = 'ACTIVE' AND s.hostDisconnectedAt IS NOT NULL AND s.hostDisconnectedAt < :cutoff")
    List<LiveSession> findAbandonedActiveSessions(LocalDateTime cutoff);

    /** Active sessions with no createdAt guard — for server-restart recovery */
    @Query("SELECT s FROM LiveSession s WHERE s.status = 'ACTIVE'")
    List<LiveSession> findAllActiveSessions();

    /** All sessions for a host, newest first */
    List<LiveSession> findByHostUserIdOrderByCreatedAtDesc(Long hostUserId);

    /** Check if host has an existing WAITING or ACTIVE session for the same quiz */
    Optional<LiveSession> findFirstByHostUserIdAndQuizIdAndStatusIn(Long hostUserId, Long quizId, List<LiveSessionStatus> statuses);
}
