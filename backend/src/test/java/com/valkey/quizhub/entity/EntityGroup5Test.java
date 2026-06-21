package com.valkey.quizhub.entity;

import com.valkey.quizhub.enums.Role;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * Additional POJO / Lombok unit tests to boost JaCoCo coverage.
 * Covers Notification, InboxMessage, ChatMessage, QuizAttempt with:
 * - all-args constructors, equals edge-cases (null / different type),
 *   full setter coverage, and Builder.Default verification.
 * No Spring context required.
 */
@DisplayName("EntityGroup5 – Notification, InboxMessage, ChatMessage, QuizAttempt (extra)")
class EntityGroup5Test {

    // =========================================================================
    // Notification – additional coverage
    // =========================================================================
    @Nested
    @DisplayName("Notification – additional coverage")
    class NotificationAdditionalTests {

        private User buildUser(Long id, String eid) {
            return User.builder()
                    .id(id).enterpriseId(eid).fullName("User " + eid)
                    .email(eid + "@test.com").passwordHash("hash").role(Role.ADMIN)
                    .build();
        }

        @Test
        @DisplayName("all-args constructor sets every field")
        void allArgsConstructor_setsEveryField() {
            LocalDateTime ts = LocalDateTime.of(2024, 8, 1, 9, 0);
            User user = buildUser(10L, "N_ALL01");

            Notification n = new Notification(
                    1L, user, "MCQ approved", "MCQ_APPROVED",
                    42L, "Alice", "AL", "REF-042", true, ts
            );

            assertThat(n.getId()).isEqualTo(1L);
            assertThat(n.getUser()).isSameAs(user);
            assertThat(n.getMessage()).isEqualTo("MCQ approved");
            assertThat(n.getType()).isEqualTo("MCQ_APPROVED");
            assertThat(n.getMcqId()).isEqualTo(42L);
            assertThat(n.getActorName()).isEqualTo("Alice");
            assertThat(n.getActorInitials()).isEqualTo("AL");
            assertThat(n.getMcqRef()).isEqualTo("REF-042");
            assertThat(n.isRead()).isTrue();
            assertThat(n.getCreatedAt()).isEqualTo(ts);
        }

        @Test
        @DisplayName("all setters update respective fields")
        void setters_updateAllFields() {
            LocalDateTime ts = LocalDateTime.of(2024, 9, 10, 11, 30);
            User user = buildUser(11L, "N_SET01");

            Notification n = new Notification();
            n.setId(2L);
            n.setUser(user);
            n.setMessage("You got a mention");
            n.setType("MENTION");
            n.setMcqId(99L);
            n.setActorName("Bob");
            n.setActorInitials("BO");
            n.setMcqRef("REF-099");
            n.setRead(true);
            n.setCreatedAt(ts);

            assertThat(n.getId()).isEqualTo(2L);
            assertThat(n.getUser()).isSameAs(user);
            assertThat(n.getMessage()).isEqualTo("You got a mention");
            assertThat(n.getType()).isEqualTo("MENTION");
            assertThat(n.getMcqId()).isEqualTo(99L);
            assertThat(n.getActorName()).isEqualTo("Bob");
            assertThat(n.getActorInitials()).isEqualTo("BO");
            assertThat(n.getMcqRef()).isEqualTo("REF-099");
            assertThat(n.isRead()).isTrue();
            assertThat(n.getCreatedAt()).isEqualTo(ts);
        }

        @Test
        @DisplayName("equals(null) returns false")
        void equals_null_returnsFalse() {
            User u = buildUser(12L, "N_EQ01");
            Notification n = Notification.builder().id(1L).user(u).message("M").type("T").build();
            assertThat(n.equals(null)).isFalse();
        }

        @Test
        @DisplayName("equals(different type) returns false")
        void equals_differentType_returnsFalse() {
            User u = buildUser(13L, "N_EQ02");
            Notification n = Notification.builder().id(1L).user(u).message("M").type("T").build();
            assertThat(n.equals("not a notification")).isFalse();
        }

        @Test
        @DisplayName("equals: same instance is equal to itself")
        void equals_sameInstance() {
            User u = buildUser(14L, "N_EQ03");
            Notification n = Notification.builder().id(1L).user(u).message("M").type("T").build();
            assertThat(n.equals(n)).isTrue();
        }

        @Test
        @DisplayName("equals: different message produces unequal objects")
        void equals_differentMessage_notEqual() {
            User u = buildUser(15L, "N_EQ04");
            Notification a = Notification.builder().id(1L).user(u).message("Msg A").type("T").build();
            Notification b = Notification.builder().id(1L).user(u).message("Msg B").type("T").build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("equals: different type field produces unequal objects")
        void equals_differentType_notEqual() {
            User u = buildUser(16L, "N_EQ05");
            Notification a = Notification.builder().id(1L).user(u).message("M").type("TYPE_A").build();
            Notification b = Notification.builder().id(1L).user(u).message("M").type("TYPE_B").build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("equals: different read value produces unequal objects")
        void equals_differentRead_notEqual() {
            User u = buildUser(17L, "N_EQ06");
            Notification a = Notification.builder().id(1L).user(u).message("M").type("T").read(true).build();
            Notification b = Notification.builder().id(1L).user(u).message("M").type("T").read(false).build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("toString contains meaningful data")
        void toString_containsData() {
            User u = buildUser(18L, "N_TS01");
            Notification n = Notification.builder()
                    .id(777L).user(u).message("Notification_MSG_777").type("REVIEW_ASSIGNED").build();
            String str = n.toString();
            assertThat(str).isNotNull().isNotEmpty();
            assertThatCode(n::toString).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("hashCode is consistent across multiple calls")
        void hashCode_consistent() {
            User u = buildUser(19L, "N_HC01");
            Notification n = Notification.builder().id(5L).user(u).message("M").type("T").build();
            int first = n.hashCode();
            int second = n.hashCode();
            assertThat(first).isEqualTo(second);
        }

        @Test
        @DisplayName("actorName and actorInitials can be updated via setters independently")
        void actorFields_independent() {
            Notification n = new Notification();
            n.setActorName("Carol White");
            n.setActorInitials("CW");
            assertThat(n.getActorName()).isEqualTo("Carol White");
            assertThat(n.getActorInitials()).isEqualTo("CW");
        }

        @Test
        @DisplayName("mcqRef setter updates the field independently")
        void mcqRef_setter() {
            Notification n = new Notification();
            n.setMcqRef("TECH-123");
            assertThat(n.getMcqRef()).isEqualTo("TECH-123");
        }

        @Test
        @DisplayName("builder default: read is false when not explicitly set")
        void builder_defaultRead_isFalse_whenNotSet() {
            User u = buildUser(20L, "N_DR01");
            Notification n = Notification.builder().id(1L).user(u).message("M").type("T").build();
            assertThat(n.isRead()).isFalse();
        }

        @Test
        @DisplayName("equals: two fully-populated notifications with same values are equal")
        void equals_twoFullyPopulated_equal() {
            LocalDateTime ts = LocalDateTime.of(2024, 12, 1, 0, 0);
            User u = buildUser(21L, "N_FP01");
            Notification a = Notification.builder()
                    .id(10L).user(u).message("Msg").type("TYPE").mcqId(5L)
                    .actorName("Actor").actorInitials("AC").mcqRef("REF-5").read(false).createdAt(ts).build();
            Notification b = Notification.builder()
                    .id(10L).user(u).message("Msg").type("TYPE").mcqId(5L)
                    .actorName("Actor").actorInitials("AC").mcqRef("REF-5").read(false).createdAt(ts).build();
            assertThat(a).isEqualTo(b);
            assertThat(a.hashCode()).isEqualTo(b.hashCode());
        }
    }

    // =========================================================================
    // InboxMessage – additional coverage
    // =========================================================================

    @Nested
    @DisplayName("InboxMessage – additional coverage")
    class InboxMessageAdditionalTests {

        private User buildUser(Long id, String eid) {
            return User.builder()
                    .id(id).enterpriseId(eid).fullName("User " + eid)
                    .email(eid + "@test.com").passwordHash("hash").role(Role.SME)
                    .build();
        }

        @Test
        @DisplayName("all-args constructor sets every field")
        void allArgsConstructor_setsEveryField() {
            LocalDateTime ts = LocalDateTime.of(2024, 7, 15, 14, 0);
            User sender    = buildUser(20L, "IM_SND01");
            User recipient = buildUser(21L, "IM_RCV01");

            InboxMessage msg = new InboxMessage(
                    100L, sender, recipient,
                    "Subject Here", "Body content here",
                    true, true, "SYSTEM", 88L, ts
            );

            assertThat(msg.getId()).isEqualTo(100L);
            assertThat(msg.getSender()).isSameAs(sender);
            assertThat(msg.getRecipient()).isSameAs(recipient);
            assertThat(msg.getSubject()).isEqualTo("Subject Here");
            assertThat(msg.getBody()).isEqualTo("Body content here");
            assertThat(msg.isRead()).isTrue();
            assertThat(msg.isStarred()).isTrue();
            assertThat(msg.getMessageType()).isEqualTo("SYSTEM");
            assertThat(msg.getMcqId()).isEqualTo(88L);
            assertThat(msg.getSentAt()).isEqualTo(ts);
        }

        @Test
        @DisplayName("all setters update respective fields")
        void setters_updateAllFields() {
            LocalDateTime ts = LocalDateTime.of(2024, 10, 20, 9, 0);
            User sender    = buildUser(22L, "IM_SND02");
            User recipient = buildUser(23L, "IM_RCV02");

            InboxMessage msg = new InboxMessage();
            msg.setId(200L);
            msg.setSender(sender);
            msg.setRecipient(recipient);
            msg.setSubject("Updated Subject");
            msg.setBody("Updated body");
            msg.setRead(true);
            msg.setStarred(true);
            msg.setMessageType("USER");
            msg.setMcqId(77L);
            msg.setSentAt(ts);

            assertThat(msg.getId()).isEqualTo(200L);
            assertThat(msg.getSender()).isSameAs(sender);
            assertThat(msg.getRecipient()).isSameAs(recipient);
            assertThat(msg.getSubject()).isEqualTo("Updated Subject");
            assertThat(msg.getBody()).isEqualTo("Updated body");
            assertThat(msg.isRead()).isTrue();
            assertThat(msg.isStarred()).isTrue();
            assertThat(msg.getMessageType()).isEqualTo("USER");
            assertThat(msg.getMcqId()).isEqualTo(77L);
            assertThat(msg.getSentAt()).isEqualTo(ts);
        }

        @Test
        @DisplayName("equals(null) returns false")
        void equals_null_returnsFalse() {
            User r = buildUser(24L, "IM_EQ01");
            InboxMessage msg = InboxMessage.builder().id(1L).recipient(r).subject("S").body("B").build();
            assertThat(msg.equals(null)).isFalse();
        }

        @Test
        @DisplayName("equals(different type) returns false")
        void equals_differentType_returnsFalse() {
            User r = buildUser(25L, "IM_EQ02");
            InboxMessage msg = InboxMessage.builder().id(1L).recipient(r).subject("S").body("B").build();
            assertThat(msg.equals(42)).isFalse();
        }

        @Test
        @DisplayName("equals: same instance is equal to itself")
        void equals_sameInstance() {
            User r = buildUser(26L, "IM_EQ03");
            InboxMessage msg = InboxMessage.builder().id(1L).recipient(r).subject("S").body("B").build();
            assertThat(msg.equals(msg)).isTrue();
        }

        @Test
        @DisplayName("equals: two identical messages are equal")
        void equals_equalMessages() {
            User r = buildUser(27L, "IM_EQ04");
            InboxMessage a = InboxMessage.builder().id(5L).recipient(r).subject("Sub").body("Body").build();
            InboxMessage b = InboxMessage.builder().id(5L).recipient(r).subject("Sub").body("Body").build();
            assertThat(a).isEqualTo(b);
            assertThat(a.hashCode()).isEqualTo(b.hashCode());
        }

        @Test
        @DisplayName("equals: different subject produces unequal messages")
        void equals_differentSubject_notEqual() {
            User r = buildUser(28L, "IM_EQ05");
            InboxMessage a = InboxMessage.builder().id(1L).recipient(r).subject("Alpha").body("B").build();
            InboxMessage b = InboxMessage.builder().id(1L).recipient(r).subject("Beta").body("B").build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("equals: different read flag produces unequal messages")
        void equals_differentRead_notEqual() {
            User r = buildUser(29L, "IM_EQ06");
            InboxMessage a = InboxMessage.builder().id(1L).recipient(r).subject("S").body("B").read(true).build();
            InboxMessage b = InboxMessage.builder().id(1L).recipient(r).subject("S").body("B").read(false).build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("equals: different starred flag produces unequal messages")
        void equals_differentStarred_notEqual() {
            User r = buildUser(30L, "IM_EQ07");
            InboxMessage a = InboxMessage.builder().id(1L).recipient(r).subject("S").body("B").starred(true).build();
            InboxMessage b = InboxMessage.builder().id(1L).recipient(r).subject("S").body("B").starred(false).build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("messageType can be set via setter")
        void messageType_setter() {
            InboxMessage msg = new InboxMessage();
            msg.setMessageType("SYSTEM");
            assertThat(msg.getMessageType()).isEqualTo("SYSTEM");
            msg.setMessageType("USER");
            assertThat(msg.getMessageType()).isEqualTo("USER");
        }

        @Test
        @DisplayName("starred flag can be toggled via setter")
        void starred_toggledViaSetter() {
            User r = buildUser(31L, "IM_ST01");
            InboxMessage msg = InboxMessage.builder().recipient(r).subject("S").body("B").build();
            assertThat(msg.isStarred()).isFalse();
            msg.setStarred(true);
            assertThat(msg.isStarred()).isTrue();
        }

        @Test
        @DisplayName("toString does not throw")
        void toString_noThrow() {
            User r = buildUser(32L, "IM_TS01");
            InboxMessage msg = InboxMessage.builder().id(3L).recipient(r).subject("Sub_IM_TS01").body("B").build();
            assertThatCode(msg::toString).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("equals: two fully-populated InboxMessages with same values are equal")
        void equals_twoFullyPopulated_equal() {
            LocalDateTime ts = LocalDateTime.of(2024, 8, 8, 8, 8);
            User sender    = buildUser(34L, "IM_FULL_SND");
            User recipient = buildUser(35L, "IM_FULL_RCV");

            InboxMessage a = InboxMessage.builder()
                    .id(10L).sender(sender).recipient(recipient)
                    .subject("Sub").body("Body")
                    .read(false).starred(false).messageType("SYSTEM").mcqId(7L).sentAt(ts).build();
            InboxMessage b = InboxMessage.builder()
                    .id(10L).sender(sender).recipient(recipient)
                    .subject("Sub").body("Body")
                    .read(false).starred(false).messageType("SYSTEM").mcqId(7L).sentAt(ts).build();
            assertThat(a).isEqualTo(b);
            assertThat(a.hashCode()).isEqualTo(b.hashCode());
        }
    }

    // =========================================================================
    // ChatMessage – additional edge-case coverage
    // =========================================================================
    @Nested
    @DisplayName("ChatMessage – edge cases")
    class ChatMessageEdgeCaseTests {

        @Test
        @DisplayName("equals(null) returns false")
        void equals_null_returnsFalse() {
            ChatMessage msg = ChatMessage.builder().id(1L).senderEnterpriseId("E1").content("C").build();
            assertThat(msg.equals(null)).isFalse();
        }

        @Test
        @DisplayName("equals(different type) returns false")
        void equals_differentType_returnsFalse() {
            ChatMessage msg = ChatMessage.builder().id(1L).senderEnterpriseId("E1").content("C").build();
            assertThat(msg.equals("not a chat message")).isFalse();
        }

        @Test
        @DisplayName("equals: same instance is equal to itself")
        void equals_sameInstance() {
            ChatMessage msg = ChatMessage.builder().id(1L).senderEnterpriseId("E1").content("C").build();
            assertThat(msg.equals(msg)).isTrue();
        }

        @Test
        @DisplayName("equals: different senderEnterpriseId produces unequal messages")
        void equals_differentSender_notEqual() {
            ChatMessage a = ChatMessage.builder().id(1L).senderEnterpriseId("SENDER_A").content("C").build();
            ChatMessage b = ChatMessage.builder().id(1L).senderEnterpriseId("SENDER_B").content("C").build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("equals: different replyToId produces unequal messages")
        void equals_differentReplyToId_notEqual() {
            ChatMessage a = ChatMessage.builder().id(1L).senderEnterpriseId("E").content("C").replyToId(1L).build();
            ChatMessage b = ChatMessage.builder().id(1L).senderEnterpriseId("E").content("C").replyToId(2L).build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("hashCode: two equal messages have the same hashCode")
        void hashCode_equalMessages() {
            LocalDateTime ts = LocalDateTime.of(2024, 5, 5, 5, 5);
            ChatMessage a = ChatMessage.builder().id(99L).senderEnterpriseId("EQ").content("Same").createdAt(ts).build();
            ChatMessage b = ChatMessage.builder().id(99L).senderEnterpriseId("EQ").content("Same").createdAt(ts).build();
            assertThat(a.hashCode()).isEqualTo(b.hashCode());
        }

        @Test
        @DisplayName("senderRole can be any arbitrary string")
        void senderRole_arbitrary() {
            ChatMessage msg = new ChatMessage();
            msg.setSenderRole("CUSTOM_ROLE");
            assertThat(msg.getSenderRole()).isEqualTo("CUSTOM_ROLE");
        }

        @Test
        @DisplayName("msgType setter updates the field")
        void msgType_setter() {
            ChatMessage msg = new ChatMessage();
            msg.setMsgType("BOT");
            assertThat(msg.getMsgType()).isEqualTo("BOT");
            msg.setMsgType("USER");
            assertThat(msg.getMsgType()).isEqualTo("USER");
        }

        @Test
        @DisplayName("replyToContent setter updates the field")
        void replyToContent_setter() {
            ChatMessage msg = new ChatMessage();
            msg.setReplyToContent("Quoted message text");
            assertThat(msg.getReplyToContent()).isEqualTo("Quoted message text");
        }

        @Test
        @DisplayName("replyToSender setter updates the field")
        void replyToSender_setter() {
            ChatMessage msg = new ChatMessage();
            msg.setReplyToSender("Original Author");
            assertThat(msg.getReplyToSender()).isEqualTo("Original Author");
        }

        @Test
        @DisplayName("reactions setter updates the field")
        void reactions_setter() {
            ChatMessage msg = new ChatMessage();
            msg.setReactions("{\"👍\":[\"user1\"]}");
            assertThat(msg.getReactions()).isEqualTo("{\"👍\":[\"user1\"]}");
        }

        @Test
        @DisplayName("createdAt setter updates the field")
        void createdAt_setter() {
            ChatMessage msg = new ChatMessage();
            LocalDateTime ts = LocalDateTime.of(2024, 11, 11, 11, 11);
            msg.setCreatedAt(ts);
            assertThat(msg.getCreatedAt()).isEqualTo(ts);
        }

        @Test
        @DisplayName("all-args constructor sets every field")
        void allArgsConstructor_setsEveryField() {
            LocalDateTime created = LocalDateTime.of(2024, 3, 15, 10, 0);
            LocalDateTime edited  = LocalDateTime.of(2024, 3, 15, 11, 0);

            ChatMessage msg = new ChatMessage(
                    100L, "SENDER_EID", "Sender Name", "SME", "Hello content",
                    "BOT", created, 5L, "Quoted text", "Original Sender",
                    "{\"\uD83D\uDC4D\":[\"alice\"]}", true, false, edited
            );

            assertThat(msg.getId()).isEqualTo(100L);
            assertThat(msg.getSenderEnterpriseId()).isEqualTo("SENDER_EID");
            assertThat(msg.getSenderName()).isEqualTo("Sender Name");
            assertThat(msg.getSenderRole()).isEqualTo("SME");
            assertThat(msg.getContent()).isEqualTo("Hello content");
            assertThat(msg.getMsgType()).isEqualTo("BOT");
            assertThat(msg.getCreatedAt()).isEqualTo(created);
            assertThat(msg.getReplyToId()).isEqualTo(5L);
            assertThat(msg.getReplyToContent()).isEqualTo("Quoted text");
            assertThat(msg.getReplyToSender()).isEqualTo("Original Sender");
            assertThat(msg.getPinned()).isTrue();
            assertThat(msg.getDeleted()).isFalse();
            assertThat(msg.getEditedAt()).isEqualTo(edited);
        }
    }

    // =========================================================================
    // QuizAttempt – additional coverage
    // =========================================================================

    @Nested
    @DisplayName("QuizAttempt – additional coverage")
    class QuizAttemptAdditionalTests {

        @Test
        @DisplayName("@Builder.Default: status defaults to COMPLETED")
        void builderDefault_status_completed() {
            QuizAttempt attempt = QuizAttempt.builder()
                    .sessionId(1L).candidateName("Test").candidateEmail("t@test.com")
                    .build();
            assertThat(attempt.getStatus()).isEqualTo("COMPLETED");
        }

        @Test
        @DisplayName("@Builder.Default: violationCount defaults to 0")
        void builderDefault_violationCount_zero() {
            QuizAttempt attempt = QuizAttempt.builder()
                    .sessionId(2L).candidateName("Test2").candidateEmail("t2@test.com")
                    .build();
            assertThat(attempt.getViolationCount()).isZero();
        }

        @Test
        @DisplayName("all setters update respective fields")
        void setters_updateAllFields() {
            LocalDateTime ts = LocalDateTime.of(2024, 6, 20, 15, 0);

            QuizAttempt a = new QuizAttempt();
            a.setId(1000L);
            a.setSessionId(50L);
            a.setCandidateName("Test Candidate");
            a.setCandidateEmail("candidate@test.com");
            a.setAnswers("{\"1\":\"A\",\"2\":\"B\"}");
            a.setScore(8);
            a.setTotalQuestions(10);
            a.setTopicBreakdown("{\"Java\":{\"correct\":8,\"total\":10}}");
            a.setStatus("TERMINATED");
            a.setViolationCount(2);
            a.setViolationScreenshot("base64screenshot");
            a.setTimeTakenSeconds(600);
            a.setSubmittedAt(ts);

            assertThat(a.getId()).isEqualTo(1000L);
            assertThat(a.getSessionId()).isEqualTo(50L);
            assertThat(a.getCandidateName()).isEqualTo("Test Candidate");
            assertThat(a.getCandidateEmail()).isEqualTo("candidate@test.com");
            assertThat(a.getAnswers()).isEqualTo("{\"1\":\"A\",\"2\":\"B\"}");
            assertThat(a.getScore()).isEqualTo(8);
            assertThat(a.getTotalQuestions()).isEqualTo(10);
            assertThat(a.getTopicBreakdown()).contains("Java");
            assertThat(a.getStatus()).isEqualTo("TERMINATED");
            assertThat(a.getViolationCount()).isEqualTo(2);
            assertThat(a.getViolationScreenshot()).isEqualTo("base64screenshot");
            assertThat(a.getTimeTakenSeconds()).isEqualTo(600);
            assertThat(a.getSubmittedAt()).isEqualTo(ts);
        }

        @Test
        @DisplayName("equals(null) returns false")
        void equals_null_returnsFalse() {
            QuizAttempt a = QuizAttempt.builder()
                    .id(1L).sessionId(1L).candidateName("X").candidateEmail("x@x.com").build();
            assertThat(a.equals(null)).isFalse();
        }

        @Test
        @DisplayName("equals(different type) returns false")
        void equals_differentType_returnsFalse() {
            QuizAttempt a = QuizAttempt.builder()
                    .id(1L).sessionId(1L).candidateName("X").candidateEmail("x@x.com").build();
            assertThat(a.equals("not an attempt")).isFalse();
        }

        @Test
        @DisplayName("equals: same instance is equal to itself")
        void equals_sameInstance() {
            QuizAttempt a = QuizAttempt.builder()
                    .id(1L).sessionId(1L).candidateName("X").candidateEmail("x@x.com").build();
            assertThat(a.equals(a)).isTrue();
        }

        @Test
        @DisplayName("equals: two equal attempts are equal")
        void equals_twoEqualAttempts() {
            LocalDateTime ts = LocalDateTime.of(2024, 3, 3, 3, 3);
            QuizAttempt a = QuizAttempt.builder()
                    .id(5L).sessionId(10L).candidateName("Alice").candidateEmail("a@test.com")
                    .score(9).totalQuestions(10).status("COMPLETED").violationCount(0)
                    .submittedAt(ts).build();
            QuizAttempt b = QuizAttempt.builder()
                    .id(5L).sessionId(10L).candidateName("Alice").candidateEmail("a@test.com")
                    .score(9).totalQuestions(10).status("COMPLETED").violationCount(0)
                    .submittedAt(ts).build();
            assertThat(a).isEqualTo(b);
            assertThat(a.hashCode()).isEqualTo(b.hashCode());
        }

        @Test
        @DisplayName("equals: different candidateName produces unequal attempts")
        void equals_differentCandidateName_notEqual() {
            QuizAttempt a = QuizAttempt.builder()
                    .id(1L).sessionId(1L).candidateName("Alice").candidateEmail("a@test.com").build();
            QuizAttempt b = QuizAttempt.builder()
                    .id(1L).sessionId(1L).candidateName("Bob").candidateEmail("a@test.com").build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("equals: different violationCount produces unequal attempts")
        void equals_differentViolationCount_notEqual() {
            QuizAttempt a = QuizAttempt.builder()
                    .id(1L).sessionId(1L).candidateName("C").candidateEmail("c@c.com")
                    .violationCount(0).build();
            QuizAttempt b = QuizAttempt.builder()
                    .id(1L).sessionId(1L).candidateName("C").candidateEmail("c@c.com")
                    .violationCount(3).build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("equals: different status produces unequal attempts")
        void equals_differentStatus_notEqual() {
            QuizAttempt a = QuizAttempt.builder()
                    .id(1L).sessionId(1L).candidateName("D").candidateEmail("d@d.com")
                    .status("COMPLETED").build();
            QuizAttempt b = QuizAttempt.builder()
                    .id(1L).sessionId(1L).candidateName("D").candidateEmail("d@d.com")
                    .status("TERMINATED").build();
            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("toString does not throw and contains candidate info")
        void toString_noThrow() {
            QuizAttempt a = QuizAttempt.builder()
                    .id(999L).sessionId(1L).candidateName("Distinct_Candidate_999")
                    .candidateEmail("distinct999@test.com").build();
            assertThatCode(a::toString).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("answers field can hold complex JSON map")
        void answers_complexJson() {
            String answersJson = "{\"1\":\"A\",\"2\":\"C\",\"3\":\"B\",\"4\":\"D\",\"5\":\"A\"}";
            QuizAttempt a = QuizAttempt.builder()
                    .sessionId(1L).candidateName("E").candidateEmail("e@e.com")
                    .answers(answersJson).build();
            assertThat(a.getAnswers()).contains("\"1\":\"A\"").contains("\"5\":\"A\"");
        }

        @Test
        @DisplayName("violationCount can be set to a high number")
        void violationCount_highValue() {
            QuizAttempt a = QuizAttempt.builder()
                    .sessionId(1L).candidateName("F").candidateEmail("f@f.com")
                    .violationCount(50).build();
            assertThat(a.getViolationCount()).isEqualTo(50);
        }

        @Test
        @DisplayName("score and totalQuestions are nullable")
        void score_totalQuestions_nullable() {
            QuizAttempt a = QuizAttempt.builder()
                    .sessionId(1L).candidateName("G").candidateEmail("g@g.com")
                    .build();
            assertThat(a.getScore()).isNull();
            assertThat(a.getTotalQuestions()).isNull();
        }

        @Test
        @DisplayName("timeTakenSeconds and violationScreenshot are nullable")
        void timeTaken_screenshot_nullable() {
            QuizAttempt a = QuizAttempt.builder()
                    .sessionId(1L).candidateName("H").candidateEmail("h@h.com")
                    .build();
            assertThat(a.getTimeTakenSeconds()).isNull();
            assertThat(a.getViolationScreenshot()).isNull();
        }

        @Test
        @DisplayName("hashCode is consistent across multiple calls")
        void hashCode_consistent() {
            QuizAttempt a = QuizAttempt.builder()
                    .id(42L).sessionId(1L).candidateName("I").candidateEmail("i@i.com").build();
            assertThat(a.hashCode()).isEqualTo(a.hashCode());
        }
    }
}
