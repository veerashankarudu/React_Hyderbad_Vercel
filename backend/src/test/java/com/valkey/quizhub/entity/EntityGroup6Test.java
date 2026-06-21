package com.valkey.quizhub.entity;

import com.valkey.quizhub.enums.Difficulty;
import com.valkey.quizhub.enums.McqStatus;
import com.valkey.quizhub.enums.Role;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * Additional POJO / Lombok unit tests to boost JaCoCo coverage.
 * Covers remaining getters, setters, builder methods, equals edge-cases,
 * and hashCode consistency for Mcq, McqVersion, ChatMessage, and QuizSession.
 * No Spring context required.
 */
@DisplayName("EntityGroup6 – Mcq, McqVersion, ChatMessage, QuizSession (deep coverage)")
class EntityGroup6Test {

    // =========================================================================
    // Mcq – remaining setter and edge-case coverage
    // =========================================================================

    @Nested
    @DisplayName("Mcq – remaining setter and equals edge-cases")
    class McqDeepTests {

        private User buildUser(Long id, String eid) {
            return User.builder()
                    .id(id).enterpriseId(eid).fullName("User " + eid)
                    .email(eid + "@test.com").passwordHash("hash").role(Role.SME)
                    .build();
        }

        @Test
        @DisplayName("setCreator() setter updates creator field")
        void setter_setCreator() {
            User creator = buildUser(1L, "CR_S01");
            Mcq mcq = new Mcq();
            assertThat(mcq.getCreator()).isNull();
            mcq.setCreator(creator);
            assertThat(mcq.getCreator()).isSameAs(creator);
        }

        @Test
        @DisplayName("setReviewer() setter updates reviewer field")
        void setter_setReviewer() {
            User reviewer = buildUser(2L, "RV_S01");
            Mcq mcq = new Mcq();
            assertThat(mcq.getReviewer()).isNull();
            mcq.setReviewer(reviewer);
            assertThat(mcq.getReviewer()).isSameAs(reviewer);
        }

        @Test
        @DisplayName("setTechStack() setter updates techStack field")
        void setter_setTechStack() {
            TechStack ts = TechStack.builder().id(10L).name("Python").build();
            Mcq mcq = new Mcq();
            assertThat(mcq.getTechStack()).isNull();
            mcq.setTechStack(ts);
            assertThat(mcq.getTechStack()).isSameAs(ts);
        }

        @Test
        @DisplayName("setTopic() setter updates topic field")
        void setter_setTopic() {
            TechStack ts = TechStack.builder().id(5L).name("Java").build();
            Topic topic = Topic.builder().id(20L).name("Concurrency").techStack(ts).build();
            Mcq mcq = new Mcq();
            assertThat(mcq.getTopic()).isNull();
            mcq.setTopic(topic);
            assertThat(mcq.getTopic()).isSameAs(topic);
        }

        @Test
        @DisplayName("all entity setters round-trip including creator, reviewer, techStack, topic")
        void setters_allFields_roundTrip() {
            User creator  = buildUser(3L, "CR_ALL");
            User reviewer = buildUser(4L, "RV_ALL");
            TechStack ts  = TechStack.builder().id(1L).name("Kotlin").build();
            Topic topic   = Topic.builder().id(2L).name("Coroutines").techStack(ts).build();
            LocalDateTime now = LocalDateTime.of(2025, 1, 10, 8, 0);

            Mcq mcq = new Mcq();
            mcq.setId(100L);
            mcq.setQuestionStem("What is a coroutine?");
            mcq.setOptionA("A thread");
            mcq.setOptionB("A lightweight thread");
            mcq.setOptionC("A process");
            mcq.setOptionD("A fiber");
            mcq.setCorrectAnswer("B");
            mcq.setDifficulty(Difficulty.MEDIUM);
            mcq.setStatus(McqStatus.READY_FOR_REVIEW);
            mcq.setTechStack(ts);
            mcq.setTopic(topic);
            mcq.setCreator(creator);
            mcq.setReviewer(reviewer);
            mcq.setComments(new ArrayList<>());
            mcq.setVersion(2);
            mcq.setAiScore(77);
            mcq.setAiRisk("LOW");
            mcq.setAiWarning("OK");
            mcq.setCreatedAt(now);
            mcq.setUpdatedAt(now.plusHours(1));

            assertThat(mcq.getId()).isEqualTo(100L);
            assertThat(mcq.getQuestionStem()).isEqualTo("What is a coroutine?");
            assertThat(mcq.getOptionA()).isEqualTo("A thread");
            assertThat(mcq.getOptionB()).isEqualTo("A lightweight thread");
            assertThat(mcq.getOptionC()).isEqualTo("A process");
            assertThat(mcq.getOptionD()).isEqualTo("A fiber");
            assertThat(mcq.getCorrectAnswer()).isEqualTo("B");
            assertThat(mcq.getDifficulty()).isEqualTo(Difficulty.MEDIUM);
            assertThat(mcq.getStatus()).isEqualTo(McqStatus.READY_FOR_REVIEW);
            assertThat(mcq.getTechStack()).isSameAs(ts);
            assertThat(mcq.getTopic()).isSameAs(topic);
            assertThat(mcq.getCreator()).isSameAs(creator);
            assertThat(mcq.getReviewer()).isSameAs(reviewer);
            assertThat(mcq.getComments()).isEmpty();
            assertThat(mcq.getVersion()).isEqualTo(2);
            assertThat(mcq.getAiScore()).isEqualTo(77);
            assertThat(mcq.getAiRisk()).isEqualTo("LOW");
            assertThat(mcq.getAiWarning()).isEqualTo("OK");
            assertThat(mcq.getCreatedAt()).isEqualTo(now);
            assertThat(mcq.getUpdatedAt()).isEqualTo(now.plusHours(1));
        }

        @Test
        @DisplayName("equals(null) returns false")
        void equals_null_returnsFalse() {
            Mcq mcq = Mcq.builder().id(1L).questionStem("Q").difficulty(Difficulty.EASY)
                    .status(McqStatus.DRAFT).build();
            assertThat(mcq.equals(null)).isFalse();
        }

        @Test
        @DisplayName("equals(different type) returns false")
        void equals_differentType_returnsFalse() {
            Mcq mcq = Mcq.builder().id(1L).questionStem("Q").difficulty(Difficulty.EASY)
                    .status(McqStatus.DRAFT).build();
            assertThat(mcq.equals("string")).isFalse();
        }

        @Test
        @DisplayName("equals(same instance) returns true")
        void equals_sameInstance_returnsTrue() {
            Mcq mcq = Mcq.builder().id(1L).questionStem("Q").difficulty(Difficulty.EASY)
                    .status(McqStatus.DRAFT).build();
            assertThat(mcq.equals(mcq)).isTrue();
        }

        @Test
        @DisplayName("hashCode is consistent across multiple calls")
        void hashCode_consistent() {
            Mcq mcq = Mcq.builder().id(5L).questionStem("Q").difficulty(Difficulty.HARD)
                    .status(McqStatus.APPROVED).build();
            int first  = mcq.hashCode();
            int second = mcq.hashCode();
            assertThat(first).isEqualTo(second);
        }

        @Test
        @DisplayName("equals: differing on optionA produces unequal objects")
        void equals_differentOptionA_notEqual() {
            Mcq a = Mcq.builder().id(1L).questionStem("Q").optionA("AAA")
                    .difficulty(Difficulty.EASY).status(McqStatus.DRAFT).build();
            Mcq b = Mcq.builder().id(1L).questionStem("Q").optionA("BBB")
                    .difficulty(Difficulty.EASY).status(McqStatus.DRAFT).build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("equals: differing on correctAnswer produces unequal objects")
        void equals_differentCorrectAnswer_notEqual() {
            Mcq a = Mcq.builder().id(1L).questionStem("Q")
                    .optionA("X").optionB("Y").optionC("Z").optionD("W")
                    .correctAnswer("A").difficulty(Difficulty.EASY).status(McqStatus.DRAFT).build();
            Mcq b = Mcq.builder().id(1L).questionStem("Q")
                    .optionA("X").optionB("Y").optionC("Z").optionD("W")
                    .correctAnswer("D").difficulty(Difficulty.EASY).status(McqStatus.DRAFT).build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("equals: differing on aiScore produces unequal objects")
        void equals_differentAiScore_notEqual() {
            Mcq a = Mcq.builder().id(1L).questionStem("Q")
                    .optionA("X").optionB("Y").optionC("Z").optionD("W")
                    .correctAnswer("A").difficulty(Difficulty.EASY).status(McqStatus.DRAFT)
                    .aiScore(80).build();
            Mcq b = Mcq.builder().id(1L).questionStem("Q")
                    .optionA("X").optionB("Y").optionC("Z").optionD("W")
                    .correctAnswer("A").difficulty(Difficulty.EASY).status(McqStatus.DRAFT)
                    .aiScore(90).build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("builder: techStack and topic builder methods cover those builder paths")
        void builder_techStackAndTopic() {
            TechStack ts  = TechStack.builder().id(7L).name("Rust").build();
            Topic topic   = Topic.builder().id(8L).name("Ownership").techStack(ts).build();
            Mcq mcq = Mcq.builder()
                    .id(200L)
                    .questionStem("What owns memory in Rust?")
                    .optionA("GC")
                    .optionB("Borrow checker")
                    .optionC("Stack only")
                    .optionD("No ownership")
                    .correctAnswer("B")
                    .difficulty(Difficulty.HARD)
                    .status(McqStatus.DRAFT)
                    .techStack(ts)
                    .topic(topic)
                    .creator(buildUser(5L, "CR_TS01"))
                    .reviewer(buildUser(6L, "RV_TS01"))
                    .comments(List.of())
                    .version(1)
                    .aiScore(88)
                    .aiRisk("LOW")
                    .aiWarning(null)
                    .createdAt(LocalDateTime.of(2025, 3, 1, 9, 0))
                    .updatedAt(LocalDateTime.of(2025, 3, 1, 9, 5))
                    .build();

            assertThat(mcq.getTechStack()).isSameAs(ts);
            assertThat(mcq.getTopic()).isSameAs(topic);
            assertThat(mcq.getCreator().getEnterpriseId()).isEqualTo("CR_TS01");
            assertThat(mcq.getReviewer().getEnterpriseId()).isEqualTo("RV_TS01");
            assertThat(mcq.getComments()).isEmpty();
            assertThat(mcq.getVersion()).isEqualTo(1);
        }

        @Test
        @DisplayName("Mcq.toString() does not throw and contains class name")
        void toString_doesNotThrow_withAllFields() {
            TechStack ts = TechStack.builder().id(9L).name("Go").build();
            Mcq mcq = Mcq.builder()
                    .id(300L).questionStem("Unique_MCQ_300")
                    .difficulty(Difficulty.MEDIUM).status(McqStatus.APPROVED)
                    .aiScore(91).aiRisk("HIGH")
                    .build();
            assertThatCode(mcq::toString).doesNotThrowAnyException();
            assertThat(mcq.toString()).contains("Unique_MCQ_300");
        }
    }

    // =========================================================================
    // McqVersion – remaining coverage
    // =========================================================================

    @Nested
    @DisplayName("McqVersion – remaining equals edge-cases and lifecycle")
    class McqVersionDeepTests {

        @Test
        @DisplayName("equals(null) returns false")
        void equals_null_returnsFalse() {
            McqVersion v = McqVersion.builder()
                    .id(1L).mcqId(1L).versionNumber(1).createdAt(LocalDateTime.now()).build();
            assertThat(v.equals(null)).isFalse();
        }

        @Test
        @DisplayName("equals(different type) returns false")
        void equals_differentType_returnsFalse() {
            McqVersion v = McqVersion.builder()
                    .id(1L).mcqId(1L).versionNumber(1).createdAt(LocalDateTime.now()).build();
            assertThat(v.equals(42)).isFalse();
        }

        @Test
        @DisplayName("equals(same instance) returns true")
        void equals_sameInstance_returnsTrue() {
            McqVersion v = McqVersion.builder()
                    .id(1L).mcqId(1L).versionNumber(1).createdAt(LocalDateTime.now()).build();
            assertThat(v.equals(v)).isTrue();
        }

        @Test
        @DisplayName("hashCode is consistent across multiple calls")
        void hashCode_consistent() {
            McqVersion v = McqVersion.builder()
                    .id(5L).mcqId(10L).versionNumber(3)
                    .questionStem("What is polymorphism?")
                    .createdAt(LocalDateTime.of(2024, 6, 1, 0, 0))
                    .build();
            assertThat(v.hashCode()).isEqualTo(v.hashCode());
        }

        @Test
        @DisplayName("hashCode: two equal objects have the same hashCode")
        void hashCode_equalObjects_sameHashCode() {
            LocalDateTime ts = LocalDateTime.of(2024, 7, 1, 10, 0);
            McqVersion a = McqVersion.builder().id(2L).mcqId(5L).versionNumber(2)
                    .questionStem("Q?").createdAt(ts).build();
            McqVersion b = McqVersion.builder().id(2L).mcqId(5L).versionNumber(2)
                    .questionStem("Q?").createdAt(ts).build();
            assertThat(a.hashCode()).isEqualTo(b.hashCode());
        }

        @Test
        @DisplayName("equals: differing on mcqId produces unequal objects")
        void equals_differentMcqId_notEqual() {
            LocalDateTime ts = LocalDateTime.of(2024, 8, 1, 0, 0);
            McqVersion a = McqVersion.builder().id(1L).mcqId(100L).versionNumber(1).createdAt(ts).build();
            McqVersion b = McqVersion.builder().id(1L).mcqId(200L).versionNumber(1).createdAt(ts).build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("equals: differing on questionStem produces unequal objects")
        void equals_differentQuestionStem_notEqual() {
            LocalDateTime ts = LocalDateTime.of(2024, 9, 1, 0, 0);
            McqVersion a = McqVersion.builder().id(1L).mcqId(1L).versionNumber(1)
                    .questionStem("Question Alpha").createdAt(ts).build();
            McqVersion b = McqVersion.builder().id(1L).mcqId(1L).versionNumber(1)
                    .questionStem("Question Beta").createdAt(ts).build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("equals: differing on difficulty produces unequal objects")
        void equals_differentDifficulty_notEqual() {
            LocalDateTime ts = LocalDateTime.of(2024, 10, 1, 0, 0);
            McqVersion a = McqVersion.builder().id(1L).mcqId(1L).versionNumber(1)
                    .questionStem("Q").difficulty("EASY").createdAt(ts).build();
            McqVersion b = McqVersion.builder().id(1L).mcqId(1L).versionNumber(1)
                    .questionStem("Q").difficulty("HARD").createdAt(ts).build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("equals: differing on changeNote produces unequal objects")
        void equals_differentChangeNote_notEqual() {
            LocalDateTime ts = LocalDateTime.of(2024, 11, 1, 0, 0);
            McqVersion a = McqVersion.builder().id(1L).mcqId(1L).versionNumber(1)
                    .questionStem("Q").difficulty("EASY")
                    .changedByName("Alice").changedByEnterpriseId("A01")
                    .statusAtTime("DRAFT").changeNote("First note").createdAt(ts).build();
            McqVersion b = McqVersion.builder().id(1L).mcqId(1L).versionNumber(1)
                    .questionStem("Q").difficulty("EASY")
                    .changedByName("Alice").changedByEnterpriseId("A01")
                    .statusAtTime("DRAFT").changeNote("Second note").createdAt(ts).build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("onCreate() lifecycle sets createdAt when null")
        void onCreate_setsCreatedAt_whenNull() {
            McqVersion v = new McqVersion();
            assertThat(v.getCreatedAt()).isNull();
            v.onCreate();
            assertThat(v.getCreatedAt()).isNotNull();
        }

        @Test
        @DisplayName("onCreate() lifecycle does NOT overwrite existing createdAt")
        void onCreate_doesNotOverwrite_existingCreatedAt() {
            LocalDateTime fixed = LocalDateTime.of(2023, 6, 15, 12, 0);
            McqVersion v = McqVersion.builder()
                    .mcqId(1L).versionNumber(1).createdAt(fixed).build();
            v.onCreate();
            assertThat(v.getCreatedAt()).isEqualTo(fixed);
        }

        @Test
        @DisplayName("full setter coverage including optionC, optionD")
        void setters_optionCAndD() {
            McqVersion v = new McqVersion();
            v.setOptionC("Option C value");
            v.setOptionD("Option D value");
            assertThat(v.getOptionC()).isEqualTo("Option C value");
            assertThat(v.getOptionD()).isEqualTo("Option D value");
        }

        @Test
        @DisplayName("builder with all option setters and changedBy fields")
        void builder_allFields() {
            LocalDateTime ts = LocalDateTime.of(2025, 2, 1, 10, 0);
            McqVersion v = McqVersion.builder()
                    .id(999L)
                    .mcqId(55L)
                    .versionNumber(7)
                    .questionStem("What is encapsulation?")
                    .optionA("Hiding data")
                    .optionB("Inheriting methods")
                    .optionC("Overloading")
                    .optionD("Multiple inheritance")
                    .correctAnswer("A")
                    .difficulty("MEDIUM")
                    .changedByName("Jane Smith")
                    .changedByEnterpriseId("JS999")
                    .statusAtTime("APPROVED")
                    .changeNote("Final version")
                    .createdAt(ts)
                    .build();

            assertThat(v.getId()).isEqualTo(999L);
            assertThat(v.getMcqId()).isEqualTo(55L);
            assertThat(v.getVersionNumber()).isEqualTo(7);
            assertThat(v.getQuestionStem()).isEqualTo("What is encapsulation?");
            assertThat(v.getOptionA()).isEqualTo("Hiding data");
            assertThat(v.getOptionB()).isEqualTo("Inheriting methods");
            assertThat(v.getOptionC()).isEqualTo("Overloading");
            assertThat(v.getOptionD()).isEqualTo("Multiple inheritance");
            assertThat(v.getCorrectAnswer()).isEqualTo("A");
            assertThat(v.getDifficulty()).isEqualTo("MEDIUM");
            assertThat(v.getChangedByName()).isEqualTo("Jane Smith");
            assertThat(v.getChangedByEnterpriseId()).isEqualTo("JS999");
            assertThat(v.getStatusAtTime()).isEqualTo("APPROVED");
            assertThat(v.getChangeNote()).isEqualTo("Final version");
            assertThat(v.getCreatedAt()).isEqualTo(ts);
        }

        @Test
        @DisplayName("all-args constructor sets every field")
        void allArgsConstructor_setsEveryField() {
            LocalDateTime ts = LocalDateTime.of(2024, 4, 10, 14, 30);

            McqVersion v = new McqVersion(
                    1L, 55L, 3, "What is encapsulation?",
                    "Hiding data", "Inheriting", "Polymorphism", "Abstraction",
                    "A", "MEDIUM", "Jane Doe", "JD100",
                    "APPROVED", "Fixed options", ts
            );

            assertThat(v.getId()).isEqualTo(1L);
            assertThat(v.getMcqId()).isEqualTo(55L);
            assertThat(v.getVersionNumber()).isEqualTo(3);
            assertThat(v.getQuestionStem()).isEqualTo("What is encapsulation?");
            assertThat(v.getOptionA()).isEqualTo("Hiding data");
            assertThat(v.getOptionB()).isEqualTo("Inheriting");
            assertThat(v.getOptionC()).isEqualTo("Polymorphism");
            assertThat(v.getOptionD()).isEqualTo("Abstraction");
            assertThat(v.getCorrectAnswer()).isEqualTo("A");
            assertThat(v.getDifficulty()).isEqualTo("MEDIUM");
            assertThat(v.getChangedByName()).isEqualTo("Jane Doe");
            assertThat(v.getChangedByEnterpriseId()).isEqualTo("JD100");
            assertThat(v.getStatusAtTime()).isEqualTo("APPROVED");
            assertThat(v.getChangeNote()).isEqualTo("Fixed options");
            assertThat(v.getCreatedAt()).isEqualTo(ts);
        }

        @Test
        @DisplayName("equals: two fully-populated McqVersions with same values are equal")
        void equals_twoFullyPopulated_equal() {
            LocalDateTime ts = LocalDateTime.of(2024, 6, 1, 10, 0);
            McqVersion a = McqVersion.builder()
                    .id(10L).mcqId(20L).versionNumber(2)
                    .questionStem("Q?").optionA("A1").optionB("B1").optionC("C1").optionD("D1")
                    .correctAnswer("A").difficulty("MEDIUM")
                    .changedByName("Alice").changedByEnterpriseId("A01")
                    .statusAtTime("DRAFT").changeNote("Note").createdAt(ts).build();
            McqVersion b = McqVersion.builder()
                    .id(10L).mcqId(20L).versionNumber(2)
                    .questionStem("Q?").optionA("A1").optionB("B1").optionC("C1").optionD("D1")
                    .correctAnswer("A").difficulty("MEDIUM")
                    .changedByName("Alice").changedByEnterpriseId("A01")
                    .statusAtTime("DRAFT").changeNote("Note").createdAt(ts).build();
            assertThat(a).isEqualTo(b);
            assertThat(a.hashCode()).isEqualTo(b.hashCode());
        }
    }

    // =========================================================================
    // ChatMessage – remaining @Builder.Default branch coverage and equals edge-cases
    // =========================================================================


    @Nested
    @DisplayName("ChatMessage – @Builder.Default branches and equals edge-cases")
    class ChatMessageDeepTests {

        @Test
        @DisplayName("equals(null) returns false")
        void equals_null_returnsFalse() {
            ChatMessage msg = ChatMessage.builder()
                    .senderEnterpriseId("EID1").content("Hello").build();
            assertThat(msg.equals(null)).isFalse();
        }

        @Test
        @DisplayName("equals(different type) returns false")
        void equals_differentType_returnsFalse() {
            ChatMessage msg = ChatMessage.builder()
                    .senderEnterpriseId("EID1").content("Hello").build();
            assertThat(msg.equals(new Object())).isFalse();
        }

        @Test
        @DisplayName("equals(same instance) returns true")
        void equals_sameInstance_returnsTrue() {
            ChatMessage msg = ChatMessage.builder()
                    .senderEnterpriseId("EID1").content("Hello").build();
            assertThat(msg.equals(msg)).isTrue();
        }

        @Test
        @DisplayName("hashCode is consistent across multiple calls")
        void hashCode_consistent() {
            ChatMessage msg = ChatMessage.builder()
                    .id(10L).senderEnterpriseId("EID2").content("World").build();
            assertThat(msg.hashCode()).isEqualTo(msg.hashCode());
        }

        @Test
        @DisplayName("hashCode: two equal objects have same hashCode")
        void hashCode_equalObjects() {
            LocalDateTime ts = LocalDateTime.of(2025, 1, 1, 0, 0);
            ChatMessage a = ChatMessage.builder()
                    .id(1L).senderEnterpriseId("EID3").content("Msg").createdAt(ts).build();
            ChatMessage b = ChatMessage.builder()
                    .id(1L).senderEnterpriseId("EID3").content("Msg").createdAt(ts).build();
            assertThat(a.hashCode()).isEqualTo(b.hashCode());
        }

        @Test
        @DisplayName("@Builder.Default: building WITHOUT msgType gives 'USER'")
        void builderDefault_msgType_isUser_whenNotSet() {
            ChatMessage msg = ChatMessage.builder()
                    .senderEnterpriseId("EID4").content("Test").build();
            assertThat(msg.getMsgType()).isEqualTo("USER");
        }

        @Test
        @DisplayName("@Builder.Default: building WITH explicit msgType='BOT' overrides default")
        void builderDefault_msgType_bot_overridesDefault() {
            ChatMessage msg = ChatMessage.builder()
                    .senderEnterpriseId("EID5").content("Bot msg").msgType("BOT").build();
            assertThat(msg.getMsgType()).isEqualTo("BOT");
        }

        @Test
        @DisplayName("@Builder.Default: building WITHOUT reactions gives '{}'")
        void builderDefault_reactions_isEmptyJson_whenNotSet() {
            ChatMessage msg = ChatMessage.builder()
                    .senderEnterpriseId("EID6").content("No reactions").build();
            assertThat(msg.getReactions()).isEqualTo("{}");
        }

        @Test
        @DisplayName("@Builder.Default: building WITH explicit reactions overrides default")
        void builderDefault_reactions_explicit_overridesDefault() {
            String json = "{\"👍\":[\"alice\"]}";
            ChatMessage msg = ChatMessage.builder()
                    .senderEnterpriseId("EID7").content("Has reactions").reactions(json).build();
            assertThat(msg.getReactions()).isEqualTo(json);
        }

        @Test
        @DisplayName("@Builder.Default: building WITHOUT pinned gives false")
        void builderDefault_pinned_isFalse_whenNotSet() {
            ChatMessage msg = ChatMessage.builder()
                    .senderEnterpriseId("EID8").content("Unpinned").build();
            assertThat(msg.getPinned()).isFalse();
        }

        @Test
        @DisplayName("@Builder.Default: building WITH pinned=true overrides default")
        void builderDefault_pinned_true_overridesDefault() {
            ChatMessage msg = ChatMessage.builder()
                    .senderEnterpriseId("EID9").content("Pinned").pinned(true).build();
            assertThat(msg.getPinned()).isTrue();
        }

        @Test
        @DisplayName("@Builder.Default: building WITHOUT deleted gives false")
        void builderDefault_deleted_isFalse_whenNotSet() {
            ChatMessage msg = ChatMessage.builder()
                    .senderEnterpriseId("EID10").content("Not deleted").build();
            assertThat(msg.getDeleted()).isFalse();
        }

        @Test
        @DisplayName("@Builder.Default: building WITH deleted=true overrides default")
        void builderDefault_deleted_true_overridesDefault() {
            ChatMessage msg = ChatMessage.builder()
                    .senderEnterpriseId("EID11").content("Deleted msg").deleted(true).build();
            assertThat(msg.getDeleted()).isTrue();
        }

        @Test
        @DisplayName("equals: differing on senderEnterpriseId produces unequal objects")
        void equals_differentSenderEnterpriseId_notEqual() {
            ChatMessage a = ChatMessage.builder().id(1L).senderEnterpriseId("EID_A").content("X").build();
            ChatMessage b = ChatMessage.builder().id(1L).senderEnterpriseId("EID_B").content("X").build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("equals: differing on senderName produces unequal objects")
        void equals_differentSenderName_notEqual() {
            ChatMessage a = ChatMessage.builder().id(1L).senderEnterpriseId("E").senderName("Alice").content("X").build();
            ChatMessage b = ChatMessage.builder().id(1L).senderEnterpriseId("E").senderName("Bob").content("X").build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("equals: differing on replyToId produces unequal objects")
        void equals_differentReplyToId_notEqual() {
            ChatMessage a = ChatMessage.builder().id(1L).senderEnterpriseId("E")
                    .senderName("N").senderRole("SME").content("X").msgType("USER")
                    .replyToId(1L).build();
            ChatMessage b = ChatMessage.builder().id(1L).senderEnterpriseId("E")
                    .senderName("N").senderRole("SME").content("X").msgType("USER")
                    .replyToId(2L).build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("all reply-threading setters round-trip")
        void setters_replyThreading() {
            ChatMessage msg = new ChatMessage();
            msg.setReplyToId(99L);
            msg.setReplyToContent("Original message content");
            msg.setReplyToSender("Original Sender");

            assertThat(msg.getReplyToId()).isEqualTo(99L);
            assertThat(msg.getReplyToContent()).isEqualTo("Original message content");
            assertThat(msg.getReplyToSender()).isEqualTo("Original Sender");
        }

        @Test
        @DisplayName("senderRole setter covers that setter path")
        void setter_senderRole() {
            ChatMessage msg = new ChatMessage();
            msg.setSenderRole("ADMIN");
            assertThat(msg.getSenderRole()).isEqualTo("ADMIN");
        }

        @Test
        @DisplayName("toString does not throw with fully populated message")
        void toString_fullyPopulated() {
            ChatMessage msg = ChatMessage.builder()
                    .id(777L)
                    .senderEnterpriseId("UNIQUE_777")
                    .senderName("Test Name")
                    .senderRole("SME")
                    .content("Test message content")
                    .msgType("USER")
                    .replyToId(5L)
                    .replyToContent("Replied to this")
                    .replyToSender("Reply Sender")
                    .reactions("{\"👍\":[\"a\"]}")
                    .pinned(false)
                    .deleted(false)
                    .editedAt(LocalDateTime.of(2025, 5, 1, 12, 0))
                    .build();
            assertThatCode(msg::toString).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("equals: two fully-populated ChatMessages with same values are equal")
        void equals_twoFullyPopulated_equal() {
            LocalDateTime ts = LocalDateTime.of(2024, 5, 5, 5, 5);
            LocalDateTime edited = LocalDateTime.of(2024, 5, 5, 6, 0);
            ChatMessage a = ChatMessage.builder()
                    .id(1L).senderEnterpriseId("EID").senderName("Alice").senderRole("SME")
                    .content("Msg").msgType("USER").createdAt(ts)
                    .replyToId(5L).replyToContent("Original").replyToSender("Bob")
                    .reactions("{}").pinned(false).deleted(false).editedAt(edited).build();
            ChatMessage b = ChatMessage.builder()
                    .id(1L).senderEnterpriseId("EID").senderName("Alice").senderRole("SME")
                    .content("Msg").msgType("USER").createdAt(ts)
                    .replyToId(5L).replyToContent("Original").replyToSender("Bob")
                    .reactions("{}").pinned(false).deleted(false).editedAt(edited).build();
            assertThat(a).isEqualTo(b);
            assertThat(a.hashCode()).isEqualTo(b.hashCode());
        }
    }

    // =========================================================================
    // QuizSession – remaining equals edge-cases and all-args constructor
    // =========================================================================

    @Nested
    @DisplayName("QuizSession – all-args constructor, equals edge-cases, hashCode")
    class QuizSessionDeepTests {

        @Test
        @DisplayName("all-args constructor sets every field")
        void allArgsConstructor_setsEveryField() {
            LocalDateTime created = LocalDateTime.of(2025, 4, 1, 9, 0);
            LocalDateTime expires = LocalDateTime.of(2025, 4, 1, 12, 0);

            QuizSession session = new QuizSession(
                    42L,
                    "Advanced Java Quiz",
                    "share-token-42",
                    "10,20,30,40",
                    60,
                    "E001",
                    "Alice Admin",
                    created,
                    expires
            );

            assertThat(session.getId()).isEqualTo(42L);
            assertThat(session.getTitle()).isEqualTo("Advanced Java Quiz");
            assertThat(session.getShareToken()).isEqualTo("share-token-42");
            assertThat(session.getMcqIds()).isEqualTo("10,20,30,40");
            assertThat(session.getTimeLimitMinutes()).isEqualTo(60);
            assertThat(session.getCreatedBy()).isEqualTo("E001");
            assertThat(session.getCreatedByName()).isEqualTo("Alice Admin");
            assertThat(session.getCreatedAt()).isEqualTo(created);
            assertThat(session.getExpiresAt()).isEqualTo(expires);
        }

        @Test
        @DisplayName("equals(null) returns false")
        void equals_null_returnsFalse() {
            QuizSession session = QuizSession.builder()
                    .id(1L).title("Quiz").shareToken("tok").mcqIds("1").createdBy("E1").build();
            assertThat(session.equals(null)).isFalse();
        }

        @Test
        @DisplayName("equals(different type) returns false")
        void equals_differentType_returnsFalse() {
            QuizSession session = QuizSession.builder()
                    .id(1L).title("Quiz").shareToken("tok").mcqIds("1").createdBy("E1").build();
            assertThat(session.equals("not-a-session")).isFalse();
        }

        @Test
        @DisplayName("equals(same instance) returns true")
        void equals_sameInstance_returnsTrue() {
            QuizSession session = QuizSession.builder()
                    .id(1L).title("Quiz").shareToken("tok").mcqIds("1").createdBy("E1").build();
            assertThat(session.equals(session)).isTrue();
        }

        @Test
        @DisplayName("hashCode is consistent across multiple calls")
        void hashCode_consistent() {
            QuizSession session = QuizSession.builder()
                    .id(5L).title("Spring Boot Quiz").shareToken("sb-tok")
                    .mcqIds("1,2,3").timeLimitMinutes(45).createdBy("E002").build();
            assertThat(session.hashCode()).isEqualTo(session.hashCode());
        }

        @Test
        @DisplayName("hashCode: two equal objects have same hashCode")
        void hashCode_equalObjects_sameHashCode() {
            QuizSession a = QuizSession.builder()
                    .id(1L).title("T").shareToken("tok").mcqIds("1").createdBy("E1").build();
            QuizSession b = QuizSession.builder()
                    .id(1L).title("T").shareToken("tok").mcqIds("1").createdBy("E1").build();
            assertThat(a.hashCode()).isEqualTo(b.hashCode());
        }

        @Test
        @DisplayName("equals: differing on title produces unequal objects")
        void equals_differentTitle_notEqual() {
            QuizSession a = QuizSession.builder()
                    .id(1L).title("Quiz A").shareToken("tok").mcqIds("1").createdBy("E1").build();
            QuizSession b = QuizSession.builder()
                    .id(1L).title("Quiz B").shareToken("tok").mcqIds("1").createdBy("E1").build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("equals: differing on mcqIds produces unequal objects")
        void equals_differentMcqIds_notEqual() {
            QuizSession a = QuizSession.builder()
                    .id(1L).title("T").shareToken("tok").mcqIds("1,2,3").createdBy("E1").build();
            QuizSession b = QuizSession.builder()
                    .id(1L).title("T").shareToken("tok").mcqIds("4,5,6").createdBy("E1").build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("equals: differing on createdBy produces unequal objects")
        void equals_differentCreatedBy_notEqual() {
            QuizSession a = QuizSession.builder()
                    .id(1L).title("T").shareToken("tok").mcqIds("1")
                    .timeLimitMinutes(30).createdBy("E_A").build();
            QuizSession b = QuizSession.builder()
                    .id(1L).title("T").shareToken("tok").mcqIds("1")
                    .timeLimitMinutes(30).createdBy("E_B").build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("equals: differing on timeLimitMinutes produces unequal objects")
        void equals_differentTimeLimitMinutes_notEqual() {
            QuizSession a = QuizSession.builder()
                    .id(1L).title("T").shareToken("tok").mcqIds("1")
                    .timeLimitMinutes(30).createdBy("E1").createdByName("Alice").build();
            QuizSession b = QuizSession.builder()
                    .id(1L).title("T").shareToken("tok").mcqIds("1")
                    .timeLimitMinutes(60).createdBy("E1").createdByName("Alice").build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("@Builder.Default: building WITHOUT timeLimitMinutes gives 30")
        void builderDefault_timeLimitMinutes_isThirty_whenNotSet() {
            QuizSession session = QuizSession.builder()
                    .title("Default TL Quiz").shareToken("dtl-tok").mcqIds("1").createdBy("E1").build();
            assertThat(session.getTimeLimitMinutes()).isEqualTo(30);
        }

        @Test
        @DisplayName("@Builder.Default: building WITH timeLimitMinutes=120 overrides default")
        void builderDefault_timeLimitMinutes_overridden() {
            QuizSession session = QuizSession.builder()
                    .title("Long Quiz").shareToken("long-tok").mcqIds("1")
                    .createdBy("E1").timeLimitMinutes(120).build();
            assertThat(session.getTimeLimitMinutes()).isEqualTo(120);
        }

        @Test
        @DisplayName("createdByName setter updates field independently")
        void setter_createdByName() {
            QuizSession session = new QuizSession();
            session.setCreatedByName("Bob Manager");
            assertThat(session.getCreatedByName()).isEqualTo("Bob Manager");
        }

        @Test
        @DisplayName("toString does not throw and contains QuizSession class name")
        void toString_doesNotThrow() {
            QuizSession session = QuizSession.builder()
                    .id(888L).title("Unique_Session_888").shareToken("unique-tok-888")
                    .mcqIds("1,2").createdBy("E888").build();
            assertThatCode(session::toString).doesNotThrowAnyException();
            assertThat(session.toString()).contains("Unique_Session_888");
        }

        @Test
        @DisplayName("fully-populated builder with all fields including expiresAt")
        void builder_fullyPopulated() {
            LocalDateTime created = LocalDateTime.of(2025, 6, 1, 8, 0);
            LocalDateTime expires = created.plusHours(3);

            QuizSession session = QuizSession.builder()
                    .id(9L)
                    .title("Full Session")
                    .shareToken("full-session-tok")
                    .mcqIds("100,200,300")
                    .timeLimitMinutes(45)
                    .createdBy("E999")
                    .createdByName("Full Admin")
                    .createdAt(created)
                    .expiresAt(expires)
                    .build();

            assertThat(session.getId()).isEqualTo(9L);
            assertThat(session.getTitle()).isEqualTo("Full Session");
            assertThat(session.getShareToken()).isEqualTo("full-session-tok");
            assertThat(session.getMcqIds()).isEqualTo("100,200,300");
            assertThat(session.getTimeLimitMinutes()).isEqualTo(45);
            assertThat(session.getCreatedBy()).isEqualTo("E999");
            assertThat(session.getCreatedByName()).isEqualTo("Full Admin");
            assertThat(session.getCreatedAt()).isEqualTo(created);
            assertThat(session.getExpiresAt()).isEqualTo(expires);
        }
    }
}
