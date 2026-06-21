package com.valkey.quizhub.repository;

import com.valkey.quizhub.entity.AppConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AppConfigRepository extends JpaRepository<AppConfig, String> {
    Optional<AppConfig> findByConfigKey(String configKey);
}
