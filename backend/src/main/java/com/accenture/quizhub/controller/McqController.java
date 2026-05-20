package com.accenture.quizhub.controller;

import com.accenture.quizhub.dto.request.McqRequest;
import com.accenture.quizhub.dto.response.McqResponse;
import com.accenture.quizhub.entity.McqVersion;
import com.accenture.quizhub.entity.User;
import com.accenture.quizhub.enums.McqStatus;
import com.accenture.quizhub.exception.ResourceNotFoundException;
import com.accenture.quizhub.repository.McqVersionRepository;
import com.accenture.quizhub.repository.UserRepository;
import com.accenture.quizhub.service.McqService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/mcqs")
@RequiredArgsConstructor
public class McqController {

    private final McqService mcqService;
    private final UserRepository userRepository;
    private final McqVersionRepository mcqVersionRepository;

    private User resolveUser(String enterpriseId) {
        return userRepository.findByEnterpriseId(enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    @PostMapping
    public ResponseEntity<McqResponse> create(
            @Valid @RequestBody McqRequest request,
            @AuthenticationPrincipal String enterpriseId) {
        User user = resolveUser(enterpriseId);
        return ResponseEntity.status(HttpStatus.CREATED).body(mcqService.createMcq(request, user));
    }

    @GetMapping
    public ResponseEntity<Page<McqResponse>> getMyMcqs(
            @AuthenticationPrincipal String enterpriseId,
            @RequestParam(required = false) McqStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        User user = resolveUser(enterpriseId);
        return ResponseEntity.ok(mcqService.getMyMcqs(user, status, search, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<McqResponse> getById(
            @PathVariable Long id,
            @AuthenticationPrincipal String enterpriseId) {
        User user = resolveUser(enterpriseId);
        return ResponseEntity.ok(mcqService.getMcqById(id, user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<McqResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody McqRequest request,
            @AuthenticationPrincipal String enterpriseId) {
        User user = resolveUser(enterpriseId);
        return ResponseEntity.ok(mcqService.updateMcq(id, request, user));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<McqResponse> submitForReview(
            @PathVariable Long id,
            @AuthenticationPrincipal String enterpriseId) {
        User user = resolveUser(enterpriseId);
        return ResponseEntity.ok(mcqService.submitForReview(id, user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal String enterpriseId) {
        User user = resolveUser(enterpriseId);
        mcqService.deleteMcq(id, user);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<List<McqVersion>> getHistory(
            @PathVariable Long id,
            @AuthenticationPrincipal String enterpriseId) {
        resolveUser(enterpriseId); // auth check
        return ResponseEntity.ok(mcqVersionRepository.findByMcqIdOrderByVersionNumberDesc(id));
    }
}
