package com.accenture.quizhub.controller;

import com.accenture.quizhub.entity.Mcq;
import com.accenture.quizhub.enums.McqStatus;
import com.accenture.quizhub.repository.McqRepository;
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
}
