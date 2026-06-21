package com.valkey.quizhub.controller;

import com.valkey.quizhub.entity.TechStack;
import com.valkey.quizhub.entity.Topic;
import com.valkey.quizhub.entity.User;
import com.valkey.quizhub.exception.ResourceNotFoundException;
import com.valkey.quizhub.dto.response.UserSummary;
import com.valkey.quizhub.repository.UserRepository;
import com.valkey.quizhub.service.MasterDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/master")
@RequiredArgsConstructor
public class MasterController {

    private final MasterDataService masterDataService;
    private final UserRepository userRepository;

    // ─── Public reads ─────────────────────────────────────────────────────────

    @GetMapping("/tech-stacks")
    public ResponseEntity<List<TechStack>> getTechStacks() {
        return ResponseEntity.ok(masterDataService.getAllTechStacks());
    }

    @GetMapping("/topics")
    public ResponseEntity<List<Topic>> getAllTopics() {
        return ResponseEntity.ok(masterDataService.getAllTopics());
    }

    @GetMapping("/tech-stacks/{id}/topics")
    public ResponseEntity<List<Topic>> getTopics(@PathVariable Long id) {
        return ResponseEntity.ok(masterDataService.getTopicsByTechStack(id));
    }

    // ─── Admin: Tech Stack CRUD ───────────────────────────────────────────────

    @PostMapping("/tech-stacks")
    public ResponseEntity<TechStack> createTechStack(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal String enterpriseId) {
        requireAdmin(enterpriseId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(masterDataService.createTechStack(body.get("name")));
    }

    @PutMapping("/tech-stacks/{id}")
    public ResponseEntity<TechStack> updateTechStack(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal String enterpriseId) {
        requireAdmin(enterpriseId);
        return ResponseEntity.ok(masterDataService.updateTechStack(id, body.get("name")));
    }

    @DeleteMapping("/tech-stacks/{id}")
    public ResponseEntity<Void> deleteTechStack(
            @PathVariable Long id,
            @AuthenticationPrincipal String enterpriseId) {
        requireAdmin(enterpriseId);
        masterDataService.deleteTechStack(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Admin: Topic CRUD ────────────────────────────────────────────────────

    @PostMapping("/tech-stacks/{techStackId}/topics")
    public ResponseEntity<Topic> createTopic(
            @PathVariable Long techStackId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal String enterpriseId) {
        requireAdmin(enterpriseId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(masterDataService.createTopic(techStackId, body.get("name")));
    }

    @PutMapping("/topics/{topicId}")
    public ResponseEntity<Topic> updateTopic(
            @PathVariable Long topicId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal String enterpriseId) {
        requireAdmin(enterpriseId);
        return ResponseEntity.ok(masterDataService.updateTopic(topicId, body.get("name")));
    }

    @DeleteMapping("/topics/{topicId}")
    public ResponseEntity<Void> deleteTopic(
            @PathVariable Long topicId,
            @AuthenticationPrincipal String enterpriseId) {
        requireAdmin(enterpriseId);
        masterDataService.deleteTopic(topicId);
        return ResponseEntity.noContent().build();
    }

    // ─── Helper ───────────────────────────────────────────────────────────────

    private void requireAdmin(String enterpriseId) {
        User user = userRepository.findByEnterpriseId(enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (!"ADMIN".equals(user.getRole().name()))
            throw new com.valkey.quizhub.exception.BadRequestException("Admin access required");
    }

    private UserSummary toSummary(User u) {
        return UserSummary.builder()
                .id(u.getId())
                .enterpriseId(u.getEnterpriseId())
                .fullName(u.getFullName())
                .role(u.getRole().name())
                .email(u.getEmail())
                .approved(u.isApproved())
                .build();
    }

    // ─── SME mapping reads (admin only) ──────────────────────────────────────

    @GetMapping("/smes")
    public ResponseEntity<List<UserSummary>> getAllSmes(
            @AuthenticationPrincipal String enterpriseId) {
        requireAdmin(enterpriseId);
        return ResponseEntity.ok(
                masterDataService.getAllSmes().stream().map(this::toSummary).toList());
    }

    @GetMapping("/tech-stacks/{id}/smes")
    public ResponseEntity<List<UserSummary>> getSmesForStack(
            @PathVariable Long id,
            @AuthenticationPrincipal String enterpriseId) {
        requireAdmin(enterpriseId);
        return ResponseEntity.ok(
                masterDataService.getSmesByTechStack(id).stream().map(this::toSummary).toList());
    }

    @PostMapping("/tech-stacks/{id}/smes/{userId}")
    public ResponseEntity<Void> addSmeToStack(
            @PathVariable Long id,
            @PathVariable Long userId,
            @AuthenticationPrincipal String enterpriseId) {
        requireAdmin(enterpriseId);
        masterDataService.addSmeToTechStack(id, userId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/tech-stacks/{id}/smes/{userId}")
    public ResponseEntity<Void> removeSmeFromStack(
            @PathVariable Long id,
            @PathVariable Long userId,
            @AuthenticationPrincipal String enterpriseId) {
        requireAdmin(enterpriseId);
        masterDataService.removeSmeFromTechStack(id, userId);
        return ResponseEntity.noContent().build();
    }
}
