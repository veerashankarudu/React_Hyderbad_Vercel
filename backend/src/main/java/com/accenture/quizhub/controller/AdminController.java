package com.accenture.quizhub.controller;

import com.accenture.quizhub.dto.request.AssignReviewerRequest;
import com.accenture.quizhub.dto.request.AddUserRequest;
import com.accenture.quizhub.dto.response.AuditLogResponse;
import com.accenture.quizhub.dto.response.McqResponse;
import com.accenture.quizhub.dto.response.UserSummary;
import com.accenture.quizhub.entity.User;
import com.accenture.quizhub.enums.McqStatus;
import com.accenture.quizhub.exception.ResourceNotFoundException;
import com.accenture.quizhub.repository.UserRepository;
import com.accenture.quizhub.service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final UserRepository userRepository;

    private User resolveUser(String enterpriseId) {
        return userRepository.findByEnterpriseId(enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    @GetMapping("/mcqs")
    public ResponseEntity<Page<McqResponse>> getAllMcqs(
            @RequestParam(required = false) McqStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long techStackId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(adminService.getAllMcqs(status, search, techStackId, page, size));
    }

    @GetMapping("/mcqs/export")
    public ResponseEntity<byte[]> exportMcqs(
            @RequestParam(required = false) McqStatus status,
            @RequestParam(required = false) Long techStackId,
            @AuthenticationPrincipal String enterpriseId) throws IOException {
        User actor = resolveUser(enterpriseId);
        byte[] bytes = adminService.exportMcqsToExcel(status, techStackId, actor);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"MCQ_Export.xlsx\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(bytes);
    }

    @PostMapping("/mcqs/{id}/assign-reviewer")
    public ResponseEntity<McqResponse> assignReviewer(
            @PathVariable Long id,
            @Valid @RequestBody AssignReviewerRequest request,
            @AuthenticationPrincipal String enterpriseId) {
        User admin = resolveUser(enterpriseId);
        return ResponseEntity.ok(adminService.assignReviewer(id, request, admin));
    }

    @GetMapping("/mcqs/{id}/eligible-reviewers")
    public ResponseEntity<List<UserSummary>> getEligibleReviewers(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.getEligibleReviewers(id));
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserSummary>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<UserSummary> changeUserRole(
            @PathVariable Long id,
            @RequestParam String role,
            @AuthenticationPrincipal String enterpriseId) {
        User admin = resolveUser(enterpriseId);
        return ResponseEntity.ok(adminService.changeUserRole(id, role, admin));
    }

    @PutMapping("/users/{id}/approve")
    public ResponseEntity<UserSummary> approveUser(
            @PathVariable Long id,
            @AuthenticationPrincipal String enterpriseId) {
        User admin = resolveUser(enterpriseId);
        return ResponseEntity.ok(adminService.approveUser(id, admin));
    }

    @DeleteMapping("/users/{id}/reject")
    public ResponseEntity<Void> rejectUser(
            @PathVariable Long id,
            @AuthenticationPrincipal String enterpriseId) {
        User admin = resolveUser(enterpriseId);
        adminService.rejectUser(id, admin);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/users")
    public ResponseEntity<UserSummary> addUser(
            @Valid @RequestBody AddUserRequest request,
            @AuthenticationPrincipal String enterpriseId) {
        User admin = resolveUser(enterpriseId);
        return ResponseEntity.status(HttpStatus.CREATED).body(adminService.addUser(request, admin));
    }

    @DeleteMapping("/mcqs/{id}")
    public ResponseEntity<Void> deleteMcq(
            @PathVariable Long id,
            @AuthenticationPrincipal String enterpriseId) {
        adminService.deleteMcq(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/audit-log")
    public ResponseEntity<List<AuditLogResponse>> getAuditLog() {
        return ResponseEntity.ok(adminService.getAuditLog());
    }
}
