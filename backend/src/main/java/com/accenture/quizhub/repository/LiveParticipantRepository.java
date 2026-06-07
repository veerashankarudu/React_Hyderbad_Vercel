package com.accenture.quizhub.repository;

import com.accenture.quizhub.entity.LiveParticipant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LiveParticipantRepository extends JpaRepository<LiveParticipant, Long> {

    List<LiveParticipant> findBySessionIdOrderByTotalScoreDesc(Long sessionId);

    Optional<LiveParticipant> findByRejoinToken(String rejoinToken);

    boolean existsBySessionIdAndDisplayName(Long sessionId, String displayName);

    int countBySessionId(Long sessionId);

    List<LiveParticipant> findBySessionId(Long sessionId);

    List<LiveParticipant> findByUserId(Long userId);
}
