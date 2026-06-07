package com.accenture.quizhub.controller;

import com.accenture.quizhub.entity.*;
import com.accenture.quizhub.enums.McqStatus;
import com.accenture.quizhub.repository.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/quiz-sessions")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QuizSessionController {

    private final QuizSessionRepository sessionRepo;
    private final QuizAttemptRepository attemptRepo;
    private final McqRepository mcqRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    private static final DateTimeFormatter FMT = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    // ── 1. Create session (auth required) ──────────────────────────────────
    @Transactional
    @PostMapping
    public ResponseEntity<Map<String, Object>> createSession(
            @RequestBody Map<String, Object> body,
            Principal principal) throws Exception {

        String title = (String) body.getOrDefault("title", "Untitled Quiz");
        int count = body.containsKey("questionCount") ? (int) body.get("questionCount") : 10;
        int timeLimit = body.containsKey("timeLimitMinutes") ? (int) body.get("timeLimitMinutes") : 30;
        int linkValidHours = body.containsKey("linkValidHours") ? (int) body.get("linkValidHours") : 24;

        // Filters
        String techStackName = (String) body.get("techStackName");
        String topicName = (String) body.get("topicName");
        String difficulty = (String) body.get("difficulty");

        // Hand-picked IDs override random
        @SuppressWarnings("unchecked")
        List<Integer> pickedIds = (List<Integer>) body.get("pickedIds");

        List<Mcq> pool;
        if (pickedIds != null && !pickedIds.isEmpty()) {
            List<Long> ids = pickedIds.stream().map(i -> (long) i).collect(Collectors.toList());
            pool = mcqRepository.findAllById(ids).stream()
                    .filter(m -> m.getStatus() == McqStatus.APPROVED)
                    .collect(Collectors.toList());
        } else {
            pool = mcqRepository.findAll().stream()
                    .filter(m -> m.getStatus() == McqStatus.APPROVED)
                    .filter(m -> techStackName == null || techStackName.isBlank()
                            || (m.getTechStack() != null && techStackName.equalsIgnoreCase(m.getTechStack().getName())))
                    .filter(m -> topicName == null || topicName.isBlank()
                            || (m.getTopic() != null && topicName.equalsIgnoreCase(m.getTopic().getName())))
                    .filter(m -> difficulty == null || difficulty.isBlank()
                            || difficulty.equalsIgnoreCase(m.getDifficulty().name()))
                    .collect(Collectors.toList());
            Collections.shuffle(pool);
            if (pool.size() > count) pool = pool.subList(0, count);
        }

        if (pool.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No approved MCQs match your filters."));
        }

        User creator = userRepository.findByEnterpriseId(principal.getName()).orElseThrow();
        String token = UUID.randomUUID().toString().replace("-", "");
        String mcqIds = pool.stream().map(m -> String.valueOf(m.getId())).collect(Collectors.joining(","));

        LocalDateTime now = LocalDateTime.now();
        QuizSession session = sessionRepo.save(QuizSession.builder()
                .title(title)
                .shareToken(token)
                .mcqIds(mcqIds)
                .timeLimitMinutes(timeLimit)
                .createdBy(creator.getEnterpriseId())
                .createdByName(creator.getFullName())
                .expiresAt(now.plusHours(linkValidHours))
                .build());

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("id", session.getId());
        resp.put("title", session.getTitle());
        resp.put("shareToken", token);
        resp.put("questionCount", pool.size());
        resp.put("timeLimitMinutes", timeLimit);
        resp.put("shareUrl", "/quiz/take/" + token);
        resp.put("expiresAt", session.getExpiresAt() != null ? FMT.format(session.getExpiresAt()) : null);
        return ResponseEntity.ok(resp);
    }

    // ── 2. List my sessions (auth) ──────────────────────────────────────────
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listSessions(Principal principal) {
        List<QuizSession> sessions = sessionRepo.findByCreatedByOrderByCreatedAtDesc(principal.getName());
        List<Map<String, Object>> result = sessions.stream().map(s -> {
            int qCount = s.getMcqIds().split(",").length;
            long attempts = attemptRepo.findBySessionIdOrderBySubmittedAtDesc(s.getId()).size();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", s.getId());
            m.put("title", s.getTitle());
            m.put("shareToken", s.getShareToken());
            m.put("questionCount", qCount);
            m.put("timeLimitMinutes", s.getTimeLimitMinutes());
            m.put("attemptCount", attempts);
            m.put("createdAt", s.getCreatedAt() != null ? FMT.format(s.getCreatedAt()) : null);
            m.put("expiresAt", s.getExpiresAt() != null ? FMT.format(s.getExpiresAt()) : null);
            boolean expired = s.getExpiresAt() != null && LocalDateTime.now().isAfter(s.getExpiresAt());
            m.put("expired", expired);
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    // ── 2b. Check if email already attempted this quiz ──────────────────────
    @GetMapping("/take/{token}/check-attempt")
    public ResponseEntity<Map<String, Object>> checkAttempt(
            @PathVariable String token,
            @RequestParam String email) {
        QuizSession session = sessionRepo.findByShareToken(token).orElse(null);
        if (session == null) return ResponseEntity.notFound().build();
        boolean already = attemptRepo.existsBySessionIdAndCandidateEmail(session.getId(), email);
        return ResponseEntity.ok(Map.of("alreadyAttempted", already));
    }

    // ── 3. Get questions for taking (auth required) ─────────────────────────
    @Transactional
    @GetMapping("/take/{token}")
    public ResponseEntity<Map<String, Object>> getTakeData(@PathVariable String token) {
        QuizSession session = sessionRepo.findByShareToken(token)
                .orElse(null);
        if (session == null) return ResponseEntity.notFound().build();
        if (session.getExpiresAt() != null && LocalDateTime.now().isAfter(session.getExpiresAt())) {
            return ResponseEntity.status(410).body(Map.of("error", "This quiz link has expired."));
        }

        List<Long> ids = Arrays.stream(session.getMcqIds().split(","))
                .map(Long::parseLong).collect(Collectors.toList());
        List<Mcq> mcqs = mcqRepository.findAllById(ids);
        // Preserve session order
        Map<Long, Mcq> byId = mcqs.stream().collect(Collectors.toMap(Mcq::getId, m -> m));
        List<Map<String, Object>> questions = ids.stream()
                .filter(byId::containsKey)
                .map(id -> {
                    Mcq m = byId.get(id);
                    // Shuffle option order per question (use mcqId as seed for reproducibility)
                    List<String[]> opts = new ArrayList<>(Arrays.asList(
                            new String[]{"A", m.getOptionA()},
                            new String[]{"B", m.getOptionB()},
                            new String[]{"C", m.getOptionC()},
                            new String[]{"D", m.getOptionD()}
                    ));
                    Collections.shuffle(opts, new Random(id * 31L));
                    // Build label map: new label → original label
                    Map<String, Object> q = new LinkedHashMap<>();
                    q.put("id", m.getId());
                    q.put("questionStem", m.getQuestionStem());
                    q.put("techStackName", m.getTechStack() != null ? m.getTechStack().getName() : "General");
                    q.put("topicName", m.getTopic() != null ? m.getTopic().getName() : "General");
                    q.put("difficulty", m.getDifficulty().name());
                    // Options with shuffled positions
                    String[] labels = {"A", "B", "C", "D"};
                    for (int i = 0; i < 4; i++) {
                        q.put("option" + labels[i], opts.get(i)[1]);
                        q.put("originalKey" + labels[i], opts.get(i)[0]); // used server-side for scoring
                    }
                    // NO correctAnswer exposed
                    return q;
                }).collect(Collectors.toList());

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("sessionId", session.getId());
        resp.put("title", session.getTitle());
        resp.put("timeLimitMinutes", session.getTimeLimitMinutes());
        resp.put("questions", questions);
        return ResponseEntity.ok(resp);
    }

    // ── 4. Submit attempt (NO auth) ─────────────────────────────────────────
    @Transactional
    @PostMapping("/take/{token}/submit")
    public ResponseEntity<Map<String, Object>> submitAttempt(
            @PathVariable String token,
            @RequestBody Map<String, Object> body) throws Exception {

        QuizSession session = sessionRepo.findByShareToken(token).orElse(null);
        if (session == null) return ResponseEntity.notFound().build();

        String email = (String) body.get("email");
        String name = (String) body.get("name");
        String status = "COMPLETED";
        int violations = body.containsKey("violationCount") ? (int) body.get("violationCount") : 0;
        if (violations >= 3) status = "TERMINATED";
        String screenshot = (String) body.get("violationScreenshot");
        int timeTaken = body.containsKey("timeTakenSeconds") ? (int) body.get("timeTakenSeconds") : 0;

        // One attempt per email per session
        if (attemptRepo.existsBySessionIdAndCandidateEmail(session.getId(), email)) {
            return ResponseEntity.badRequest().body(Map.of("error", "You have already completed this quiz."));
        }

        // Submitted answers: mcqId(string) → chosen display label (A/B/C/D)
        @SuppressWarnings("unchecked")
        Map<String, String> submitted = (Map<String, String>) body.get("answers");

        // Fetch MCQs and score
        List<Long> ids = Arrays.stream(session.getMcqIds().split(","))
                .map(Long::parseLong).collect(Collectors.toList());
        List<Mcq> mcqs = mcqRepository.findAllById(ids);
        Map<Long, Mcq> byId = mcqs.stream().collect(Collectors.toMap(Mcq::getId, m -> m));

        int correct = 0;
        // topic breakdown: topicName → [correct, total]
        Map<String, int[]> breakdown = new LinkedHashMap<>();

        for (Long id : ids) {
            Mcq m = byId.get(id);
            if (m == null) continue;
            String topicKey = m.getTechStack() != null ? m.getTechStack().getName() : "General";
            breakdown.computeIfAbsent(topicKey, k -> new int[]{0, 0})[1]++;

            String chosenLabel = submitted != null ? submitted.get(String.valueOf(id)) : null;
            if (chosenLabel != null) {
                // Map chosen display label back to original key using shuffle seed
                List<String[]> opts = new ArrayList<>(Arrays.asList(
                        new String[]{"A", m.getOptionA()},
                        new String[]{"B", m.getOptionB()},
                        new String[]{"C", m.getOptionC()},
                        new String[]{"D", m.getOptionD()}
                ));
                Collections.shuffle(opts, new Random(id * 31L));
                int chosenIdx = "ABCD".indexOf(chosenLabel);
                if (chosenIdx >= 0 && chosenIdx < opts.size()) {
                    String originalKey = opts.get(chosenIdx)[0];
                    // Support multi-select: check if originalKey is in comma-separated correctAnswer
                    String expectedAnswer = m.getCorrectAnswer();
                    if (expectedAnswer.contains(",")) {
                        // Multi-select comparison with shuffle mapping
                        // For now treat single selection against multi as partial
                        if (expectedAnswer.contains(originalKey)) {
                            correct++;
                            breakdown.get(topicKey)[0]++;
                        }
                    } else if (originalKey.equals(expectedAnswer)) {
                        correct++;
                        breakdown.get(topicKey)[0]++;
                    }
                }
            }
        }

        // Build topic breakdown JSON
        Map<String, Object> topicMap = new LinkedHashMap<>();
        for (Map.Entry<String, int[]> e : breakdown.entrySet()) {
            topicMap.put(e.getKey(), Map.of("correct", e.getValue()[0], "total", e.getValue()[1]));
        }
        String topicJson = objectMapper.writeValueAsString(topicMap);
        String answersJson = objectMapper.writeValueAsString(submitted);

        QuizAttempt attempt = attemptRepo.save(QuizAttempt.builder()
                .sessionId(session.getId())
                .candidateName(name)
                .candidateEmail(email)
                .answers(answersJson)
                .score(correct)
                .totalQuestions(ids.size())
                .topicBreakdown(topicJson)
                .status(status)
                .violationCount(violations)
                .violationScreenshot(screenshot)
                .timeTakenSeconds(timeTaken)
                .build());

        // Build weak/strong analysis
        List<Map<String, Object>> topicResults = new ArrayList<>();
        for (Map.Entry<String, int[]> e : breakdown.entrySet()) {
            int c = e.getValue()[0], t = e.getValue()[1];
            double pct = t > 0 ? (double) c / t * 100 : 0;
            topicResults.add(Map.of(
                    "topic", e.getKey(),
                    "correct", c,
                    "total", t,
                    "percent", Math.round(pct),
                    "strength", pct >= 70 ? "STRONG" : pct >= 40 ? "AVERAGE" : "WEAK"
            ));
        }

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("attemptId", attempt.getId());
        resp.put("score", correct);
        resp.put("total", ids.size());
        resp.put("percent", ids.size() > 0 ? Math.round((double) correct / ids.size() * 100) : 0);
        resp.put("status", status);
        resp.put("topicBreakdown", topicResults);
        return ResponseEntity.ok(resp);
    }

    // ── 5. Get attempts for a session (auth) ────────────────────────────────
    @GetMapping("/{id}/attempts")
    public ResponseEntity<List<Map<String, Object>>> getAttempts(
            @PathVariable Long id, Principal principal) throws Exception {

        QuizSession session = sessionRepo.findById(id).orElse(null);
        if (session == null) return ResponseEntity.notFound().build();

        List<QuizAttempt> attempts = attemptRepo.findBySessionIdOrderBySubmittedAtDesc(id);
        List<Map<String, Object>> result = new ArrayList<>();
        for (QuizAttempt a : attempts) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", a.getId());
            m.put("candidateName", a.getCandidateName());
            m.put("candidateEmail", a.getCandidateEmail());
            m.put("score", a.getScore());
            m.put("total", a.getTotalQuestions());
            m.put("percent", a.getTotalQuestions() != null && a.getTotalQuestions() > 0
                    ? Math.round((double) a.getScore() / a.getTotalQuestions() * 100) : 0);
            m.put("status", a.getStatus());
            m.put("violationCount", a.getViolationCount());
            m.put("timeTakenSeconds", a.getTimeTakenSeconds());
            m.put("submittedAt", a.getSubmittedAt() != null ? FMT.format(a.getSubmittedAt()) : null);
            m.put("hasScreenshot", a.getViolationScreenshot() != null && !a.getViolationScreenshot().isBlank());
            // Parse topic breakdown
            if (a.getTopicBreakdown() != null) {
                m.put("topicBreakdown", objectMapper.readValue(a.getTopicBreakdown(),
                        new TypeReference<Map<String, Object>>() {}));
            }
            result.add(m);
        }
        return ResponseEntity.ok(result);
    }

    // ── 7. Assessment leaderboard (auth) ───────────────────────────────────
    // GET /quiz-sessions/assessment-leaderboard?sessionId=X&from=2026-01-01&to=2026-12-31
    @GetMapping("/assessment-leaderboard")
    public ResponseEntity<Map<String, Object>> getAssessmentLeaderboard(
            @RequestParam(required = false) Long sessionId,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {

        // Build session dropdown list — only sessions that have at least 1 attempt
        Set<Long> sessionIdsWithAttempts = attemptRepo.findLeaderboard(null, null, null)
            .stream().map(QuizAttempt::getSessionId).collect(Collectors.toSet());
        List<Map<String, Object>> sessions = sessionRepo.findAll(
                org.springframework.data.domain.Sort.by(
                    org.springframework.data.domain.Sort.Direction.DESC, "createdAt"))
            .stream()
            .filter(s -> sessionIdsWithAttempts.contains(s.getId()))
            .map(s -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", s.getId());
                m.put("title", s.getTitle());
                m.put("createdAt", s.getCreatedAt() != null ? FMT.format(s.getCreatedAt()) : null);
                m.put("expiresAt", s.getExpiresAt() != null ? FMT.format(s.getExpiresAt()) : null);
                return m;
            }).collect(Collectors.toList());

        // Parse optional date filters
        LocalDateTime fromDt = null;
        LocalDateTime toDt = null;
        try { if (from != null && !from.isBlank()) fromDt = LocalDateTime.parse(from + "T00:00:00"); } catch (Exception ignored) {}
        try { if (to   != null && !to.isBlank())   toDt   = LocalDateTime.parse(to   + "T23:59:59"); } catch (Exception ignored) {}

        // Get ranked attempts
        List<QuizAttempt> attempts = attemptRepo.findLeaderboard(sessionId, fromDt, toDt);

        // Build session title map for enrichment
        Map<Long, String> sessionTitles = sessionRepo.findAll().stream()
                .collect(Collectors.toMap(QuizSession::getId, QuizSession::getTitle));

        List<Map<String, Object>> ranked = new ArrayList<>();
        for (int i = 0; i < attempts.size(); i++) {
            QuizAttempt a = attempts.get(i);
            int pct = a.getTotalQuestions() != null && a.getTotalQuestions() > 0
                    ? (int) Math.round((double) a.getScore() / a.getTotalQuestions() * 100) : 0;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("rank", i + 1);
            m.put("attemptId", a.getId());
            m.put("sessionId", a.getSessionId());
            m.put("sessionTitle", sessionTitles.getOrDefault(a.getSessionId(), "Unknown"));
            m.put("candidateName", a.getCandidateName());
            m.put("candidateEmail", a.getCandidateEmail());
            m.put("score", a.getScore());
            m.put("total", a.getTotalQuestions());
            m.put("percent", pct);
            m.put("status", a.getStatus());
            m.put("timeTakenSeconds", a.getTimeTakenSeconds());
            m.put("submittedAt", a.getSubmittedAt() != null ? FMT.format(a.getSubmittedAt()) : null);
            ranked.add(m);
        }

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("sessions", sessions);
        resp.put("leaderboard", ranked);
        return ResponseEntity.ok(resp);
    }

    // ── 6. Get violation screenshot for one attempt (auth) ─────────────────
    @GetMapping("/{sessionId}/attempts/{attemptId}/screenshot")
    public ResponseEntity<Map<String, Object>> getScreenshot(
            @PathVariable Long sessionId,
            @PathVariable Long attemptId) {
        QuizAttempt a = attemptRepo.findById(attemptId).orElse(null);
        if (a == null || !a.getSessionId().equals(sessionId)) return ResponseEntity.notFound().build();
        if (a.getViolationScreenshot() == null || a.getViolationScreenshot().isBlank())
            return ResponseEntity.notFound().build();
        return ResponseEntity.ok(Map.of("screenshot", a.getViolationScreenshot()));
    }
}
