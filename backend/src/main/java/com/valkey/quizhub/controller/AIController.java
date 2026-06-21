package com.valkey.quizhub.controller;

import com.valkey.quizhub.ai.QuizHubTools;
import com.valkey.quizhub.entity.Mcq;
import com.valkey.quizhub.entity.TechStack;
import com.valkey.quizhub.entity.Topic;
import com.valkey.quizhub.entity.User;
import com.valkey.quizhub.enums.Difficulty;
import com.valkey.quizhub.enums.McqStatus;
import com.valkey.quizhub.exception.ResourceNotFoundException;
import com.valkey.quizhub.repository.McqRepository;
import com.valkey.quizhub.repository.TechStackRepository;
import com.valkey.quizhub.repository.TopicRepository;
import com.valkey.quizhub.repository.UserRepository;
import com.valkey.quizhub.service.AIService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import reactor.core.publisher.Flux;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AIController {

    private final AIService aiService;
    private final QuizHubTools quizHubTools;
    private final McqRepository mcqRepository;
    private final TechStackRepository techStackRepository;
    private final TopicRepository topicRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

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

        // Fetch existing approved/draft/in-review MCQs — search broadly for duplicates
        // Note: topicId filter is optional — we search ALL topics in the tech stack for better coverage
        List<Mcq> pool = mcqRepository.findAll().stream()
            .filter(m -> m.getStatus() != McqStatus.REJECTED)
            .filter(m -> techStackId == null || (m.getTechStack() != null && m.getTechStack().getId().equals(techStackId)))
            .filter(m -> excludeId == null || !m.getId().equals(excludeId))
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

        // Enrich matches with full option details (PPT mockup: show similar question's options A–D)
        Map<Long, Mcq> poolById = pool.stream().collect(Collectors.toMap(Mcq::getId, m -> m, (a, b) -> a));
        for (Map<String, Object> r : similar) {
            Object idObj = r.get("id");
            if (idObj == null) continue;
            Mcq match = poolById.get(Long.valueOf(idObj.toString()));
            if (match != null) {
                r.put("optionA", match.getOptionA());
                r.put("optionB", match.getOptionB());
                r.put("optionC", match.getOptionC());
                r.put("optionD", match.getOptionD());
            }
        }

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
     * AI MCQ Generator PREVIEW: generates N MCQs and returns them with duplicate info (no saving).
     * Frontend shows each question with matching existing questions so user can keep/remove.
     */
    private static boolean isBlockedDuplicate(List<Map<String, Object>> simResults) {
        return simResults != null && simResults.stream().anyMatch(r -> {
            Object pct = r.get("similarityPercent");
            return pct != null && ((Number) pct).intValue() >= 30;
        });
    }

    /** Cheap intra-batch dedup: word-overlap Jaccard ≥ 60% against already-accepted stems. */
    private static boolean isIntraBatchDuplicate(String stem, List<String> acceptedStems) {
        java.util.Set<String> words = java.util.Arrays.stream(stem.toLowerCase().split("\\W+"))
                .filter(w -> w.length() > 3).collect(Collectors.toSet());
        if (words.isEmpty()) return false;
        for (String prev : acceptedStems) {
            java.util.Set<String> prevWords = java.util.Arrays.stream(prev.toLowerCase().split("\\W+"))
                    .filter(w -> w.length() > 3).collect(Collectors.toSet());
            if (prevWords.isEmpty()) continue;
            long inter = words.stream().filter(prevWords::contains).count();
            double jaccard = (double) inter / (words.size() + prevWords.size() - inter);
            if (jaccard >= 0.6) return true;
        }
        return false;
    }

    @PostMapping("/generate-mcqs-preview")
    public ResponseEntity<Map<String, Object>> generateMcqsPreview(
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

        // Pre-fetch existing MCQs for duplicate checking (also used to steer generation away)
        List<Mcq> existingMcqs = mcqRepository.findAll().stream()
            .filter(m -> m.getStatus() != McqStatus.REJECTED)
            .filter(m -> m.getTechStack() != null && m.getTechStack().getId().equals(techStackId))
            .filter(m -> m.getTopic() != null && m.getTopic().getId().equals(topicId))
            .limit(50)
            .collect(Collectors.toList());

        // Initial generation already avoids existing stems (prevention > cure)
        List<String> existingStems = existingMcqs.stream()
                .map(Mcq::getQuestionStem)
                .filter(s -> s != null && !s.isBlank())
                .limit(15)
                .collect(Collectors.toList());

        List<Map<String, Object>> generated = aiService.generateMcqs(
                techStack.getName(), topic.getName(), count, diff, existingStems);

        if (generated.size() == 1 && generated.get(0).containsKey("error")) {
            return ResponseEntity.status(500)
                    .body(Map.of("error", generated.get(0).get("error").toString()));
        }

        // Build preview list with duplicate match info.
        // If a generated question is a duplicate (≥30%), auto-regenerate a replacement
        // (up to 2 retries each) and re-check it before showing — PPT Level 2 Slide 6.
        List<Map<String, Object>> previewQuestions = new ArrayList<>();
        List<String> acceptedStems = new ArrayList<>();
        for (Map<String, Object> q : generated) {
            Map<String, Object> current = q;
            String stem = current.getOrDefault("questionStem", "").toString();
            List<Map<String, Object>> simResults = List.of();
            boolean hasDuplicate = false;
            boolean wasReplaced = false;
            String replacedOriginalStem = null;                 // the AI question that was discarded
            List<Map<String, Object>> replacedOriginalMatches = null; // what it matched in the DB
            try {
                simResults = aiService.checkDuplicateAgainstDb(stem, existingMcqs);
                hasDuplicate = isBlockedDuplicate(simResults) || isIntraBatchDuplicate(stem, acceptedStems);

                int retries = 0;
                while (hasDuplicate && retries < 2) {
                    retries++;
                    // Steer the AI away from the matched existing stems + already-accepted batch stems
                    List<String> avoid = new ArrayList<>(acceptedStems);
                    simResults.stream()
                            .map(r -> String.valueOf(r.getOrDefault("questionStem", "")))
                            .filter(s -> !s.isBlank())
                            .limit(10)
                            .forEach(avoid::add);
                    List<Map<String, Object>> replacement = aiService.generateMcqs(
                            techStack.getName(), topic.getName(), 1, diff, avoid);
                    if (replacement == null || replacement.isEmpty()
                            || !(replacement.get(0) instanceof Map)
                            || replacement.get(0).containsKey("error")) {
                        break; // AI failed — keep flagged original
                    }
                    Map<String, Object> repQ = replacement.get(0);
                    String repStem = repQ.getOrDefault("questionStem", "").toString();
                    if (repStem.isBlank()) break;
                    List<Map<String, Object>> repSim = aiService.checkDuplicateAgainstDb(repStem, existingMcqs);
                    if (!isBlockedDuplicate(repSim) && !isIntraBatchDuplicate(repStem, acceptedStems)) {
                        // Remember what was discarded and why (shown in preview UI)
                        replacedOriginalStem = stem;
                        replacedOriginalMatches = simResults.stream()
                                .filter(r -> {
                                    Object pct = r.get("similarityPercent");
                                    return pct != null && ((Number) pct).intValue() >= 30;
                                })
                                .limit(3)
                                .collect(Collectors.toList());
                        current = repQ;
                        stem = repStem;
                        simResults = repSim;
                        hasDuplicate = false;
                        wasReplaced = true;
                    }
                }
            } catch (Exception e) {
                simResults = List.of();
                hasDuplicate = false;
            }
            Map<String, Object> preview = new java.util.LinkedHashMap<>(current);
            preview.put("duplicateMatches", simResults);
            preview.put("isDuplicate", hasDuplicate);
            preview.put("wasReplaced", wasReplaced);
            if (wasReplaced) {
                preview.put("replacedOriginalStem", replacedOriginalStem);
                preview.put("replacedOriginalMatches", replacedOriginalMatches == null ? List.of() : replacedOriginalMatches);
            }
            acceptedStems.add(stem);
            previewQuestions.add(preview);
        }

        Map<String, Object> response = new java.util.LinkedHashMap<>();
        response.put("questions", previewQuestions);
        response.put("techStack", techStack.getName());
        response.put("techStackId", techStackId);
        response.put("topic", topic.getName());
        response.put("topicId", topicId);
        response.put("difficulty", diff);
        response.put("creatorFullName", creator.getFullName());
        return ResponseEntity.ok(response);
    }

    /**
     * Save selected AI-generated MCQs (from preview). Accepts array of questions to save.
     */
    @PostMapping("/save-generated-mcqs")
    @Transactional
    public ResponseEntity<Map<String, Object>> saveGeneratedMcqs(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal String enterpriseId) {

        User creator = resolveUser(enterpriseId);
        Long techStackId = Long.valueOf(body.get("techStackId").toString());
        Long topicId     = Long.valueOf(body.get("topicId").toString());
        String diff      = body.getOrDefault("difficulty", "MEDIUM").toString().toUpperCase();

        TechStack techStack = techStackRepository.findById(techStackId)
                .orElseThrow(() -> new ResourceNotFoundException("Tech stack not found"));
        Topic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new ResourceNotFoundException("Topic not found"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> questions = (List<Map<String, Object>>) body.get("questions");
        List<Long> savedIds = new ArrayList<>();

        for (Map<String, Object> q : questions) {
            try {
                Mcq mcq = new Mcq();
                mcq.setQuestionStem(q.get("questionStem").toString());
                mcq.setOptionA(q.get("optionA").toString());
                mcq.setOptionB(q.get("optionB").toString());
                mcq.setOptionC(q.get("optionC").toString());
                mcq.setOptionD(q.get("optionD").toString());
                String ca = q.getOrDefault("correctAnswer", "A").toString().trim().toUpperCase();
                mcq.setCorrectAnswer(ca.length() > 0 ? ca.substring(0, 1) : "A");
                String qDiff = q.getOrDefault("difficulty", diff).toString().toUpperCase();
                try { mcq.setDifficulty(Difficulty.valueOf(qDiff)); }
                catch (Exception e) { mcq.setDifficulty(Difficulty.valueOf(diff)); }
                mcq.setTechStack(techStack);
                mcq.setTopic(topic);
                mcq.setCreator(creator);
                mcq.setStatus(McqStatus.DRAFT);
                mcq.setAiRisk("AI");
                mcq.setAiGenerated(true);
                Mcq saved = mcqRepository.save(mcq);
                savedIds.add(saved.getId());
            } catch (Exception ignored) { /* skip malformed */ }
        }

        Map<String, Object> response = new java.util.LinkedHashMap<>();
        response.put("saved", savedIds.size());
        response.put("ids", savedIds);
        response.put("techStack", techStack.getName());
        response.put("topic", topic.getName());
        response.put("creatorFullName", creator.getFullName());
        return ResponseEntity.ok(response);
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
        String questionType = body.getOrDefault("questionType", "SINGLE").toString().toUpperCase();
        if (count < 1) count = 1;
        if (count > 10) count = 10;

        TechStack techStack = techStackRepository.findById(techStackId)
                .orElseThrow(() -> new ResourceNotFoundException("Tech stack not found"));
        Topic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new ResourceNotFoundException("Topic not found"));

        boolean isAdvancedType = !questionType.equals("SINGLE") && !questionType.equals("MULTI");

        List<Map<String, Object>> generated = aiService.generateMcqs(
                techStack.getName(), topic.getName(), count, diff, questionType);

        // Check if AI returned an error
        if (generated != null && generated.size() == 1 && generated.get(0) != null && generated.get(0).containsKey("error")) {
            return ResponseEntity.status(500)
                    .body(Map.of("error", generated.get(0).get("error").toString()));
        }
        if (generated == null || generated.isEmpty()) {
            return ResponseEntity.status(500)
                    .body(Map.of("error", "AI returned no questions. Please try again."));
        }

        List<Long> savedIds = new ArrayList<>();
        List<String> replacedDuplicates = new ArrayList<>();

        // Fetch existing MCQs in same tech stack + topic for duplicate screening (PPT Level 2 Slide 6)
        List<Mcq> existingPool = mcqRepository.findAll().stream()
            .filter(m -> m.getStatus() != McqStatus.REJECTED)
            .filter(m -> m.getTechStack() != null && m.getTechStack().getId().equals(techStackId))
            .filter(m -> m.getTopic() != null && m.getTopic().getId().equals(topicId))
            .limit(50)
            .collect(Collectors.toList());

        // Process each generated question with duplicate screening
        for (Object rawItem : generated) {
            if (savedIds.size() >= count) break;
            if (!(rawItem instanceof Map)) continue;
            @SuppressWarnings("unchecked")
            Map<String, Object> q = (Map<String, Object>) rawItem;
            try {
                String stem = q.getOrDefault("questionStem", "").toString();
                if (stem.isEmpty()) stem = q.getOrDefault("question", "Generated Question").toString();

                // --- Duplicate screening: if ≥30% similar, attempt replacement ---
                boolean wasDuplicate = false;
                try {
                    List<Map<String, Object>> simResults = aiService.checkDuplicateAgainstDb(stem, existingPool);
                    boolean isDup = simResults.stream().anyMatch(r -> {
                        Object pct = r.get("similarityPercent");
                        return pct != null && ((Number) pct).intValue() >= 30;
                    });
                    if (isDup) {
                        wasDuplicate = true;
                        replacedDuplicates.add(stem);
                        // Try to regenerate ONE replacement question
                        List<Map<String, Object>> replacement = aiService.generateMcqs(
                                techStack.getName(), topic.getName(), 1, diff, questionType);
                        if (replacement != null && !replacement.isEmpty() && replacement.get(0) instanceof Map
                                && !replacement.get(0).containsKey("error")) {
                            @SuppressWarnings("unchecked")
                            Map<String, Object> repQ = replacement.get(0);
                            String repStem = repQ.getOrDefault("questionStem", "").toString();
                            if (repStem.isEmpty()) repStem = repQ.getOrDefault("question", "").toString();
                            if (!repStem.isEmpty()) {
                                // Use the replacement instead
                                q = repQ;
                                stem = repStem;
                            }
                        }
                    }
                } catch (Exception dupEx) {
                    // Duplicate check failed (AI unavailable) — proceed with saving anyway
                    System.err.println("[AI-GEN] Duplicate check skipped (AI unavailable): " + dupEx.getMessage());
                }

                Mcq mcq = new Mcq();
                mcq.setQuestionStem(stem);

                // Set questionType for ALL questions
                try { mcq.setQuestionType(com.valkey.quizhub.enums.QuestionType.valueOf(questionType)); }
                catch (Exception e) { mcq.setQuestionType(com.valkey.quizhub.enums.QuestionType.SINGLE); }

                if (isAdvancedType) {
                    // Advanced question types: store full content as JSON, set placeholder options
                    mcq.setOptionA("N/A");
                    mcq.setOptionB("N/A");
                    mcq.setOptionC("N/A");
                    mcq.setOptionD("N/A");
                    String ca = q.getOrDefault("correctAnswer", "See content").toString();
                    mcq.setCorrectAnswer(ca.length() > 500 ? ca.substring(0, 500) : ca);
                    // Remove questionStem from contentJson (it's already in the stem field)
                    Map<String, Object> contentMap = new java.util.LinkedHashMap<>(q);
                    contentMap.remove("questionStem");
                    contentMap.remove("question");
                    mcq.setContentJson(objectMapper.writeValueAsString(contentMap));
                } else {
                    // SINGLE or MULTI: standard A/B/C/D format
                    mcq.setOptionA(q.getOrDefault("optionA", "N/A").toString());
                    mcq.setOptionB(q.getOrDefault("optionB", "N/A").toString());
                    mcq.setOptionC(q.getOrDefault("optionC", "N/A").toString());
                    mcq.setOptionD(q.getOrDefault("optionD", "N/A").toString());
                    String ca = q.getOrDefault("correctAnswer", "A").toString().trim().toUpperCase();
                    // For MULTI, keep full answer like "A,C" instead of truncating to single char
                    if (questionType.equals("MULTI")) {
                        mcq.setCorrectAnswer(ca);
                    } else {
                        mcq.setCorrectAnswer(ca.length() > 0 ? ca.substring(0, 1) : "A");
                    }
                }

                String qDiff = q.getOrDefault("difficulty", diff).toString().toUpperCase();
                try { mcq.setDifficulty(Difficulty.valueOf(qDiff)); }
                catch (Exception e) { mcq.setDifficulty(Difficulty.valueOf(diff)); }
                mcq.setTechStack(techStack);
                mcq.setTopic(topic);
                mcq.setCreator(creator);
                mcq.setStatus(McqStatus.DRAFT);
                mcq.setAiRisk(wasDuplicate ? "AI-REPLACED" : "AI");
                mcq.setAiGenerated(true);
                Mcq saved = mcqRepository.save(mcq);
                savedIds.add(saved.getId());

                // Add newly saved MCQ to the pool so subsequent questions are checked against it too
                existingPool.add(saved);
            } catch (Exception ex) {
                System.err.println("[AI-GEN] Skipped malformed question: " + ex.getMessage() + " | data=" + q);
            }
        }

        // Build response with both new and legacy field names for backward compat
        Map<String, Object> response = new java.util.LinkedHashMap<>();
        response.put("generated", savedIds.size());
        response.put("ids", savedIds);
        response.put("replacedDuplicates", replacedDuplicates.size());
        response.put("replacedStems", replacedDuplicates);
        response.put("skippedDuplicates", replacedDuplicates.size());
        response.put("skippedStems", replacedDuplicates);
        response.put("requestedCount", count);
        response.put("creatorEnterpriseId", creator.getEnterpriseId());
        response.put("creatorFullName", creator.getFullName());
        response.put("techStack", techStack.getName());
        response.put("topic", topic.getName());
        return ResponseEntity.ok(response);
    }

    /**
     * AI Quality Score: rates an MCQ 0-100, detects difficulty mismatch, flags issues.
     * Called on-demand from McqDetail or McqForm.
     */
    @PostMapping("/score-quality")
    @Transactional
    public ResponseEntity<Map<String, Object>> scoreQuality(@RequestBody Map<String, Object> body) {
        String stem = (String) body.getOrDefault("questionStem", "");
        String optA = (String) body.getOrDefault("optionA", "");
        String optB = (String) body.getOrDefault("optionB", "");
        String optC = (String) body.getOrDefault("optionC", "");
        String optD = (String) body.getOrDefault("optionD", "");
        String correct = (String) body.getOrDefault("correctAnswer", "");
        String difficulty = (String) body.getOrDefault("difficulty", "MEDIUM");
        if (stem.isBlank()) return ResponseEntity.badRequest().body(Map.of("error", "questionStem required"));
        Map<String, Object> result = aiService.scoreQuality(stem, optA, optB, optC, optD, correct, difficulty);

        // Persist quality score to MCQ if mcqId provided
        Object mcqIdObj = body.get("mcqId");
        if (mcqIdObj != null) {
            Long mcqId = ((Number) mcqIdObj).longValue();
            mcqRepository.findById(mcqId).ifPresent(mcq -> {
                Object qs = result.get("qualityScore");
                if (qs != null) mcq.setAiScore(((Number) qs).intValue());
                mcqRepository.save(mcq);
            });
        }
        return ResponseEntity.ok(result);
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

    // ─────────────────────────────────────────────────────────────────────────
    // FEATURE: AI Personalized Learning Path
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * POST /api/v1/ai/learning-path
     * Analyzes user's wrong answers and generates a personalized study plan.
     */
    @PostMapping("/learning-path")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> generateLearningPath(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal String enterpriseId) {
        User user = resolveUser(enterpriseId);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> wrongAnswers = (List<Map<String, Object>>) body.getOrDefault("wrongAnswers", List.of());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> correctAnswers = (List<Map<String, Object>>) body.getOrDefault("correctAnswers", List.of());

        if (wrongAnswers.isEmpty() && correctAnswers.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Provide wrongAnswers and/or correctAnswers arrays"));
        }

        Map<String, Object> result = aiService.generateLearningPath(
            user.getFullName() != null ? user.getFullName() : user.getEnterpriseId(),
            wrongAnswers, correctAnswers);
        result.put("userId", user.getId());
        result.put("userName", user.getFullName());
        return ResponseEntity.ok(result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FEATURE: AI Code-to-MCQ Generator
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * POST /api/v1/ai/generate-from-code
     * Takes a code snippet and generates MCQs testing understanding of that code.
     */
    @PostMapping("/generate-from-code")
    @Transactional
    public ResponseEntity<Map<String, Object>> generateFromCode(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal String enterpriseId) {
        User creator = resolveUser(enterpriseId);

        String code = (String) body.getOrDefault("code", "");
        String language = (String) body.getOrDefault("language", "Java");
        int count = body.containsKey("count") ? ((Number) body.get("count")).intValue() : 3;
        String difficulty = (String) body.getOrDefault("difficulty", "MEDIUM");
        Long techStackId = body.containsKey("techStackId") ? ((Number) body.get("techStackId")).longValue() : null;
        Long topicId = body.containsKey("topicId") ? ((Number) body.get("topicId")).longValue() : null;

        if (code.isBlank()) return ResponseEntity.badRequest().body(Map.of("error", "code is required"));

        List<Map<String, Object>> generated = aiService.generateMcqsFromCode(code, language, count, difficulty.toUpperCase());

        if (generated.size() == 1 && generated.get(0).containsKey("error")) {
            return ResponseEntity.status(500).body(Map.of("error", generated.get(0).get("error").toString()));
        }

        // Optionally save as DRAFT MCQs
        boolean save = Boolean.parseBoolean(body.getOrDefault("save", "false").toString());
        List<Long> savedIds = new ArrayList<>();

        if (save && techStackId != null && topicId != null) {
            TechStack techStack = techStackRepository.findById(techStackId)
                    .orElseThrow(() -> new ResourceNotFoundException("Tech stack not found"));
            Topic topic = topicRepository.findById(topicId)
                    .orElseThrow(() -> new ResourceNotFoundException("Topic not found"));

            for (Map<String, Object> q : generated) {
                try {
                    Mcq mcq = new Mcq();
                    mcq.setQuestionStem(q.get("questionStem").toString());
                    mcq.setOptionA(q.get("optionA").toString());
                    mcq.setOptionB(q.get("optionB").toString());
                    mcq.setOptionC(q.get("optionC").toString());
                    mcq.setOptionD(q.get("optionD").toString());
                    String ca = q.getOrDefault("correctAnswer", "A").toString().trim().toUpperCase();
                    mcq.setCorrectAnswer(ca.substring(0, 1));
                    try { mcq.setDifficulty(Difficulty.valueOf(difficulty.toUpperCase())); }
                    catch (Exception e) { mcq.setDifficulty(Difficulty.MEDIUM); }
                    mcq.setTechStack(techStack);
                    mcq.setTopic(topic);
                    mcq.setCreator(creator);
                    mcq.setStatus(McqStatus.DRAFT);
                    mcq.setAiRisk("AI-CODE");
                    Mcq saved2 = mcqRepository.save(mcq);
                    savedIds.add(saved2.getId());
                } catch (Exception ignored) {}
            }
        }

        Map<String, Object> response = new java.util.LinkedHashMap<>();
        response.put("generated", generated.size());
        response.put("questions", generated);
        response.put("savedIds", savedIds);
        response.put("language", language);
        response.put("codeSnippet", code.length() > 200 ? code.substring(0, 200) + "..." : code);
        return ResponseEntity.ok(response);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FEATURE: AI MCQ Rewrite / Improve
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * POST /api/v1/ai/rewrite-mcq
     * AI rewrites a weak MCQ to improve quality. Returns original vs improved side-by-side.
     */
    @PostMapping("/rewrite-mcq")
    public ResponseEntity<Map<String, Object>> rewriteMcq(@RequestBody Map<String, Object> body) {
        String stem = (String) body.getOrDefault("questionStem", "");
        String optA = (String) body.getOrDefault("optionA", "");
        String optB = (String) body.getOrDefault("optionB", "");
        String optC = (String) body.getOrDefault("optionC", "");
        String optD = (String) body.getOrDefault("optionD", "");
        String correct = (String) body.getOrDefault("correctAnswer", "A");
        String difficulty = (String) body.getOrDefault("difficulty", "MEDIUM");

        if (stem.isBlank()) return ResponseEntity.badRequest().body(Map.of("error", "questionStem required"));

        Map<String, Object> result = aiService.rewriteMcq(stem, optA, optB, optC, optD, correct, difficulty);
        return ResponseEntity.ok(result);
    }

    /**
     * POST /api/v1/ai/rewrite-mcq/{id}
     * AI rewrites an existing MCQ by ID. Does NOT overwrite — returns the suggestion.
     */
    @PostMapping("/rewrite-mcq/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> rewriteMcqById(@PathVariable Long id) {
        Mcq mcq = mcqRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MCQ not found: " + id));

        Map<String, Object> result = aiService.rewriteMcq(
            mcq.getQuestionStem(),
            mcq.getOptionA(), mcq.getOptionB(), mcq.getOptionC(), mcq.getOptionD(),
            String.valueOf(mcq.getCorrectAnswer()),
            mcq.getDifficulty() != null ? mcq.getDifficulty().name() : "MEDIUM"
        );
        result.put("mcqId", id);
        return ResponseEntity.ok(result);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STREAMING CHAT (SSE) — Spring AI Pattern #2
    // ═══════════════════════════════════════════════════════════════════════════

    @PostMapping(value = "/stream-chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> streamChat(@RequestBody Map<String, String> body) {
        String message = body.getOrDefault("message", "Hello");
        return aiService.streamChat(message);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // RAG — Retrieval-Augmented Generation — Spring AI Pattern #3
    // ═══════════════════════════════════════════════════════════════════════════

    @PostMapping("/rag-query")
    public ResponseEntity<Map<String, Object>> ragQuery(@RequestBody Map<String, String> body) {
        String question = body.getOrDefault("question", "What is QuizHub?");
        return ResponseEntity.ok(aiService.ragQuery(question));
    }

    /**
     * Agentic / Self-RAG — 2-step LLM pipeline.
     *
     * Request body:
     *   { "question": "...", "threshold": 70 }   (threshold optional, default 70)
     *
     * Response includes:
     *   relevanceScore   — LLM #1 score (0-100) for how well context covers the question
     *   threshold        — minimum score to use grounded answer
     *   judgeReasoning   — LLM #1 explanation of the score
     *   contextUsed      — true if relevanceScore >= threshold
     *   answerMode       — "grounded (RAG context used)" or "fallback (general knowledge)"
     *   answer           — LLM #2 final answer
     *   sources          — vector store document sources used
     */
    @PostMapping("/smart-rag-query")
    public ResponseEntity<Map<String, Object>> smartRagQuery(@RequestBody Map<String, Object> body) {
        String question = (String) body.getOrDefault("question", "What is QuizHub?");
        int threshold = body.containsKey("threshold")
            ? ((Number) body.get("threshold")).intValue()
            : 70;
        return ResponseEntity.ok(aiService.smartRagQuery(question, threshold));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TOOL CALLING — Spring AI Pattern #4
    // ═══════════════════════════════════════════════════════════════════════════

    @PostMapping("/tool-chat")
    public ResponseEntity<Map<String, String>> toolChat(@RequestBody Map<String, String> body) {
        String message = body.getOrDefault("message", "How many MCQs are in QuizHub?");
        String response = aiService.toolChat(message, quizHubTools);
        return ResponseEntity.ok(Map.of("response", response != null ? response : "No response"));
    }

    /**
     * POST /api/v1/ai/generate-interactive
     * Free-form prompt-based interactive question generation.
     * Takes a natural language prompt (e.g., "5 Angular interactive questions")
     * and returns diverse question types (MCQ, multi-select, drag-order, fill-blank, predict-output, debug-code).
     * Optional fields:
     *   questionType — if set, ALL returned questions will be of that type only (e.g. "DRAG_ORDER")
     *   count        — how many questions to generate (1-10, default 5)
     */
    @PostMapping("/generate-interactive")
    public ResponseEntity<Map<String, Object>> generateInteractive(@RequestBody Map<String, Object> body) {
        String prompt = body.getOrDefault("prompt", "") != null ? body.get("prompt").toString() : "";
        if (prompt.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "prompt is required"));
        }
        String questionType = body.containsKey("questionType") ? body.get("questionType").toString() : null;
        int count = 5;
        if (body.containsKey("count")) {
            try { count = Math.min(10, Math.max(1, ((Number) body.get("count")).intValue())); } catch (Exception ignored) {}
        }
        try {
            List<Map<String, Object>> questions = aiService.generateInteractiveQuestions(prompt, questionType, count);
            if (questions.size() == 1 && questions.get(0).containsKey("error")) {
                return ResponseEntity.status(500).body(Map.of("error", questions.get(0).get("error").toString()));
            }
            return ResponseEntity.ok(Map.of("questions", questions, "count", questions.size()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Generation failed: " + e.getMessage()));
        }
    }
}
