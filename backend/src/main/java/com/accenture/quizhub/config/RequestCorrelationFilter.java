package com.accenture.quizhub.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Adds a correlation ID (X-Request-Id) to every request for traceability.
 * Logs method, URI, status, and duration for audit trail.
 * MDC keys: requestId, userId, userRole — appear in every log line for that request.
 */
@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestCorrelationFilter extends OncePerRequestFilter {

    private static final String CORRELATION_ID_HEADER = "X-Request-Id";
    private static final String MDC_REQUEST_ID = "requestId";
    private static final String MDC_USER_ID    = "userId";
    private static final String MDC_USER_ROLE  = "userRole";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String correlationId = request.getHeader(CORRELATION_ID_HEADER);
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = UUID.randomUUID().toString().substring(0, 8);
        }

        MDC.put(MDC_REQUEST_ID, correlationId);
        response.setHeader(CORRELATION_ID_HEADER, correlationId);
        response.setHeader("X-Powered-By", "QuizHub-AI");

        long start = System.currentTimeMillis();
        try {
            filterChain.doFilter(request, response);
        } finally {
            // Enrich MDC with user identity after security filter chain runs
            try {
                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
                    MDC.put(MDC_USER_ID, auth.getName());
                    String role = auth.getAuthorities().stream()
                            .map(a -> a.getAuthority().replace("ROLE_", ""))
                            .findFirst().orElse("UNKNOWN");
                    MDC.put(MDC_USER_ROLE, role);
                }
            } catch (Exception ignored) { /* security context may be cleared */ }

            long duration = System.currentTimeMillis() - start;
            if (!request.getRequestURI().startsWith("/actuator")) {
                int status = response.getStatus();
                if (status >= 500) {
                    log.error("[{}] {} {} → {} ({}ms)", correlationId, request.getMethod(), request.getRequestURI(), status, duration);
                } else if (status >= 400) {
                    log.warn("[{}] {} {} → {} ({}ms)", correlationId, request.getMethod(), request.getRequestURI(), status, duration);
                } else {
                    log.info("[{}] {} {} → {} ({}ms)", correlationId, request.getMethod(), request.getRequestURI(), status, duration);
                }
            }
            MDC.remove(MDC_REQUEST_ID);
            MDC.remove(MDC_USER_ID);
            MDC.remove(MDC_USER_ROLE);
        }
    }
}
