package com.accenture.quizhub.service;

import com.accenture.quizhub.entity.Mcq;
import com.accenture.quizhub.entity.TechStack;
import com.accenture.quizhub.entity.Topic;
import com.accenture.quizhub.enums.Difficulty;
import com.accenture.quizhub.enums.McqStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AIServiceTest {

    private ChatClient chatClient;
    private ChatClient.ChatClientRequestSpec mockSpec;
    private ChatClient.CallResponseSpec mockCallSpec;
    private AIService aiService;

    @BeforeEach
    void setUp() {
        mockCallSpec = mock(ChatClient.CallResponseSpec.class);
        mockSpec = mock(ChatClient.ChatClientRequestSpec.class);
        chatClient = mock(ChatClient.class);

        when(chatClient.prompt()).thenReturn(mockSpec);
        when(chatClient.prompt(any(org.springframework.ai.chat.prompt.Prompt.class))).thenReturn(mockSpec);
        when(mockSpec.user(anyString())).thenReturn(mockSpec);
        when(mockSpec.call()).thenReturn(mockCallSpec);
        when(mockCallSpec.content()).thenReturn("default AI response");

        ChatClient.Builder mockBuilder = mock(ChatClient.Builder.class);
        when(mockBuilder.build()).thenReturn(chatClient);

        aiService = new AIService(mockBuilder);
        // Set API key so isApiKeyConfigured() returns true for AI-path tests
        ReflectionTestUtils.setField(aiService, "openAiApiKey", "sk-test-key");
        ReflectionTestUtils.setField(aiService, "embeddingModel", null);
    }

    // ─── generateHint ─────────────────────────────────────────────────────────

    @Test
    void generateHint_returnsHintFromAI() {
        when(mockCallSpec.content()).thenReturn("This is a pedagogical hint");
        String result = aiService.generateHint(1L, "What is Java?");
        assertThat(result).isEqualTo("This is a pedagogical hint");
    }

    @Test
    void generateHint_withNullResponse_returnsNull() {
        when(mockCallSpec.content()).thenReturn(null);
        String result = aiService.generateHint(1L, "What is Java?");
        assertThat(result).isNull();
    }

    // ─── checkDuplicate ───────────────────────────────────────────────────────

    @Test
    void checkDuplicate_returnsAIResult() {
        when(mockCallSpec.content()).thenReturn("No, this is not a duplicate");
        String result = aiService.checkDuplicate("What is inheritance?");
        assertThat(result).contains("not a duplicate");
    }

    // ─── checkDuplicateAgainstDb ─────────────────────────────────────────────

    @Test
    void checkDuplicateAgainstDb_withEmptyList_returnsEmpty() {
        List<Map<String, Object>> result = aiService.checkDuplicateAgainstDb("What is Java?", new ArrayList<>());
        assertThat(result).isEmpty();
    }

    @Test
    void checkDuplicateAgainstDb_withNullList_returnsEmpty() {
        List<Map<String, Object>> result = aiService.checkDuplicateAgainstDb("What is Java?", null);
        assertThat(result).isEmpty();
    }

    @Test
    void checkDuplicateAgainstDb_withResults_returnsFilteredList() {
        String json = "[{\"id\":1,\"questionStem\":\"What is Java?\",\"similarityPercent\":85}]";
        when(mockCallSpec.content()).thenReturn(json);

        Mcq mcq = buildMcq(1L, "What is Java?");
        List<Map<String, Object>> result = aiService.checkDuplicateAgainstDb("What is Java?", List.of(mcq));
        assertThat(result).isNotEmpty();
        // Local scoring layer may also detect the match
        boolean hasHighScore = result.stream()
                .anyMatch(m -> ((Number) m.get("similarityPercent")).intValue() >= 85);
        assertThat(hasHighScore).isTrue();
    }

    @Test
    void checkDuplicateAgainstDb_withNullResponse_returnsLocalOnly() {
        when(mockCallSpec.content()).thenReturn(null);

        Mcq mcq = buildMcq(1L, "Explain quantum entanglement in physics");
        List<Map<String, Object>> result = aiService.checkDuplicateAgainstDb("What are the benefits of meditation?", List.of(mcq));
        assertThat(result).isEmpty();
    }

    @Test
    void checkDuplicateAgainstDb_withBelowThreshold_returnsEmpty() {
        String json = "[{\"id\":1,\"questionStem\":\"What is Java?\",\"similarityPercent\":5}]";
        when(mockCallSpec.content()).thenReturn(json);

        Mcq mcq = buildMcq(1L, "Explain photosynthesis in plants");
        List<Map<String, Object>> result = aiService.checkDuplicateAgainstDb("What is the capital of France?", List.of(mcq));
        assertThat(result).isEmpty();
    }

    @Test
    void checkDuplicateAgainstDb_withNoJsonArray_returnsEmpty() {
        // Response without [ ] brackets → returns empty (early exit) when stems are different
        when(mockCallSpec.content()).thenReturn("not valid json at all!!");

        Mcq mcq = buildMcq(1L, "How does photosynthesis convert sunlight?");
        List<Map<String, Object>> result = aiService.checkDuplicateAgainstDb("What is the Pythagorean theorem?", List.of(mcq));
        assertThat(result).isEmpty();
    }

    @Test
    void checkDuplicateAgainstDb_withInvalidJsonInBrackets_returnsEmpty() {
        // Response with [ ] but invalid JSON inside → parse fails → returns empty (no local match)
        when(mockCallSpec.content()).thenReturn("[invalid json content here]");

        Mcq mcq = buildMcq(1L, "Describe the water cycle in earth science");
        List<Map<String, Object>> result = aiService.checkDuplicateAgainstDb("What is machine learning classification?", List.of(mcq));
        assertThat(result).isEmpty();
    }

    // ─── scoreQuality ─────────────────────────────────────────────────────────

    @Test
    void scoreQuality_returnsValidResult() {
        String json = "{\"qualityScore\":85,\"suggestedDifficulty\":\"MEDIUM\",\"difficultyMatch\":true,\"issues\":[],\"summary\":\"Good question\"}";
        when(mockCallSpec.content()).thenReturn(json);

        Map<String, Object> result = aiService.scoreQuality("What is Java?", "A lang", "A tool", "An OS", "A DB", "A", "EASY");
        assertThat(result.get("qualityScore")).isEqualTo(85);
        assertThat(result.get("available")).isEqualTo(true);
    }

    @Test
    void scoreQuality_withNullResponse_returnsFallback() {
        when(mockCallSpec.content()).thenReturn(null);

        Map<String, Object> result = aiService.scoreQuality("What is Java?", "A", "B", "C", "D", "A", "MEDIUM");
        assertThat(result.get("available")).isEqualTo(false);
        assertThat(result.get("qualityScore")).isNull();
    }

    @Test
    void scoreQuality_withInvalidJson_returnsFallback() {
        when(mockCallSpec.content()).thenReturn("invalid json response");

        Map<String, Object> result = aiService.scoreQuality("What is Java?", "A", "B", "C", "D", "A", "MEDIUM");
        assertThat(result.get("available")).isEqualTo(false);
    }

    // ─── validateAnswer ───────────────────────────────────────────────────────

    @Test
    void validateAnswer_returnsValidResult() {
        String json = "{\"isCorrect\":true,\"confidenceScore\":92,\"explanation\":\"A is correct\",\"ambiguityWarning\":null}";
        when(mockCallSpec.content()).thenReturn(json);

        Map<String, Object> result = aiService.validateAnswer("What is Java?", "Language", "Tool", "OS", "DB", "A");
        assertThat(result.get("isCorrect")).isEqualTo(true);
        assertThat(result.get("available")).isEqualTo(true);
    }

    @Test
    void validateAnswer_withNullResponse_returnsFallback() {
        when(mockCallSpec.content()).thenReturn(null);

        Map<String, Object> result = aiService.validateAnswer("Q", "A", "B", "C", "D", "A");
        assertThat(result.get("available")).isEqualTo(false);
        assertThat(result.get("isCorrect")).isNull();
    }

    // ─── generateDistractors ─────────────────────────────────────────────────

    @Test
    void generateDistractors_returnsResult() {
        String json = "{\"optionB\":\"Wrong A\",\"optionC\":\"Wrong B\",\"optionD\":\"Wrong C\"}";
        when(mockCallSpec.content()).thenReturn(json);

        Map<String, Object> result = aiService.generateDistractors("What is inheritance?", "Reusing parent");
        assertThat(result.get("available")).isEqualTo(true);
        assertThat(result).containsKey("optionB");
    }

    @Test
    void generateDistractors_withException_returnsFallback() {
        when(mockCallSpec.content()).thenReturn("invalid json!!");

        Map<String, Object> result = aiService.generateDistractors("What is inheritance?", "Reusing parent");
        assertThat(result.get("available")).isEqualTo(false);
    }

    // ─── generateExplanations ────────────────────────────────────────────────

    @Test
    void generateExplanations_returnsResult() {
        String json = "{\"whyCorrect\":\"A is right\",\"whyAWrong\":\"N/A\",\"whyBWrong\":\"Wrong\",\"whyCWrong\":\"Wrong\",\"whyDWrong\":\"Wrong\"}";
        when(mockCallSpec.content()).thenReturn(json);

        Map<String, Object> result = aiService.generateExplanations("What is Java?", "Language", "Tool", "OS", "DB", "A");
        assertThat(result.get("available")).isEqualTo(true);
        assertThat(result).containsKey("whyCorrect");
    }

    @Test
    void generateExplanations_withException_returnsFallback() {
        when(mockCallSpec.content()).thenReturn(null);

        Map<String, Object> result = aiService.generateExplanations("Q", "A", "B", "C", "D", "A");
        assertThat(result.get("available")).isEqualTo(false);
    }

    // ─── generateMcqs ─────────────────────────────────────────────────────────

    @Test
    void generateMcqs_returnsListOfMcqs() {
        String json = "[{\"questionStem\":\"Q1\",\"optionA\":\"A\",\"optionB\":\"B\",\"optionC\":\"C\",\"optionD\":\"D\",\"correctAnswer\":\"A\",\"difficulty\":\"EASY\"}]";
        when(mockCallSpec.content()).thenReturn(json);

        List<Map<String, Object>> result = aiService.generateMcqs("Java", "OOP", 1, "EASY");
        assertThat(result).hasSize(1);
        assertThat(result.get(0).get("questionStem")).isEqualTo("Q1");
    }

    @Test
    void generateMcqs_withNullResponse_returnsFallbackError() {
        when(mockCallSpec.content()).thenReturn(null);

        List<Map<String, Object>> result = aiService.generateMcqs("Java", "OOP", 1, "EASY");
        assertThat(result).hasSize(1);
        assertThat(result.get(0)).containsKey("error");
    }

    @Test
    void generateMcqs_withInvalidJson_returnsFallbackError() {
        when(mockCallSpec.content()).thenReturn("not json");

        List<Map<String, Object>> result = aiService.generateMcqs("Java", "OOP", 1, "EASY");
        assertThat(result).hasSize(1);
        assertThat(result.get(0)).containsKey("error");
    }

    // ─── enrichMcq ────────────────────────────────────────────────────────────

    @Test
    void enrichMcq_setsAiWarningWhenResponseContainsIssue() {
        when(mockCallSpec.content()).thenReturn("There is an issue with the question");
        Mcq mcq = buildMcq(1L, "What is Java?");
        aiService.enrichMcq(mcq);
        assertThat(mcq.getAiWarning()).contains("issue");
    }

    @Test
    void enrichMcq_doesNotSetAiWarningWhenNoIssue() {
        when(mockCallSpec.content()).thenReturn("OK - this question is fine");
        Mcq mcq = buildMcq(1L, "What is Java?");
        aiService.enrichMcq(mcq);
        assertThat(mcq.getAiWarning()).isNull();
    }

    // ─── chatReply & chatReplyWithHistory ─────────────────────────────────────

    @Test
    void chatReply_withBlankMessage_returnsWelcome() {
        String result = aiService.chatReply("  ");
        assertThat(result).contains("QuizHub AI");
    }

    @Test
    void chatReplyWithHistory_withNullMessage_returnsWelcome() {
        String result = aiService.chatReplyWithHistory(null, Collections.emptyList());
        assertThat(result).contains("Commands");
    }

    @Test
    void chatReplyWithHistory_withHelpCommand_returnsHelp() {
        String result = aiService.chatReplyWithHistory("help", Collections.emptyList());
        assertThat(result).contains("Commands");
    }

    @Test
    void chatReplyWithHistory_withSlashHelpCommand_returnsHelp() {
        String result = aiService.chatReplyWithHistory("/help", Collections.emptyList());
        assertThat(result).contains("Commands");
    }

    @Test
    void chatReplyWithHistory_withHistoryCommand_emptyHistory() {
        String result = aiService.chatReplyWithHistory("history", Collections.emptyList());
        assertThat(result).contains("No recent messages");
    }

    @Test
    void chatReplyWithHistory_withHistoryCommand_withHistory() {
        List<String> history = List.of("Alice: Hello", "Bob: Hi there", "Alice: How are you?");
        String result = aiService.chatReplyWithHistory("history", history);
        assertThat(result).contains("Chat History");
    }

    @Test
    void chatReplyWithHistory_withLeaderboardCommand_returnsLeaderboard() {
        String result = aiService.chatReplyWithHistory("leaderboard", Collections.emptyList());
        assertThat(result).contains("Leaderboard");
    }

    @Test
    void chatReplyWithHistory_withDifficultyAlone_returnsUsage() {
        String result = aiService.chatReplyWithHistory("difficulty", Collections.emptyList());
        assertThat(result).contains("Usage");
    }

    @Test
    void chatReplyWithHistory_withDifficultyQuestion_callsAI() {
        when(mockCallSpec.content()).thenReturn("MEDIUM difficulty question");
        String result = aiService.chatReplyWithHistory("difficulty What is inheritance in OOP?", Collections.emptyList());
        assertThat(result).contains("Difficulty Assessment");
    }

    @Test
    void chatReplyWithHistory_withBloomAlone_returnsUsage() {
        String result = aiService.chatReplyWithHistory("bloom", Collections.emptyList());
        assertThat(result).contains("Usage");
    }

    @Test
    void chatReplyWithHistory_withBloomQuestion_callsAI() {
        when(mockCallSpec.content()).thenReturn("Apply level");
        String result = aiService.chatReplyWithHistory("bloom What is inheritance?", Collections.emptyList());
        assertThat(result).contains("Bloom");
    }

    @Test
    void chatReplyWithHistory_withProofreadAlone_returnsUsage() {
        String result = aiService.chatReplyWithHistory("proofread", Collections.emptyList());
        assertThat(result).contains("Usage");
    }

    @Test
    void chatReplyWithHistory_withProofreadQuestion_callsAI() {
        when(mockCallSpec.content()).thenReturn("Grammar looks good");
        String result = aiService.chatReplyWithHistory("proofread What is Java?", Collections.emptyList());
        assertThat(result).contains("Proofread");
    }

    @Test
    void chatReplyWithHistory_withCheckAlone_returnsUsage() {
        String result = aiService.chatReplyWithHistory("check", Collections.emptyList());
        assertThat(result).contains("Usage");
    }

    @Test
    void chatReplyWithHistory_withCheckQuestion_callsAI() {
        when(mockCallSpec.content()).thenReturn("Distractors are plausible");
        String result = aiService.chatReplyWithHistory("check Q: What is Java? A) Lang B) Tool C) OS D) DB", Collections.emptyList());
        assertThat(result).contains("Distractor");
    }

    @Test
    void chatReplyWithHistory_withHintAlone_returnsUsage() {
        String result = aiService.chatReplyWithHistory("hint", Collections.emptyList());
        assertThat(result).contains("Usage");
    }

    @Test
    void chatReplyWithHistory_withHintQuestion_callsAI() {
        when(mockCallSpec.content()).thenReturn("Think about parent-child relationships");
        String result = aiService.chatReplyWithHistory("hint What is inheritance?", Collections.emptyList());
        assertThat(result).contains("Hint");
    }

    @Test
    void chatReplyWithHistory_withGeneralQuestion_callsAI() {
        when(mockCallSpec.content()).thenReturn("Java is a programming language");
        String result = aiService.chatReplyWithHistory("What is Java?", List.of("Alice: Hello"));
        assertThat(result).isEqualTo("Java is a programming language");
    }

    @Test
    void chatReplyWithHistory_withGeneralQuestion_withoutApiKey() {
        ReflectionTestUtils.setField(aiService, "openAiApiKey", "sk-placeholder");
        String result = aiService.chatReplyWithHistory("What is Java?", Collections.emptyList());
        assertThat(result).contains("AI is not configured");
    }

    @Test
    void chatReplyWithHistory_withDifficultyQuestion_withoutApiKey() {
        ReflectionTestUtils.setField(aiService, "openAiApiKey", "sk-placeholder");
        String result = aiService.chatReplyWithHistory("difficulty What is Java?", Collections.emptyList());
        assertThat(result).contains("AI is not configured");
    }

    // ─── autoDifficulty ───────────────────────────────────────────────────────

    @Test
    void autoDifficulty_withApiKey_returnsAIResult() {
        String json = "{\"difficulty\":\"MEDIUM\",\"score\":55,\"reasoning\":\"Moderate complexity\"}";
        when(mockCallSpec.content()).thenReturn(json);

        Mcq mcq = buildMcq(1L, "What is polymorphism in OOP?");
        Map<String, Object> result = aiService.autoDifficulty(mcq);
        assertThat(result.get("difficulty")).isEqualTo("MEDIUM");
        assertThat(result.get("source")).isEqualTo("AI");
    }

    @Test
    void autoDifficulty_withApiKeyButBadResponse_fallsBackToRules() {
        when(mockCallSpec.content()).thenReturn("invalid json");

        Mcq mcq = buildMcq(1L, "What is Java?");
        Map<String, Object> result = aiService.autoDifficulty(mcq);
        // Falls back to rules
        assertThat(result.get("source")).isEqualTo("rules");
        assertThat(result).containsKey("difficulty");
    }

    @Test
    void autoDifficulty_withoutApiKey_usesRules_easyQuestion() {
        ReflectionTestUtils.setField(aiService, "openAiApiKey", "");

        Mcq mcq = buildMcq(1L, "What is Java?");
        Map<String, Object> result = aiService.autoDifficulty(mcq);
        assertThat(result.get("source")).isEqualTo("rules");
        assertThat(result.get("difficulty")).isEqualTo("EASY");
    }

    @Test
    void autoDifficulty_withoutApiKey_usesRules_hardQuestion() {
        ReflectionTestUtils.setField(aiService, "openAiApiKey", "");

        String hardStem = "In a concurrent Java application, which synchronization mechanism " +
                "guarantees both visibility and atomicity for long and double variables in a " +
                "multi-threaded environment involving JVM bytecode reordering and algorithm complexity?";
        Mcq mcq = buildMcq(2L, hardStem);
        Map<String, Object> result = aiService.autoDifficulty(mcq);
        assertThat(result.get("source")).isEqualTo("rules");
        assertThat(result.get("difficulty")).isEqualTo("HARD");
    }

    @Test
    void autoDifficulty_withoutApiKey_usesRules_mediumQuestion() {
        ReflectionTestUtils.setField(aiService, "openAiApiKey", "");

        Mcq mcq = buildMcq(3L, "Which annotation is used to mark a class as a Spring component?");
        Map<String, Object> result = aiService.autoDifficulty(mcq);
        assertThat(result.get("source")).isEqualTo("rules");
        assertThat(result.get("difficulty")).isNotNull();
    }

    // ─── semanticSearch ───────────────────────────────────────────────────────

    @Test
    void semanticSearch_withEmptyCandidates_returnsEmpty() {
        List<Map<String, Object>> result = aiService.semanticSearch("Java", Collections.emptyList(), 5);
        assertThat(result).isEmpty();
    }

    @Test
    void semanticSearch_withNullCandidates_returnsEmpty() {
        List<Map<String, Object>> result = aiService.semanticSearch("Java", null, 5);
        assertThat(result).isEmpty();
    }

    @Test
    void semanticSearch_withoutEmbeddingModel_usesKeywordFallback() {
        ReflectionTestUtils.setField(aiService, "embeddingModel", null);
        Mcq mcq = buildMcq(1L, "What is Java and how does it work?");
        List<Map<String, Object>> result = aiService.semanticSearch("Java programming language", List.of(mcq), 5);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).get("source")).isEqualTo("keywords");
    }

    @Test
    void semanticSearch_withoutApiKey_usesKeywordFallback() {
        ReflectionTestUtils.setField(aiService, "openAiApiKey", "");
        ReflectionTestUtils.setField(aiService, "embeddingModel", null);
        Mcq mcq = buildMcq(1L, "What is inheritance in object-oriented programming?");
        List<Map<String, Object>> result = aiService.semanticSearch("OOP inheritance", List.of(mcq), 5);
        assertThat(result).hasSize(1);
        assertThat(result.get(0)).containsKey("similarity");
    }

    // ─── extractFromImage ────────────────────────────────────────────────────

    @Test
    void extractFromImage_withException_returnsError() throws IOException {
        MultipartFile image = mock(MultipartFile.class);
        when(image.getBytes()).thenThrow(new IOException("IO error"));
        Map<String, Object> result = aiService.extractFromImage(image);
        assertThat(result).containsKey("error");
    }

    @Test
    void extractFromImage_withValidImageAndJsonResponse_returnsMap() throws IOException {
        MultipartFile image = mock(MultipartFile.class);
        when(image.getBytes()).thenReturn(new byte[]{1, 2, 3});
        when(image.getContentType()).thenReturn("image/png");
        when(image.getOriginalFilename()).thenReturn("test.png");

        Map<String, Object> result = aiService.extractFromImage(image);
        // Without Ollama running, returns error gracefully
        assertThat(result).containsKey("error");
        assertThat((Boolean) result.get("available")).isFalse();
    }

    // ─── helpers ─────────────────────────────────────────────────────────────

    private Mcq buildMcq(Long id, String stem) {
        Mcq mcq = new Mcq();
        mcq.setId(id);
        mcq.setQuestionStem(stem);
        mcq.setOptionA("Option A");
        mcq.setOptionB("Option B");
        mcq.setOptionC("Option C");
        mcq.setOptionD("Option D");
        mcq.setCorrectAnswer("A");
        mcq.setDifficulty(Difficulty.MEDIUM);
        mcq.setStatus(McqStatus.APPROVED);
        TechStack stack = new TechStack();
        stack.setId(1L);
        stack.setName("Java");
        mcq.setTechStack(stack);
        Topic topic = new Topic();
        topic.setId(1L);
        topic.setName("OOP");
        mcq.setTopic(topic);
        return mcq;
    }

    // ─── chatReplyWithHistory – no-API-key branches for bloom/proofread/check/hint ───

    @Test
    void chatReplyWithHistory_withBloomQuestion_withoutApiKey() {
        ReflectionTestUtils.setField(aiService, "openAiApiKey", "sk-placeholder");
        String result = aiService.chatReplyWithHistory("bloom What is polymorphism?", Collections.emptyList());
        assertThat(result).contains("AI is not configured");
    }

    @Test
    void chatReplyWithHistory_withProofreadQuestion_withoutApiKey() {
        ReflectionTestUtils.setField(aiService, "openAiApiKey", "sk-placeholder");
        String result = aiService.chatReplyWithHistory("proofread What is Java?", Collections.emptyList());
        assertThat(result).contains("AI is not configured");
    }

    @Test
    void chatReplyWithHistory_withCheckQuestion_withoutApiKey() {
        ReflectionTestUtils.setField(aiService, "openAiApiKey", "sk-placeholder");
        String result = aiService.chatReplyWithHistory(
                "check Q: What is Java? A) Lang B) Tool C) OS D) DB", Collections.emptyList());
        assertThat(result).contains("AI is not configured");
    }

    @Test
    void chatReplyWithHistory_withHintQuestion_withoutApiKey() {
        ReflectionTestUtils.setField(aiService, "openAiApiKey", "sk-placeholder");
        String result = aiService.chatReplyWithHistory("hint What is inheritance?", Collections.emptyList());
        assertThat(result).contains("AI is not configured");
    }

    // ─── chatReplyWithHistory – null AI response in sub-commands (ternary else branches) ──

    @Test
    void chatReplyWithHistory_withBloomNullResponse_returnsUnableToClassify() {
        when(mockCallSpec.content()).thenReturn(null);
        String result = aiService.chatReplyWithHistory("bloom What is polymorphism?", Collections.emptyList());
        assertThat(result).contains("Unable to classify");
    }

    @Test
    void chatReplyWithHistory_withProofreadNullResponse_returnsUnableToProofread() {
        when(mockCallSpec.content()).thenReturn(null);
        String result = aiService.chatReplyWithHistory("proofread What is Java?", Collections.emptyList());
        assertThat(result).contains("Unable to proofread");
    }

    // ─── chatReplyWithHistory – exception catch branches for bloom/proofread/check ──────

    @Test
    void chatReplyWithHistory_withBloomException_returnsUnavailable() {
        when(mockCallSpec.content()).thenThrow(new RuntimeException("AI down"));
        String result = aiService.chatReplyWithHistory("bloom What is polymorphism?", Collections.emptyList());
        assertThat(result).contains("unavailable");
    }

    @Test
    void chatReplyWithHistory_withCheckException_returnsUnavailable() {
        when(mockCallSpec.content()).thenThrow(new RuntimeException("AI down"));
        String result = aiService.chatReplyWithHistory(
                "check Q: What is Java? A) Lang B) Tool C) OS D) DB", Collections.emptyList());
        assertThat(result).contains("unavailable");
    }

    // ─── chatReplyWithHistory – null AI response covers ternary else branch ──────

    @Test
    void chatReplyWithHistory_withDifficultyNullResponse_returnsUnableToAssess() {
        when(mockCallSpec.content()).thenReturn(null);
        String result = aiService.chatReplyWithHistory("difficulty What is Java?", Collections.emptyList());
        assertThat(result).contains("Unable to assess");
    }

    // ─── chatReplyWithHistory – exception catch branches ─────────────────────────

    @Test
    void chatReplyWithHistory_withDifficultyException_returnsUnavailable() {
        when(mockCallSpec.content()).thenThrow(new RuntimeException("AI down"));
        String result = aiService.chatReplyWithHistory("difficulty What is Java?", Collections.emptyList());
        assertThat(result).contains("unavailable");
    }

    @Test
    void chatReplyWithHistory_withHintException_returnsSorry() {
        when(mockCallSpec.content()).thenThrow(new RuntimeException("AI down"));
        String result = aiService.chatReplyWithHistory("hint What is inheritance?", Collections.emptyList());
        assertThat(result).contains("Sorry");
    }

    @Test
    void chatReplyWithHistory_generalQuestion_nullContent_returnsNotSure() {
        when(mockCallSpec.content()).thenReturn(null);
        String result = aiService.chatReplyWithHistory("What is polymorphism?", Collections.emptyList());
        assertThat(result).contains("not sure");
    }

    @Test
    void chatReplyWithHistory_generalQuestion_exception_returnsSorry() {
        when(mockCallSpec.content()).thenThrow(new RuntimeException("AI down"));
        String result = aiService.chatReplyWithHistory("What is polymorphism?", Collections.emptyList());
        assertThat(result).contains("Sorry");
    }

    // ─── semanticSearch – embedding model paths ───────────────────────────────────

    @Test
    void semanticSearch_withEmbeddingModel_usesEmbeddingsSource() {
        org.springframework.ai.embedding.EmbeddingModel mockEmbedding =
                mock(org.springframework.ai.embedding.EmbeddingModel.class);
        // Return identical vectors so cosine similarity = 1.0
        when(mockEmbedding.embed(anyString())).thenReturn(new float[]{0.1f, 0.2f, 0.3f});
        ReflectionTestUtils.setField(aiService, "embeddingModel", mockEmbedding);

        Mcq mcq = buildMcq(1L, "What is Java?");
        List<Map<String, Object>> result = aiService.semanticSearch("Java programming", List.of(mcq), 5);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).get("source")).isEqualTo("embeddings");
    }

    @Test
    void semanticSearch_withEmbeddingModelException_fallsBackToKeywords() {
        org.springframework.ai.embedding.EmbeddingModel mockEmbedding =
                mock(org.springframework.ai.embedding.EmbeddingModel.class);
        when(mockEmbedding.embed(anyString())).thenThrow(new RuntimeException("embed failed"));
        ReflectionTestUtils.setField(aiService, "embeddingModel", mockEmbedding);

        Mcq mcq = buildMcq(1L, "What is Java and how does it work?");
        List<Map<String, Object>> result = aiService.semanticSearch("Java programming language", List.of(mcq), 5);
        // embeddingSearch catches exception and falls back to keyword search
        assertThat(result).hasSize(1);
        assertThat(result.get(0).get("source")).isEqualTo("keywords");
    }
}
