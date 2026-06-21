package com.valkey.quizhub.entity;

import com.valkey.quizhub.enums.Role;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * Targeted coverage tests for ChatMessage, Notification, QuizAttempt, and InboxMessage.
 * Exercises allArgsConstructors, @Builder.Default fields, canEqual, and equals edge-cases.
 * No Spring context required.
 */
@DisplayName("EntityGroup9 – ChatMessage, Notification, QuizAttempt, InboxMessage deep coverage")
class EntityGroup9Test {

    // =========================================================================
    // ChatMessage
    // =========================================================================

    @Nested
    @DisplayName("ChatMessage – allArgsConstructor, @Builder.Default, canEqual")
    class ChatMessageTests {

        @Test
        @DisplayName("allArgsConstructor: all 14 fields set correctly")
        void allArgsConstructor_setsAllFields() {
            LocalDateTime now = LocalDateTime.of(2025, 4, 1, 10, 0);
            LocalDateTime editedAt = now.plusMinutes(5);

            ChatMessage msg = new ChatMessage(
                    1L,
                    "sender.eid",
                    "Sender Full Name",
                    "ADMIN",
                    "Hello world content",
                    "BOT",
                    now,
                    42L,
                    "Reply content text",
                    "Original Sender",
                    "{\"👍\":[\"alice\"]}",
                    true,
                    false,
                    editedAt
            );

            assertThat(msg.getId()).isEqualTo(1L);
            assertThat(msg.getSenderEnterpriseId()).isEqualTo("sender.eid");
            assertThat(msg.getSenderName()).isEqualTo("Sender Full Name");
            assertThat(msg.getSenderRole()).isEqualTo("ADMIN");
            assertThat(msg.getContent()).isEqualTo("Hello world content");
            assertThat(msg.getMsgType()).isEqualTo("BOT");
            assertThat(msg.getCreatedAt()).isEqualTo(now);
            assertThat(msg.getReplyToId()).isEqualTo(42L);
            assertThat(msg.getReplyToContent()).isEqualTo("Reply content text");
            assertThat(msg.getReplyToSender()).isEqualTo("Original Sender");
            assertThat(msg.getReactions()).isEqualTo("{\"👍\":[\"alice\"]}");
            assertThat(msg.getPinned()).isTrue();
            assertThat(msg.getDeleted()).isFalse();
            assertThat(msg.getEditedAt()).isEqualTo(editedAt);
        }

        @Test
        @DisplayName("builder @Builder.Default: msgType defaults to USER")
        void builder_defaultMsgType_isUser() {
            ChatMessage msg = ChatMessage.builder()
                    .senderEnterpriseId("eid1")
                    .content("A message")
                    .build();
            assertThat(msg.getMsgType()).isEqualTo("USER");
        }

        @Test
        @DisplayName("builder @Builder.Default: reactions defaults to empty JSON object")
        void builder_defaultReactions_isEmptyJson() {
            ChatMessage msg = ChatMessage.builder()
                    .senderEnterpriseId("eid2")
                    .content("Another message")
                    .build();
            assertThat(msg.getReactions()).isEqualTo("{}");
        }

        @Test
        @DisplayName("builder @Builder.Default: pinned defaults to false")
        void builder_defaultPinned_isFalse() {
            ChatMessage msg = ChatMessage.builder()
                    .senderEnterpriseId("eid3")
                    .content("Pinned test")
                    .build();
            assertThat(msg.getPinned()).isFalse();
        }

        @Test
        @DisplayName("builder @Builder.Default: deleted defaults to false")
        void builder_defaultDeleted_isFalse() {
            ChatMessage msg = ChatMessage.builder()
                    .senderEnterpriseId("eid4")
                    .content("Deleted test")
                    .build();
            assertThat(msg.getDeleted()).isFalse();
        }

        @Test
        @DisplayName("builder: explicit override of all @Builder.Default fields")
        void builder_overrideAllDefaults() {
            ChatMessage msg = ChatMessage.builder()
                    .senderEnterpriseId("eid5")
                    .content("Override test")
                    .msgType("BOT")
                    .reactions("{\"❤️\":[\"bob\"]}")
                    .pinned(true)
                    .deleted(true)
                    .build();
            assertThat(msg.getMsgType()).isEqualTo("BOT");
            assertThat(msg.getReactions()).isEqualTo("{\"❤️\":[\"bob\"]}");
            assertThat(msg.getPinned()).isTrue();
            assertThat(msg.getDeleted()).isTrue();
        }

        @Test
        @DisplayName("no-args + setters: reply threading fields round-trip")
        void noArgs_setters_replyFields() {
            ChatMessage msg = new ChatMessage();
            msg.setReplyToId(100L);
            msg.setReplyToContent("Original message text");
            msg.setReplyToSender("Alice");
            msg.setEditedAt(LocalDateTime.of(2025, 5, 1, 9, 0));

            assertThat(msg.getReplyToId()).isEqualTo(100L);
            assertThat(msg.getReplyToContent()).isEqualTo("Original message text");
            assertThat(msg.getReplyToSender()).isEqualTo("Alice");
            assertThat(msg.getEditedAt()).isNotNull();
        }

        @Test
        @DisplayName("equals(null) returns false")
        void equals_null_returnsFalse() {
            ChatMessage msg = ChatMessage.builder().senderEnterpriseId("e").content("c").build();
            assertThat(msg.equals(null)).isFalse();
        }

        @Test
        @DisplayName("equals(different type) returns false")
        void equals_differentType_returnsFalse() {
            ChatMessage msg = ChatMessage.builder().senderEnterpriseId("e").content("c").build();
            assertThat(msg.equals("string")).isFalse();
        }

        @Test
        @DisplayName("equals(same instance) returns true")
        void equals_sameInstance_returnsTrue() {
            ChatMessage msg = ChatMessage.builder().id(1L).senderEnterpriseId("e").content("c").build();
            assertThat(msg.equals(msg)).isTrue();
        }

        @Test
        @DisplayName("canEqual: same type returns true")
        void canEqual_sameType_returnsTrue() {
            ChatMessage a = ChatMessage.builder().id(1L).senderEnterpriseId("a").content("x").build();
            ChatMessage b = ChatMessage.builder().id(2L).senderEnterpriseId("b").content("y").build();
            assertThat(a.canEqual(b)).isTrue();
        }

        @Test
        @DisplayName("canEqual: null returns false")
        void canEqual_null_returnsFalse() {
            ChatMessage msg = ChatMessage.builder().senderEnterpriseId("e").content("c").build();
            assertThat(msg.canEqual(null)).isFalse();
        }

        @Test
        @DisplayName("toString: does not throw")
        void toString_doesNotThrow() {
            ChatMessage msg = ChatMessage.builder()
                    .id(5L).senderEnterpriseId("unique_eg9_sender")
                    .content("content_eg9").msgType("USER").build();
            assertThatCode(msg::toString).doesNotThrowAnyException();
            assertThat(msg.toString()).contains("unique_eg9_sender");
        }
    }

    // =========================================================================
    // Notification
    // =========================================================================

    @Nested
    @DisplayName("Notification – allArgsConstructor, @Builder.Default, canEqual")
    class NotificationTests {

        private User buildUser(Long id, String eid) {
            return User.builder()
                    .id(id).enterpriseId(eid).fullName("User " + eid)
                    .email(eid + "@eg9.com").passwordHash("hash").role(Role.SME).build();
        }

        @Test
        @DisplayName("allArgsConstructor: all fields set correctly")
        void allArgsConstructor_setsAllFields() {
            User user = buildUser(1L, "N_EG9_01");
            LocalDateTime ts = LocalDateTime.of(2025, 5, 10, 8, 0);

            Notification notif = new Notification(
                    10L,
                    user,
                    "Your MCQ was approved",
                    "MCQ_APPROVED",
                    55L,
                    "Admin User",
                    "AU",
                    "MCQ-55",
                    true,
                    ts
            );

            assertThat(notif.getId()).isEqualTo(10L);
            assertThat(notif.getUser()).isSameAs(user);
            assertThat(notif.getMessage()).isEqualTo("Your MCQ was approved");
            assertThat(notif.getType()).isEqualTo("MCQ_APPROVED");
            assertThat(notif.getMcqId()).isEqualTo(55L);
            assertThat(notif.getActorName()).isEqualTo("Admin User");
            assertThat(notif.getActorInitials()).isEqualTo("AU");
            assertThat(notif.getMcqRef()).isEqualTo("MCQ-55");
            assertThat(notif.isRead()).isTrue();
            assertThat(notif.getCreatedAt()).isEqualTo(ts);
        }

        @Test
        @DisplayName("builder @Builder.Default: read defaults to false")
        void builder_defaultRead_isFalse() {
            Notification notif = Notification.builder()
                    .message("New notification")
                    .type("SYSTEM")
                    .build();
            assertThat(notif.isRead()).isFalse();
        }

        @Test
        @DisplayName("builder: explicit read=true overrides default")
        void builder_explicitRead_true() {
            Notification notif = Notification.builder()
                    .message("Read notification")
                    .type("SYSTEM")
                    .read(true)
                    .build();
            assertThat(notif.isRead()).isTrue();
        }

        @Test
        @DisplayName("no-args + setters: all fields round-trip")
        void noArgs_setters_roundTrip() {
            User user = buildUser(2L, "N_EG9_02");
            Notification notif = new Notification();
            notif.setId(20L);
            notif.setUser(user);
            notif.setMessage("MCQ rejected");
            notif.setType("MCQ_REJECTED");
            notif.setMcqId(77L);
            notif.setActorName("Reviewer");
            notif.setActorInitials("RV");
            notif.setMcqRef("MCQ-77");
            notif.setRead(true);

            assertThat(notif.getId()).isEqualTo(20L);
            assertThat(notif.getUser()).isSameAs(user);
            assertThat(notif.getMessage()).isEqualTo("MCQ rejected");
            assertThat(notif.getType()).isEqualTo("MCQ_REJECTED");
            assertThat(notif.getMcqId()).isEqualTo(77L);
            assertThat(notif.getActorName()).isEqualTo("Reviewer");
            assertThat(notif.getActorInitials()).isEqualTo("RV");
            assertThat(notif.getMcqRef()).isEqualTo("MCQ-77");
            assertThat(notif.isRead()).isTrue();
        }

        @Test
        @DisplayName("equals(null) returns false")
        void equals_null_returnsFalse() {
            Notification n = Notification.builder().message("m").type("t").build();
            assertThat(n.equals(null)).isFalse();
        }

        @Test
        @DisplayName("equals(different type) returns false")
        void equals_differentType_returnsFalse() {
            Notification n = Notification.builder().message("m").type("t").build();
            assertThat(n.equals("not a notif")).isFalse();
        }

        @Test
        @DisplayName("canEqual: same type returns true")
        void canEqual_sameType_returnsTrue() {
            Notification a = Notification.builder().id(1L).message("a").type("ta").build();
            Notification b = Notification.builder().id(2L).message("b").type("tb").build();
            assertThat(a.canEqual(b)).isTrue();
        }

        @Test
        @DisplayName("canEqual: null returns false")
        void canEqual_null_returnsFalse() {
            Notification n = Notification.builder().message("m").type("t").build();
            assertThat(n.canEqual(null)).isFalse();
        }

        @Test
        @DisplayName("equals: different read value produces unequal instances")
        void equals_differentRead_notEqual() {
            Notification a = Notification.builder().id(1L).message("m").type("t").read(false).build();
            Notification b = Notification.builder().id(1L).message("m").type("t").read(true).build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("hashCode: consistent across calls")
        void hashCode_consistent() {
            Notification n = Notification.builder().id(3L).message("hash").type("H").build();
            assertThat(n.hashCode()).isEqualTo(n.hashCode());
        }
    }

    // =========================================================================
    // QuizAttempt
    // =========================================================================

    @Nested
    @DisplayName("QuizAttempt – allArgsConstructor, @Builder.Default, canEqual")
    class QuizAttemptTests {

        @Test
        @DisplayName("allArgsConstructor: all fields set correctly")
        void allArgsConstructor_setsAllFields() {
            LocalDateTime submittedAt = LocalDateTime.of(2025, 6, 1, 14, 0);

            QuizAttempt attempt = new QuizAttempt(
                    1L,
                    10L,
                    "Candidate Name",
                    "candidate@eg9.com",
                    "{\"1\":\"A\"}",
                    8,
                    10,
                    "{\"Java\":{\"correct\":8,\"total\":10}}",
                    "COMPLETED",
                    0,
                    null,
                    120,
                    submittedAt
            );

            assertThat(attempt.getId()).isEqualTo(1L);
            assertThat(attempt.getSessionId()).isEqualTo(10L);
            assertThat(attempt.getCandidateName()).isEqualTo("Candidate Name");
            assertThat(attempt.getCandidateEmail()).isEqualTo("candidate@eg9.com");
            assertThat(attempt.getAnswers()).isEqualTo("{\"1\":\"A\"}");
            assertThat(attempt.getScore()).isEqualTo(8);
            assertThat(attempt.getTotalQuestions()).isEqualTo(10);
            assertThat(attempt.getTopicBreakdown()).contains("Java");
            assertThat(attempt.getStatus()).isEqualTo("COMPLETED");
            assertThat(attempt.getViolationCount()).isEqualTo(0);
            assertThat(attempt.getViolationScreenshot()).isNull();
            assertThat(attempt.getTimeTakenSeconds()).isEqualTo(120);
            assertThat(attempt.getSubmittedAt()).isEqualTo(submittedAt);
        }

        @Test
        @DisplayName("allArgsConstructor: TERMINATED status and screenshot set")
        void allArgsConstructor_terminatedStatus_screenshotSet() {
            QuizAttempt attempt = new QuizAttempt(
                    2L, 20L, "Terminated User", "term@eg9.com",
                    "{}", 3, 10, "{}", "TERMINATED", 3,
                    "data:image/png;base64,abc", 45, LocalDateTime.now()
            );

            assertThat(attempt.getStatus()).isEqualTo("TERMINATED");
            assertThat(attempt.getViolationCount()).isEqualTo(3);
            assertThat(attempt.getViolationScreenshot()).startsWith("data:image");
        }

        @Test
        @DisplayName("builder @Builder.Default: status defaults to COMPLETED")
        void builder_defaultStatus_isCompleted() {
            QuizAttempt attempt = QuizAttempt.builder()
                    .sessionId(1L)
                    .candidateName("Test")
                    .candidateEmail("test@eg9.com")
                    .build();
            assertThat(attempt.getStatus()).isEqualTo("COMPLETED");
        }

        @Test
        @DisplayName("builder @Builder.Default: violationCount defaults to 0")
        void builder_defaultViolationCount_isZero() {
            QuizAttempt attempt = QuizAttempt.builder()
                    .sessionId(1L)
                    .candidateName("Test2")
                    .candidateEmail("test2@eg9.com")
                    .build();
            assertThat(attempt.getViolationCount()).isEqualTo(0);
        }

        @Test
        @DisplayName("no-args + setters: all fields round-trip")
        void noArgs_setters_roundTrip() {
            QuizAttempt attempt = new QuizAttempt();
            attempt.setId(5L);
            attempt.setSessionId(50L);
            attempt.setCandidateName("Round Trip");
            attempt.setCandidateEmail("rt@eg9.com");
            attempt.setAnswers("{\"2\":\"B\"}");
            attempt.setScore(7);
            attempt.setTotalQuestions(10);
            attempt.setTopicBreakdown("{\"Spring\":{\"correct\":7,\"total\":10}}");
            attempt.setStatus("COMPLETED");
            attempt.setViolationCount(1);
            attempt.setViolationScreenshot("screenshot_data");
            attempt.setTimeTakenSeconds(90);

            assertThat(attempt.getId()).isEqualTo(5L);
            assertThat(attempt.getSessionId()).isEqualTo(50L);
            assertThat(attempt.getCandidateName()).isEqualTo("Round Trip");
            assertThat(attempt.getCandidateEmail()).isEqualTo("rt@eg9.com");
            assertThat(attempt.getScore()).isEqualTo(7);
            assertThat(attempt.getStatus()).isEqualTo("COMPLETED");
            assertThat(attempt.getViolationCount()).isEqualTo(1);
            assertThat(attempt.getViolationScreenshot()).isEqualTo("screenshot_data");
            assertThat(attempt.getTimeTakenSeconds()).isEqualTo(90);
        }

        @Test
        @DisplayName("equals(null) returns false")
        void equals_null_returnsFalse() {
            QuizAttempt a = QuizAttempt.builder().sessionId(1L).candidateName("N").candidateEmail("e@eg9.com").build();
            assertThat(a.equals(null)).isFalse();
        }

        @Test
        @DisplayName("equals(different type) returns false")
        void equals_differentType_returnsFalse() {
            QuizAttempt a = QuizAttempt.builder().sessionId(1L).candidateName("N").candidateEmail("e@eg9.com").build();
            assertThat(a.equals("str")).isFalse();
        }

        @Test
        @DisplayName("canEqual: same type returns true")
        void canEqual_sameType_returnsTrue() {
            QuizAttempt a = QuizAttempt.builder().id(1L).sessionId(1L).candidateName("A").candidateEmail("a@eg9.com").build();
            QuizAttempt b = QuizAttempt.builder().id(2L).sessionId(2L).candidateName("B").candidateEmail("b@eg9.com").build();
            assertThat(a.canEqual(b)).isTrue();
        }

        @Test
        @DisplayName("canEqual: null returns false")
        void canEqual_null_returnsFalse() {
            QuizAttempt a = QuizAttempt.builder().sessionId(1L).candidateName("A").candidateEmail("a@eg9.com").build();
            assertThat(a.canEqual(null)).isFalse();
        }
    }

    // =========================================================================
    // InboxMessage
    // =========================================================================

    @Nested
    @DisplayName("InboxMessage – allArgsConstructor, canEqual, setters")
    class InboxMessageTests {

        private User buildUser(Long id, String eid) {
            return User.builder()
                    .id(id).enterpriseId(eid).fullName("User " + eid)
                    .email(eid + "@eg9.com").passwordHash("hash").role(Role.SME).build();
        }

        @Test
        @DisplayName("allArgsConstructor: all fields set correctly")
        void allArgsConstructor_setsAllFields() {
            User sender    = buildUser(1L, "IM_SND");
            User recipient = buildUser(2L, "IM_RCP");
            LocalDateTime sentAt = LocalDateTime.of(2025, 7, 1, 10, 0);

            InboxMessage msg = new InboxMessage(
                    1L, sender, recipient,
                    "MCQ Approved", "Your MCQ has been approved",
                    true, false, "USER", 99L, sentAt
            );

            assertThat(msg.getId()).isEqualTo(1L);
            assertThat(msg.getSender()).isSameAs(sender);
            assertThat(msg.getRecipient()).isSameAs(recipient);
            assertThat(msg.getSubject()).isEqualTo("MCQ Approved");
            assertThat(msg.getBody()).isEqualTo("Your MCQ has been approved");
            assertThat(msg.isRead()).isTrue();
            assertThat(msg.isStarred()).isFalse();
            assertThat(msg.getMessageType()).isEqualTo("USER");
            assertThat(msg.getMcqId()).isEqualTo(99L);
            assertThat(msg.getSentAt()).isEqualTo(sentAt);
        }

        @Test
        @DisplayName("allArgsConstructor: system message with null sender")
        void allArgsConstructor_systemMessage_nullSender() {
            User recipient = buildUser(3L, "IM_RCP2");
            InboxMessage msg = new InboxMessage(
                    2L, null, recipient,
                    "System Notification", "Action required",
                    false, true, "SYSTEM", null, LocalDateTime.now()
            );

            assertThat(msg.getSender()).isNull();
            assertThat(msg.getMessageType()).isEqualTo("SYSTEM");
            assertThat(msg.isStarred()).isTrue();
            assertThat(msg.getMcqId()).isNull();
        }

        @Test
        @DisplayName("no-args + setters: all fields round-trip")
        void noArgs_setters_roundTrip() {
            User sender    = buildUser(4L, "IM_S4");
            User recipient = buildUser(5L, "IM_R5");
            InboxMessage msg = new InboxMessage();
            msg.setId(10L);
            msg.setSender(sender);
            msg.setRecipient(recipient);
            msg.setSubject("Round Trip Subject");
            msg.setBody("Round trip body");
            msg.setRead(true);
            msg.setStarred(false);
            msg.setMessageType("USER");
            msg.setMcqId(42L);

            assertThat(msg.getId()).isEqualTo(10L);
            assertThat(msg.getSender()).isSameAs(sender);
            assertThat(msg.getRecipient()).isSameAs(recipient);
            assertThat(msg.getSubject()).isEqualTo("Round Trip Subject");
            assertThat(msg.getBody()).isEqualTo("Round trip body");
            assertThat(msg.isRead()).isTrue();
            assertThat(msg.isStarred()).isFalse();
            assertThat(msg.getMessageType()).isEqualTo("USER");
            assertThat(msg.getMcqId()).isEqualTo(42L);
        }

        @Test
        @DisplayName("equals(null) returns false")
        void equals_null_returnsFalse() {
            InboxMessage msg = InboxMessage.builder()
                    .subject("s").body("b").messageType("USER").build();
            assertThat(msg.equals(null)).isFalse();
        }

        @Test
        @DisplayName("equals(different type) returns false")
        void equals_differentType_returnsFalse() {
            InboxMessage msg = InboxMessage.builder()
                    .subject("s").body("b").messageType("USER").build();
            assertThat(msg.equals(42L)).isFalse();
        }

        @Test
        @DisplayName("equals(same instance) returns true")
        void equals_sameInstance_returnsTrue() {
            InboxMessage msg = InboxMessage.builder()
                    .id(1L).subject("s").body("b").messageType("USER").build();
            assertThat(msg.equals(msg)).isTrue();
        }

        @Test
        @DisplayName("canEqual: same type returns true")
        void canEqual_sameType_returnsTrue() {
            InboxMessage a = InboxMessage.builder().id(1L).subject("a").body("ba").messageType("USER").build();
            InboxMessage b = InboxMessage.builder().id(2L).subject("b").body("bb").messageType("SYSTEM").build();
            assertThat(a.canEqual(b)).isTrue();
        }

        @Test
        @DisplayName("canEqual: null returns false")
        void canEqual_null_returnsFalse() {
            InboxMessage msg = InboxMessage.builder().subject("s").body("b").messageType("USER").build();
            assertThat(msg.canEqual(null)).isFalse();
        }

        @Test
        @DisplayName("toString: does not throw")
        void toString_doesNotThrow() {
            InboxMessage msg = InboxMessage.builder()
                    .id(99L).subject("unique_eg9_inbox_subject").body("body_eg9")
                    .messageType("USER").build();
            assertThatCode(msg::toString).doesNotThrowAnyException();
            assertThat(msg.toString()).contains("unique_eg9_inbox_subject");
        }
    }
}
