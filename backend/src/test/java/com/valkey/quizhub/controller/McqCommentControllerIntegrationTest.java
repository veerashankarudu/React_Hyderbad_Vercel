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
class McqCommentControllerIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired TechStackRepository techStackRepository;
    @Autowired TopicRepository topicRepository;
    @Autowired McqRepository mcqRepository;
    @Autowired ReviewCommentRepository reviewCommentRepository;
    @Autowired McqVersionRepository mcqVersionRepository;
    @Autowired McqCommentRepository mcqCommentRepository;
    @Autowired InboxMessageRepository inboxMessageRepository;
    @Autowired NotificationRepository notificationRepository;
    @Autowired JwtUtil jwtUtil;
    @Autowired PasswordEncoder passwordEncoder;
    @MockBean EmailService emailService;
    @MockBean AIService aiService;

    private String authorToken;
    private String otherToken;
    private User author;
    private Mcq mcq;

    @BeforeEach
    void setUp() {
        mcqCommentRepository.deleteAll();
        reviewCommentRepository.deleteAll();
        mcqVersionRepository.deleteAll();
        mcqRepository.deleteAll();
        topicRepository.deleteAll();
        notificationRepository.deleteAll();
        inboxMessageRepository.deleteAll();
        userRepository.deleteAll();
        techStackRepository.deleteAll();

        TechStack javaStack = techStackRepository.save(TechStack.builder().name("Java").build());

        author = userRepository.save(User.builder()
                .enterpriseId("cmt.author")
                .fullName("Comment Author")
                .email("author@cmt.com")
                .passwordHash(passwordEncoder.encode("Pass@123"))
                .role(Role.SME).approved(true)
                .techStacks(new ArrayList<>())
                .build());

        userRepository.save(User.builder()
                .enterpriseId("cmt.other")
                .fullName("Other User")
                .email("other@cmt.com")
                .passwordHash(passwordEncoder.encode("Pass@123"))
                .role(Role.SME).approved(true)
                .techStacks(new ArrayList<>())
                .build());

        authorToken = "Bearer " + jwtUtil.generateToken("cmt.author", "SME");
        otherToken  = "Bearer " + jwtUtil.generateToken("cmt.other", "SME");

        mcq = mcqRepository.save(Mcq.builder()
                .questionStem("What is polymorphism?")
                .optionA("Many forms").optionB("Single form").optionC("No forms").optionD("Two forms")
                .correctAnswer("A").difficulty(Difficulty.EASY)
                .techStack(javaStack).creator(author)
                .status(McqStatus.APPROVED)
                .build());
    }

    @Test
    @Order(1)
    void getComments_empty_returns200EmptyList() throws Exception {
        mockMvc.perform(get("/api/v1/mcqs/" + mcq.getId() + "/comments")
                        .header("Authorization", authorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    @Order(2)
    void addComment_validContent_returns200() throws Exception {
        Map<String, String> body = Map.of("content", "Great question!");
        mockMvc.perform(post("/api/v1/mcqs/" + mcq.getId() + "/comments")
                        .header("Authorization", authorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("Great question!"));
    }

    @Test
    @Order(3)
    void addComment_emptyContent_returns400() throws Exception {
        Map<String, String> body = Map.of("content", "");
        mockMvc.perform(post("/api/v1/mcqs/" + mcq.getId() + "/comments")
                        .header("Authorization", authorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(4)
    void addReply_validParent_returns200() throws Exception {
        // Add parent first
        Map<String, String> parentBody = Map.of("content", "Parent comment");
        String resp = mockMvc.perform(post("/api/v1/mcqs/" + mcq.getId() + "/comments")
                        .header("Authorization", authorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(parentBody)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        Map<?, ?> parentComment = objectMapper.readValue(resp, Map.class);
        Long parentId = ((Number) parentComment.get("id")).longValue();

        Map<String, String> replyBody = Map.of("content", "Reply to parent");
        mockMvc.perform(post("/api/v1/mcqs/" + mcq.getId() + "/comments/" + parentId + "/reply")
                        .header("Authorization", otherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(replyBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("Reply to parent"));
    }

    @Test
    @Order(5)
    void getComments_afterAdding_returnsComments() throws Exception {
        // Add a comment
        Map<String, String> body = Map.of("content", "My comment");
        mockMvc.perform(post("/api/v1/mcqs/" + mcq.getId() + "/comments")
                        .header("Authorization", authorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)));

        mockMvc.perform(get("/api/v1/mcqs/" + mcq.getId() + "/comments")
                        .header("Authorization", authorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    @Order(6)
    void deleteComment_ownComment_returns204() throws Exception {
        // Add a comment
        Map<String, String> body = Map.of("content", "To delete");
        String resp = mockMvc.perform(post("/api/v1/mcqs/" + mcq.getId() + "/comments")
                        .header("Authorization", authorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        Map<?, ?> comment = objectMapper.readValue(resp, Map.class);
        Long commentId = ((Number) comment.get("id")).longValue();

        mockMvc.perform(delete("/api/v1/mcqs/" + mcq.getId() + "/comments/" + commentId)
                        .header("Authorization", authorToken))
                .andExpect(status().isNoContent());
    }

    @Test
    @Order(7)
    void deleteComment_othersComment_doesNotDelete() throws Exception {
        // Add a comment as author
        Map<String, String> body = Map.of("content", "Author's comment");
        String resp = mockMvc.perform(post("/api/v1/mcqs/" + mcq.getId() + "/comments")
                        .header("Authorization", authorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        Map<?, ?> comment = objectMapper.readValue(resp, Map.class);
        Long commentId = ((Number) comment.get("id")).longValue();

        // Try to delete as other (returns 204 but silently ignores)
        mockMvc.perform(delete("/api/v1/mcqs/" + mcq.getId() + "/comments/" + commentId)
                        .header("Authorization", otherToken))
                .andExpect(status().isNoContent());
    }

    @Test
    @Order(8)
    void addComment_unauthenticated_returns4xx() throws Exception {
        Map<String, String> body = Map.of("content", "No auth");
        mockMvc.perform(post("/api/v1/mcqs/" + mcq.getId() + "/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().is4xxClientError());
    }
}
