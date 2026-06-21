package com.valkey.quizhub.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.CompletableFuture;

/**
 * Integration with Breeth AI — intent-aware memory for AI agents.
 * 
 * Breeth provides persistent knowledge graph memory that stores MCQ creation episodes,
 * user learning patterns, and enables intelligent retrieval via hybrid search
 * (BM25 + vector + graph traversal).
 * 
 * This service uses Valkey (Redis) for local caching of Breeth responses to minimize
 * API calls and improve latency.
 * 
 * API Docs: https://docs.thebreeth.com
 */
@Service
public class BreethMemoryService {

    private static final Logger log = LoggerFactory.getLogger(BreethMemoryService.class);
    private static final String BASE_URL = "https://api.thebreeth.com/v1";

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final StringRedisTemplate redisTemplate;

    @Value("${breeth.api-key:}")
    private String apiKey;

    @Value("${breeth.group-id:quizhub}")
    private String groupId;

    @Value("${breeth.enabled:true}")
    private boolean enabled;

    public BreethMemoryService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = new ObjectMapper();
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    /**
     * Check if Breeth AI is configured and available.
     */
    public boolean isAvailable() {
        return enabled && apiKey != null && !apiKey.isBlank() && apiKey.startsWith("ck_live_");
    }

    /**
     * Write an episode to Breeth memory (async, non-blocking).
     * Episodes are prose descriptions of events/facts that Breeth extracts entities and edges from.
     * 
     * Used when: MCQs are created, reviewed, approved, or when users interact with the AI chatbot.
     */
    public CompletableFuture<Map<String, Object>> writeEpisode(String content, boolean extractIntent) {
        if (!isAvailable()) {
            return CompletableFuture.completedFuture(Map.of("ok", false, "reason", "Breeth AI not configured"));
        }

        return CompletableFuture.supplyAsync(() -> {
            try {
                Map<String, Object> body = new LinkedHashMap<>();
                body.put("content", content);
                body.put("group_id", groupId);
                body.put("source_description", "quizhub-backend");
                body.put("extract_intent", extractIntent);

                String jsonBody = objectMapper.writeValueAsString(body);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(BASE_URL + "/episodes"))
                        .header("Authorization", "Bearer " + apiKey)
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                        .timeout(Duration.ofSeconds(10))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() == 200) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> result = objectMapper.readValue(response.body(), Map.class);
                    log.debug("Breeth episode written: {}", result.get("episode_name"));
                    return result;
                } else {
                    log.warn("Breeth write failed ({}): {}", response.statusCode(), response.body());
                    return Map.of("ok", false, "status", response.statusCode());
                }
            } catch (Exception e) {
                log.warn("Breeth write error: {}", e.getMessage());
                return Map.of("ok", false, "error", e.getMessage());
            }
        });
    }

    /**
     * Search Breeth memory for relevant knowledge.
     * Uses hybrid retrieval: BM25 + vector + graph traversal.
     * Results are cached in Valkey for 5 minutes to reduce API calls.
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> search(String query, int limit) {
        if (!isAvailable()) {
            return Collections.emptyList();
        }

        // Check Valkey cache first
        String cacheKey = "breeth:search:" + query.hashCode() + ":" + limit;
        try {
            String cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                log.debug("Breeth search cache hit for: {}", query);
                return objectMapper.readValue(cached, List.class);
            }
        } catch (Exception e) {
            // Cache miss or error — continue with API call
        }

        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("query", query);
            body.put("group_id", groupId);
            body.put("limit", Math.min(limit, 100));

            String jsonBody = objectMapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(BASE_URL + "/search"))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .timeout(Duration.ofSeconds(10))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                Map<String, Object> result = objectMapper.readValue(response.body(), Map.class);
                List<Map<String, Object>> edges = (List<Map<String, Object>>) result.getOrDefault("edges", Collections.emptyList());

                // Cache in Valkey for 5 minutes
                try {
                    redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(edges), Duration.ofMinutes(5));
                } catch (Exception ce) {
                    // Non-critical — skip cache write
                }

                log.debug("Breeth search returned {} results for: {}", edges.size(), query);
                return edges;
            } else {
                log.warn("Breeth search failed ({}): {}", response.statusCode(), response.body());
                return Collections.emptyList();
            }
        } catch (Exception e) {
            log.warn("Breeth search error: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Write a single fact (subject-predicate-object triple) to Breeth.
     */
    public CompletableFuture<Map<String, Object>> writeFact(String subject, String predicate, String object) {
        if (!isAvailable()) {
            return CompletableFuture.completedFuture(Map.of("ok", false));
        }

        return CompletableFuture.supplyAsync(() -> {
            try {
                Map<String, Object> body = new LinkedHashMap<>();
                body.put("subject", subject);
                body.put("predicate", predicate);
                body.put("object", object);
                body.put("group_id", groupId);

                String jsonBody = objectMapper.writeValueAsString(body);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(BASE_URL + "/facts"))
                        .header("Authorization", "Bearer " + apiKey)
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                        .timeout(Duration.ofSeconds(10))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 200) {
                    return objectMapper.readValue(response.body(), Map.class);
                }
                return Map.of("ok", false, "status", response.statusCode());
            } catch (Exception e) {
                return Map.of("ok", false, "error", e.getMessage());
            }
        });
    }

    // ─── High-level convenience methods for QuizHub ───────────────────────────

    /**
     * Record an MCQ creation event in Breeth memory.
     */
    public void recordMcqCreated(String creatorName, String techStack, String topic, 
                                  String questionStem, String difficulty) {
        String episode = String.format(
            "%s created a %s difficulty MCQ question about %s (%s): \"%s\"",
            creatorName, difficulty, topic, techStack, 
            questionStem.length() > 200 ? questionStem.substring(0, 200) : questionStem
        );
        writeEpisode(episode, true);
    }

    /**
     * Record an MCQ review/approval event.
     */
    public void recordMcqReviewed(String reviewerName, String action, String techStack, 
                                   String topic, String questionStem) {
        String episode = String.format(
            "%s %s an MCQ about %s (%s): \"%s\"",
            reviewerName, action, topic, techStack,
            questionStem.length() > 150 ? questionStem.substring(0, 150) : questionStem
        );
        writeEpisode(episode, false);
    }

    /**
     * Search Breeth memory for related knowledge about a topic.
     * Useful for providing context to the AI when generating questions.
     */
    public List<Map<String, Object>> findRelatedKnowledge(String topic, String techStack) {
        String query = String.format("What MCQ questions exist about %s in %s?", topic, techStack);
        return search(query, 10);
    }

    /**
     * Record a user's learning pattern/preference.
     */
    public void recordUserPreference(String userName, String preference) {
        String episode = String.format("%s: %s", userName, preference);
        writeEpisode(episode, true);
    }

    /**
     * Get Breeth service status for health checks.
     */
    public Map<String, Object> getStatus() {
        Map<String, Object> status = new LinkedHashMap<>();
        status.put("configured", isAvailable());
        status.put("enabled", enabled);
        status.put("baseUrl", BASE_URL);
        status.put("groupId", groupId);
        if (!isAvailable()) {
            status.put("reason", apiKey == null || apiKey.isBlank() 
                ? "BREETH_API_KEY not set" 
                : "Invalid API key format (must start with ck_live_)");
        }
        return status;
    }
}
