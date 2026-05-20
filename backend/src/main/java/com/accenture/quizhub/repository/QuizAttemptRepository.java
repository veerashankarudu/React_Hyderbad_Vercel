package com.accenture.quizhub.repository;

import com.accenture.quizhub.entity.QuizAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, Long> {
    List<QuizAttempt> findBySessionIdOrderBySubmittedAtDesc(Long sessionId);
    Optional<QuizAttempt> findBySessionIdAndCandidateEmail(Long sessionId, String email);
    boolean existsBySessionIdAndCandidateEmail(Long sessionId, String email);

    @org.springframework.data.jpa.repository.Query(
        "SELECT a FROM QuizAttempt a WHERE " +
        "(:sessionId IS NULL OR a.sessionId = :sessionId) AND " +
        "(:from IS NULL OR a.submittedAt >= :from) AND " +
        "(:to   IS NULL OR a.submittedAt <= :to) " +
        "ORDER BY a.score DESC, a.timeTakenSeconds ASC, a.submittedAt ASC"
    )
    List<QuizAttempt> findLeaderboard(
        @org.springframework.data.repository.query.Param("sessionId") Long sessionId,
        @org.springframework.data.repository.query.Param("from") java.time.LocalDateTime from,
        @org.springframework.data.repository.query.Param("to")   java.time.LocalDateTime to
    );
}
