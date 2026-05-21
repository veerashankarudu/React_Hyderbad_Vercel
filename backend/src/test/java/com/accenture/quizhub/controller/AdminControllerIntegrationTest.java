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
class AdminControllerIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired TechStackRepository techStackRepository;
    @Autowired TopicRepository topicRepository;
    @Autowired McqRepository mcqRepository;
    @Autowired ReviewCommentRepository reviewCommentRepository;
    @Autowired McqVersionRepository mcqVersionRepository;
    @Autowired AuditLogRepository auditLogRepository;
    @Autowired InboxMessageRepository inboxMessageRepository;
    @Autowired NotificationRepository notificationRepository;
    @Autowired JwtUtil jwtUtil;
    @Autowired PasswordEncoder passwordEncoder;
    @MockBean EmailService emailService;
    @MockBean AIService aiService;

    private String adminToken;
    private String smeToken;
    private User adminUser;
    private User smeUser;
    private User reviewerUser;
    private TechStack javaStack;
    private Mcq readyForReviewMcq;

    @BeforeEach
    void setUp() {
        reviewCommentRepository.deleteAll();
        mcqVersionRepository.deleteAll();
        mcqRepository.deleteAll();
        topicRepository.deleteAll();
        auditLogRepository.deleteAll();
        notificationRepository.deleteAll();
        inboxMessageRepository.deleteAll();
        userRepository.deleteAll();
        techStackRepository.deleteAll();

        javaStack = techStackRepository.save(TechStack.builder().name("Java").build());

        adminUser = userRepository.save(User.builder()
                .enterpriseId("adm.admin")
                .fullName("Admin User")
                .email("admin@adm.com")
                .passwordHash(passwordEncoder.encode("Admin@123"))
                .role(Role.ADMIN).approved(true)
                .techStacks(new ArrayList<>())
                .build());

        smeUser = userRepository.save(User.builder()
                .enterpriseId("adm.sme")
                .fullName("Sme User")
                .email("sme@adm.com")
                .passwordHash(passwordEncoder.encode("Sme@1234"))
                .role(Role.SME).approved(true)
                .techStacks(Collections.singletonList(javaStack))
                .build());

        reviewerUser = userRepository.save(User.builder()
                .enterpriseId("adm.reviewer")
                .fullName("Reviewer User")
                .email("reviewer@adm.com")
                .passwordHash(passwordEncoder.encode("Rev@1234"))
                .role(Role.SME).approved(true)
                .techStacks(Collections.singletonList(javaStack))
                .build());

        adminToken = "Bearer " + jwtUtil.generateToken("adm.admin", "ADMIN");
        smeToken   = "Bearer " + jwtUtil.generateToken("adm.sme", "SME");

        readyForReviewMcq = mcqRepository.save(Mcq.builder()
                .questionStem("What is encapsulation?")
                .optionA("Hiding data").optionB("Showing data").optionC("Deleting data").optionD("Copying data")
                .correctAnswer("A").difficulty(Difficulty.EASY)
                .techStack(javaStack).creator(smeUser)
                .status(McqStatus.READY_FOR_REVIEW)
                .build());
    }

    // ─── GET ALL MCQS ─────────────────────────────────────────────────────────

    @Test
    @Order(1)
    void getAllMcqs_admin_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/admin/mcqs")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    @Order(2)
    void getAllMcqs_withStatusFilter_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/admin/mcqs?status=READY_FOR_REVIEW")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk());
    }

    @Test
    @Order(3)
    void getAllMcqs_nonAdmin_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/mcqs")
                        .header("Authorization", smeToken))
                .andExpect(status().isForbidden());
    }

    // ─── EXPORT MCQS ─────────────────────────────────────────────────────────

    @Test
    @Order(4)
    void exportMcqs_admin_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/admin/mcqs/export")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk());
    }

    // ─── ASSIGN REVIEWER ─────────────────────────────────────────────────────

    @Test
    @Order(5)
    void assignReviewer_validRequest_returns200() throws Exception {
        Map<String, Object> req = Map.of("reviewerId", reviewerUser.getId());
        mockMvc.perform(post("/api/v1/admin/mcqs/" + readyForReviewMcq.getId() + "/assign-reviewer")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UNDER_REVIEW"));
    }

    @Test
    @Order(6)
    void assignReviewer_mcqNotFound_returns4xx() throws Exception {
        Map<String, Object> req = Map.of("reviewerId", reviewerUser.getId());
        mockMvc.perform(post("/api/v1/admin/mcqs/99999/assign-reviewer")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().is4xxClientError());
    }

    // ─── GET ELIGIBLE REVIEWERS ──────────────────────────────────────────────

    @Test
    @Order(7)
    void getEligibleReviewers_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/admin/mcqs/" + readyForReviewMcq.getId() + "/eligible-reviewers")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    // ─── GET ALL USERS ────────────────────────────────────────────────────────

    @Test
    @Order(8)
    void getAllUsers_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    // ─── CHANGE USER ROLE ────────────────────────────────────────────────────

    @Test
    @Order(9)
    void changeUserRole_returns200() throws Exception {
        mockMvc.perform(put("/api/v1/admin/users/" + smeUser.getId() + "/role?role=ADMIN")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk());
    }

    // ─── APPROVE USER ────────────────────────────────────────────────────────

    @Test
    @Order(10)
    void approveUser_returns200() throws Exception {
        User pending = userRepository.save(User.builder()
                .enterpriseId("adm.pending")
                .fullName("Pending User")
                .email("pending@adm.com")
                .passwordHash(passwordEncoder.encode("Pass@123"))
                .role(Role.SME).approved(false)
                .techStacks(new ArrayList<>())
                .build());

        mockMvc.perform(put("/api/v1/admin/users/" + pending.getId() + "/approve")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk());
    }

    // ─── REJECT USER ─────────────────────────────────────────────────────────

    @Test
    @Order(11)
    void rejectUser_returns204() throws Exception {
        User toReject = userRepository.save(User.builder()
                .enterpriseId("adm.toreject")
                .fullName("To Reject")
                .email("reject@adm.com")
                .passwordHash(passwordEncoder.encode("Pass@123"))
                .role(Role.SME).approved(false)
                .techStacks(new ArrayList<>())
                .build());

        mockMvc.perform(delete("/api/v1/admin/users/" + toReject.getId() + "/reject")
                        .header("Authorization", adminToken))
                .andExpect(status().isNoContent());
    }

    // ─── ADD USER ─────────────────────────────────────────────────────────────

    @Test
    @Order(12)
    void addUser_returns201() throws Exception {
        Map<String, Object> req = Map.of(
                "enterpriseId", "new.user",
                "fullName", "New User",
                "email", "new@adm.com",
                "role", "SME"
        );
        mockMvc.perform(post("/api/v1/admin/users")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());
    }

    // ─── DELETE MCQ ───────────────────────────────────────────────────────────

    @Test
    @Order(13)
    void deleteMcq_admin_returns204() throws Exception {
        Mcq extra = mcqRepository.save(Mcq.builder()
                .questionStem("Extra question?")
                .optionA("A").optionB("B").optionC("C").optionD("D")
                .correctAnswer("A").difficulty(Difficulty.EASY)
                .techStack(javaStack).creator(smeUser)
                .status(McqStatus.APPROVED)
                .build());
        mockMvc.perform(delete("/api/v1/admin/mcqs/" + extra.getId())
                        .header("Authorization", adminToken))
                .andExpect(status().isNoContent());
    }

    // ─── AUDIT LOG ────────────────────────────────────────────────────────────

    @Test
    @Order(14)
    void getAuditLog_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/admin/audit-log")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    // ─── SEARCH MCQS ─────────────────────────────────────────────────────────

    @Test
    @Order(15)
    void getAllMcqs_withSearch_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/admin/mcqs?search=encapsulation")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk());
    }
}
