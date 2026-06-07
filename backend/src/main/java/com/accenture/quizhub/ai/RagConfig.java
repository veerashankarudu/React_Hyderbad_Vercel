package com.accenture.quizhub.ai;

import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.vectorstore.SimpleVectorStore;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.Map;

/**
 * RAG Configuration — Spring AI Pattern #3
 * 
 * Loads QuizHub knowledge documents into a SimpleVectorStore for
 * retrieval-augmented generation queries.
 */
@Configuration
public class RagConfig {

    @Bean
    @ConditionalOnBean(EmbeddingModel.class)
    public VectorStore vectorStore(EmbeddingModel embeddingModel) {
        SimpleVectorStore store = SimpleVectorStore.builder(embeddingModel).build();
        // Seed with QuizHub domain knowledge
        store.add(knowledgeDocuments());
        return store;
    }

    private List<Document> knowledgeDocuments() {
        return List.of(
            new Document("QuizHub AI is a collaborative MCQ management platform for Accenture teams. " +
                "It supports creation, review, and approval of multiple-choice questions across tech stacks.",
                Map.of("source", "platform-overview")),
            new Document("Tech Stacks available: Spring Cloud, Spring Boot, Spring Core, Spring MVC & REST, " +
                "Spring ORM & Data JPA, Core Java. Each tech stack has multiple topics assigned to SMEs.",
                Map.of("source", "tech-stacks")),
            new Document("MCQ Workflow: DRAFT → READY_FOR_REVIEW → APPROVED or REJECTED. " +
                "SMEs create questions, reviewers validate quality, admins manage assignments.",
                Map.of("source", "workflow")),
            new Document("Quality checks: AI validates answer correctness, checks for duplicate questions, " +
                "scores question quality, assesses difficulty using Bloom's taxonomy, and generates explanations.",
                Map.of("source", "ai-features")),
            new Document("Bulk upload supports CSV files with up to 500 MCQs per upload. " +
                "The system validates format, checks duplicates, and assigns difficulty automatically.",
                Map.of("source", "bulk-upload")),
            new Document("User roles: ADMIN (full access, user management, analytics), " +
                "SME (create/edit MCQs for assigned tech stacks, submit for review). " +
                "Authentication uses JWT tokens with 24-hour expiry.",
                Map.of("source", "roles-auth")),
            new Document("Analytics dashboard shows: MCQs per tech stack, approval rates, " +
                "reviewer turnaround time, quality scores distribution, and contribution leaderboards.",
                Map.of("source", "analytics")),
            new Document("Internationalization: The platform supports 7 languages — English, Hindi, " +
                "Telugu, Kannada, Urdu, French, German — for the UI interface.",
                Map.of("source", "i18n"))
        );
    }
}
