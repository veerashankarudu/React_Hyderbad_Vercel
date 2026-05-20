package com.accenture.quizhub.repository;

import com.accenture.quizhub.entity.TechStack;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface TechStackRepository extends JpaRepository<TechStack, Long> {
    Optional<TechStack> findByNameIgnoreCase(String name);
}
