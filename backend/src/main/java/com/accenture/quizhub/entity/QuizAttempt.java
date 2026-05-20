package com.accenture.quizhub.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "quiz_attempts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @Column(name = "candidate_name", nullable = false, length = 128)
    private String candidateName;

    @Column(name = "candidate_email", nullable = false, length = 256)
    private String candidateEmail;

    /** JSON: {"1":"A","2":"C",...} mcqId → chosen option */
    @Column(name = "answers", columnDefinition = "TEXT")
    private String answers;

    @Column(name = "score")
    private Integer score;

    @Column(name = "total_questions")
    private Integer totalQuestions;

    /** JSON: {"Spring Boot":{"correct":2,"total":3},...} */
    @Column(name = "topic_breakdown", columnDefinition = "TEXT")
    private String topicBreakdown;

    /** COMPLETED or TERMINATED */
    @Column(name = "status", length = 16)
    @Builder.Default
    private String status = "COMPLETED";

    @Column(name = "violation_count")
    @Builder.Default
    private int violationCount = 0;

    /** Base64 PNG of screenshot taken at first violation */
    @Column(name = "violation_screenshot", columnDefinition = "MEDIUMTEXT")
    private String violationScreenshot;

    @Column(name = "time_taken_seconds")
    private Integer timeTakenSeconds;

    @CreationTimestamp
    @Column(name = "submitted_at", updatable = false)
    private LocalDateTime submittedAt;
}
