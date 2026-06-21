package com.valkey.quizhub.controller;

import com.valkey.quizhub.config.JwtUtil;
import com.valkey.quizhub.entity.*;
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
class InboxControllerIntegrationTest {

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

    private String aliceToken;
    private String bobToken;
    private User alice;
    private User bob;

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

        alice = userRepository.save(User.builder()
                .enterpriseId("inbox.alice")
                .fullName("Alice")
                .email("alice@inbox.com")
                .passwordHash(passwordEncoder.encode("Pass@123"))
                .role(Role.SME).approved(true)
                .techStacks(new ArrayList<>())
                .build());

        bob = userRepository.save(User.builder()
                .enterpriseId("inbox.bob")
                .fullName("Bob")
                .email("bob@inbox.com")
                .passwordHash(passwordEncoder.encode("Pass@123"))
                .role(Role.SME).approved(true)
                .techStacks(new ArrayList<>())
                .build());

        aliceToken = "Bearer " + jwtUtil.generateToken("inbox.alice", "SME");
        bobToken   = "Bearer " + jwtUtil.generateToken("inbox.bob", "SME");
    }

    @Test
    @Order(1)
    void getInbox_empty_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/inbox")
                        .header("Authorization", aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @Order(2)
    void getSent_empty_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/inbox/sent")
                        .header("Authorization", aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @Order(3)
    void unreadCount_empty_returns0() throws Exception {
        mockMvc.perform(get("/api/v1/inbox/unread-count")
                        .header("Authorization", aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(0));
    }

    @Test
    @Order(4)
    void send_validMessage_returns200() throws Exception {
        Map<String, String> body = Map.of(
                "to", "inbox.bob",
                "subject", "Hello Bob",
                "body", "Just saying hi"
        );
        mockMvc.perform(post("/api/v1/inbox/send")
                        .header("Authorization", aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());
    }

    @Test
    @Order(5)
    void send_missingField_returns400() throws Exception {
        Map<String, String> body = Map.of("to", "inbox.bob");
        mockMvc.perform(post("/api/v1/inbox/send")
                        .header("Authorization", aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(6)
    void getInbox_afterSend_bobReceivesMessage() throws Exception {
        // Alice sends to Bob
        Map<String, String> body = Map.of("to", "inbox.bob", "subject", "Hi", "body", "Hello");
        mockMvc.perform(post("/api/v1/inbox/send")
                        .header("Authorization", aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)));

        mockMvc.perform(get("/api/v1/inbox")
                        .header("Authorization", bobToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    @Order(7)
    void markRead_ownMessage_returns200() throws Exception {
        // Alice sends to Bob
        Map<String, String> body = Map.of("to", "inbox.bob", "subject", "Hi", "body", "Hi there");
        mockMvc.perform(post("/api/v1/inbox/send")
                        .header("Authorization", aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)));

        // Bob gets inbox and marks the message read
        String inboxResp = mockMvc.perform(get("/api/v1/inbox")
                        .header("Authorization", bobToken))
                .andReturn().getResponse().getContentAsString();
        List<?> msgs = objectMapper.readValue(inboxResp, List.class);
        Long msgId = ((Number) ((Map<?, ?>) msgs.get(0)).get("id")).longValue();

        mockMvc.perform(post("/api/v1/inbox/" + msgId + "/read")
                        .header("Authorization", bobToken))
                .andExpect(status().isOk());
    }

    @Test
    @Order(8)
    void markAllRead_returns200() throws Exception {
        mockMvc.perform(post("/api/v1/inbox/mark-all-read")
                        .header("Authorization", bobToken))
                .andExpect(status().isOk());
    }

    @Test
    @Order(9)
    void getStarred_empty_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/inbox/starred")
                        .header("Authorization", aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @Order(10)
    void toggleStar_ownMessage_returns200() throws Exception {
        // Alice sends to Bob, Bob stars it
        Map<String, String> body = Map.of("to", "inbox.bob", "subject", "Star me", "body", "Please star me");
        mockMvc.perform(post("/api/v1/inbox/send")
                        .header("Authorization", aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)));

        String inboxResp = mockMvc.perform(get("/api/v1/inbox")
                        .header("Authorization", bobToken))
                .andReturn().getResponse().getContentAsString();
        List<?> msgs = objectMapper.readValue(inboxResp, List.class);
        Long msgId = ((Number) ((Map<?, ?>) msgs.get(0)).get("id")).longValue();

        mockMvc.perform(post("/api/v1/inbox/" + msgId + "/star")
                        .header("Authorization", bobToken))
                .andExpect(status().isOk());
    }

    @Test
    @Order(11)
    void delete_ownMessage_returns200() throws Exception {
        // Alice sends to Bob, Bob deletes it
        Map<String, String> body = Map.of("to", "inbox.bob", "subject", "Delete me", "body", "Please delete me");
        mockMvc.perform(post("/api/v1/inbox/send")
                        .header("Authorization", aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)));

        String inboxResp = mockMvc.perform(get("/api/v1/inbox")
                        .header("Authorization", bobToken))
                .andReturn().getResponse().getContentAsString();
        List<?> msgs = objectMapper.readValue(inboxResp, List.class);
        Long msgId = ((Number) ((Map<?, ?>) msgs.get(0)).get("id")).longValue();

        mockMvc.perform(delete("/api/v1/inbox/" + msgId)
                        .header("Authorization", bobToken))
                .andExpect(status().isOk());
    }

    @Test
    @Order(12)
    void inbox_unauthenticated_returns4xx() throws Exception {
        mockMvc.perform(get("/api/v1/inbox"))
                .andExpect(status().is4xxClientError());
    }
}
