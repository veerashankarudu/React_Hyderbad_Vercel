package com.accenture.quizhub.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "audit_log",
    indexes = {
        @Index(name = "idx_audit_actor",     columnList = "actor_enterprise_id"),
        @Index(name = "idx_audit_timestamp", columnList = "timestamp")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "actor_enterprise_id", nullable = false)
    private String actorEnterpriseId;

    @Column(nullable = false)
    private String action; // USER_CREATED, ROLE_CHANGED, USER_APPROVED, USER_REJECTED, USER_ADDED_BY_ADMIN

    @Column(name = "target_enterprise_id")
    private String targetEnterpriseId;

    @Column(length = 500)
    private String details;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) timestamp = LocalDateTime.now();
    }
}
