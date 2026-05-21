package com.accenture.quizhub.controller;

import com.accenture.quizhub.config.JwtUtil;
import com.accenture.quizhub.entity.*;
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
import org.springframework.cache.CacheManager;
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
class MasterControllerIntegrationTest {

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
    @Autowired CacheManager cacheManager;
    @MockBean EmailService emailService;
    @MockBean AIService aiService;

    private String adminToken;
    private String smeToken;
    private User adminUser;
    private User smeUser;
    private TechStack javaStack;
    private Topic coreTopic;

    @BeforeEach
    void setUp() {
        // Clear caches to prevent stale data between tests
        cacheManager.getCacheNames().forEach(n -> Objects.requireNonNull(cacheManager.getCache(n)).clear());

        reviewCommentRepository.deleteAll();
        mcqVersionRepository.deleteAll();
        mcqRepository.deleteAll();
        topicRepository.deleteAll();
        notificationRepository.deleteAll();
        inboxMessageRepository.deleteAll();
        userRepository.deleteAll();
        techStackRepository.deleteAll();

        javaStack = techStackRepository.save(TechStack.builder().name("Java").build());
        coreTopic = topicRepository.save(new Topic(null, "Core Concepts", javaStack));

        adminUser = userRepository.save(User.builder()
                .enterpriseId("mst.admin")
                .fullName("Master Admin")
                .email("admin@mst.com")
                .passwordHash(passwordEncoder.encode("Admin@123"))
                .role(Role.ADMIN).approved(true)
                .techStacks(new ArrayList<>())
                .build());

        smeUser = userRepository.save(User.builder()
                .enterpriseId("mst.sme")
                .fullName("Master SME")
                .email("sme@mst.com")
                .passwordHash(passwordEncoder.encode("Pass@123"))
                .role(Role.SME).approved(true)
                .techStacks(new ArrayList<>())
                .build());

        adminToken = "Bearer " + jwtUtil.generateToken("mst.admin", "ADMIN");
        smeToken   = "Bearer " + jwtUtil.generateToken("mst.sme", "SME");
    }

    // ─── PUBLIC READS ─────────────────────────────────────────────────────────

    @Test
    @Order(1)
    void getTechStacks_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/master/tech-stacks")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @Order(2)
    void getAllTopics_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/master/topics")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @Order(3)
    void getTopicsByTechStack_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/master/tech-stacks/" + javaStack.getId() + "/topics")
                        .header("Authorization", smeToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    // ─── ADMIN: TECH STACK CRUD ───────────────────────────────────────────────

    @Test
    @Order(4)
    void createTechStack_admin_returns201() throws Exception {
        Map<String, String> body = Map.of("name", "Python");
        mockMvc.perform(post("/api/v1/master/tech-stacks")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Python"));
    }

    @Test
    @Order(5)
    void createTechStack_nonAdmin_returns4xx() throws Exception {
        Map<String, String> body = Map.of("name", "Go");
        mockMvc.perform(post("/api/v1/master/tech-stacks")
                        .header("Authorization", smeToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @Order(6)
    void updateTechStack_admin_returns200() throws Exception {
        Map<String, String> body = Map.of("name", "Java Updated");
        mockMvc.perform(put("/api/v1/master/tech-stacks/" + javaStack.getId())
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());
    }

    @Test
    @Order(7)
    void deleteTechStack_admin_returns204() throws Exception {
        TechStack toDelete = techStackRepository.save(TechStack.builder().name("ToDelete").build());
        mockMvc.perform(delete("/api/v1/master/tech-stacks/" + toDelete.getId())
                        .header("Authorization", adminToken))
                .andExpect(status().isNoContent());
    }

    // ─── ADMIN: TOPIC CRUD ────────────────────────────────────────────────────

    @Test
    @Order(8)
    void createTopic_admin_returns201() throws Exception {
        Map<String, String> body = Map.of("name", "OOP");
        mockMvc.perform(post("/api/v1/master/tech-stacks/" + javaStack.getId() + "/topics")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("OOP"));
    }

    @Test
    @Order(9)
    void updateTopic_admin_returns200() throws Exception {
        Map<String, String> body = Map.of("name", "Core Concepts Updated");
        mockMvc.perform(put("/api/v1/master/topics/" + coreTopic.getId())
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());
    }

    @Test
    @Order(10)
    void deleteTopic_admin_returns204() throws Exception {
        Topic toDelete = topicRepository.save(new Topic(null, "ToDelete", javaStack));
        mockMvc.perform(delete("/api/v1/master/topics/" + toDelete.getId())
                        .header("Authorization", adminToken))
                .andExpect(status().isNoContent());
    }

    // ─── SME MAPPING ─────────────────────────────────────────────────────────

    @Test
    @Order(11)
    void getAllSmes_admin_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/master/smes")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @Order(12)
    void getSmesForStack_admin_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/master/tech-stacks/" + javaStack.getId() + "/smes")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @Order(13)
    void addSmeToStack_admin_returns200() throws Exception {
        mockMvc.perform(post("/api/v1/master/tech-stacks/" + javaStack.getId() + "/smes/" + smeUser.getId())
                        .header("Authorization", adminToken))
                .andExpect(status().isOk());
    }

    @Test
    @Order(14)
    void removeSmeFromStack_admin_returns204() throws Exception {
        mockMvc.perform(delete("/api/v1/master/tech-stacks/" + javaStack.getId() + "/smes/" + smeUser.getId())
                        .header("Authorization", adminToken))
                .andExpect(status().isNoContent());
    }
}
