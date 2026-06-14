package com.accenture.quizhub.service;

import com.accenture.quizhub.entity.Mcq;
import com.accenture.quizhub.entity.User;
import com.accenture.quizhub.config.QuizHubMetrics;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/**
 * EmailService — dual-mode implementation.
 *
 * - MAIL_USERNAME env var NOT set  → logs formatted mock email to console (hackathon demo mode)
 * - MAIL_USERNAME env var IS set   → sends real email via JavaMailSender (production mode)
 *
 * To go live: set MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM env vars.
 */
@Slf4j
@Service
public class EmailService {

    private static final String DIVIDER = "─".repeat(60);

    private final JavaMailSender mailSender;
    private final QuizHubMetrics metrics;

    @Value("${app.email.from:quizhub-noreply@accenture.com}")
    private String fromAddress;

    @Value("${MAIL_USERNAME:}")
    private String mailUsername;

    @Value("${app.url:http://localhost:3000}")
    private String appUrl;

    public EmailService(JavaMailSender mailSender, QuizHubMetrics metrics) {
        this.mailSender = mailSender;
        this.metrics = metrics;
    }

    // ── Public trigger methods ────────────────────────────────────────────────

    public void sendMcqApprovedEmail(Mcq mcq, User reviewer) {
        String to      = mcq.getCreator().getEmail();
        String toName  = mcq.getCreator().getFullName();
        String subject = "✅ Your MCQ has been Approved — " + buildRef(mcq);
        String body    = buildApprovedBody(toName, mcq, reviewer);
        send(to, toName, subject, body);
    }

    public void sendMcqRejectedEmail(Mcq mcq, User reviewer, String comment) {
        String to      = mcq.getCreator().getEmail();
        String toName  = mcq.getCreator().getFullName();
        String subject = "❌ Your MCQ needs revision — " + buildRef(mcq);
        String body    = buildRejectedBody(toName, mcq, reviewer, comment);
        send(to, toName, subject, body);
    }

    public void sendReviewerAssignedEmail(Mcq mcq, User reviewer, User admin) {
        String to      = reviewer.getEmail();
        String toName  = reviewer.getFullName();
        String subject = "📋 New MCQ assigned for your review — " + buildRef(mcq);
        String body    = buildAssignedBody(toName, mcq, admin);
        send(to, toName, subject, body);
    }

    public void sendPasswordResetEmail(User user, String resetLink) {
        String to      = user.getEmail();
        String toName  = user.getFullName();
        String subject = "🔑 Reset your QuizHub password";
        String body = String.format("""
                Hi %s,

                We received a request to reset your QuizHub password.

                Click the link below to set a new password (valid for 2 hours):

                  %s

                If you did not request this, you can safely ignore this email.
                Your password will not change unless you click the link above.

                — QuizHub AI | Accenture L&TT Team
                """, toName, resetLink);
        send(to, toName, subject, body);
    }

    // ── Core dispatcher — real or mock ───────────────────────────────────────

    private void send(String to, String toName, String subject, String body) {
        if (mailUsername != null && !mailUsername.isBlank()) {
            sendRealEmail(to, toName, subject, body);
        } else {
            sendMockEmail(to, toName, subject, body);
        }
    }

    private void sendRealEmail(String to, String toName, String subject, String body) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body, false);
            mailSender.send(message);
            metrics.emailSent.increment();
            log.info("📧 Email sent → {} <{}>  Subject: {}", toName, to, subject);
        } catch (Exception e) {
            metrics.emailFailed.increment();
            log.error("📧 Email failed → {} <{}>  Error: {}", toName, to, e.getMessage());
            // Fall back to mock so the workflow is never blocked by email failures
            sendMockEmail(to, toName, subject, body);
        }
    }

    private void sendMockEmail(String to, String toName, String subject, String body) {
        log.info("\n{}\n📧  MOCK EMAIL  (set MAIL_USERNAME env var to send real emails)\n{}\n  From   : {}\n  To     : {} <{}>\n  Subject: {}\n{}\n{}\n{}",
                DIVIDER, DIVIDER,
                fromAddress,
                toName, to,
                subject,
                DIVIDER,
                body,
                DIVIDER);
    }

    // ── Email body builders ───────────────────────────────────────────────────

    private String buildApprovedBody(String toName, Mcq mcq, User reviewer) {
        return String.format("""
                Hi %s,

                Great news! Your MCQ has been reviewed and APPROVED.

                  Reference : %s
                  Tech Stack: %s
                  Difficulty: %s
                  Question  : %s

                Reviewed by : %s (%s)
                View MCQ    : %s/mcq/%d

                Keep up the great work!

                — QuizHub AI | Accenture L&TT Team
                """,
                toName, buildRef(mcq),
                mcq.getTechStack() != null ? mcq.getTechStack().getName() : "—",
                mcq.getDifficulty(),
                truncate(mcq.getQuestionStem(), 100),
                reviewer.getFullName(), reviewer.getEnterpriseId(),
                appUrl, mcq.getId());
    }

    private String buildRejectedBody(String toName, Mcq mcq, User reviewer, String comment) {
        return String.format("""
                Hi %s,

                Your MCQ has been reviewed and requires revision.

                  Reference : %s
                  Tech Stack: %s
                  Difficulty: %s
                  Question  : %s

                Reviewer Feedback:
                  "%s"

                Reviewed by : %s (%s)
                Edit MCQ    : %s/mcq/%d/edit

                Please address the feedback and resubmit.

                — QuizHub AI | Accenture L&TT Team
                """,
                toName, buildRef(mcq),
                mcq.getTechStack() != null ? mcq.getTechStack().getName() : "—",
                mcq.getDifficulty(),
                truncate(mcq.getQuestionStem(), 100),
                comment != null ? comment : "No comment provided",
                reviewer.getFullName(), reviewer.getEnterpriseId(),
                appUrl, mcq.getId());
    }

    private String buildAssignedBody(String toName, Mcq mcq, User admin) {
        return String.format("""
                Hi %s,

                You have been assigned to review a new MCQ.

                  Reference : %s
                  Tech Stack: %s
                  Difficulty: %s
                  Question  : %s

                Assigned by : %s (%s)
                Review MCQ  : %s/pending-reviews

                Please complete your review at your earliest convenience.

                — QuizHub AI | Accenture L&TT Team
                """,
                toName, buildRef(mcq),
                mcq.getTechStack() != null ? mcq.getTechStack().getName() : "—",
                mcq.getDifficulty(),
                truncate(mcq.getQuestionStem(), 100),
                admin.getFullName(), admin.getEnterpriseId(),
                appUrl);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String buildRef(Mcq mcq) {
        String stack = mcq.getTechStack() != null
                ? mcq.getTechStack().getName().toUpperCase().replace(" ", "-")
                : "MCQ";
        return stack + "-" + mcq.getId();
    }

    private String truncate(String text, int max) {
        if (text == null) return "";
        return text.length() > max ? text.substring(0, max) + "..." : text;
    }
}
