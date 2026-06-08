package com.accenture.quizhub.mcp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

/**
 * QuizHub MCP Tools — Exposed to AI models via MCP protocol.
 * 
 * Each @Tool method becomes a callable tool for Claude, Copilot, or any MCP client.
 * The AI can invoke these to interact with QuizHub programmatically.
 */
@Service
public class QuizHubTools {

    @Autowired
    private WebClient quizHubClient;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // ═══════════════════════════════════════════════════════════════
    // TOOL 1: Search MCQs
    // ═══════════════════════════════════════════════════════════════

    @Tool(description = "Search existing MCQ questions in QuizHub by keyword, tech stack, or topic. " +
            "Returns matching questions with their ID, stem, status, difficulty, and tech stack.")
    public String searchQuestions(
            @ToolParam(description = "Search keyword to find in question stems") String keyword,
            @ToolParam(description = "Optional: tech stack name like 'Spring Boot', 'Core Java'", required = false) String techStack,
            @ToolParam(description = "Optional: question status filter - DRAFT, APPROVED, REJECTED", required = false) String status
    ) {
        try {
            String response = quizHubClient.get()
                    .uri(uriBuilder -> {
                        uriBuilder.path("/mcqs");
                        if (keyword != null) uriBuilder.queryParam("search", keyword);
                        if (status != null) uriBuilder.queryParam("status", status);
                        return uriBuilder.build();
                    })
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            return formatSearchResults(response, keyword);
        } catch (Exception e) {
            return "Error searching questions: " + e.getMessage();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // TOOL 2: Check Duplicate
    // ═══════════════════════════════════════════════════════════════

    @Tool(description = "Check if a question already exists in QuizHub database. " +
            "Returns similar questions with similarity percentage. Use before creating new questions.")
    public String checkDuplicate(
            @ToolParam(description = "The question text to check for duplicates") String questionStem,
            @ToolParam(description = "Optional: tech stack ID to narrow search", required = false) Long techStackId
    ) {
        try {
            Map<String, Object> body = new java.util.HashMap<>();
            body.put("questionStem", questionStem);
            if (techStackId != null) body.put("techStackId", techStackId);

            String response = quizHubClient.post()
                    .uri("/ai/check-duplicate-db")
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            return response;
        } catch (Exception e) {
            return "Error checking duplicate: " + e.getMessage();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // TOOL 3: Get Tech Stacks
    // ═══════════════════════════════════════════════════════════════

    @Tool(description = "Get all available tech stacks in QuizHub with their IDs and topic counts. " +
            "Use this to find the correct techStackId before creating questions.")
    public String getTechStacks() {
        try {
            String response = quizHubClient.get()
                    .uri("/master/tech-stacks")
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            return response;
        } catch (Exception e) {
            return "Error fetching tech stacks: " + e.getMessage();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // TOOL 4: Get Dashboard Stats
    // ═══════════════════════════════════════════════════════════════

    @Tool(description = "Get QuizHub dashboard statistics: total MCQs, approved count, " +
            "pending reviews, MCQs per tech stack, recent activity.")
    public String getDashboardStats() {
        try {
            String response = quizHubClient.get()
                    .uri("/stats/dashboard")
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            return response;
        } catch (Exception e) {
            return "Error fetching stats: " + e.getMessage();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // TOOL 5: Create MCQ
    // ═══════════════════════════════════════════════════════════════

    @Tool(description = "Create a new MCQ question in QuizHub. Requires: question stem, 4 options (A-D), " +
            "correct answer (A/B/C/D), difficulty (EASY/MEDIUM/HARD), techStackId, and topicId.")
    public String createMcq(
            @ToolParam(description = "The question text") String questionStem,
            @ToolParam(description = "Option A text") String optionA,
            @ToolParam(description = "Option B text") String optionB,
            @ToolParam(description = "Option C text") String optionC,
            @ToolParam(description = "Option D text") String optionD,
            @ToolParam(description = "Correct answer: A, B, C, or D") String correctAnswer,
            @ToolParam(description = "Difficulty: EASY, MEDIUM, or HARD") String difficulty,
            @ToolParam(description = "Tech stack ID (get from getTechStacks tool)") Long techStackId,
            @ToolParam(description = "Topic ID") Long topicId
    ) {
        try {
            Map<String, Object> body = Map.of(
                    "questionStem", questionStem,
                    "optionA", optionA,
                    "optionB", optionB,
                    "optionC", optionC,
                    "optionD", optionD,
                    "correctAnswer", correctAnswer,
                    "difficulty", difficulty,
                    "techStackId", techStackId,
                    "topicId", topicId
            );

            String response = quizHubClient.post()
                    .uri("/mcqs")
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            return "MCQ created successfully: " + response;
        } catch (Exception e) {
            return "Error creating MCQ: " + e.getMessage();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // TOOL 6: Get MCQ by ID
    // ═══════════════════════════════════════════════════════════════

    @Tool(description = "Get full details of a specific MCQ by its ID, including question, options, " +
            "correct answer, difficulty, status, and review history.")
    public String getMcqById(
            @ToolParam(description = "The MCQ ID number") Long mcqId
    ) {
        try {
            String response = quizHubClient.get()
                    .uri("/mcqs/" + mcqId)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            return response;
        } catch (Exception e) {
            return "Error fetching MCQ: " + e.getMessage();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // TOOL 7: AI Generate Questions
    // ═══════════════════════════════════════════════════════════════

    @Tool(description = "Use AI to generate new MCQ questions for a given topic and difficulty. " +
            "Returns generated questions that can be reviewed and saved.")
    public String generateQuestions(
            @ToolParam(description = "Topic to generate questions about, e.g. 'Spring Boot Auto-Configuration'") String topic,
            @ToolParam(description = "Difficulty: EASY, MEDIUM, or HARD") String difficulty,
            @ToolParam(description = "Number of questions to generate (1-10)") int count
    ) {
        try {
            Map<String, Object> body = Map.of(
                    "topic", topic,
                    "difficulty", difficulty,
                    "count", count
            );

            String response = quizHubClient.post()
                    .uri("/ai/generate")
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            return response;
        } catch (Exception e) {
            return "Error generating questions: " + e.getMessage();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // TOOL 8: Quality Score Check
    // ═══════════════════════════════════════════════════════════════

    @Tool(description = "Check the quality score of an MCQ question. Returns a 0-100 score " +
            "evaluating clarity, distractor quality, technical accuracy, and difficulty appropriateness.")
    public String checkQuality(
            @ToolParam(description = "The question text") String questionStem,
            @ToolParam(description = "Option A") String optionA,
            @ToolParam(description = "Option B") String optionB,
            @ToolParam(description = "Option C") String optionC,
            @ToolParam(description = "Option D") String optionD,
            @ToolParam(description = "Correct answer: A, B, C, or D") String correctAnswer,
            @ToolParam(description = "Difficulty: EASY, MEDIUM, or HARD") String difficulty
    ) {
        try {
            Map<String, Object> body = Map.of(
                    "questionStem", questionStem,
                    "optionA", optionA,
                    "optionB", optionB,
                    "optionC", optionC,
                    "optionD", optionD,
                    "correctAnswer", correctAnswer,
                    "difficulty", difficulty
            );

            String response = quizHubClient.post()
                    .uri("/ai/score-quality")
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            return response;
        } catch (Exception e) {
            return "Error checking quality: " + e.getMessage();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // Helper Methods
    // ═══════════════════════════════════════════════════════════════

    private String formatSearchResults(String response, String keyword) {
        try {
            JsonNode root = objectMapper.readTree(response);
            if (root.isArray() && root.size() == 0) {
                return "No questions found matching '" + keyword + "'";
            }
            return response;
        } catch (Exception e) {
            return response;
        }
    }
}
