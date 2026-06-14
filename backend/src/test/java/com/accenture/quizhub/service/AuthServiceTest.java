package com.accenture.quizhub.service;

import com.accenture.quizhub.config.JwtUtil;
import com.accenture.quizhub.config.QuizHubMetrics;
import com.accenture.quizhub.dto.request.ChangePasswordRequest;
import com.accenture.quizhub.dto.request.LoginRequest;
import com.accenture.quizhub.dto.request.RegisterRequest;
import com.accenture.quizhub.dto.response.AuthResponse;
import com.accenture.quizhub.entity.PasswordResetToken;
import com.accenture.quizhub.entity.User;
import com.accenture.quizhub.enums.Role;
import com.accenture.quizhub.exception.BadRequestException;
import com.accenture.quizhub.repository.*;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private TechStackRepository techStackRepository;
    @Mock private AuditLogRepository auditLogRepository;
    @Mock private PasswordResetTokenRepository resetTokenRepository;
    @Mock private EmailService emailService;
    @Mock private JwtUtil jwtUtil;
    @InjectMocks private AuthService authService;

    private final PasswordEncoder realEncoder = new BCryptPasswordEncoder();
    private User approvedUser;

    @BeforeEach
    void setUp() {
        // Inject real BCrypt encoder via reflection so password checks actually work
        org.springframework.test.util.ReflectionTestUtils.setField(authService, "passwordEncoder", realEncoder);
        org.springframework.test.util.ReflectionTestUtils.setField(authService, "appUrl", "http://localhost:3000");
        org.springframework.test.util.ReflectionTestUtils.setField(authService, "metrics", new QuizHubMetrics(new SimpleMeterRegistry()));

        approvedUser = User.builder()
                .id(1L)
                .enterpriseId("john.doe")
                .fullName("John Doe")
                .email("john@example.com")
                .passwordHash(realEncoder.encode("Password1"))
                .role(Role.SME)
                .approved(true)
                .build();
    }

    // ─── LOGIN ───────────────────────────────────────────────────────────────

    private LoginRequest loginReq(String id, String pass) {
        LoginRequest r = new LoginRequest();
        r.setEnterpriseId(id);
        r.setPassword(pass);
        return r;
    }

    @Test
    void login_validCredentials_returnsAuthResponse() {
        when(userRepository.findByEnterpriseId("john.doe")).thenReturn(Optional.of(approvedUser));
        when(jwtUtil.generateToken("john.doe", "SME")).thenReturn("mock-token");

        AuthResponse resp = authService.login(loginReq("john.doe", "Password1"));

        assertEquals("mock-token", resp.getToken());
        assertEquals("john.doe", resp.getEnterpriseId());
        assertEquals("SME", resp.getRole());
    }

    @Test
    void login_wrongPassword_throwsBadCredentials() {
        when(userRepository.findByEnterpriseId("john.doe")).thenReturn(Optional.of(approvedUser));
        assertThrows(BadCredentialsException.class,
                () -> authService.login(loginReq("john.doe", "WrongPass")));
    }

    @Test
    void login_unknownUser_throwsBadCredentials() {
        when(userRepository.findByEnterpriseId("unknown")).thenReturn(Optional.empty());
        assertThrows(BadCredentialsException.class,
                () -> authService.login(loginReq("unknown", "any")));
    }

    @Test
    void login_unapprovedUser_throwsBadRequest() {
        approvedUser.setApproved(false);
        when(userRepository.findByEnterpriseId("john.doe")).thenReturn(Optional.of(approvedUser));
        assertThrows(BadRequestException.class,
                () -> authService.login(loginReq("john.doe", "Password1")));
    }

    @Test
    void login_returnsCorrectFullName() {
        when(userRepository.findByEnterpriseId("john.doe")).thenReturn(Optional.of(approvedUser));
        when(jwtUtil.generateToken(any(), any())).thenReturn("tok");
        AuthResponse resp = authService.login(loginReq("john.doe", "Password1"));
        assertEquals("John Doe", resp.getFullName());
    }

    @Test
    void login_returnsCorrectEmail() {
        when(userRepository.findByEnterpriseId("john.doe")).thenReturn(Optional.of(approvedUser));
        when(jwtUtil.generateToken(any(), any())).thenReturn("tok");
        AuthResponse resp = authService.login(loginReq("john.doe", "Password1"));
        assertEquals("john@example.com", resp.getEmail());
    }

    // ─── REGISTER ────────────────────────────────────────────────────────────

    @Test
    void register_newUser_returnsPendingRole() {
        when(userRepository.existsByEnterpriseId("new.user")).thenReturn(false);
        RegisterRequest req = new RegisterRequest();
        req.setEnterpriseId("new.user");
        req.setFullName("New User");
        req.setEmail("new@example.com");
        req.setPassword("Password1");

        AuthResponse resp = authService.register(req);

        assertEquals("PENDING", resp.getRole());
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void register_duplicateEnterpriseId_throwsBadRequest() {
        when(userRepository.existsByEnterpriseId("john.doe")).thenReturn(true);
        RegisterRequest req = new RegisterRequest();
        req.setEnterpriseId("john.doe");
        req.setPassword("Password1");
        assertThrows(BadRequestException.class, () -> authService.register(req));
    }

    @Test
    void register_doesNotReturnToken() {
        when(userRepository.existsByEnterpriseId("new.user")).thenReturn(false);
        RegisterRequest req = new RegisterRequest();
        req.setEnterpriseId("new.user");
        req.setFullName("New User");
        req.setEmail("new@example.com");
        req.setPassword("Password1");

        AuthResponse resp = authService.register(req);
        assertNull(resp.getToken());
    }

    @Test
    void register_savesAuditLog() {
        when(userRepository.existsByEnterpriseId("new.user")).thenReturn(false);
        RegisterRequest req = new RegisterRequest();
        req.setEnterpriseId("new.user");
        req.setFullName("New User");
        req.setEmail("new@example.com");
        req.setPassword("Password1");
        authService.register(req);
        verify(auditLogRepository, times(1)).save(any());
    }

    // ─── GET ME ───────────────────────────────────────────────────────────────

    @Test
    void getMe_returnsCorrectData() {
        AuthResponse resp = authService.getMe(approvedUser);
        assertEquals("john.doe", resp.getEnterpriseId());
        assertEquals("John Doe", resp.getFullName());
        assertEquals("SME", resp.getRole());
        assertNull(resp.getToken());
    }

    // ─── CHANGE PASSWORD ──────────────────────────────────────────────────────

    @Test
    void changePassword_correctCurrent_updatesPassword() {
        ChangePasswordRequest req = new ChangePasswordRequest();
        req.setCurrentPassword("Password1");
        req.setNewPassword("NewPass2");
        authService.changePassword(req, approvedUser);
        verify(userRepository).save(approvedUser);
        assertTrue(realEncoder.matches("NewPass2", approvedUser.getPasswordHash()));
    }

    @Test
    void changePassword_wrongCurrent_throwsBadRequest() {
        ChangePasswordRequest req = new ChangePasswordRequest();
        req.setCurrentPassword("WrongPass");
        req.setNewPassword("NewPass2");
        assertThrows(BadRequestException.class, () -> authService.changePassword(req, approvedUser));
    }

    @Test
    void changePassword_sameAsCurrentPassword_throwsBadRequest() {
        ChangePasswordRequest req = new ChangePasswordRequest();
        req.setCurrentPassword("Password1");
        req.setNewPassword("Password1");
        assertThrows(BadRequestException.class, () -> authService.changePassword(req, approvedUser));
    }

    // ─── RESET PASSWORD ───────────────────────────────────────────────────────

    @Test
    void resetPassword_validToken_updatesPassword() {
        PasswordResetToken prt = PasswordResetToken.builder()
                .token("valid-token")
                .user(approvedUser)
                .expiresAt(LocalDateTime.now().plusHours(1))
                .used(false)
                .build();
        when(resetTokenRepository.findByToken("valid-token")).thenReturn(Optional.of(prt));

        authService.resetPassword("valid-token", "NewPass99");

        verify(userRepository).save(approvedUser);
        assertTrue(prt.isUsed());
    }

    @Test
    void resetPassword_invalidToken_throwsBadRequest() {
        when(resetTokenRepository.findByToken("bad-token")).thenReturn(Optional.empty());
        assertThrows(BadRequestException.class, () -> authService.resetPassword("bad-token", "NewPass99"));
    }

    @Test
    void resetPassword_alreadyUsedToken_throwsBadRequest() {
        PasswordResetToken prt = PasswordResetToken.builder()
                .token("used-token")
                .user(approvedUser)
                .expiresAt(LocalDateTime.now().plusHours(1))
                .used(true)
                .build();
        when(resetTokenRepository.findByToken("used-token")).thenReturn(Optional.of(prt));
        assertThrows(BadRequestException.class, () -> authService.resetPassword("used-token", "NewPass99"));
    }

    @Test
    void resetPassword_expiredToken_throwsBadRequest() {
        PasswordResetToken prt = PasswordResetToken.builder()
                .token("old-token")
                .user(approvedUser)
                .expiresAt(LocalDateTime.now().minusHours(1))
                .used(false)
                .build();
        when(resetTokenRepository.findByToken("old-token")).thenReturn(Optional.of(prt));
        assertThrows(BadRequestException.class, () -> authService.resetPassword("old-token", "NewPass99"));
    }

    @Test
    void resetPassword_shortPassword_throwsBadRequest() {
        PasswordResetToken prt = PasswordResetToken.builder()
                .token("tok")
                .user(approvedUser)
                .expiresAt(LocalDateTime.now().plusHours(1))
                .used(false)
                .build();
        when(resetTokenRepository.findByToken("tok")).thenReturn(Optional.of(prt));
        assertThrows(BadRequestException.class, () -> authService.resetPassword("tok", "abc"));
    }

    @Test
    void resetPassword_noNumberInPassword_throwsBadRequest() {
        PasswordResetToken prt = PasswordResetToken.builder()
                .token("tok2")
                .user(approvedUser)
                .expiresAt(LocalDateTime.now().plusHours(1))
                .used(false)
                .build();
        when(resetTokenRepository.findByToken("tok2")).thenReturn(Optional.of(prt));
        assertThrows(BadRequestException.class, () -> authService.resetPassword("tok2", "allletters"));
    }

    @Test
    void resetPassword_nullPassword_throwsBadRequest() {
        PasswordResetToken prt = PasswordResetToken.builder()
                .token("tok3")
                .user(approvedUser)
                .expiresAt(LocalDateTime.now().plusHours(1))
                .used(false)
                .build();
        when(resetTokenRepository.findByToken("tok3")).thenReturn(Optional.of(prt));
        assertThrows(BadRequestException.class, () -> authService.resetPassword("tok3", null));
    }

    // ─── FORGOT PASSWORD ──────────────────────────────────────────────────────

    @Test
    void forgotPassword_userFoundByEnterpriseId_sendsEmail() {
        when(userRepository.findByEnterpriseId("john.doe")).thenReturn(Optional.of(approvedUser));
        doNothing().when(resetTokenRepository).deleteByUserId(approvedUser.getId());
        doNothing().when(resetTokenRepository).flush();
        when(resetTokenRepository.save(any())).thenReturn(null);

        authService.forgotPassword("john.doe");

        verify(resetTokenRepository).deleteByUserId(approvedUser.getId());
        verify(resetTokenRepository).save(any(PasswordResetToken.class));
        verify(emailService).sendPasswordResetEmail(eq(approvedUser), anyString());
    }

    @Test
    void forgotPassword_userFoundByEmail_sendsEmail() {
        when(userRepository.findByEnterpriseId("john@example.com")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(approvedUser));
        doNothing().when(resetTokenRepository).deleteByUserId(approvedUser.getId());
        doNothing().when(resetTokenRepository).flush();
        when(resetTokenRepository.save(any())).thenReturn(null);

        authService.forgotPassword("john@example.com");

        verify(emailService).sendPasswordResetEmail(eq(approvedUser), anyString());
    }

    @Test
    void forgotPassword_userNotFound_silentlySucceeds() {
        when(userRepository.findByEnterpriseId("nobody")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("nobody")).thenReturn(Optional.empty());

        // Should not throw, should not call email service
        authService.forgotPassword("nobody");

        verify(emailService, never()).sendPasswordResetEmail(any(), any());
        verify(resetTokenRepository, never()).save(any());
    }

    @Test
    void forgotPassword_deletesOldTokens_beforeSavingNew() {
        when(userRepository.findByEnterpriseId("john.doe")).thenReturn(Optional.of(approvedUser));
        doNothing().when(resetTokenRepository).deleteByUserId(approvedUser.getId());
        doNothing().when(resetTokenRepository).flush();
        when(resetTokenRepository.save(any())).thenReturn(null);

        authService.forgotPassword("john.doe");

        InOrder order = inOrder(resetTokenRepository);
        order.verify(resetTokenRepository).deleteByUserId(approvedUser.getId());
        order.verify(resetTokenRepository).flush();
        order.verify(resetTokenRepository).save(any());
    }

    @Test
    void forgotPassword_savedToken_hasCorrectUser() {
        when(userRepository.findByEnterpriseId("john.doe")).thenReturn(Optional.of(approvedUser));
        doNothing().when(resetTokenRepository).deleteByUserId(approvedUser.getId());
        doNothing().when(resetTokenRepository).flush();

        ArgumentCaptor<PasswordResetToken> captor = ArgumentCaptor.forClass(PasswordResetToken.class);
        when(resetTokenRepository.save(captor.capture())).thenReturn(null);

        authService.forgotPassword("john.doe");

        PasswordResetToken saved = captor.getValue();
        assertEquals(approvedUser, saved.getUser());
        assertFalse(saved.isUsed());
        assertNotNull(saved.getToken());
        assertTrue(saved.getExpiresAt().isAfter(LocalDateTime.now()));
    }

    // ─── REGISTER with techStacks ─────────────────────────────────────────────

    @Test
    void register_withTechStackIds_fetchesTechStacks() {
        when(userRepository.existsByEnterpriseId("stack.user")).thenReturn(false);
        com.accenture.quizhub.entity.TechStack ts =
                com.accenture.quizhub.entity.TechStack.builder().id(1L).name("Java").build();
        when(techStackRepository.findById(1L)).thenReturn(Optional.of(ts));

        RegisterRequest req = new RegisterRequest();
        req.setEnterpriseId("stack.user");
        req.setFullName("Stack User");
        req.setEmail("stack@example.com");
        req.setPassword("Password1");
        req.setTechStackIds(java.util.List.of(1L));

        AuthResponse resp = authService.register(req);

        assertEquals("PENDING", resp.getRole());
        verify(techStackRepository).findById(1L);
    }
}
