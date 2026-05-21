package com.accenture.quizhub.controller;

import com.accenture.quizhub.config.JwtUtil;
import com.accenture.quizhub.entity.*;
import com.accenture.quizhub.enums.Role;
import com.accenture.quizhub.repository.*;
import com.accenture.quizhub.service.AIService;
import com.accenture.quizhub.service.EmailService;
import org.junit.jupiter.api.*;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class UploadControllerIntegrationTest {

    @Autowired MockMvc mockMvc;
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

        TechStack javaStack = techStackRepository.save(TechStack.builder().name("Java").build());
        topicRepository.save(Topic.builder().name("OOP").techStack(javaStack).build());

        userRepository.save(User.builder()
                .enterpriseId("upl.sme")
                .fullName("Upload SME")
                .email("sme@upl.com")
                .passwordHash(passwordEncoder.encode("Pass@123"))
                .role(Role.SME).approved(true)
                .techStacks(Collections.singletonList(javaStack))
                .build());

        smeToken = "Bearer " + jwtUtil.generateToken("upl.sme", "SME");
    }

    @Test
    @Order(1)
    void downloadTemplate_returns200WithExcelFile() throws Exception {
        mockMvc.perform(get("/api/v1/upload/template")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition",
                        org.hamcrest.Matchers.containsString("Template_MCQs.xlsx")));
    }

    @Test
    @Order(2)
    void bulkUpload_withValidCsvContent_returns200() throws Exception {
        // Create a simple CSV-like content to test bulk upload
        String csvContent = "Question_id,Technology_Stack,Topic,Difficulty,Question_Stem,Option_A,Option_B,Option_C,Option_D,Correct_Answer\n" +
                "1001,Java,OOP,MEDIUM,What is Java?,A language,A tool,An OS,A DB,A\n";

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test.csv",
                MediaType.TEXT_PLAIN_VALUE,
                csvContent.getBytes()
        );

        mockMvc.perform(multipart("/api/v1/upload/bulk")
                        .file(file)
                        .header("Authorization", smeToken))
                .andExpect(status().isOk());
    }

    @Test
    @Order(3)
    void bulkUpload_unauthenticated_returns4xx() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.csv", MediaType.TEXT_PLAIN_VALUE, "data".getBytes());

        mockMvc.perform(multipart("/api/v1/upload/bulk").file(file))
                .andExpect(status().is4xxClientError());
    }
}
