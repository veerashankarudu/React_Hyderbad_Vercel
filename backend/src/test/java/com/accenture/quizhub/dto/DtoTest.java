package com.accenture.quizhub.dto;

import com.accenture.quizhub.dto.request.McqRequest;
import com.accenture.quizhub.dto.response.*;
import com.accenture.quizhub.enums.Difficulty;
import com.accenture.quizhub.enums.McqStatus;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class DtoTest {

    // -------------------------------------------------------------------------
    // McqResponse
    // -------------------------------------------------------------------------
    @Nested
    class McqResponseTest {

        @Test
        void builder_setsAllFields() {
            LocalDateTime now = LocalDateTime.of(2024, 1, 15, 10, 30);
            CommentResponse comment = CommentResponse.builder()
                    .id(99L).comment("Looks good").reviewerEnterpriseId("rv01").createdAt(now).build();

            McqResponse mcq = McqResponse.builder()
                    .id(1L)
                    .questionStem("What is Java?")
                    .optionA("A language")
                    .optionB("A framework")
                    .optionC("A database")
                    .optionD("An OS")
                    .correctAnswer("A")
                    .difficulty(Difficulty.EASY)
                    .status(McqStatus.APPROVED)
                    .techStackId(10L)
                    .techStackName("Java")
                    .topicId(20L)
                    .topicName("Basics")
                    .creatorEnterpriseId("cr01")
                    .creatorFullName("Alice")
                    .reviewerEnterpriseId("rv01")
                    .reviewerFullName("Bob")
                    .comments(List.of(comment))
                    .version(2)
                    .createdAt(now)
                    .updatedAt(now)
                    .aiWarning("Minor issue")
                    .aiScore(85)
                    .aiRisk("LOW")
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
            assertThat(mcq.getTechStackId()).isEqualTo(10L);
            assertThat(mcq.getTechStackName()).isEqualTo("Java");
            assertThat(mcq.getTopicId()).isEqualTo(20L);
            assertThat(mcq.getTopicName()).isEqualTo("Basics");
            assertThat(mcq.getCreatorEnterpriseId()).isEqualTo("cr01");
            assertThat(mcq.getCreatorFullName()).isEqualTo("Alice");
            assertThat(mcq.getReviewerEnterpriseId()).isEqualTo("rv01");
            assertThat(mcq.getReviewerFullName()).isEqualTo("Bob");
            assertThat(mcq.getComments()).hasSize(1).containsExactly(comment);
            assertThat(mcq.getVersion()).isEqualTo(2);
            assertThat(mcq.getCreatedAt()).isEqualTo(now);
            assertThat(mcq.getUpdatedAt()).isEqualTo(now);
            assertThat(mcq.getAiWarning()).isEqualTo("Minor issue");
            assertThat(mcq.getAiScore()).isEqualTo(85);
            assertThat(mcq.getAiRisk()).isEqualTo("LOW");
        }

        @Test
        void noArgsConstructor_allFieldsNull() {
            McqResponse mcq = new McqResponse();
            assertThat(mcq.getId()).isNull();
            assertThat(mcq.getQuestionStem()).isNull();
            assertThat(mcq.getDifficulty()).isNull();
            assertThat(mcq.getStatus()).isNull();
            assertThat(mcq.getComments()).isNull();
            assertThat(mcq.getCreatedAt()).isNull();
        }

        @Test
        void setters_updateFields() {
            McqResponse mcq = new McqResponse();
            mcq.setId(5L);
            mcq.setQuestionStem("New question");
            mcq.setDifficulty(Difficulty.HARD);
            mcq.setStatus(McqStatus.REJECTED);
            mcq.setAiScore(60);

            assertThat(mcq.getId()).isEqualTo(5L);
            assertThat(mcq.getQuestionStem()).isEqualTo("New question");
            assertThat(mcq.getDifficulty()).isEqualTo(Difficulty.HARD);
            assertThat(mcq.getStatus()).isEqualTo(McqStatus.REJECTED);
            assertThat(mcq.getAiScore()).isEqualTo(60);
        }

        @Test
        void equals_twoObjectsWithSameValues_areEqual() {
            LocalDateTime ts = LocalDateTime.of(2024, 6, 1, 12, 0);
            McqResponse a = McqResponse.builder().id(1L).questionStem("Q1")
                    .difficulty(Difficulty.MEDIUM).status(McqStatus.DRAFT)
                    .createdAt(ts).build();
            McqResponse b = McqResponse.builder().id(1L).questionStem("Q1")
                    .difficulty(Difficulty.MEDIUM).status(McqStatus.DRAFT)
                    .createdAt(ts).build();
            assertThat(a).isEqualTo(b);
            assertThat(a.hashCode()).isEqualTo(b.hashCode());
        }

        @Test
        void equals_differentIds_areNotEqual() {
            McqResponse a = McqResponse.builder().id(1L).questionStem("Q").build();
            McqResponse b = McqResponse.builder().id(2L).questionStem("Q").build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        void allArgsConstructor_setsAllFields() {
            LocalDateTime ts = LocalDateTime.now();
            CommentResponse comment = CommentResponse.builder().id(1L).build();
            McqResponse mcq = new McqResponse(
                    3L, "Stem", "A", "B", "C", "D", "B",
                    "SINGLE", Difficulty.MEDIUM, McqStatus.READY_FOR_REVIEW,
                    7L, "Spring", 8L, "DI",
                    "cr02", "Carol", "rv02", "Dave",
                    List.of(comment), 1, ts, ts, null, 90, "HIGH", null, null
            );
            assertThat(mcq.getId()).isEqualTo(3L);
            assertThat(mcq.getDifficulty()).isEqualTo(Difficulty.MEDIUM);
            assertThat(mcq.getStatus()).isEqualTo(McqStatus.READY_FOR_REVIEW);
            assertThat(mcq.getComments()).containsExactly(comment);
            assertThat(mcq.getAiWarning()).isNull();
        }

        @Test
        void toString_containsKeyFields() {
            McqResponse mcq = McqResponse.builder().id(42L).questionStem("Test Q").build();
            String str = mcq.toString();
            assertThat(str).contains("42").contains("Test Q");
        }
    }

    // -------------------------------------------------------------------------
    // AuditLogResponse
    // -------------------------------------------------------------------------
    @Nested
    class AuditLogResponseTest {

        @Test
        void builder_setsAllFields() {
            LocalDateTime ts = LocalDateTime.of(2024, 3, 10, 8, 0);
            AuditLogResponse log = AuditLogResponse.builder()
                    .id(100L)
                    .actorEnterpriseId("actor01")
                    .action("LOGIN")
                    .targetEnterpriseId("target01")
                    .details("User logged in")
                    .timestamp(ts)
                    .build();

            assertThat(log.getId()).isEqualTo(100L);
            assertThat(log.getActorEnterpriseId()).isEqualTo("actor01");
            assertThat(log.getAction()).isEqualTo("LOGIN");
            assertThat(log.getTargetEnterpriseId()).isEqualTo("target01");
            assertThat(log.getDetails()).isEqualTo("User logged in");
            assertThat(log.getTimestamp()).isEqualTo(ts);
        }

        @Test
        void noArgsConstructor_allFieldsNull() {
            AuditLogResponse log = new AuditLogResponse();
            assertThat(log.getId()).isNull();
            assertThat(log.getActorEnterpriseId()).isNull();
            assertThat(log.getAction()).isNull();
            assertThat(log.getTimestamp()).isNull();
        }

        @Test
        void setters_updateFields() {
            AuditLogResponse log = new AuditLogResponse();
            LocalDateTime ts = LocalDateTime.of(2024, 5, 20, 14, 30);
            log.setId(200L);
            log.setActorEnterpriseId("actor02");
            log.setAction("LOGOUT");
            log.setTimestamp(ts);

            assertThat(log.getId()).isEqualTo(200L);
            assertThat(log.getActorEnterpriseId()).isEqualTo("actor02");
            assertThat(log.getAction()).isEqualTo("LOGOUT");
            assertThat(log.getTimestamp()).isEqualTo(ts);
        }

        @Test
        void equals_sameValues_areEqual() {
            LocalDateTime ts = LocalDateTime.of(2024, 1, 1, 0, 0);
            AuditLogResponse a = AuditLogResponse.builder()
                    .id(1L).actorEnterpriseId("a1").action("ACT").timestamp(ts).build();
            AuditLogResponse b = AuditLogResponse.builder()
                    .id(1L).actorEnterpriseId("a1").action("ACT").timestamp(ts).build();
            assertThat(a).isEqualTo(b);
            assertThat(a.hashCode()).isEqualTo(b.hashCode());
        }

        @Test
        void equals_differentAction_areNotEqual() {
            AuditLogResponse a = AuditLogResponse.builder().id(1L).action("LOGIN").build();
            AuditLogResponse b = AuditLogResponse.builder().id(1L).action("LOGOUT").build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        void allArgsConstructor_setsAllFields() {
            LocalDateTime ts = LocalDateTime.now();
            AuditLogResponse log = new AuditLogResponse(5L, "actorX", "DELETE", "targetX", "Deleted entity", ts);
            assertThat(log.getId()).isEqualTo(5L);
            assertThat(log.getActorEnterpriseId()).isEqualTo("actorX");
            assertThat(log.getAction()).isEqualTo("DELETE");
            assertThat(log.getTargetEnterpriseId()).isEqualTo("targetX");
            assertThat(log.getDetails()).isEqualTo("Deleted entity");
            assertThat(log.getTimestamp()).isEqualTo(ts);
        }

        @Test
        void toString_containsKeyFields() {
            AuditLogResponse log = AuditLogResponse.builder().id(7L).action("CREATE").build();
            assertThat(log.toString()).contains("7").contains("CREATE");
        }

        @Test
        void setters_remainingFields() {
            AuditLogResponse log = new AuditLogResponse();
            log.setTargetEnterpriseId("targetY");
            log.setDetails("Some details here");
            assertThat(log.getTargetEnterpriseId()).isEqualTo("targetY");
            assertThat(log.getDetails()).isEqualTo("Some details here");
        }

        @Test
        void equals_differentDetails_notEqual() {
            AuditLogResponse a = AuditLogResponse.builder()
                    .id(1L).actorEnterpriseId("a").action("ACT")
                    .targetEnterpriseId("T").details("Detail A").build();
            AuditLogResponse b = AuditLogResponse.builder()
                    .id(1L).actorEnterpriseId("a").action("ACT")
                    .targetEnterpriseId("T").details("Detail B").build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        void equals_twoFullyPopulated_equal() {
            LocalDateTime ts = LocalDateTime.of(2024, 2, 2, 2, 2);
            AuditLogResponse a = new AuditLogResponse(1L, "actA", "LOGIN", "tgtA", "Details", ts);
            AuditLogResponse b = new AuditLogResponse(1L, "actA", "LOGIN", "tgtA", "Details", ts);
            assertThat(a).isEqualTo(b);
            assertThat(a.hashCode()).isEqualTo(b.hashCode());
        }
    }

    // -------------------------------------------------------------------------
    // AuthResponse
    // -------------------------------------------------------------------------
    @Nested
    class AuthResponseTest {

        @Test
        void builder_setsAllFields() {
            AuthResponse auth = AuthResponse.builder()
                    .token("eyJhbGciOiJIUzI1NiJ9.payload.sig")
                    .enterpriseId("EMP001")
                    .fullName("Alice Smith")
                    .email("alice@example.com")
                    .role("CREATOR")
                    .build();

            assertThat(auth.getToken()).isEqualTo("eyJhbGciOiJIUzI1NiJ9.payload.sig");
            assertThat(auth.getEnterpriseId()).isEqualTo("EMP001");
            assertThat(auth.getFullName()).isEqualTo("Alice Smith");
            assertThat(auth.getEmail()).isEqualTo("alice@example.com");
            assertThat(auth.getRole()).isEqualTo("CREATOR");
        }

        @Test
        void noArgsConstructor_allFieldsNull() {
            AuthResponse auth = new AuthResponse();
            assertThat(auth.getToken()).isNull();
            assertThat(auth.getEnterpriseId()).isNull();
            assertThat(auth.getFullName()).isNull();
            assertThat(auth.getEmail()).isNull();
            assertThat(auth.getRole()).isNull();
        }

        @Test
        void setters_updateFields() {
            AuthResponse auth = new AuthResponse();
            auth.setToken("token123");
            auth.setEnterpriseId("EMP002");
            auth.setFullName("Bob Jones");
            auth.setEmail("bob@example.com");
            auth.setRole("REVIEWER");

            assertThat(auth.getToken()).isEqualTo("token123");
            assertThat(auth.getEnterpriseId()).isEqualTo("EMP002");
            assertThat(auth.getFullName()).isEqualTo("Bob Jones");
            assertThat(auth.getEmail()).isEqualTo("bob@example.com");
            assertThat(auth.getRole()).isEqualTo("REVIEWER");
        }

        @Test
        void equals_sameValues_areEqual() {
            AuthResponse a = AuthResponse.builder()
                    .token("t").enterpriseId("e1").fullName("F").email("e@e.com").role("ADMIN").build();
            AuthResponse b = AuthResponse.builder()
                    .token("t").enterpriseId("e1").fullName("F").email("e@e.com").role("ADMIN").build();
            assertThat(a).isEqualTo(b);
            assertThat(a.hashCode()).isEqualTo(b.hashCode());
        }

        @Test
        void equals_differentToken_areNotEqual() {
            AuthResponse a = AuthResponse.builder().token("tokenA").enterpriseId("e1").build();
            AuthResponse b = AuthResponse.builder().token("tokenB").enterpriseId("e1").build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        void allArgsConstructor_setsAllFields() {
            AuthResponse auth = new AuthResponse("jwt-token", "EMP003", "Carol White", "carol@example.com", "ADMIN");
            assertThat(auth.getToken()).isEqualTo("jwt-token");
            assertThat(auth.getEnterpriseId()).isEqualTo("EMP003");
            assertThat(auth.getFullName()).isEqualTo("Carol White");
            assertThat(auth.getEmail()).isEqualTo("carol@example.com");
            assertThat(auth.getRole()).isEqualTo("ADMIN");
        }

        @Test
        void toString_containsKeyFields() {
            AuthResponse auth = AuthResponse.builder().enterpriseId("EMP999").role("CREATOR").build();
            assertThat(auth.toString()).contains("EMP999").contains("CREATOR");
        }
    }

    // -------------------------------------------------------------------------
    // UserSummary
    // -------------------------------------------------------------------------
    @Nested
    class UserSummaryTest {

        @Test
        void builder_setsAllFields() {
            List<String> stacks = List.of("Java", "Spring Boot");
            UserSummary user = UserSummary.builder()
                    .id(10L)
                    .enterpriseId("EMP010")
                    .fullName("Dave Lee")
                    .role("CREATOR")
                    .email("dave@example.com")
                    .techStacks(stacks)
                    .approved(true)
                    .build();

            assertThat(user.getId()).isEqualTo(10L);
            assertThat(user.getEnterpriseId()).isEqualTo("EMP010");
            assertThat(user.getFullName()).isEqualTo("Dave Lee");
            assertThat(user.getRole()).isEqualTo("CREATOR");
            assertThat(user.getEmail()).isEqualTo("dave@example.com");
            assertThat(user.getTechStacks()).containsExactly("Java", "Spring Boot");
            assertThat(user.isApproved()).isTrue();
        }

        @Test
        void noArgsConstructor_defaultValues() {
            UserSummary user = new UserSummary();
            assertThat(user.getId()).isNull();
            assertThat(user.getEnterpriseId()).isNull();
            assertThat(user.getFullName()).isNull();
            assertThat(user.getTechStacks()).isNull();
            assertThat(user.isApproved()).isFalse();
        }

        @Test
        void setters_updateFields() {
            UserSummary user = new UserSummary();
            user.setId(20L);
            user.setEnterpriseId("EMP020");
            user.setFullName("Eve Brown");
            user.setRole("REVIEWER");
            user.setEmail("eve@example.com");
            user.setTechStacks(List.of("Python"));
            user.setApproved(true);

            assertThat(user.getId()).isEqualTo(20L);
            assertThat(user.getEnterpriseId()).isEqualTo("EMP020");
            assertThat(user.getFullName()).isEqualTo("Eve Brown");
            assertThat(user.getRole()).isEqualTo("REVIEWER");
            assertThat(user.getTechStacks()).containsExactly("Python");
            assertThat(user.isApproved()).isTrue();
        }

        @Test
        void approved_falseByDefault_setterWorks() {
            UserSummary user = UserSummary.builder().id(1L).approved(false).build();
            assertThat(user.isApproved()).isFalse();
            user.setApproved(true);
            assertThat(user.isApproved()).isTrue();
        }

        @Test
        void equals_sameValues_areEqual() {
            List<String> stacks = List.of("Java");
            UserSummary a = UserSummary.builder()
                    .id(1L).enterpriseId("E1").fullName("F").role("R").email("e@e").techStacks(stacks).approved(true).build();
            UserSummary b = UserSummary.builder()
                    .id(1L).enterpriseId("E1").fullName("F").role("R").email("e@e").techStacks(stacks).approved(true).build();
            assertThat(a).isEqualTo(b);
            assertThat(a.hashCode()).isEqualTo(b.hashCode());
        }

        @Test
        void equals_differentApproved_areNotEqual() {
            UserSummary a = UserSummary.builder().id(1L).approved(true).build();
            UserSummary b = UserSummary.builder().id(1L).approved(false).build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        void allArgsConstructor_setsAllFields() {
            List<String> stacks = List.of("Node.js");
            UserSummary user = new UserSummary(30L, "EMP030", "Frank", "ADMIN", "frank@example.com", stacks, true);
            assertThat(user.getId()).isEqualTo(30L);
            assertThat(user.getRole()).isEqualTo("ADMIN");
            assertThat(user.getTechStacks()).containsExactly("Node.js");
            assertThat(user.isApproved()).isTrue();
        }

        @Test
        void equals_null_returnsFalse() {
            UserSummary user = UserSummary.builder().id(1L).enterpriseId("E1").build();
            assertThat(user.equals(null)).isFalse();
        }

        @Test
        void equals_differentType_returnsFalse() {
            UserSummary user = UserSummary.builder().id(1L).enterpriseId("E1").build();
            assertThat(user.equals("not a user")).isFalse();
        }

        @Test
        void equals_differentTechStacks_notEqual() {
            UserSummary a = UserSummary.builder().id(1L).techStacks(List.of("Java")).build();
            UserSummary b = UserSummary.builder().id(1L).techStacks(List.of("Python")).build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        void toString_containsKeyFields() {
            UserSummary user = UserSummary.builder()
                    .id(42L).enterpriseId("EMP_TS_42").fullName("ToString User").build();
            String str = user.toString();
            assertThat(str).isNotNull().isNotEmpty();
        }

        @Test
        void techStacks_emptyList() {
            UserSummary user = UserSummary.builder().id(1L).techStacks(List.of()).build();
            assertThat(user.getTechStacks()).isEmpty();
        }

        @Test
        void email_setterAndGetter() {
            UserSummary user = new UserSummary();
            user.setEmail("test@domain.com");
            assertThat(user.getEmail()).isEqualTo("test@domain.com");
        }
    }

    // -------------------------------------------------------------------------
    // CommentResponse
    // -------------------------------------------------------------------------
    @Nested
    class CommentResponseTest {

        @Test
        void builder_setsAllFields() {
            LocalDateTime ts = LocalDateTime.of(2024, 7, 4, 9, 0);
            CommentResponse c = CommentResponse.builder()
                    .id(50L)
                    .comment("Needs revision")
                    .reviewerEnterpriseId("rv10")
                    .createdAt(ts)
                    .build();

            assertThat(c.getId()).isEqualTo(50L);
            assertThat(c.getComment()).isEqualTo("Needs revision");
            assertThat(c.getReviewerEnterpriseId()).isEqualTo("rv10");
            assertThat(c.getCreatedAt()).isEqualTo(ts);
        }

        @Test
        void noArgsConstructor_allFieldsNull() {
            CommentResponse c = new CommentResponse();
            assertThat(c.getId()).isNull();
            assertThat(c.getComment()).isNull();
            assertThat(c.getReviewerEnterpriseId()).isNull();
            assertThat(c.getCreatedAt()).isNull();
        }

        @Test
        void setters_updateFields() {
            CommentResponse c = new CommentResponse();
            LocalDateTime ts = LocalDateTime.of(2024, 8, 1, 10, 0);
            c.setId(60L);
            c.setComment("LGTM");
            c.setReviewerEnterpriseId("rv11");
            c.setCreatedAt(ts);

            assertThat(c.getId()).isEqualTo(60L);
            assertThat(c.getComment()).isEqualTo("LGTM");
            assertThat(c.getReviewerEnterpriseId()).isEqualTo("rv11");
            assertThat(c.getCreatedAt()).isEqualTo(ts);
        }

        @Test
        void equals_sameValues_areEqual() {
            LocalDateTime ts = LocalDateTime.of(2024, 9, 9, 9, 9);
            CommentResponse a = CommentResponse.builder().id(1L).comment("C1").reviewerEnterpriseId("rv1").createdAt(ts).build();
            CommentResponse b = CommentResponse.builder().id(1L).comment("C1").reviewerEnterpriseId("rv1").createdAt(ts).build();
            assertThat(a).isEqualTo(b);
            assertThat(a.hashCode()).isEqualTo(b.hashCode());
        }

        @Test
        void equals_differentComment_areNotEqual() {
            CommentResponse a = CommentResponse.builder().id(1L).comment("Approved").build();
            CommentResponse b = CommentResponse.builder().id(1L).comment("Rejected").build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        void allArgsConstructor_setsAllFields() {
            LocalDateTime ts = LocalDateTime.now();
            CommentResponse c = new CommentResponse(70L, "All good", "rv12", ts);
            assertThat(c.getId()).isEqualTo(70L);
            assertThat(c.getComment()).isEqualTo("All good");
            assertThat(c.getReviewerEnterpriseId()).isEqualTo("rv12");
            assertThat(c.getCreatedAt()).isEqualTo(ts);
        }

        @Test
        void toString_containsKeyFields() {
            CommentResponse c = CommentResponse.builder().id(55L).comment("Test comment").build();
            assertThat(c.toString()).contains("55").contains("Test comment");
        }
    }

    // -------------------------------------------------------------------------
    // McqRequest
    // -------------------------------------------------------------------------
    @Nested
    class McqRequestTest {

        @Test
        void defaultConstructor_sendForReviewIsFalse() {
            McqRequest req = new McqRequest();
            assertThat(req.isSendForReview()).isFalse();
        }

        @Test
        void defaultConstructor_allOtherFieldsNull() {
            McqRequest req = new McqRequest();
            assertThat(req.getQuestionStem()).isNull();
            assertThat(req.getTechStackId()).isNull();
            assertThat(req.getTopicId()).isNull();
            assertThat(req.getDifficulty()).isNull();
            assertThat(req.getOptionA()).isNull();
            assertThat(req.getOptionB()).isNull();
            assertThat(req.getOptionC()).isNull();
            assertThat(req.getOptionD()).isNull();
            assertThat(req.getCorrectAnswer()).isNull();
        }

        @Test
        void setters_updateAllFields() {
            McqRequest req = new McqRequest();
            req.setQuestionStem("Which keyword is used to inherit?");
            req.setTechStackId(1L);
            req.setTopicId(2L);
            req.setDifficulty(Difficulty.MEDIUM);
            req.setOptionA("extends");
            req.setOptionB("implements");
            req.setOptionC("inherits");
            req.setOptionD("super");
            req.setCorrectAnswer("A");
            req.setSendForReview(true);

            assertThat(req.getQuestionStem()).isEqualTo("Which keyword is used to inherit?");
            assertThat(req.getTechStackId()).isEqualTo(1L);
            assertThat(req.getTopicId()).isEqualTo(2L);
            assertThat(req.getDifficulty()).isEqualTo(Difficulty.MEDIUM);
            assertThat(req.getOptionA()).isEqualTo("extends");
            assertThat(req.getOptionB()).isEqualTo("implements");
            assertThat(req.getOptionC()).isEqualTo("inherits");
            assertThat(req.getOptionD()).isEqualTo("super");
            assertThat(req.getCorrectAnswer()).isEqualTo("A");
            assertThat(req.isSendForReview()).isTrue();
        }

        @Test
        void sendForReview_canBeSetToTrue() {
            McqRequest req = new McqRequest();
            assertThat(req.isSendForReview()).isFalse();
            req.setSendForReview(true);
            assertThat(req.isSendForReview()).isTrue();
        }

        @Test
        void sendForReview_canBeSetBackToFalse() {
            McqRequest req = new McqRequest();
            req.setSendForReview(true);
            req.setSendForReview(false);
            assertThat(req.isSendForReview()).isFalse();
        }

        @Test
        void equals_sameValues_areEqual() {
            McqRequest a = new McqRequest();
            a.setQuestionStem("Q");
            a.setTechStackId(1L);
            a.setDifficulty(Difficulty.HARD);
            a.setOptionA("A");
            a.setOptionB("B");
            a.setOptionC("C");
            a.setOptionD("D");
            a.setCorrectAnswer("B");

            McqRequest b = new McqRequest();
            b.setQuestionStem("Q");
            b.setTechStackId(1L);
            b.setDifficulty(Difficulty.HARD);
            b.setOptionA("A");
            b.setOptionB("B");
            b.setOptionC("C");
            b.setOptionD("D");
            b.setCorrectAnswer("B");

            assertThat(a).isEqualTo(b);
            assertThat(a.hashCode()).isEqualTo(b.hashCode());
        }

        @Test
        void equals_differentDifficulty_areNotEqual() {
            McqRequest a = new McqRequest();
            a.setDifficulty(Difficulty.EASY);
            McqRequest b = new McqRequest();
            b.setDifficulty(Difficulty.HARD);
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        void toString_containsKeyFields() {
            McqRequest req = new McqRequest();
            req.setQuestionStem("Sample question");
            req.setDifficulty(Difficulty.EASY);
            assertThat(req.toString()).contains("Sample question").contains("EASY");
        }
    }
}
