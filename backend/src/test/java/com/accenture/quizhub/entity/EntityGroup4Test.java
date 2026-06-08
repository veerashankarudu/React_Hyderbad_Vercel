package com.accenture.quizhub.entity;

import com.accenture.quizhub.enums.Difficulty;
import com.accenture.quizhub.enums.McqStatus;
import com.accenture.quizhub.enums.QuestionType;
import com.accenture.quizhub.enums.Role;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * Additional Lombok/POJO tests to boost JaCoCo coverage.
 * Focuses on all-args constructors, edge cases, and fields not exercised in
 * EntityGroup1–3. No Spring context required.
 */
@DisplayName("EntityGroup4 – Mcq (extra), ChatMessage (extra), McqVersion (extra), ReviewComment, QuizAttempt (extra)")
class EntityGroup4Test {

    // =========================================================================
    // Mcq – additional coverage
    // =========================================================================

    @Nested
    @DisplayName("Mcq – additional coverage")
    class McqAdditionalTests {

        private User buildUser(Long id, String eid) {
            return User.builder()
                    .id(id).enterpriseId(eid).fullName("User " + eid)
                    .email(eid + "@test.com").passwordHash("hash").role(Role.SME)
                    .build();
        }

        @Test
        @DisplayName("all-args constructor sets every field")
        void allArgsConstructor_setsEveryField() {
            LocalDateTime now = LocalDateTime.of(2024, 5, 1, 9, 0);
            User creator  = buildUser(1L, "CR01");
            User reviewer = buildUser(2L, "RV01");
            TechStack ts  = TechStack.builder().id(10L).name("Java").build();
            Topic topic   = Topic.builder().id(20L).name("OOP").techStack(ts).build();

            Mcq mcq = new Mcq(
                    99L,
                    "What is polymorphism?",
                    "Overloading",
                    "Overriding",
                    "Inheritance",
                    "Encapsulation",
                    "B",
                    null,
                    QuestionType.SINGLE,
                    Difficulty.HARD,
                    McqStatus.APPROVED,
                    ts,
                    topic,
                    creator,
                    reviewer,
                    List.of(),
                    3,
                    95,
                    "LOW",
                    "Reviewed",
                    null,
                    null,
                    null,
                    "TEXT",
                    now,
                    now
            );

            assertThat(mcq.getId()).isEqualTo(99L);
            assertThat(mcq.getQuestionStem()).isEqualTo("What is polymorphism?");
            assertThat(mcq.getOptionA()).isEqualTo("Overloading");
            assertThat(mcq.getOptionB()).isEqualTo("Overriding");
            assertThat(mcq.getOptionC()).isEqualTo("Inheritance");
            assertThat(mcq.getOptionD()).isEqualTo("Encapsulation");
            assertThat(mcq.getCorrectAnswer()).isEqualTo("B");
            assertThat(mcq.getDifficulty()).isEqualTo(Difficulty.HARD);
            assertThat(mcq.getStatus()).isEqualTo(McqStatus.APPROVED);
            assertThat(mcq.getTechStack()).isSameAs(ts);
            assertThat(mcq.getTopic()).isSameAs(topic);
            assertThat(mcq.getCreator()).isSameAs(creator);
            assertThat(mcq.getReviewer()).isSameAs(reviewer);
            assertThat(mcq.getComments()).isEmpty();
            assertThat(mcq.getVersion()).isEqualTo(3);
            assertThat(mcq.getAiScore()).isEqualTo(95);
            assertThat(mcq.getAiRisk()).isEqualTo("LOW");
            assertThat(mcq.getAiWarning()).isEqualTo("Reviewed");
            assertThat(mcq.getCreatedAt()).isEqualTo(now);
            assertThat(mcq.getUpdatedAt()).isEqualTo(now);
        }

        @Test
        @DisplayName("builder with non-empty ReviewComment list")
        void builder_withReviewCommentList() {
            User creator  = buildUser(3L, "CR02");
            User reviewer = buildUser(4L, "RV02");

            Mcq parent = Mcq.builder()
                    .id(10L).questionStem("Q").optionA("A").optionB("B").optionC("C").optionD("D")
                    .correctAnswer("A").difficulty(Difficulty.EASY).status(McqStatus.DRAFT)
                    .creator(creator).build();

            ReviewComment rc = ReviewComment.builder()
                    .id(1L).mcq(parent).reviewer(reviewer).comment("Good question").build();

            parent.setComments(List.of(rc));

            assertThat(parent.getComments()).hasSize(1);
            assertThat(parent.getComments().get(0).getComment()).isEqualTo("Good question");
        }

        @Test
        @DisplayName("all optional fields can be null individually")
        void optionalFields_canBeNull() {
            Mcq mcq = Mcq.builder()
                    .questionStem("Q").optionA("A").optionB("B").optionC("C").optionD("D")
                    .correctAnswer("C").difficulty(Difficulty.MEDIUM).status(McqStatus.DRAFT)
                    .build();

            assertThat(mcq.getId()).isNull();
            assertThat(mcq.getTechStack()).isNull();
            assertThat(mcq.getTopic()).isNull();
            assertThat(mcq.getCreator()).isNull();
            assertThat(mcq.getReviewer()).isNull();
            assertThat(mcq.getComments()).isNull();
            assertThat(mcq.getVersion()).isNull();
            assertThat(mcq.getAiScore()).isNull();
            assertThat(mcq.getAiRisk()).isNull();
            assertThat(mcq.getAiWarning()).isNull();
            assertThat(mcq.getCreatedAt()).isNull();
            assertThat(mcq.getUpdatedAt()).isNull();
        }

        @Test
        @DisplayName("aiWarning is @Transient – can be set and retrieved in memory")
        void aiWarning_transientField_setAndGet() {
            Mcq mcq = Mcq.builder().questionStem("Q").difficulty(Difficulty.EASY)
                    .status(McqStatus.DRAFT).build();
            mcq.setAiWarning("Potential bias detected");
            assertThat(mcq.getAiWarning()).isEqualTo("Potential bias detected");
        }

        @Test
        @DisplayName("comments list can be replaced via setter")
        void comments_mutableViaSetter() {
            Mcq mcq = Mcq.builder().questionStem("Q").difficulty(Difficulty.EASY)
                    .status(McqStatus.DRAFT).build();
            mcq.setComments(new ArrayList<>());
            assertThat(mcq.getComments()).isEmpty();
        }

        @Test
        @DisplayName("version field starts at null and can be set to any integer")
        void version_setAndGet() {
            Mcq mcq = new Mcq();
            assertThat(mcq.getVersion()).isNull();
            mcq.setVersion(10);
            assertThat(mcq.getVersion()).isEqualTo(10);
        }

        @Test
        @DisplayName("READY_FOR_REVIEW status can be built")
        void status_readyForReview() {
            Mcq mcq = Mcq.builder().status(McqStatus.READY_FOR_REVIEW).build();
            assertThat(mcq.getStatus()).isEqualTo(McqStatus.READY_FOR_REVIEW);
        }

        @Test
        @DisplayName("REJECTED status can be built")
        void status_rejected() {
            Mcq mcq = Mcq.builder().status(McqStatus.REJECTED).build();
            assertThat(mcq.getStatus()).isEqualTo(McqStatus.REJECTED);
        }

        @Test
        @DisplayName("toString does not throw and contains questionStem")
        void toString_containsQuestionStem() {
            Mcq mcq = Mcq.builder().id(77L).questionStem("Unique Q77")
                    .difficulty(Difficulty.MEDIUM).status(McqStatus.DRAFT).build();
            String str = mcq.toString();
            assertThat(str).contains("Unique Q77");
        }

        @Test
        @DisplayName("aiScore boundary: zero is valid")
        void aiScore_zero() {
            Mcq mcq = Mcq.builder().status(McqStatus.DRAFT).aiScore(0).build();
            assertThat(mcq.getAiScore()).isZero();
        }

        @Test
        @DisplayName("aiScore boundary: 100 is valid")
        void aiScore_oneHundred() {
            Mcq mcq = Mcq.builder().status(McqStatus.DRAFT).aiScore(100).build();
            assertThat(mcq.getAiScore()).isEqualTo(100);
        }

        @Test
        @DisplayName("builder.reviewer() method covers reviewer field via builder")
        void builder_withReviewerViaBuilderMethod() {
            User creator  = buildUser(5L, "CR03");
            User reviewer = buildUser(6L, "RV03");
            Mcq mcq = Mcq.builder()
                    .id(200L)
                    .questionStem("What is encapsulation?")
                    .optionA("Hiding").optionB("Showing").optionC("Both").optionD("Neither")
                    .correctAnswer("A")
                    .difficulty(Difficulty.MEDIUM)
                    .status(McqStatus.READY_FOR_REVIEW)
                    .creator(creator)
                    .reviewer(reviewer)
                    .build();

            assertThat(mcq.getReviewer()).isSameAs(reviewer);
            assertThat(mcq.getReviewer().getEnterpriseId()).isEqualTo("RV03");
        }

        @Test
        @DisplayName("builder.topic() and builder.techStack() cover those fields")
        void builder_withTopicAndTechStack() {
            TechStack ts    = TechStack.builder().id(30L).name("Spring").build();
            Topic topic     = Topic.builder().id(40L).name("DI").techStack(ts).build();
            User creator    = buildUser(7L, "CR04");

            Mcq mcq = Mcq.builder()
                    .questionStem("What is DI?")
                    .optionA("A").optionB("B").optionC("C").optionD("D")
                    .correctAnswer("A")
                    .difficulty(Difficulty.EASY)
                    .techStack(ts)
                    .topic(topic)
                    .creator(creator)
                    .build();

            assertThat(mcq.getTechStack()).isSameAs(ts);
            assertThat(mcq.getTopic()).isSameAs(topic);
            assertThat(mcq.getTopic().getName()).isEqualTo("DI");
        }

        @Test
        @DisplayName("builder.createdAt() and builder.updatedAt() cover timestamp builder methods")
        void builder_withTimestamps() {
            LocalDateTime created = LocalDateTime.of(2024, 1, 1, 0, 0);
            LocalDateTime updated = LocalDateTime.of(2024, 6, 1, 12, 0);

            Mcq mcq = Mcq.builder()
                    .questionStem("Q").difficulty(Difficulty.EASY)
                    .createdAt(created)
                    .updatedAt(updated)
                    .build();

            assertThat(mcq.getCreatedAt()).isEqualTo(created);
            assertThat(mcq.getUpdatedAt()).isEqualTo(updated);
        }

        @Test
        @DisplayName("builder.version() covers version field via builder")
        void builder_withVersionViaBuilderMethod() {
            Mcq mcq = Mcq.builder()
                    .questionStem("Q").difficulty(Difficulty.EASY)
                    .version(7)
                    .build();
            assertThat(mcq.getVersion()).isEqualTo(7);
        }

        @Test
        @DisplayName("builder.comments() covers comments field via builder")
        void builder_withCommentsViaBuilderMethod() {
            User creator = buildUser(8L, "CR05");
            Mcq mcq = Mcq.builder()
                    .questionStem("Q").difficulty(Difficulty.EASY)
                    .creator(creator)
                    .comments(new java.util.ArrayList<>())
                    .build();
            assertThat(mcq.getComments()).isNotNull().isEmpty();
        }

        @Test
        @DisplayName("builder without .status() defaults to DRAFT (tests @Builder.Default)")
        void builder_withoutStatus_defaultsToDraft() {
            Mcq mcq = Mcq.builder().questionStem("Q").difficulty(Difficulty.EASY).build();
            assertThat(mcq.getStatus()).isEqualTo(McqStatus.DRAFT);
        }

        @Test
        @DisplayName("aiRisk MEDIUM value via builder")
        void aiRisk_medium() {
            Mcq mcq = Mcq.builder().status(McqStatus.DRAFT).aiRisk("MEDIUM").aiScore(70).build();
            assertThat(mcq.getAiRisk()).isEqualTo("MEDIUM");
            assertThat(mcq.getAiScore()).isEqualTo(70);
        }

        @Test
        @DisplayName("aiRisk HIGH value via builder")
        void aiRisk_high() {
            Mcq mcq = Mcq.builder().status(McqStatus.DRAFT).aiRisk("HIGH").aiScore(40).build();
            assertThat(mcq.getAiRisk()).isEqualTo("HIGH");
            assertThat(mcq.getAiScore()).isEqualTo(40);
        }

        @Test
        @DisplayName("status UNDER_REVIEW can be built")
        void status_underReview() {
            Mcq mcq = Mcq.builder().status(McqStatus.UNDER_REVIEW).build();
            assertThat(mcq.getStatus()).isEqualTo(McqStatus.UNDER_REVIEW);
        }

        @Test
        @DisplayName("equals: two Mcq instances with same content are equal")
        void equals_sameContent_areEqual() {
            User creator = buildUser(9L, "CR06");
            TechStack ts = TechStack.builder().id(50L).name("Go").build();

            Mcq a = Mcq.builder().id(300L).questionStem("Q300")
                    .optionA("A").optionB("B").optionC("C").optionD("D")
                    .correctAnswer("A").difficulty(Difficulty.EASY).status(McqStatus.DRAFT)
                    .techStack(ts).creator(creator).build();
            Mcq b = Mcq.builder().id(300L).questionStem("Q300")
                    .optionA("A").optionB("B").optionC("C").optionD("D")
                    .correctAnswer("A").difficulty(Difficulty.EASY).status(McqStatus.DRAFT)
                    .techStack(ts).creator(creator).build();

            assertThat(a).isEqualTo(b);
            assertThat(a.hashCode()).isEqualTo(b.hashCode());
        }

        @Test
        @DisplayName("equals: different question stem produces unequal Mcq instances")
        void equals_differentQuestionStem_notEqual() {
            Mcq a = Mcq.builder().id(400L).questionStem("Question A")
                    .difficulty(Difficulty.EASY).status(McqStatus.DRAFT).build();
            Mcq b = Mcq.builder().id(400L).questionStem("Question B")
                    .difficulty(Difficulty.EASY).status(McqStatus.DRAFT).build();
            assertThat(a).isNotEqualTo(b);
        }
    }

    // =========================================================================
    // ChatMessage – additional coverage
    // =========================================================================

    @Nested
    @DisplayName("ChatMessage – additional coverage")
    class ChatMessageAdditionalTests {

        @Test
        @DisplayName("all-args constructor sets every field")
        void allArgsConstructor_setsEveryField() {
            LocalDateTime created = LocalDateTime.of(2024, 6, 10, 14, 0);
            LocalDateTime edited  = LocalDateTime.of(2024, 6, 10, 14, 5);

            ChatMessage msg = new ChatMessage(
                    50L,
                    "EID_SENDER",
                    "Sender Name",
                    "SME",
                    "Hello everyone!",
                    "USER",
                    created,
                    5L,
                    "Quoted content",
                    "Quote Author",
                    "{\"👍\":[\"alice\",\"bob\"]}",
                    true,
                    false,
                    edited
            );

            assertThat(msg.getId()).isEqualTo(50L);
            assertThat(msg.getSenderEnterpriseId()).isEqualTo("EID_SENDER");
            assertThat(msg.getSenderName()).isEqualTo("Sender Name");
            assertThat(msg.getSenderRole()).isEqualTo("SME");
            assertThat(msg.getContent()).isEqualTo("Hello everyone!");
            assertThat(msg.getMsgType()).isEqualTo("USER");
            assertThat(msg.getCreatedAt()).isEqualTo(created);
            assertThat(msg.getReplyToId()).isEqualTo(5L);
            assertThat(msg.getReplyToContent()).isEqualTo("Quoted content");
            assertThat(msg.getReplyToSender()).isEqualTo("Quote Author");
            assertThat(msg.getReactions()).isEqualTo("{\"👍\":[\"alice\",\"bob\"]}");
            assertThat(msg.getPinned()).isTrue();
            assertThat(msg.getDeleted()).isFalse();
            assertThat(msg.getEditedAt()).isEqualTo(edited);
        }

        @Test
        @DisplayName("all setters update their respective fields")
        void setters_updateAllFields() {
            LocalDateTime ts = LocalDateTime.of(2024, 7, 1, 10, 0);
            ChatMessage msg = new ChatMessage();

            msg.setId(100L);
            msg.setSenderEnterpriseId("EID100");
            msg.setSenderName("Test User");
            msg.setSenderRole("ADMIN");
            msg.setContent("Updated content");
            msg.setMsgType("BOT");
            msg.setCreatedAt(ts);
            msg.setReplyToId(20L);
            msg.setReplyToContent("Original message");
            msg.setReplyToSender("Original Sender");
            msg.setReactions("{\"❤️\":[\"user1\"]}");
            msg.setPinned(true);
            msg.setDeleted(false);
            msg.setEditedAt(ts.plusHours(1));

            assertThat(msg.getId()).isEqualTo(100L);
            assertThat(msg.getSenderEnterpriseId()).isEqualTo("EID100");
            assertThat(msg.getSenderName()).isEqualTo("Test User");
            assertThat(msg.getSenderRole()).isEqualTo("ADMIN");
            assertThat(msg.getContent()).isEqualTo("Updated content");
            assertThat(msg.getMsgType()).isEqualTo("BOT");
            assertThat(msg.getCreatedAt()).isEqualTo(ts);
            assertThat(msg.getReplyToId()).isEqualTo(20L);
            assertThat(msg.getReplyToContent()).isEqualTo("Original message");
            assertThat(msg.getReplyToSender()).isEqualTo("Original Sender");
            assertThat(msg.getReactions()).isEqualTo("{\"❤️\":[\"user1\"]}");
            assertThat(msg.getPinned()).isTrue();
            assertThat(msg.getDeleted()).isFalse();
            assertThat(msg.getEditedAt()).isEqualTo(ts.plusHours(1));
        }

        @Test
        @DisplayName("reactions field can hold complex JSON string")
        void reactions_complexJson() {
            ChatMessage msg = ChatMessage.builder()
                    .senderEnterpriseId("EID_RX")
                    .content("Reacted message")
                    .reactions("{\"👍\":[\"alice\",\"bob\"],\"❤️\":[\"carol\"],\"😂\":[\"dave\",\"eve\"]}")
                    .build();

            assertThat(msg.getReactions()).contains("👍").contains("alice").contains("carol").contains("😂");
        }

        @Test
        @DisplayName("reactions default '{}' is valid JSON representing empty object")
        void reactions_defaultIsValidJson() {
            ChatMessage msg = ChatMessage.builder()
                    .senderEnterpriseId("EID_DEFAULT")
                    .content("No reactions yet")
                    .build();

            assertThat(msg.getReactions()).isEqualTo("{}");
        }

        @Test
        @DisplayName("deleted flag can be toggled")
        void deleted_toggledViaSetter() {
            ChatMessage msg = ChatMessage.builder()
                    .senderEnterpriseId("EID_DEL")
                    .content("To be deleted")
                    .build();

            assertThat(msg.getDeleted()).isFalse();
            msg.setDeleted(true);
            assertThat(msg.getDeleted()).isTrue();
            msg.setDeleted(false);
            assertThat(msg.getDeleted()).isFalse();
        }

        @Test
        @DisplayName("pinned flag can be toggled")
        void pinned_toggledViaSetter() {
            ChatMessage msg = ChatMessage.builder()
                    .senderEnterpriseId("EID_PIN")
                    .content("Important message")
                    .build();

            assertThat(msg.getPinned()).isFalse();
            msg.setPinned(true);
            assertThat(msg.getPinned()).isTrue();
        }

        @Test
        @DisplayName("editedAt can be set and cleared (null)")
        void editedAt_setAndClear() {
            LocalDateTime editTime = LocalDateTime.of(2024, 8, 15, 12, 0);
            ChatMessage msg = ChatMessage.builder()
                    .senderEnterpriseId("EID_EDIT")
                    .content("Editable")
                    .editedAt(editTime)
                    .build();

            assertThat(msg.getEditedAt()).isEqualTo(editTime);
            msg.setEditedAt(null);
            assertThat(msg.getEditedAt()).isNull();
        }

        @Test
        @DisplayName("BOT msgType can be set via builder")
        void msgType_bot_viaBuilder() {
            ChatMessage msg = ChatMessage.builder()
                    .senderEnterpriseId("BOT_SYS")
                    .content("Bot response")
                    .msgType("BOT")
                    .build();

            assertThat(msg.getMsgType()).isEqualTo("BOT");
        }

        @Test
        @DisplayName("equals: two messages with same fields are equal")
        void equals_sameFields() {
            LocalDateTime ts = LocalDateTime.of(2024, 9, 1, 8, 0);
            ChatMessage a = ChatMessage.builder()
                    .id(1L).senderEnterpriseId("EID_EQ").content("Test").createdAt(ts).build();
            ChatMessage b = ChatMessage.builder()
                    .id(1L).senderEnterpriseId("EID_EQ").content("Test").createdAt(ts).build();

            assertThat(a).isEqualTo(b);
            assertThat(a.hashCode()).isEqualTo(b.hashCode());
        }

        @Test
        @DisplayName("equals: different content produces unequal messages")
        void equals_differentContent_notEqual() {
            ChatMessage a = ChatMessage.builder().id(1L).senderEnterpriseId("E1").content("Hello").build();
            ChatMessage b = ChatMessage.builder().id(1L).senderEnterpriseId("E1").content("Goodbye").build();

            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("toString does not throw and contains senderEnterpriseId")
        void toString_containsSenderInfo() {
            ChatMessage msg = ChatMessage.builder()
                    .id(7L).senderEnterpriseId("UNIQUE_EID_7").content("X").build();
            assertThatCode(msg::toString).doesNotThrowAnyException();
            assertThat(msg.toString()).contains("UNIQUE_EID_7");
        }
    }

    // =========================================================================
    // McqVersion – additional coverage
    // =========================================================================

    @Nested
    @DisplayName("McqVersion – additional coverage")
    class McqVersionAdditionalTests {

        @Test
        @DisplayName("all-args constructor sets every field")
        void allArgsConstructor_setsEveryField() {
            LocalDateTime ts = LocalDateTime.of(2024, 4, 20, 16, 30);

            McqVersion v = new McqVersion(
                    200L,
                    50L,
                    5,
                    "What is JVM?",
                    "Java Virtual Machine",
                    "Java Version Manager",
                    "Java Variable Model",
                    "Java Viable Module",
                    "A",
                    "EASY",
                    "Reviewer Name",
                    "RVEID001",
                    "APPROVED",
                    "Minor correction",
                    ts
            );

            assertThat(v.getId()).isEqualTo(200L);
            assertThat(v.getMcqId()).isEqualTo(50L);
            assertThat(v.getVersionNumber()).isEqualTo(5);
            assertThat(v.getQuestionStem()).isEqualTo("What is JVM?");
            assertThat(v.getOptionA()).isEqualTo("Java Virtual Machine");
            assertThat(v.getOptionB()).isEqualTo("Java Version Manager");
            assertThat(v.getOptionC()).isEqualTo("Java Variable Model");
            assertThat(v.getOptionD()).isEqualTo("Java Viable Module");
            assertThat(v.getCorrectAnswer()).isEqualTo("A");
            assertThat(v.getDifficulty()).isEqualTo("EASY");
            assertThat(v.getChangedByName()).isEqualTo("Reviewer Name");
            assertThat(v.getChangedByEnterpriseId()).isEqualTo("RVEID001");
            assertThat(v.getStatusAtTime()).isEqualTo("APPROVED");
            assertThat(v.getChangeNote()).isEqualTo("Minor correction");
            assertThat(v.getCreatedAt()).isEqualTo(ts);
        }

        @Test
        @DisplayName("statusAtTime can hold any status string value")
        void statusAtTime_arbitraryValues() {
            for (String status : List.of("DRAFT", "READY_FOR_REVIEW", "APPROVED", "REJECTED")) {
                McqVersion v = McqVersion.builder()
                        .mcqId(1L).versionNumber(1).createdAt(LocalDateTime.now())
                        .statusAtTime(status).build();
                assertThat(v.getStatusAtTime()).isEqualTo(status);
            }
        }

        @Test
        @DisplayName("difficulty stored as String (not enum)")
        void difficulty_storedAsString() {
            McqVersion v = McqVersion.builder()
                    .mcqId(1L).versionNumber(1).createdAt(LocalDateTime.now())
                    .difficulty("HARD").build();
            assertThat(v.getDifficulty()).isEqualTo("HARD");
        }

        @Test
        @DisplayName("changeNote can be null (optional)")
        void changeNote_optional() {
            McqVersion v = McqVersion.builder()
                    .mcqId(1L).versionNumber(1).createdAt(LocalDateTime.now()).build();
            assertThat(v.getChangeNote()).isNull();
        }

        @Test
        @DisplayName("changedByEnterpriseId is independent of changedByName")
        void changedByFields_independent() {
            McqVersion v = new McqVersion();
            v.setChangedByName("Alice Johnson");
            v.setChangedByEnterpriseId("AJ001");

            assertThat(v.getChangedByName()).isEqualTo("Alice Johnson");
            assertThat(v.getChangedByEnterpriseId()).isEqualTo("AJ001");
        }

        @Test
        @DisplayName("toString does not throw and contains McqVersion class name")
        void toString_doesNotThrow() {
            McqVersion v = McqVersion.builder()
                    .id(300L).mcqId(10L).versionNumber(2).createdAt(LocalDateTime.now())
                    .questionStem("Distinct question stem 300").build();
            assertThatCode(v::toString).doesNotThrowAnyException();
            assertThat(v.toString()).contains("McqVersion");
        }

        @Test
        @DisplayName("equals and hashCode: different versionNumber produces unequal objects")
        void equals_differentVersionNumber_notEqual() {
            LocalDateTime ts = LocalDateTime.now();
            McqVersion a = McqVersion.builder().id(1L).mcqId(1L).versionNumber(1).createdAt(ts).build();
            McqVersion b = McqVersion.builder().id(1L).mcqId(1L).versionNumber(2).createdAt(ts).build();

            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("builder with all option fields covers each builder method")
        void builder_withAllOptionFields() {
            LocalDateTime ts = LocalDateTime.of(2024, 2, 10, 8, 0);
            McqVersion v = McqVersion.builder()
                    .id(500L)
                    .mcqId(20L)
                    .versionNumber(3)
                    .questionStem("What is inheritance?")
                    .optionA("Code reuse via parent class")
                    .optionB("Hiding internal details")
                    .optionC("Multiple objects")
                    .optionD("Sending messages")
                    .correctAnswer("A")
                    .difficulty("MEDIUM")
                    .createdAt(ts)
                    .build();

            assertThat(v.getId()).isEqualTo(500L);
            assertThat(v.getMcqId()).isEqualTo(20L);
            assertThat(v.getVersionNumber()).isEqualTo(3);
            assertThat(v.getQuestionStem()).isEqualTo("What is inheritance?");
            assertThat(v.getOptionA()).isEqualTo("Code reuse via parent class");
            assertThat(v.getOptionB()).isEqualTo("Hiding internal details");
            assertThat(v.getOptionC()).isEqualTo("Multiple objects");
            assertThat(v.getOptionD()).isEqualTo("Sending messages");
            assertThat(v.getCorrectAnswer()).isEqualTo("A");
            assertThat(v.getDifficulty()).isEqualTo("MEDIUM");
            assertThat(v.getCreatedAt()).isEqualTo(ts);
        }

        @Test
        @DisplayName("builder with changedBy fields covers those builder methods")
        void builder_withChangedByFieldsViaBuilder() {
            McqVersion v = McqVersion.builder()
                    .mcqId(30L)
                    .versionNumber(2)
                    .changedByName("John Doe")
                    .changedByEnterpriseId("JD001")
                    .statusAtTime("READY_FOR_REVIEW")
                    .createdAt(LocalDateTime.now())
                    .build();

            assertThat(v.getChangedByName()).isEqualTo("John Doe");
            assertThat(v.getChangedByEnterpriseId()).isEqualTo("JD001");
            assertThat(v.getStatusAtTime()).isEqualTo("READY_FOR_REVIEW");
        }

        @Test
        @DisplayName("builder.changeNote() covers changeNote builder method")
        void builder_withChangeNote() {
            McqVersion v = McqVersion.builder()
                    .mcqId(40L)
                    .versionNumber(1)
                    .changeNote("Fixed typo in option B")
                    .createdAt(LocalDateTime.now())
                    .build();

            assertThat(v.getChangeNote()).isEqualTo("Fixed typo in option B");
        }

        @Test
        @DisplayName("setters update all remaining fields")
        void setters_updateAllFields() {
            LocalDateTime ts = LocalDateTime.of(2025, 3, 15, 10, 0);
            McqVersion v = new McqVersion();
            v.setId(600L);
            v.setMcqId(25L);
            v.setVersionNumber(4);
            v.setQuestionStem("What is polymorphism?");
            v.setOptionA("A");
            v.setOptionB("B");
            v.setOptionC("C");
            v.setOptionD("D");
            v.setCorrectAnswer("B");
            v.setDifficulty("HARD");
            v.setChangedByName("Jane Smith");
            v.setChangedByEnterpriseId("JS002");
            v.setStatusAtTime("DRAFT");
            v.setChangeNote("Initial version");
            v.setCreatedAt(ts);

            assertThat(v.getId()).isEqualTo(600L);
            assertThat(v.getMcqId()).isEqualTo(25L);
            assertThat(v.getVersionNumber()).isEqualTo(4);
            assertThat(v.getQuestionStem()).isEqualTo("What is polymorphism?");
            assertThat(v.getOptionA()).isEqualTo("A");
            assertThat(v.getOptionB()).isEqualTo("B");
            assertThat(v.getOptionC()).isEqualTo("C");
            assertThat(v.getOptionD()).isEqualTo("D");
            assertThat(v.getCorrectAnswer()).isEqualTo("B");
            assertThat(v.getDifficulty()).isEqualTo("HARD");
            assertThat(v.getChangedByName()).isEqualTo("Jane Smith");
            assertThat(v.getChangedByEnterpriseId()).isEqualTo("JS002");
            assertThat(v.getStatusAtTime()).isEqualTo("DRAFT");
            assertThat(v.getChangeNote()).isEqualTo("Initial version");
            assertThat(v.getCreatedAt()).isEqualTo(ts);
        }

        @Test
        @DisplayName("equals: two instances with same data are equal")
        void equals_sameData_areEqual() {
            LocalDateTime ts = LocalDateTime.of(2024, 5, 5, 9, 0);
            McqVersion a = McqVersion.builder().id(700L).mcqId(10L).versionNumber(1)
                    .questionStem("Same question").correctAnswer("C").createdAt(ts).build();
            McqVersion b = McqVersion.builder().id(700L).mcqId(10L).versionNumber(1)
                    .questionStem("Same question").correctAnswer("C").createdAt(ts).build();

            assertThat(a).isEqualTo(b);
            assertThat(a.hashCode()).isEqualTo(b.hashCode());
        }

        @Test
        @DisplayName("no-args constructor: all fields null")
        void noArgsConstructor_allNull() {
            McqVersion v = new McqVersion();
            assertThat(v.getId()).isNull();
            assertThat(v.getMcqId()).isNull();
            assertThat(v.getVersionNumber()).isNull();
            assertThat(v.getQuestionStem()).isNull();
            assertThat(v.getOptionA()).isNull();
            assertThat(v.getOptionB()).isNull();
            assertThat(v.getOptionC()).isNull();
            assertThat(v.getOptionD()).isNull();
            assertThat(v.getCorrectAnswer()).isNull();
            assertThat(v.getDifficulty()).isNull();
            assertThat(v.getChangedByName()).isNull();
            assertThat(v.getChangedByEnterpriseId()).isNull();
            assertThat(v.getStatusAtTime()).isNull();
            assertThat(v.getChangeNote()).isNull();
            assertThat(v.getCreatedAt()).isNull();
        }
    }

    // =========================================================================
    // ReviewComment
    // =========================================================================

    @Nested
    @DisplayName("ReviewComment")
    class ReviewCommentTests {

        private User buildUser(Long id, String eid) {
            return User.builder()
                    .id(id).enterpriseId(eid).fullName("User " + eid)
                    .email(eid + "@test.com").passwordHash("hash").role(Role.ADMIN)
                    .build();
        }

        private Mcq buildMcq(Long id) {
            return Mcq.builder()
                    .id(id).questionStem("Q" + id).optionA("A").optionB("B").optionC("C").optionD("D")
                    .correctAnswer("A").difficulty(Difficulty.EASY).status(McqStatus.DRAFT)
                    .build();
        }

        @Test
        @DisplayName("builder sets all fields")
        void builder_setsAllFields() {
            LocalDateTime ts = LocalDateTime.of(2024, 10, 5, 11, 0);
            User reviewer = buildUser(1L, "RV_RC01");
            Mcq mcq = buildMcq(1L);

            ReviewComment rc = ReviewComment.builder()
                    .id(10L)
                    .mcq(mcq)
                    .reviewer(reviewer)
                    .comment("This is an excellent question")
                    .createdAt(ts)
                    .build();

            assertThat(rc.getId()).isEqualTo(10L);
            assertThat(rc.getMcq()).isSameAs(mcq);
            assertThat(rc.getReviewer()).isSameAs(reviewer);
            assertThat(rc.getComment()).isEqualTo("This is an excellent question");
            assertThat(rc.getCreatedAt()).isEqualTo(ts);
        }

        @Test
        @DisplayName("no-args constructor: all fields null")
        void noArgsConstructor_allNull() {
            ReviewComment rc = new ReviewComment();
            assertThat(rc.getId()).isNull();
            assertThat(rc.getMcq()).isNull();
            assertThat(rc.getReviewer()).isNull();
            assertThat(rc.getComment()).isNull();
            assertThat(rc.getCreatedAt()).isNull();
        }

        @Test
        @DisplayName("all-args constructor sets every field")
        void allArgsConstructor_setsEveryField() {
            LocalDateTime ts = LocalDateTime.of(2024, 11, 20, 14, 0);
            User reviewer = buildUser(2L, "RV_RC02");
            Mcq mcq = buildMcq(2L);

            ReviewComment rc = new ReviewComment(20L, mcq, reviewer, "Needs rewording", ts);

            assertThat(rc.getId()).isEqualTo(20L);
            assertThat(rc.getMcq()).isSameAs(mcq);
            assertThat(rc.getReviewer()).isSameAs(reviewer);
            assertThat(rc.getComment()).isEqualTo("Needs rewording");
            assertThat(rc.getCreatedAt()).isEqualTo(ts);
        }

        @Test
        @DisplayName("setters update all mutable fields")
        void setters_updateFields() {
            LocalDateTime ts = LocalDateTime.of(2024, 12, 1, 9, 0);
            User reviewer = buildUser(3L, "RV_RC03");
            Mcq mcq = buildMcq(3L);

            ReviewComment rc = new ReviewComment();
            rc.setId(30L);
            rc.setMcq(mcq);
            rc.setReviewer(reviewer);
            rc.setComment("Updated comment text");
            rc.setCreatedAt(ts);

            assertThat(rc.getId()).isEqualTo(30L);
            assertThat(rc.getMcq()).isSameAs(mcq);
            assertThat(rc.getReviewer()).isSameAs(reviewer);
            assertThat(rc.getComment()).isEqualTo("Updated comment text");
            assertThat(rc.getCreatedAt()).isEqualTo(ts);
        }

        @Test
        @DisplayName("equals: two instances with same data are equal")
        void equals_sameData() {
            LocalDateTime ts = LocalDateTime.of(2024, 1, 10, 10, 0);
            User reviewer = buildUser(4L, "RV_RC04");
            Mcq mcq = buildMcq(4L);

            ReviewComment a = ReviewComment.builder().id(40L).mcq(mcq).reviewer(reviewer)
                    .comment("Same comment").createdAt(ts).build();
            ReviewComment b = ReviewComment.builder().id(40L).mcq(mcq).reviewer(reviewer)
                    .comment("Same comment").createdAt(ts).build();

            assertThat(a).isEqualTo(b);
            assertThat(a.hashCode()).isEqualTo(b.hashCode());
        }

        @Test
        @DisplayName("equals: different comment text produces unequal objects")
        void equals_differentComment_notEqual() {
            User reviewer = buildUser(5L, "RV_RC05");
            Mcq mcq = buildMcq(5L);

            ReviewComment a = ReviewComment.builder().id(50L).mcq(mcq).reviewer(reviewer)
                    .comment("Comment A").build();
            ReviewComment b = ReviewComment.builder().id(50L).mcq(mcq).reviewer(reviewer)
                    .comment("Comment B").build();

            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("toString does not throw and contains ReviewComment class name")
        void toString_doesNotThrow() {
            ReviewComment rc = ReviewComment.builder().id(60L).comment("A review").build();
            assertThatCode(rc::toString).doesNotThrowAnyException();
            assertThat(rc.toString()).contains("ReviewComment");
        }

        @Test
        @DisplayName("createdAt is nullable when not explicitly set in builder")
        void createdAt_nullable() {
            ReviewComment rc = ReviewComment.builder().id(70L).comment("No timestamp").build();
            assertThat(rc.getCreatedAt()).isNull();
        }
    }

    // =========================================================================
    // QuizAttempt – additional coverage
    // =========================================================================

    @Nested
    @DisplayName("QuizAttempt – additional coverage")
    class QuizAttemptAdditionalTests {

        @Test
        @DisplayName("all-args constructor sets every field")
        void allArgsConstructor_setsEveryField() {
            LocalDateTime submitted = LocalDateTime.of(2024, 3, 15, 11, 30);

            QuizAttempt attempt = new QuizAttempt(
                    500L,
                    100L,
                    "Eve Turner",
                    "eve@example.com",
                    "{\"1\":\"A\",\"2\":\"B\",\"3\":\"C\"}",
                    9,
                    10,
                    "{\"Java\":{\"correct\":9,\"total\":10}}",
                    "COMPLETED",
                    0,
                    null,
                    900,
                    submitted
            );

            assertThat(attempt.getId()).isEqualTo(500L);
            assertThat(attempt.getSessionId()).isEqualTo(100L);
            assertThat(attempt.getCandidateName()).isEqualTo("Eve Turner");
            assertThat(attempt.getCandidateEmail()).isEqualTo("eve@example.com");
            assertThat(attempt.getAnswers()).contains("1");
            assertThat(attempt.getScore()).isEqualTo(9);
            assertThat(attempt.getTotalQuestions()).isEqualTo(10);
            assertThat(attempt.getTopicBreakdown()).contains("Java");
            assertThat(attempt.getStatus()).isEqualTo("COMPLETED");
            assertThat(attempt.getViolationCount()).isZero();
            assertThat(attempt.getViolationScreenshot()).isNull();
            assertThat(attempt.getTimeTakenSeconds()).isEqualTo(900);
            assertThat(attempt.getSubmittedAt()).isEqualTo(submitted);
        }

        @Test
        @DisplayName("TERMINATED status can be stored")
        void status_terminated() {
            QuizAttempt attempt = QuizAttempt.builder()
                    .sessionId(200L).candidateName("Frank").candidateEmail("f@test.com")
                    .status("TERMINATED").violationCount(3).build();

            assertThat(attempt.getStatus()).isEqualTo("TERMINATED");
            assertThat(attempt.getViolationCount()).isEqualTo(3);
        }

        @Test
        @DisplayName("violationScreenshot can hold base64 encoded data")
        void violationScreenshot_base64() {
            String base64Data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
            QuizAttempt attempt = QuizAttempt.builder()
                    .sessionId(300L).candidateName("Grace").candidateEmail("g@test.com")
                    .violationScreenshot(base64Data).build();

            assertThat(attempt.getViolationScreenshot()).isEqualTo(base64Data);
        }

        @Test
        @DisplayName("score of zero is valid (no correct answers)")
        void score_zero() {
            QuizAttempt attempt = QuizAttempt.builder()
                    .sessionId(400L).candidateName("Hank").candidateEmail("h@test.com")
                    .score(0).totalQuestions(5).build();

            assertThat(attempt.getScore()).isZero();
            assertThat(attempt.getTotalQuestions()).isEqualTo(5);
        }

        @Test
        @DisplayName("topicBreakdown can be set and retrieved as JSON string")
        void topicBreakdown_jsonString() {
            String json = "{\"Spring\":{\"correct\":3,\"total\":5},\"JPA\":{\"correct\":2,\"total\":3}}";
            QuizAttempt attempt = QuizAttempt.builder()
                    .sessionId(500L).candidateName("Iris").candidateEmail("i@test.com")
                    .topicBreakdown(json).build();

            assertThat(attempt.getTopicBreakdown()).contains("Spring").contains("JPA").contains("correct");
        }

        @Test
        @DisplayName("timeTakenSeconds can be set to zero (instant submission)")
        void timeTakenSeconds_zero() {
            QuizAttempt attempt = QuizAttempt.builder()
                    .sessionId(600L).candidateName("Jack").candidateEmail("j@test.com")
                    .timeTakenSeconds(0).build();

            assertThat(attempt.getTimeTakenSeconds()).isZero();
        }

        @Test
        @DisplayName("toString does not throw and contains candidateName")
        void toString_containsCandidateName() {
            QuizAttempt attempt = QuizAttempt.builder()
                    .id(700L).sessionId(1L).candidateName("Unique_Candidate_700")
                    .candidateEmail("unique700@test.com").build();
            assertThatCode(attempt::toString).doesNotThrowAnyException();
            assertThat(attempt.toString()).contains("Unique_Candidate_700");
        }
    }
}
