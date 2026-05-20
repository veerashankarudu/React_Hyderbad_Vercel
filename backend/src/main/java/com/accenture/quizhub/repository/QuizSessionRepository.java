package com.accenture.quizhub.repository;

import com.accenture.quizhub.entity.QuizSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface QuizSessionRepository extends JpaRepository<QuizSession, Long> {
    Optional<QuizSession> findByShareToken(String shareToken);
    List<QuizSession> findByCreatedByOrderByCreatedAtDesc(String createdBy);
}
