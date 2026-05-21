package com.accenture.quizhub.entity;

import com.accenture.quizhub.enums.Role;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * Thorough POJO / Lombok unit tests for QuizSession, QuizAttempt (additional),
 * Notification (additional), and InboxMessage (additional).
 *
 * Goals:
 * - Every builder method is called at least once.
 * - All-args constructors are exercised.
 * - equals / hashCode / toString edge-cases are covered.
 * - @Builder.Default fields are tested both with and without explicit overrides.
 *
 * No Spring context required.
 */
@DisplayName("EntityGroup7 – QuizSession, QuizAttempt extras, Notification extras, InboxMessage extras")
class EntityGroup7Test {

    // =========================================================================
    // QuizSession – full coverage
    // =========================================================================
    @Nested
    @DisplayName("QuizSession – comprehensive coverage")
    class QuizSessionTests {

        @Test
        @DisplayName("@Builder.Default: timeLimitMinutes defaults to 30 when not set")
        void builderDefault_timeLimitMinutes_is30() {
            QuizSession session = QuizSession.builder()
                    .title("Default Timer Session")
                    .shareToken("token-default")
                    .mcqIds("1,2,3")
                    .createdBy("eid.default")
                    .build();
            assertThat(session.getTimeLimitMinutes()).isEqualTo(30);
        }

        @Test
        @DisplayName("builder: explicit timeLimitMinutes overrides default")
        void builder_explicitTimeLimitMinutes_overridesDefault() {
            QuizSession session = QuizSession.builder()
                    .title("Custom Timer Session")
                    .shareToken("token-custom")
                    .mcqIds("4,5,6")
                    .timeLimitMinutes(60)
                    .createdBy("eid.custom")
                    .build();
            assertThat(session.getTimeLimitMinutes()).isEqualTo(60);
        }

        @Test
        @DisplayName("builder: all fields set correctly")
        void builder_allFields_setsEverything() {
            LocalDateTime created = LocalDateTime.of(2024, 5, 1, 10, 0);
            LocalDateTime expires = LocalDateTime.of(2024, 5, 1, 13, 0);

            QuizSession session = QuizSession.builder()
                    .id(100L)
                    .title("Full Field Session")
                    .shareToken("share-abc-123")
                    .mcqIds("10,20,30,40")
                    .timeLimitMinutes(45)
                    .createdBy("admin.user")
                    .createdByName("Admin User")
                    .createdAt(created)
                    .expiresAt(expires)
                    .build();

            assertThat(session.getId()).isEqualTo(100L);
            assertThat(session.getTitle()).isEqualTo("Full Field Session");
            assertThat(session.getShareToken()).isEqualTo("share-abc-123");
            assertThat(session.getMcqIds()).isEqualTo("10,20,30,40");
            assertThat(session.getTimeLimitMinutes()).isEqualTo(45);
            assertThat(session.getCreatedBy()).isEqualTo("admin.user");
            assertThat(session.getCreatedByName()).isEqualTo("Admin User");
            assertThat(session.getCreatedAt()).isEqualTo(created);
            assertThat(session.getExpiresAt()).isEqualTo(expires);
        }

        @Test
        @DisplayName("no-args constructor creates object with zero/null defaults")
        void noArgsConstructor_createsEmptyObject() {
            QuizSession session = new QuizSession();
            assertThat(session.getId()).isNull();
            assertThat(session.getTitle()).isNull();
            assertThat(session.getShareToken()).isNull();
            assertThat(session.getMcqIds()).isNull();
            assertThat(session.getCreatedBy()).isNull();
            assertThat(session.getCreatedByName()).isNull();
            assertThat(session.getCreatedAt()).isNull();
            assertThat(session.getExpiresAt()).isNull();
        }

        @Test
        @DisplayName("all-args constructor sets every field")
        void allArgsConstructor_setsEveryField() {
            LocalDateTime created = LocalDateTime.of(2024, 6, 15, 9, 30);
            LocalDateTime expires = LocalDateTime.of(2024, 6, 15, 12, 30);

            QuizSession session = new QuizSession(
                    200L, "All-Args Session", "token-allargs",
                    "1,2,3,4,5", 90,
                    "all.args.user", "All Args User",
                    created, expires
            );

            assertThat(session.getId()).isEqualTo(200L);
            assertThat(session.getTitle()).isEqualTo("All-Args Session");
            assertThat(session.getShareToken()).isEqualTo("token-allargs");
            assertThat(session.getMcqIds()).isEqualTo("1,2,3,4,5");
            assertThat(session.getTimeLimitMinutes()).isEqualTo(90);
            assertThat(session.getCreatedBy()).isEqualTo("all.args.user");
            assertThat(session.getCreatedByName()).isEqualTo("All Args User");
            assertThat(session.getCreatedAt()).isEqualTo(created);
            assertThat(session.getExpiresAt()).isEqualTo(expires);
        }

        @Test
        @DisplayName("all setters update their respective fields")
        void setters_updateAllFields() {
            LocalDateTime created = LocalDateTime.of(2024, 7, 1, 8, 0);
            LocalDateTime expires = LocalDateTime.of(2024, 7, 1, 11, 0);

            QuizSession session = new QuizSession();
            session.setId(300L);
            session.setTitle("Setter Session");
            session.setShareToken("setter-token-xyz");
            session.setMcqIds("7,8,9");
            session.setTimeLimitMinutes(20);
            session.setCreatedBy("setter.user");
            session.setCreatedByName("Setter User");
            session.setCreatedAt(created);
            session.setExpiresAt(expires);

            assertThat(session.getId()).isEqualTo(300L);
            assertThat(session.getTitle()).isEqualTo("Setter Session");
            assertThat(session.getShareToken()).isEqualTo("setter-token-xyz");
            assertThat(session.getMcqIds()).isEqualTo("7,8,9");
            assertThat(session.getTimeLimitMinutes()).isEqualTo(20);
            assertThat(session.getCreatedBy()).isEqualTo("setter.user");
            assertThat(session.getCreatedByName()).isEqualTo("Setter User");
            assertThat(session.getCreatedAt()).isEqualTo(created);
            assertThat(session.getExpiresAt()).isEqualTo(expires);
        }

        @Test
        @DisplayName("equals: same instance is equal to itself")
        void equals_sameInstance() {
            QuizSession session = QuizSession.builder()
                    .id(1L).title("T").shareToken("ST").mcqIds("1").createdBy("u").build();
            assertThat(session.equals(session)).isTrue();
        }

        @Test
        @DisplayName("equals(null) returns false")
        void equals_null_returnsFalse() {
            QuizSession session = QuizSession.builder()
                    .id(1L).title("T").shareToken("ST").mcqIds("1").createdBy("u").build();
            assertThat(session.equals(null)).isFalse();
        }

        @Test
        @DisplayName("equals(different type) returns false")
        void equals_differentType_returnsFalse() {
            QuizSession session = QuizSession.builder()
                    .id(1L).title("T").shareToken("ST").mcqIds("1").createdBy("u").build();
            assertThat(session.equals("not a session")).isFalse();
        }

        @Test
        @DisplayName("equals: two sessions with identical fields are equal")
        void equals_twoIdenticalSessions_areEqual() {
            LocalDateTime ts = LocalDateTime.of(2024, 3, 10, 10, 0);
            QuizSession a = QuizSession.builder()
                    .id(5L).title("Same").shareToken("tok5").mcqIds("1,2")
                    .timeLimitMinutes(30).createdBy("user5").createdAt(ts).build();
            QuizSession b = QuizSession.builder()
                    .id(5L).title("Same").shareToken("tok5").mcqIds("1,2")
                    .timeLimitMinutes(30).createdBy("user5").createdAt(ts).build();
            assertThat(a).isEqualTo(b);
            assertThat(a.hashCode()).isEqualTo(b.hashCode());
        }

        @Test
        @DisplayName("equals: different title produces unequal sessions")
        void equals_differentTitle_notEqual() {
            QuizSession a = QuizSession.builder().id(1L).title("Alpha").shareToken("t").mcqIds("1").createdBy("u").build();
            QuizSession b = QuizSession.builder().id(1L).title("Beta").shareToken("t").mcqIds("1").createdBy("u").build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("equals: different shareToken produces unequal sessions")
        void equals_differentShareToken_notEqual() {
            QuizSession a = QuizSession.builder().id(1L).title("T").shareToken("tokenA").mcqIds("1").createdBy("u").build();
            QuizSession b = QuizSession.builder().id(1L).title("T").shareToken("tokenB").mcqIds("1").createdBy("u").build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("equals: different mcqIds produces unequal sessions")
        void equals_differentMcqIds_notEqual() {
            QuizSession a = QuizSession.builder().id(1L).title("T").shareToken("tok").mcqIds("1,2").createdBy("u").build();
            QuizSession b = QuizSession.builder().id(1L).title("T").shareToken("tok").mcqIds("3,4").createdBy("u").build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("equals: different timeLimitMinutes produces unequal sessions")
        void equals_differentTimeLimitMinutes_notEqual() {
            QuizSession a = QuizSession.builder().id(1L).title("T").shareToken("tok").mcqIds("1").createdBy("u").timeLimitMinutes(30).build();
            QuizSession b = QuizSession.builder().id(1L).title("T").shareToken("tok").mcqIds("1").createdBy("u").timeLimitMinutes(60).build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("hashCode is consistent across multiple calls")
        void hashCode_consistent() {
            QuizSession session = QuizSession.builder()
                    .id(99L).title("Consistent").shareToken("tok99").mcqIds("1").createdBy("u").build();
            assertThat(session.hashCode()).isEqualTo(session.hashCode());
        }

        @Test
        @DisplayName("toString does not throw and returns a non-empty string")
        void toString_noThrow() {
            QuizSession session = QuizSession.builder()
                    .id(42L).title("ToString_QS_42").shareToken("tok42").mcqIds("1,2,3")
                    .createdBy("tostring.user").build();
            assertThatCode(session::toString).doesNotThrowAnyException();
            assertThat(session.toString()).isNotNull().isNotEmpty();
        }

        @Test
        @DisplayName("expiresAt can be null (optional field)")
        void expiresAt_canBeNull() {
            QuizSession session = QuizSession.builder()
                    .id(1L).title("No Expiry").shareToken("nexp").mcqIds("1").createdBy("u").build();
            assertThat(session.getExpiresAt()).isNull();
            session.setExpiresAt(null);
            assertThat(session.getExpiresAt()).isNull();
        }

        @Test
        @DisplayName("createdByName can be null (optional field)")
        void createdByName_canBeNull() {
            QuizSession session = QuizSession.builder()
                    .id(2L).title("No Name").shareToken("nname").mcqIds("1").createdBy("u").build();
            assertThat(session.getCreatedByName()).isNull();
        }

        @Test
        @DisplayName("mcqIds supports comma-separated ids as string")
        void mcqIds_commaSeparatedIds() {
            String ids = "101,102,103,104,105";
            QuizSession session = QuizSession.builder()
                    .id(3L).title("Multi MCQ Session").shareToken("multi").mcqIds(ids).createdBy("u").build();
            assertThat(session.getMcqIds()).isEqualTo(ids);
            assertThat(session.getMcqIds().split(",")).hasSize(5);
        }
    }

    // =========================================================================
    // QuizAttempt – additional coverage (beyond EntityGroup5Test)
    // =========================================================================
    @Nested
    @DisplayName("QuizAttempt – additional coverage")
    class QuizAttemptAdditionalTests {

        @Test
        @DisplayName("all-args constructor sets every field")
        void allArgsConstructor_setsEveryField() {
            LocalDateTime submitted = LocalDateTime.of(2024, 8, 20, 14, 30);

            QuizAttempt attempt = new QuizAttempt(
                    500L, 10L, "Full Name Candidate", "full@candidate.com",
                    "{\"1\":\"A\",\"2\":\"B\"}", 7, 10,
                    "{\"Java\":{\"correct\":7,\"total\":10}}",
                    "COMPLETED", 1, "base64screenshot==",
                    450, submitted
            );

            assertThat(attempt.getId()).isEqualTo(500L);
            assertThat(attempt.getSessionId()).isEqualTo(10L);
            assertThat(attempt.getCandidateName()).isEqualTo("Full Name Candidate");
            assertThat(attempt.getCandidateEmail()).isEqualTo("full@candidate.com");
            assertThat(attempt.getAnswers()).contains("\"1\":\"A\"");
            assertThat(attempt.getScore()).isEqualTo(7);
            assertThat(attempt.getTotalQuestions()).isEqualTo(10);
            assertThat(attempt.getTopicBreakdown()).contains("Java");
            assertThat(attempt.getStatus()).isEqualTo("COMPLETED");
            assertThat(attempt.getViolationCount()).isEqualTo(1);
            assertThat(attempt.getViolationScreenshot()).isEqualTo("base64screenshot==");
            assertThat(attempt.getTimeTakenSeconds()).isEqualTo(450);
            assertThat(attempt.getSubmittedAt()).isEqualTo(submitted);
        }

        @Test
        @DisplayName("builder: all optional fields set via builder methods")
        void builder_allFields_viaBuilderMethods() {
            LocalDateTime ts = LocalDateTime.of(2024, 9, 1, 12, 0);
            QuizAttempt attempt = QuizAttempt.builder()
                    .id(600L)
                    .sessionId(20L)
                    .candidateName("Builder Candidate")
                    .candidateEmail("builder@test.com")
                    .answers("{\"5\":\"C\"}")
                    .score(5)
                    .totalQuestions(10)
                    .topicBreakdown("{\"Spring\":{\"correct\":5,\"total\":10}}")
                    .status("TERMINATED")
                    .violationCount(3)
                    .violationScreenshot("screenshotB64")
                    .timeTakenSeconds(300)
                    .submittedAt(ts)
                    .build();

            assertThat(attempt.getId()).isEqualTo(600L);
            assertThat(attempt.getSessionId()).isEqualTo(20L);
            assertThat(attempt.getAnswers()).isEqualTo("{\"5\":\"C\"}");
            assertThat(attempt.getScore()).isEqualTo(5);
            assertThat(attempt.getTotalQuestions()).isEqualTo(10);
            assertThat(attempt.getTopicBreakdown()).contains("Spring");
            assertThat(attempt.getStatus()).isEqualTo("TERMINATED");
            assertThat(attempt.getViolationCount()).isEqualTo(3);
            assertThat(attempt.getViolationScreenshot()).isEqualTo("screenshotB64");
            assertThat(attempt.getTimeTakenSeconds()).isEqualTo(300);
            assertThat(attempt.getSubmittedAt()).isEqualTo(ts);
        }

        @Test
        @DisplayName("topicBreakdown can be set via builder and contains complex JSON")
        void topicBreakdown_complexJson_viaBuilder() {
            String breakdown = "{\"Java Core\":{\"correct\":3,\"total\":5},\"Spring\":{\"correct\":4,\"total\":5}}";
            QuizAttempt attempt = QuizAttempt.builder()
                    .sessionId(1L).candidateName("X").candidateEmail("x@x.com")
                    .topicBreakdown(breakdown).build();
            assertThat(attempt.getTopicBreakdown()).contains("Java Core").contains("Spring");
        }

        @Test
        @DisplayName("violationScreenshot can be set explicitly via builder")
        void violationScreenshot_setViaBuilder() {
            String screenshot = "data:image/png;base64,iVBORw0KGgo=";
            QuizAttempt attempt = QuizAttempt.builder()
                    .sessionId(1L).candidateName("V").candidateEmail("v@v.com")
                    .violationScreenshot(screenshot).build();
            assertThat(attempt.getViolationScreenshot()).isEqualTo(screenshot);
        }

        @Test
        @DisplayName("timeTakenSeconds can be set explicitly via builder")
        void timeTakenSeconds_setViaBuilder() {
            QuizAttempt attempt = QuizAttempt.builder()
                    .sessionId(1L).candidateName("T").candidateEmail("t@t.com")
                    .timeTakenSeconds(1800).build();
            assertThat(attempt.getTimeTakenSeconds()).isEqualTo(1800);
        }

        @Test
        @DisplayName("score and totalQuestions set via builder")
        void scoreAndTotalQuestions_setViaBuilder() {
            QuizAttempt attempt = QuizAttempt.builder()
                    .sessionId(1L).candidateName("S").candidateEmail("s@s.com")
                    .score(8).totalQuestions(10).build();
            assertThat(attempt.getScore()).isEqualTo(8);
            assertThat(attempt.getTotalQuestions()).isEqualTo(10);
        }

        @Test
        @DisplayName("equals: different score produces unequal attempts")
        void equals_differentScore_notEqual() {
            QuizAttempt a = QuizAttempt.builder()
                    .id(1L).sessionId(1L).candidateName("N").candidateEmail("n@n.com").score(5).build();
            QuizAttempt b = QuizAttempt.builder()
                    .id(1L).sessionId(1L).candidateName("N").candidateEmail("n@n.com").score(9).build();
            assertThat(a).isNotEqualTo(b);
        }
    }

    // =========================================================================
    // Notification – additional builder coverage
    // =========================================================================
    @Nested
    @DisplayName("Notification – additional builder coverage")
    class NotificationAdditionalBuilderTests {

        private User buildUser(Long id, String eid) {
            return User.builder()
                    .id(id).enterpriseId(eid).fullName("User " + eid)
                    .email(eid + "@test.com").passwordHash("hash").role(Role.SME)
                    .build();
        }

        @Test
        @DisplayName("builder: all optional fields called at least once")
        void builder_allOptionalFields_setViaBuilder() {
            LocalDateTime ts = LocalDateTime.of(2024, 10, 5, 9, 15);
            User user = buildUser(50L, "NOTIF_B01");

            Notification n = Notification.builder()
                    .id(1000L)
                    .user(user)
                    .message("Your MCQ was approved")
                    .type("MCQ_APPROVED")
                    .mcqId(55L)
                    .actorName("Reviewer One")
                    .actorInitials("RO")
                    .mcqRef("REF-055")
                    .read(true)
                    .createdAt(ts)
                    .build();

            assertThat(n.getId()).isEqualTo(1000L);
            assertThat(n.getUser()).isSameAs(user);
            assertThat(n.getMessage()).isEqualTo("Your MCQ was approved");
            assertThat(n.getType()).isEqualTo("MCQ_APPROVED");
            assertThat(n.getMcqId()).isEqualTo(55L);
            assertThat(n.getActorName()).isEqualTo("Reviewer One");
            assertThat(n.getActorInitials()).isEqualTo("RO");
            assertThat(n.getMcqRef()).isEqualTo("REF-055");
            assertThat(n.isRead()).isTrue();
            assertThat(n.getCreatedAt()).isEqualTo(ts);
        }

        @Test
        @DisplayName("@Builder.Default: read defaults to false when not set via builder")
        void builder_readDefault_isFalse() {
            User user = buildUser(51L, "NOTIF_B02");
            Notification n = Notification.builder()
                    .id(1001L).user(user).message("M").type("T").build();
            assertThat(n.isRead()).isFalse();
        }

        @Test
        @DisplayName("builder: mcqId null when not set")
        void builder_mcqId_nullWhenNotSet() {
            User user = buildUser(52L, "NOTIF_B03");
            Notification n = Notification.builder()
                    .user(user).message("M").type("T").build();
            assertThat(n.getMcqId()).isNull();
        }

        @Test
        @DisplayName("builder: actorName and actorInitials null when not set")
        void builder_actorFields_nullWhenNotSet() {
            User user = buildUser(53L, "NOTIF_B04");
            Notification n = Notification.builder()
                    .user(user).message("M").type("T").build();
            assertThat(n.getActorName()).isNull();
            assertThat(n.getActorInitials()).isNull();
        }

        @Test
        @DisplayName("builder: mcqRef null when not set")
        void builder_mcqRef_nullWhenNotSet() {
            User user = buildUser(54L, "NOTIF_B05");
            Notification n = Notification.builder()
                    .user(user).message("M").type("T").build();
            assertThat(n.getMcqRef()).isNull();
        }

        @Test
        @DisplayName("builder: createdAt can be set explicitly")
        void builder_createdAt_setExplicitly() {
            LocalDateTime ts = LocalDateTime.of(2025, 1, 1, 0, 0);
            User user = buildUser(55L, "NOTIF_B06");
            Notification n = Notification.builder()
                    .user(user).message("M").type("T")
                    .createdAt(ts)
                    .build();
            assertThat(n.getCreatedAt()).isEqualTo(ts);
        }

        @Test
        @DisplayName("hashCode: equal notifications have same hashCode")
        void hashCode_equalNotifications_sameHashCode() {
            User user = buildUser(56L, "NOTIF_B07");
            Notification a = Notification.builder().id(7L).user(user).message("MSG").type("T").build();
            Notification b = Notification.builder().id(7L).user(user).message("MSG").type("T").build();
            assertThat(a.hashCode()).isEqualTo(b.hashCode());
        }
    }

    // =========================================================================
    // InboxMessage – additional builder coverage
    // =========================================================================
    @Nested
    @DisplayName("InboxMessage – additional builder coverage")
    class InboxMessageAdditionalBuilderTests {

        private User buildUser(Long id, String eid) {
            return User.builder()
                    .id(id).enterpriseId(eid).fullName("User " + eid)
                    .email(eid + "@test.com").passwordHash("hash").role(Role.ADMIN)
                    .build();
        }

        @Test
        @DisplayName("builder: all fields including sender, messageType, mcqId, sentAt")
        void builder_allFields_withSender() {
            LocalDateTime ts = LocalDateTime.of(2024, 11, 10, 16, 0);
            User sender    = buildUser(60L, "IM_B_SND01");
            User recipient = buildUser(61L, "IM_B_RCV01");

            InboxMessage msg = InboxMessage.builder()
                    .id(2000L)
                    .sender(sender)
                    .recipient(recipient)
                    .subject("Builder Full Subject")
                    .body("Builder full body text")
                    .read(true)
                    .starred(true)
                    .messageType("SYSTEM")
                    .mcqId(200L)
                    .sentAt(ts)
                    .build();

            assertThat(msg.getId()).isEqualTo(2000L);
            assertThat(msg.getSender()).isSameAs(sender);
            assertThat(msg.getRecipient()).isSameAs(recipient);
            assertThat(msg.getSubject()).isEqualTo("Builder Full Subject");
            assertThat(msg.getBody()).isEqualTo("Builder full body text");
            assertThat(msg.isRead()).isTrue();
            assertThat(msg.isStarred()).isTrue();
            assertThat(msg.getMessageType()).isEqualTo("SYSTEM");
            assertThat(msg.getMcqId()).isEqualTo(200L);
            assertThat(msg.getSentAt()).isEqualTo(ts);
        }

        @Test
        @DisplayName("builder: null sender is permitted (system-generated message)")
        void builder_nullSender_isAllowed() {
            User recipient = buildUser(62L, "IM_B_RCV02");
            InboxMessage msg = InboxMessage.builder()
                    .recipient(recipient)
                    .subject("System Message")
                    .body("Automated notification")
                    .messageType("SYSTEM")
                    .build();
            assertThat(msg.getSender()).isNull();
            assertThat(msg.getMessageType()).isEqualTo("SYSTEM");
        }

        @Test
        @DisplayName("builder: mcqId set via builder method")
        void builder_mcqId_setViaBuilder() {
            User recipient = buildUser(63L, "IM_B_RCV03");
            InboxMessage msg = InboxMessage.builder()
                    .recipient(recipient).subject("MCQ Reference").body("Body")
                    .mcqId(999L).build();
            assertThat(msg.getMcqId()).isEqualTo(999L);
        }

        @Test
        @DisplayName("builder: sentAt set via builder method")
        void builder_sentAt_setViaBuilder() {
            LocalDateTime ts = LocalDateTime.of(2024, 12, 25, 8, 0);
            User recipient = buildUser(64L, "IM_B_RCV04");
            InboxMessage msg = InboxMessage.builder()
                    .recipient(recipient).subject("Holiday Message").body("Merry Christmas")
                    .sentAt(ts).build();
            assertThat(msg.getSentAt()).isEqualTo(ts);
        }

        @Test
        @DisplayName("equals: different body produces unequal messages")
        void equals_differentBody_notEqual() {
            User r = buildUser(65L, "IM_B_EQ01");
            InboxMessage a = InboxMessage.builder().id(1L).recipient(r).subject("S").body("Body A").build();
            InboxMessage b = InboxMessage.builder().id(1L).recipient(r).subject("S").body("Body B").build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("equals: different messageType produces unequal messages")
        void equals_differentMessageType_notEqual() {
            User r = buildUser(66L, "IM_B_EQ02");
            InboxMessage a = InboxMessage.builder().id(1L).recipient(r).subject("S").body("B").messageType("USER").build();
            InboxMessage b = InboxMessage.builder().id(1L).recipient(r).subject("S").body("B").messageType("SYSTEM").build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("hashCode: consistent across multiple calls")
        void hashCode_consistentAcrossCalls() {
            User r = buildUser(67L, "IM_B_HC01");
            InboxMessage msg = InboxMessage.builder()
                    .id(11L).recipient(r).subject("Sub").body("Body").build();
            assertThat(msg.hashCode()).isEqualTo(msg.hashCode());
        }

        @Test
        @DisplayName("mcqId is null when not set via builder")
        void builder_mcqId_nullWhenNotSet() {
            User r = buildUser(68L, "IM_B_RCV05");
            InboxMessage msg = InboxMessage.builder()
                    .recipient(r).subject("No MCQ").body("Body").build();
            assertThat(msg.getMcqId()).isNull();
        }
    }
}
