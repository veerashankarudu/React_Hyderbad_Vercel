package com.valkey.quizhub.repository;

import com.valkey.quizhub.entity.TechStack;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface TechStackRepository extends JpaRepository<TechStack, Long> {
    Optional<TechStack> findByNameIgnoreCase(String name);
}
