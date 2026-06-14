package com.accenture.quizhub.config;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import java.security.Key;
import java.util.Arrays;
import java.util.Date;
import java.util.concurrent.TimeUnit;

@Component
public class JwtUtil {

    private static final String DEV_FALLBACK_SECRET = "QuizHubAI-Hack-N-Stack-2026-SecretKey-Min32Chars!";

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.expiration-ms}")
    private long expirationMs;

    private final Environment environment;

    @Autowired(required = false)
    private StringRedisTemplate redisTemplate;

    private static final String BLACKLIST_PREFIX = "jwt:blacklist:";

    public JwtUtil(Environment environment) {
        this.environment = environment;
    }

    @PostConstruct
    void validateSecret() {
        boolean isProd = Arrays.asList(environment.getActiveProfiles()).contains("prod");
        if (isProd && DEV_FALLBACK_SECRET.equals(secret)) {
            throw new IllegalStateException(
                "SECURITY: JWT_SECRET env var is not set or is using the dev fallback. " +
                "Set a strong JWT_SECRET (64+ chars) before starting in production.");
        }
        if (secret.length() < 32) {
            throw new IllegalStateException(
                "SECURITY: JWT secret must be at least 32 characters. Current length: " + secret.length());
        }
    }

    private Key getKey() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    public String generateToken(String enterpriseId, String role) {
        return Jwts.builder()
                .setSubject(enterpriseId)
                .claim("role", role)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(getKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractEnterpriseId(String token) {
        return getClaims(token).getSubject();
    }

    public String extractRole(String token) {
        return getClaims(token).get("role", String.class);
    }

    public boolean isTokenValid(String token) {
        try {
            getClaims(token);
            return !isBlacklisted(token);
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    /**
     * Blacklists a JWT so it is rejected on all future requests.
     * TTL = remaining validity of the token — auto-expires from Redis.
     * Falls back silently if Redis is unavailable (token still expires naturally via JWT exp).
     */
    public void blacklist(String token) {
        if (redisTemplate == null) return;
        try {
            long ttlMs = getClaims(token).getExpiration().getTime() - System.currentTimeMillis();
            if (ttlMs > 0) {
                redisTemplate.opsForValue().set(
                    BLACKLIST_PREFIX + token, "1", ttlMs, TimeUnit.MILLISECONDS);
            }
        } catch (Exception ignored) { /* token already expired or Redis down */ }
    }

    private boolean isBlacklisted(String token) {
        if (redisTemplate == null) return false;
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(BLACKLIST_PREFIX + token));
        } catch (Exception e) {
            return false; // Redis down — allow (fail open; token still expires via JWT exp)
        }
    }

    private Claims getClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
