package com.valkey.quizhub.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Rate-limits sensitive endpoints per IP using Redis sliding-window counters.
 * Cluster-safe: all instances share the same Redis counter.
 * Falls back to in-memory ConcurrentHashMap if Redis is unavailable.
 *
 * Redis key format:  rl:{endpoint_type}:{ip}
 * TTL is set to WINDOW_SECONDS on first increment — auto-expires.
 */
@Slf4j
@Component
public class LoginRateLimitFilter extends OncePerRequestFilter {

    private static final int  MAX_ATTEMPTS           = 100;
    private static final int  MAX_JOIN_ATTEMPTS      = 10;
    private static final int  MAX_VALIDATE_ATTEMPTS  = 20;
    private static final int  MAX_MCQ_WRITE_ATTEMPTS = 60;
    private static final int  MAX_AI_ATTEMPTS        = 60;
    private static final long WINDOW_SECONDS         = 60;

    @Autowired(required = false)
    private StringRedisTemplate redisTemplate;

    /** Fallback in-memory buckets (used when Redis is unavailable) */
    private record Bucket(AtomicInteger count, Instant windowStart) {}
    private final ConcurrentHashMap<String, Bucket> fallbackBuckets = new ConcurrentHashMap<>();

    private enum EndpointType { LOGIN, JOIN, VALIDATE, MCQ_WRITE, AI_GENERATE, OTHER }

    private EndpointType classify(HttpServletRequest request) {
        String uri    = request.getRequestURI();
        String method = request.getMethod();
        if ("POST".equalsIgnoreCase(method) && "/api/v1/auth/login".equals(uri))                     return EndpointType.LOGIN;
        if ("POST".equalsIgnoreCase(method) && uri.matches("/api/v1/live/sessions/[^/]+/join"))      return EndpointType.JOIN;
        if ("GET".equalsIgnoreCase(method)  && uri.matches("/api/v1/live/sessions/[^/]+/validate"))  return EndpointType.VALIDATE;
        if ("POST".equalsIgnoreCase(method) && uri.startsWith("/api/v1/ai/"))                        return EndpointType.AI_GENERATE;
        if ("POST".equalsIgnoreCase(method) && "/api/v1/mcqs".equals(uri))                           return EndpointType.MCQ_WRITE;
        return EndpointType.OTHER;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return classify(request) == EndpointType.OTHER;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        String ip   = resolveClientIp(request);
        EndpointType type = classify(request);

        int maxAllowed = switch (type) {
            case JOIN        -> MAX_JOIN_ATTEMPTS;
            case VALIDATE    -> MAX_VALIDATE_ATTEMPTS;
            case MCQ_WRITE   -> MAX_MCQ_WRITE_ATTEMPTS;
            case AI_GENERATE -> MAX_AI_ATTEMPTS;
            default          -> MAX_ATTEMPTS;
        };

        int attempts = increment(type.name().toLowerCase(), ip);

        if (attempts > maxAllowed) {
            log.warn("Rate limit exceeded for IP {} on {} — {} attempts in {}s window", ip, type, attempts, WINDOW_SECONDS);
            response.setStatus(429);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write(
                "{\"error\":\"Too many requests. Please wait " + WINDOW_SECONDS + " seconds before trying again.\"}"
            );
            return;
        }

        chain.doFilter(request, response);
    }

    /**
     * Increments the counter for (endpoint, ip) and returns the new count.
     * Uses Redis INCR + EXPIRE if Redis is available, otherwise falls back to in-memory.
     */
    private int increment(String endpoint, String ip) {
        if (redisTemplate != null) {
            try {
                String key = "rl:" + endpoint + ":" + ip;
                Long count = redisTemplate.opsForValue().increment(key);
                if (count != null && count == 1) {
                    // First increment — set TTL so the key auto-expires after the window
                    redisTemplate.expire(key, WINDOW_SECONDS, TimeUnit.SECONDS);
                }
                return count != null ? count.intValue() : 1;
            } catch (Exception e) {
                log.debug("Redis rate-limit unavailable, falling back to in-memory: {}", e.getMessage());
            }
        }
        // In-memory fallback
        String key = endpoint + ":" + ip;
        Instant now = Instant.now();
        Bucket bucket = fallbackBuckets.compute(key, (k, existing) -> {
            if (existing == null || now.isAfter(existing.windowStart().plusSeconds(WINDOW_SECONDS))) {
                return new Bucket(new AtomicInteger(1), now);
            }
            existing.count().incrementAndGet();
            return existing;
        });
        return bucket.count().get();
    }

    /** Resolves real client IP, honouring X-Forwarded-For (proxy/load-balancer). */
    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
