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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class McqControllerIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired TechStackRepository techStackRepository;
    @Autowired TopicRepository topicRepository;
    @Autowired McqRepository mcqRepository;
    @Autowired McqVersionRepository mcqVersionRepository;
    @Autowired ReviewCommentRepository reviewCommentRepository;
    @Autowired InboxMessageRepository inboxMessageRepository;
    @Autowired NotificationRepository notificationRepository;
    @Autowired JwtUtil jwtUtil;
    @Autowired PasswordEncoder passwordEncoder;
    @MockBean EmailService emailService;
    @MockBean AIService aiService;

    private String smeToken;
    private String adminToken;
    private User smeUser;
    private TechStack javaStack;
    private Mcq savedMcq;

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

        smeUser = userRepository.save(User.builder()
                .enterpriseId("ctrl.sme")
                .fullName("Ctrl SME")
                .email("sme@ctrl.com")
                .passwordHash(passwordEncoder.encode("Sme@1234"))
                .role(Role.SME)
                .approved(true)
                .techStacks(new ArrayList<>())
                .build());

        userRepository.save(User.builder()
                .enterpriseId("ctrl.admin")
                .fullName("Ctrl Admin")
                .email("admin@ctrl.com")
                .passwordHash(passwordEncoder.encode("Admin@123"))
                .role(Role.ADMIN)
                .approved(true)
                .techStacks(new ArrayList<>())
                .build());

        smeToken = "Bearer " + jwtUtil.generateToken("ctrl.sme", "SME");
        adminToken = "Bearer " + jwtUtil.generateToken("ctrl.admin", "ADMIN");

        savedMcq = mcqRepository.save(Mcq.builder()
                .questionStem("What is Java?")
                .optionA("A language").optionB("A coffee").optionC("An island").optionD("A tool")
                .correctAnswer("A").difficulty(Difficulty.EASY)
                .techStack(javaStack).creator(smeUser).status(McqStatus.DRAFT)
                .build());
    }

    // ─── CREATE MCQ ───────────────────────────────────────────────────────────

    @Test
    @Order(1)
    void createMcq_validRequest_returns201() throws Exception {
        Map<String, Object> req = Map.of(
                "questionStem", "What does JVM stand for?",
                "optionA", "Java Virtual Machine",
                "optionB", "Java Verified Method",
                "optionC", "Just Virtual Machine",
                "optionD", "Java Value Manager",
                "correctAnswer", "A",
                "difficulty", "EASY",
                "techStackId", javaStack.getId()
        );
        mockMvc.perform(post("/api/v1/mcqs")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"));
    }

    @Test
    @Order(2)
    void createMcq_sendForReview_returns201AndReadyForReview() throws Exception {
        Map<String, Object> req = new HashMap<>(Map.of(
                "questionStem", "What is polymorphism?",
                "optionA", "Many forms",
                "optionB", "One form",
                "optionC", "No forms",
                "optionD", "Two forms",
                "correctAnswer", "A",
                "difficulty", "MEDIUM",
                "techStackId", javaStack.getId()
        ));
        req.put("sendForReview", true);
        mockMvc.perform(post("/api/v1/mcqs")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("READY_FOR_REVIEW"));
    }

    @Test
    @Order(3)
    void createMcq_unauthenticated_returns4xx() throws Exception {
        Map<String, Object> req = Map.of("questionStem", "Q?", "techStackId", javaStack.getId());
        mockMvc.perform(post("/api/v1/mcqs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @Order(4)
    void createMcq_invalidRequest_returns400() throws Exception {
        // Missing required fields
        Map<String, Object> req = Map.of("techStackId", javaStack.getId());
        mockMvc.perform(post("/api/v1/mcqs")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().is4xxClientError());
    }

    // ─── GET MY MCQS ─────────────────────────────────────────────────────────

    @Test
    @Order(5)
    void getMyMcqs_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/mcqs")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    @Order(6)
    void getMyMcqs_withStatusFilter_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/mcqs?status=DRAFT")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk());
    }

    @Test
    @Order(7)
    void getMyMcqs_withSearchFilter_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/mcqs?search=Java")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk());
    }

    // ─── GET BY ID ────────────────────────────────────────────────────────────

    @Test
    @Order(8)
    void getById_existingDraftByCreator_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/mcqs/" + savedMcq.getId())
                        .header("Authorization", smeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(savedMcq.getId()));
    }

    @Test
    @Order(9)
    void getById_notFound_returns4xx() throws Exception {
        mockMvc.perform(get("/api/v1/mcqs/99999")
                        .header("Authorization", smeToken))
                .andExpect(status().is4xxClientError());
    }

    // ─── UPDATE MCQ ───────────────────────────────────────────────────────────

    @Test
    @Order(10)
    void updateMcq_validRequest_returns200() throws Exception {
        Map<String, Object> req = Map.of(
                "questionStem", "Updated: What is Java?",
                "optionA", "A language", "optionB", "A coffee",
                "optionC", "An island", "optionD", "A tool",
                "correctAnswer", "A", "difficulty", "EASY",
                "techStackId", javaStack.getId()
        );
        mockMvc.perform(put("/api/v1/mcqs/" + savedMcq.getId())
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());
    }

    // ─── SUBMIT FOR REVIEW ────────────────────────────────────────────────────

    @Test
    @Order(11)
    void submitForReview_draftMcq_returns200() throws Exception {
        mockMvc.perform(post("/api/v1/mcqs/" + savedMcq.getId() + "/submit")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("READY_FOR_REVIEW"));
    }

    // ─── DELETE MCQ ───────────────────────────────────────────────────────────

    @Test
    @Order(12)
    void deleteMcq_ownDraft_returns204() throws Exception {
        mockMvc.perform(delete("/api/v1/mcqs/" + savedMcq.getId())
                        .header("Authorization", smeToken))
                .andExpect(status().isNoContent());
    }

    // ─── GET HISTORY ─────────────────────────────────────────────────────────

    @Test
    @Order(13)
    void getHistory_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/mcqs/" + savedMcq.getId() + "/history")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }
}
