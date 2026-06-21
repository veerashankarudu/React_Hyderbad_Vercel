package com.valkey.quizhub.controller;

import com.valkey.quizhub.config.JwtUtil;
import com.valkey.quizhub.dto.request.LoginRequest;
import com.valkey.quizhub.dto.request.RegisterRequest;
import com.valkey.quizhub.entity.TechStack;
import com.valkey.quizhub.entity.User;
import com.valkey.quizhub.enums.Role;
import com.valkey.quizhub.repository.*;
import com.valkey.quizhub.service.AIService;
import com.valkey.quizhub.service.EmailService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private TechStackRepository techStackRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private InboxMessageRepository inboxMessageRepository;
    @Autowired private McqRepository mcqRepository;
    @Autowired private McqVersionRepository mcqVersionRepository;
    @Autowired private ReviewCommentRepository reviewCommentRepository;
    @Autowired private TopicRepository topicRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtUtil jwtUtil;
    @MockBean EmailService emailService;
    @MockBean AIService aiService;

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

        TechStack java = techStackRepository.save(TechStack.builder().name("Java").build());

        userRepository.save(User.builder()
                .enterpriseId("test.admin")
                .fullName("Test Admin")
                .email("admin@test.com")
                .passwordHash(passwordEncoder.encode("Admin@123"))
                .role(Role.ADMIN)
                .approved(true)
                .build());

        userRepository.save(User.builder()
                .enterpriseId("test.sme")
                .fullName("Test SME")
                .email("sme@test.com")
                .passwordHash(passwordEncoder.encode("Sme@1234"))
                .role(Role.SME)
                .approved(true)
                .build());

        userRepository.save(User.builder()
                .enterpriseId("pending.user")
                .fullName("Pending User")
                .email("pending@test.com")
                .passwordHash(passwordEncoder.encode("Pass1234"))
                .role(Role.SME)
                .approved(false)
                .build());
    }

    private LoginRequest loginReq(String id, String pass) {
        LoginRequest r = new LoginRequest();
        r.setEnterpriseId(id);
        r.setPassword(pass);
        return r;
    }

    // ─── LOGIN ────────────────────────────────────────────────────────────────

    @Test
    void login_validAdminCredentials_returns200WithToken() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginReq("test.admin", "Admin@123"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", not(emptyOrNullString())))
                .andExpect(jsonPath("$.role", is("ADMIN")));
    }

    @Test
    void login_validSmeCredentials_returns200() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginReq("test.sme", "Sme@1234"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role", is("SME")));
    }

    @Test
    void login_wrongPassword_returns401() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginReq("test.admin", "wrongpass"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void login_unknownUser_returns401() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginReq("nobody", "anything"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void login_unapprovedUser_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginReq("pending.user", "Pass1234"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void login_emptyBody_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void login_returnsEnterpriseId() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginReq("test.sme", "Sme@1234"))))
                .andExpect(jsonPath("$.enterpriseId", is("test.sme")));
    }

    @Test
    void login_returnsFullName() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginReq("test.sme", "Sme@1234"))))
                .andExpect(jsonPath("$.fullName", is("Test SME")));
    }

    // ─── REGISTER ────────────────────────────────────────────────────────────

    @Test
    void register_newUser_returns201WithPendingRole() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setEnterpriseId("new.user");
        req.setFullName("New User");
        req.setEmail("new@test.com");
        req.setPassword("NewPass1");

        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role", is("PENDING")));
    }

    @Test
    void register_duplicateEnterpriseId_returns400() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setEnterpriseId("test.sme");
        req.setFullName("Dup");
        req.setEmail("dup@test.com");
        req.setPassword("NewPass1");

        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void register_newUser_doesNotReturnToken() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setEnterpriseId("another.user");
        req.setFullName("Another");
        req.setEmail("another@test.com");
        req.setPassword("Pass1234");

        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(jsonPath("$.token").doesNotExist());
    }

    // ─── GET ME ───────────────────────────────────────────────────────────────

    @Test
    void getMe_withValidToken_returns200() throws Exception {
        String token = jwtUtil.generateToken("test.admin", "ADMIN");

        mockMvc.perform(get("/api/v1/auth/me")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enterpriseId", is("test.admin")));
    }

    @Test
    void getMe_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void getMe_withInvalidToken_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me")
                .header("Authorization", "Bearer invalid.token.here"))
                .andExpect(status().is4xxClientError());
    }

    // ─── FORGOT PASSWORD ─────────────────────────────────────────────────────

    @Test
    void forgotPassword_knownUser_returns200() throws Exception {
        mockMvc.perform(post("/api/v1/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"enterpriseIdOrEmail\":\"test.sme\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void forgotPassword_unknownUser_stillReturns200_noUserEnumeration() throws Exception {
        mockMvc.perform(post("/api/v1/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"enterpriseIdOrEmail\":\"nobody\"}"))
                .andExpect(status().isOk());
    }

    // ─── CHANGE PASSWORD ──────────────────────────────────────────────────────

    @Test
    void changePassword_withValidToken_returns200() throws Exception {
        String token = jwtUtil.generateToken("test.sme", "SME");

        mockMvc.perform(post("/api/v1/auth/change-password")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"Sme@1234\",\"newPassword\":\"NewPass@5678\"}"))
                .andExpect(status().is2xxSuccessful());
    }

    @Test
    void changePassword_wrongCurrentPassword_returns400() throws Exception {
        String token = jwtUtil.generateToken("test.admin", "ADMIN");

        mockMvc.perform(post("/api/v1/auth/change-password")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"WrongPass\",\"newPassword\":\"NewPass@5678\"}"))
                .andExpect(status().is4xxClientError());
    }

    // ─── DEMO USERS ───────────────────────────────────────────────────────────

    @Test
    void getDemoUsers_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/auth/demo-users"))
                .andExpect(status().isOk());
    }

    // ─── RESET PASSWORD ───────────────────────────────────────────────────────

    @Test
    void resetPassword_invalidToken_returns4xx() throws Exception {
        mockMvc.perform(post("/api/v1/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"invalid-token\",\"newPassword\":\"NewPass@123\"}"))
                .andExpect(status().is4xxClientError());
    }
}
