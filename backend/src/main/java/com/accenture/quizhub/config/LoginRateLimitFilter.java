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
 * Also rate-limits live session join (10/min), PIN validation (20/min),
 * MCQ creation (30/min), and AI generation (10/min).
 * After exceeding the limit the IP is blocked until the window expires.
 * Uses in-memory ConcurrentHashMap — sufficient for single-instance demo;
 * swap for Redis in multi-node production.
 */
@Slf4j
@Component
public class LoginRateLimitFilter extends OncePerRequestFilter {

    private static final int    MAX_ATTEMPTS           = 100; // login attempts
    private static final int    MAX_JOIN_ATTEMPTS      = 10;  // join attempts per minute
    private static final int    MAX_VALIDATE_ATTEMPTS  = 20;  // validate attempts per minute
    private static final int    MAX_MCQ_WRITE_ATTEMPTS = 60;  // MCQ create/update per minute
    private static final int    MAX_AI_ATTEMPTS        = 60;  // AI generation per minute
    private static final long   WINDOW_SECONDS         = 60;

    /** Per-IP-per-endpoint attempt counter + window start time. */
    private record Bucket(AtomicInteger count, Instant windowStart) {}

    // Separate bucket maps per endpoint category
    private final ConcurrentHashMap<String, Bucket> loginBuckets    = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> joinBuckets     = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> validateBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> mcqWriteBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> aiBuckets       = new ConcurrentHashMap<>();

    private enum EndpointType { LOGIN, JOIN, VALIDATE, MCQ_WRITE, AI_GENERATE, OTHER }

    private EndpointType classify(HttpServletRequest request) {
        String uri    = request.getRequestURI();
        String method = request.getMethod();
        if ("POST".equalsIgnoreCase(method) && "/api/v1/auth/login".equals(uri))        return EndpointType.LOGIN;
        if ("POST".equalsIgnoreCase(method) && uri.matches("/api/v1/live/sessions/[^/]+/join")) return EndpointType.JOIN;
        if ("GET".equalsIgnoreCase(method)  && uri.matches("/api/v1/live/sessions/[^/]+/validate")) return EndpointType.VALIDATE;
        if ("POST".equalsIgnoreCase(method) && uri.startsWith("/api/v1/ai/"))           return EndpointType.AI_GENERATE;
        if ("POST".equalsIgnoreCase(method) && "/api/v1/mcqs".equals(uri))              return EndpointType.MCQ_WRITE;
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

        String ip  = resolveClientIp(request);
        EndpointType type = classify(request);
        Instant now = Instant.now();

        int maxAllowed;
        ConcurrentHashMap<String, Bucket> bucketMap;
        switch (type) {
            case JOIN         -> { maxAllowed = MAX_JOIN_ATTEMPTS;      bucketMap = joinBuckets; }
            case VALIDATE     -> { maxAllowed = MAX_VALIDATE_ATTEMPTS;  bucketMap = validateBuckets; }
            case MCQ_WRITE    -> { maxAllowed = MAX_MCQ_WRITE_ATTEMPTS; bucketMap = mcqWriteBuckets; }
            case AI_GENERATE  -> { maxAllowed = MAX_AI_ATTEMPTS;        bucketMap = aiBuckets; }
            default           -> { maxAllowed = MAX_ATTEMPTS;           bucketMap = loginBuckets; }
        }

        Bucket bucket = bucketMap.compute(ip, (k, existing) -> {
            if (existing == null || now.isAfter(existing.windowStart().plusSeconds(WINDOW_SECONDS))) {
                return new Bucket(new AtomicInteger(1), now);
            }
            existing.count().incrementAndGet();
            return existing;
        });

        int attempts = bucket.count().get();
        long secondsLeft = WINDOW_SECONDS - (now.getEpochSecond() - bucket.windowStart().getEpochSecond());

        if (attempts > maxAllowed) {
            log.warn("Rate limit exceeded for IP {} on {} — {} attempts in window", ip, type, attempts);
            response.setStatus(429);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write(
                "{\"error\":\"Too many requests. Please wait " + secondsLeft + " seconds before trying again.\"}"
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
