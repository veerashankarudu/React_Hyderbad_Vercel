package com.valkey.quizhub.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.util.List;

@Entity
@Table(name = "tech_stacks")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TechStack {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String name;

    @OneToMany(mappedBy = "techStack", fetch = FetchType.LAZY)
    @JsonIgnore
    private List<Topic> topics;
}
