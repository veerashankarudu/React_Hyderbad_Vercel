package com.accenture.quizhub.controller;

import com.accenture.quizhub.config.JwtUtil;
import com.accenture.quizhub.entity.*;
import com.accenture.quizhub.enums.Difficulty;
import com.accenture.quizhub.enums.McqStatus;
import com.accenture.quizhub.enums.Role;
import com.accenture.quizhub.repository.*;
import com.accenture.quizhub.service.AIService;
import com.accenture.quizhub.service.EmailService;
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

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class LiveSessionControllerIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired TechStackRepository techStackRepository;
    @Autowired TopicRepository topicRepository;
    @Autowired McqRepository mcqRepository;
    @Autowired McqVersionRepository mcqVersionRepository;
    @Autowired ReviewCommentRepository reviewCommentRepository;
    @Autowired QuizSessionRepository quizSessionRepository;
    @Autowired QuizAttemptRepository quizAttemptRepository;
    @Autowired InboxMessageRepository inboxMessageRepository;
    @Autowired NotificationRepository notificationRepository;
    @Autowired LiveSessionRepository liveSessionRepository;
    @Autowired LiveParticipantRepository participantRepository;
    @Autowired LiveAnswerRepository answerRepository;
    @Autowired JwtUtil jwtUtil;
    @Autowired PasswordEncoder passwordEncoder;
    @MockBean EmailService emailService;
    @MockBean AIService aiService;

    private String hostToken;
    private Long quizSessionId;
    private Mcq approvedMcq;

    @BeforeEach
    void setUp() {
        // Clean up in dependency order
        answerRepository.deleteAll();
        participantRepository.deleteAll();
        liveSessionRepository.deleteAll();
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

        TechStack stack = techStackRepository.save(TechStack.builder().name("Java").build());

        User host = userRepository.save(User.builder()
                .enterpriseId("live.host")
                .fullName("Live Host")
                .email("host@live.com")
                .passwordHash(passwordEncoder.encode("Host@123"))
                .role(Role.SME).approved(true)
                .techStacks(new ArrayList<>())
                .build());

        hostToken = "Bearer " + jwtUtil.generateToken("live.host", "SME");

        approvedMcq = mcqRepository.save(Mcq.builder()
                .questionStem("What is 2+2?")
                .optionA("3").optionB("4").optionC("5").optionD("6")
                .correctAnswer("B")
                .difficulty(Difficulty.EASY)
                .status(McqStatus.APPROVED)
                .creator(host)
                .build());

        QuizSession qs = quizSessionRepository.save(QuizSession.builder()
                .title("Live Test Quiz")
                .shareToken("live-test-share-token")
                .mcqIds(String.valueOf(approvedMcq.getId()))
                .timeLimitMinutes(10)
                .createdBy("live.host")
                .createdByName("Live Host")
                .build());
        quizSessionId = qs.getId();
    }

    // ── Create Session ────────────────────────────────────────────────────────────

    @Test
    @Order(1)
    void createSession_shouldReturn201WithPin() throws Exception {
        Map<String, Object> req = Map.of("quizId", quizSessionId, "timeLimitSeconds", 30);

        mockMvc.perform(post("/api/v1/live/sessions")
                .header("Authorization", hostToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.pin", hasLength(6)))
            .andExpect(jsonPath("$.status", is("WAITING")))
            .andExpect(jsonPath("$.quizTitle", is("Live Test Quiz")));
    }

    @Test
    @Order(2)
    void createSession_withInvalidQuizId_shouldReturn404() throws Exception {
        Map<String, Object> req = Map.of("quizId", 99999L, "timeLimitSeconds", 30);

        mockMvc.perform(post("/api/v1/live/sessions")
                .header("Authorization", hostToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isNotFound());
    }

    @Test
    @Order(3)
    void createSession_unauthenticated_shouldReturn403() throws Exception {
        Map<String, Object> req = Map.of("quizId", quizSessionId, "timeLimitSeconds", 30);

        mockMvc.perform(post("/api/v1/live/sessions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isForbidden());
    }

    // ── Validate PIN ──────────────────────────────────────────────────────────────

    @Test
    @Order(4)
    void validatePin_validPin_shouldReturn200() throws Exception {
        // Create a session first
        String pin = createLiveSession();

        mockMvc.perform(get("/api/v1/live/sessions/{pin}/validate", pin))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.pin", is(pin)))
            .andExpect(jsonPath("$.status", is("WAITING")));
    }

    @Test
    @Order(5)
    void validatePin_invalidPin_shouldReturn404() throws Exception {
        mockMvc.perform(get("/api/v1/live/sessions/999999/validate"))
            .andExpect(status().isNotFound());
    }

    // ── Join Session ──────────────────────────────────────────────────────────────

    @Test
    @Order(6)
    void joinSession_validRequest_shouldReturn201WithRejoinToken() throws Exception {
        String pin = createLiveSession();
        Map<String, String> req = Map.of("displayName", "TestPlayer");

        mockMvc.perform(post("/api/v1/live/sessions/{pin}/join", pin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.displayName", is("TestPlayer")))
            .andExpect(jsonPath("$.rejoinToken", notNullValue()))
            .andExpect(jsonPath("$.sessionId", notNullValue()));
    }

    @Test
    @Order(7)
    void joinSession_duplicateDisplayName_shouldReturn409() throws Exception {
        String pin = createLiveSession();
        Map<String, String> req = Map.of("displayName", "SameName");

        // First join
        mockMvc.perform(post("/api/v1/live/sessions/{pin}/join", pin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isCreated());

        // Second join with same name
        mockMvc.perform(post("/api/v1/live/sessions/{pin}/join", pin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isConflict());
    }

    @Test
    @Order(8)
    void joinSession_blankDisplayName_shouldReturn400() throws Exception {
        String pin = createLiveSession();
        Map<String, String> req = Map.of("displayName", "  ");

        mockMvc.perform(post("/api/v1/live/sessions/{pin}/join", pin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isBadRequest());
    }

    // ── Start + Next + End ────────────────────────────────────────────────────────

    @Test
    @Order(9)
    void startSession_byHost_shouldReturn200() throws Exception {
        Long sessionId = createLiveSessionAndGetId();

        // Add a participant first
        liveSessionRepository.findById(sessionId).ifPresent(s -> {
            participantRepository.save(com.accenture.quizhub.entity.LiveParticipant.builder()
                    .sessionId(s.getId())
                    .displayName("Player1")
                    .rejoinToken(java.util.UUID.randomUUID().toString())
                    .joinedAt(java.time.LocalDateTime.now())
                    .build());
        });

        mockMvc.perform(post("/api/v1/live/sessions/{id}/start", sessionId)
                .header("Authorization", hostToken))
            .andExpect(status().isOk());
    }

    @Test
    @Order(10)
    void startSession_notHost_shouldReturn400() throws Exception {
        Long sessionId = createLiveSessionAndGetId();

        String otherToken = "Bearer " + jwtUtil.generateToken("other.user", "SME");

        mockMvc.perform(post("/api/v1/live/sessions/{id}/start", sessionId)
                .header("Authorization", otherToken))
            .andExpect(status().isBadRequest());
    }

    @Test
    @Order(11)
    void endSession_byHost_shouldReturn200() throws Exception {
        Long sessionId = createLiveSessionAndGetId();

        mockMvc.perform(post("/api/v1/live/sessions/{id}/end", sessionId)
                .header("Authorization", hostToken))
            .andExpect(status().isOk());
    }

    // ── Leaderboard ───────────────────────────────────────────────────────────────

    @Test
    @Order(12)
    void getLeaderboard_shouldReturn200WithEmptyList() throws Exception {
        Long sessionId = createLiveSessionAndGetId();

        mockMvc.perform(get("/api/v1/live/sessions/{id}/leaderboard", sessionId)
                .header("Authorization", hostToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(0)));
    }

    // ── Reconnect ─────────────────────────────────────────────────────────────────

    @Test
    @Order(13)
    void reconnect_validToken_shouldReturn200() throws Exception {
        String pin = createLiveSession();

        // Join to get rejoin token
        Map<String, String> joinReq = Map.of("displayName", "ReconnectPlayer");
        String joinResponse = mockMvc.perform(post("/api/v1/live/sessions/{pin}/join", pin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(joinReq)))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();

        Map<?, ?> joinData = objectMapper.readValue(joinResponse, Map.class);
        String rejoinToken = (String) joinData.get("rejoinToken");
        Long sessionId = Long.valueOf(joinData.get("sessionId").toString());

        // Reconnect
        Map<String, String> reconnectReq = Map.of("rejoinToken", rejoinToken);
        mockMvc.perform(post("/api/v1/live/sessions/{id}/reconnect", sessionId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reconnectReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.displayName", is("ReconnectPlayer")));
    }

    @Test
    @Order(14)
    void reconnect_invalidToken_shouldReturn404() throws Exception {
        Long sessionId = createLiveSessionAndGetId();

        Map<String, String> req = Map.of("rejoinToken", "00000000-0000-0000-0000-000000000000");
        mockMvc.perform(post("/api/v1/live/sessions/{id}/reconnect", sessionId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isNotFound());
    }

    // ── Kick ──────────────────────────────────────────────────────────────────────

    @Test
    @Order(15)
    void kickParticipant_byHost_shouldReturn200() throws Exception {
        String pin = createLiveSession();
        Long sessionId = liveSessionRepository.findByPin(pin).get().getId();

        LiveParticipant p = participantRepository.save(LiveParticipant.builder()
                .sessionId(sessionId)
                .displayName("ToKick")
                .rejoinToken(UUID.randomUUID().toString())
                .joinedAt(java.time.LocalDateTime.now())
                .build());

        mockMvc.perform(delete("/api/v1/live/sessions/{sid}/participants/{pid}", sessionId, p.getId())
                .header("Authorization", hostToken))
            .andExpect(status().isOk());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────────

    private String createLiveSession() throws Exception {
        Map<String, Object> req = Map.of("quizId", quizSessionId, "timeLimitSeconds", 30);
        String body = mockMvc.perform(post("/api/v1/live/sessions")
                .header("Authorization", hostToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();
        return (String) objectMapper.readValue(body, Map.class).get("pin");
    }

    private Long createLiveSessionAndGetId() throws Exception {
        Map<String, Object> req = Map.of("quizId", quizSessionId, "timeLimitSeconds", 30);
        String body = mockMvc.perform(post("/api/v1/live/sessions")
                .header("Authorization", hostToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();
        return Long.valueOf(objectMapper.readValue(body, Map.class).get("id").toString());
    }
}
