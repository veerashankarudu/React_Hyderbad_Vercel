package com.valkey.quizhub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Snapshot of an MCQ at the moment it is edited.
 * One row per save-event. Allows "version history" view.
 */
@Entity
@Table(name = "mcq_versions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class McqVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "mcq_id", nullable = false)
    private Long mcqId;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Column(name = "question_stem", columnDefinition = "TEXT")
    private String questionStem;

    @Column(name = "option_a")
    private String optionA;

    @Column(name = "option_b")
    private String optionB;

    @Column(name = "option_c")
    private String optionC;

    @Column(name = "option_d")
    private String optionD;

    @Column(name = "correct_answer", length = 1)
    private String correctAnswer;

    @Column(name = "difficulty", length = 20)
    private String difficulty;

    /** Who made the change */
    @Column(name = "changed_by_name")
    private String changedByName;

    @Column(name = "changed_by_enterprise_id")
    private String changedByEnterpriseId;

    /** Status of the MCQ at the time of this snapshot */
    @Column(name = "status_at_time", length = 30)
    private String statusAtTime;

    @Column(name = "change_note", length = 500)
    private String changeNote;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
