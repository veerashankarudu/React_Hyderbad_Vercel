package com.valkey.quizhub.repository;

import com.valkey.quizhub.entity.CodingQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CodingQuestionRepository extends JpaRepository<CodingQuestion, Long> {
    List<CodingQuestion> findByCreatorId(Long creatorId);
}
