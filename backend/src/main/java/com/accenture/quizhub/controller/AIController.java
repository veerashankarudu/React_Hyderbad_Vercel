package com.accenture.quizhub.controller;

import com.accenture.quizhub.entity.Mcq;
import com.accenture.quizhub.entity.TechStack;
import com.accenture.quizhub.entity.Topic;
import com.accenture.quizhub.entity.User;
import com.accenture.quizhub.enums.Difficulty;
import com.accenture.quizhub.enums.McqStatus;
import com.accenture.quizhub.exception.ResourceNotFoundException;
import com.accenture.quizhub.repository.McqRepository;
import com.accenture.quizhub.repository.TechStackRepository;
import com.accenture.quizhub.repository.TopicRepository;
import com.accenture.quizhub.repository.UserRepository;
import com.accenture.quizhub.service.AIService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AIController {

    private final AIService aiService;
    private final McqRepository mcqRepository;
    private final TechStackRepository techStackRepository;
    private final TopicRepository topicRepository;
    private final UserRepository userRepository;

    private User resolveUser(String enterpriseId) {
        return userRepository.findByEnterpriseId(enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    @PostMapping("/hint")
    public ResponseEntity<Map<String, String>> getHint(@RequestBody Map<String, Object> body) {
        Long mcqId = Long.valueOf(body.get("mcqId").toString());
        String questionStem = body.get("questionStem").toString();
        String hint = aiService.generateHint(mcqId, questionStem);
        return ResponseEntity.ok(Map.of("hint", hint));
    }

    @PostMapping("/check-duplicate")
    public ResponseEntity<Map<String, Object>> checkDuplicate(@RequestBody Map<String, String> body) {
        String result = aiService.checkDuplicate(body.get("questionStem"));
        boolean isDuplicate = result != null && result.toLowerCase().startsWith("yes");
        return ResponseEntity.ok(Map.of("isDuplicate", isDuplicate, "message", result != null ? result : ""));
    }

    /**
     * Real duplicate check: compares newStem against existing MCQs
     * in the same tech stack + topic using AI similarity scoring.
     * Returns list of similar questions with percent, and blocked=true if any >= 30%.
     */
    @PostMapping("/check-duplicate-db")
    public ResponseEntity<Map<String, Object>> checkDuplicateDb(
            @RequestBody Map<String, Object> body) {

        String questionStem = (String) body.get("questionStem");
        Long techStackId = body.containsKey("techStackId") ? Long.valueOf(body.get("techStackId").toString()) : null;
        Long topicId = body.containsKey("topicId") ? Long.valueOf(body.get("topicId").toString()) : null;
        Long excludeId = body.containsKey("excludeId") ? Long.valueOf(body.get("excludeId").toString()) : null;

        if (questionStem == null || questionStem.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "questionStem is required"));
        }

        // Fetch existing approved/draft/in-review MCQs in same tech stack + topic
        List<Mcq> pool = mcqRepository.findAll().stream()
            .filter(m -> m.getStatus() != McqStatus.REJECTED)
            .filter(m -> techStackId == null || (m.getTechStack() != null && m.getTechStack().getId().equals(techStackId)))
            .filter(m -> topicId == null || (m.getTopic() != null && m.getTopic().getId().equals(topicId)))
            .filter(m -> excludeId == null || !m.getId().equals(excludeId))
            .limit(50) // cap for prompt size
            .collect(Collectors.toList());

        List<Map<String, Object>> similar = aiService.checkDuplicateAgainstDb(questionStem, pool);

        // Check for AI error
        if (similar.size() == 1 && similar.get(0).containsKey("error")) {
            return ResponseEntity.ok(Map.of(
                "blocked", false,
                "similarQuestions", List.of(),
                "aiError", similar.get(0).get("error")
            ));
        }

        boolean blocked = similar.stream().anyMatch(r -> {
            Object pct = r.get("similarityPercent");
            return pct != null && ((Number) pct).intValue() >= 30;
        });

        return ResponseEntity.ok(Map.of(
            "blocked", blocked,
            "similarQuestions", similar
        ));
    }

    @PostMapping("/validate-answer")
    public ResponseEntity<Map<String, Object>> validateAnswer(@RequestBody Map<String, String> body) {
        Map<String, Object> result = aiService.validateAnswer(
                body.get("questionStem"),
                body.get("optionA"),
                body.get("optionB"),
                body.get("optionC"),
                body.get("optionD"),
                body.get("correctAnswer")
        );
        return ResponseEntity.ok(result);
    }

    @PostMapping("/extract-from-image")
    public ResponseEntity<Map<String, Object>> extractFromImage(
            @RequestParam("image") MultipartFile image) {
        return ResponseEntity.ok(aiService.extractFromImage(image));
    }

    @PostMapping("/generate-distractors")
    public ResponseEntity<Map<String, Object>> generateDistractors(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(aiService.generateDistractors(
                body.get("questionStem"),
                body.get("correctAnswer")
        ));
    }

    @PostMapping("/generate-explanations")
    public ResponseEntity<Map<String, Object>> generateExplanations(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(aiService.generateExplanations(
                body.get("questionStem"),
                body.get("optionA"),
                body.get("optionB"),
                body.get("optionC"),
                body.get("optionD"),
                body.get("correctAnswer")
        ));
    }

    /**
     * AI MCQ Generator: generates N MCQs for a given tech stack + topic and saves them
     * as DRAFT MCQs owned by the authenticated user. Returns the list of saved MCQ IDs.
     */
    @PostMapping("/generate-mcqs")
    public ResponseEntity<Map<String, Object>> generateAndSaveMcqs(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal String enterpriseId) {

        User creator = resolveUser(enterpriseId);

        Long techStackId = Long.valueOf(body.get("techStackId").toString());
        Long topicId     = Long.valueOf(body.get("topicId").toString());
        int  count       = Integer.parseInt(body.getOrDefault("count", "3").toString());
        String diff      = body.getOrDefault("difficulty", "MEDIUM").toString().toUpperCase();
        if (count < 1) count = 1;
        if (count > 10) count = 10;

        TechStack techStack = techStackRepository.findById(techStackId)
                .orElseThrow(() -> new ResourceNotFoundException("Tech stack not found"));
        Topic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new ResourceNotFoundException("Topic not found"));

        List<Map<String, Object>> generated = aiService.generateMcqs(
                techStack.getName(), topic.getName(), count, diff);

        // Check if AI returned an error
        if (generated.size() == 1 && generated.get(0).containsKey("error")) {
            return ResponseEntity.status(500)
                    .body(Map.of("error", generated.get(0).get("error").toString()));
        }

        List<Long> savedIds = new ArrayList<>();
        List<String> skippedDuplicates = new ArrayList<>();

        // Pre-fetch existing MCQs for duplicate checking (same tech stack + topic, non-rejected)
        List<Mcq> existingMcqs = mcqRepository.findAll().stream()
            .filter(m -> m.getStatus() != McqStatus.REJECTED)
            .filter(m -> m.getTechStack() != null && m.getTechStack().getId().equals(techStackId))
            .filter(m -> m.getTopic() != null && m.getTopic().getId().equals(topicId))
            .limit(50)
            .collect(Collectors.toList());

        for (Map<String, Object> q : generated) {
            try {
                String stem = q.get("questionStem").toString();

                // Duplicate check against DB — skip if >= 30% similar
                List<Map<String, Object>> simResults = aiService.checkDuplicateAgainstDb(stem, existingMcqs);
                boolean isDuplicate = simResults.stream().anyMatch(r -> {
                    Object pct = r.get("similarityPercent");
                    return pct != null && ((Number) pct).intValue() >= 30;
                });
                if (isDuplicate) {
                    skippedDuplicates.add(stem.length() > 80 ? stem.substring(0, 80) + "..." : stem);
                    continue;
                }

                Mcq mcq = new Mcq();
                mcq.setQuestionStem(stem);
                mcq.setOptionA(q.get("optionA").toString());
                mcq.setOptionB(q.get("optionB").toString());
                mcq.setOptionC(q.get("optionC").toString());
                mcq.setOptionD(q.get("optionD").toString());
                String ca = q.getOrDefault("correctAnswer", "A").toString().trim().toUpperCase();
                mcq.setCorrectAnswer(ca.substring(0, 1));
                String qDiff = q.getOrDefault("difficulty", diff).toString().toUpperCase();
                try { mcq.setDifficulty(Difficulty.valueOf(qDiff)); }
                catch (Exception e) { mcq.setDifficulty(Difficulty.valueOf(diff)); }
                mcq.setTechStack(techStack);
                mcq.setTopic(topic);
                mcq.setCreator(creator);
                mcq.setStatus(McqStatus.DRAFT);
                mcq.setAiRisk("AI");
                Mcq saved = mcqRepository.save(mcq);
                savedIds.add(saved.getId());
            } catch (Exception ignored) { /* skip malformed question */ }
        }

        return ResponseEntity.ok(Map.of(
                "generated", savedIds.size(),
                "ids", savedIds,
                "skippedDuplicates", skippedDuplicates.size(),
                "skippedStems", skippedDuplicates,
                "creatorEnterpriseId", creator.getEnterpriseId(),
                "creatorFullName", creator.getFullName(),
                "techStack", techStack.getName(),
                "topic", topic.getName()
        ));
    }

    /**
     * AI Quality Score: rates an MCQ 0-100, detects difficulty mismatch, flags issues.
     * Called on-demand from McqDetail or McqForm.
     */
    @PostMapping("/score-quality")
    public ResponseEntity<Map<String, Object>> scoreQuality(@RequestBody Map<String, Object> body) {
        String stem = (String) body.getOrDefault("questionStem", "");
        String optA = (String) body.getOrDefault("optionA", "");
        String optB = (String) body.getOrDefault("optionB", "");
        String optC = (String) body.getOrDefault("optionC", "");
        String optD = (String) body.getOrDefault("optionD", "");
        String correct = (String) body.getOrDefault("correctAnswer", "");
        String difficulty = (String) body.getOrDefault("difficulty", "MEDIUM");
        if (stem.isBlank()) return ResponseEntity.badRequest().body(Map.of("error", "questionStem required"));
        return ResponseEntity.ok(aiService.scoreQuality(stem, optA, optB, optC, optD, correct, difficulty));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FEATURE: AI Auto-Difficulty Scoring
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * POST /api/v1/ai/auto-difficulty
     * Body: {"mcqId": 42}
     *
     * Automatically scores difficulty of one MCQ and persists the result.
     * Works with or without API key (rule-based fallback).
     * Returns: {difficulty, score, reasoning, source, mcqId}
     */
    @PostMapping("/auto-difficulty")
    @Transactional
    public ResponseEntity<Map<String, Object>> autoDifficulty(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal String enterpriseId) {
        Object idObj = body.get("mcqId");
        if (idObj == null) return ResponseEntity.badRequest().body(Map.of("error", "mcqId required"));
        Long mcqId = ((Number) idObj).longValue();
        Mcq mcq = mcqRepository.findById(mcqId)
                .orElseThrow(() -> new ResourceNotFoundException("MCQ not found: " + mcqId));

        Map<String, Object> result = aiService.autoDifficulty(mcq);

        // Persist the scored difficulty and score back to the MCQ
        String diffStr = (String) result.get("difficulty");
        if (diffStr != null) {
            try { mcq.setDifficulty(Difficulty.valueOf(diffStr)); } catch (IllegalArgumentException ignored) {}
        }
        Object scoreObj = result.get("score");
        if (scoreObj != null) mcq.setAiScore(((Number) scoreObj).intValue());
        mcqRepository.save(mcq);

        result.put("mcqId", mcqId);
        return ResponseEntity.ok(result);
    }

    /**
     * POST /api/v1/ai/bulk-auto-difficulty
     * Body: {"techStackId": 1} or {} for all unscored
     *
     * Batch-scores all MCQs that have no aiScore yet (Admin only).
     * Returns: {processed, updated, results[]}
     */
    @PostMapping("/bulk-auto-difficulty")
    @Transactional
    public ResponseEntity<Map<String, Object>> bulkAutoDifficulty(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal String enterpriseId) {
        User user = userRepository.findByEnterpriseId(enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (!"ADMIN".equals(user.getRole().name())) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin only"));
        }

        // Fetch MCQs without an aiScore
        List<Mcq> unscored = mcqRepository.findAll().stream()
                .filter(m -> m.getAiScore() == null)
                .collect(Collectors.toList());

        List<Map<String, Object>> results = new ArrayList<>();
        for (Mcq mcq : unscored) {
            Map<String, Object> r = aiService.autoDifficulty(mcq);
            String diffStr = (String) r.get("difficulty");
            if (diffStr != null) {
                try { mcq.setDifficulty(Difficulty.valueOf(diffStr)); } catch (IllegalArgumentException ignored) {}
            }
            Object scoreObj = r.get("score");
            if (scoreObj != null) mcq.setAiScore(((Number) scoreObj).intValue());
            mcqRepository.save(mcq);
            r.put("mcqId", mcq.getId());
            results.add(r);
        }

        return ResponseEntity.ok(Map.of(
                "processed", unscored.size(),
                "updated", results.size(),
                "results", results
        ));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FEATURE: Semantic Search / Vector RAG
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * POST /api/v1/ai/semantic-search
     * Body: {"query": "thread safety in Java", "techStackId": 1, "topicId": null, "limit": 10}
     *
     * Returns MCQs ranked by semantic similarity to the query.
     * With API key: OpenAI embeddings + cosine similarity.
     * Without API key: keyword / Jaccard similarity fallback.
     */
    @PostMapping("/semantic-search")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> semanticSearch(
            @RequestBody Map<String, Object> body) {
        String query = (String) body.getOrDefault("query", "");
        if (query.isBlank()) return ResponseEntity.badRequest().body(Map.of("error", "query required"));

        int limit = body.containsKey("limit") ? ((Number) body.get("limit")).intValue() : 10;
        if (limit < 1 || limit > 50) limit = 10;

        // Optionally filter candidates by techStack / topic
        List<Mcq> candidates;
        if (body.containsKey("techStackId") && body.get("techStackId") != null) {
            Long tsId = ((Number) body.get("techStackId")).longValue();
            candidates = mcqRepository.findAll().stream()
                    .filter(m -> m.getTechStack() != null && m.getTechStack().getId().equals(tsId))
                    .collect(Collectors.toList());
        } else {
            candidates = mcqRepository.findAll();
        }

        List<Map<String, Object>> results = aiService.semanticSearch(query, candidates, limit);
        return ResponseEntity.ok(Map.of(
                "query", query,
                "total", results.size(),
                "results", results
        ));
    }
}
