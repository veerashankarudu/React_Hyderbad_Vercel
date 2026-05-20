package com.accenture.quizhub.repository;

import com.accenture.quizhub.entity.Mcq;
import com.accenture.quizhub.enums.McqStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.time.LocalDateTime;

public interface McqRepository extends JpaRepository<Mcq, Long>, JpaSpecificationExecutor<Mcq> {

    Page<Mcq> findByCreatorId(Long creatorId, Pageable pageable);

    Page<Mcq> findByCreatorIdAndStatus(Long creatorId, McqStatus status, Pageable pageable);

    Page<Mcq> findByReviewerId(Long reviewerId, Pageable pageable);

    Page<Mcq> findByReviewerIdAndStatus(Long reviewerId, McqStatus status, Pageable pageable);

    @Query("SELECT m FROM Mcq m WHERE m.creator.id = :creatorId AND " +
           "(:status IS NULL OR m.status = :status) AND " +
           "(:search IS NULL OR LOWER(m.questionStem) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Mcq> findByCreatorWithFilters(@Param("creatorId") Long creatorId,
                                       @Param("status") McqStatus status,
                                       @Param("search") String search,
                                       Pageable pageable);

    // Duplicate detection — exact stem match (case-insensitive)
    boolean existsByQuestionStemIgnoreCase(String questionStem);

    // Find the existing MCQ by stem (to get its id for linking)
    java.util.Optional<Mcq> findFirstByQuestionStemIgnoreCase(String questionStem);

    // Count by status for global stats
    long countByStatus(McqStatus status);

    // Count by creator
    long countByCreatorId(Long creatorId);

    // Count by creator + status
    long countByCreatorIdAndStatus(Long creatorId, McqStatus status);

    // Per-tech-stack question counts: returns [techStackName, count]
    @Query("SELECT m.techStack.name, COUNT(m) FROM Mcq m GROUP BY m.techStack.name ORDER BY COUNT(m) DESC")
    List<Object[]> countByTechStack();

    // Date-range variants for analytics
    @Query("SELECT COUNT(m) FROM Mcq m WHERE m.createdAt BETWEEN :from AND :to")
    long countByDateRange(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT COUNT(m) FROM Mcq m WHERE m.status = :status AND m.createdAt BETWEEN :from AND :to")
    long countByStatusAndDateRange(@Param("status") McqStatus status, @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT COUNT(m) FROM Mcq m WHERE m.creator.id = :creatorId AND m.createdAt BETWEEN :from AND :to")
    long countByCreatorIdAndDateRange(@Param("creatorId") Long creatorId, @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT COUNT(m) FROM Mcq m WHERE m.creator.id = :creatorId AND m.status = :status AND m.createdAt BETWEEN :from AND :to")
    long countByCreatorIdAndStatusAndDateRange(@Param("creatorId") Long creatorId, @Param("status") McqStatus status, @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT m.techStack.name, COUNT(m) FROM Mcq m WHERE m.createdAt BETWEEN :from AND :to GROUP BY m.techStack.name ORDER BY COUNT(m) DESC")
    List<Object[]> countByTechStackAndDateRange(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    // For export: all MCQs in date range with associations eagerly loaded
    @Query("SELECT m FROM Mcq m JOIN FETCH m.creator LEFT JOIN FETCH m.techStack LEFT JOIN FETCH m.topic LEFT JOIN FETCH m.reviewer WHERE m.createdAt BETWEEN :from AND :to ORDER BY m.createdAt DESC")
    List<Mcq> findAllForExport(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT m FROM Mcq m JOIN FETCH m.creator LEFT JOIN FETCH m.techStack LEFT JOIN FETCH m.topic LEFT JOIN FETCH m.reviewer ORDER BY m.createdAt DESC")
    List<Mcq> findAllForExport();

    // Leaderboard: top reviewers by review count (any status they reviewed)
    @Query("SELECT m.reviewer.id, m.reviewer.fullName, m.reviewer.enterpriseId, COUNT(m) as cnt " +
           "FROM Mcq m WHERE m.reviewer IS NOT NULL " +
           "AND (m.status = com.accenture.quizhub.enums.McqStatus.APPROVED OR m.status = com.accenture.quizhub.enums.McqStatus.REJECTED) " +
           "GROUP BY m.reviewer.id, m.reviewer.fullName, m.reviewer.enterpriseId " +
           "ORDER BY cnt DESC")
    List<Object[]> topReviewers(Pageable pageable);

    // Recent activity: last N MCQs with status changes
    @Query("SELECT m FROM Mcq m JOIN FETCH m.creator LEFT JOIN FETCH m.techStack ORDER BY m.updatedAt DESC")
    List<Mcq> findRecentActivity(Pageable pageable);

    // Count by reviewer id
    long countByReviewerId(Long reviewerId);

    // Count by reviewer + status
    long countByReviewerIdAndStatus(Long reviewerId, McqStatus status);

    // Per-tech-stack review count for a specific reviewer
    @Query("SELECT m.techStack.name, COUNT(m) FROM Mcq m WHERE m.reviewer.id = :reviewerId GROUP BY m.techStack.name ORDER BY COUNT(m) DESC")
    List<Object[]> countReviewedByTechStack(@Param("reviewerId") Long reviewerId);

    // MCQs that have been in READY_FOR_REVIEW or UNDER_REVIEW longer than the given threshold
    @Query("SELECT m FROM Mcq m WHERE m.status IN :statuses AND m.updatedAt < :threshold ORDER BY m.updatedAt ASC")
    List<Mcq> findSlaBreached(@Param("statuses") List<McqStatus> statuses, @Param("threshold") java.time.LocalDateTime threshold);

    // All reviewers with their review stats (approved + rejected only = completed reviews)
    @Query("SELECT m.reviewer.id, m.reviewer.fullName, m.reviewer.enterpriseId, " +
           "COUNT(m) as total, " +
           "SUM(CASE WHEN m.status = com.accenture.quizhub.enums.McqStatus.APPROVED THEN 1 ELSE 0 END) as approved, " +
           "SUM(CASE WHEN m.status = com.accenture.quizhub.enums.McqStatus.REJECTED THEN 1 ELSE 0 END) as rejected, " +
           "SUM(CASE WHEN m.status = com.accenture.quizhub.enums.McqStatus.UNDER_REVIEW THEN 1 ELSE 0 END) as pending " +
           "FROM Mcq m WHERE m.reviewer IS NOT NULL " +
           "GROUP BY m.reviewer.id, m.reviewer.fullName, m.reviewer.enterpriseId " +
           "ORDER BY total DESC")
    List<Object[]> reviewerPerformanceMetrics();
}
