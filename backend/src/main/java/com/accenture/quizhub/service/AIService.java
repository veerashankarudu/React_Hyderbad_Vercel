package com.accenture.quizhub.service;

import com.accenture.quizhub.entity.Mcq;
import com.accenture.quizhub.enums.Difficulty;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeType;
import org.springframework.web.multipart.MultipartFile;

import reactor.core.publisher.Flux;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class AIService {

    private final ChatClient chatClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired(required = false)
    private EmbeddingModel embeddingModel;

    @Autowired(required = false)
    private VectorStore vectorStore;

    @Value("${spring.ai.ollama.base-url:http://localhost:11434}")
    private String ollamaBaseUrl;

    @Value("${spring.ai.openai.api-key:}")
    private String openAiApiKey;

    @Value("${spring.ai.ollama.chat.enabled:true}")
    private boolean ollamaEnabled;

    private boolean isApiKeyConfigured() {
        // Ollama doesn't need an API key — it's local
        if (ollamaEnabled) return true;
        return openAiApiKey != null
            && !openAiApiKey.isBlank()
            && !openAiApiKey.startsWith("sk-placeholder");
    }

    private String noKeyMessage() {
        return "🔑 **AI is not configured.**\n\n"
             + "To enable AI features, either:\n"
             + "• Start Ollama locally (`ollama serve`) — works out of the box!\n"
             + "• Or set the `OPENAI_API_KEY` environment variable and restart the backend.\n\n"
             + "Commands that don't need AI (like `@bot help`) still work!";
    }

    @Autowired
    public AIService(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    /**
     * Optionally enriches an MCQ with AI feedback.
     * This is a non-blocking best-effort call. Callers must handle exceptions.
     */
    public void enrichMcq(Mcq mcq) {
        String prompt = buildPrompt(mcq);
        String response = chatClient.prompt()
                .user(prompt)
                .call()
                .content();
        // AI feedback is advisory only — just log it for now
        // Future: parse response and set aiWarning if quality issues found
        if (response != null && response.toLowerCase().contains("issue")) {
            mcq.setAiWarning(response);
        }
    }

    public String generateHint(Long mcqId, String questionStem) {
        String prompt = "For the following multiple-choice question, provide a short pedagogical hint that helps a learner arrive at the answer without revealing it directly.\n\nQuestion: " + questionStem;
        return chatClient.prompt()
                .user(prompt)
                .call()
                .content();
    }

    /**
     * Generate a raw text completion from a prompt.
     */
    public String generateRawCompletion(String prompt) {
        if (!isApiKeyConfigured()) {
            throw new RuntimeException("AI is not configured");
        }
        return chatClient.prompt()
                .user(prompt)
                .call()
                .content();
    }

    /**
     * Compares newStem against existingMcqs using a HYBRID approach:
     * 1. ALWAYS runs text-based similarity (keyword + n-gram + concept matching) — guaranteed to work
     * 2. OPTIONALLY enhances with AI semantic scoring if Ollama/OpenAI is available
     * Returns a list of {id, questionStem, similarityPercent, reason} for matches ≥ 10%.
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> checkDuplicateAgainstDb(String newStem, List<Mcq> existingMcqs) {
        if (existingMcqs == null || existingMcqs.isEmpty()) {
            return new ArrayList<>();
        }

        // STEP 1: Always compute text-based similarity (instant, reliable, no AI needed)
        List<Map<String, Object>> textResults = textBasedSimilarityCheck(newStem, existingMcqs);

        // STEP 2: Try AI-enhanced semantic scoring for better accuracy
        List<Map<String, Object>> aiResults = null;
        try {
            if (isApiKeyConfigured()) {
                // Only send top candidates to AI (limit prompt size) — max 30 from pool
                List<Mcq> aiPool = existingMcqs.size() > 30 ? existingMcqs.subList(0, 30) : existingMcqs;
                aiResults = getAiSimilarityScores(newStem, aiPool);
            }
        } catch (Exception e) {
            // AI unavailable — text-based results are sufficient
            aiResults = null;
        }

        // STEP 3: Merge results — use AI scores where available, text-based as fallback
        if (aiResults != null && !aiResults.isEmpty()) {
            Map<Object, Map<String, Object>> merged = new LinkedHashMap<>();
            // Start with text-based results
            for (Map<String, Object> tr : textResults) {
                if (tr.get("id") != null) merged.put(tr.get("id"), tr);
            }
            // Overlay AI results (AI scores take priority for items it scored)
            for (Map<String, Object> ar : aiResults) {
                Object id = ar.get("id");
                if (id == null) continue;
                if (merged.containsKey(id)) {
                    // Take the HIGHER score between AI and text-based
                    int aiPct = ((Number) ar.get("similarityPercent")).intValue();
                    int txtPct = ((Number) merged.get(id).get("similarityPercent")).intValue();
                    if (aiPct > txtPct) {
                        merged.put(id, ar);
                    }
                } else {
                    merged.put(id, ar);
                }
            }
            List<Map<String, Object>> finalResults = new ArrayList<>(merged.values());
            finalResults.removeIf(r -> {
                Object pct = r.get("similarityPercent");
                return pct == null || ((Number) pct).intValue() < 10;
            });
            finalResults.sort((a, b) -> Integer.compare(
                ((Number) b.get("similarityPercent")).intValue(),
                ((Number) a.get("similarityPercent")).intValue()
            ));
            return finalResults.size() > 20 ? finalResults.subList(0, 20) : finalResults;
        }

        // No AI — return text-based results directly
        return textResults.size() > 20 ? textResults.subList(0, 20) : textResults;
    }

    /**
     * Calls AI (Ollama/OpenAI) for semantic similarity scoring.
     * Returns scored list or null if AI is unavailable.
     */
    private List<Map<String, Object>> getAiSimilarityScores(String newStem, List<Mcq> existingMcqs) {
        StringBuilder existingList = new StringBuilder();
        for (int i = 0; i < existingMcqs.size(); i++) {
            Mcq m = existingMcqs.get(i);
            existingList.append(String.format(
                "%d. [ID:%d] %s\n", i + 1, m.getId(), m.getQuestionStem()
            ));
        }

        String prompt = String.format(
            "You are a SEMANTIC duplicate detection engine for a technical MCQ question bank.\n\n" +
            "YOUR JOB: Detect if the NEW QUESTION tests the SAME CONCEPT/KNOWLEDGE as any existing question.\n" +
            "This is NOT about word matching — it's about MEANING and INTENT.\n\n" +
            "SCORING GUIDE:\n" +
            "- 80-100%%: Tests IDENTICAL knowledge point (definite duplicate, just rephrased)\n" +
            "- 50-79%%: Tests OVERLAPPING knowledge (partially same concept)\n" +
            "- 20-49%%: RELATED topic but tests DIFFERENT specific knowledge\n" +
            "- 0-19%%: UNRELATED questions\n\n" +
            "NEW QUESTION:\n\"%s\"\n\n" +
            "EXISTING QUESTIONS:\n%s\n" +
            "Respond ONLY with a valid JSON array. Include ONLY questions with similarity >= 15%%:\n" +
            "[{\"id\": <question_id_number>, \"questionStem\": \"<stem>\", \"similarityPercent\": <0-100>, \"reason\": \"<brief reason>\"}]\n" +
            "If none are similar, return: []",
            newStem, existingList.toString()
        );

        String raw = chatClient.prompt().user(prompt).call().content();
        if (raw == null) return null;
        raw = raw.replaceAll("(?s)```json\\s*", "").replaceAll("```", "").trim();
        int start = raw.indexOf('[');
        int end = raw.lastIndexOf(']');
        if (start < 0 || end <= start) return null;
        raw = raw.substring(start, end + 1);
        try {
            List<Map<String, Object>> results = objectMapper.readValue(raw, new TypeReference<List<Map<String, Object>>>() {});
            results.removeIf(r -> {
                Object pct = r.get("similarityPercent");
                return pct == null || ((Number) pct).intValue() < 10;
            });
            return results;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Robust text-based similarity check using multiple layers:
     * 1. Keyword containment (if query keywords appear in existing question)
     * 2. Jaccard word overlap
     * 3. Concept/synonym expansion overlap
     * 4. N-gram (bigram) overlap for phrase matching
     * 5. Substring containment bonus
     * Threshold: 10% (shows more candidates for user to review)
     */
    private List<Map<String, Object>> textBasedSimilarityCheck(String newStem, List<Mcq> existingMcqs) {
        Set<String> newWords = tokenize(newStem);
        Set<String> newConcepts = expandConcepts(newWords);
        Set<String> newBigrams = getBigrams(newStem.toLowerCase());
        String newNormalized = newStem.toLowerCase().replaceAll("[^a-z0-9\\s]", " ").replaceAll("\\s+", " ").trim();
        List<Map<String, Object>> results = new ArrayList<>();

        for (Mcq m : existingMcqs) {
            String existingStem = m.getQuestionStem();
            if (existingStem == null || existingStem.isBlank()) continue;

            Set<String> existingWords = tokenize(existingStem);
            Set<String> existingConcepts = expandConcepts(existingWords);
            Set<String> existingBigrams = getBigrams(existingStem.toLowerCase());
            String existingNormalized = existingStem.toLowerCase().replaceAll("[^a-z0-9\\s]", " ").replaceAll("\\s+", " ").trim();

            // Layer 1: Direct word overlap (Jaccard)
            int intersection = 0;
            for (String w : newWords) { if (existingWords.contains(w)) intersection++; }
            int union = newWords.size() + existingWords.size() - intersection;
            double wordScore = union == 0 ? 0 : (intersection * 100.0 / union);

            // Layer 2: Concept/synonym overlap
            int conceptIntersection = 0;
            for (String c : newConcepts) { if (existingConcepts.contains(c)) conceptIntersection++; }
            int conceptUnion = newConcepts.size() + existingConcepts.size() - conceptIntersection;
            double conceptScore = conceptUnion == 0 ? 0 : (conceptIntersection * 100.0 / conceptUnion);

            // Layer 3: Bigram overlap (captures phrase structure)
            int bigramIntersection = 0;
            for (String bg : newBigrams) { if (existingBigrams.contains(bg)) bigramIntersection++; }
            int bigramUnion = newBigrams.size() + existingBigrams.size() - bigramIntersection;
            double bigramScore = bigramUnion == 0 ? 0 : (bigramIntersection * 100.0 / bigramUnion);

            // Layer 4: Keyword containment — if ALL significant new words appear in existing
            int keywordHits = 0;
            for (String w : newWords) {
                // Use whole-word match for short words (<=3 chars) to avoid substring false positives
                // e.g. "di" should NOT match "discovery", "disable", "diagram"
                if (w.length() <= 3) {
                    // For short abbreviations, check if the word itself OR any of its expanded synonyms appear
                    if (existingWords.contains(w)) {
                        keywordHits++;
                    } else {
                        // Check if any synonym/expansion of this word exists in the existing question
                        Set<String> expanded = expandConcepts(Set.of(w));
                        boolean found = false;
                        for (String syn : expanded) {
                            if (syn.length() > 3 && existingNormalized.contains(syn)) { found = true; break; }
                            if (existingWords.contains(syn)) { found = true; break; }
                        }
                        if (found) keywordHits++;
                    }
                } else {
                    if (existingNormalized.contains(w)) keywordHits++;
                }
            }
            double keywordScore = newWords.isEmpty() ? 0 : (keywordHits * 100.0 / newWords.size());

            // Layer 5: Substring containment bonus
            double substringBonus = 0;
            if (newNormalized.length() >= 5 && existingNormalized.contains(newNormalized)) {
                substringBonus = 40; // Query is contained in existing question
            } else if (existingNormalized.length() >= 5 && newNormalized.contains(existingNormalized)) {
                substringBonus = 35; // Existing question is contained in new query
            }

            // Combined score: weighted blend of all layers + substring bonus
            double combinedScore = (wordScore * 0.20) + (conceptScore * 0.25) +
                                   (bigramScore * 0.20) + (keywordScore * 0.35) + substringBonus;

            // Cap at 100
            int percent = (int) Math.min(100, Math.round(combinedScore));

            if (percent >= 10) {
                Map<String, Object> match = new HashMap<>();
                match.put("id", m.getId());
                match.put("questionStem", existingStem);
                match.put("similarityPercent", percent);
                match.put("reason", getMatchReason(wordScore, conceptScore, keywordScore, substringBonus));
                results.add(match);
            }
        }
        results.sort((a, b) -> Integer.compare(
            ((Number) b.get("similarityPercent")).intValue(),
            ((Number) a.get("similarityPercent")).intValue()
        ));
        return results;
    }

    /** Generate a brief reason for why the match was found */
    private String getMatchReason(double wordScore, double conceptScore, double keywordScore, double substringBonus) {
        if (substringBonus > 0) return "Contains same question text";
        if (keywordScore >= 80) return "All keywords match";
        if (conceptScore >= 60) return "Same concept detected";
        if (wordScore >= 50) return "High word overlap";
        if (keywordScore >= 50) return "Most keywords match";
        return "Related terms found";
    }

    /** Get bigrams (pairs of consecutive words) from text */
    private Set<String> getBigrams(String text) {
        if (text == null || text.isBlank()) return Collections.emptySet();
        String[] words = text.replaceAll("[^a-z0-9\\s]", " ").trim().split("\\s+");
        Set<String> bigrams = new HashSet<>();
        for (int i = 0; i < words.length - 1; i++) {
            if (words[i].length() > 1 && words[i + 1].length() > 1) {
                bigrams.add(words[i] + " " + words[i + 1]);
            }
        }
        return bigrams;
    }

    /**
     * Expands word set with known synonyms/abbreviations for better concept matching.
     * E.g., "DI" → also includes "dependency injection", "JPA" → "java persistence api"
     */
    private Set<String> expandConcepts(Set<String> words) {
        // Synonym map: technical concepts that mean the same thing
        Map<String, Set<String>> synonyms = Map.ofEntries(
            Map.entry("di", Set.of("dependency", "injection", "ioc", "inversion")),
            Map.entry("dependency", Set.of("di", "injection", "ioc")),
            Map.entry("injection", Set.of("di", "dependency", "ioc", "inject")),
            Map.entry("ioc", Set.of("di", "dependency", "injection", "inversion", "control")),
            Map.entry("polymorphism", Set.of("override", "overriding", "runtime", "dynamic", "dispatch")),
            Map.entry("override", Set.of("polymorphism", "overriding")),
            Map.entry("encapsulation", Set.of("access", "modifier", "private", "getter", "setter", "hiding")),
            Map.entry("inheritance", Set.of("extends", "subclass", "parent", "child", "superclass")),
            Map.entry("abstraction", Set.of("abstract", "interface", "hiding", "complexity")),
            Map.entry("autowired", Set.of("inject", "di", "dependency", "wire")),
            Map.entry("jpa", Set.of("persistence", "hibernate", "orm", "entity", "repository")),
            Map.entry("hibernate", Set.of("jpa", "orm", "persistence", "entity")),
            Map.entry("orm", Set.of("jpa", "hibernate", "persistence", "mapping")),
            Map.entry("rest", Set.of("api", "http", "endpoint", "restful", "resource")),
            Map.entry("api", Set.of("rest", "endpoint", "restful", "service")),
            Map.entry("microservices", Set.of("microservice", "distributed", "service", "discovery")),
            Map.entry("autoconfig", Set.of("autoconfiguration", "auto", "configuration", "springbootapplication")),
            Map.entry("autoconfiguration", Set.of("autoconfig", "enableautoconfiguration", "springbootapplication")),
            Map.entry("bean", Set.of("component", "service", "repository", "managed", "spring")),
            Map.entry("component", Set.of("bean", "service", "repository", "managed")),
            Map.entry("annotation", Set.of("annotated", "decorator", "metadata")),
            Map.entry("controller", Set.of("restcontroller", "handler", "endpoint", "mapping")),
            Map.entry("transaction", Set.of("transactional", "commit", "rollback", "acid")),
            Map.entry("scope", Set.of("singleton", "prototype", "request", "session")),
            Map.entry("aop", Set.of("aspect", "pointcut", "advice", "crosscutting")),
            Map.entry("aspect", Set.of("aop", "pointcut", "advice", "crosscutting")),
            Map.entry("stream", Set.of("streams", "pipeline", "functional", "lambda", "filter", "map")),
            Map.entry("lambda", Set.of("functional", "stream", "arrow", "anonymous")),
            Map.entry("thread", Set.of("threading", "concurrent", "parallel", "runnable", "executor")),
            Map.entry("concurrent", Set.of("thread", "threading", "parallel", "synchronization")),
            Map.entry("exception", Set.of("error", "throw", "catch", "try", "handling")),
            Map.entry("collection", Set.of("collections", "list", "set", "map", "arraylist", "hashmap")),
            Map.entry("sql", Set.of("query", "database", "select", "join", "table")),
            Map.entry("query", Set.of("sql", "select", "jpql", "hql", "criteria"))
        );

        Set<String> expanded = new java.util.HashSet<>(words);
        for (String word : words) {
            Set<String> syns = synonyms.get(word);
            if (syns != null) expanded.addAll(syns);
        }
        return expanded;
    }

    /** Legacy single-question check (kept for backward compat) */
    public String checkDuplicate(String questionStem) {
        String prompt = "Does the following MCQ question appear to be a duplicate or near-duplicate of a common interview question? Answer yes or no and explain briefly.\n\nQuestion: " + questionStem;
        return chatClient.prompt()
                .user(prompt)
                .call()
                .content();
    }

    /**
     * Scores an MCQ on quality (0–100) and detects difficulty mismatch.
     * Returns: {qualityScore, difficultyMatch, suggestedDifficulty, issues[], summary}
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> scoreQuality(String questionStem, String optA, String optB,
                                             String optC, String optD, String correctAnswer,
                                             String declaredDifficulty) {
        String prompt = String.format(
            "You are an expert MCQ quality assessor for enterprise technical assessments.\n\n" +
            "Evaluate this MCQ and respond ONLY with valid JSON (no markdown):\n\n" +
            "Question: %s\nA) %s\nB) %s\nC) %s\nD) %s\nCorrect: %s\nDeclared difficulty: %s\n\n" +
            "Score the question on:\n" +
            "- Clarity (is the question unambiguous?)\n" +
            "- Distractor quality (are wrong options plausible but clearly wrong?)\n" +
            "- Technical accuracy (is the correct answer definitely right?)\n" +
            "- Real-world relevance (does it test practical knowledge?)\n\n" +
            "JSON schema:\n" +
            "{\"qualityScore\":85,\"suggestedDifficulty\":\"MEDIUM\",\"difficultyMatch\":true," +
            "\"issues\":[\"issue1\",\"issue2\"],\"summary\":\"One-line quality summary\"}\n\n" +
            "qualityScore: 0-100 integer. issues: array of strings (empty array [] if none). " +
            "suggestedDifficulty: EASY, MEDIUM, or HARD.",
            questionStem, optA, optB, optC, optD, correctAnswer, declaredDifficulty
        );
        try {
            String raw = chatClient.prompt().user(prompt).call().content();
            if (raw == null) throw new RuntimeException("null response");
            raw = raw.replaceAll("(?s)```json\\s*", "").replaceAll("```", "").trim();
            int start = raw.indexOf('{'); int end = raw.lastIndexOf('}');
            if (start >= 0 && end > start) raw = raw.substring(start, end + 1);
            Map<String, Object> result;
            try {
                result = objectMapper.readValue(raw, Map.class);
            } catch (Exception parseEx) {
                String repaired = repairJson(raw);
                result = objectMapper.readValue(repaired, Map.class);
            }
            result.put("available", true);
            return result;
        } catch (Exception e) {
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("available", false);
            fallback.put("qualityScore", null);
            fallback.put("summary", "AI quality scoring unavailable.");
            fallback.put("issues", List.of());
            return fallback;
        }
    }

    private String buildPrompt(Mcq mcq) {
        return String.format(
            "Review the following MCQ for quality. Check for: 1) Ambiguity, 2) Incorrect answer, 3) Poor distractors.\n\n" +
            "Question: %s\nA) %s\nB) %s\nC) %s\nD) %s\nCorrect: %s\n\n" +
            "Respond with 'OK' if the question is good, or briefly describe any issues found.",
            mcq.getQuestionStem(),
            mcq.getOptionA(), mcq.getOptionB(), mcq.getOptionC(), mcq.getOptionD(),
            String.valueOf(mcq.getCorrectAnswer())
        );
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> validateAnswer(String questionStem, String optA, String optB,
                                               String optC, String optD, String correctAnswer) {
        String prompt = String.format(
            "You are a strict technical accuracy validator for MCQ questions used in professional assessments.\n\n" +
            "Analyze this MCQ and determine:\n" +
            "1. Is the marked correct answer actually correct?\n" +
            "2. Is there any ambiguity in the question or options?\n" +
            "3. Your confidence score (0-100) in the marked answer's correctness.\n\n" +
            "Question: %s\nA) %s\nB) %s\nC) %s\nD) %s\nMarked correct answer: Option %s\n\n" +
            "Respond ONLY with valid JSON (no markdown, no code blocks):\n" +
            "{\"isCorrect\":true,\"confidenceScore\":92,\"explanation\":\"brief explanation\",\"ambiguityWarning\":null}",
            questionStem, optA, optB, optC, optD, correctAnswer
        );
        try {
            String raw = chatClient.prompt().user(prompt).call().content();
            if (raw == null) throw new RuntimeException("null response");
            // Strip markdown code fences if present
            raw = raw.replaceAll("(?s)```json\\s*", "").replaceAll("```", "").trim();
            Map<String, Object> result = objectMapper.readValue(raw, Map.class);
            result.put("available", true);
            return result;
        } catch (Exception e) {
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("available", false);
            fallback.put("isCorrect", null);
            fallback.put("confidenceScore", null);
            fallback.put("explanation", "AI validation unavailable. Please verify the answer manually.");
            fallback.put("ambiguityWarning", null);
            return fallback;
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> generateDistractors(String questionStem, String correctAnswer) {
        String prompt = String.format(
            "You are an expert MCQ question designer. Given a question and its correct answer, generate 3 plausible but clearly wrong distractor options.\n\n" +
            "Question: %s\nCorrect answer: %s\n\n" +
            "Rules for distractors:\n" +
            "- Each must be wrong but plausible to a learner with partial knowledge\n" +
            "- No option should be obviously silly\n" +
            "- Keep similar length and style to the correct answer\n\n" +
            "Respond ONLY with valid JSON (no markdown):\n" +
            "{\"optionB\":\"...\",\"optionC\":\"...\",\"optionD\":\"...\"}",
            questionStem, correctAnswer
        );
        try {
            String raw = chatClient.prompt().user(prompt).call().content();
            if (raw == null) throw new RuntimeException("null");
            raw = raw.replaceAll("(?s)```json\\s*", "").replaceAll("```", "").trim();
            Map<String, Object> result = objectMapper.readValue(raw, Map.class);
            result.put("available", true);
            return result;
        } catch (Exception e) {
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("available", false);
            fallback.put("error", "AI distractor generation unavailable. Please enter options manually.");
            return fallback;
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> generateExplanations(String questionStem, String optA, String optB,
                                                     String optC, String optD, String correctAnswer) {
        // Build JSON keys only for the wrong options
        StringBuilder wrongKeys = new StringBuilder();
        for (String opt : new String[]{"A", "B", "C", "D"}) {
            if (!opt.equals(correctAnswer)) {
                wrongKeys.append(",\"why").append(opt).append("Wrong\":\"...\"");
            }
        }
        String prompt = String.format(
            "You are an expert educator. For the following MCQ, generate:\n" +
            "1. A clear explanation of WHY the correct answer (%s) is right\n" +
            "2. A brief explanation of why EACH of the other three options is incorrect\n\n" +
            "Question: %s\nA) %s\nB) %s\nC) %s\nD) %s\nCorrect Answer: %s\n\n" +
            "IMPORTANT: You MUST provide explanations for ALL three wrong options.\n" +
            "Respond ONLY with valid JSON (no markdown). Use EXACTLY these keys:\n" +
            "{\"whyCorrect\":\"...\"%s}",
            correctAnswer, questionStem, optA, optB, optC, optD, correctAnswer, wrongKeys.toString()
        );
        try {
            String raw = chatClient.prompt().user(prompt).call().content();
            if (raw == null) throw new RuntimeException("null");
            raw = raw.replaceAll("(?s)```json\\s*", "").replaceAll("```", "").trim();
            Map<String, Object> result = objectMapper.readValue(raw, Map.class);
            result.put("available", true);
            return result;
        } catch (Exception e) {
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("available", false);
            fallback.put("error", "AI explanation generation unavailable.");
            return fallback;
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> extractFromImage(MultipartFile image) {
        try {
            byte[] bytes = image.getBytes();
            String base64Image = Base64.getEncoder().encodeToString(bytes);

            var httpClient = java.net.http.HttpClient.newHttpClient();

            // Step 1: OCR via minicpm-v (accurate text reading from images)
            Map<String, Object> ocrReqBody = new HashMap<>();
            ocrReqBody.put("model", "minicpm-v");
            ocrReqBody.put("prompt", "Read all the text in this image exactly as written, line by line. Include every question, every answer option, and any answer indicators.");
            ocrReqBody.put("images", List.of(base64Image));
            ocrReqBody.put("stream", false);

            var ocrRequest = java.net.http.HttpRequest.newBuilder()
                .uri(java.net.URI.create(ollamaBaseUrl + "/api/generate"))
                .header("Content-Type", "application/json")
                .POST(java.net.http.HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(ocrReqBody)))
                .timeout(java.time.Duration.ofSeconds(180))
                .build();

            var ocrResponse = httpClient.send(ocrRequest, java.net.http.HttpResponse.BodyHandlers.ofString());
            Map<String, Object> ocrResp = objectMapper.readValue(ocrResponse.body(), Map.class);
            String ocrText = (String) ocrResp.getOrDefault("response", "");

            if (ocrText == null || ocrText.isBlank()) {
                throw new RuntimeException("Empty response from vision model");
            }

            // Step 2: Convert OCR text to structured JSON
            String structurePrompt = "You are a JSON formatter. Your ONLY job is to put the text below into JSON format. You must NOT change, rephrase, add, or remove ANY words.\n\n" +
                "TEXT FROM IMAGE:\n" + ocrText + "\n\n" +
                "OUTPUT FORMAT: A JSON array where each MCQ question is one object:\n" +
                "[{\"questionStem\":\"EXACT question text\",\"optionA\":\"EXACT option a text\",\"optionB\":\"EXACT option b text\",\"optionC\":\"EXACT option c text\",\"optionD\":\"EXACT option d text\",\"correctAnswer\":\"D\",\"difficulty\":\"MEDIUM\"}]\n\n" +
                "STRICT RULES:\n" +
                "1. COPY text character-for-character from the OCR output. Do NOT rewrite or improve.\n" +
                "2. Only remove numbering prefixes like '1.' '2.' 'a)' 'b)' 'c)' 'd)'\n" +
                "3. correctAnswer = the letter matching the answer shown (A/B/C/D)\n" +
                "4. Return ONLY the JSON array. No explanation.";

            String raw = chatClient.prompt().user(structurePrompt).call().content();
            if (raw == null || raw.isBlank()) throw new RuntimeException("Text model returned empty response");

            raw = raw.replaceAll("(?s)```json\\s*", "").replaceAll("```", "").trim();

            // Try parsing as array first (multiple questions)
            int arrStart = raw.indexOf('['); int arrEnd = raw.lastIndexOf(']');
            int objStart = raw.indexOf('{'); int objEnd = raw.lastIndexOf('}');

            Map<String, Object> result = new HashMap<>();
            if (arrStart >= 0 && arrEnd > arrStart && (objStart < 0 || arrStart <= objStart)) {
                // It's a JSON array
                String arrJson = raw.substring(arrStart, arrEnd + 1);
                try {
                    List<Map<String, Object>> questions = objectMapper.readValue(arrJson, List.class);
                    if (questions.size() == 1) {
                        // Single question — return flat for backward compatibility
                        result = questions.get(0);
                    } else if (questions.size() > 1) {
                        // Multiple questions — return as array
                        result.put("questions", questions);
                    }
                } catch (Exception parseEx) {
                    String repaired = repairTruncatedJsonArray(arrJson);
                    List<Map<String, Object>> questions = objectMapper.readValue(repaired, List.class);
                    if (questions.size() == 1) {
                        result = questions.get(0);
                    } else {
                        result.put("questions", questions);
                    }
                }
            } else if (objStart >= 0 && objEnd > objStart) {
                // Fallback: single JSON object
                String objJson = raw.substring(objStart, objEnd + 1);
                try {
                    result = objectMapper.readValue(objJson, Map.class);
                } catch (Exception parseEx) {
                    String repaired = repairJson(objJson);
                    result = objectMapper.readValue(repaired, Map.class);
                }
            }
            result.put("available", true);
            return result;
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("available", false);
            err.put("error", "Image extraction failed: " + e.getMessage());
            return err;
        }
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> generateMcqs(String techStackName, String topicName, int count, String difficulty) {
        String prompt = String.format(
            "You are an expert MCQ question designer for technical training. " +
            "Generate exactly %d high-quality multiple choice questions about \"%s\" in the topic \"%s\".\n\n" +
            "Requirements:\n" +
            "- Difficulty level: %s\n" +
            "- Each question must have exactly 4 options (A, B, C, D)\n" +
            "- Only one correct answer per question\n" +
            "- Questions must be practical, scenario-based, and test real understanding\n" +
            "- No duplicate questions\n\n" +
            "Respond ONLY with a valid JSON array (no markdown, no extra text):\n" +
            "[{\"questionStem\":\"...\",\"optionA\":\"...\",\"optionB\":\"...\",\"optionC\":\"...\",\"optionD\":\"...\",\"correctAnswer\":\"A\",\"difficulty\":\"%s\"}]",
            count, techStackName, topicName, difficulty, difficulty
        );
        try {
            String raw = chatClient.prompt().user(prompt).call().content();
            if (raw == null) throw new RuntimeException("null response");
            raw = raw.replaceAll("(?s)```json\\s*", "").replaceAll("```", "").trim();
            // Extract JSON array if wrapped in extra text
            int start = raw.indexOf('[');
            int end = raw.lastIndexOf(']');
            if (start >= 0 && end > start) raw = raw.substring(start, end + 1);
            List<Map<String, Object>> questions = objectMapper.readValue(raw, new TypeReference<List<Map<String, Object>>>() {});
            return questions;
        } catch (Exception e) {
            List<Map<String, Object>> fallback = new ArrayList<>();
            Map<String, Object> err = new HashMap<>();
            err.put("error", "AI generation failed: " + e.getMessage());
            fallback.add(err);
            return fallback;
        }
    }

    /**
     * Generate questions of a specific type (supports all 17 question types).
     */
    public List<Map<String, Object>> generateMcqs(String techStackName, String topicName, int count, String difficulty, String questionType) {
        // For standard single MCQ, use the original method
        if (questionType == null || questionType.equals("SINGLE")) {
            return generateMcqs(techStackName, topicName, count, difficulty);
        }

        // MULTI gets a special prompt for multiple correct answers
        if (questionType.equals("MULTI")) {
            String prompt = String.format(
                "You are an expert MCQ question designer for technical training. " +
                "Generate exactly %d high-quality MULTIPLE-SELECT questions about \"%s\" in the topic \"%s\".\n\n" +
                "Requirements:\n" +
                "- Difficulty level: %s\n" +
                "- Each question must have exactly 4 options (A, B, C, D)\n" +
                "- Each question MUST have 2 or 3 correct answers (NOT just one!)\n" +
                "- Questions must test real understanding with multiple valid choices\n\n" +
                "Respond ONLY with a valid JSON array (no markdown, no extra text):\n" +
                "[{\"questionStem\":\"...\",\"optionA\":\"...\",\"optionB\":\"...\",\"optionC\":\"...\",\"optionD\":\"...\",\"correctAnswer\":\"A,C\",\"difficulty\":\"%s\"}]",
                count, techStackName, topicName, difficulty, difficulty
            );
            try {
                String raw = chatClient.prompt().user(prompt).call().content();
                if (raw == null) throw new RuntimeException("null response");
                raw = raw.replaceAll("(?s)```json\\s*", "").replaceAll("```", "").trim();
                int start = raw.indexOf('[');
                int end = raw.lastIndexOf(']');
                if (start >= 0 && end > start) raw = raw.substring(start, end + 1);
                return objectMapper.readValue(raw, new TypeReference<List<Map<String, Object>>>() {});
            } catch (Exception e) {
                List<Map<String, Object>> fallback = new ArrayList<>();
                Map<String, Object> err = new HashMap<>();
                err.put("error", "AI generation failed: " + e.getMessage());
                fallback.add(err);
                return fallback;
            }
        }

        String formatInstructions = getFormatForType(questionType);
        String prompt = String.format(
            "You are an expert technical question designer for enterprise training assessments.\n" +
            "Generate exactly %d questions of type \"%s\" about \"%s\" in the topic \"%s\".\n\n" +
            "Difficulty level: %s\n" +
            "Questions must be practical, scenario-based, and test real understanding.\n\n" +
            "Each question MUST include a \"questionStem\" field with the question text.\n" +
            "%s\n\n" +
            "Respond ONLY with a valid JSON array (no markdown, no extra text).",
            count, questionType, techStackName, topicName, difficulty, formatInstructions
        );
        try {
            String raw = chatClient.prompt().user(prompt).call().content();
            if (raw == null) throw new RuntimeException("null response");
            raw = raw.replaceAll("(?s)```json\\s*", "").replaceAll("```", "").trim();
            int start = raw.indexOf('[');
            int end = raw.lastIndexOf(']');
            if (start >= 0 && end > start) raw = raw.substring(start, end + 1);
            List<Object> parsed = objectMapper.readValue(raw, new TypeReference<List<Object>>() {});
            return unwrapNestedArray(parsed);
        } catch (Exception e) {
            List<Map<String, Object>> fallback = new ArrayList<>();
            Map<String, Object> err = new HashMap<>();
            err.put("error", "AI generation failed: " + e.getMessage());
            fallback.add(err);
            return fallback;
        }
    }

    private String getFormatForType(String type) {
        switch (type) {
            case "DRAG_ORDER": return "Format: [{\"questionStem\":\"Arrange these in correct order:\",\"items\":[\"step1\",\"step2\",\"step3\",\"step4\"],\"correctAnswer\":\"step1,step2,step3,step4\"}]";
            case "MATCH_PAIRS": return "Format: [{\"questionStem\":\"Match the concepts:\",\"pairs\":[{\"left\":\"concept\",\"right\":\"definition\"},{\"left\":\"concept2\",\"right\":\"definition2\"}],\"correctAnswer\":\"concept->definition\"}]";
            case "CODE_OUTPUT": return "Format: [{\"questionStem\":\"Match each code snippet to its output:\",\"pairs\":[{\"code\":\"System.out.println(2+3);\",\"output\":\"5\"},{\"code\":\"System.out.println(\\\"Hi\\\");\",\"output\":\"Hi\"}],\"correctAnswer\":\"matched\"}]";
            case "FILL_BLANK": return "Format: [{\"questionStem\":\"Fill in the blanks:\",\"codeTemplate\":\"List<String> list = new ArrayList<>();\\nlist.stream().___( s -> s.length() > 3 ).___( System.out::println );\",\"answers\":\"filter,forEach\",\"correctAnswer\":\"filter,forEach\"}]";
            case "PREDICT_OUTPUT": return "Format: [{\"questionStem\":\"What is the output of this code?\",\"code\":\"int x=5; for(int i=0;i<3;i++) x+=i; System.out.println(x);\",\"correctOutput\":\"8\",\"distractors\":\"5,6,15\",\"correctAnswer\":\"8\"}]";
            case "DEBUG_CODE": return "Format: [{\"questionStem\":\"Find and fix the bug:\",\"buggyCode\":\"String s=null;\\nSystem.out.println(s.length());\",\"bugDescription\":\"NullPointerException\",\"fixedCode\":\"String s=\\\"\\\";\\nif(s!=null) System.out.println(s.length());\",\"correctAnswer\":\"NullPointerException\"}]";
            case "CODE_REARRANGE": return "Format: [{\"questionStem\":\"Arrange these code lines in correct order:\",\"blocks\":[\"public class Main {\",\"  public static void main(String[] args) {\",\"    System.out.println(\\\"Hello\\\");\",\"  }\",\"}\"],\"correctAnswer\":\"1,2,3,4,5\"}]";
            case "SQL_BUILDER": return "Format: [{\"questionStem\":\"Build the SQL query:\",\"clauses\":[\"SELECT name, age\",\"FROM employees\",\"WHERE age > 25\",\"ORDER BY name\"],\"expectedResult\":\"Returns employees older than 25 sorted by name\",\"correctAnswer\":\"SELECT,FROM,WHERE,ORDER BY\"}]";
            case "ARCH_LAYERS": return "Format: [{\"questionStem\":\"Identify the architecture layers:\",\"layers\":[{\"name\":\"Presentation\",\"components\":\"Controllers, Views\"},{\"name\":\"Business\",\"components\":\"Services, DTOs\"},{\"name\":\"Data\",\"components\":\"Repositories, Entities\"}],\"correctAnswer\":\"Presentation,Business,Data\"}]";
            case "CODE_REVIEW": return "Format: [{\"questionStem\":\"Review this code and identify issues:\",\"code\":\"public void process(List items) {\\n  for(int i=0;i<=items.size();i++) {\\n    System.out.println(items.get(i));\\n  }\\n}\",\"issues\":\"Off-by-one error, raw types\",\"fixedCode\":\"public void process(List<String> items) {\\n  for(int i=0;i<items.size();i++) {\\n    System.out.println(items.get(i));\\n  }\\n}\",\"correctAnswer\":\"Off-by-one error\"}]";
            case "PIPELINE_BUILD": return "Format: [{\"questionStem\":\"Build the Stream pipeline:\",\"operators\":[\"stream()\",\"filter(x -> x > 0)\",\"map(x -> x * 2)\",\"collect(Collectors.toList())\"],\"expectedResult\":\"Doubles all positive numbers and collects to list\",\"correctAnswer\":\"stream,filter,map,collect\"}]";
            case "FLOWCHART": return "Format: [{\"questionStem\":\"What is the flow of execution?\",\"stages\":[\"Start\",\"Input validation\",\"Process data\",\"Return result\",\"End\"],\"correctAnswer\":\"Start,Input,Process,Return,End\"}]";
            case "DEVOPS_PIPE": return "Format: [{\"questionStem\":\"Arrange the CI/CD pipeline stages:\",\"stages\":[\"Code Commit\",\"Build\",\"Unit Test\",\"Deploy to Staging\",\"Integration Test\",\"Deploy to Production\"],\"correctAnswer\":\"Commit,Build,Test,Stage,IntTest,Prod\"}]";
            case "SECURE_CODE": return "Format: [{\"questionStem\":\"Identify the security vulnerability:\",\"vulnerableCode\":\"String query = \\\"SELECT * FROM users WHERE id=\\\" + userId;\",\"vulnerability\":\"SQL Injection\",\"secureFix\":\"PreparedStatement ps = conn.prepareStatement(\\\"SELECT * FROM users WHERE id=?\\\"); ps.setString(1, userId);\",\"correctAnswer\":\"SQL Injection\"}]";
            case "RIDDLE": return "Format: [{\"questionStem\":\"Solve this tech riddle:\",\"riddle\":\"I run but never walk, I have a stack but no shelves. What am I?\",\"hints\":[\"Think about execution\",\"Related to JVM\"],\"answer\":\"A Thread\",\"correctAnswer\":\"A Thread\"}]";
            default: return "Format: [{\"questionStem\":\"...\",\"optionA\":\"...\",\"optionB\":\"...\",\"optionC\":\"...\",\"optionD\":\"...\",\"correctAnswer\":\"A\"}]";
        }
    }

    /**
     * Generate interactive questions from a free-form prompt.
     * Returns diverse question types: SINGLE_MCQ, MULTI_MCQ, DRAG_ORDER, FILL_BLANK, PREDICT_OUTPUT, DEBUG_CODE, RIDDLE.
     */
    public List<Map<String, Object>> generateInteractiveQuestions(String userPrompt) {
        String prompt = String.format(
            "Generate quiz questions. Request: \"%s\"\n\n" +
            "Rules: If no count specified, generate 5. Match the topic exactly. If user specifies a type, use ONLY that type. Otherwise mix types. Keep all text SHORT.\n\n" +
            "JSON formats (respond ONLY with a JSON array, no markdown):\n" +
            "SINGLE_MCQ: {\"type\":\"SINGLE_MCQ\",\"question\":\"?\",\"code\":null,\"options\":[{\"letter\":\"A\",\"text\":\"..\"},{\"letter\":\"B\",\"text\":\"..\"},{\"letter\":\"C\",\"text\":\"..\"},{\"letter\":\"D\",\"text\":\"..\"}],\"correct\":\"B\",\"explanation\":\"..\"}\n" +
            "MULTI_MCQ: {\"type\":\"MULTI_MCQ\",\"question\":\"?\",\"options\":[{\"letter\":\"A\",\"text\":\"..\"},{\"letter\":\"B\",\"text\":\"..\"},{\"letter\":\"C\",\"text\":\"..\"},{\"letter\":\"D\",\"text\":\"..\"}],\"correctSet\":[\"A\",\"C\"],\"explanation\":\"..\"}\n" +
            "DRAG_ORDER: {\"type\":\"DRAG_ORDER\",\"question\":\"Arrange in order:\",\"items\":[\"s1\",\"s2\",\"s3\",\"s4\"],\"correctOrder\":[0,1,2,3]}\n" +
            "FILL_BLANK: {\"type\":\"FILL_BLANK\",\"question\":\"The ___ keyword is used for...\",\"blank\":\"final\",\"hint\":\"Think about immutability\"}\n" +
            "PREDICT_OUTPUT: {\"type\":\"PREDICT_OUTPUT\",\"question\":\"Output?\",\"code\":\"short code\",\"expectedOutput\":\"x\",\"explanation\":\"..\"}\n" +
            "DEBUG_CODE: {\"type\":\"DEBUG_CODE\",\"question\":\"Bug?\",\"code\":\"code\",\"options\":[{\"id\":\"A\",\"text\":\"..\"},{\"id\":\"B\",\"text\":\"..\"},{\"id\":\"C\",\"text\":\"..\"},{\"id\":\"D\",\"text\":\"..\"}],\"correct\":\"A\",\"explanation\":\"..\"}\n" +
            "SQL_BUILDER: {\"type\":\"SQL_BUILDER\",\"question\":\"Build query to...\",\"clauses\":[{\"id\":\"c1\",\"text\":\"SELECT *\",\"cat\":\"keyword\"},{\"id\":\"c2\",\"text\":\"FROM users\",\"cat\":\"table\"}],\"correctIds\":[\"c1\",\"c2\"]}\n" +
            "RIDDLE: {\"type\":\"RIDDLE\",\"riddle\":\"Creative puzzle text\",\"hints\":[\"h1\",\"h2\"],\"options\":[{\"letter\":\"A\",\"text\":\"..\"},{\"letter\":\"B\",\"text\":\"..\"},{\"letter\":\"C\",\"text\":\"..\"},{\"letter\":\"D\",\"text\":\"..\"}],\"correct\":\"A\",\"explanation\":\"..\"}\n" +
            "MATCH_PAIRS: {\"type\":\"MATCH_PAIRS\",\"question\":\"Match concepts to definitions:\",\"pairs\":[{\"left\":\"Term1\",\"right\":\"Def1\"},{\"left\":\"Term2\",\"right\":\"Def2\"}]}\n" +
            "CODE_OUTPUT: {\"type\":\"CODE_OUTPUT\",\"question\":\"Match code to output:\",\"snippets\":[{\"id\":\"s1\",\"code\":\"code1\"},{\"id\":\"s2\",\"code\":\"code2\"}],\"outputs\":[{\"id\":\"o1\",\"text\":\"out1\"},{\"id\":\"o2\",\"text\":\"out2\"}],\"correctMap\":{\"s1\":\"o1\",\"s2\":\"o2\"}}\n" +
            "CODE_REARRANGE: {\"type\":\"CODE_REARRANGE\",\"question\":\"Arrange code:\",\"blocks\":[{\"id\":\"b1\",\"code\":\"line1\"},{\"id\":\"b2\",\"code\":\"line2\"}],\"correctOrder\":[\"b1\",\"b2\"]}\n" +
            "ARCH_LAYERS: {\"type\":\"ARCH_LAYERS\",\"question\":\"Place in correct layer:\",\"layers\":[\"Presentation\",\"Service\",\"Data\"],\"items\":[{\"text\":\"Controller\",\"layer\":\"Presentation\"},{\"text\":\"Repository\",\"layer\":\"Data\"}]}\n" +
            "CODE_REVIEW: {\"type\":\"CODE_REVIEW\",\"question\":\"Find the issue:\",\"code\":\"code\",\"options\":[{\"id\":\"A\",\"text\":\"..\"},{\"id\":\"B\",\"text\":\"..\"},{\"id\":\"C\",\"text\":\"..\"},{\"id\":\"D\",\"text\":\"..\"}],\"correct\":\"A\",\"explanation\":\"..\"}\n" +
            "PIPELINE_BUILD: {\"type\":\"PIPELINE_BUILD\",\"question\":\"Build the pipeline:\",\"clauses\":[{\"id\":\"p1\",\"text\":\".filter()\",\"cat\":\"intermediate\"},{\"id\":\"p2\",\"text\":\".collect()\",\"cat\":\"terminal\"}],\"correctIds\":[\"p1\",\"p2\"]}\n" +
            "FLOWCHART: {\"type\":\"FLOWCHART\",\"question\":\"What happens at decision point?\",\"options\":[{\"letter\":\"A\",\"text\":\"..\"},{\"letter\":\"B\",\"text\":\"..\"},{\"letter\":\"C\",\"text\":\"..\"},{\"letter\":\"D\",\"text\":\"..\"}],\"correct\":\"B\",\"explanation\":\"..\"}\n" +
            "DEVOPS_PIPE: {\"type\":\"DEVOPS_PIPE\",\"question\":\"Order CI/CD stages:\",\"items\":[\"Build\",\"Test\",\"Deploy\",\"Monitor\"]}\n" +
            "SECURE_CODE: {\"type\":\"SECURE_CODE\",\"question\":\"Find the vulnerability:\",\"code\":\"code\",\"options\":[{\"id\":\"A\",\"text\":\"..\"},{\"id\":\"B\",\"text\":\"..\"},{\"id\":\"C\",\"text\":\"..\"},{\"id\":\"D\",\"text\":\"..\"}],\"correct\":\"A\",\"explanation\":\"..\"}\n\n" +
            "TYPE DETECTION: 'fill in the blank/cloze/word bank'→FILL_BLANK, 'drag/order/arrange/sequence'→DRAG_ORDER, 'match pair/concept'→MATCH_PAIRS, " +
            "'code output/match code'→CODE_OUTPUT, 'rearrange/reorder code'→CODE_REARRANGE, 'architecture/layer'→ARCH_LAYERS, " +
            "'code review/PR review'→CODE_REVIEW, 'stream pipeline/pipeline build'→PIPELINE_BUILD, 'flowchart/diagram'→FLOWCHART, " +
            "'devops/ci-cd/deploy pipeline'→DEVOPS_PIPE, 'secure/owasp/vulnerability/xss/injection'→SECURE_CODE, " +
            "'predict output/trace'→PREDICT_OUTPUT, 'debug/find bug'→DEBUG_CODE, 'sql build'→SQL_BUILDER, 'riddle/enigma'→RIDDLE, " +
            "'multi select/checkbox/select all'→MULTI_MCQ. Default→SINGLE_MCQ.\n" +
            "Output ONLY the JSON array.\n",
            userPrompt
        );
        try {
            String raw = chatClient.prompt().user(prompt).call().content();
            if (raw == null) throw new RuntimeException("null response from AI");
            raw = raw.replaceAll("(?s)```json\\s*", "").replaceAll("```", "").trim();
            int start = raw.indexOf('[');
            int end = raw.lastIndexOf(']');
            if (start >= 0 && end > start) {
                raw = raw.substring(start, end + 1);
            }
            // Try parsing as-is first
            try {
                List<Object> parsed = objectMapper.readValue(raw, List.class);
                // Unwrap nested array: [[{...}]] → [{...}]
                List<Map<String, Object>> questions = unwrapNestedArray(parsed);
                return questions;
            } catch (Exception parseErr) {
                // JSON truncated — try to recover by finding last complete object
                String repaired = repairTruncatedJsonArray(raw);
                List<Object> parsed = objectMapper.readValue(repaired, List.class);
                List<Map<String, Object>> questions = unwrapNestedArray(parsed);
                if (questions.isEmpty()) throw parseErr;
                return questions;
            }
        } catch (Exception e) {
            List<Map<String, Object>> fallback = new ArrayList<>();
            Map<String, Object> err = new HashMap<>();
            err.put("error", "AI generation failed: " + e.getMessage());
            fallback.add(err);
            return fallback;
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> unwrapNestedArray(List<Object> parsed) {
        List<Map<String, Object>> questions = new ArrayList<>();
        for (Object item : parsed) {
            if (item instanceof List) {
                // Nested array — merge all inner objects into ONE question
                // Ollama sometimes splits a single question across multiple objects like:
                // [{questionStem: "..."}, {riddle: "...", hints: [...], answer: "..."}]
                Map<String, Object> merged = new java.util.LinkedHashMap<>();
                for (Object inner : (List<?>) item) {
                    if (inner instanceof Map) {
                        merged.putAll((Map<String, Object>) inner);
                    }
                }
                if (!merged.isEmpty()) {
                    questions.add(merged);
                }
            } else if (item instanceof Map) {
                questions.add((Map<String, Object>) item);
            }
        }
        return questions;
    }

    private String repairTruncatedJsonArray(String raw) {
        // Find the last complete JSON object by finding last "},"  or "}" before truncation
        int lastCompleteObj = -1;
        int depth = 0;
        boolean inString = false;
        boolean escape = false;
        for (int i = 0; i < raw.length(); i++) {
            char c = raw.charAt(i);
            if (escape) { escape = false; continue; }
            if (c == '\\') { escape = true; continue; }
            if (c == '"') { inString = !inString; continue; }
            if (inString) continue;
            if (c == '{') depth++;
            if (c == '}') {
                depth--;
                if (depth == 0) lastCompleteObj = i;
            }
        }
        if (lastCompleteObj > 0) {
            return raw.substring(0, lastCompleteObj + 1) + "]";
        }
        return "[]";
    }

    public String chatReply(String userMessage) {
        return chatReplyWithHistory(userMessage, Collections.emptyList());
    }

    public String chatReplyWithHistory(String userMessage, List<String> history) {
        if (userMessage == null || userMessage.isBlank()) {
            return "Hi! I'm QuizHub AI 🤖\n\n" +
                   "💡 Commands:\n" +
                   "• `@bot generate [N] [type] questions on [topic]` — Generate interactive questions\n" +
                   "• `@bot difficulty [MCQ]` — Rate difficulty\n" +
                   "• `@bot bloom [MCQ]` — Bloom's taxonomy level\n" +
                   "• `@bot proofread [MCQ]` — Grammar & clarity check\n" +
                   "• `@bot check [MCQ]` — Distractor quality\n" +
                   "• `@bot hint [MCQ]` — Teaching hint\n" +
                   "• `@bot leaderboard` — Top performers tip\n" +
                   "• `@bot history` — Show recent chat messages\n\n" +
                   "🎲 Question types: MCQ, fill in the blank, drag & order, predict output, debug code, " +
                   "riddle, match pairs, code review, secure code, flowchart, DevOps pipeline & more!";
        }

        String lower = userMessage.toLowerCase().trim();

        if (lower.equals("help") || lower.equals("/help")) {
            return "🤖 **QuizHub AI Commands:**\n" +
                   "• `@bot generate 3 fill in the blank questions on Java` — Generate any question type!\n" +
                   "• `@bot difficulty [MCQ text]` — Rate EASY/MEDIUM/HARD\n" +
                   "• `@bot bloom [MCQ text]` — Bloom's taxonomy classification\n" +
                   "• `@bot proofread [MCQ text]` — Grammar & clarity fix\n" +
                   "• `@bot check [MCQ text]` — Are distractors plausible?\n" +
                   "• `@bot hint [MCQ text]` — Pedagogical hint for learners\n" +
                   "• `@bot history` — Show recent chat messages\n\n" +
                   "🎲 **Supported question types:** MCQ, multi-select MCQ, fill in the blank, drag & order, " +
                   "predict output, debug code, SQL builder, riddle, match pairs, code-to-output matching, " +
                   "code rearrange, architecture layers, code review, pipeline build, flowchart, DevOps pipeline, secure code\n\n" +
                   "Or just ask any technical question!";
        }

        if (lower.equals("history") || lower.equals("/history")) {
            if (history.isEmpty()) {
                return "📜 No recent messages to show yet. Start chatting!";
            }
            StringBuilder sb = new StringBuilder("📜 **Recent Chat History:**\n");
            int start = Math.max(0, history.size() - 10);
            for (int i = start; i < history.size(); i++) {
                sb.append("• ").append(history.get(i)).append("\n");
            }
            return sb.toString().trim();
        }

        if (lower.equals("leaderboard")) {
            return "📊 Navigate to the **Leaderboard** page to see top performers ranked by quiz scores. " +
                   "You can also use the `/leaderboard` slash command in this chat!";
        }

        if (lower.startsWith("difficulty ") || lower.equals("difficulty")) {
            if (lower.equals("difficulty")) return "📊 Usage: `@bot difficulty [paste your MCQ question here]`";
            if (!isApiKeyConfigured()) return noKeyMessage();
            return assessDifficulty(userMessage.substring(11).trim());
        }
        if (lower.startsWith("bloom ") || lower.equals("bloom")) {
            if (lower.equals("bloom")) return "🌸 Usage: `@bot bloom [paste your MCQ question here]`";
            if (!isApiKeyConfigured()) return noKeyMessage();
            return bloomTag(userMessage.substring(6).trim());
        }
        if (lower.startsWith("proofread ") || lower.equals("proofread")) {
            if (lower.equals("proofread")) return "✏️ Usage: `@bot proofread [paste your MCQ question here]`";
            if (!isApiKeyConfigured()) return noKeyMessage();
            return proofread(userMessage.substring(10).trim());
        }
        if (lower.startsWith("check ") || lower.equals("check")) {
            if (lower.equals("check")) return "🎯 Usage: `@bot check [paste your MCQ question + options here]`";
            if (!isApiKeyConfigured()) return noKeyMessage();
            return checkDistractors(userMessage.substring(6).trim());
        }
        if (lower.startsWith("hint ") || lower.equals("hint")) {
            if (lower.equals("hint")) return "💡 Usage: `@bot hint [paste your MCQ question here]`";
            if (!isApiKeyConfigured()) return noKeyMessage();
            try { return "💡 **Hint:** " + generateHint(null, userMessage.substring(5).trim()); }
            catch (Exception e) { return "Sorry, couldn't generate a hint right now."; }
        }

        // @bot generate → interactive question generation
        if (lower.startsWith("generate ") || lower.startsWith("create ") ||
            lower.matches(".*\\d+\\s+(\\w+\\s+)*(mcq|question|quiz|fill|blank|drag|riddle|match|code|debug|predict|secure|review|pipeline|flowchart|devops|architect|rearrange|output|cicd).*")) {
            String genPrompt = userMessage;
            if (lower.startsWith("generate ")) genPrompt = userMessage.substring(9).trim();
            else if (lower.startsWith("create ")) genPrompt = userMessage.substring(7).trim();
            if (genPrompt.isBlank()) return "🎲 Usage: `@bot generate 3 fill in the blank questions on Spring Boot`\n\n" +
                    "Supported types: MCQ, fill in the blank, drag & order, predict output, debug code, riddle, " +
                    "match pairs, code output, code rearrange, architecture layers, code review, pipeline build, " +
                    "flowchart, DevOps pipeline, secure code";
            if (!isApiKeyConfigured()) return noKeyMessage();
            try {
                List<Map<String, Object>> questions = generateInteractiveQuestions(genPrompt);
                if (questions.isEmpty() || (questions.size() == 1 && questions.get(0).containsKey("error"))) {
                    return "❌ Couldn't generate questions. Try: `@bot generate 3 Java MCQ questions`";
                }
                StringBuilder sb = new StringBuilder();
                sb.append("🎲 **Generated ").append(questions.size()).append(" Interactive Question").append(questions.size() > 1 ? "s" : "").append(":**\n\n");
                for (int i = 0; i < questions.size(); i++) {
                    Map<String, Object> q = questions.get(i);
                    String type = String.valueOf(q.getOrDefault("type", "SINGLE_MCQ"));
                    sb.append("**Q").append(i + 1).append(".** [").append(type.replace("_", " ")).append("]\n");
                    if (q.containsKey("question")) sb.append(q.get("question")).append("\n");
                    else if (q.containsKey("riddle")) sb.append(q.get("riddle")).append("\n");
                    if (q.containsKey("code") && q.get("code") != null) sb.append("```\n").append(q.get("code")).append("\n```\n");
                    if (q.containsKey("options")) {
                        List<Map<String, Object>> opts = (List<Map<String, Object>>) q.get("options");
                        if (opts != null) opts.forEach(o -> sb.append("  ").append(o.getOrDefault("letter", o.getOrDefault("id", "•"))).append(". ").append(o.get("text")).append("\n"));
                    }
                    if (q.containsKey("items")) sb.append("  Items: ").append(q.get("items")).append("\n");
                    if (q.containsKey("pairs")) sb.append("  Pairs: ").append(q.get("pairs")).append("\n");
                    if (q.containsKey("correct")) sb.append("  ✅ Answer: ").append(q.get("correct")).append("\n");
                    if (q.containsKey("explanation")) sb.append("  💡 ").append(q.get("explanation")).append("\n");
                    sb.append("\n");
                }
                sb.append("💡 *Try these on the **Question Types** page for interactive play!*");
                return sb.toString().trim();
            } catch (Exception e) {
                return "❌ Generation failed: " + e.getMessage() + "\n\nTry: `@bot generate 3 Spring Boot MCQ`";
            }
        }

        // General chat fallback
        if (!isApiKeyConfigured()) return noKeyMessage();
        StringBuilder prompt = new StringBuilder();
        prompt.append("You are QuizHub AI, a friendly technical learning assistant embedded in a group chat ")
              .append("for software engineers working on an MCQ authoring platform. ")
              .append("Answer concisely (2-4 sentences). For technical questions give accurate answers. ")
              .append("For MCQ writing, give practical advice.\n\n");
        if (!history.isEmpty()) {
            prompt.append("Recent chat context:\n");
            history.forEach(h -> prompt.append("  ").append(h).append("\n"));
            prompt.append("\n");
        }
        prompt.append("User question: ").append(userMessage);
        try {
            String reply = chatClient.prompt().user(prompt.toString()).call().content();
            return reply != null ? reply.trim() : "I'm not sure about that — try rephrasing!";
        } catch (Exception e) {
            return "Sorry, I couldn't process that right now. Please try again!";
        }
    }

    private String assessDifficulty(String questionText) {
        if (questionText.isBlank()) return "Please provide an MCQ text after `difficulty`.";
        String prompt = "Rate the difficulty of this MCQ for a software engineer:\n\n" + questionText +
                "\n\nRespond in 2 sentences: state the difficulty level (Easy/Medium/Hard) and explain why.";
        try {
            String r = chatClient.prompt().user(prompt).call().content();
            return "📊 **Difficulty Assessment:**\n" + (r != null ? r.trim() : "Unable to assess.");
        } catch (Exception e) { return "Difficulty assessment unavailable right now."; }
    }

    private String bloomTag(String questionText) {
        if (questionText.isBlank()) return "Please provide an MCQ text after `bloom`.";
        String prompt = "Classify this MCQ into a Bloom's Taxonomy level " +
                "(Remember / Understand / Apply / Analyse / Evaluate / Create):\n\n" + questionText +
                "\n\nState the level and briefly explain in 2 sentences.";
        try {
            String r = chatClient.prompt().user(prompt).call().content();
            return "🌸 **Bloom's Taxonomy:**\n" + (r != null ? r.trim() : "Unable to classify.");
        } catch (Exception e) { return "Bloom's taxonomy classification unavailable right now."; }
    }

    private String proofread(String questionText) {
        if (questionText.isBlank()) return "Please provide an MCQ text after `proofread`.";
        String prompt = "Proofread this MCQ question for grammar, clarity, and ambiguity:\n\n" + questionText +
                "\n\nPoint out any issues and suggest improvements in 2-3 sentences. " +
                "If it's well-written, say so.";
        try {
            String r = chatClient.prompt().user(prompt).call().content();
            return "✏️ **Proofread Result:**\n" + (r != null ? r.trim() : "Unable to proofread.");
        } catch (Exception e) { return "Proofreading unavailable right now."; }
    }

    private String checkDistractors(String questionText) {
        if (questionText.isBlank()) return "Please provide an MCQ (with options) after `check`.";
        String prompt = "Evaluate the quality of the wrong answer options (distractors) in this MCQ:\n\n" +
                questionText + "\n\nAre distractors plausible but clearly wrong? " +
                "Rate the quality and suggest improvements in 3-4 sentences.";
        try {
            String r = chatClient.prompt().user(prompt).call().content();
            return "🎯 **Distractor Quality:**\n" + (r != null ? r.trim() : "Unable to evaluate.");
        } catch (Exception e) { return "Distractor evaluation unavailable right now."; }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FEATURE: AI Difficulty Scoring
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Automatically scores difficulty of an MCQ.
     * With API key: uses GPT to analyse complexity, vocabulary, and concept depth.
     * Without API key: falls back to rule-based heuristic scoring.
     *
     * Returns: {difficulty, score (0-100), reasoning, source ("AI"|"rules")}
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> autoDifficulty(Mcq mcq) {
        if (isApiKeyConfigured()) {
            String prompt = String.format(
                "You are an expert technical assessment designer. Rate the difficulty of this MCQ " +
                "for a professional software engineer.\n\n" +
                "Question: %s\nA) %s\nB) %s\nC) %s\nD) %s\nCorrect: Option %s\n\n" +
                "Consider: vocabulary complexity, concept depth, whether it requires memorisation vs reasoning, " +
                "how many concepts must be combined to answer correctly.\n\n" +
                "Respond ONLY with valid JSON (no markdown):\n" +
                "{\"difficulty\":\"EASY\",\"score\":30,\"reasoning\":\"One sentence explanation\"}\n\n" +
                "difficulty must be exactly EASY, MEDIUM, or HARD. score is 0-100 (EASY=0-39, MEDIUM=40-69, HARD=70-100).",
                mcq.getQuestionStem(),
                mcq.getOptionA(), mcq.getOptionB(), mcq.getOptionC(), mcq.getOptionD(),
                String.valueOf(mcq.getCorrectAnswer())
            );
            try {
                String raw = chatClient.prompt().user(prompt).call().content();
                if (raw == null) throw new RuntimeException("null");
                raw = raw.replaceAll("(?s)```json\\s*", "").replaceAll("```", "").trim();
                int s = raw.indexOf('{'), e = raw.lastIndexOf('}');
                if (s >= 0 && e > s) raw = raw.substring(s, e + 1);
                Map<String, Object> result = objectMapper.readValue(raw, Map.class);
                result.put("source", "AI");
                result.put("available", true);
                return result;
            } catch (Exception ex) {
                // fall through to rule-based
            }
        }
        return ruleDifficulty(mcq);
    }

    /** Rule-based difficulty heuristic — no API key required. */
    private Map<String, Object> ruleDifficulty(Mcq mcq) {
        String stem = mcq.getQuestionStem() != null ? mcq.getQuestionStem() : "";
        String[] words = stem.trim().split("\\s+");
        int wordCount = words.length;

        // Technical term signals for HARD questions
        String lower = stem.toLowerCase();
        long techTerms = Arrays.stream(new String[]{
            "algorithm", "complexity", "concurrency", "synchronization", "thread", "deadlock",
            "polymorphism", "inheritance", "interface", "abstract", "exception", "generic",
            "lambda", "stream", "reactive", "async", "transaction", "isolation", "index",
            "normalization", "sharding", "partition", "microservice", "kubernetes", "docker",
            "oauth", "jwt", "tls", "sql", "nosql", "cache", "mutex", "semaphore", "heap",
            "garbage", "jvm", "bytecode", "reflection", "annotation", "serializ", "marshal"
        }).filter(lower::contains).count();

        // Option complexity: average option word count
        long optWords = Arrays.stream(new String[]{
            mcq.getOptionA(), mcq.getOptionB(), mcq.getOptionC(), mcq.getOptionD()
        }).filter(Objects::nonNull)
          .mapToLong(o -> o.trim().split("\\s+").length)
          .sum() / 4;

        int score;
        String difficulty;
        String reasoning;

        if (wordCount > 45 || techTerms >= 3 || optWords > 12) {
            score = 72 + (int)(techTerms * 4);
            if (score > 95) score = 95;
            difficulty = "HARD";
            reasoning = String.format("Long question (%d words), %d technical terms, options avg %d words — requires deep knowledge.", wordCount, techTerms, optWords);
        } else if (wordCount < 15 && techTerms == 0 && optWords < 6) {
            score = 20 + (wordCount / 2);
            difficulty = "EASY";
            reasoning = String.format("Short, plain question (%d words) with simple options — recall-level knowledge.", wordCount);
        } else {
            score = 42 + (int)(techTerms * 5) + (wordCount / 3);
            if (score > 68) score = 68;
            difficulty = "MEDIUM";
            reasoning = String.format("Moderate complexity (%d words, %d technical terms) — requires understanding over memorisation.", wordCount, techTerms);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("difficulty", difficulty);
        result.put("score", score);
        result.put("reasoning", reasoning);
        result.put("source", "rules");
        result.put("available", true);
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FEATURE: Semantic Search / Vector RAG
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Finds MCQs semantically similar to a query string.
     * With API key + EmbeddingModel: uses OpenAI text-embedding-3-small to compute cosine similarity.
     * Without API key: falls back to keyword-overlap (Jaccard) scoring.
     *
     * @param query      Natural language query or concept description
     * @param candidates MCQ pool to search within (pre-filtered by tech stack / topic if desired)
     * @param topN       Max results to return
     * @return List of {id, questionStem, similarity (0.0-1.0), source} sorted desc
     */
    public List<Map<String, Object>> semanticSearch(String query, List<Mcq> candidates, int topN) {
        if (candidates == null || candidates.isEmpty()) return Collections.emptyList();

        if (isApiKeyConfigured() && embeddingModel != null) {
            return embeddingSearch(query, candidates, topN);
        }
        return keywordSearch(query, candidates, topN);
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> embeddingSearch(String query, List<Mcq> candidates, int topN) {
        try {
            // Embed query
            float[] qVec = embeddingModel.embed(query);

            List<Map<String, Object>> scored = new ArrayList<>();
            for (Mcq m : candidates) {
                String text = m.getQuestionStem() + " " +
                    Optional.ofNullable(m.getOptionA()).orElse("") + " " +
                    Optional.ofNullable(m.getOptionB()).orElse("") + " " +
                    Optional.ofNullable(m.getOptionC()).orElse("") + " " +
                    Optional.ofNullable(m.getOptionD()).orElse("");
                float[] mVec = embeddingModel.embed(text.trim());
                double sim = cosineSimilarity(qVec, mVec);

                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", m.getId());
                item.put("questionStem", m.getQuestionStem());
                item.put("techStack", m.getTechStack() != null ? m.getTechStack().getName() : "");
                item.put("difficulty", m.getDifficulty() != null ? m.getDifficulty().name() : "");
                item.put("status", m.getStatus().name());
                item.put("similarity", Math.round(sim * 1000.0) / 1000.0);
                item.put("source", "embeddings");
                scored.add(item);
            }
            scored.sort((a, b) -> Double.compare(
                ((Number) b.get("similarity")).doubleValue(),
                ((Number) a.get("similarity")).doubleValue()));
            return scored.stream().limit(topN).collect(Collectors.toList());
        } catch (Exception e) {
            // Embedding failed — fall back to keyword
            return keywordSearch(query, candidates, topN);
        }
    }

    private List<Map<String, Object>> keywordSearch(String query, List<Mcq> candidates, int topN) {
        Set<String> queryTokens = tokenize(query);

        List<Map<String, Object>> scored = new ArrayList<>();
        for (Mcq m : candidates) {
            Set<String> mcqTokens = tokenize(m.getQuestionStem() + " " +
                Optional.ofNullable(m.getOptionA()).orElse("") + " " +
                Optional.ofNullable(m.getOptionB()).orElse("") + " " +
                Optional.ofNullable(m.getOptionC()).orElse(""));

            // Jaccard similarity: |intersection| / |union|
            Set<String> intersection = new HashSet<>(queryTokens);
            intersection.retainAll(mcqTokens);
            Set<String> union = new HashSet<>(queryTokens);
            union.addAll(mcqTokens);
            double sim = union.isEmpty() ? 0.0 : (double) intersection.size() / union.size();

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", m.getId());
            item.put("questionStem", m.getQuestionStem());
            item.put("techStack", m.getTechStack() != null ? m.getTechStack().getName() : "");
            item.put("difficulty", m.getDifficulty() != null ? m.getDifficulty().name() : "");
            item.put("status", m.getStatus().name());
            item.put("similarity", Math.round(sim * 1000.0) / 1000.0);
            item.put("source", "keywords");
            scored.add(item);
        }
        scored.sort((a, b) -> Double.compare(
            ((Number) b.get("similarity")).doubleValue(),
            ((Number) a.get("similarity")).doubleValue()));
        return scored.stream()
            .filter(r -> ((Number) r.get("similarity")).doubleValue() > 0)
            .limit(topN)
            .collect(Collectors.toList());
    }

    private static Set<String> tokenize(String text) {
        if (text == null || text.isBlank()) return Collections.emptySet();
        Set<String> stopWords = Set.of("a","an","the","is","are","was","were","be","been",
            "to","of","in","and","or","not","it","its","that","this","for","on","with","what",
            "which","how","when","where","does","do","can","will","should","would","could",
            "have","has","had","if","as","at","by","from","into","about","than","more","any");
        // Known short abbreviations that should NOT be filtered out
        Set<String> knownAbbreviations = Set.of("di","jpa","orm","aop","mvc","sql","api","jvm",
            "jdk","jre","ci","cd","ui","ux","ai","ml","db","io","gc");
        return Arrays.stream(text.toLowerCase().replaceAll("[^a-z0-9\\s]", " ").split("\\s+"))
            .filter(w -> !stopWords.contains(w) && (w.length() > 2 || knownAbbreviations.contains(w)))
            .collect(Collectors.toSet());
    }

    private static float[] toFloatArray(List<Double> list) {
        float[] arr = new float[list.size()];
        for (int i = 0; i < list.size(); i++) arr[i] = list.get(i).floatValue();
        return arr;
    }

    private static double cosineSimilarity(float[] a, float[] b) {
        if (a.length != b.length) return 0.0;
        double dot = 0, normA = 0, normB = 0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        double denom = Math.sqrt(normA) * Math.sqrt(normB);
        return denom == 0 ? 0.0 : dot / denom;
    }

    /**
     * Analyzes resume text and generates interview questions based on the candidate's
     * skills, experience, and projects.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> analyzeResume(String resumeText, String jobRole, String jobDescription) {
        if (!isApiKeyConfigured()) {
            Map<String, Object> noKey = new HashMap<>();
            noKey.put("error", noKeyMessage());
            return noKey;
        }

        String jdSection = "";
        if (jobDescription != null && !jobDescription.isBlank()) {
            String jdTrimmed = jobDescription.length() > 4000 ? jobDescription.substring(0, 4000) : jobDescription;
            jdSection = "\n\nJOB DESCRIPTION:\n\"\"\"\n" + jdTrimmed + "\n\"\"\"\n\n" +
                "IMPORTANT: Cross-reference the resume against this JD. Identify:\n" +
                "- Skills the JD REQUIRES that are MISSING or WEAK in the resume (highlight as gaps)\n" +
                "- Skills the candidate CLAIMS that match JD requirements (verify with tough questions)\n" +
                "- Experience level mismatch between JD expectation and resume reality\n" +
                "- Generate questions that specifically test JD requirements the resume doesn't clearly demonstrate\n";
        }

        String prompt = String.format(
            "You are a technical interviewer. Analyze this resume and generate interview questions.\n\n" +
            "RESUME:\n%s\n\n" +
            "%s" +
            "EXPERIENCE CALCULATION: Look at job dates. If first job started in 2021, experience = ~5 years (to 2026). " +
            "If 2019, ~7 years. NEVER say 15+ years unless resume shows work starting 2011 or earlier.\n\n" +
            "Return ONLY valid JSON with this EXACT structure (no markdown, no extra text):\n" +
            "{\n" +
            "  \"profile\": {\n" +
            "    \"name\": \"name\",\n" +
            "    \"experience\": \"X years\",\n" +
            "    \"level\": \"Junior|Mid|Senior|Lead\",\n" +
            "    \"skills\": [\"top 8 skills\"],\n" +
            "    \"projects\": [\"project1\", \"project2\"],\n" +
            "    \"strengths\": [\"s1\", \"s2\"],\n" +
            "    \"gaps\": [\"g1\", \"g2\"],\n" +
            "    \"summary\": \"brief summary\"\n" +
            "  },\n" +
            "  \"questions\": {\n" +
            "    \"technical\": [{\"question\": \"q\", \"answer\": \"a\", \"difficulty\": \"EASY|MEDIUM|HARD\", \"type\": \"positive|negative|edge_case\"}],\n" +
            "    \"coding\": [{\"question\": \"Write code to...\", \"answer\": \"solution\", \"difficulty\": \"MEDIUM|HARD\", \"type\": \"positive\"}],\n" +
            "    \"sql\": [{\"question\": \"Write SQL to...\", \"answer\": \"SELECT...\", \"difficulty\": \"MEDIUM|HARD\", \"type\": \"positive\"}],\n" +
            "    \"projectBased\": [{\"question\": \"q\", \"answer\": \"a\", \"difficulty\": \"MEDIUM\", \"type\": \"positive\"}],\n" +
            "    \"behavioral\": [{\"question\": \"q\", \"answer\": \"a\", \"type\": \"positive\"}],\n" +
            "    \"scenario\": [{\"question\": \"q\", \"answer\": \"a\", \"type\": \"positive\"}]\n" +
            "  }\n" +
            "}\n\n" +
            "REQUIREMENTS:\n" +
            "- technical: 8 questions about backend, frontend, architecture, security from resume skills\n" +
            "- coding: 5 questions asking to write actual code (Java, Python, JavaScript)\n" +
            "- sql: 4 questions with SQL queries (joins, window functions, optimization)\n" +
            "- projectBased: 5 questions about their specific projects\n" +
            "- behavioral: 4 questions about leadership, failures, teamwork\n" +
            "- scenario: 4 questions about production incidents, DevOps, system design\n" +
            "- Every question MUST have an answer field\n" +
            "- Mix of positive, negative, edge_case types\n" +
            "- Keep answers concise (1-2 sentences)\n" +
            "- Total: 30 questions minimum\n" +
            "- Output ONLY the JSON object, nothing else",
            resumeText.length() > 6000 ? resumeText.substring(0, 6000) : resumeText,
            jdSection
        );

        try {
            String raw = chatClient.prompt().user(prompt).call().content();
            if (raw == null) throw new RuntimeException("null response from AI");
            raw = raw.replaceAll("(?s)```json\\s*", "").replaceAll("```", "").trim();
            int start = raw.indexOf('{');
            int end = raw.lastIndexOf('}');
            if (start >= 0 && end > start) raw = raw.substring(start, end + 1);

            // Attempt to repair common JSON issues from small models
            Map<String, Object> result;
            try {
                result = objectMapper.readValue(raw, Map.class);
            } catch (Exception parseEx) {
                // Try to repair: fix trailing commas, unclosed strings, truncated arrays
                String repaired = repairJson(raw);
                result = objectMapper.readValue(repaired, Map.class);
            }
            result.put("available", true);
            return result;
        } catch (Exception e) {
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("available", false);
            fallback.put("error", "AI resume analysis failed: " + e.getMessage());
            return fallback;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FEATURE: AI Personalized Learning Path
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Analyzes a user's quiz history (wrong answers) and generates a personalized learning path.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> generateLearningPath(String userName, List<Map<String, Object>> wrongAnswers,
                                                     List<Map<String, Object>> correctAnswers) {
        if (!isApiKeyConfigured()) {
            return Map.of("available", false, "error", noKeyMessage());
        }

        StringBuilder wrongSummary = new StringBuilder();
        for (Map<String, Object> wa : wrongAnswers) {
            wrongSummary.append(String.format("- Topic: %s | Q: %s | Correct was: %s (user chose: %s)\n",
                wa.getOrDefault("topic", "Unknown"),
                wa.getOrDefault("questionStem", ""),
                wa.getOrDefault("correctAnswer", ""),
                wa.getOrDefault("userAnswer", "")));
        }

        int totalQuestions = wrongAnswers.size() + correctAnswers.size();
        double accuracy = totalQuestions > 0 ? (double) correctAnswers.size() / totalQuestions * 100 : 0;

        // Count weak topics
        Map<String, Long> topicErrors = new java.util.LinkedHashMap<>();
        for (Map<String, Object> wa : wrongAnswers) {
            String topic = (String) wa.getOrDefault("topic", "General");
            topicErrors.merge(topic, 1L, Long::sum);
        }

        String prompt = String.format(
            "You are an AI learning advisor for a technical training platform.\n\n" +
            "LEARNER: %s\nOVERALL ACCURACY: %.1f%% (%d/%d correct)\n\n" +
            "WRONG ANSWERS (areas of weakness):\n%s\n" +
            "WEAK TOPICS (by error count): %s\n\n" +
            "Generate a personalized learning path. Respond ONLY with valid JSON:\n" +
            "{\n" +
            "  \"overallLevel\": \"Beginner|Intermediate|Advanced\",\n" +
            "  \"accuracy\": %.1f,\n" +
            "  \"weakTopics\": [{\"topic\":\"...\",\"errorCount\":N,\"priority\":\"HIGH|MEDIUM|LOW\"}],\n" +
            "  \"learningPath\": [\n" +
            "    {\"step\":1,\"topic\":\"...\",\"action\":\"what to study\",\"resource\":\"suggested resource type\",\"estimatedTime\":\"30 min\",\"difficulty\":\"EASY|MEDIUM|HARD\"}\n" +
            "  ],\n" +
            "  \"practiceRecommendations\": [\"Take 5 more MCQs on X\",\"Review concept Y\"],\n" +
            "  \"strengths\": [\"topics user is good at\"],\n" +
            "  \"motivationalNote\": \"encouraging message\"\n" +
            "}",
            userName, accuracy, correctAnswers.size(), totalQuestions,
            wrongSummary.toString(), topicErrors.toString(), accuracy
        );

        try {
            String raw = chatClient.prompt().user(prompt).call().content();
            if (raw == null) throw new RuntimeException("null response");
            raw = raw.replaceAll("(?s)```json\\s*", "").replaceAll("```", "").trim();
            int s = raw.indexOf('{'), e = raw.lastIndexOf('}');
            if (s >= 0 && e > s) raw = raw.substring(s, e + 1);
            Map<String, Object> result;
            try { result = objectMapper.readValue(raw, Map.class); }
            catch (Exception px) { result = objectMapper.readValue(repairJson(raw), Map.class); }
            result.put("available", true);
            return result;
        } catch (Exception e) {
            // Rule-based fallback
            Map<String, Object> fallback = new java.util.LinkedHashMap<>();
            fallback.put("available", true);
            fallback.put("source", "rules");
            fallback.put("accuracy", accuracy);
            fallback.put("overallLevel", accuracy > 75 ? "Advanced" : accuracy > 50 ? "Intermediate" : "Beginner");
            List<Map<String, Object>> weakTopics = new ArrayList<>();
            topicErrors.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(5)
                .forEach(entry -> {
                    Map<String, Object> wt = new java.util.LinkedHashMap<>();
                    wt.put("topic", entry.getKey());
                    wt.put("errorCount", entry.getValue());
                    wt.put("priority", entry.getValue() >= 3 ? "HIGH" : entry.getValue() >= 2 ? "MEDIUM" : "LOW");
                    weakTopics.add(wt);
                });
            fallback.put("weakTopics", weakTopics);
            fallback.put("learningPath", List.of(Map.of("step", 1, "topic", weakTopics.isEmpty() ? "General" : weakTopics.get(0).get("topic"),
                "action", "Review fundamentals and practice more MCQs", "estimatedTime", "1 hour", "difficulty", "MEDIUM")));
            fallback.put("practiceRecommendations", List.of("Practice more questions on your weak topics", "Review explanations for wrong answers"));
            fallback.put("motivationalNote", String.format("You got %.0f%% correct! Focus on your weak areas and you'll improve quickly.", accuracy));
            return fallback;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FEATURE: AI Code-to-MCQ Generator
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Takes a code snippet and generates MCQs about what the code does.
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> generateMcqsFromCode(String codeSnippet, String language, int count, String difficulty) {
        if (!isApiKeyConfigured()) {
            return List.of(Map.of("error", noKeyMessage()));
        }
        if (count < 1) count = 1;
        if (count > 5) count = 5;

        String prompt = String.format(
            "You are an expert programming instructor. Analyze this %s code snippet and generate %d MCQ questions about it.\n\n" +
            "CODE:\n```%s\n%s\n```\n\n" +
            "Generate questions that test:\n" +
            "- What the code outputs/returns\n" +
            "- What happens if specific lines are modified\n" +
            "- Time/space complexity\n" +
            "- Which design patterns or concepts are demonstrated\n" +
            "- Potential bugs or edge cases\n\n" +
            "Difficulty level: %s\n\n" +
            "Respond ONLY with a valid JSON array (no markdown):\n" +
            "[{\"questionStem\":\"What is the output of this code?\",\"optionA\":\"...\",\"optionB\":\"...\",\"optionC\":\"...\",\"optionD\":\"...\",\"correctAnswer\":\"A\",\"difficulty\":\"%s\",\"explanation\":\"why the correct answer is right\"}]",
            language, count, language, codeSnippet, difficulty, difficulty
        );

        try {
            String raw = chatClient.prompt().user(prompt).call().content();
            if (raw == null) throw new RuntimeException("null response");
            raw = raw.replaceAll("(?s)```json\\s*", "").replaceAll("```", "").trim();
            int start = raw.indexOf('['), end = raw.lastIndexOf(']');
            if (start >= 0 && end > start) raw = raw.substring(start, end + 1);
            return objectMapper.readValue(raw, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            return List.of(Map.of("error", "AI code analysis failed: " + e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FEATURE: AI MCQ Auto-Rewrite / Improve
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Takes a weak/low-quality MCQ and rewrites it to be better.
     * Returns original + improved side by side.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> rewriteMcq(String questionStem, String optA, String optB,
                                           String optC, String optD, String correctAnswer, String difficulty) {
        if (!isApiKeyConfigured()) {
            return Map.of("available", false, "error", noKeyMessage());
        }

        String prompt = String.format(
            "You are an expert MCQ improvement specialist. Rewrite this weak question to be significantly better.\n\n" +
            "ORIGINAL MCQ:\n" +
            "Question: %s\nA) %s\nB) %s\nC) %s\nD) %s\nCorrect: %s\nDifficulty: %s\n\n" +
            "IMPROVE IT BY:\n" +
            "- Making the question stem clearer, more specific, and scenario-based\n" +
            "- Improving distractors to be plausible but clearly wrong\n" +
            "- Ensuring technical accuracy\n" +
            "- Making it test practical understanding, not just memorization\n" +
            "- Keeping the same correct answer concept but rewriting everything\n\n" +
            "Respond ONLY with valid JSON (no markdown):\n" +
            "{\n" +
            "  \"improved\": {\n" +
            "    \"questionStem\": \"...\",\n" +
            "    \"optionA\": \"...\",\n" +
            "    \"optionB\": \"...\",\n" +
            "    \"optionC\": \"...\",\n" +
            "    \"optionD\": \"...\",\n" +
            "    \"correctAnswer\": \"A\",\n" +
            "    \"difficulty\": \"%s\"\n" +
            "  },\n" +
            "  \"improvements\": [\"what was improved 1\", \"what was improved 2\"],\n" +
            "  \"qualityBefore\": 45,\n" +
            "  \"qualityAfter\": 88\n" +
            "}",
            questionStem, optA, optB, optC, optD, correctAnswer, difficulty, difficulty
        );

        try {
            String raw = chatClient.prompt().user(prompt).call().content();
            if (raw == null) throw new RuntimeException("null response");
            raw = raw.replaceAll("(?s)```json\\s*", "").replaceAll("```", "").trim();
            int s = raw.indexOf('{'), e = raw.lastIndexOf('}');
            if (s >= 0 && e > s) raw = raw.substring(s, e + 1);
            Map<String, Object> result;
            try { result = objectMapper.readValue(raw, Map.class); }
            catch (Exception px) { result = objectMapper.readValue(repairJson(raw), Map.class); }
            result.put("available", true);
            // Include original for comparison
            result.put("original", Map.of(
                "questionStem", questionStem,
                "optionA", optA, "optionB", optB, "optionC", optC, "optionD", optD,
                "correctAnswer", correctAnswer, "difficulty", difficulty
            ));
            return result;
        } catch (Exception e) {
            return Map.of("available", false, "error", "AI rewrite failed: " + e.getMessage());
        }
    }

    /**
     * Attempts to repair malformed JSON from AI models that truncate or produce invalid output.
     */
    private String repairJson(String json) {
        // Remove control characters that break parsing
        json = json.replaceAll("[\\x00-\\x1F&&[^\\n\\r\\t]]", "");

        // Fix unescaped quotes inside string values (common AI mistake)
        // Replace smart quotes with regular quotes
        json = json.replace('\u201c', '"').replace('\u201d', '"')
                   .replace('\u2018', '\'').replace('\u2019', '\'');

        // Remove trailing commas before closing brackets/braces
        json = json.replaceAll(",\\s*}", "}").replaceAll(",\\s*]", "]");

        // Fix missing commas between entries (common with small models)
        // Pattern: "value"\s+"key" or "value"\s+{ or ]\s+"key" or }\s+"key" or }\s+{ or ]\s+{
        json = json.replaceAll("\"(\\s*\\n\\s*)\"", "\",\n\"");
        json = json.replaceAll("\"(\\s*\\n\\s*)\\{", "\",\n{");
        json = json.replaceAll("\\}(\\s*\\n\\s*)\"", "},\n\"");
        json = json.replaceAll("\\](\\s*\\n\\s*)\"", "],\n\"");
        json = json.replaceAll("\\}(\\s*\\n\\s*)\\{", "},\n{");
        json = json.replaceAll("\\](\\s*\\n\\s*)\\{", "],\n{");
        json = json.replaceAll("\\](\\s*\\n\\s*)\\[", "],\n[");
        // Also handle same-line missing commas
        json = json.replaceAll("\"\\s+\"(?=[a-zA-Z_])", "\", \"");

        // Remove trailing commas again (in case repairs introduced issues)
        json = json.replaceAll(",\\s*}", "}").replaceAll(",\\s*]", "]");

        // Balance braces and brackets
        int braces = 0, brackets = 0;
        for (char c : json.toCharArray()) {
            if (c == '{') braces++;
            else if (c == '}') braces--;
            else if (c == '[') brackets++;
            else if (c == ']') brackets--;
        }

        // If truncated, close open structures
        StringBuilder sb = new StringBuilder(json);

        // If we're inside an unclosed string, close it
        boolean inString = false;
        for (int i = 0; i < json.length(); i++) {
            char c = json.charAt(i);
            if (c == '"' && (i == 0 || json.charAt(i - 1) != '\\')) {
                inString = !inString;
            }
        }
        if (inString) sb.append("\"");

        // Close unclosed brackets and braces
        for (int i = 0; i < brackets; i++) sb.append("]");
        for (int i = 0; i < braces; i++) sb.append("}");

        // Remove trailing commas again after repairs
        String repaired = sb.toString();
        repaired = repaired.replaceAll(",\\s*}", "}").replaceAll(",\\s*]", "]");

        return repaired;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // RAG — Retrieval-Augmented Generation — Spring AI Pattern #3
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Answers a user question using RAG: retrieves relevant documents from the
     * vector store and augments the prompt with context before generating.
     */
    public Map<String, Object> ragQuery(String question) {
        Map<String, Object> result = new LinkedHashMap<>();
        if (!isApiKeyConfigured()) {
            result.put("error", noKeyMessage());
            return result;
        }
        if (vectorStore == null) {
            result.put("error", "Vector store not available. Embedding model may not be configured.");
            return result;
        }

        // Retrieve top-3 relevant documents
        List<Document> docs = vectorStore.similaritySearch(
                SearchRequest.builder().query(question).topK(3).build());

        String context = docs.stream()
                .map(Document::getText)
                .reduce("", (a, b) -> a + "\n" + b);

        String augmentedPrompt = String.format(
            "Answer the following question using ONLY the context provided. " +
            "If the context does not contain enough information, say so.\n\n" +
            "CONTEXT:\n%s\n\nQUESTION: %s\n\nANSWER:",
            context, question);

        String answer = chatClient.prompt()
                .user(augmentedPrompt)
                .call()
                .content();

        result.put("answer", answer);
        result.put("sources", docs.stream()
                .map(d -> d.getMetadata().getOrDefault("source", "unknown"))
                .collect(Collectors.toList()));
        result.put("question", question);
        return result;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STREAMING CHAT (SSE) — Hackathon Spring AI Pattern #2
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Streams a chat response token-by-token as Server-Sent Events.
     */
    public Flux<String> streamChat(String userMessage) {
        if (!isApiKeyConfigured()) {
            return Flux.just("[ERROR] " + noKeyMessage());
        }
        return chatClient.prompt()
                .user(userMessage)
                .stream()
                .content();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TOOL CALLING — Spring AI Pattern #4
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Answers a question using tool calling. The LLM can invoke QuizHubTools
     * methods to fetch live data from the database before responding.
     */
    public String toolChat(String userMessage, Object tools) {
        if (!isApiKeyConfigured()) {
            return noKeyMessage();
        }
        return chatClient.prompt()
                .user(userMessage)
                .tools(tools)
                .call()
                .content();
    }
}
