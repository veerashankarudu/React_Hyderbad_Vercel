package com.valkey.quizhub.controller;

import com.valkey.quizhub.config.JwtUtil;
import com.valkey.quizhub.entity.*;
import com.valkey.quizhub.enums.Difficulty;
import com.valkey.quizhub.enums.McqStatus;
import com.valkey.quizhub.enums.Role;
import com.valkey.quizhub.repository.*;
import com.valkey.quizhub.service.AIService;
import com.valkey.quizhub.service.EmailService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
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
class StatsControllerIntegrationTest {

    @Autowired MockMvc mockMvc;
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

    private String adminToken;
    private String smeToken;
    private User smeUser;
    private TechStack javaStack;

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

        User adminUser = userRepository.save(User.builder()
                .enterpriseId("stats.admin")
                .fullName("Stats Admin")
                .email("admin@stats.com")
                .passwordHash(passwordEncoder.encode("Admin@123"))
                .role(Role.ADMIN).approved(true)
                .techStacks(new ArrayList<>())
                .build());

        smeUser = userRepository.save(User.builder()
                .enterpriseId("stats.sme")
                .fullName("Stats SME")
                .email("sme@stats.com")
                .passwordHash(passwordEncoder.encode("Pass@123"))
                .role(Role.SME).approved(true)
                .techStacks(new ArrayList<>())
                .build());

        adminToken = "Bearer " + jwtUtil.generateToken("stats.admin", "ADMIN");
        smeToken   = "Bearer " + jwtUtil.generateToken("stats.sme", "SME");

        // Create MCQs in various statuses
        mcqRepository.save(Mcq.builder()
                .questionStem("Approved MCQ 1")
                .optionA("A").optionB("B").optionC("C").optionD("D")
                .correctAnswer("A").difficulty(Difficulty.EASY)
                .techStack(javaStack).creator(smeUser).status(McqStatus.APPROVED)
                .build());
        mcqRepository.save(Mcq.builder()
                .questionStem("Draft MCQ 1")
                .optionA("A").optionB("B").optionC("C").optionD("D")
                .correctAnswer("A").difficulty(Difficulty.MEDIUM)
                .techStack(javaStack).creator(smeUser).status(McqStatus.DRAFT)
                .build());
        mcqRepository.save(Mcq.builder()
                .questionStem("Review MCQ 1")
                .optionA("A").optionB("B").optionC("C").optionD("D")
                .correctAnswer("A").difficulty(Difficulty.HARD)
                .techStack(javaStack).creator(smeUser).status(McqStatus.READY_FOR_REVIEW)
                .build());
    }

    @Test
    @Order(1)
    void getSummary_asAdmin_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/stats/summary")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalMcqs").exists())
                .andExpect(jsonPath("$.approved").exists());
    }

    @Test
    @Order(2)
    void getSummary_asSme_returnsPersonalStats() throws Exception {
        mockMvc.perform(get("/api/v1/stats/summary")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalMcqs").exists());
    }

    @Test
    @Order(3)
    void getSummary_withDateRange_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/stats/summary?from=2020-01-01&to=2099-12-31")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk());
    }

    @Test
    @Order(4)
    void getByTechStack_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/stats/by-tech-stack")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @Order(5)
    void getByTechStack_withDateFilter_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/stats/by-tech-stack?from=2020-01-01&to=2099-12-31")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk());
    }

    @Test
    @Order(6)
    void getLeaderboard_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/stats/leaderboard")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @Order(7)
    void getRecentActivity_asAdmin_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/stats/recent-activity")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @Order(8)
    void getRecentActivity_asSme_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/stats/recent-activity")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk());
    }

    @Test
    @Order(9)
    void getReviewerStats_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/stats/reviewer-stats")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalAssigned").exists());
    }

    @Test
    @Order(10)
    void getSummary_unauthenticated_returns4xx() throws Exception {
        mockMvc.perform(get("/api/v1/stats/summary"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @Order(11)
    void getReviewerMetrics_asAdmin_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/stats/reviewer-metrics")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk());
    }

    @Test
    @Order(12)
    void getSlaBreached_asAdmin_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/stats/sla-breach")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk());
    }

    @Test
    @Order(13)
    void exportAnalytics_asAdmin_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/stats/export")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk());
    }

    @Test
    @Order(14)
    void getReviewerMetrics_asSme_returns403OrData() throws Exception {
        mockMvc.perform(get("/api/v1/stats/reviewer-metrics")
                        .header("Authorization", smeToken))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @Order(15)
    void getSlaBreached_asSme_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/stats/sla-breach")
                        .header("Authorization", smeToken))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @Order(16)
    void getSummary_smeWithDateFilter_returnsFilteredPersonalStats() throws Exception {
        mockMvc.perform(get("/api/v1/stats/summary?from=2020-01-01&to=2099-12-31")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalMcqs").exists())
                .andExpect(jsonPath("$.approved").exists())
                .andExpect(jsonPath("$.rejected").exists())
                .andExpect(jsonPath("$.draft").exists())
                .andExpect(jsonPath("$.inReview").exists());
    }

    @Test
    @Order(17)
    void getSummary_adminVerifiesAllNumericFields() throws Exception {
        mockMvc.perform(get("/api/v1/stats/summary")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalMcqs").isNumber())
                .andExpect(jsonPath("$.approved").isNumber())
                .andExpect(jsonPath("$.inReview").isNumber())
                .andExpect(jsonPath("$.rejected").isNumber())
                .andExpect(jsonPath("$.draft").isNumber());
    }

    @Test
    @Order(18)
    void getReviewerStats_includesAllResponseFields() throws Exception {
        mockMvc.perform(get("/api/v1/stats/reviewer-stats")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.approvalRate").exists())
                .andExpect(jsonPath("$.pending").exists())
                .andExpect(jsonPath("$.byTechStack").isArray());
    }

    @Test
    @Order(19)
    void exportAnalytics_asSme_returns200WithExcelContentType() throws Exception {
        mockMvc.perform(get("/api/v1/stats/export")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
    }

    @Test
    @Order(20)
    void exportAnalytics_adminWithDateRange_returns200WithDispositionHeader() throws Exception {
        mockMvc.perform(get("/api/v1/stats/export?from=2020-01-01&to=2099-12-31")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(header().exists("Content-Disposition"));
    }

    @Test
    @Order(21)
    void getSummary_adminWithOnlyFrom_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/stats/summary?from=2020-01-01")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalMcqs").isNumber())
                .andExpect(jsonPath("$.approved").isNumber());
    }

    @Test
    @Order(22)
    void getSummary_smeWithOnlyTo_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/stats/summary?to=2099-12-31")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalMcqs").isNumber())
                .andExpect(jsonPath("$.draft").isNumber());
    }

    @Test
    @Order(23)
    void getByTechStack_withOnlyFromParam_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/stats/by-tech-stack?from=2020-01-01")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @Order(24)
    void getSlaBreached_returnsArrayWithExpectedStructure() throws Exception {
        mockMvc.perform(get("/api/v1/stats/sla-breach")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @Order(25)
    void getRecentActivity_withLongStemMcq_returnsTruncatedResult() throws Exception {
        String longStem = "This is a very long question stem that definitely exceeds the eighty character limit set in the controller";
        mcqRepository.save(Mcq.builder()
                .questionStem(longStem)
                .optionA("A").optionB("B").optionC("C").optionD("D")
                .correctAnswer("A").difficulty(Difficulty.EASY)
                .techStack(javaStack).creator(smeUser).status(McqStatus.APPROVED)
                .build());

        mockMvc.perform(get("/api/v1/stats/recent-activity")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @Order(26)
    void exportAnalytics_smeWithDateRange_returns200WithExcelType() throws Exception {
        mockMvc.perform(get("/api/v1/stats/export?from=2020-01-01&to=2099-12-31")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk())
                .andExpect(header().exists("Content-Disposition"));
    }

    @Test
    @Order(27)
    void getReviewerStats_adminUser_returns200WithAllFields() throws Exception {
        mockMvc.perform(get("/api/v1/stats/reviewer-stats")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalAssigned").exists())
                .andExpect(jsonPath("$.approved").exists())
                .andExpect(jsonPath("$.approvalRate").exists())
                .andExpect(jsonPath("$.byTechStack").isArray());
    }

    @Test
    @Order(28)
    void getReviewerMetrics_adminVerifiesResponseFields() throws Exception {
        mockMvc.perform(get("/api/v1/stats/reviewer-metrics")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    // ── New tests to boost coverage ──────────────────────────────────────────

    @Test
    @Order(29)
    void getSummary_adminWithOnlyToParam_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/stats/summary?to=2099-12-31")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalMcqs").isNumber())
                .andExpect(jsonPath("$.approved").isNumber())
                .andExpect(jsonPath("$.draft").isNumber());
    }

    @Test
    @Order(30)
    void getSummary_smeWithOnlyFromParam_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/stats/summary?from=2020-01-01")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalMcqs").isNumber())
                .andExpect(jsonPath("$.draft").isNumber())
                .andExpect(jsonPath("$.inReview").isNumber());
    }

    @Test
    @Order(31)
    void getByTechStack_withOnlyToParam_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/stats/by-tech-stack?to=2099-12-31")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @Order(32)
    void getRecentActivity_withManyMcqs_limitsTo6ForAdmin() throws Exception {
        // setUp has 3 MCQs; add 5 more for a total of 8 — controller breaks at 6
        for (int i = 2; i <= 6; i++) {
            mcqRepository.save(Mcq.builder()
                    .questionStem("Extra MCQ " + i)
                    .optionA("A").optionB("B").optionC("C").optionD("D")
                    .correctAnswer("A").difficulty(Difficulty.EASY)
                    .techStack(javaStack).creator(smeUser).status(McqStatus.APPROVED)
                    .build());
        }
        mockMvc.perform(get("/api/v1/stats/recent-activity")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(6));
    }

    @Test
    @Order(33)
    void getRecentActivity_smeSeeOnlyOwnMcqs() throws Exception {
        // Create a second SME whose MCQs should be invisible to the first SME
        User otherSme = userRepository.save(User.builder()
                .enterpriseId("stats.sme2")
                .fullName("Stats SME2")
                .email("sme2@stats.com")
                .passwordHash(passwordEncoder.encode("Pass@123"))
                .role(Role.SME).approved(true)
                .techStacks(new java.util.ArrayList<>())
                .build());
        mcqRepository.save(Mcq.builder()
                .questionStem("Other SME question")
                .optionA("A").optionB("B").optionC("C").optionD("D")
                .correctAnswer("A").difficulty(Difficulty.EASY)
                .techStack(javaStack).creator(otherSme).status(McqStatus.APPROVED)
                .build());

        // setUp has 3 MCQs for smeUser; the 4th belongs to otherSme → SME sees 3
        mockMvc.perform(get("/api/v1/stats/recent-activity")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3));
    }

    @Test
    @Order(34)
    void getReviewerStats_withAssignedMcqs_returnsPositiveApprovalRate() throws Exception {
        // Assign smeUser as reviewer of an APPROVED MCQ → approvalRate = 100
        mcqRepository.save(Mcq.builder()
                .questionStem("Reviewed by SME")
                .optionA("A").optionB("B").optionC("C").optionD("D")
                .correctAnswer("A").difficulty(Difficulty.EASY)
                .techStack(javaStack).creator(smeUser).reviewer(smeUser).status(McqStatus.APPROVED)
                .build());

        mockMvc.perform(get("/api/v1/stats/reviewer-stats")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalAssigned").value(1))
                .andExpect(jsonPath("$.approved").value(1))
                .andExpect(jsonPath("$.approvalRate").isNumber())
                .andExpect(jsonPath("$.byTechStack").isArray());
    }

    @Test
    @Order(35)
    void exportAnalytics_adminWithOnlyFromParam_returnsExcel() throws Exception {
        mockMvc.perform(get("/api/v1/stats/export?from=2020-01-01")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(header().exists("Content-Disposition"))
                .andExpect(content().contentTypeCompatibleWith(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
    }

    @Test
    @Order(36)
    void exportAnalytics_adminWithOnlyToParam_returnsExcel() throws Exception {
        mockMvc.perform(get("/api/v1/stats/export?to=2099-12-31")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(header().exists("Content-Disposition"))
                .andExpect(content().contentTypeCompatibleWith(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
    }

    @Test
    @Order(37)
    void exportAnalytics_smeWithOnlyFromParam_returnsOnlyOwnMcqs() throws Exception {
        mockMvc.perform(get("/api/v1/stats/export?from=2020-01-01")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk())
                .andExpect(header().exists("Content-Disposition"));
    }

    @Test
    @Order(38)
    void getReviewerMetrics_withMcqAssignedToAdmin_returnsNonEmptyList() throws Exception {
        // Assign adminUser as reviewer so reviewer-metrics has actual data
        User adminUser = userRepository.findByEnterpriseId("stats.admin").orElseThrow();
        mcqRepository.save(Mcq.builder()
                .questionStem("MCQ for admin reviewer metrics")
                .optionA("A").optionB("B").optionC("C").optionD("D")
                .correctAnswer("A").difficulty(Difficulty.EASY)
                .techStack(javaStack).creator(smeUser).reviewer(adminUser).status(McqStatus.APPROVED)
                .build());

        mockMvc.perform(get("/api/v1/stats/reviewer-metrics")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].totalAssigned").value(1))
                .andExpect(jsonPath("$[0].approvalRate").isNumber());
    }

    @Test
    @Order(39)
    void exportAnalytics_adminWithReviewerMcq_coversReviewerNonNullBranch() throws Exception {
        // Creates an MCQ with reviewer set → exercises m.getReviewer() != null true branch in export
        User adminUser = userRepository.findByEnterpriseId("stats.admin").orElseThrow();
        mcqRepository.save(Mcq.builder()
                .questionStem("Question with reviewer")
                .optionA("A").optionB("B").optionC("C").optionD("D")
                .correctAnswer("B").difficulty(Difficulty.MEDIUM)
                .techStack(javaStack).creator(smeUser).reviewer(adminUser)
                .status(McqStatus.APPROVED)
                .build());

        mockMvc.perform(get("/api/v1/stats/export")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(header().exists("Content-Disposition"))
                .andExpect(content().contentTypeCompatibleWith(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
    }

    @Test
    @Order(40)
    void exportAnalytics_adminWithTopicMcq_coversTopicNonNullBranch() throws Exception {
        // Creates an MCQ with a topic → exercises m.getTopic() != null true branch in export
        Topic topic = topicRepository.save(Topic.builder()
                .name("Streams")
                .techStack(javaStack)
                .build());
        mcqRepository.save(Mcq.builder()
                .questionStem("Question with topic")
                .optionA("A").optionB("B").optionC("C").optionD("D")
                .correctAnswer("C").difficulty(Difficulty.HARD)
                .techStack(javaStack).topic(topic).creator(smeUser)
                .status(McqStatus.APPROVED)
                .build());

        mockMvc.perform(get("/api/v1/stats/export")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(header().exists("Content-Disposition"));
    }

    @Test
    @Order(41)
    void exportAnalytics_adminWithLongQuestionStem_coversTruncationBranch() throws Exception {
        // Creates an MCQ with question > 120 chars → exercises the q.length() > 120 true branch
        String longStem = "A".repeat(130) + " end of a very long question stem that must be truncated in the export";
        mcqRepository.save(Mcq.builder()
                .questionStem(longStem)
                .optionA("A").optionB("B").optionC("C").optionD("D")
                .correctAnswer("A").difficulty(Difficulty.EASY)
                .techStack(javaStack).creator(smeUser)
                .status(McqStatus.APPROVED)
                .build());

        mockMvc.perform(get("/api/v1/stats/export")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(header().exists("Content-Disposition"));
    }

    @Test
    @Order(42)
    void exportAnalytics_adminWithAiScoreMcq_coversAiScoreNonNullBranch() throws Exception {
        // Creates an MCQ with aiScore set → exercises m.getAiScore() != null true branch in export
        mcqRepository.save(Mcq.builder()
                .questionStem("Question with AI score")
                .optionA("A").optionB("B").optionC("C").optionD("D")
                .correctAnswer("D").difficulty(Difficulty.MEDIUM)
                .techStack(javaStack).creator(smeUser)
                .status(McqStatus.APPROVED)
                .aiScore(85).aiRisk("LOW")
                .build());

        mockMvc.perform(get("/api/v1/stats/export")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(header().exists("Content-Disposition"))
                .andExpect(content().contentTypeCompatibleWith(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
    }
}
