package com.valkey.quizhub.repository;

import com.valkey.quizhub.entity.ReviewComment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReviewCommentRepository extends JpaRepository<ReviewComment, Long> {
    List<ReviewComment> findByMcqIdOrderByCreatedAtDesc(Long mcqId);
}
