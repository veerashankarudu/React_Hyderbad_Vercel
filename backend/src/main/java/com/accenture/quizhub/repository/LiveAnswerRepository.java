package com.accenture.quizhub.repository;

import com.accenture.quizhub.entity.LiveAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface LiveAnswerRepository extends JpaRepository<LiveAnswer, Long> {

    boolean existsBySessionIdAndParticipantIdAndQuestionId(
        Long sessionId, Long participantId, Long questionId);

    Optional<LiveAnswer> findBySessionIdAndParticipantIdAndQuestionId(
        Long sessionId, Long participantId, Long questionId);

    List<LiveAnswer> findBySessionIdAndParticipantId(Long sessionId, Long participantId);

    /** Most-missed question: question answered wrong the most times in a session */
    @Query("SELECT a.questionId, COUNT(a) AS wrongCount FROM LiveAnswer a " +
           "WHERE a.sessionId = :sessionId AND a.correct = false " +
           "GROUP BY a.questionId ORDER BY wrongCount DESC")
    List<Object[]> findMostMissedQuestion(Long sessionId);

    int countBySessionIdAndParticipantIdAndCorrectTrue(Long sessionId, Long participantId);

    long countBySessionId(Long sessionId);

    long countBySessionIdAndCorrect(Long sessionId, boolean correct);
}
