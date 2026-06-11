package com.accenture.quizhub.repository;

import com.accenture.quizhub.entity.AppConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AppConfigRepository extends JpaRepository<AppConfig, String> {
    Optional<AppConfig> findByConfigKey(String configKey);
}
