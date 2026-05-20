package com.accenture.quizhub.service;

import com.accenture.quizhub.entity.Mcq;
import com.accenture.quizhub.enums.Difficulty;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeType;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class AIService {

    private final ChatClient chatClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired(required = false)
    private EmbeddingModel embeddingModel;

    @Value("${spring.ai.openai.api-key:}")
    private String openAiApiKey;

    private boolean isApiKeyConfigured() {
        return openAiApiKey != null
            && !openAiApiKey.isBlank()
            && !openAiApiKey.startsWith("sk-placeholder");
    }

    private String noKeyMessage() {
        return "🔑 **OpenAI API key is not configured.**\n\n"
             + "To enable AI features, set the `OPENAI_API_KEY` environment variable and restart the backend.\n\n"
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
     * Compares newStem against existingMcqs (fetched from DB for same tech stack + topic).
     * Returns a list of {id, questionStem, similarityPercent} for matches ≥ threshold.
     * If existingMcqs is empty, falls back to generic AI check.
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> checkDuplicateAgainstDb(String newStem, List<Mcq> existingMcqs) {
        if (existingMcqs == null || existingMcqs.isEmpty()) {
            // No existing questions to compare — return empty (no duplicates)
            return new ArrayList<>();
        }

        // Build a numbered list of existing questions for the AI
        StringBuilder existingList = new StringBuilder();
        for (int i = 0; i < existingMcqs.size(); i++) {
            Mcq m = existingMcqs.get(i);
            existingList.append(String.format(
                "%d. [ID:%d] %s\n", i + 1, m.getId(), m.getQuestionStem()
            ));
        }

        String prompt = String.format(
            "You are a duplicate detection engine for an MCQ question bank.\n\n" +
            "NEW QUESTION:\n\"%s\"\n\n" +
            "EXISTING QUESTIONS (same tech stack and topic):\n%s\n" +
            "For each existing question, calculate a similarity percentage (0-100) based on semantic meaning, " +
            "not just exact words. Two questions are similar if they test the same concept in a similar way.\n\n" +
            "Respond ONLY with a valid JSON array (no markdown, no extra text). " +
            "Include ONLY questions with similarity >= 10%%:\n" +
            "[{\"id\": <question_id_number>, \"questionStem\": \"<stem>\", \"similarityPercent\": <0-100>}]\n" +
            "If none are similar, return an empty array: []",
            newStem, existingList.toString()
        );

        try {
            String raw = chatClient.prompt().user(prompt).call().content();
            if (raw == null) return new ArrayList<>();
            raw = raw.replaceAll("(?s)```json\\s*", "").replaceAll("```", "").trim();
            int start = raw.indexOf('[');
            int end = raw.lastIndexOf(']');
            if (start < 0 || end <= start) return new ArrayList<>();
            raw = raw.substring(start, end + 1);
            List<Map<String, Object>> results = objectMapper.readValue(raw, new TypeReference<List<Map<String, Object>>>() {});
            // Filter to >= 10% and sort descending
            results.removeIf(r -> {
                Object pct = r.get("similarityPercent");
                return pct == null || ((Number) pct).intValue() < 10;
            });
            results.sort((a, b) -> {
                int pa = ((Number) a.get("similarityPercent")).intValue();
                int pb = ((Number) b.get("similarityPercent")).intValue();
                return Integer.compare(pb, pa);
            });
            return results;
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "AI similarity check failed: " + e.getMessage());
            return List.of(err);
        }
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
            Map<String, Object> result = objectMapper.readValue(raw, Map.class);
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
        String prompt = String.format(
            "You are an expert educator. For the following MCQ, generate:\n" +
            "1. A clear explanation of WHY the correct answer is right\n" +
            "2. A brief explanation of why each wrong option is incorrect\n\n" +
            "Question: %s\nA) %s\nB) %s\nC) %s\nD) %s\nCorrect: Option %s\n\n" +
            "Respond ONLY with valid JSON (no markdown):\n" +
            "{\"whyCorrect\":\"...\",\"whyAWrong\":\"...\",\"whyBWrong\":\"...\",\"whyCWrong\":\"...\",\"whyDWrong\":\"...\"}",
            questionStem, optA, optB, optC, optD, correctAnswer
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
            String mimeType = image.getContentType() != null ? image.getContentType() : "image/png";
            ByteArrayResource imgResource = new ByteArrayResource(bytes) {
                @Override public String getFilename() { return image.getOriginalFilename(); }
            };
            UserMessage msg = UserMessage.builder()
                .text("You are an MCQ extraction assistant. Extract any multiple-choice question from this image. " +
                    "Respond ONLY with valid JSON (no markdown): " +
                    "{\"questionStem\":\"...\",\"optionA\":\"...\",\"optionB\":\"...\",\"optionC\":\"...\",\"optionD\":\"...\",\"correctAnswer\":\"A|B|C|D\",\"difficulty\":\"EASY|MEDIUM|HARD\"}. " +
                    "If no clear MCQ is found, return {\"error\":\"No MCQ found\"}.")
                .media(new org.springframework.ai.content.Media(MimeType.valueOf(mimeType), imgResource))
                .build();
            String raw = chatClient.prompt(new Prompt(List.of(msg))).call().content();
            if (raw == null) throw new RuntimeException("null response");
            raw = raw.replaceAll("(?s)```json\\s*", "").replaceAll("```", "").trim();
            return objectMapper.readValue(raw, Map.class);
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
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
            List<Map<String, Object>> questions = objectMapper.readValue(raw, List.class);
            return questions;
        } catch (Exception e) {
            List<Map<String, Object>> fallback = new ArrayList<>();
            Map<String, Object> err = new HashMap<>();
            err.put("error", "AI generation failed: " + e.getMessage());
            fallback.add(err);
            return fallback;
        }
    }

    public String chatReply(String userMessage) {
        return chatReplyWithHistory(userMessage, Collections.emptyList());
    }

    public String chatReplyWithHistory(String userMessage, List<String> history) {
        if (userMessage == null || userMessage.isBlank()) {
            return "Hi! I'm QuizHub AI 🤖\n\n" +
                   "💡 Commands:\n" +
                   "• `@bot difficulty [MCQ]` — Rate difficulty\n" +
                   "• `@bot bloom [MCQ]` — Bloom's taxonomy level\n" +
                   "• `@bot proofread [MCQ]` — Grammar & clarity check\n" +
                   "• `@bot check [MCQ]` — Distractor quality\n" +
                   "• `@bot hint [MCQ]` — Teaching hint\n" +
                   "• `@bot leaderboard` — Top performers tip\n" +
                   "• `@bot history` — Show recent chat messages";
        }

        String lower = userMessage.toLowerCase().trim();

        if (lower.equals("help") || lower.equals("/help")) {
            return "🤖 **QuizHub AI Commands:**\n" +
                   "• `@bot difficulty [MCQ text]` — Rate EASY/MEDIUM/HARD\n" +
                   "• `@bot bloom [MCQ text]` — Bloom's taxonomy classification\n" +
                   "• `@bot proofread [MCQ text]` — Grammar & clarity fix\n" +
                   "• `@bot check [MCQ text]` — Are distractors plausible?\n" +
                   "• `@bot hint [MCQ text]` — Pedagogical hint for learners\n" +
                   "• `@bot history` — Show recent chat messages\n" +
                   "• Or just ask any technical question!";
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
        return Arrays.stream(text.toLowerCase().replaceAll("[^a-z0-9\\s]", " ").split("\\s+"))
            .filter(w -> w.length() > 2 && !stopWords.contains(w))
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
}
