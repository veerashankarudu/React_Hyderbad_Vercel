package com.accenture.quizhub.config;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Component;

/**
 * Custom health indicator that verifies the CacheManager is operational.
 * Appears as "cacheSystem" under /actuator/health.
 *
 * - Reports which implementation is active (Redis vs Caffeine fallback)
 * - Lists all registered cache names
 * - Reports DOWN only if CacheManager itself is null (should never happen)
 */
@Component("cacheSystem")
public class CacheHealthIndicator implements HealthIndicator {

    private final CacheManager cacheManager;

    public CacheHealthIndicator(CacheManager cacheManager) {
        this.cacheManager = cacheManager;
    }

    @Override
    public Health health() {
        try {
            String implName = cacheManager.getClass().getSimpleName();
            boolean isRedis = implName.contains("Redis") || implName.contains("redis");
            return Health.up()
                    .withDetail("implementation", implName)
                    .withDetail("mode", isRedis ? "distributed (Redis)" : "in-process (Caffeine fallback)")
                    .withDetail("caches", cacheManager.getCacheNames())
                    .build();
        } catch (Exception e) {
            return Health.down()
                    .withDetail("error", e.getMessage())
                    .build();
        }
    }
}
