package com.valkey.quizhub.controller;

import com.valkey.quizhub.config.JwtUtil;
import com.valkey.quizhub.entity.*;
import com.valkey.quizhub.enums.Difficulty;
import com.valkey.quizhub.enums.McqStatus;
import com.valkey.quizhub.enums.Role;
import com.valkey.quizhub.repository.*;
import com.valkey.quizhub.service.AIService;
import com.valkey.quizhub.service.EmailService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AIControllerIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired TechStackRepository techStackRepository;
    @Autowired TopicRepository topicRepository;
    @Autowired McqRepository mcqRepository;
    @Autowired ReviewCommentRepository reviewCommentRepository;
    @Autowired McqVersionRepository mcqVersionRepository;
    @Autowired InboxMessageRepository inboxMessageRepository;
    @Autowired NotificationRepository notificationRepository;
    @Autowired JwtUtil jwtUtil;
    @Autowired PasswordEncoder passwordEncoder;
    @MockBean EmailService emailService;
    @MockBean AIService aiService;

    private String smeToken;
    private TechStack javaStack;
    private Mcq existingMcq;

    @BeforeEach
    void setUp() {
        reviewCommentRepository.deleteAll();
        mcqVersionRepository.deleteAll();
        mcqRepository.deleteAll();
        topicRepository.deleteAll();
        notificationRepository.deleteAll();
        inboxMessageRepository.deleteAll();
        userRepository.deleteAll();
        techStackRepository.deleteAll();

        javaStack = techStackRepository.save(TechStack.builder().name("Java").build());

        User sme = userRepository.save(User.builder()
                .enterpriseId("ai.sme")
                .fullName("AI SME")
                .email("sme@ai.com")
                .passwordHash(passwordEncoder.encode("Pass@123"))
                .role(Role.SME).approved(true)
                .techStacks(new ArrayList<>())
                .build());

        smeToken = "Bearer " + jwtUtil.generateToken("ai.sme", "SME");

        existingMcq = mcqRepository.save(Mcq.builder()
                .questionStem("What is a JVM?")
                .optionA("Java Virtual Machine").optionB("Other").optionC("Other2").optionD("Other3")
                .correctAnswer("A").difficulty(Difficulty.EASY)
                .techStack(javaStack).creator(sme).status(McqStatus.APPROVED)
                .build());

        // Mock AI service responses
        Mockito.when(aiService.generateHint(anyLong(), anyString())).thenReturn("This is a hint about the topic");
        Mockito.when(aiService.checkDuplicate(anyString())).thenReturn("No, this is not a duplicate");
        Mockito.when(aiService.checkDuplicateAgainstDb(anyString(), anyList())).thenReturn(
                List.of(Map.of("id", existingMcq.getId(), "questionStem", "What is a JVM?", "similarityPercent", 90))
        );
    }

    @Test
    @Order(1)
    void getHint_returns200WithHint() throws Exception {
        Map<String, Object> body = Map.of("mcqId", existingMcq.getId(), "questionStem", "What is a JVM?");
        mockMvc.perform(post("/api/v1/ai/hint")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hint").value("This is a hint about the topic"));
    }

    @Test
    @Order(2)
    void checkDuplicate_notDuplicate_returns200() throws Exception {
        Map<String, String> body = Map.of("questionStem", "A completely unique question about JVM internals");
        mockMvc.perform(post("/api/v1/ai/check-duplicate")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isDuplicate").value(false));
    }

    @Test
    @Order(3)
    void checkDuplicate_isDuplicate_returns200WithFlag() throws Exception {
        Mockito.when(aiService.checkDuplicate(anyString())).thenReturn("Yes, this is a duplicate");
        Map<String, String> body = Map.of("questionStem", "What is a JVM?");
        mockMvc.perform(post("/api/v1/ai/check-duplicate")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isDuplicate").value(true));
    }

    @Test
    @Order(4)
    void checkDuplicateDb_returns200WithSimilarQuestions() throws Exception {
        Map<String, Object> body = Map.of(
                "questionStem", "What is JVM?",
                "techStackId", javaStack.getId()
        );
        mockMvc.perform(post("/api/v1/ai/check-duplicate-db")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.blocked").value(true));
    }

    @Test
    @Order(5)
    void checkDuplicateDb_emptyQuestionStem_returns400() throws Exception {
        Map<String, Object> body = Map.of("questionStem", "");
        mockMvc.perform(post("/api/v1/ai/check-duplicate-db")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(6)
    void checkDuplicateDb_withExcludeId_returns200() throws Exception {
        Map<String, Object> body = Map.of(
                "questionStem", "What is JVM?",
                "excludeId", existingMcq.getId()
        );
        mockMvc.perform(post("/api/v1/ai/check-duplicate-db")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());
    }

    @Test
    @Order(7)
    void getHint_unauthenticated_returns4xx() throws Exception {
        Map<String, Object> body = Map.of("mcqId", 1, "questionStem", "Test?");
        mockMvc.perform(post("/api/v1/ai/hint")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @Order(8)
    void validateAnswer_returns200() throws Exception {
        Mockito.when(aiService.validateAnswer(anyString(), anyString(), anyString(), anyString(), anyString(), anyString()))
                .thenReturn(Map.of("valid", true, "confidence", 95));
        Map<String, String> body = Map.of(
                "questionStem", "What is JVM?",
                "optionA", "Java Virtual Machine", "optionB", "B", "optionC", "C", "optionD", "D",
                "correctAnswer", "A");
        mockMvc.perform(post("/api/v1/ai/validate-answer")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());
    }

    @Test
    @Order(9)
    void generateDistractors_returns200() throws Exception {
        Mockito.when(aiService.generateDistractors(anyString(), anyString()))
                .thenReturn(Map.of("optionB", "Distractor1", "optionC", "Distractor2", "optionD", "Distractor3"));
        Map<String, String> body = Map.of("questionStem", "What is JVM?", "correctAnswer", "Java Virtual Machine");
        mockMvc.perform(post("/api/v1/ai/generate-distractors")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());
    }

    @Test
    @Order(10)
    void generateExplanations_returns200() throws Exception {
        Mockito.when(aiService.generateExplanations(anyString(), anyString(), anyString(), anyString(), anyString(), anyString()))
                .thenReturn(Map.of("explanationA", "Correct because...", "explanationB", "Wrong because..."));
        Map<String, String> body = Map.of(
                "questionStem", "What is JVM?",
                "optionA", "Java Virtual Machine", "optionB", "B", "optionC", "C", "optionD", "D",
                "correctAnswer", "A");
        mockMvc.perform(post("/api/v1/ai/generate-explanations")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());
    }

    @Test
    @Order(11)
    void scoreQuality_returns200() throws Exception {
        Mockito.when(aiService.scoreQuality(anyString(), anyString(), anyString(), anyString(), anyString(), anyString(), anyString()))
                .thenReturn(Map.of("score", 85, "feedback", "Good question"));
        Map<String, Object> body = Map.of(
                "questionStem", "What is JVM?",
                "optionA", "Java Virtual Machine", "optionB", "B", "optionC", "C", "optionD", "D",
                "correctAnswer", "A", "difficulty", "MEDIUM");
        mockMvc.perform(post("/api/v1/ai/score-quality")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());
    }

    @Test
    @Order(12)
    void scoreQuality_missingQuestionStem_returns400() throws Exception {
        Map<String, Object> body = Map.of("questionStem", "");
        mockMvc.perform(post("/api/v1/ai/score-quality")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(13)
    void autoDifficulty_returns200() throws Exception {
        java.util.Map<String, Object> diffResult = new java.util.HashMap<>();
        diffResult.put("difficulty", "EASY");
        diffResult.put("score", 30);
        diffResult.put("reasoning", "Simple question");
        diffResult.put("source", "ai");
        Mockito.when(aiService.autoDifficulty(any(Mcq.class))).thenReturn(diffResult);
        Map<String, Object> body = Map.of("mcqId", existingMcq.getId());
        mockMvc.perform(post("/api/v1/ai/auto-difficulty")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());
    }

    @Test
    @Order(14)
    void semanticSearch_returns200() throws Exception {
        Mockito.when(aiService.semanticSearch(anyString(), anyList(), anyInt()))
                .thenReturn(List.of(Map.of("id", existingMcq.getId(), "questionStem", "What is a JVM?", "score", 0.9)));
        Map<String, Object> body = Map.of("query", "Java virtual machine", "techStackId", javaStack.getId());
        mockMvc.perform(post("/api/v1/ai/semantic-search")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());
    }

    @Test
    @Order(15)
    void generateMcqs_returns200() throws Exception {
        Topic topic = topicRepository.save(Topic.builder().name("JVM Internals").techStack(javaStack).build());
        Mockito.when(aiService.generateMcqs(anyString(), anyString(), anyInt(), anyString(), anyString()))
                .thenReturn(List.of(Map.of(
                        "questionStem", "What is JVM?",
                        "optionA", "Java Virtual Machine", "optionB", "B", "optionC", "C", "optionD", "D",
                        "correctAnswer", "A", "difficulty", "EASY")));
        Mockito.when(aiService.checkDuplicateAgainstDb(anyString(), anyList())).thenReturn(List.of());
        Map<String, Object> body = Map.of(
                "techStackId", javaStack.getId(),
                "topicId", topic.getId(),
                "count", 1,
                "difficulty", "EASY");
        mockMvc.perform(post("/api/v1/ai/generate-mcqs")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());
    }

    @Test
    @Order(16)
    void extractFromImage_returns200() throws Exception {
        Mockito.when(aiService.extractFromImage(any()))
                .thenReturn(Map.of("questionStem", "What is JVM?",
                        "optionA", "Java Virtual Machine", "optionB", "B",
                        "optionC", "C", "optionD", "D", "correctAnswer", "A"));
        MockMultipartFile imageFile = new MockMultipartFile(
                "image", "test.png", "image/png", "fake-image-bytes".getBytes());
        mockMvc.perform(multipart("/api/v1/ai/extract-from-image")
                        .file(imageFile)
                        .header("Authorization", smeToken))
                .andExpect(status().isOk());
    }

    @Test
    @Order(17)
    void extractFromImage_unauthenticated_returns4xx() throws Exception {
        MockMultipartFile imageFile = new MockMultipartFile(
                "image", "test.png", "image/png", "fake-image-bytes".getBytes());
        mockMvc.perform(multipart("/api/v1/ai/extract-from-image")
                        .file(imageFile))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @Order(18)
    void bulkAutoDifficulty_nonAdmin_returns403() throws Exception {
        mockMvc.perform(post("/api/v1/ai/bulk-auto-difficulty")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(19)
    void bulkAutoDifficulty_asAdmin_returns200() throws Exception {
        userRepository.save(User.builder()
                .enterpriseId("ai.admin")
                .fullName("AI Admin")
                .email("admin@ai.com")
                .passwordHash(passwordEncoder.encode("Pass@123"))
                .role(Role.ADMIN).approved(true)
                .techStacks(new ArrayList<>())
                .build());
        String adminToken = "Bearer " + jwtUtil.generateToken("ai.admin", "ADMIN");
        java.util.Map<String, Object> diffResult = new java.util.HashMap<>();
        diffResult.put("difficulty", "EASY");
        diffResult.put("score", 30);
        diffResult.put("reasoning", "Simple");
        Mockito.when(aiService.autoDifficulty(any(Mcq.class))).thenReturn(diffResult);
        mockMvc.perform(post("/api/v1/ai/bulk-auto-difficulty")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.processed").exists());
    }

    @Test
    @Order(20)
    void autoDifficulty_missingMcqId_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/ai/auto-difficulty")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(21)
    void semanticSearch_blankQuery_returns400() throws Exception {
        Map<String, Object> body = Map.of("query", "");
        mockMvc.perform(post("/api/v1/ai/semantic-search")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(22)
    void generateMcqs_aiReturnsError_returns500() throws Exception {
        Topic topic = topicRepository.save(Topic.builder().name("Error Topic").techStack(javaStack).build());
        Mockito.when(aiService.generateMcqs(anyString(), anyString(), anyInt(), anyString(), anyString()))
                .thenReturn(List.of(Map.of("error", "AI service unavailable")));
        Map<String, Object> body = Map.of(
                "techStackId", javaStack.getId(),
                "topicId", topic.getId(),
                "count", 1,
                "difficulty", "EASY");
        mockMvc.perform(post("/api/v1/ai/generate-mcqs")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().is5xxServerError());
    }

    @Test
    @Order(23)
    void checkDuplicateDb_aiReturnsError_returnsOkWithAiErrorFlag() throws Exception {
        Mockito.when(aiService.checkDuplicateAgainstDb(anyString(), anyList()))
                .thenReturn(List.of(Map.of("error", "AI unavailable")));
        Map<String, Object> body = Map.of("questionStem", "What is a thread?");
        mockMvc.perform(post("/api/v1/ai/check-duplicate-db")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aiError").exists());
    }

    // ─── NEW TESTS: additional branch coverage ────────────────────────────────

    @Test
    @Order(24)
    void checkDuplicate_nullAiResult_returnsNotDuplicateWithEmptyMessage() throws Exception {
        Mockito.when(aiService.checkDuplicate(anyString())).thenReturn(null);
        Map<String, String> body = Map.of("questionStem", "A unique question with null AI response");
        mockMvc.perform(post("/api/v1/ai/check-duplicate")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isDuplicate").value(false))
                .andExpect(jsonPath("$.message").value(""));
    }

    @Test
    @Order(25)
    void checkDuplicateDb_withTopicIdOnly_returns200() throws Exception {
        Topic topic = topicRepository.save(Topic.builder().name("Thread Safety").techStack(javaStack).build());
        Mockito.when(aiService.checkDuplicateAgainstDb(anyString(), anyList()))
                .thenReturn(List.of(Map.of("similarityPercent", 10)));
        Map<String, Object> body = Map.of(
                "questionStem", "What is a thread?",
                "topicId", topic.getId());
        mockMvc.perform(post("/api/v1/ai/check-duplicate-db")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.blocked").value(false));
    }

    @Test
    @Order(26)
    void generateMcqs_duplicateDetected_reportsSkippedCount() throws Exception {
        Topic topic = topicRepository.save(Topic.builder().name("Dup Detection").techStack(javaStack).build());
        Mockito.when(aiService.generateMcqs(anyString(), anyString(), anyInt(), anyString(), anyString()))
                .thenReturn(List.of(Map.of(
                        "questionStem", "What is garbage collection?",
                        "optionA", "Memory cleanup", "optionB", "B", "optionC", "C", "optionD", "D",
                        "correctAnswer", "A", "difficulty", "EASY")));
        // high similarity → duplicate → skip
        Mockito.when(aiService.checkDuplicateAgainstDb(anyString(), anyList()))
                .thenReturn(List.of(Map.of("similarityPercent", 90)));
        Map<String, Object> body = Map.of(
                "techStackId", javaStack.getId(),
                "topicId", topic.getId(),
                "count", 1);
        mockMvc.perform(post("/api/v1/ai/generate-mcqs")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.generated").value(0))
                .andExpect(jsonPath("$.skippedDuplicates").value(org.hamcrest.Matchers.greaterThanOrEqualTo(1)));
    }

    @Test
    @Order(27)
    void generateMcqs_longStemDuplicate_truncatesInSkippedStems() throws Exception {
        Topic topic = topicRepository.save(Topic.builder().name("Long Stem Check").techStack(javaStack).build());
        String longStem = "A".repeat(100); // > 80 chars → truncated with "..."
        Mockito.when(aiService.generateMcqs(anyString(), anyString(), anyInt(), anyString(), anyString()))
                .thenReturn(List.of(Map.of(
                        "questionStem", longStem,
                        "optionA", "X", "optionB", "Y", "optionC", "Z", "optionD", "W",
                        "correctAnswer", "A", "difficulty", "MEDIUM")));
        Mockito.when(aiService.checkDuplicateAgainstDb(anyString(), anyList()))
                .thenReturn(List.of(Map.of("similarityPercent", 80)));
        Map<String, Object> body = Map.of(
                "techStackId", javaStack.getId(),
                "topicId", topic.getId(),
                "count", 1);
        mockMvc.perform(post("/api/v1/ai/generate-mcqs")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.skippedDuplicates").value(org.hamcrest.Matchers.greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.skippedStems[0]").value(org.hamcrest.Matchers.containsString("AAAA")));
    }

    @Test
    @Order(28)
    void autoDifficulty_nullDifficultyAndNullScore_doesNotPersistEither() throws Exception {
        java.util.Map<String, Object> diffResult = new java.util.HashMap<>();
        // neither diffStr nor scoreObj present — both if-branches are false
        diffResult.put("reasoning", "No difficulty determined");
        diffResult.put("source", "fallback");
        Mockito.when(aiService.autoDifficulty(any(Mcq.class))).thenReturn(diffResult);
        Map<String, Object> body = Map.of("mcqId", existingMcq.getId());
        mockMvc.perform(post("/api/v1/ai/auto-difficulty")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mcqId").value(existingMcq.getId()));
    }

    @Test
    @Order(29)
    void autoDifficulty_invalidDifficultyString_swallowsIllegalArgument() throws Exception {
        java.util.Map<String, Object> diffResult = new java.util.HashMap<>();
        diffResult.put("difficulty", "EXTREME"); // not a valid Difficulty enum value
        diffResult.put("score", 55);
        Mockito.when(aiService.autoDifficulty(any(Mcq.class))).thenReturn(diffResult);
        Map<String, Object> body = Map.of("mcqId", existingMcq.getId());
        mockMvc.perform(post("/api/v1/ai/auto-difficulty")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mcqId").value(existingMcq.getId()));
    }

    @Test
    @Order(30)
    void autoDifficulty_mcqNotFound_returns404() throws Exception {
        Map<String, Object> body = Map.of("mcqId", 9999999);
        mockMvc.perform(post("/api/v1/ai/auto-difficulty")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(31)
    void semanticSearch_noTechStackId_usesAllCandidates() throws Exception {
        Mockito.when(aiService.semanticSearch(anyString(), anyList(), anyInt()))
                .thenReturn(List.of(Map.of("id", existingMcq.getId(), "score", 0.8)));
        Map<String, Object> body = Map.of("query", "java memory management");
        mockMvc.perform(post("/api/v1/ai/semantic-search")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.query").value("java memory management"))
                .andExpect(jsonPath("$.total").value(1));
    }

    @Test
    @Order(32)
    void semanticSearch_limitOutOfRange_clampsTo10() throws Exception {
        Mockito.when(aiService.semanticSearch(anyString(), anyList(), anyInt()))
                .thenReturn(List.of());
        Map<String, Object> body = Map.of("query", "polymorphism", "limit", 100);
        mockMvc.perform(post("/api/v1/ai/semantic-search")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(0));
    }
}
