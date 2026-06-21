package com.valkey.quizhub.mcp;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * Configuration for connecting to the QuizHub backend API.
 */
@Configuration
public class QuizHubClientConfig {

    @Value("${quizhub.backend.url:http://localhost:8080}")
    private String backendUrl;

    @Value("${quizhub.backend.token:}")
    private String authToken;

    @Bean
    public WebClient quizHubClient() {
        WebClient.Builder builder = WebClient.builder()
                .baseUrl(backendUrl + "/api/v1")
                .defaultHeader("Content-Type", "application/json");

        if (authToken != null && !authToken.isBlank()) {
            builder.defaultHeader("Authorization", "Bearer " + authToken);
        }

        return builder.build();
    }
}
