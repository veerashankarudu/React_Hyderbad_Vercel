package com.accenture.quizhub.controller;

import com.accenture.quizhub.dto.request.ReviewRequest;
import com.accenture.quizhub.dto.response.McqResponse;
import com.accenture.quizhub.entity.User;
import com.accenture.quizhub.enums.McqStatus;
import com.accenture.quizhub.exception.ResourceNotFoundException;
import com.accenture.quizhub.repository.UserRepository;
import com.accenture.quizhub.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;
    private final UserRepository userRepository;

    private User resolveUser(String enterpriseId) {
        return userRepository.findByEnterpriseId(enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    @GetMapping
    public ResponseEntity<Page<McqResponse>> getAssignedReviews(
            @AuthenticationPrincipal String enterpriseId,
            @RequestParam(required = false) McqStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        User user = resolveUser(enterpriseId);
        return ResponseEntity.ok(reviewService.getAssignedReviews(user, status, page, size));
    }

    @PostMapping("/{mcqId}/submit")
    public ResponseEntity<McqResponse> submitReview(
            @PathVariable Long mcqId,
            @Valid @RequestBody ReviewRequest request,
            @AuthenticationPrincipal String enterpriseId) {
        User user = resolveUser(enterpriseId);
        return ResponseEntity.ok(reviewService.submitReview(mcqId, request, user));
    }

    @PostMapping("/{mcqId}/comments")
    public ResponseEntity<McqResponse> addComment(
            @PathVariable Long mcqId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal String enterpriseId) {
        User user = resolveUser(enterpriseId);
        return ResponseEntity.ok(reviewService.addComment(mcqId, body.get("comment"), user));
    }
}
