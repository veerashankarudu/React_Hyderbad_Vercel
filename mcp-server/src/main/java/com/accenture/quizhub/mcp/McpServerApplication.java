package com.accenture.quizhub.mcp;

import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.ai.tool.method.MethodToolCallbackProvider;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

/**
 * QuizHub MCP Server — Model Context Protocol Server
 * 
 * Exposes QuizHub tools to AI models (Claude, Copilot, etc.) via MCP protocol.
 * AI can call these tools to search questions, create MCQs, check duplicates, etc.
 * 
 * Transport: SSE (Server-Sent Events) on port 8085
 * Protocol: MCP (Model Context Protocol by Anthropic)
 */
@SpringBootApplication
public class McpServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(McpServerApplication.class, args);
    }

    @Bean
    public ToolCallbackProvider quizHubToolCallbackProvider(QuizHubTools quizHubTools) {
        return MethodToolCallbackProvider.builder()
                .toolObjects(quizHubTools)
                .build();
    }
}
