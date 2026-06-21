package com.valkey.quizhub.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.List;

/**
 * Cache configuration with Redis as primary store and Caffeine as in-process fallback.
 *
 * On startup the bean probes Redis with a PING. If Redis responds → RedisCacheManager is used
 * (shared across all app instances, survives restarts). If Redis is unavailable → falls back
 * silently to CaffeineCacheManager (in-process, zero external dependency).
 *
 * To enable Redis: start Redis locally or set REDIS_HOST / REDIS_PORT env vars.
 * No code changes needed — the switch is fully automatic.
 */
@Configuration
public class CacheConfig {

    private static final Logger log = LoggerFactory.getLogger(CacheConfig.class);

    private static final List<String> CACHE_NAMES =
            List.of("techStacks", "topics", "mcqCount", "analytics", "reviewers");

    /** TTL: 5 minutes for all caches */
    private static final Duration TTL = Duration.ofMinutes(5);

    @Autowired(required = false)
    private RedisConnectionFactory redisConnectionFactory;

    @Bean
    @Primary
    public CacheManager cacheManager() {
        if (redisConnectionFactory != null && isRedisReachable()) {
            log.info("Cache: Redis is available — using RedisCacheManager (distributed, TTL={})", TTL);
            return buildRedisCacheManager();
        }
        log.info("Cache: Redis unavailable or not configured — using CaffeineCacheManager (in-process, TTL={})", TTL);
        return buildCaffeineCacheManager();
    }

    // ── Redis ─────────────────────────────────────────────────────────────────

    private boolean isRedisReachable() {
        try {
            redisConnectionFactory.getConnection().ping();
            return true;
        } catch (Exception ex) {
            log.warn("Cache: Redis ping failed ({}), falling back to Caffeine", ex.getMessage());
            return false;
        }
    }

    private CacheManager buildRedisCacheManager() {
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(TTL)
                .disableCachingNullValues()
                .serializeKeysWith(
                        RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(
                        RedisSerializationContext.SerializationPair.fromSerializer(
                                new GenericJackson2JsonRedisSerializer()));

        return RedisCacheManager.builder(redisConnectionFactory)
                .cacheDefaults(defaultConfig)
                .initialCacheNames(java.util.Set.copyOf(CACHE_NAMES))
                .build();
    }

    // ── Caffeine fallback ─────────────────────────────────────────────────────

    private CacheManager buildCaffeineCacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager();
        manager.setCacheNames(CACHE_NAMES);
        manager.setCaffeine(
                Caffeine.newBuilder()
                        .maximumSize(500)
                        .expireAfterWrite(TTL));
        return manager;
    }
}
