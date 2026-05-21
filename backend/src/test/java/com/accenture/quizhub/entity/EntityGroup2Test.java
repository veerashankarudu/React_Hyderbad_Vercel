package com.accenture.quizhub.entity;

import com.accenture.quizhub.enums.Role;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * Pure POJO / Lombok unit tests for ChatMessage, InboxMessage, Notification, User.
 * No Spring context required.
 */
class EntityGroup2Test {

    // =========================================================================
    // ChatMessage
    // =========================================================================
    @Nested
    @DisplayName("ChatMessage")
    class ChatMessageTests {

        @Test
        @DisplayName("builder sets all fields correctly")
        void builder_allFields() {
            LocalDateTime now = LocalDateTime.now();
            ChatMessage msg = ChatMessage.builder()
                    .id(1L)
                    .senderEnterpriseId("EID001")
                    .senderName("Alice")
                    .senderRole("SME")
                    .content("Hello world")
                    .msgType("BOT")
                    .createdAt(now)
                    .replyToId(10L)
                    .replyToContent("Original text")
                    .replyToSender("Bob")
                    .reactions("{\"👍\":[\"alice\"]}")
                    .pinned(true)
                    .deleted(false)
                    .editedAt(now.plusMinutes(5))
                    .build();

            assertThat(msg.getId()).isEqualTo(1L);
            assertThat(msg.getSenderEnterpriseId()).isEqualTo("EID001");
            assertThat(msg.getSenderName()).isEqualTo("Alice");
            assertThat(msg.getSenderRole()).isEqualTo("SME");
            assertThat(msg.getContent()).isEqualTo("Hello world");
            assertThat(msg.getMsgType()).isEqualTo("BOT");
            assertThat(msg.getCreatedAt()).isEqualTo(now);
            assertThat(msg.getReplyToId()).isEqualTo(10L);
            assertThat(msg.getReplyToContent()).isEqualTo("Original text");
            assertThat(msg.getReplyToSender()).isEqualTo("Bob");
            assertThat(msg.getReactions()).isEqualTo("{\"👍\":[\"alice\"]}");
            assertThat(msg.getPinned()).isTrue();
            assertThat(msg.getDeleted()).isFalse();
            assertThat(msg.getEditedAt()).isEqualTo(now.plusMinutes(5));
        }

        @Test
        @DisplayName("@Builder.Default: msgType defaults to USER")
        void builderDefault_msgType() {
            ChatMessage msg = ChatMessage.builder()
                    .senderEnterpriseId("EID002")
                    .content("Test")
                    .build();

            assertThat(msg.getMsgType()).isEqualTo("USER");
        }

        @Test
        @DisplayName("@Builder.Default: reactions defaults to {}")
        void builderDefault_reactions() {
            ChatMessage msg = ChatMessage.builder()
                    .senderEnterpriseId("EID003")
                    .content("Test")
                    .build();

            assertThat(msg.getReactions()).isEqualTo("{}");
        }

        @Test
        @DisplayName("@Builder.Default: pinned defaults to false")
        void builderDefault_pinned() {
            ChatMessage msg = ChatMessage.builder()
                    .senderEnterpriseId("EID004")
                    .content("Test")
                    .build();

            assertThat(msg.getPinned()).isFalse();
        }

        @Test
        @DisplayName("@Builder.Default: deleted defaults to false")
        void builderDefault_deleted() {
            ChatMessage msg = ChatMessage.builder()
                    .senderEnterpriseId("EID005")
                    .content("Test")
                    .build();

            assertThat(msg.getDeleted()).isFalse();
        }

        @Test
        @DisplayName("no-args constructor + setters work")
        void noArgsConstructorAndSetters() {
            ChatMessage msg = new ChatMessage();
            msg.setId(42L);
            msg.setSenderEnterpriseId("EID010");
            msg.setSenderName("Carol");
            msg.setContent("Content here");
            msg.setSenderRole("ADMIN");

            assertThat(msg.getId()).isEqualTo(42L);
            assertThat(msg.getSenderEnterpriseId()).isEqualTo("EID010");
            assertThat(msg.getSenderName()).isEqualTo("Carol");
            assertThat(msg.getContent()).isEqualTo("Content here");
            assertThat(msg.getSenderRole()).isEqualTo("ADMIN");
        }

        @Test
        @DisplayName("nullable reply fields can be null")
        void nullableReplyFields() {
            ChatMessage msg = ChatMessage.builder()
                    .senderEnterpriseId("EID006")
                    .content("No reply")
                    .build();

            assertThat(msg.getReplyToId()).isNull();
            assertThat(msg.getReplyToContent()).isNull();
            assertThat(msg.getReplyToSender()).isNull();
            assertThat(msg.getEditedAt()).isNull();
        }

        @Test
        @DisplayName("equals and hashCode do not throw")
        void equalsHashCode_noThrow() {
            ChatMessage a = ChatMessage.builder().id(1L).senderEnterpriseId("E1").content("Hi").build();
            ChatMessage b = ChatMessage.builder().id(1L).senderEnterpriseId("E1").content("Hi").build();

            assertThatCode(() -> a.equals(b)).doesNotThrowAnyException();
            assertThatCode(() -> a.hashCode()).doesNotThrowAnyException();
            assertThat(a).isEqualTo(b);
        }

        @Test
        @DisplayName("toString does not throw")
        void toString_noThrow() {
            ChatMessage msg = ChatMessage.builder().id(5L).senderEnterpriseId("E5").content("X").build();
            assertThatCode(msg::toString).doesNotThrowAnyException();
            assertThat(msg.toString()).contains("ChatMessage");
        }

        @Test
        @DisplayName("pinned and deleted can be explicitly set to true")
        void setPinnedAndDeleted_true() {
            ChatMessage msg = ChatMessage.builder()
                    .senderEnterpriseId("EID007")
                    .content("Pinned msg")
                    .pinned(true)
                    .deleted(true)
                    .build();

            assertThat(msg.getPinned()).isTrue();
            assertThat(msg.getDeleted()).isTrue();
        }
    }

    // =========================================================================
    // InboxMessage
    // =========================================================================
    @Nested
    @DisplayName("InboxMessage")
    class InboxMessageTests {

        private User buildUser(Long id, String eid) {
            return User.builder()
                    .id(id)
                    .enterpriseId(eid)
                    .fullName("User " + eid)
                    .email(eid + "@test.com")
                    .passwordHash("hash")
                    .role(Role.SME)
                    .build();
        }

        @Test
        @DisplayName("builder sets all fields correctly")
        void builder_allFields() {
            LocalDateTime now = LocalDateTime.now();
            User sender = buildUser(1L, "SEND001");
            User recipient = buildUser(2L, "RECV001");

            InboxMessage msg = InboxMessage.builder()
                    .id(10L)
                    .sender(sender)
                    .recipient(recipient)
                    .subject("Test Subject")
                    .body("Body text here")
                    .read(true)
                    .starred(true)
                    .messageType("SYSTEM")
                    .mcqId(55L)
                    .sentAt(now)
                    .build();

            assertThat(msg.getId()).isEqualTo(10L);
            assertThat(msg.getSender()).isEqualTo(sender);
            assertThat(msg.getRecipient()).isEqualTo(recipient);
            assertThat(msg.getSubject()).isEqualTo("Test Subject");
            assertThat(msg.getBody()).isEqualTo("Body text here");
            assertThat(msg.isRead()).isTrue();
            assertThat(msg.isStarred()).isTrue();
            assertThat(msg.getMessageType()).isEqualTo("SYSTEM");
            assertThat(msg.getMcqId()).isEqualTo(55L);
            assertThat(msg.getSentAt()).isEqualTo(now);
        }

        @Test
        @DisplayName("no-args constructor + setters work")
        void noArgsConstructorAndSetters() {
            User recipient = buildUser(3L, "RECV002");
            InboxMessage msg = new InboxMessage();
            msg.setId(20L);
            msg.setRecipient(recipient);
            msg.setSubject("Hello");
            msg.setBody("Body");
            msg.setRead(false);

            assertThat(msg.getId()).isEqualTo(20L);
            assertThat(msg.getRecipient()).isEqualTo(recipient);
            assertThat(msg.getSubject()).isEqualTo("Hello");
            assertThat(msg.getBody()).isEqualTo("Body");
            assertThat(msg.isRead()).isFalse();
        }

        @Test
        @DisplayName("read defaults to false for primitive boolean")
        void primitiveDefault_read() {
            User recipient = buildUser(4L, "RECV003");
            InboxMessage msg = InboxMessage.builder()
                    .recipient(recipient)
                    .subject("Sub")
                    .body("Body")
                    .build();

            assertThat(msg.isRead()).isFalse();
        }

        @Test
        @DisplayName("starred defaults to false for primitive boolean")
        void primitiveDefault_starred() {
            User recipient = buildUser(5L, "RECV004");
            InboxMessage msg = InboxMessage.builder()
                    .recipient(recipient)
                    .subject("Sub")
                    .body("Body")
                    .build();

            assertThat(msg.isStarred()).isFalse();
        }

        @Test
        @DisplayName("sender is nullable (system message)")
        void sender_nullable() {
            User recipient = buildUser(6L, "RECV005");
            InboxMessage msg = InboxMessage.builder()
                    .recipient(recipient)
                    .subject("System notification")
                    .body("Your MCQ was approved")
                    .build();

            assertThat(msg.getSender()).isNull();
        }

        @Test
        @DisplayName("mcqId is nullable")
        void mcqId_nullable() {
            User recipient = buildUser(7L, "RECV006");
            InboxMessage msg = InboxMessage.builder()
                    .recipient(recipient)
                    .subject("No MCQ")
                    .body("General message")
                    .build();

            assertThat(msg.getMcqId()).isNull();
        }

        @Test
        @DisplayName("equals and hashCode do not throw")
        void equalsHashCode_noThrow() {
            User r = buildUser(8L, "RECV007");
            InboxMessage a = InboxMessage.builder().id(1L).recipient(r).subject("S").body("B").build();
            InboxMessage b = InboxMessage.builder().id(1L).recipient(r).subject("S").body("B").build();

            assertThatCode(() -> a.equals(b)).doesNotThrowAnyException();
            assertThatCode(() -> a.hashCode()).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("toString does not throw")
        void toString_noThrow() {
            User r = buildUser(9L, "RECV008");
            InboxMessage msg = InboxMessage.builder().id(2L).recipient(r).subject("S").body("B").build();
            assertThatCode(msg::toString).doesNotThrowAnyException();
            assertThat(msg.toString()).contains("InboxMessage");
        }
    }

    // =========================================================================
    // Notification
    // =========================================================================
    @Nested
    @DisplayName("Notification")
    class NotificationTests {

        private User buildUser(Long id, String eid) {
            return User.builder()
                    .id(id)
                    .enterpriseId(eid)
                    .fullName("User " + eid)
                    .email(eid + "@test.com")
                    .passwordHash("hash")
                    .role(Role.ADMIN)
                    .build();
        }

        @Test
        @DisplayName("builder sets all fields correctly")
        void builder_allFields() {
            LocalDateTime now = LocalDateTime.now();
            User user = buildUser(1L, "NOT001");

            Notification n = Notification.builder()
                    .id(100L)
                    .user(user)
                    .message("Your MCQ was approved")
                    .type("MCQ_APPROVED")
                    .mcqId(77L)
                    .actorName("Bob Smith")
                    .actorInitials("BS")
                    .mcqRef("REF-001")
                    .read(true)
                    .createdAt(now)
                    .build();

            assertThat(n.getId()).isEqualTo(100L);
            assertThat(n.getUser()).isEqualTo(user);
            assertThat(n.getMessage()).isEqualTo("Your MCQ was approved");
            assertThat(n.getType()).isEqualTo("MCQ_APPROVED");
            assertThat(n.getMcqId()).isEqualTo(77L);
            assertThat(n.getActorName()).isEqualTo("Bob Smith");
            assertThat(n.getActorInitials()).isEqualTo("BS");
            assertThat(n.getMcqRef()).isEqualTo("REF-001");
            assertThat(n.isRead()).isTrue();
            assertThat(n.getCreatedAt()).isEqualTo(now);
        }

        @Test
        @DisplayName("@Builder.Default: read defaults to false")
        void builderDefault_read() {
            User user = buildUser(2L, "NOT002");
            Notification n = Notification.builder()
                    .user(user)
                    .message("Alert")
                    .type("ALERT")
                    .build();

            assertThat(n.isRead()).isFalse();
        }

        @Test
        @DisplayName("no-args constructor + setters work")
        void noArgsConstructorAndSetters() {
            User user = buildUser(3L, "NOT003");
            Notification n = new Notification();
            n.setId(200L);
            n.setUser(user);
            n.setMessage("Test message");
            n.setType("TEST_TYPE");
            n.setRead(false);

            assertThat(n.getId()).isEqualTo(200L);
            assertThat(n.getUser()).isEqualTo(user);
            assertThat(n.getMessage()).isEqualTo("Test message");
            assertThat(n.getType()).isEqualTo("TEST_TYPE");
            assertThat(n.isRead()).isFalse();
        }

        @Test
        @DisplayName("nullable fields (mcqId, actorName, actorInitials, mcqRef) can be null")
        void nullableFields() {
            User user = buildUser(4L, "NOT004");
            Notification n = Notification.builder()
                    .user(user)
                    .message("Simple notification")
                    .type("INFO")
                    .build();

            assertThat(n.getMcqId()).isNull();
            assertThat(n.getActorName()).isNull();
            assertThat(n.getActorInitials()).isNull();
            assertThat(n.getMcqRef()).isNull();
        }

        @Test
        @DisplayName("read can be set to true via setter")
        void setRead_true() {
            User user = buildUser(5L, "NOT005");
            Notification n = Notification.builder()
                    .user(user)
                    .message("Msg")
                    .type("TYPE")
                    .build();

            assertThat(n.isRead()).isFalse();
            n.setRead(true);
            assertThat(n.isRead()).isTrue();
        }

        @Test
        @DisplayName("equals and hashCode do not throw")
        void equalsHashCode_noThrow() {
            User u = buildUser(6L, "NOT006");
            Notification a = Notification.builder().id(1L).user(u).message("M").type("T").build();
            Notification b = Notification.builder().id(1L).user(u).message("M").type("T").build();

            assertThatCode(() -> a.equals(b)).doesNotThrowAnyException();
            assertThatCode(() -> a.hashCode()).doesNotThrowAnyException();
            assertThat(a).isEqualTo(b);
        }

        @Test
        @DisplayName("toString does not throw")
        void toString_noThrow() {
            User u = buildUser(7L, "NOT007");
            Notification n = Notification.builder().id(2L).user(u).message("M").type("T").build();
            assertThatCode(n::toString).doesNotThrowAnyException();
            assertThat(n.toString()).contains("Notification");
        }

        @Test
        @DisplayName("createdAt can be set explicitly")
        void createdAt_explicit() {
            LocalDateTime ts = LocalDateTime.of(2024, 6, 15, 10, 30);
            User user = buildUser(8L, "NOT008");
            Notification n = Notification.builder()
                    .user(user)
                    .message("Msg")
                    .type("T")
                    .createdAt(ts)
                    .build();

            assertThat(n.getCreatedAt()).isEqualTo(ts);
        }
    }

    // =========================================================================
    // User
    // =========================================================================
    @Nested
    @DisplayName("User")
    class UserTests {

        @Test
        @DisplayName("builder sets all fields correctly")
        void builder_allFields() {
            TechStack ts1 = TechStack.builder().id(1L).name("Java").build();
            TechStack ts2 = TechStack.builder().id(2L).name("Spring").build();

            User user = User.builder()
                    .id(10L)
                    .enterpriseId("EMP001")
                    .fullName("Alice Smith")
                    .email("alice@example.com")
                    .passwordHash("$2a$12$hashed")
                    .role(Role.SME)
                    .approved(true)
                    .techStacks(List.of(ts1, ts2))
                    .build();

            assertThat(user.getId()).isEqualTo(10L);
            assertThat(user.getEnterpriseId()).isEqualTo("EMP001");
            assertThat(user.getFullName()).isEqualTo("Alice Smith");
            assertThat(user.getEmail()).isEqualTo("alice@example.com");
            assertThat(user.getPasswordHash()).isEqualTo("$2a$12$hashed");
            assertThat(user.getRole()).isEqualTo(Role.SME);
            assertThat(user.isApproved()).isTrue();
            assertThat(user.getTechStacks()).containsExactly(ts1, ts2);
        }

        @Test
        @DisplayName("ADMIN role can be assigned")
        void role_admin() {
            User user = User.builder()
                    .id(20L)
                    .enterpriseId("EMP002")
                    .fullName("Bob Jones")
                    .email("bob@example.com")
                    .passwordHash("hash2")
                    .role(Role.ADMIN)
                    .build();

            assertThat(user.getRole()).isEqualTo(Role.ADMIN);
        }

        @Test
        @DisplayName("no-args constructor + setters work")
        void noArgsConstructorAndSetters() {
            User user = new User();
            user.setId(30L);
            user.setEnterpriseId("EMP003");
            user.setFullName("Carol Davis");
            user.setEmail("carol@example.com");
            user.setPasswordHash("hash3");
            user.setRole(Role.SME);
            user.setApproved(true);

            assertThat(user.getId()).isEqualTo(30L);
            assertThat(user.getEnterpriseId()).isEqualTo("EMP003");
            assertThat(user.getFullName()).isEqualTo("Carol Davis");
            assertThat(user.getEmail()).isEqualTo("carol@example.com");
            assertThat(user.getPasswordHash()).isEqualTo("hash3");
            assertThat(user.getRole()).isEqualTo(Role.SME);
            assertThat(user.isApproved()).isTrue();
        }

        @Test
        @DisplayName("no-args constructor: approved is true by default (field initializer)")
        void noArgsConstructor_approvedDefault() {
            User user = new User();
            assertThat(user.isApproved()).isTrue();
        }

        @Test
        @DisplayName("techStacks can be null when not set in builder")
        void techStacks_nullable() {
            User user = User.builder()
                    .id(40L)
                    .enterpriseId("EMP004")
                    .fullName("Dave")
                    .email("dave@example.com")
                    .passwordHash("hash4")
                    .role(Role.SME)
                    .build();

            assertThat(user.getTechStacks()).isNull();
        }

        @Test
        @DisplayName("techStacks can hold multiple tech stacks")
        void techStacks_multiple() {
            TechStack ts1 = TechStack.builder().id(1L).name("Python").build();
            TechStack ts2 = TechStack.builder().id(2L).name("Django").build();
            TechStack ts3 = TechStack.builder().id(3L).name("PostgreSQL").build();

            User user = User.builder()
                    .id(50L)
                    .enterpriseId("EMP005")
                    .fullName("Eve")
                    .email("eve@example.com")
                    .passwordHash("hash5")
                    .role(Role.SME)
                    .techStacks(List.of(ts1, ts2, ts3))
                    .build();

            assertThat(user.getTechStacks()).hasSize(3);
            assertThat(user.getTechStacks()).extracting(TechStack::getName)
                    .containsExactly("Python", "Django", "PostgreSQL");
        }

        @Test
        @DisplayName("approved can be set to false via setter")
        void setApproved_false() {
            User user = User.builder()
                    .id(60L)
                    .enterpriseId("EMP006")
                    .fullName("Frank")
                    .email("frank@example.com")
                    .passwordHash("hash6")
                    .role(Role.SME)
                    .approved(false)
                    .build();

            assertThat(user.isApproved()).isFalse();
            user.setApproved(true);
            assertThat(user.isApproved()).isTrue();
        }

        @Test
        @DisplayName("equals and hashCode do not throw")
        void equalsHashCode_noThrow() {
            User a = User.builder().id(1L).enterpriseId("E1").fullName("F").email("e@e.com").passwordHash("h").role(Role.SME).build();
            User b = User.builder().id(1L).enterpriseId("E1").fullName("F").email("e@e.com").passwordHash("h").role(Role.SME).build();

            assertThatCode(() -> a.equals(b)).doesNotThrowAnyException();
            assertThatCode(() -> a.hashCode()).doesNotThrowAnyException();
            assertThat(a).isEqualTo(b);
        }

        @Test
        @DisplayName("toString does not throw")
        void toString_noThrow() {
            User user = User.builder().id(5L).enterpriseId("E5").fullName("X").email("x@x.com").passwordHash("hx").role(Role.ADMIN).build();
            assertThatCode(user::toString).doesNotThrowAnyException();
            assertThat(user.toString()).contains("User");
        }
    }
}
