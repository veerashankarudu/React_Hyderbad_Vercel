package com.valkey.quizhub.entity;

import com.valkey.quizhub.enums.Difficulty;
import com.valkey.quizhub.enums.McqStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Entity Group 1 – Mcq, McqVersion, QuizAttempt, QuizSession")
class EntityGroup1Test {

    // =========================================================================
    // Mcq
    // =========================================================================

    @Nested
    @DisplayName("Mcq")
    class McqTests {

        @Test
        @DisplayName("builder creates object with all supplied values")
        void builder_setsAllFields() {
            User creator = new User();
            User reviewer = new User();

            Mcq mcq = Mcq.builder()
                    .id(1L)
                    .questionStem("What is Java?")
                    .optionA("A language")
                    .optionB("A framework")
                    .optionC("A database")
                    .optionD("An OS")
                    .correctAnswer("A")
                    .difficulty(Difficulty.EASY)
                    .status(McqStatus.APPROVED)
                    .creator(creator)
                    .reviewer(reviewer)
                    .version(2)
                    .aiScore(85)
                    .aiRisk("LOW")
                    .aiWarning("None")
                    .build();

            assertThat(mcq.getId()).isEqualTo(1L);
            assertThat(mcq.getQuestionStem()).isEqualTo("What is Java?");
            assertThat(mcq.getOptionA()).isEqualTo("A language");
            assertThat(mcq.getOptionB()).isEqualTo("A framework");
            assertThat(mcq.getOptionC()).isEqualTo("A database");
            assertThat(mcq.getOptionD()).isEqualTo("An OS");
            assertThat(mcq.getCorrectAnswer()).isEqualTo("A");
            assertThat(mcq.getDifficulty()).isEqualTo(Difficulty.EASY);
            assertThat(mcq.getStatus()).isEqualTo(McqStatus.APPROVED);
            assertThat(mcq.getCreator()).isSameAs(creator);
            assertThat(mcq.getReviewer()).isSameAs(reviewer);
            assertThat(mcq.getVersion()).isEqualTo(2);
            assertThat(mcq.getAiScore()).isEqualTo(85);
            assertThat(mcq.getAiRisk()).isEqualTo("LOW");
            assertThat(mcq.getAiWarning()).isEqualTo("None");
        }

        @Test
        @DisplayName("@Builder.Default sets status to DRAFT when not specified")
        void builderDefault_status_isDraft() {
            Mcq mcq = Mcq.builder()
                    .questionStem("Q")
                    .optionA("A").optionB("B").optionC("C").optionD("D")
                    .correctAnswer("A")
                    .difficulty(Difficulty.MEDIUM)
                    .build();

            assertThat(mcq.getStatus()).isEqualTo(McqStatus.DRAFT);
        }

        @Test
        @DisplayName("no-args constructor produces object with null id and question stem")
        void noArgsConstructor_fieldsAreNull() {
            Mcq mcq = new Mcq();

            assertThat(mcq.getId()).isNull();
            assertThat(mcq.getQuestionStem()).isNull();
            assertThat(mcq.getDifficulty()).isNull();
            // @Builder.Default field initializer sets DRAFT even via no-args constructor
            assertThat(mcq.getStatus()).isEqualTo(McqStatus.DRAFT);
        }

        @Test
        @DisplayName("setters update all mutable fields")
        void setters_updateFields() {
            Mcq mcq = new Mcq();
            LocalDateTime now = LocalDateTime.now();

            mcq.setId(42L);
            mcq.setQuestionStem("Updated stem");
            mcq.setOptionA("Opt A");
            mcq.setOptionB("Opt B");
            mcq.setOptionC("Opt C");
            mcq.setOptionD("Opt D");
            mcq.setCorrectAnswer("B");
            mcq.setDifficulty(Difficulty.HARD);
            mcq.setStatus(McqStatus.READY_FOR_REVIEW);
            mcq.setVersion(5);
            mcq.setAiScore(90);
            mcq.setAiRisk("HIGH");
            mcq.setAiWarning("Risky question");
            mcq.setCreatedAt(now);
            mcq.setUpdatedAt(now);

            assertThat(mcq.getId()).isEqualTo(42L);
            assertThat(mcq.getQuestionStem()).isEqualTo("Updated stem");
            assertThat(mcq.getCorrectAnswer()).isEqualTo("B");
            assertThat(mcq.getDifficulty()).isEqualTo(Difficulty.HARD);
            assertThat(mcq.getStatus()).isEqualTo(McqStatus.READY_FOR_REVIEW);
            assertThat(mcq.getVersion()).isEqualTo(5);
            assertThat(mcq.getAiScore()).isEqualTo(90);
            assertThat(mcq.getAiRisk()).isEqualTo("HIGH");
            assertThat(mcq.getAiWarning()).isEqualTo("Risky question");
            assertThat(mcq.getCreatedAt()).isEqualTo(now);
            assertThat(mcq.getUpdatedAt()).isEqualTo(now);
        }

        @Test
        @DisplayName("equals and hashCode are consistent for same field values")
        void equalsAndHashCode_sameValues() {
            Mcq a = Mcq.builder().id(1L).questionStem("Q").difficulty(Difficulty.EASY)
                    .status(McqStatus.DRAFT).build();
            Mcq b = Mcq.builder().id(1L).questionStem("Q").difficulty(Difficulty.EASY)
                    .status(McqStatus.DRAFT).build();

            assertThat(a).isEqualTo(b);
            assertThat(a.hashCode()).isEqualTo(b.hashCode());
        }

        @Test
        @DisplayName("equals returns false for different ids")
        void equals_differentIds_notEqual() {
            Mcq a = Mcq.builder().id(1L).status(McqStatus.DRAFT).build();
            Mcq b = Mcq.builder().id(2L).status(McqStatus.DRAFT).build();

            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("toString does not throw and contains class name")
        void toString_doesNotThrow() {
            Mcq mcq = Mcq.builder().id(1L).questionStem("Q").difficulty(Difficulty.MEDIUM)
                    .status(McqStatus.DRAFT).build();

            assertThat(mcq.toString()).contains("Mcq");
        }

        @Test
        @DisplayName("builder supports all McqStatus values")
        void builder_allStatusValues() {
            for (McqStatus s : McqStatus.values()) {
                Mcq mcq = Mcq.builder().status(s).build();
                assertThat(mcq.getStatus()).isEqualTo(s);
            }
        }

        @Test
        @DisplayName("builder supports all Difficulty values")
        void builder_allDifficultyValues() {
            for (Difficulty d : Difficulty.values()) {
                Mcq mcq = Mcq.builder().difficulty(d).build();
                assertThat(mcq.getDifficulty()).isEqualTo(d);
            }
        }

        @Test
        @DisplayName("comments list is settable and retrievable")
        void comments_listSetAndGet() {
            Mcq mcq = new Mcq();
            mcq.setComments(List.of());

            assertThat(mcq.getComments()).isEmpty();
        }

        @Test
        @DisplayName("techStack and topic can be set and retrieved")
        void techStack_and_topic_settable() {
            TechStack ts = new TechStack();
            Topic topic = new Topic();

            Mcq mcq = Mcq.builder().techStack(ts).topic(topic).status(McqStatus.DRAFT).build();

            assertThat(mcq.getTechStack()).isSameAs(ts);
            assertThat(mcq.getTopic()).isSameAs(topic);
        }
    }

    // =========================================================================
    // McqVersion
    // =========================================================================

    @Nested
    @DisplayName("McqVersion")
    class McqVersionTests {

        @Test
        @DisplayName("builder creates object with all supplied values")
        void builder_setsAllFields() {
            LocalDateTime ts = LocalDateTime.of(2024, 1, 15, 10, 0);

            McqVersion v = McqVersion.builder()
                    .id(10L)
                    .mcqId(5L)
                    .versionNumber(3)
                    .questionStem("What is OOP?")
                    .optionA("A paradigm")
                    .optionB("A language")
                    .optionC("A database")
                    .optionD("A tool")
                    .correctAnswer("A")
                    .difficulty("MEDIUM")
                    .changedByName("Alice")
                    .changedByEnterpriseId("E001")
                    .statusAtTime("APPROVED")
                    .changeNote("Fixed typo")
                    .createdAt(ts)
                    .build();

            assertThat(v.getId()).isEqualTo(10L);
            assertThat(v.getMcqId()).isEqualTo(5L);
            assertThat(v.getVersionNumber()).isEqualTo(3);
            assertThat(v.getQuestionStem()).isEqualTo("What is OOP?");
            assertThat(v.getOptionA()).isEqualTo("A paradigm");
            assertThat(v.getOptionB()).isEqualTo("A language");
            assertThat(v.getOptionC()).isEqualTo("A database");
            assertThat(v.getOptionD()).isEqualTo("A tool");
            assertThat(v.getCorrectAnswer()).isEqualTo("A");
            assertThat(v.getDifficulty()).isEqualTo("MEDIUM");
            assertThat(v.getChangedByName()).isEqualTo("Alice");
            assertThat(v.getChangedByEnterpriseId()).isEqualTo("E001");
            assertThat(v.getStatusAtTime()).isEqualTo("APPROVED");
            assertThat(v.getChangeNote()).isEqualTo("Fixed typo");
            assertThat(v.getCreatedAt()).isEqualTo(ts);
        }

        @Test
        @DisplayName("no-args constructor produces object with null fields")
        void noArgsConstructor_fieldsAreNull() {
            McqVersion v = new McqVersion();

            assertThat(v.getId()).isNull();
            assertThat(v.getMcqId()).isNull();
            assertThat(v.getCreatedAt()).isNull();
        }

        @Test
        @DisplayName("setters update all mutable fields")
        void setters_updateFields() {
            McqVersion v = new McqVersion();
            LocalDateTime ts = LocalDateTime.now();

            v.setId(99L);
            v.setMcqId(7L);
            v.setVersionNumber(2);
            v.setQuestionStem("Q stem");
            v.setOptionA("A");
            v.setOptionB("B");
            v.setOptionC("C");
            v.setOptionD("D");
            v.setCorrectAnswer("B");
            v.setDifficulty("HARD");
            v.setChangedByName("Bob");
            v.setChangedByEnterpriseId("E002");
            v.setStatusAtTime("DRAFT");
            v.setChangeNote("Initial");
            v.setCreatedAt(ts);

            assertThat(v.getId()).isEqualTo(99L);
            assertThat(v.getMcqId()).isEqualTo(7L);
            assertThat(v.getVersionNumber()).isEqualTo(2);
            assertThat(v.getCorrectAnswer()).isEqualTo("B");
            assertThat(v.getDifficulty()).isEqualTo("HARD");
            assertThat(v.getChangedByName()).isEqualTo("Bob");
            assertThat(v.getCreatedAt()).isEqualTo(ts);
        }

        @Test
        @DisplayName("@PrePersist onCreate() sets createdAt when it is null")
        void onCreate_setsCreatedAt_whenNull() {
            McqVersion v = new McqVersion();
            assertThat(v.getCreatedAt()).isNull();

            v.onCreate();

            assertThat(v.getCreatedAt()).isNotNull();
            assertThat(v.getCreatedAt()).isBeforeOrEqualTo(LocalDateTime.now());
        }

        @Test
        @DisplayName("@PrePersist onCreate() does NOT overwrite existing createdAt")
        void onCreate_doesNotOverwrite_existingCreatedAt() {
            LocalDateTime original = LocalDateTime.of(2023, 6, 1, 12, 0);
            McqVersion v = McqVersion.builder().createdAt(original).build();

            v.onCreate();

            assertThat(v.getCreatedAt()).isEqualTo(original);
        }

        @Test
        @DisplayName("equals and hashCode are consistent for same field values")
        void equalsAndHashCode_sameValues() {
            LocalDateTime ts = LocalDateTime.of(2024, 1, 1, 0, 0);
            McqVersion a = McqVersion.builder().id(1L).mcqId(2L).versionNumber(1).createdAt(ts).build();
            McqVersion b = McqVersion.builder().id(1L).mcqId(2L).versionNumber(1).createdAt(ts).build();

            assertThat(a).isEqualTo(b);
            assertThat(a.hashCode()).isEqualTo(b.hashCode());
        }

        @Test
        @DisplayName("equals returns false for different mcqId")
        void equals_differentMcqId_notEqual() {
            LocalDateTime ts = LocalDateTime.now();
            McqVersion a = McqVersion.builder().id(1L).mcqId(1L).createdAt(ts).build();
            McqVersion b = McqVersion.builder().id(1L).mcqId(2L).createdAt(ts).build();

            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("toString does not throw and contains class name")
        void toString_doesNotThrow() {
            McqVersion v = McqVersion.builder().id(1L).mcqId(1L).versionNumber(1)
                    .createdAt(LocalDateTime.now()).build();

            assertThat(v.toString()).contains("McqVersion");
        }

        @Test
        @DisplayName("changeNote can hold up to 500 characters")
        void changeNote_longValue() {
            String longNote = "A".repeat(500);
            McqVersion v = McqVersion.builder()
                    .createdAt(LocalDateTime.now())
                    .changeNote(longNote)
                    .build();

            assertThat(v.getChangeNote()).hasSize(500);
        }
    }

    // =========================================================================
    // QuizAttempt
    // =========================================================================

    @Nested
    @DisplayName("QuizAttempt")
    class QuizAttemptTests {

        @Test
        @DisplayName("builder creates object with all supplied values")
        void builder_setsAllFields() {
            LocalDateTime now = LocalDateTime.now();

            QuizAttempt attempt = QuizAttempt.builder()
                    .id(1L)
                    .sessionId(10L)
                    .candidateName("Alice Smith")
                    .candidateEmail("alice@example.com")
                    .answers("{\"1\":\"A\",\"2\":\"C\"}")
                    .score(8)
                    .totalQuestions(10)
                    .topicBreakdown("{\"Java\":{\"correct\":8,\"total\":10}}")
                    .status("TERMINATED")
                    .violationCount(2)
                    .violationScreenshot("base64data")
                    .timeTakenSeconds(1200)
                    .submittedAt(now)
                    .build();

            assertThat(attempt.getId()).isEqualTo(1L);
            assertThat(attempt.getSessionId()).isEqualTo(10L);
            assertThat(attempt.getCandidateName()).isEqualTo("Alice Smith");
            assertThat(attempt.getCandidateEmail()).isEqualTo("alice@example.com");
            assertThat(attempt.getAnswers()).isEqualTo("{\"1\":\"A\",\"2\":\"C\"}");
            assertThat(attempt.getScore()).isEqualTo(8);
            assertThat(attempt.getTotalQuestions()).isEqualTo(10);
            assertThat(attempt.getTopicBreakdown()).contains("Java");
            assertThat(attempt.getStatus()).isEqualTo("TERMINATED");
            assertThat(attempt.getViolationCount()).isEqualTo(2);
            assertThat(attempt.getViolationScreenshot()).isEqualTo("base64data");
            assertThat(attempt.getTimeTakenSeconds()).isEqualTo(1200);
            assertThat(attempt.getSubmittedAt()).isEqualTo(now);
        }

        @Test
        @DisplayName("@Builder.Default sets status to COMPLETED when not specified")
        void builderDefault_status_isCompleted() {
            QuizAttempt attempt = QuizAttempt.builder()
                    .sessionId(1L)
                    .candidateName("Bob")
                    .candidateEmail("bob@test.com")
                    .build();

            assertThat(attempt.getStatus()).isEqualTo("COMPLETED");
        }

        @Test
        @DisplayName("@Builder.Default sets violationCount to 0 when not specified")
        void builderDefault_violationCount_isZero() {
            QuizAttempt attempt = QuizAttempt.builder()
                    .sessionId(1L)
                    .candidateName("Bob")
                    .candidateEmail("bob@test.com")
                    .build();

            assertThat(attempt.getViolationCount()).isZero();
        }

        @Test
        @DisplayName("no-args constructor produces object with null fields")
        void noArgsConstructor_fieldsAreNull() {
            QuizAttempt attempt = new QuizAttempt();

            assertThat(attempt.getId()).isNull();
            assertThat(attempt.getCandidateName()).isNull();
            assertThat(attempt.getScore()).isNull();
        }

        @Test
        @DisplayName("setters update all mutable fields")
        void setters_updateFields() {
            QuizAttempt attempt = new QuizAttempt();
            LocalDateTime now = LocalDateTime.now();

            attempt.setId(5L);
            attempt.setSessionId(20L);
            attempt.setCandidateName("Carol");
            attempt.setCandidateEmail("carol@test.com");
            attempt.setAnswers("{\"1\":\"B\"}");
            attempt.setScore(7);
            attempt.setTotalQuestions(10);
            attempt.setTopicBreakdown("{}");
            attempt.setStatus("COMPLETED");
            attempt.setViolationCount(0);
            attempt.setViolationScreenshot(null);
            attempt.setTimeTakenSeconds(600);
            attempt.setSubmittedAt(now);

            assertThat(attempt.getId()).isEqualTo(5L);
            assertThat(attempt.getSessionId()).isEqualTo(20L);
            assertThat(attempt.getCandidateName()).isEqualTo("Carol");
            assertThat(attempt.getCandidateEmail()).isEqualTo("carol@test.com");
            assertThat(attempt.getScore()).isEqualTo(7);
            assertThat(attempt.getStatus()).isEqualTo("COMPLETED");
            assertThat(attempt.getViolationCount()).isZero();
            assertThat(attempt.getSubmittedAt()).isEqualTo(now);
        }

        @Test
        @DisplayName("equals and hashCode are consistent for same field values")
        void equalsAndHashCode_sameValues() {
            QuizAttempt a = QuizAttempt.builder().id(1L).sessionId(1L)
                    .candidateName("X").candidateEmail("x@x.com").build();
            QuizAttempt b = QuizAttempt.builder().id(1L).sessionId(1L)
                    .candidateName("X").candidateEmail("x@x.com").build();

            assertThat(a).isEqualTo(b);
            assertThat(a.hashCode()).isEqualTo(b.hashCode());
        }

        @Test
        @DisplayName("equals returns false for different candidateEmail")
        void equals_differentEmail_notEqual() {
            QuizAttempt a = QuizAttempt.builder().id(1L).candidateEmail("a@a.com").build();
            QuizAttempt b = QuizAttempt.builder().id(1L).candidateEmail("b@b.com").build();

            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("toString does not throw and contains class name")
        void toString_doesNotThrow() {
            QuizAttempt attempt = QuizAttempt.builder().id(1L).sessionId(1L)
                    .candidateName("Test").candidateEmail("t@t.com").build();

            assertThat(attempt.toString()).contains("QuizAttempt");
        }

        @Test
        @DisplayName("violationCount can be set to positive value via builder")
        void violationCount_positiveValue() {
            QuizAttempt attempt = QuizAttempt.builder()
                    .sessionId(1L).candidateName("Dan").candidateEmail("dan@d.com")
                    .violationCount(3).build();

            assertThat(attempt.getViolationCount()).isEqualTo(3);
        }

        @Test
        @DisplayName("null score is allowed")
        void nullScore_isAccepted() {
            QuizAttempt attempt = QuizAttempt.builder()
                    .sessionId(1L).candidateName("Eve").candidateEmail("eve@e.com")
                    .score(null).build();

            assertThat(attempt.getScore()).isNull();
        }
    }

    // =========================================================================
    // QuizSession
    // =========================================================================

    @Nested
    @DisplayName("QuizSession")
    class QuizSessionTests {

        @Test
        @DisplayName("builder creates object with all supplied values")
        void builder_setsAllFields() {
            LocalDateTime created = LocalDateTime.of(2024, 3, 1, 9, 0);
            LocalDateTime expires = LocalDateTime.of(2024, 3, 1, 12, 0);

            QuizSession session = QuizSession.builder()
                    .id(1L)
                    .title("Spring Boot Quiz")
                    .shareToken("abc-123-def")
                    .mcqIds("1,2,3,4,5")
                    .timeLimitMinutes(45)
                    .createdBy("E001")
                    .createdByName("Alice Admin")
                    .createdAt(created)
                    .expiresAt(expires)
                    .build();

            assertThat(session.getId()).isEqualTo(1L);
            assertThat(session.getTitle()).isEqualTo("Spring Boot Quiz");
            assertThat(session.getShareToken()).isEqualTo("abc-123-def");
            assertThat(session.getMcqIds()).isEqualTo("1,2,3,4,5");
            assertThat(session.getTimeLimitMinutes()).isEqualTo(45);
            assertThat(session.getCreatedBy()).isEqualTo("E001");
            assertThat(session.getCreatedByName()).isEqualTo("Alice Admin");
            assertThat(session.getCreatedAt()).isEqualTo(created);
            assertThat(session.getExpiresAt()).isEqualTo(expires);
        }

        @Test
        @DisplayName("@Builder.Default sets timeLimitMinutes to 30 when not specified")
        void builderDefault_timeLimitMinutes_is30() {
            QuizSession session = QuizSession.builder()
                    .title("Q")
                    .shareToken("tok")
                    .mcqIds("1,2")
                    .createdBy("E001")
                    .build();

            assertThat(session.getTimeLimitMinutes()).isEqualTo(30);
        }

        @Test
        @DisplayName("no-args constructor produces object with null/default fields")
        void noArgsConstructor_fieldsAreNull() {
            QuizSession session = new QuizSession();

            assertThat(session.getId()).isNull();
            assertThat(session.getTitle()).isNull();
            assertThat(session.getShareToken()).isNull();
        }

        @Test
        @DisplayName("setters update all mutable fields")
        void setters_updateFields() {
            QuizSession session = new QuizSession();
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime later = now.plusHours(3);

            session.setId(7L);
            session.setTitle("Java Fundamentals");
            session.setShareToken("token-xyz");
            session.setMcqIds("10,20,30");
            session.setTimeLimitMinutes(60);
            session.setCreatedBy("E999");
            session.setCreatedByName("Bob Manager");
            session.setCreatedAt(now);
            session.setExpiresAt(later);

            assertThat(session.getId()).isEqualTo(7L);
            assertThat(session.getTitle()).isEqualTo("Java Fundamentals");
            assertThat(session.getShareToken()).isEqualTo("token-xyz");
            assertThat(session.getMcqIds()).isEqualTo("10,20,30");
            assertThat(session.getTimeLimitMinutes()).isEqualTo(60);
            assertThat(session.getCreatedBy()).isEqualTo("E999");
            assertThat(session.getCreatedByName()).isEqualTo("Bob Manager");
            assertThat(session.getCreatedAt()).isEqualTo(now);
            assertThat(session.getExpiresAt()).isEqualTo(later);
        }

        @Test
        @DisplayName("equals and hashCode are consistent for same field values")
        void equalsAndHashCode_sameValues() {
            QuizSession a = QuizSession.builder().id(1L).title("T").shareToken("tok")
                    .mcqIds("1").createdBy("E1").build();
            QuizSession b = QuizSession.builder().id(1L).title("T").shareToken("tok")
                    .mcqIds("1").createdBy("E1").build();

            assertThat(a).isEqualTo(b);
            assertThat(a.hashCode()).isEqualTo(b.hashCode());
        }

        @Test
        @DisplayName("equals returns false for different shareToken")
        void equals_differentShareToken_notEqual() {
            QuizSession a = QuizSession.builder().id(1L).title("T").shareToken("tok1")
                    .mcqIds("1").createdBy("E1").build();
            QuizSession b = QuizSession.builder().id(1L).title("T").shareToken("tok2")
                    .mcqIds("1").createdBy("E1").build();

            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("toString does not throw and contains class name")
        void toString_doesNotThrow() {
            QuizSession session = QuizSession.builder().id(1L).title("T").shareToken("tok")
                    .mcqIds("1").createdBy("E1").build();

            assertThat(session.toString()).contains("QuizSession");
        }

        @Test
        @DisplayName("expiresAt can be null (no expiry)")
        void expiresAt_canBeNull() {
            QuizSession session = QuizSession.builder()
                    .title("Open Session")
                    .shareToken("open-tok")
                    .mcqIds("1,2")
                    .createdBy("E001")
                    .expiresAt(null)
                    .build();

            assertThat(session.getExpiresAt()).isNull();
        }

        @Test
        @DisplayName("timeLimitMinutes can be overridden via builder")
        void timeLimitMinutes_customValue() {
            QuizSession session = QuizSession.builder()
                    .title("Long Quiz")
                    .shareToken("long-tok")
                    .mcqIds("1")
                    .createdBy("E001")
                    .timeLimitMinutes(90)
                    .build();

            assertThat(session.getTimeLimitMinutes()).isEqualTo(90);
        }
    }
}
