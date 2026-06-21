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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.*;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class QuizSessionControllerIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired TechStackRepository techStackRepository;
    @Autowired TopicRepository topicRepository;
    @Autowired McqRepository mcqRepository;
    @Autowired ReviewCommentRepository reviewCommentRepository;
    @Autowired McqVersionRepository mcqVersionRepository;
    @Autowired QuizSessionRepository quizSessionRepository;
    @Autowired QuizAttemptRepository quizAttemptRepository;
    @Autowired InboxMessageRepository inboxMessageRepository;
    @Autowired NotificationRepository notificationRepository;
    @Autowired JwtUtil jwtUtil;
    @Autowired PasswordEncoder passwordEncoder;
    @MockBean EmailService emailService;
    @MockBean AIService aiService;

    private String creatorToken;
    private TechStack javaStack;
    private Mcq approvedMcq;

    @BeforeEach
    void setUp() {
        quizAttemptRepository.deleteAll();
        quizSessionRepository.deleteAll();
        reviewCommentRepository.deleteAll();
        mcqVersionRepository.deleteAll();
        mcqRepository.deleteAll();
        topicRepository.deleteAll();
        notificationRepository.deleteAll();
        inboxMessageRepository.deleteAll();
        userRepository.deleteAll();
        techStackRepository.deleteAll();

        javaStack = techStackRepository.save(TechStack.builder().name("Java").build());

        User creator = userRepository.save(User.builder()
                .enterpriseId("qs.creator")
                .fullName("QS Creator")
                .email("creator@qs.com")
                .passwordHash(passwordEncoder.encode("Pass@123"))
                .role(Role.SME).approved(true)
                .techStacks(new ArrayList<>())
                .build());

        creatorToken = "Bearer " + jwtUtil.generateToken("qs.creator", "SME");

        approvedMcq = mcqRepository.save(Mcq.builder()
                .questionStem("What is inheritance in OOP?")
                .optionA("Reusing parent class").optionB("Creating new class")
                .optionC("Hiding implementation").optionD("Overriding methods")
                .correctAnswer("A").difficulty(Difficulty.EASY)
                .techStack(javaStack).creator(creator).status(McqStatus.APPROVED)
                .build());
    }

    @Test
    @Order(1)
    void createSession_withApprovedMcqs_returns200() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("title", "Java Test Session");
        body.put("questionCount", 1);
        body.put("timeLimitMinutes", 15);
        body.put("linkValidHours", 24);

        mockMvc.perform(post("/api/v1/quiz-sessions")
                        .header("Authorization", creatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shareToken").exists());
    }

    @Test
    @Order(2)
    void createSession_noApprovedMcqs_returns400() throws Exception {
        mcqRepository.deleteAll();
        Map<String, Object> body = new HashMap<>();
        body.put("title", "Empty Session");

        mockMvc.perform(post("/api/v1/quiz-sessions")
                        .header("Authorization", creatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(3)
    void listSessions_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/quiz-sessions")
                        .header("Authorization", creatorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @Order(4)
    void createAndGetSession_byToken_returns200() throws Exception {
        // Create a session
        Map<String, Object> body = new HashMap<>();
        body.put("title", "Token Test Session");
        body.put("questionCount", 1);
        body.put("pickedIds", List.of(approvedMcq.getId().intValue()));

        String resp = mockMvc.perform(post("/api/v1/quiz-sessions")
                        .header("Authorization", creatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        Map<?, ?> created = objectMapper.readValue(resp, Map.class);
        String shareToken = (String) created.get("shareToken");

        mockMvc.perform(get("/api/v1/quiz-sessions/take/" + shareToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.questions").isArray());
    }

    @Test
    @Order(5)
    void getSession_invalidToken_returns404() throws Exception {
        mockMvc.perform(get("/api/v1/quiz-sessions/take/invalidtoken123"))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(6)
    void submitAttempt_returns200() throws Exception {
        // Create a session first
        Map<String, Object> createBody = new HashMap<>();
        createBody.put("title", "Submit Test");
        createBody.put("pickedIds", List.of(approvedMcq.getId().intValue()));

        String resp = mockMvc.perform(post("/api/v1/quiz-sessions")
                        .header("Authorization", creatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createBody)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        Map<?, ?> created = objectMapper.readValue(resp, Map.class);
        String shareToken = (String) created.get("shareToken");

        // Submit attempt
        Map<String, Object> submitBody = new HashMap<>();
        submitBody.put("name", "Test User");
        submitBody.put("email", "testuser@example.com");
        submitBody.put("answers", Map.of(String.valueOf(approvedMcq.getId()), "A"));

        mockMvc.perform(post("/api/v1/quiz-sessions/take/" + shareToken + "/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submitBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").exists());
    }

    @Test
    @Order(7)
    void listSessions_unauthenticated_returns4xx() throws Exception {
        mockMvc.perform(get("/api/v1/quiz-sessions"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @Order(8)
    void checkAttempt_invalidToken_returns404() throws Exception {
        mockMvc.perform(get("/api/v1/quiz-sessions/take/nonexistenttoken/check-attempt")
                        .param("email", "nobody@example.com"))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(9)
    void checkAttempt_notYetAttempted_returnsFalse() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("title", "Check Attempt Session");
        body.put("pickedIds", List.of(approvedMcq.getId().intValue()));

        String resp = mockMvc.perform(post("/api/v1/quiz-sessions")
                        .header("Authorization", creatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String shareToken = (String) objectMapper.readValue(resp, Map.class).get("shareToken");

        mockMvc.perform(get("/api/v1/quiz-sessions/take/" + shareToken + "/check-attempt")
                        .param("email", "nobody@example.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.alreadyAttempted").value(false));
    }

    @Test
    @Order(10)
    void submitAttempt_duplicateEmail_returns400() throws Exception {
        Map<String, Object> createBody = new HashMap<>();
        createBody.put("title", "Duplicate Submit Test");
        createBody.put("pickedIds", List.of(approvedMcq.getId().intValue()));

        String resp = mockMvc.perform(post("/api/v1/quiz-sessions")
                        .header("Authorization", creatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createBody)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String shareToken = (String) objectMapper.readValue(resp, Map.class).get("shareToken");

        Map<String, Object> submitBody = new HashMap<>();
        submitBody.put("name", "Repeat User");
        submitBody.put("email", "repeat@example.com");
        submitBody.put("answers", Map.of(String.valueOf(approvedMcq.getId()), "A"));

        mockMvc.perform(post("/api/v1/quiz-sessions/take/" + shareToken + "/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submitBody)))
                .andExpect(status().isOk());

        // second submission with same email must be rejected
        mockMvc.perform(post("/api/v1/quiz-sessions/take/" + shareToken + "/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submitBody)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(11)
    void getAttempts_afterSubmit_returnsAttemptList() throws Exception {
        Map<String, Object> createBody = new HashMap<>();
        createBody.put("title", "Attempts List Test");
        createBody.put("pickedIds", List.of(approvedMcq.getId().intValue()));

        String resp = mockMvc.perform(post("/api/v1/quiz-sessions")
                        .header("Authorization", creatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createBody)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        Map<?, ?> created = objectMapper.readValue(resp, Map.class);
        String shareToken = (String) created.get("shareToken");
        Long sessionId = Long.valueOf(created.get("id").toString());

        Map<String, Object> submitBody = new HashMap<>();
        submitBody.put("name", "Alice");
        submitBody.put("email", "alice@example.com");
        submitBody.put("answers", Map.of(String.valueOf(approvedMcq.getId()), "A"));

        mockMvc.perform(post("/api/v1/quiz-sessions/take/" + shareToken + "/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submitBody)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/quiz-sessions/" + sessionId + "/attempts")
                        .header("Authorization", creatorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].candidateEmail").value("alice@example.com"))
                .andExpect(jsonPath("$[0].score").exists())
                .andExpect(jsonPath("$[0].topicBreakdown").exists());
    }

    @Test
    @Order(12)
    void getAttempts_sessionNotFound_returns404() throws Exception {
        mockMvc.perform(get("/api/v1/quiz-sessions/99999/attempts")
                        .header("Authorization", creatorToken))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(13)
    void getScreenshot_attemptWithoutScreenshot_returns404() throws Exception {
        Map<String, Object> createBody = new HashMap<>();
        createBody.put("title", "Screenshot Test");
        createBody.put("pickedIds", List.of(approvedMcq.getId().intValue()));

        String resp = mockMvc.perform(post("/api/v1/quiz-sessions")
                        .header("Authorization", creatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createBody)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        Map<?, ?> created = objectMapper.readValue(resp, Map.class);
        String shareToken = (String) created.get("shareToken");
        Long sessionId = Long.valueOf(created.get("id").toString());

        Map<String, Object> submitBody = new HashMap<>();
        submitBody.put("name", "Bob");
        submitBody.put("email", "bob@example.com");
        submitBody.put("answers", Map.of(String.valueOf(approvedMcq.getId()), "A"));

        String submitResp = mockMvc.perform(post("/api/v1/quiz-sessions/take/" + shareToken + "/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submitBody)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        Long attemptId = Long.valueOf(
                objectMapper.readValue(submitResp, Map.class).get("attemptId").toString());

        mockMvc.perform(get("/api/v1/quiz-sessions/" + sessionId + "/attempts/" + attemptId + "/screenshot")
                        .header("Authorization", creatorToken))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(14)
    void assessmentLeaderboard_returns200WithSessionsAndLeaderboard() throws Exception {
        mockMvc.perform(get("/api/v1/quiz-sessions/assessment-leaderboard")
                        .header("Authorization", creatorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessions").isArray())
                .andExpect(jsonPath("$.leaderboard").isArray());
    }

    @Test
    @Order(15)
    void submitAttempt_withEnoughViolations_returnsTerminatedStatus() throws Exception {
        Map<String, Object> createBody = new HashMap<>();
        createBody.put("title", "Violation Test");
        createBody.put("pickedIds", List.of(approvedMcq.getId().intValue()));

        String resp = mockMvc.perform(post("/api/v1/quiz-sessions")
                        .header("Authorization", creatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createBody)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String shareToken = (String) objectMapper.readValue(resp, Map.class).get("shareToken");

        Map<String, Object> submitBody = new HashMap<>();
        submitBody.put("name", "Violator");
        submitBody.put("email", "violator@example.com");
        submitBody.put("answers", Map.of(String.valueOf(approvedMcq.getId()), "A"));
        submitBody.put("violationCount", 3);

        mockMvc.perform(post("/api/v1/quiz-sessions/take/" + shareToken + "/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submitBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("TERMINATED"));
    }

    @Test
    @Order(16)
    void getTakeData_expiredSession_returns410() throws Exception {
        quizSessionRepository.save(QuizSession.builder()
                .title("Expired Session")
                .shareToken("expiredtesttoken")
                .mcqIds(String.valueOf(approvedMcq.getId()))
                .timeLimitMinutes(10)
                .createdBy("qs.creator")
                .createdByName("QS Creator")
                .expiresAt(java.time.LocalDateTime.now().minusHours(2))
                .build());

        mockMvc.perform(get("/api/v1/quiz-sessions/take/expiredtesttoken"))
                .andExpect(status().is(410));
    }

    @Test
    @Order(17)
    void createSession_withTechStackFilter_returns200() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("title", "TechStack Filter Session");
        body.put("questionCount", 5);
        body.put("techStackName", "Java");

        mockMvc.perform(post("/api/v1/quiz-sessions")
                        .header("Authorization", creatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shareToken").exists())
                .andExpect(jsonPath("$.questionCount").value(1));
    }

    @Test
    @Order(18)
    void createSession_withDifficultyFilter_returns200() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("title", "Difficulty Filter Session");
        body.put("difficulty", "EASY");

        mockMvc.perform(post("/api/v1/quiz-sessions")
                        .header("Authorization", creatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shareToken").exists());
    }

    @Test
    @Order(19)
    void createSession_withTopicFilterNoMatch_returns400() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("title", "Topic Filter No Match");
        body.put("topicName", "NonExistentTopic99999");

        mockMvc.perform(post("/api/v1/quiz-sessions")
                        .header("Authorization", creatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    @Order(20)
    void checkAttempt_afterSubmit_returnsTrue() throws Exception {
        Map<String, Object> createBody = new HashMap<>();
        createBody.put("title", "Check After Submit");
        createBody.put("pickedIds", List.of(approvedMcq.getId().intValue()));

        String resp = mockMvc.perform(post("/api/v1/quiz-sessions")
                        .header("Authorization", creatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createBody)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String shareToken = (String) objectMapper.readValue(resp, Map.class).get("shareToken");

        Map<String, Object> submitBody = new HashMap<>();
        submitBody.put("name", "Check User");
        submitBody.put("email", "checkuser@example.com");
        submitBody.put("answers", Map.of(String.valueOf(approvedMcq.getId()), "A"));

        mockMvc.perform(post("/api/v1/quiz-sessions/take/" + shareToken + "/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submitBody)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/quiz-sessions/take/" + shareToken + "/check-attempt")
                        .param("email", "checkuser@example.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.alreadyAttempted").value(true));
    }

    @Test
    @Order(21)
    void submitAttempt_invalidToken_returns404() throws Exception {
        Map<String, Object> submitBody = new HashMap<>();
        submitBody.put("name", "Nobody");
        submitBody.put("email", "nobody@example.com");
        submitBody.put("answers", Map.of());

        mockMvc.perform(post("/api/v1/quiz-sessions/take/nonexistenttoken999/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submitBody)))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(22)
    void submitAttempt_withNullAnswers_scoresZero() throws Exception {
        Map<String, Object> createBody = new HashMap<>();
        createBody.put("title", "Null Answers Session");
        createBody.put("pickedIds", List.of(approvedMcq.getId().intValue()));

        String resp = mockMvc.perform(post("/api/v1/quiz-sessions")
                        .header("Authorization", creatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createBody)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String shareToken = (String) objectMapper.readValue(resp, Map.class).get("shareToken");

        Map<String, Object> submitBody = new HashMap<>();
        submitBody.put("name", "No-Answer User");
        submitBody.put("email", "noanswer@example.com");
        // deliberately omit "answers" key -> null in controller

        mockMvc.perform(post("/api/v1/quiz-sessions/take/" + shareToken + "/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submitBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(0));
    }

    @Test
    @Order(23)
    void assessmentLeaderboard_withSessionIdFilter_returns200() throws Exception {
        Map<String, Object> createBody = new HashMap<>();
        createBody.put("title", "Leaderboard Filter Session");
        createBody.put("pickedIds", List.of(approvedMcq.getId().intValue()));

        String resp = mockMvc.perform(post("/api/v1/quiz-sessions")
                        .header("Authorization", creatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createBody)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        Long sessionId = Long.valueOf(objectMapper.readValue(resp, Map.class).get("id").toString());

        mockMvc.perform(get("/api/v1/quiz-sessions/assessment-leaderboard")
                        .param("sessionId", sessionId.toString())
                        .header("Authorization", creatorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessions").isArray())
                .andExpect(jsonPath("$.leaderboard").isArray());
    }

    @Test
    @Order(24)
    void assessmentLeaderboard_withDateRangeParams_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/quiz-sessions/assessment-leaderboard")
                        .param("from", "2020-01-01")
                        .param("to", "2099-12-31")
                        .header("Authorization", creatorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessions").isArray())
                .andExpect(jsonPath("$.leaderboard").isArray());
    }

    @Test
    @Order(25)
    void getScreenshot_wrongSessionId_returns404() throws Exception {
        Map<String, Object> createBody = new HashMap<>();
        createBody.put("title", "WrongSession Test");
        createBody.put("pickedIds", List.of(approvedMcq.getId().intValue()));

        String resp = mockMvc.perform(post("/api/v1/quiz-sessions")
                        .header("Authorization", creatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createBody)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String shareToken = (String) objectMapper.readValue(resp, Map.class).get("shareToken");

        Map<String, Object> submitBody = new HashMap<>();
        submitBody.put("name", "WS User");
        submitBody.put("email", "wsuser@example.com");
        submitBody.put("answers", Map.of(String.valueOf(approvedMcq.getId()), "A"));

        String submitResp = mockMvc.perform(post("/api/v1/quiz-sessions/take/" + shareToken + "/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submitBody)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        Long attemptId = Long.valueOf(
                objectMapper.readValue(submitResp, Map.class).get("attemptId").toString());

        // Use a sessionId that does not match this attempt's session
        mockMvc.perform(get("/api/v1/quiz-sessions/99998/attempts/" + attemptId + "/screenshot")
                        .header("Authorization", creatorToken))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(26)
    void submitAttempt_withViolationScreenshot_screenshotEndpointReturns200() throws Exception {
        Map<String, Object> createBody = new HashMap<>();
        createBody.put("title", "Screenshot Full Flow");
        createBody.put("pickedIds", List.of(approvedMcq.getId().intValue()));

        String resp = mockMvc.perform(post("/api/v1/quiz-sessions")
                        .header("Authorization", creatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createBody)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        Map<?, ?> created = objectMapper.readValue(resp, Map.class);
        String shareToken = (String) created.get("shareToken");
        Long sessionId = Long.valueOf(created.get("id").toString());

        Map<String, Object> submitBody = new HashMap<>();
        submitBody.put("name", "Screenshot User");
        submitBody.put("email", "screenshot@example.com");
        submitBody.put("answers", Map.of(String.valueOf(approvedMcq.getId()), "A"));
        submitBody.put("violationCount", 1);
        submitBody.put("violationScreenshot", "data:image/png;base64,abc123");

        String submitResp = mockMvc.perform(post("/api/v1/quiz-sessions/take/" + shareToken + "/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submitBody)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        Long attemptId = Long.valueOf(
                objectMapper.readValue(submitResp, Map.class).get("attemptId").toString());

        mockMvc.perform(get("/api/v1/quiz-sessions/" + sessionId + "/attempts/" + attemptId + "/screenshot")
                        .header("Authorization", creatorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.screenshot").value("data:image/png;base64,abc123"));
    }

    @Test
    @Order(27)
    void listSessions_includesExpiredAndTimeLimitFields() throws Exception {
        // Create a session so the list is non-empty
        Map<String, Object> createBody = new HashMap<>();
        createBody.put("title", "List Fields Test");
        createBody.put("pickedIds", List.of(approvedMcq.getId().intValue()));
        createBody.put("timeLimitMinutes", 45);

        mockMvc.perform(post("/api/v1/quiz-sessions")
                        .header("Authorization", creatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createBody)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/quiz-sessions")
                        .header("Authorization", creatorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].expired").exists())
                .andExpect(jsonPath("$[0].timeLimitMinutes").value(45))
                .andExpect(jsonPath("$[0].attemptCount").exists())
                .andExpect(jsonPath("$[0].questionCount").isNumber());
    }

    @Test
    @Order(28)
    void createSession_pickedIdsAllDraftMcqs_returns400() throws Exception {
        // Save a DRAFT MCQ – APPROVED filter removes it, leaving empty pool → 400
        User creator = userRepository.findByEnterpriseId("qs.creator").orElseThrow();
        Mcq draftMcq = mcqRepository.save(Mcq.builder()
                .questionStem("Draft question not approved")
                .optionA("A").optionB("B").optionC("C").optionD("D")
                .correctAnswer("A").difficulty(Difficulty.EASY)
                .techStack(javaStack).creator(creator).status(McqStatus.DRAFT)
                .build());

        Map<String, Object> body = new HashMap<>();
        body.put("title", "Draft Only Session");
        body.put("pickedIds", List.of(draftMcq.getId().intValue()));

        mockMvc.perform(post("/api/v1/quiz-sessions")
                        .header("Authorization", creatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    @Order(29)
    void assessmentLeaderboard_withOnlyFromParam_returns200() throws Exception {
        // Exercises fromDt != null while toDt stays null
        mockMvc.perform(get("/api/v1/quiz-sessions/assessment-leaderboard")
                        .param("from", "2020-01-01")
                        .header("Authorization", creatorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessions").isArray())
                .andExpect(jsonPath("$.leaderboard").isArray());
    }

    @Test
    @Order(30)
    void assessmentLeaderboard_withOnlyToParam_returns200() throws Exception {
        // Exercises toDt != null while fromDt stays null
        mockMvc.perform(get("/api/v1/quiz-sessions/assessment-leaderboard")
                        .param("to", "2099-12-31")
                        .header("Authorization", creatorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessions").isArray())
                .andExpect(jsonPath("$.leaderboard").isArray());
    }

    @Test
    @Order(31)
    void submitAttempt_withTimeTakenSeconds_persisted() throws Exception {
        // Exercises body.containsKey("timeTakenSeconds") == true branch
        Map<String, Object> createBody = new HashMap<>();
        createBody.put("title", "Timed Attempt Session");
        createBody.put("pickedIds", List.of(approvedMcq.getId().intValue()));

        String resp = mockMvc.perform(post("/api/v1/quiz-sessions")
                        .header("Authorization", creatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createBody)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String shareToken = (String) objectMapper.readValue(resp, Map.class).get("shareToken");
        Long sessionId = Long.valueOf(objectMapper.readValue(resp, Map.class).get("id").toString());

        Map<String, Object> submitBody = new HashMap<>();
        submitBody.put("name", "Timed User");
        submitBody.put("email", "timed@example.com");
        submitBody.put("answers", Map.of(String.valueOf(approvedMcq.getId()), "A"));
        submitBody.put("timeTakenSeconds", 90);

        mockMvc.perform(post("/api/v1/quiz-sessions/take/" + shareToken + "/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submitBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").exists())
                .andExpect(jsonPath("$.percent").isNumber());

        // Verify getAttempts reflects timeTakenSeconds
        mockMvc.perform(get("/api/v1/quiz-sessions/" + sessionId + "/attempts")
                        .header("Authorization", creatorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].timeTakenSeconds").value(90));
    }
}
