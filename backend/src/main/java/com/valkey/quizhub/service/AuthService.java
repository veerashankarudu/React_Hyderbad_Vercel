package com.valkey.quizhub.service;

import com.valkey.quizhub.config.JwtUtil;
import com.valkey.quizhub.config.QuizHubMetrics;
import com.valkey.quizhub.dto.request.ChangePasswordRequest;
import com.valkey.quizhub.dto.request.LoginRequest;
import com.valkey.quizhub.dto.request.RegisterRequest;
import com.valkey.quizhub.dto.response.AuthResponse;
import com.valkey.quizhub.entity.AuditLog;
import com.valkey.quizhub.entity.PasswordResetToken;
import com.valkey.quizhub.entity.TechStack;
import com.valkey.quizhub.entity.User;
import com.valkey.quizhub.enums.Role;
import com.valkey.quizhub.exception.BadRequestException;
import com.valkey.quizhub.repository.AuditLogRepository;
import com.valkey.quizhub.repository.PasswordResetTokenRepository;
import com.valkey.quizhub.repository.TechStackRepository;
import com.valkey.quizhub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final TechStackRepository techStackRepository;
    private final AuditLogRepository auditLogRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final QuizHubMetrics metrics;

    @Value("${app.url:http://localhost:3000}")
    private String appUrl;

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEnterpriseId(request.getEnterpriseId())
                .orElseThrow(() -> { metrics.loginFailure.increment(); return new BadCredentialsException("Invalid credentials"); });

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            metrics.loginFailure.increment();
            throw new BadCredentialsException("Invalid credentials");
        }

        if (!user.isApproved()) {
            metrics.loginFailure.increment();
            throw new BadRequestException("Your account is pending admin approval. Please wait for an admin to activate your account.");
        }

        String token = jwtUtil.generateToken(user.getEnterpriseId(), user.getRole().name());
        metrics.loginSuccess.increment();
        return AuthResponse.builder()
                .token(token)
                .enterpriseId(user.getEnterpriseId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .build();
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEnterpriseId(request.getEnterpriseId())) {
            throw new BadRequestException("Enterprise ID already registered: " + request.getEnterpriseId());
        }

        List<TechStack> techStacks = new ArrayList<>();
        if (request.getTechStackIds() != null) {
            for (Long tsId : request.getTechStackIds()) {
                techStackRepository.findById(tsId).ifPresent(techStacks::add);
            }
        }

        User user = User.builder()
                .enterpriseId(request.getEnterpriseId())
                .fullName(request.getFullName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(Role.SME)
                .approved(false)
                .techStacks(techStacks)
                .build();

        userRepository.save(user);

        auditLogRepository.save(AuditLog.builder()
                .actorEnterpriseId(user.getEnterpriseId())
                .action("USER_REGISTERED")
                .targetEnterpriseId(user.getEnterpriseId())
                .details("Self-registered, pending approval")
                .timestamp(LocalDateTime.now())
                .build());

        // Don't return token — user must wait for approval
        return AuthResponse.builder()
                .enterpriseId(user.getEnterpriseId())
                .fullName(user.getFullName())
                .role("PENDING")
                .build();
    }

    public AuthResponse getMe(User user) {
        return AuthResponse.builder()
                .enterpriseId(user.getEnterpriseId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .build();
    }

    @Transactional
    public void changePassword(ChangePasswordRequest request, User user) {
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Current password is incorrect");
        }
        if (request.getCurrentPassword().equals(request.getNewPassword())) {
            throw new BadRequestException("New password must be different from the current password");
        }
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    // ─── Password Reset ───────────────────────────────────────────────────────

    @Transactional
    public void forgotPassword(String enterpriseIdOrEmail) {
        // Silently succeed even if user not found (security: don't reveal existence)
        userRepository.findByEnterpriseId(enterpriseIdOrEmail)
            .or(() -> userRepository.findByEmail(enterpriseIdOrEmail))
            .ifPresent(user -> {
                // Delete old tokens for this user
                resetTokenRepository.deleteByUserId(user.getId());
                resetTokenRepository.flush();

                // Generate 48-byte URL-safe token
                byte[] bytes = new byte[48];
                new SecureRandom().nextBytes(bytes);
                String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

                PasswordResetToken prt = PasswordResetToken.builder()
                        .token(rawToken)
                        .user(user)
                        .expiresAt(LocalDateTime.now().plusHours(2))
                        .used(false)
                        .build();
                resetTokenRepository.save(prt);

                String resetLink = appUrl + "/reset-password?token=" + rawToken;
                emailService.sendPasswordResetEmail(user, resetLink);
            });
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken prt = resetTokenRepository.findByToken(token)
                .orElseThrow(() -> new BadRequestException("Invalid or expired reset link"));

        if (prt.isUsed()) throw new BadRequestException("This reset link has already been used");
        if (prt.getExpiresAt().isBefore(LocalDateTime.now()))
            throw new BadRequestException("Reset link has expired. Please request a new one.");
        if (newPassword == null || newPassword.length() < 8)
            throw new BadRequestException("Password must be at least 8 characters");
        if (!newPassword.matches("^(?=.*[0-9])(?=.*[a-zA-Z]).{8,}$"))
            throw new BadRequestException("Password must contain at least one letter and one number");

        User user = prt.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        prt.setUsed(true);
        resetTokenRepository.save(prt);

        log.info("✅ Password reset successful for user: {}", user.getEnterpriseId());
    }
}
