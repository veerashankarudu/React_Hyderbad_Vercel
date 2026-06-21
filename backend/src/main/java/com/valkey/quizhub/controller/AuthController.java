package com.valkey.quizhub.controller;

import com.valkey.quizhub.config.JwtUtil;
import com.valkey.quizhub.dto.request.ChangePasswordRequest;
import com.valkey.quizhub.dto.request.LoginRequest;
import com.valkey.quizhub.dto.request.RegisterRequest;
import com.valkey.quizhub.dto.response.AuthResponse;
import com.valkey.quizhub.entity.User;
import com.valkey.quizhub.exception.ResourceNotFoundException;
import com.valkey.quizhub.repository.UserRepository;
import com.valkey.quizhub.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse> getMe(@AuthenticationPrincipal String enterpriseId) {
        User user = userRepository.findByEnterpriseId(enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return ResponseEntity.ok(authService.getMe(user));
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            @AuthenticationPrincipal String enterpriseId) {
        User user = userRepository.findByEnterpriseId(enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        authService.changePassword(request, user);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/demo-users")
    public ResponseEntity<List<Map<String, String>>> getDemoUsers() {
        List<Map<String, String>> users = userRepository.findAll().stream()
                .filter(User::isApproved)
                .map(u -> Map.of(
                        "enterpriseId", u.getEnterpriseId(),
                        "fullName", u.getFullName(),
                        "role", u.getRole().name()
                ))
                .toList();
        return ResponseEntity.ok(users);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@RequestBody Map<String, String> body) {
        String id = body.get("enterpriseId");
        if (id == null || id.isBlank()) id = body.get("email");
        authService.forgotPassword(id != null ? id.trim() : "");
        // Always return 200 — never reveal whether account exists
        return ResponseEntity.ok(Map.of("message",
                "If that account exists, a password reset link has been sent to the registered email."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        String newPassword = body.get("newPassword");
        authService.resetPassword(token, newPassword);
        return ResponseEntity.ok(Map.of("message", "Password reset successful. You can now log in."));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(
            @org.springframework.web.bind.annotation.RequestHeader(
                value = "Authorization", required = false) String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            jwtUtil.blacklist(authHeader.substring(7));
        }
        return ResponseEntity.ok(Map.of("message", "Logged out successfully."));
    }
}
