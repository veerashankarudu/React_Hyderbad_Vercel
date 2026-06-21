package com.valkey.quizhub.controller;

import com.valkey.quizhub.config.JwtUtil;
import com.valkey.quizhub.entity.*;
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
class NotificationControllerIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired NotificationRepository notificationRepository;
    @Autowired InboxMessageRepository inboxMessageRepository;
    @Autowired McqRepository mcqRepository;
    @Autowired ReviewCommentRepository reviewCommentRepository;
    @Autowired McqVersionRepository mcqVersionRepository;
    @Autowired TechStackRepository techStackRepository;
    @Autowired TopicRepository topicRepository;
    @Autowired JwtUtil jwtUtil;
    @Autowired PasswordEncoder passwordEncoder;
    @MockBean EmailService emailService;
    @MockBean AIService aiService;

    private String smeToken;
    private User smeUser;
    private Notification notification;

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

        smeUser = userRepository.save(User.builder()
                .enterpriseId("notif.sme")
                .fullName("Notif SME")
                .email("sme@notif.com")
                .passwordHash(passwordEncoder.encode("Pass@123"))
                .role(Role.SME).approved(true)
                .techStacks(new ArrayList<>())
                .build());

        smeToken = "Bearer " + jwtUtil.generateToken("notif.sme", "SME");

        notification = notificationRepository.save(Notification.builder()
                .user(smeUser)
                .message("Your MCQ was approved")
                .type("APPROVED")
                .mcqId(1L)
                .actorName("Admin")
                .actorInitials("AD")
                .mcqRef("JAVA-1")
                .read(false)
                .build());
    }

    @Test
    @Order(1)
    void getNotifications_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/notifications")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @Order(2)
    void getNotifications_withTypeFilter_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/notifications?type=APPROVED")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk());
    }

    @Test
    @Order(3)
    void getUnreadCount_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/notifications/unread-count")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(1));
    }

    @Test
    @Order(4)
    void markAllRead_returns200() throws Exception {
        mockMvc.perform(post("/api/v1/notifications/mark-all-read")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk());
    }

    @Test
    @Order(5)
    void markRead_returns200() throws Exception {
        mockMvc.perform(post("/api/v1/notifications/" + notification.getId() + "/read")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk());
    }

    @Test
    @Order(6)
    void getNotifications_unauthenticated_returns4xx() throws Exception {
        mockMvc.perform(get("/api/v1/notifications"))
                .andExpect(status().is4xxClientError());
    }
}
