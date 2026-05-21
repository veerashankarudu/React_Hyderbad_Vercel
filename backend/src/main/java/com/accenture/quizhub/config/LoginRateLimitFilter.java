package com.accenture.quizhub.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Rate-limits POST /api/v1/auth/login to MAX_ATTEMPTS per IP within WINDOW_SECONDS.
 * After exceeding the limit the IP is blocked until the window expires.
 * Uses in-memory ConcurrentHashMap — sufficient for single-instance demo;
 * swap for Redis in multi-node production.
 */
@Slf4j
@Component
public class LoginRateLimitFilter extends OncePerRequestFilter {

    private static final int    MAX_ATTEMPTS     = 100;  // attempts allowed per window
    private static final long   WINDOW_SECONDS   = 60;   // rolling window length

    /** Per-IP attempt counter + window start time. */
    private record Bucket(AtomicInteger count, Instant windowStart) {}

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !("/api/v1/auth/login".equals(request.getRequestURI())
                && "POST".equalsIgnoreCase(request.getMethod()));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        String ip = resolveClientIp(request);
        Instant now = Instant.now();

        Bucket bucket = buckets.compute(ip, (k, existing) -> {
            if (existing == null || now.isAfter(existing.windowStart().plusSeconds(WINDOW_SECONDS))) {
                // New or expired window — reset
                return new Bucket(new AtomicInteger(1), now);
            }
            existing.count().incrementAndGet();
            return existing;
        });

        int attempts = bucket.count().get();
        long secondsLeft = WINDOW_SECONDS - (now.getEpochSecond() - bucket.windowStart().getEpochSecond());

        if (attempts > MAX_ATTEMPTS) {
            log.warn("🚫 Rate limit exceeded for IP {} — {} attempts in window", ip, attempts);
            response.setStatus(429);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write(
                "{\"error\":\"Too many login attempts. Please wait " + secondsLeft + " seconds before trying again.\"}"
            );
            return;
        }

        chain.doFilter(request, response);
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
