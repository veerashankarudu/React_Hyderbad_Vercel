package com.accenture.quizhub.entity;

import com.accenture.quizhub.enums.Difficulty;
import com.accenture.quizhub.enums.McqStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(
    name = "mcqs",
    indexes = {
        @Index(name = "idx_mcq_status",        columnList = "status"),
        @Index(name = "idx_mcq_creator",       columnList = "creator_id"),
        @Index(name = "idx_mcq_reviewer",      columnList = "reviewer_id"),
        @Index(name = "idx_mcq_tech_stack",    columnList = "tech_stack_id"),
        @Index(name = "idx_mcq_status_creator", columnList = "status, creator_id")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Mcq {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "question_stem", nullable = false, columnDefinition = "TEXT")
    private String questionStem;

    @Column(name = "option_a", nullable = false)
    private String optionA;

    @Column(name = "option_b", nullable = false)
    private String optionB;

    @Column(name = "option_c", nullable = false)
    private String optionC;

    @Column(name = "option_d", nullable = false)
    private String optionD;

    @Column(name = "correct_answer", nullable = false, length = 1)
    private String correctAnswer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Difficulty difficulty;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private McqStatus status = McqStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tech_stack_id")
    private TechStack techStack;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "topic_id")
    private Topic topic;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_id", nullable = false)
    private User creator;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewer_id")
    private User reviewer;

    @OneToMany(mappedBy = "mcq", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<ReviewComment> comments;

    @Version
    private Integer version;

    @Column(name = "ai_score")
    private Integer aiScore;

    @Column(name = "ai_risk", length = 10)
    private String aiRisk;

    @Transient
    private String aiWarning;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
