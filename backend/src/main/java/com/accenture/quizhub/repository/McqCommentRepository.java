package com.accenture.quizhub.repository;

import com.accenture.quizhub.entity.McqComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface McqCommentRepository extends JpaRepository<McqComment, Long> {
    List<McqComment> findByMcqIdOrderByCreatedAtAsc(Long mcqId);
}
