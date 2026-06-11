package com.accenture.quizhub.service;

import com.accenture.quizhub.entity.AppConfig;
import com.accenture.quizhub.repository.AppConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AppConfigService {

    private final AppConfigRepository appConfigRepository;

    // Config keys
    public static final String MAX_REJECTION_LIMIT_ENABLED = "max_rejection_limit_enabled";
    public static final String MAX_REJECTION_COUNT = "max_rejection_count";
    public static final String SLA_BREACH_THRESHOLD_DAYS = "sla_breach_threshold_days";
    public static final String REVIEWER_METRICS_ENABLED = "reviewer_metrics_enabled";

    public Optional<String> getValue(String key) {
        return appConfigRepository.findByConfigKey(key).map(AppConfig::getConfigValue);
    }

    public String getValueOrDefault(String key, String defaultValue) {
        return getValue(key).orElse(defaultValue);
    }

    public boolean getBooleanOrDefault(String key, boolean defaultValue) {
        return getValue(key).map(v -> "true".equalsIgnoreCase(v)).orElse(defaultValue);
    }

    public int getIntOrDefault(String key, int defaultValue) {
        return getValue(key).map(v -> {
            try { return Integer.parseInt(v); } catch (NumberFormatException e) { return defaultValue; }
        }).orElse(defaultValue);
    }

    @Transactional
    public void setValue(String key, String value, String description) {
        AppConfig config = appConfigRepository.findByConfigKey(key)
                .orElse(AppConfig.builder().configKey(key).build());
        config.setConfigValue(value);
        if (description != null) config.setDescription(description);
        appConfigRepository.save(config);
    }

    @Transactional(readOnly = true)
    public Map<String, String> getAll() {
        return appConfigRepository.findAll().stream()
                .collect(Collectors.toMap(AppConfig::getConfigKey, AppConfig::getConfigValue));
    }

    @Transactional(readOnly = true)
    public List<AppConfig> getAllConfigs() {
        return appConfigRepository.findAll();
    }

    // --- Convenience methods for rejection limit ---

    public boolean isRejectionLimitEnabled() {
        return getBooleanOrDefault(MAX_REJECTION_LIMIT_ENABLED, false);
    }

    public int getMaxRejectionCount() {
        return getIntOrDefault(MAX_REJECTION_COUNT, 3);
    }

    // --- Convenience methods for SLA / reviewer metrics ---

    public int getSlaBreachThresholdDays() {
        return getIntOrDefault(SLA_BREACH_THRESHOLD_DAYS, 2);
    }

    public boolean isReviewerMetricsEnabled() {
        return getBooleanOrDefault(REVIEWER_METRICS_ENABLED, true);
    }
}
