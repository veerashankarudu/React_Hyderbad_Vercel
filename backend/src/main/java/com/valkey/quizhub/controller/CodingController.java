package com.valkey.quizhub.controller;

import com.valkey.quizhub.entity.CodingQuestion;
import com.valkey.quizhub.entity.User;
import com.valkey.quizhub.enums.Difficulty;
import com.valkey.quizhub.enums.McqStatus;
import com.valkey.quizhub.exception.ResourceNotFoundException;
import com.valkey.quizhub.repository.CodingQuestionRepository;
import com.valkey.quizhub.repository.TechStackRepository;
import com.valkey.quizhub.repository.TopicRepository;
import com.valkey.quizhub.repository.UserRepository;
import com.valkey.quizhub.service.AIService;
import com.valkey.quizhub.service.CodeExecutionService;
import com.valkey.quizhub.service.CodeExecutionService.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/coding")
@RequiredArgsConstructor
public class CodingController {

    private final CodeExecutionService codeExecutionService;
    private final CodingQuestionRepository codingQuestionRepository;
    private final AIService aiService;
    private final TechStackRepository techStackRepository;
    private final TopicRepository topicRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    private User resolveUser(String enterpriseId) {
        return userRepository.findByEnterpriseId(enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    // Execute code against test cases
    @PostMapping("/execute")
    public ResponseEntity<ExecutionResult> executeCode(@RequestBody Map<String, Object> body) {
        String language = (String) body.get("language");
        String code = (String) body.get("code");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> testCasesRaw = (List<Map<String, Object>>) body.get("testCases");

        List<TestCaseInput> testCases = testCasesRaw.stream()
                .map(tc -> new TestCaseInput(
                        (String) tc.getOrDefault("input", ""),
                        (String) tc.getOrDefault("expectedOutput", ""),
                        Boolean.TRUE.equals(tc.get("hidden"))
                ))
                .toList();

        ExecutionResult result = codeExecutionService.execute(language, code, testCases);
        return ResponseEntity.ok(result);
    }

    // AI generate coding question
    @PostMapping("/ai-generate")
    public ResponseEntity<Map<String, Object>> aiGenerate(@RequestBody Map<String, String> body) {
        String techStack = body.getOrDefault("techStack", "Java");
        String topic = body.getOrDefault("topic", "Arrays");
        String difficulty = body.getOrDefault("difficulty", "MEDIUM");
        String language = body.getOrDefault("language", "java");

        String prompt = String.format(
            "Generate a coding question for %s (%s) at %s difficulty level in %s language. " +
            "Return ONLY a valid JSON object with these fields: " +
            "title (string), description (string with problem statement including examples), " +
            "starterCode (string with function signature and comments), " +
            "solutionCode (string with complete working solution), " +
            "testCases (array of objects with input, expectedOutput, hidden fields). " +
            "Include at least 3 test cases. Make the problem practical and interview-style. " +
            "IMPORTANT: Return ONLY the JSON, no markdown, no explanation.",
            techStack, topic, difficulty, language
        );

        String aiResponse = aiService.generateRawCompletion(prompt);

        // Parse AI response as JSON
        try {
            // Try to extract JSON from response (in case AI wraps it in markdown)
            String json = extractJson(aiResponse);
            @SuppressWarnings("unchecked")
            Map<String, Object> result = objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            // Return a structured fallback
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("title", techStack + " " + topic + " Challenge");
            fallback.put("description", "AI generated a response but it couldn't be parsed. Please edit manually.\n\nRaw: " + aiResponse.substring(0, Math.min(500, aiResponse.length())));
            fallback.put("starterCode", getStarterTemplate(language));
            fallback.put("solutionCode", "");
            fallback.put("testCases", List.of(Map.of("input", "", "expectedOutput", "", "hidden", false)));
            return ResponseEntity.ok(fallback);
        }
    }

    // Save coding question
    @PostMapping("/questions")
    public ResponseEntity<Map<String, Object>> saveQuestion(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal String enterpriseId) throws JsonProcessingException {
        User creator = resolveUser(enterpriseId);

        CodingQuestion question = CodingQuestion.builder()
                .title((String) body.get("title"))
                .description((String) body.get("description"))
                .language((String) body.get("language"))
                .difficulty(Difficulty.valueOf((String) body.get("difficulty")))
                .starterCode((String) body.get("starterCode"))
                .solutionCode((String) body.get("solutionCode"))
                .testCasesJson(objectMapper.writeValueAsString(body.get("testCases")))
                .creator(creator)
                .build();

        // Set tech stack and topic
        Object tsId = body.get("techStackId");
        if (tsId != null && !tsId.toString().isEmpty()) {
            techStackRepository.findById(Long.valueOf(tsId.toString())).ifPresent(question::setTechStack);
        }
        Object topId = body.get("topicId");
        if (topId != null && !topId.toString().isEmpty()) {
            topicRepository.findById(Long.valueOf(topId.toString())).ifPresent(question::setTopic);
        }

        CodingQuestion saved = codingQuestionRepository.save(question);
        return ResponseEntity.ok(Map.of("id", saved.getId(), "message", "Coding question saved successfully"));
    }

    // List coding questions for current user
    @GetMapping("/questions")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> listQuestions(@AuthenticationPrincipal String enterpriseId) {
        User user = resolveUser(enterpriseId);
        List<CodingQuestion> questions = codingQuestionRepository.findByCreatorId(user.getId());
        List<Map<String, Object>> result = questions.stream().map(q -> {
            Map<String, Object> map = new java.util.LinkedHashMap<>();
            map.put("id", q.getId());
            map.put("title", q.getTitle());
            map.put("description", q.getDescription());
            map.put("language", q.getLanguage());
            map.put("difficulty", q.getDifficulty().name());
            map.put("starterCode", q.getStarterCode());
            map.put("solutionCode", q.getSolutionCode());
            map.put("testCasesJson", q.getTestCasesJson());
            map.put("techStack", q.getTechStack() != null ? q.getTechStack().getName() : null);
            map.put("topic", q.getTopic() != null ? q.getTopic().getName() : null);
            map.put("status", q.getStatus().name());
            map.put("reviewComment", q.getReviewComment());
            map.put("createdAt", q.getCreatedAt());
            map.put("updatedAt", q.getUpdatedAt());
            return map;
        }).toList();
        return ResponseEntity.ok(result);
    }

    // Submit coding question for review
    @PostMapping("/questions/{id}/submit")
    @Transactional
    public ResponseEntity<Map<String, Object>> submitForReview(
            @PathVariable Long id,
            @AuthenticationPrincipal String enterpriseId) {
        User user = resolveUser(enterpriseId);
        CodingQuestion question = codingQuestionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Coding question not found"));
        if (!question.getCreator().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "Only the creator can submit for review"));
        }
        if (question.getStatus() != McqStatus.DRAFT) {
            return ResponseEntity.badRequest().body(Map.of("error", "Only DRAFT questions can be submitted for review"));
        }
        question.setStatus(McqStatus.READY_FOR_REVIEW);
        codingQuestionRepository.save(question);
        return ResponseEntity.ok(Map.of("id", id, "status", "READY_FOR_REVIEW", "message", "Submitted for review"));
    }

    // Approve or reject coding question (Admin/Reviewer)
    @PostMapping("/questions/{id}/review")
    @Transactional
    public ResponseEntity<Map<String, Object>> reviewQuestion(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal String enterpriseId) {
        User reviewer = resolveUser(enterpriseId);
        CodingQuestion question = codingQuestionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Coding question not found"));
        if (question.getStatus() != McqStatus.READY_FOR_REVIEW && question.getStatus() != McqStatus.UNDER_REVIEW) {
            return ResponseEntity.badRequest().body(Map.of("error", "Question is not pending review"));
        }
        String action = body.get("action");
        String comment = body.getOrDefault("comment", "");
        if ("APPROVE".equalsIgnoreCase(action)) {
            question.setStatus(McqStatus.APPROVED);
            question.setReviewer(reviewer);
            question.setReviewComment(comment);
            codingQuestionRepository.save(question);
            return ResponseEntity.ok(Map.of("id", id, "status", "APPROVED", "message", "Coding question approved"));
        } else if ("REJECT".equalsIgnoreCase(action)) {
            question.setStatus(McqStatus.REJECTED);
            question.setReviewer(reviewer);
            question.setReviewComment(comment);
            codingQuestionRepository.save(question);
            return ResponseEntity.ok(Map.of("id", id, "status", "REJECTED", "message", "Coding question rejected"));
        }
        return ResponseEntity.badRequest().body(Map.of("error", "Action must be APPROVE or REJECT"));
    }

    private String extractJson(String response) {
        // Remove markdown code fences if present
        String cleaned = response.trim();
        if (cleaned.startsWith("```json")) cleaned = cleaned.substring(7);
        else if (cleaned.startsWith("```")) cleaned = cleaned.substring(3);
        if (cleaned.endsWith("```")) cleaned = cleaned.substring(0, cleaned.length() - 3);

        // Find first { and last }
        int start = cleaned.indexOf('{');
        int end = cleaned.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return cleaned.substring(start, end + 1);
        }
        return cleaned.trim();
    }

    private String getStarterTemplate(String language) {
        return switch (language.toLowerCase()) {
            case "java" -> "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // Read input and solve\n    }\n}";
            case "python" -> "def solve():\n    # Read input and solve\n    pass\n\nsolve()";
            case "javascript" -> "function solve() {\n    // Read input and solve\n}\n\nsolve();";
            default -> "// Write your solution here";
        };
    }
}
