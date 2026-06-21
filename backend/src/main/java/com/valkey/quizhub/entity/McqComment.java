package com.valkey.quizhub.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "mcq_comments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class McqComment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "mcq_id", nullable = false)
    private Long mcqId;

    @Column(name = "author_enterprise_id", nullable = false, length = 64)
    private String authorEnterpriseId;

    @Column(name = "author_name", length = 128)
    private String authorName;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    /** null = top-level comment; non-null = reply to that comment id */
    @Column(name = "parent_id")
    private Long parentId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
