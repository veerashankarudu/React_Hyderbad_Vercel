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
class QuizControllerIntegrationTest {

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
    private Mcq approvedMcq;

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
                .enterpriseId("quiz.sme")
                .fullName("Quiz SME")
                .email("sme@quiz.com")
                .passwordHash(passwordEncoder.encode("Pass@123"))
                .role(Role.SME).approved(true)
                .techStacks(new ArrayList<>())
                .build());

        smeToken = "Bearer " + jwtUtil.generateToken("quiz.sme", "SME");

        approvedMcq = mcqRepository.save(Mcq.builder()
                .questionStem("What is a JVM?")
                .optionA("Java Virtual Machine").optionB("Java Value Manager")
                .optionC("Just VM").optionD("Java VM")
                .correctAnswer("A").difficulty(Difficulty.EASY)
                .techStack(javaStack).creator(sme).status(McqStatus.APPROVED)
                .build());

        // Second approved MCQ for variety
        mcqRepository.save(Mcq.builder()
                .questionStem("What is a JDK?")
                .optionA("Java Development Kit").optionB("Java Dev Kit")
                .optionC("Just Dev Kit").optionD("Java DK")
                .correctAnswer("A").difficulty(Difficulty.MEDIUM)
                .techStack(javaStack).creator(sme).status(McqStatus.APPROVED)
                .build());
    }

    // ─── GET QUIZ QUESTIONS ───────────────────────────────────────────────────

    @Test
    @Order(1)
    void getQuizQuestions_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/quiz/questions")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @Order(2)
    void getQuizQuestions_withTechStackFilter_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/quiz/questions?techStackId=" + javaStack.getId())
                        .header("Authorization", smeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @Order(3)
    void getQuizQuestions_withCountLimit_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/quiz/questions?count=1")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk());
    }

    @Test
    @Order(4)
    void getQuizQuestions_doesNotExposeCorrectAnswer() throws Exception {
        String response = mockMvc.perform(get("/api/v1/quiz/questions")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        // Correct answer should not be in the response
        org.junit.jupiter.api.Assertions.assertFalse(response.contains("\"correctAnswer\""));
    }

    // ─── SUBMIT QUIZ ─────────────────────────────────────────────────────────

    @Test
    @Order(5)
    void submitQuiz_correctAnswer_returns200WithScore() throws Exception {
        Map<String, Object> body = Map.of(
                "answers", Map.of(String.valueOf(approvedMcq.getId()), "A")
        );
        mockMvc.perform(post("/api/v1/quiz/submit")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(1))
                .andExpect(jsonPath("$.total").value(1));
    }

    @Test
    @Order(6)
    void submitQuiz_wrongAnswer_returnsScore0() throws Exception {
        Map<String, Object> body = Map.of(
                "answers", Map.of(String.valueOf(approvedMcq.getId()), "B")
        );
        mockMvc.perform(post("/api/v1/quiz/submit")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(0));
    }

    @Test
    @Order(7)
    void submitQuiz_emptyAnswers_returns400() throws Exception {
        Map<String, Object> body = Map.of("answers", Map.of());
        mockMvc.perform(post("/api/v1/quiz/submit")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @Order(8)
    void submitQuiz_revealCorrectAnswerInResponse() throws Exception {
        Map<String, Object> body = Map.of(
                "answers", Map.of(String.valueOf(approvedMcq.getId()), "B")
        );
        String response = mockMvc.perform(post("/api/v1/quiz/submit")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        // Submit response SHOULD contain correctAnswer
        org.junit.jupiter.api.Assertions.assertTrue(response.contains("correctAnswer"));
    }
}
