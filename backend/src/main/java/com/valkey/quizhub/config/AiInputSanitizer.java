package com.valkey.quizhub.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

/**
 * Sanitizes user-supplied text before it is sent to an external AI provider (OpenAI/Ollama).
 *
 * Protections:
 * 1. PII Redaction — strips patterns that match email, phone, credit card, SSN, JWT tokens
 *    before the text leaves the system boundary.
 * 2. Input length enforcement — prevents token-exhaustion attacks and inflated OpenAI bills.
 * 3. Prompt injection mitigation — strips common jailbreak prefixes that attempt to override
 *    the system prompt ("ignore previous instructions", "you are now DAN", etc.).
 *
 * NOTE: This is a best-effort defense layer. Do NOT rely solely on this for data-loss prevention.
 * For strict PII compliance (GDPR/HIPAA), add a dedicated PII detection service.
 */
@Slf4j
@Component
public class AiInputSanitizer {

    private static final int MAX_INPUT_LENGTH = 4000;   // ~3000 tokens — well inside GPT-4o-mini 128k context

    // ── PII patterns ────────────────────────────────────────────────────────
    private static final Pattern EMAIL   = Pattern.compile(
        "[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}");
    private static final Pattern PHONE   = Pattern.compile(
        "(?:(?:\\+|00)[1-9]\\d{0,2}[\\s\\-.]?)?(?:\\(?\\d{3}\\)?[\\s\\-.]?){2}\\d{4}");
    private static final Pattern CREDIT_CARD = Pattern.compile(
        "\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\\b");
    private static final Pattern SSN     = Pattern.compile(
        "\\b(?!000|666|9\\d{2})\\d{3}[-\\s]?(?!00)\\d{2}[-\\s]?(?!0{4})\\d{4}\\b");
    private static final Pattern JWT_TOKEN = Pattern.compile(
        "eyJ[A-Za-z0-9_\\-]+\\.eyJ[A-Za-z0-9_\\-]+\\.[A-Za-z0-9_\\-]+");

    // ── Prompt injection phrases (case-insensitive) ───────────────────────
    private static final Pattern INJECTION = Pattern.compile(
        "(?i)(?:" +
        "ignore\\s+(?:all\\s+)?(?:previous|prior|above)\\s+instructions?" +
        "|you\\s+are\\s+now\\s+(?:DAN|an?\\s+AI\\s+without\\s+restrictions)" +
        "|act\\s+as\\s+(?:if\\s+you\\s+(?:have|had)\\s+no\\s+restrictions|an?\\s+unfiltered)" +
        "|disregard\\s+(?:all\\s+)?(?:previous|your)\\s+(?:instructions?|training)" +
        "|jailbreak|override\\s+system\\s+prompt" +
        "|pretend\\s+you\\s+(?:have\\s+no|are\\s+without)\\s+(?:rules|restrictions|guidelines)" +
        ")");

    /**
     * Sanitizes text intended for an AI prompt.
     * @param input raw user text
     * @param context label for logging (e.g. "chatbot", "mcq-generate", "hint")
     * @return sanitized text, safe to pass to the AI model
     */
    public String sanitize(String input, String context) {
        if (input == null || input.isBlank()) return input;

        String sanitized = input;

        // 1. Truncate to max length
        if (sanitized.length() > MAX_INPUT_LENGTH) {
            log.warn("AI input truncated [context={}] original_length={}", context, sanitized.length());
            sanitized = sanitized.substring(0, MAX_INPUT_LENGTH) + "... [truncated]";
        }

        // 2. Check for prompt injection attempts
        if (INJECTION.matcher(sanitized).find()) {
            log.warn("Potential prompt injection detected [context={}]", context);
            // Wrap in quotes to contextualise — don't block (too many false positives for a quiz platform)
            sanitized = sanitized.replaceAll("(?i)(ignore\\s+(?:all\\s+)?(?:previous|prior|above)\\s+instructions?)", "[filtered]")
                                 .replaceAll("(?i)(jailbreak|override\\s+system\\s+prompt)", "[filtered]");
        }

        // 3. Redact PII
        int original = sanitized.length();
        sanitized = JWT_TOKEN.matcher(sanitized).replaceAll("[jwt-token]");
        sanitized = CREDIT_CARD.matcher(sanitized).replaceAll("[card-number]");
        sanitized = SSN.matcher(sanitized).replaceAll("[ssn]");
        sanitized = EMAIL.matcher(sanitized).replaceAll("[email]");
        sanitized = PHONE.matcher(sanitized).replaceAll("[phone]");

        if (sanitized.length() != original) {
            log.info("PII redacted from AI input [context={}]", context);
        }

        return sanitized;
    }
}
