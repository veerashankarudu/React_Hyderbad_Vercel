package com.valkey.quizhub.controller;

import com.valkey.quizhub.entity.Mcq;
import com.valkey.quizhub.enums.McqStatus;
import com.valkey.quizhub.repository.McqRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/quiz")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QuizController {

    private final McqRepository mcqRepository;

    /**
     * Get N random APPROVED MCQs optionally filtered by techStackId.
     * Questions are returned WITHOUT the correct answer (stripped for fair play).
     */
    @GetMapping("/questions")
    public ResponseEntity<List<Map<String, Object>>> getQuizQuestions(
            @RequestParam(required = false) Long techStackId,
            @RequestParam(defaultValue = "10") int count,
            @AuthenticationPrincipal String enterpriseId) {

        List<Mcq> approved;
        if (techStackId != null) {
            approved = mcqRepository.findAll().stream()
                    .filter(m -> m.getStatus() == McqStatus.APPROVED)
                    .filter(m -> m.getTechStack() != null && m.getTechStack().getId().equals(techStackId))
                    .collect(Collectors.toList());
        } else {
            approved = mcqRepository.findAll().stream()
                    .filter(m -> m.getStatus() == McqStatus.APPROVED)
                    .collect(Collectors.toList());
        }

        Collections.shuffle(approved);
        List<Mcq> selected = approved.stream().limit(Math.min(count, approved.size())).collect(Collectors.toList());

        List<Map<String, Object>> result = selected.stream().map(m -> {
            Map<String, Object> q = new LinkedHashMap<>();
            q.put("id", m.getId());
            q.put("questionStem", m.getQuestionStem());
            q.put("optionA", m.getOptionA());
            q.put("optionB", m.getOptionB());
            q.put("optionC", m.getOptionC());
            q.put("optionD", m.getOptionD());
            q.put("techStack", m.getTechStack() != null ? m.getTechStack().getName() : "");
            q.put("topic", m.getTopic() != null ? m.getTopic().getName() : "");
            q.put("difficulty", m.getDifficulty().name());
            // correctAnswer intentionally omitted — sent only in /submit
            return q;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /**
     * Submit answers for a quiz session.
     * Body: { answers: { "mcqId": "A"|"B"|"C"|"D", ... } }
     * Returns: score, total, per-question result with correct answers.
     */
    @PostMapping("/submit")
    public ResponseEntity<Map<String, Object>> submitQuiz(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal String enterpriseId) {

        @SuppressWarnings("unchecked")
        Map<String, String> answers = (Map<String, String>) body.get("answers");
        if (answers == null || answers.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No answers provided"));
        }

        List<Map<String, Object>> results = new ArrayList<>();
        int correct = 0;

        for (Map.Entry<String, String> entry : answers.entrySet()) {
            Long mcqId;
            try { mcqId = Long.parseLong(entry.getKey()); } catch (NumberFormatException e) { continue; }

            Optional<Mcq> opt = mcqRepository.findById(mcqId);
            if (opt.isEmpty()) continue;
            Mcq mcq = opt.get();

            String given = entry.getValue() == null ? "" : entry.getValue().toUpperCase().trim();
            String expected = mcq.getCorrectAnswer().toUpperCase().trim();
            // Multi-select: compare sorted sets (e.g. "A,B" == "B,A")
            boolean isCorrect;
            if (given.contains(",") || expected.contains(",")) {
                java.util.Set<String> givenSet = new java.util.TreeSet<>(java.util.Arrays.asList(given.split(",")));
                java.util.Set<String> expectedSet = new java.util.TreeSet<>(java.util.Arrays.asList(expected.split(",")));
                isCorrect = givenSet.equals(expectedSet);
            } else {
                isCorrect = given.equals(expected);
            }
            if (isCorrect) correct++;

            Map<String, Object> r = new LinkedHashMap<>();
            r.put("mcqId", mcqId);
            r.put("questionStem", mcq.getQuestionStem());
            r.put("yourAnswer", given.isEmpty() ? null : given);
            r.put("correctAnswer", expected);
            r.put("correct", isCorrect);
            r.put("difficulty", mcq.getDifficulty().name());
            results.add(r);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("score", correct);
        response.put("total", results.size());
        response.put("percentage", results.isEmpty() ? 0 : Math.round((correct * 100.0) / results.size()));
        response.put("results", results);
        return ResponseEntity.ok(response);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADAPTIVE QUIZ MODE — difficulty adjusts based on running performance
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Get ONE question at the requested difficulty (adaptive mode).
     * Falls back to the nearest available difficulty if none exist at the requested level.
     * Params: difficulty (EASY|MEDIUM|HARD), techStackId (optional), excludeIds (comma-separated).
     */
    @GetMapping("/adaptive-question")
    public ResponseEntity<Map<String, Object>> getAdaptiveQuestion(
            @RequestParam(defaultValue = "MEDIUM") String difficulty,
            @RequestParam(required = false) Long techStackId,
            @RequestParam(required = false) String excludeIds) {

        Set<Long> exclude = new HashSet<>();
        if (excludeIds != null && !excludeIds.isBlank()) {
            for (String s : excludeIds.split(",")) {
                try { exclude.add(Long.parseLong(s.trim())); } catch (NumberFormatException ignored) {}
            }
        }

        List<Mcq> pool = mcqRepository.findAll().stream()
                .filter(m -> m.getStatus() == McqStatus.APPROVED)
                .filter(m -> techStackId == null ||
                        (m.getTechStack() != null && m.getTechStack().getId().equals(techStackId)))
                .filter(m -> !exclude.contains(m.getId()))
                .collect(Collectors.toList());

        if (pool.isEmpty()) {
            return ResponseEntity.ok(Map.of("exhausted", true));
        }

        // Pick at requested difficulty; fall back to nearest level if empty
        String req = difficulty.toUpperCase();
        List<String> ladder = switch (req) {
            case "EASY" -> List.of("EASY", "MEDIUM", "HARD");
            case "HARD" -> List.of("HARD", "MEDIUM", "EASY");
            default     -> List.of("MEDIUM", "EASY", "HARD");
        };
        List<Mcq> candidates = List.of();
        String servedDifficulty = req;
        for (String level : ladder) {
            candidates = pool.stream()
                    .filter(m -> m.getDifficulty() != null && level.equals(m.getDifficulty().name()))
                    .collect(Collectors.toList());
            if (!candidates.isEmpty()) { servedDifficulty = level; break; }
        }
        if (candidates.isEmpty()) candidates = pool;

        Mcq m = candidates.get(new Random().nextInt(candidates.size()));
        Map<String, Object> q = new LinkedHashMap<>();
        q.put("id", m.getId());
        q.put("questionStem", m.getQuestionStem());
        q.put("optionA", m.getOptionA());
        q.put("optionB", m.getOptionB());
        q.put("optionC", m.getOptionC());
        q.put("optionD", m.getOptionD());
        q.put("techStack", m.getTechStack() != null ? m.getTechStack().getName() : "");
        q.put("topic", m.getTopic() != null ? m.getTopic().getName() : "");
        q.put("difficulty", m.getDifficulty().name());
        q.put("requestedDifficulty", req);
        q.put("servedDifficulty", servedDifficulty);
        return ResponseEntity.ok(q);
    }

    /**
     * Grade a single adaptive answer immediately and return the next difficulty.
     * Body: { mcqId, answer }
     * Ladder: correct → harder (EASY→MEDIUM→HARD), wrong → easier (HARD→MEDIUM→EASY).
     */
    @PostMapping("/adaptive-answer")
    public ResponseEntity<Map<String, Object>> gradeAdaptiveAnswer(@RequestBody Map<String, Object> body) {
        Long mcqId;
        try { mcqId = Long.parseLong(String.valueOf(body.get("mcqId"))); }
        catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "mcqId is required"));
        }
        String answer = String.valueOf(body.getOrDefault("answer", "")).toUpperCase().trim();

        Optional<Mcq> opt = mcqRepository.findById(mcqId);
        if (opt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "MCQ not found"));
        Mcq mcq = opt.get();

        String expected = mcq.getCorrectAnswer().toUpperCase().trim();
        boolean correct = answer.equals(expected);

        String current = mcq.getDifficulty() != null ? mcq.getDifficulty().name() : "MEDIUM";
        String next;
        if (correct) {
            next = switch (current) { case "EASY" -> "MEDIUM"; default -> "HARD"; };
        } else {
            next = switch (current) { case "HARD" -> "MEDIUM"; default -> "EASY"; };
        }

        return ResponseEntity.ok(Map.of(
                "correct", correct,
                "correctAnswer", expected,
                "difficulty", current,
                "nextDifficulty", next
        ));
    }
}
