package com.accenture.quizhub.entity;

import com.accenture.quizhub.enums.Difficulty;
import com.accenture.quizhub.enums.McqStatus;
import com.accenture.quizhub.enums.Role;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * Targeted POJO / Lombok coverage tests for Mcq, User, and McqComment.
 * Focuses on: allArgsConstructors, @Builder.Default status, equals/canEqual
 * edge-cases, and setter paths not yet covered by earlier EntityGroup tests.
 * No Spring context required.
 */
@DisplayName("EntityGroup8 – Mcq allArgsConstructor, User allArgsConstructor, McqComment edge-cases")
class EntityGroup8Test {

    // =========================================================================
    // Mcq – allArgsConstructor, builder @Default, canEqual
    // =========================================================================

    @Nested
    @DisplayName("Mcq – allArgsConstructor and builder @Default")
    class McqAllArgsTests {

        private User buildUser(Long id, String eid) {
            return User.builder()
                    .id(id).enterpriseId(eid).fullName("User " + eid)
                    .email(eid + "@eg8.com").passwordHash("hash").role(Role.SME)
                    .build();
        }

        @Test
        @DisplayName("allArgsConstructor: all 20 fields set correctly")
        void allArgsConstructor_setsAllFields() {
            User creator  = buildUser(1L, "CR8_01");
            User reviewer = buildUser(2L, "RV8_01");
            TechStack ts  = TechStack.builder().id(10L).name("Scala").build();
            Topic topic   = Topic.builder().id(20L).name("Futures").techStack(ts).build();
            LocalDateTime now = LocalDateTime.of(2025, 6, 1, 9, 0);
            List<ReviewComment> comments = new ArrayList<>();

            Mcq mcq = new Mcq(
                    99L, "AllArgs question?",
                    "Opt A", "Opt B", "Opt C", "Opt D",
                    "C", Difficulty.HARD, McqStatus.APPROVED,
                    ts, topic, creator, reviewer, comments,
                    3, 88, "MEDIUM", "minor warning",
                    now, now.plusMinutes(10)
            );

            assertThat(mcq.getId()).isEqualTo(99L);
            assertThat(mcq.getQuestionStem()).isEqualTo("AllArgs question?");
            assertThat(mcq.getOptionA()).isEqualTo("Opt A");
            assertThat(mcq.getOptionB()).isEqualTo("Opt B");
            assertThat(mcq.getOptionC()).isEqualTo("Opt C");
            assertThat(mcq.getOptionD()).isEqualTo("Opt D");
            assertThat(mcq.getCorrectAnswer()).isEqualTo("C");
            assertThat(mcq.getDifficulty()).isEqualTo(Difficulty.HARD);
            assertThat(mcq.getStatus()).isEqualTo(McqStatus.APPROVED);
            assertThat(mcq.getTechStack()).isSameAs(ts);
            assertThat(mcq.getTopic()).isSameAs(topic);
            assertThat(mcq.getCreator()).isSameAs(creator);
            assertThat(mcq.getReviewer()).isSameAs(reviewer);
            assertThat(mcq.getComments()).isEmpty();
            assertThat(mcq.getVersion()).isEqualTo(3);
            assertThat(mcq.getAiScore()).isEqualTo(88);
            assertThat(mcq.getAiRisk()).isEqualTo("MEDIUM");
            assertThat(mcq.getAiWarning()).isEqualTo("minor warning");
            assertThat(mcq.getCreatedAt()).isEqualTo(now);
            assertThat(mcq.getUpdatedAt()).isEqualTo(now.plusMinutes(10));
        }

        @Test
        @DisplayName("allArgsConstructor: null optional fields do not throw")
        void allArgsConstructor_nullOptionalFields_noThrow() {
            assertThatCode(() -> {
                Mcq mcq = new Mcq(
                        4L, "Null-optional Q",
                        "A", "B", "C", "D",
                        "A", Difficulty.EASY, McqStatus.DRAFT,
                        null, null, buildUser(7L, "CR8_NL"), null, null,
                        null, null, null, null,
                        null, null
                );
                assertThat(mcq.getTechStack()).isNull();
                assertThat(mcq.getTopic()).isNull();
                assertThat(mcq.getReviewer()).isNull();
                assertThat(mcq.getComments()).isNull();
                assertThat(mcq.getVersion()).isNull();
                assertThat(mcq.getAiScore()).isNull();
                assertThat(mcq.getAiRisk()).isNull();
                assertThat(mcq.getAiWarning()).isNull();
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("builder @Builder.Default: status is DRAFT when not explicitly set")
        void builder_withoutStatus_defaultsToDraft() {
            Mcq mcq = Mcq.builder()
                    .id(1L)
                    .questionStem("Default status test")
                    .optionA("A").optionB("B").optionC("C").optionD("D")
                    .correctAnswer("A")
                    .difficulty(Difficulty.EASY)
                    .creator(buildUser(3L, "CR8_DEF"))
                    .build();

            assertThat(mcq.getStatus()).isEqualTo(McqStatus.DRAFT);
        }

        @Test
        @DisplayName("equals: two allArgs instances with identical fields are equal")
        void equals_allArgsInstances_areEqual() {
            User creator  = buildUser(4L, "CR8_EQ");
            TechStack ts  = TechStack.builder().id(11L).name("Groovy").build();
            LocalDateTime now = LocalDateTime.of(2025, 1, 1, 0, 0);

            Mcq a = new Mcq(1L, "Q", "A", "B", "C", "D", "A",
                    Difficulty.EASY, McqStatus.DRAFT, ts, null, creator, null,
                    new ArrayList<>(), 1, null, null, null, now, now);
            Mcq b = new Mcq(1L, "Q", "A", "B", "C", "D", "A",
                    Difficulty.EASY, McqStatus.DRAFT, ts, null, creator, null,
                    new ArrayList<>(), 1, null, null, null, now, now);

            assertThat(a).isEqualTo(b);
            assertThat(a.hashCode()).isEqualTo(b.hashCode());
        }

        @Test
        @DisplayName("equals: allArgs vs builder – same fields produce equal instances")
        void equals_allArgsVsBuilder_sameFields_equal() {
            User creator = buildUser(5L, "CR8_MX");
            TechStack ts = TechStack.builder().id(12L).name("Elixir").build();
            LocalDateTime ts1 = LocalDateTime.of(2025, 2, 1, 0, 0);

            Mcq allArgs = new Mcq(2L, "MixQ", "1", "2", "3", "4", "B",
                    Difficulty.MEDIUM, McqStatus.APPROVED, ts, null, creator, null,
                    new ArrayList<>(), 0, 70, "LOW", null, ts1, ts1);
            Mcq built = Mcq.builder()
                    .id(2L).questionStem("MixQ")
                    .optionA("1").optionB("2").optionC("3").optionD("4")
                    .correctAnswer("B").difficulty(Difficulty.MEDIUM).status(McqStatus.APPROVED)
                    .techStack(ts).creator(creator).comments(new ArrayList<>())
                    .version(0).aiScore(70).aiRisk("LOW").createdAt(ts1).updatedAt(ts1)
                    .build();

            assertThat(allArgs).isEqualTo(built);
        }

        @Test
        @DisplayName("toString: allArgs instance does not throw and contains key content")
        void toString_allArgsInstance_doesNotThrow() {
            Mcq mcq = new Mcq(3L, "ToStr_Unique_MCQ_8", "A", "B", "C", "D", "D",
                    Difficulty.HARD, McqStatus.REJECTED, null, null,
                    buildUser(6L, "CR8_TS"), null, null, null, null, null, null,
                    LocalDateTime.now(), LocalDateTime.now());

            assertThatCode(mcq::toString).doesNotThrowAnyException();
            assertThat(mcq.toString()).contains("ToStr_Unique_MCQ_8");
        }

        @Test
        @DisplayName("canEqual: same type returns true")
        void canEqual_sameType_returnsTrue() {
            Mcq a = Mcq.builder().id(1L).difficulty(Difficulty.EASY).status(McqStatus.DRAFT).build();
            Mcq b = Mcq.builder().id(2L).difficulty(Difficulty.HARD).status(McqStatus.APPROVED).build();
            assertThat(a.canEqual(b)).isTrue();
        }

        @Test
        @DisplayName("canEqual: null returns false")
        void canEqual_null_returnsFalse() {
            Mcq a = Mcq.builder().id(1L).difficulty(Difficulty.EASY).status(McqStatus.DRAFT).build();
            assertThat(a.canEqual(null)).isFalse();
        }

        @Test
        @DisplayName("canEqual: different type returns false")
        void canEqual_differentType_returnsFalse() {
            Mcq a = Mcq.builder().id(1L).difficulty(Difficulty.EASY).status(McqStatus.DRAFT).build();
            assertThat(a.canEqual("not an Mcq")).isFalse();
        }
    }

    // =========================================================================
    // User – allArgsConstructor and equals/canEqual edge-cases
    // =========================================================================

    @Nested
    @DisplayName("User – allArgsConstructor and equals/canEqual edge-cases")
    class UserAllArgsTests {

        private TechStack ts(Long id, String name) {
            return TechStack.builder().id(id).name(name).build();
        }

        @Test
        @DisplayName("allArgsConstructor: all 8 fields set correctly")
        void allArgsConstructor_setsAllFields() {
            List<TechStack> stacks = Arrays.asList(ts(1L, "Java"), ts(2L, "Kotlin"));

            User user = new User(
                    42L,
                    "EMP8_001",
                    "All Args User",
                    "allargs@eg8.com",
                    "$2a$12$hashedpassword",
                    Role.SME,
                    true,
                    stacks
            );

            assertThat(user.getId()).isEqualTo(42L);
            assertThat(user.getEnterpriseId()).isEqualTo("EMP8_001");
            assertThat(user.getFullName()).isEqualTo("All Args User");
            assertThat(user.getEmail()).isEqualTo("allargs@eg8.com");
            assertThat(user.getPasswordHash()).isEqualTo("$2a$12$hashedpassword");
            assertThat(user.getRole()).isEqualTo(Role.SME);
            assertThat(user.isApproved()).isTrue();
            assertThat(user.getTechStacks()).hasSize(2);
        }

        @Test
        @DisplayName("allArgsConstructor: approved=false is preserved")
        void allArgsConstructor_approvedFalse_preserved() {
            User user = new User(
                    43L, "EMP8_002", "Unapproved User",
                    "unapp@eg8.com", "hash8", Role.ADMIN,
                    false, null
            );

            assertThat(user.isApproved()).isFalse();
            assertThat(user.getRole()).isEqualTo(Role.ADMIN);
            assertThat(user.getTechStacks()).isNull();
        }

        @Test
        @DisplayName("allArgsConstructor: ADMIN role with empty tech-stack list")
        void allArgsConstructor_adminRole_emptyStacks() {
            List<TechStack> empty = new ArrayList<>();
            User user = new User(
                    44L, "EMP8_003", "Admin User",
                    "admin@eg8.com", "adminHash", Role.ADMIN,
                    true, empty
            );

            assertThat(user.getRole()).isEqualTo(Role.ADMIN);
            assertThat(user.getTechStacks()).isEmpty();
        }

        @Test
        @DisplayName("equals(null) returns false")
        void equals_null_returnsFalse() {
            User user = User.builder()
                    .id(1L).enterpriseId("E8A").fullName("F").email("e@eg8.com")
                    .passwordHash("h").role(Role.SME).build();
            assertThat(user.equals(null)).isFalse();
        }

        @Test
        @DisplayName("equals(different type) returns false")
        void equals_differentType_returnsFalse() {
            User user = User.builder()
                    .id(1L).enterpriseId("E8B").fullName("F").email("e@eg8.com")
                    .passwordHash("h").role(Role.SME).build();
            assertThat(user.equals("not a user")).isFalse();
            assertThat(user.equals(42L)).isFalse();
        }

        @Test
        @DisplayName("equals(same instance) returns true")
        void equals_sameInstance_returnsTrue() {
            User user = User.builder()
                    .id(2L).enterpriseId("E8C").fullName("F").email("e@eg8.com")
                    .passwordHash("h").role(Role.SME).build();
            assertThat(user.equals(user)).isTrue();
        }

        @Test
        @DisplayName("equals: different enterpriseId produces unequal instances")
        void equals_differentEnterpriseId_notEqual() {
            User a = User.builder().id(1L).enterpriseId("EMP_8A").fullName("F")
                    .email("a@eg8.com").passwordHash("h").role(Role.SME).build();
            User b = User.builder().id(1L).enterpriseId("EMP_8B").fullName("F")
                    .email("a@eg8.com").passwordHash("h").role(Role.SME).build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("equals: different role produces unequal instances")
        void equals_differentRole_notEqual() {
            User a = User.builder().id(3L).enterpriseId("E3_8").fullName("F")
                    .email("a@eg8.com").passwordHash("h").role(Role.SME).build();
            User b = User.builder().id(3L).enterpriseId("E3_8").fullName("F")
                    .email("a@eg8.com").passwordHash("h").role(Role.ADMIN).build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("equals: different approved value produces unequal instances")
        void equals_differentApproved_notEqual() {
            User a = User.builder().id(4L).enterpriseId("E4_8").fullName("F")
                    .email("a@eg8.com").passwordHash("h").role(Role.SME).approved(true).build();
            User b = User.builder().id(4L).enterpriseId("E4_8").fullName("F")
                    .email("a@eg8.com").passwordHash("h").role(Role.SME).approved(false).build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("canEqual: same type returns true")
        void canEqual_sameType_returnsTrue() {
            User a = User.builder().id(1L).enterpriseId("E8X").role(Role.SME).build();
            User b = User.builder().id(2L).enterpriseId("E8Y").role(Role.ADMIN).build();
            assertThat(a.canEqual(b)).isTrue();
        }

        @Test
        @DisplayName("canEqual: null returns false")
        void canEqual_null_returnsFalse() {
            User a = User.builder().id(1L).enterpriseId("E8Z").role(Role.SME).build();
            assertThat(a.canEqual(null)).isFalse();
        }

        @Test
        @DisplayName("hashCode: equal objects have same hash code")
        void hashCode_equalObjects_sameHash() {
            User a = User.builder().id(5L).enterpriseId("E5_8A").fullName("Same")
                    .email("s@eg8.com").passwordHash("ph").role(Role.SME).approved(true).build();
            User b = User.builder().id(5L).enterpriseId("E5_8A").fullName("Same")
                    .email("s@eg8.com").passwordHash("ph").role(Role.SME).approved(true).build();
            assertThat(a).isEqualTo(b);
            assertThat(a.hashCode()).isEqualTo(b.hashCode());
        }

        @Test
        @DisplayName("toString: contains key identifying fields")
        void toString_containsKeyFields() {
            User user = User.builder()
                    .id(6L).enterpriseId("E8_TS_USER").fullName("ToString_User_8")
                    .email("ts@eg8.com").passwordHash("hts").role(Role.SME).build();
            String str = user.toString();
            assertThat(str).contains("E8_TS_USER");
            assertThat(str).contains("ToString_User_8");
        }
    }

    // =========================================================================
    // McqComment – additional edge-case and setter coverage
    // =========================================================================

    @Nested
    @DisplayName("McqComment – additional edge-case and setter coverage")
    class McqCommentEdgeCaseTests {

        @Test
        @DisplayName("setCreatedAt setter updates the createdAt field")
        void setCreatedAt_updatesField() {
            McqComment comment = new McqComment();
            LocalDateTime ts = LocalDateTime.of(2025, 3, 15, 10, 0);
            comment.setCreatedAt(ts);
            assertThat(comment.getCreatedAt()).isEqualTo(ts);
        }

        @Test
        @DisplayName("equals(null) returns false")
        void equals_null_returnsFalse() {
            McqComment c = McqComment.builder().id(1L).mcqId(10L)
                    .authorEnterpriseId("a").content("text").build();
            assertThat(c.equals(null)).isFalse();
        }

        @Test
        @DisplayName("equals(different type) returns false")
        void equals_differentType_returnsFalse() {
            McqComment c = McqComment.builder().id(1L).mcqId(10L)
                    .authorEnterpriseId("a").content("text").build();
            assertThat(c.equals("string")).isFalse();
            assertThat(c.equals(42)).isFalse();
        }

        @Test
        @DisplayName("equals(same instance) returns true")
        void equals_sameInstance_returnsTrue() {
            McqComment c = McqComment.builder().id(1L).mcqId(10L)
                    .authorEnterpriseId("a").content("text").build();
            assertThat(c.equals(c)).isTrue();
        }

        @Test
        @DisplayName("canEqual: same type returns true")
        void canEqual_sameType_returnsTrue() {
            McqComment a = McqComment.builder().id(1L).mcqId(10L).authorEnterpriseId("a").content("x").build();
            McqComment b = McqComment.builder().id(2L).mcqId(20L).authorEnterpriseId("b").content("y").build();
            assertThat(a.canEqual(b)).isTrue();
        }

        @Test
        @DisplayName("canEqual: null returns false")
        void canEqual_null_returnsFalse() {
            McqComment c = McqComment.builder().id(1L).mcqId(10L).authorEnterpriseId("a").content("x").build();
            assertThat(c.canEqual(null)).isFalse();
        }

        @Test
        @DisplayName("equals: different content produces unequal instances")
        void equals_differentContent_notEqual() {
            McqComment a = McqComment.builder().id(1L).mcqId(10L)
                    .authorEnterpriseId("a").content("first content").build();
            McqComment b = McqComment.builder().id(1L).mcqId(10L)
                    .authorEnterpriseId("a").content("second content").build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("equals: different authorEnterpriseId produces unequal instances")
        void equals_differentAuthorEnterpriseId_notEqual() {
            McqComment a = McqComment.builder().id(5L).mcqId(50L)
                    .authorEnterpriseId("user1").content("same").build();
            McqComment b = McqComment.builder().id(5L).mcqId(50L)
                    .authorEnterpriseId("user2").content("same").build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("equals: different parentId produces unequal instances")
        void equals_differentParentId_notEqual() {
            McqComment a = McqComment.builder().id(3L).mcqId(30L)
                    .authorEnterpriseId("u").content("c").parentId(1L).build();
            McqComment b = McqComment.builder().id(3L).mcqId(30L)
                    .authorEnterpriseId("u").content("c").parentId(99L).build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("hashCode: consistent across multiple calls")
        void hashCode_consistent() {
            McqComment c = McqComment.builder().id(7L).mcqId(70L)
                    .authorEnterpriseId("consistent").content("hash test").build();
            assertThat(c.hashCode()).isEqualTo(c.hashCode());
        }

        @Test
        @DisplayName("setAuthorName and setAuthorEnterpriseId round-trip via setters")
        void setAuthorNameAndEid_roundTrip() {
            McqComment c = new McqComment();
            c.setAuthorEnterpriseId("new.eid");
            c.setAuthorName("New Author Name");
            assertThat(c.getAuthorEnterpriseId()).isEqualTo("new.eid");
            assertThat(c.getAuthorName()).isEqualTo("New Author Name");
        }

        @Test
        @DisplayName("setMcqId and setContent round-trip via setters")
        void setMcqIdAndContent_roundTrip() {
            McqComment c = new McqComment();
            c.setMcqId(999L);
            c.setContent("Updated content text");
            assertThat(c.getMcqId()).isEqualTo(999L);
            assertThat(c.getContent()).isEqualTo("Updated content text");
        }

        @Test
        @DisplayName("setParentId: setting and clearing parentId")
        void setParentId_setAndClear() {
            McqComment c = new McqComment();
            c.setParentId(42L);
            assertThat(c.getParentId()).isEqualTo(42L);
            c.setParentId(null);
            assertThat(c.getParentId()).isNull();
        }
    }
}
