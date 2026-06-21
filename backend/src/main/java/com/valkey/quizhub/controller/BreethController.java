package com.valkey.quizhub.controller;

import com.valkey.quizhub.service.BreethMemoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST API for Breeth AI memory integration.
 * Provides endpoints for searching the knowledge graph and checking service status.
 */
@RestController
@RequestMapping("/api/v1/breeth")
@RequiredArgsConstructor
public class BreethController {

    private final BreethMemoryService breethMemoryService;

    /**
     * Search Breeth memory for relevant knowledge.
     * GET /api/v1/breeth/search?query=...&limit=10
     */
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> search(
            @RequestParam String query,
            @RequestParam(defaultValue = "10") int limit) {
        List<Map<String, Object>> results = breethMemoryService.search(query, limit);
        return ResponseEntity.ok(Map.of(
            "query", query,
            "results", results,
            "count", results.size(),
            "source", "breeth-ai"
        ));
    }

    /**
     * Get Breeth AI service status.
     * GET /api/v1/breeth/status
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        return ResponseEntity.ok(breethMemoryService.getStatus());
    }

    /**
     * Write a knowledge episode to Breeth memory.
     * POST /api/v1/breeth/episodes
     */
    @PostMapping("/episodes")
    public ResponseEntity<Map<String, Object>> writeEpisode(@RequestBody Map<String, Object> body) {
        String content = (String) body.get("content");
        if (content == null || content.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "content is required"));
        }
        boolean extractIntent = Boolean.TRUE.equals(body.get("extractIntent"));
        breethMemoryService.writeEpisode(content, extractIntent).thenAccept(result -> {
            // Fire and forget — async write
        });
        return ResponseEntity.accepted().body(Map.of("status", "accepted", "message", "Episode queued for processing"));
    }
}
