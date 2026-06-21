package com.valkey.quizhub.config;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicLong;

/**
 * Central registry for QuizHub business metrics.
 *
 * All counters/gauges/timers are pre-declared here so they appear in
 * /actuator/prometheus even before the first event occurs.
 *
 * Metric naming follows Prometheus convention: snake_case, unit suffix (_total, _seconds).
 *
 * Compatible with: Prometheus → Grafana, Datadog (OTLP), New Relic, Splunk Observability.
 */
@Component
public class QuizHubMetrics {

    // ── MCQ lifecycle counters ──────────────────────────────────────────────
    public final Counter mcqCreated;
    public final Counter mcqSubmittedForReview;
    public final Counter mcqApproved;
    public final Counter mcqRejected;
    public final Counter mcqDeleted;

    // ── Auth counters ───────────────────────────────────────────────────────
    public final Counter loginSuccess;
    public final Counter loginFailure;
    public final Counter loginRateLimited;
    public final Counter passwordReset;

    // ── Bulk upload counters ────────────────────────────────────────────────
    public final Counter bulkUploadSuccess;
    public final Counter bulkUploadFailed;
    public final Counter bulkUploadRowsImported;

    // ── AI feature counters ─────────────────────────────────────────────────
    public final Counter aiGenerateCalled;
    public final Counter aiRewriteCalled;
    public final Counter aiValidateCalled;
    public final Counter aiChatCalled;
    public final Counter aiSemanticDuplicateBlocked;

    // ── Quiz counters ───────────────────────────────────────────────────────
    public final Counter quizSessionCreated;
    public final Counter quizAttemptCompleted;

    // ── Notification counters ───────────────────────────────────────────────
    public final Counter emailSent;
    public final Counter emailFailed;

    // ── Gauges (live values) ────────────────────────────────────────────────
    private final AtomicLong activeLiveSessions = new AtomicLong(0);
    private final AtomicLong activeWebSocketConnections = new AtomicLong(0);

    // ── Timers ──────────────────────────────────────────────────────────────
    public final Timer aiGenerateTimer;
    public final Timer bulkUploadTimer;

    public QuizHubMetrics(MeterRegistry registry) {

        // MCQ
        mcqCreated              = Counter.builder("quizhub.mcq.created.total")
                .description("Total MCQs created").register(registry);
        mcqSubmittedForReview   = Counter.builder("quizhub.mcq.submitted_for_review.total")
                .description("MCQs submitted for review").register(registry);
        mcqApproved             = Counter.builder("quizhub.mcq.approved.total")
                .description("MCQs approved by reviewer").register(registry);
        mcqRejected             = Counter.builder("quizhub.mcq.rejected.total")
                .description("MCQs rejected by reviewer").register(registry);
        mcqDeleted              = Counter.builder("quizhub.mcq.deleted.total")
                .description("MCQs deleted").register(registry);

        // Auth
        loginSuccess            = Counter.builder("quizhub.auth.login.success.total")
                .description("Successful logins").register(registry);
        loginFailure            = Counter.builder("quizhub.auth.login.failure.total")
                .description("Failed login attempts").register(registry);
        loginRateLimited        = Counter.builder("quizhub.auth.login.rate_limited.total")
                .description("Login attempts blocked by rate limiter").register(registry);
        passwordReset           = Counter.builder("quizhub.auth.password_reset.total")
                .description("Password reset requests").register(registry);

        // Bulk upload
        bulkUploadSuccess       = Counter.builder("quizhub.bulk_upload.success.total")
                .description("Successful bulk upload jobs").register(registry);
        bulkUploadFailed        = Counter.builder("quizhub.bulk_upload.failed.total")
                .description("Failed bulk upload jobs").register(registry);
        bulkUploadRowsImported  = Counter.builder("quizhub.bulk_upload.rows_imported.total")
                .description("Total MCQ rows imported via bulk upload").register(registry);

        // AI
        aiGenerateCalled        = Counter.builder("quizhub.ai.generate.total")
                .description("AI generate MCQ calls").register(registry);
        aiRewriteCalled         = Counter.builder("quizhub.ai.rewrite.total")
                .description("AI rewrite MCQ calls").register(registry);
        aiValidateCalled        = Counter.builder("quizhub.ai.validate.total")
                .description("AI validate MCQ calls").register(registry);
        aiChatCalled            = Counter.builder("quizhub.ai.chat.total")
                .description("AI chatbot calls").register(registry);
        aiSemanticDuplicateBlocked = Counter.builder("quizhub.ai.semantic_duplicate_blocked.total")
                .description("MCQs blocked by AI semantic duplicate detection").register(registry);

        // Quiz
        quizSessionCreated      = Counter.builder("quizhub.quiz.session_created.total")
                .description("Quiz sessions created").register(registry);
        quizAttemptCompleted    = Counter.builder("quizhub.quiz.attempt_completed.total")
                .description("Quiz attempts completed").register(registry);

        // Notifications
        emailSent               = Counter.builder("quizhub.email.sent.total")
                .description("Emails sent successfully").register(registry);
        emailFailed             = Counter.builder("quizhub.email.failed.total")
                .description("Email send failures").register(registry);

        // Gauges
        Gauge.builder("quizhub.live_sessions.active", activeLiveSessions, AtomicLong::get)
                .description("Currently active live quiz battle sessions").register(registry);
        Gauge.builder("quizhub.websocket.connections.active", activeWebSocketConnections, AtomicLong::get)
                .description("Active WebSocket connections").register(registry);

        // Timers
        aiGenerateTimer         = Timer.builder("quizhub.ai.generate.duration")
                .description("Time taken for AI MCQ generation").register(registry);
        bulkUploadTimer         = Timer.builder("quizhub.bulk_upload.duration")
                .description("Time taken for bulk upload processing").register(registry);
    }

    // ── Gauge helpers ───────────────────────────────────────────────────────
    public void liveSessionStarted()  { activeLiveSessions.incrementAndGet(); }
    public void liveSessionEnded()    { activeLiveSessions.decrementAndGet(); }
    public void wsConnected()         { activeWebSocketConnections.incrementAndGet(); }
    public void wsDisconnected()      { activeWebSocketConnections.decrementAndGet(); }
}
