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
class ReviewControllerIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired TechStackRepository techStackRepository;
    @Autowired McqRepository mcqRepository;
    @Autowired ReviewCommentRepository reviewCommentRepository;
    @Autowired McqVersionRepository mcqVersionRepository;
    @Autowired InboxMessageRepository inboxMessageRepository;
    @Autowired NotificationRepository notificationRepository;
    @Autowired JwtUtil jwtUtil;
    @Autowired PasswordEncoder passwordEncoder;
    @MockBean EmailService emailService;
    @MockBean AIService aiService;

    private String creatorToken;
    private String reviewerToken;
    private User creator;
    private User reviewer;
    private TechStack javaStack;
    private Mcq mcqUnderReview;

    @Autowired TopicRepository topicRepository;

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

        creator = userRepository.save(User.builder()
                .enterpriseId("rev.creator")
                .fullName("Rev Creator")
                .email("creator@rev.com")
                .passwordHash(passwordEncoder.encode("Pass@123"))
                .role(Role.SME).approved(true)
                .techStacks(new ArrayList<>())
                .build());

        reviewer = userRepository.save(User.builder()
                .enterpriseId("rev.reviewer")
                .fullName("Rev Reviewer")
                .email("reviewer@rev.com")
                .passwordHash(passwordEncoder.encode("Pass@123"))
                .role(Role.SME).approved(true)
                .techStacks(Collections.singletonList(javaStack))
                .build());

        creatorToken = "Bearer " + jwtUtil.generateToken("rev.creator", "SME");
        reviewerToken = "Bearer " + jwtUtil.generateToken("rev.reviewer", "SME");

        mcqUnderReview = mcqRepository.save(Mcq.builder()
                .questionStem("What is inheritance?")
                .optionA("Reuse").optionB("Ignore").optionC("Delete").optionD("Skip")
                .correctAnswer("A").difficulty(Difficulty.EASY)
                .techStack(javaStack).creator(creator).reviewer(reviewer)
                .status(McqStatus.UNDER_REVIEW)
                .build());
    }

    // ─── GET ASSIGNED REVIEWS ────────────────────────────────────────────────

    @Test
    @Order(1)
    void getAssignedReviews_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/reviews")
                        .header("Authorization", reviewerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    @Order(2)
    void getAssignedReviews_withStatusFilter_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/reviews?status=UNDER_REVIEW")
                        .header("Authorization", reviewerToken))
                .andExpect(status().isOk());
    }

    @Test
    @Order(3)
    void getAssignedReviews_unauthenticated_returns4xx() throws Exception {
        mockMvc.perform(get("/api/v1/reviews"))
                .andExpect(status().is4xxClientError());
    }

    // ─── SUBMIT REVIEW ────────────────────────────────────────────────────────

    @Test
    @Order(4)
    void submitReview_approve_returns200() throws Exception {
        Map<String, String> req = Map.of("action", "APPROVE");
        mockMvc.perform(post("/api/v1/reviews/" + mcqUnderReview.getId() + "/submit")
                        .header("Authorization", reviewerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    @Order(5)
    void submitReview_rejectWithComment_returns200() throws Exception {
        Map<String, String> req = Map.of("action", "REJECT", "comment", "Question needs improvement");
        mockMvc.perform(post("/api/v1/reviews/" + mcqUnderReview.getId() + "/submit")
                        .header("Authorization", reviewerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));
    }

    @Test
    @Order(6)
    void submitReview_rejectWithoutComment_returns400() throws Exception {
        Map<String, String> req = Map.of("action", "REJECT");
        mockMvc.perform(post("/api/v1/reviews/" + mcqUnderReview.getId() + "/submit")
                        .header("Authorization", reviewerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @Order(7)
    void submitReview_byWrongReviewer_returns4xx() throws Exception {
        Map<String, String> req = Map.of("action", "APPROVE");
        mockMvc.perform(post("/api/v1/reviews/" + mcqUnderReview.getId() + "/submit")
                        .header("Authorization", creatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().is4xxClientError());
    }

    // ─── ADD COMMENT ─────────────────────────────────────────────────────────

    @Test
    @Order(8)
    void addComment_asReviewer_returns200() throws Exception {
        Map<String, String> body = Map.of("comment", "This looks good overall");
        mockMvc.perform(post("/api/v1/reviews/" + mcqUnderReview.getId() + "/comments")
                        .header("Authorization", reviewerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());
    }

    @Test
    @Order(9)
    void addComment_byNonReviewer_returns4xx() throws Exception {
        Map<String, String> body = Map.of("comment", "I am not the reviewer");
        mockMvc.perform(post("/api/v1/reviews/" + mcqUnderReview.getId() + "/comments")
                        .header("Authorization", creatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().is4xxClientError());
    }
}
