package com.accenture.quizhub.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pure POJO / Lombok unit tests for:
 * AuditLog, McqComment, ReviewComment, TechStack, Topic, PasswordResetToken
 * No Spring context required.
 */
@DisplayName("EntityGroup3 – AuditLog / McqComment / ReviewComment / TechStack / Topic / PasswordResetToken")
class EntityGroup3Test {

    // =========================================================
    // AuditLog
    // =========================================================

    @Nested
    @DisplayName("AuditLog")
    class AuditLogTests {

        @Test
        @DisplayName("builder sets all fields")
        void builder_setsAllFields() {
            LocalDateTime ts = LocalDateTime.of(2024, 6, 1, 10, 0);

            AuditLog log = AuditLog.builder()
                    .id(1L)
                    .actorEnterpriseId("actor123")
                    .action("USER_CREATED")
                    .targetEnterpriseId("target456")
                    .details("User created successfully")
                    .timestamp(ts)
                    .build();

            assertThat(log.getId()).isEqualTo(1L);
            assertThat(log.getActorEnterpriseId()).isEqualTo("actor123");
            assertThat(log.getAction()).isEqualTo("USER_CREATED");
            assertThat(log.getTargetEnterpriseId()).isEqualTo("target456");
            assertThat(log.getDetails()).isEqualTo("User created successfully");
            assertThat(log.getTimestamp()).isEqualTo(ts);
        }

        @Test
        @DisplayName("no-args constructor + setters round-trip")
        void noArgsConstructor_settersRoundTrip() {
            LocalDateTime ts = LocalDateTime.of(2024, 1, 15, 8, 30);
            AuditLog log = new AuditLog();
            log.setId(10L);
            log.setActorEnterpriseId("admin");
            log.setAction("ROLE_CHANGED");
            log.setTargetEnterpriseId("user99");
            log.setDetails("Role changed to REVIEWER");
            log.setTimestamp(ts);

            assertThat(log.getId()).isEqualTo(10L);
            assertThat(log.getActorEnterpriseId()).isEqualTo("admin");
            assertThat(log.getAction()).isEqualTo("ROLE_CHANGED");
            assertThat(log.getTargetEnterpriseId()).isEqualTo("user99");
            assertThat(log.getDetails()).isEqualTo("Role changed to REVIEWER");
            assertThat(log.getTimestamp()).isEqualTo(ts);
        }

        @Test
        @DisplayName("all-args constructor sets every field")
        void allArgsConstructor_setsEveryField() {
            LocalDateTime ts = LocalDateTime.of(2024, 3, 10, 14, 45);
            AuditLog log = new AuditLog(5L, "admin", "USER_APPROVED", "target789", "Approved", ts);

            assertThat(log.getId()).isEqualTo(5L);
            assertThat(log.getActorEnterpriseId()).isEqualTo("admin");
            assertThat(log.getAction()).isEqualTo("USER_APPROVED");
            assertThat(log.getTargetEnterpriseId()).isEqualTo("target789");
            assertThat(log.getDetails()).isEqualTo("Approved");
            assertThat(log.getTimestamp()).isEqualTo(ts);
        }

        @Test
        @DisplayName("nullable fields can be null")
        void nullableFields_canBeNull() {
            AuditLog log = AuditLog.builder()
                    .actorEnterpriseId("actor")
                    .action("USER_REJECTED")
                    .build();

            assertThat(log.getTargetEnterpriseId()).isNull();
            assertThat(log.getDetails()).isNull();
            assertThat(log.getTimestamp()).isNull();
        }

        @Test
        @DisplayName("equals and hashCode are value-based")
        void equalsAndHashCode_areValueBased() {
            LocalDateTime ts = LocalDateTime.of(2024, 5, 1, 12, 0);
            AuditLog a = AuditLog.builder().id(1L).actorEnterpriseId("a").action("ACT").timestamp(ts).build();
            AuditLog b = AuditLog.builder().id(1L).actorEnterpriseId("a").action("ACT").timestamp(ts).build();

            assertThat(a).isEqualTo(b);
            assertThat(a.hashCode()).isEqualTo(b.hashCode());
        }

        @Test
        @DisplayName("different ids produce unequal instances")
        void differentIds_produceUnequalInstances() {
            AuditLog a = AuditLog.builder().id(1L).actorEnterpriseId("actor").action("ACT").build();
            AuditLog b = AuditLog.builder().id(2L).actorEnterpriseId("actor").action("ACT").build();

            assertThat(a).isNotEqualTo(b);
        }

        @Test
        @DisplayName("toString contains actorEnterpriseId and action")
        void toString_containsKeyFields() {
            AuditLog log = AuditLog.builder()
                    .id(7L)
                    .actorEnterpriseId("actorXYZ")
                    .action("USER_ADDED_BY_ADMIN")
                    .build();

            assertThat(log.toString()).contains("actorXYZ", "USER_ADDED_BY_ADMIN");
        }

        @Test
        @DisplayName("mutating action via setter is reflected in getter")
        void setter_mutatesAction() {
            AuditLog log = AuditLog.builder().actorEnterpriseId("x").action("ORIGINAL").build();
            log.setAction("UPDATED");

            assertThat(log.getAction()).isEqualTo("UPDATED");
        }
    }

    // =========================================================
    // McqComment
    // =========================================================

    @Nested
    @DisplayName("McqComment")
    class McqCommentTests {

        @Test
        @DisplayName("builder sets all fields")
        void builder_setsAllFields() {
            LocalDateTime created = LocalDateTime.of(2024, 7, 20, 9, 0);
            McqComment comment = McqComment.builder()
                    .id(1L)
                    .mcqId(100L)
                    .authorEnterpriseId("author001")
                    .authorName("John Doe")
                    .content("This is a comment")
                    .parentId(null)
                    .createdAt(created)
                    .build();

            assertThat(comment.getId()).isEqualTo(1L);
            assertThat(comment.getMcqId()).isEqualTo(100L);
            assertThat(comment.getAuthorEnterpriseId()).isEqualTo("author001");
            assertThat(comment.getAuthorName()).isEqualTo("John Doe");
            assertThat(comment.getContent()).isEqualTo("This is a comment");
            assertThat(comment.getParentId()).isNull();
            assertThat(comment.getCreatedAt()).isEqualTo(created);
        }

        @Test
        @DisplayName("no-args constructor + setters round-trip")
        void noArgsConstructor_settersRoundTrip() {
            McqComment comment = new McqComment();
            comment.setId(2L);
            comment.setMcqId(200L);
            comment.setAuthorEnterpriseId("author002");
            comment.setAuthorName("Jane Smith");
            comment.setContent("Another comment");
            comment.setParentId(1L);

            assertThat(comment.getId()).isEqualTo(2L);
            assertThat(comment.getMcqId()).isEqualTo(200L);
            assertThat(comment.getAuthorEnterpriseId()).isEqualTo("author002");
            assertThat(comment.getAuthorName()).isEqualTo("Jane Smith");
            assertThat(comment.getContent()).isEqualTo("Another comment");
            assertThat(comment.getParentId()).isEqualTo(1L);
        }

        @Test
        @DisplayName("all-args constructor sets every field")
        void allArgsConstructor_setsEveryField() {
            LocalDateTime ts = LocalDateTime.of(2024, 9, 1, 11, 0);
            McqComment comment = new McqComment(5L, 50L, "eid", "Name", "content", 2L, ts);

            assertThat(comment.getId()).isEqualTo(5L);
            assertThat(comment.getMcqId()).isEqualTo(50L);
            assertThat(comment.getAuthorEnterpriseId()).isEqualTo("eid");
            assertThat(comment.getAuthorName()).isEqualTo("Name");
            assertThat(comment.getContent()).isEqualTo("content");
            assertThat(comment.getParentId()).isEqualTo(2L);
            assertThat(comment.getCreatedAt()).isEqualTo(ts);
        }

        @Test
        @DisplayName("top-level comment has null parentId")
        void topLevelComment_hasNullParentId() {
            McqComment topLevel = McqComment.builder()
                    .mcqId(50L)
                    .authorEnterpriseId("commenter")
                    .content("Top-level comment")
                    .build();

            assertThat(topLevel.getParentId()).isNull();
        }

        @Test
        @DisplayName("reply comment has non-null parentId")
        void replyComment_hasNonNullParentId() {
            McqComment reply = McqComment.builder()
                    .mcqId(50L)
                    .authorEnterpriseId("replier")
                    .content("This is a reply")
                    .parentId(10L)
                    .build();

            assertThat(reply.getParentId()).isEqualTo(10L);
        }

        @Test
        @DisplayName("equals and hashCode are value-based")
        void equalsAndHashCode_areValueBased() {
            LocalDateTime ts = LocalDateTime.of(2024, 8, 1, 10, 0);
            McqComment c1 = McqComment.builder().id(1L).mcqId(10L).authorEnterpriseId("a").content("text").createdAt(ts).build();
            McqComment c2 = McqComment.builder().id(1L).mcqId(10L).authorEnterpriseId("a").content("text").createdAt(ts).build();

            assertThat(c1).isEqualTo(c2);
            assertThat(c1.hashCode()).isEqualTo(c2.hashCode());
        }

        @Test
        @DisplayName("toString contains content and authorEnterpriseId")
        void toString_containsKeyFields() {
            McqComment comment = McqComment.builder()
                    .id(3L)
                    .mcqId(300L)
                    .authorEnterpriseId("user003")
                    .content("Interesting question")
                    .build();

            assertThat(comment.toString()).contains("Interesting question", "user003");
        }

        @Test
        @DisplayName("different mcqId yields unequal instances")
        void differentMcqId_yieldsUnequalInstances() {
            McqComment c1 = McqComment.builder().id(1L).mcqId(10L).authorEnterpriseId("a").content("x").build();
            McqComment c2 = McqComment.builder().id(1L).mcqId(99L).authorEnterpriseId("a").content("x").build();

            assertThat(c1).isNotEqualTo(c2);
        }
    }

    // =========================================================
    // ReviewComment
    // =========================================================

    @Nested
    @DisplayName("ReviewComment")
    class ReviewCommentTests {

        @Test
        @DisplayName("builder sets all fields")
        void builder_setsAllFields() {
            LocalDateTime created = LocalDateTime.of(2024, 6, 15, 14, 30);
            Mcq mcq = new Mcq();
            User reviewer = new User();

            ReviewComment rc = ReviewComment.builder()
                    .id(1L)
                    .mcq(mcq)
                    .reviewer(reviewer)
                    .comment("Needs improvement")
                    .createdAt(created)
                    .build();

            assertThat(rc.getId()).isEqualTo(1L);
            assertThat(rc.getMcq()).isSameAs(mcq);
            assertThat(rc.getReviewer()).isSameAs(reviewer);
            assertThat(rc.getComment()).isEqualTo("Needs improvement");
            assertThat(rc.getCreatedAt()).isEqualTo(created);
        }

        @Test
        @DisplayName("no-args constructor + setters round-trip")
        void noArgsConstructor_settersRoundTrip() {
            Mcq mcq = new Mcq();
            User reviewer = new User();
            LocalDateTime ts = LocalDateTime.of(2024, 4, 5, 10, 0);

            ReviewComment rc = new ReviewComment();
            rc.setId(2L);
            rc.setMcq(mcq);
            rc.setReviewer(reviewer);
            rc.setComment("Great question");
            rc.setCreatedAt(ts);

            assertThat(rc.getId()).isEqualTo(2L);
            assertThat(rc.getMcq()).isSameAs(mcq);
            assertThat(rc.getReviewer()).isSameAs(reviewer);
            assertThat(rc.getComment()).isEqualTo("Great question");
            assertThat(rc.getCreatedAt()).isEqualTo(ts);
        }

        @Test
        @DisplayName("all-args constructor sets every field")
        void allArgsConstructor_setsEveryField() {
            Mcq mcq = new Mcq();
            User user = new User();
            LocalDateTime ts = LocalDateTime.of(2024, 11, 1, 9, 0);
            ReviewComment rc = new ReviewComment(10L, mcq, user, "Detailed review", ts);

            assertThat(rc.getId()).isEqualTo(10L);
            assertThat(rc.getMcq()).isSameAs(mcq);
            assertThat(rc.getReviewer()).isSameAs(user);
            assertThat(rc.getComment()).isEqualTo("Detailed review");
            assertThat(rc.getCreatedAt()).isEqualTo(ts);
        }

        @Test
        @DisplayName("null mcq and reviewer are allowed by builder")
        void nullMcqAndReviewer_areAllowed() {
            ReviewComment rc = ReviewComment.builder()
                    .comment("Some comment")
                    .build();

            assertThat(rc.getMcq()).isNull();
            assertThat(rc.getReviewer()).isNull();
            assertThat(rc.getComment()).isEqualTo("Some comment");
        }

        @Test
        @DisplayName("equals and hashCode are value-based (no associations)")
        void equalsAndHashCode_areValueBased() {
            LocalDateTime ts = LocalDateTime.of(2024, 10, 5, 8, 0);
            ReviewComment rc1 = ReviewComment.builder().id(1L).comment("comment").createdAt(ts).build();
            ReviewComment rc2 = ReviewComment.builder().id(1L).comment("comment").createdAt(ts).build();

            assertThat(rc1).isEqualTo(rc2);
            assertThat(rc1.hashCode()).isEqualTo(rc2.hashCode());
        }

        @Test
        @DisplayName("different ids yield unequal instances")
        void differentIds_yieldUnequalInstances() {
            ReviewComment rc1 = ReviewComment.builder().id(1L).comment("text").build();
            ReviewComment rc2 = ReviewComment.builder().id(2L).comment("text").build();

            assertThat(rc1).isNotEqualTo(rc2);
        }

        @Test
        @DisplayName("toString contains comment text")
        void toString_containsCommentText() {
            ReviewComment rc = ReviewComment.builder()
                    .id(3L)
                    .comment("Well structured")
                    .build();

            assertThat(rc.toString()).contains("Well structured");
        }

        @Test
        @DisplayName("mutating comment via setter is reflected")
        void setter_mutatesComment() {
            ReviewComment rc = ReviewComment.builder().comment("original").build();
            rc.setComment("updated");

            assertThat(rc.getComment()).isEqualTo("updated");
        }
    }

    // =========================================================
    // TechStack
    // =========================================================

    @Nested
    @DisplayName("TechStack")
    class TechStackTests {

        @Test
        @DisplayName("builder sets id and name")
        void builder_setsIdAndName() {
            TechStack ts = TechStack.builder()
                    .id(1L)
                    .name("Java")
                    .build();

            assertThat(ts.getId()).isEqualTo(1L);
            assertThat(ts.getName()).isEqualTo("Java");
        }

        @Test
        @DisplayName("builder sets topics list")
        void builder_setsTopicsList() {
            Topic t1 = Topic.builder().id(1L).name("Spring Boot").build();
            Topic t2 = Topic.builder().id(2L).name("Hibernate").build();

            TechStack ts = TechStack.builder()
                    .id(1L)
                    .name("Java")
                    .topics(Arrays.asList(t1, t2))
                    .build();

            assertThat(ts.getTopics()).hasSize(2).containsExactly(t1, t2);
        }

        @Test
        @DisplayName("no-args constructor + setters round-trip")
        void noArgsConstructor_settersRoundTrip() {
            TechStack ts = new TechStack();
            ts.setId(2L);
            ts.setName("Python");
            ts.setTopics(Collections.emptyList());

            assertThat(ts.getId()).isEqualTo(2L);
            assertThat(ts.getName()).isEqualTo("Python");
            assertThat(ts.getTopics()).isEmpty();
        }

        @Test
        @DisplayName("all-args constructor sets every field")
        void allArgsConstructor_setsEveryField() {
            List<Topic> topics = Collections.singletonList(Topic.builder().name("Angular").build());
            TechStack ts = new TechStack(5L, "Frontend", topics);

            assertThat(ts.getId()).isEqualTo(5L);
            assertThat(ts.getName()).isEqualTo("Frontend");
            assertThat(ts.getTopics()).hasSize(1);
        }

        @Test
        @DisplayName("topics defaults to null when not set via builder")
        void topicsDefaultsToNull_whenNotSetViaBuilder() {
            TechStack ts = TechStack.builder().id(3L).name("JavaScript").build();

            assertThat(ts.getTopics()).isNull();
        }

        @Test
        @DisplayName("equals and hashCode are value-based (no topics)")
        void equalsAndHashCode_areValueBased() {
            TechStack ts1 = TechStack.builder().id(1L).name("Java").build();
            TechStack ts2 = TechStack.builder().id(1L).name("Java").build();

            assertThat(ts1).isEqualTo(ts2);
            assertThat(ts1.hashCode()).isEqualTo(ts2.hashCode());
        }

        @Test
        @DisplayName("different names yield unequal instances")
        void differentNames_yieldUnequalInstances() {
            TechStack ts1 = TechStack.builder().id(1L).name("Java").build();
            TechStack ts2 = TechStack.builder().id(1L).name("Python").build();

            assertThat(ts1).isNotEqualTo(ts2);
        }

        @Test
        @DisplayName("toString contains name")
        void toString_containsName() {
            TechStack ts = TechStack.builder().id(4L).name("React").build();

            assertThat(ts.toString()).contains("React");
        }
    }

    // =========================================================
    // Topic
    // =========================================================

    @Nested
    @DisplayName("Topic")
    class TopicTests {

        @Test
        @DisplayName("builder sets all fields")
        void builder_setsAllFields() {
            TechStack stack = TechStack.builder().id(1L).name("Java").build();
            Topic topic = Topic.builder()
                    .id(1L)
                    .name("Spring Boot")
                    .techStack(stack)
                    .build();

            assertThat(topic.getId()).isEqualTo(1L);
            assertThat(topic.getName()).isEqualTo("Spring Boot");
            assertThat(topic.getTechStack()).isSameAs(stack);
        }

        @Test
        @DisplayName("no-args constructor + setters round-trip")
        void noArgsConstructor_settersRoundTrip() {
            TechStack stack = new TechStack();
            stack.setName("Python");

            Topic topic = new Topic();
            topic.setId(2L);
            topic.setName("Django");
            topic.setTechStack(stack);

            assertThat(topic.getId()).isEqualTo(2L);
            assertThat(topic.getName()).isEqualTo("Django");
            assertThat(topic.getTechStack().getName()).isEqualTo("Python");
        }

        @Test
        @DisplayName("all-args constructor sets every field")
        void allArgsConstructor_setsEveryField() {
            TechStack stack = TechStack.builder().id(2L).name("Node.js").build();
            Topic topic = new Topic(10L, "Express", stack);

            assertThat(topic.getId()).isEqualTo(10L);
            assertThat(topic.getName()).isEqualTo("Express");
            assertThat(topic.getTechStack()).isSameAs(stack);
        }

        @Test
        @DisplayName("techStack can be null when not set")
        void techStack_canBeNull() {
            Topic topic = Topic.builder().id(3L).name("Standalone Topic").build();

            assertThat(topic.getTechStack()).isNull();
        }

        @Test
        @DisplayName("equals and hashCode are value-based (no techStack)")
        void equalsAndHashCode_areValueBased() {
            Topic t1 = Topic.builder().id(1L).name("JPA").build();
            Topic t2 = Topic.builder().id(1L).name("JPA").build();

            assertThat(t1).isEqualTo(t2);
            assertThat(t1.hashCode()).isEqualTo(t2.hashCode());
        }

        @Test
        @DisplayName("different names yield unequal instances")
        void differentNames_yieldUnequalInstances() {
            Topic t1 = Topic.builder().id(1L).name("Spring").build();
            Topic t2 = Topic.builder().id(1L).name("Quarkus").build();

            assertThat(t1).isNotEqualTo(t2);
        }

        @Test
        @DisplayName("toString contains name")
        void toString_containsName() {
            Topic topic = Topic.builder().id(5L).name("Microservices").build();

            assertThat(topic.toString()).contains("Microservices");
        }

        @Test
        @DisplayName("mutating name via setter is reflected")
        void setter_mutatesName() {
            Topic topic = Topic.builder().id(6L).name("OldName").build();
            topic.setName("NewName");

            assertThat(topic.getName()).isEqualTo("NewName");
        }
    }

    // =========================================================
    // PasswordResetToken
    // =========================================================

    @Nested
    @DisplayName("PasswordResetToken")
    class PasswordResetTokenTests {

        @Test
        @DisplayName("builder sets all fields")
        void builder_setsAllFields() {
            User user = new User();
            LocalDateTime expires = LocalDateTime.of(2024, 12, 1, 0, 0);

            PasswordResetToken prt = PasswordResetToken.builder()
                    .id(1L)
                    .token("abc123token")
                    .user(user)
                    .expiresAt(expires)
                    .used(true)
                    .build();

            assertThat(prt.getId()).isEqualTo(1L);
            assertThat(prt.getToken()).isEqualTo("abc123token");
            assertThat(prt.getUser()).isSameAs(user);
            assertThat(prt.getExpiresAt()).isEqualTo(expires);
            assertThat(prt.isUsed()).isTrue();
        }

        @Test
        @DisplayName("@Builder.Default: used is false when not specified")
        void builderDefault_usedIsFalse() {
            PasswordResetToken prt = PasswordResetToken.builder()
                    .token("token999")
                    .expiresAt(LocalDateTime.now().plusHours(1))
                    .build();

            assertThat(prt.isUsed()).isFalse();
        }

        @Test
        @DisplayName("no-args constructor + setters round-trip")
        void noArgsConstructor_settersRoundTrip() {
            User user = new User();
            LocalDateTime expires = LocalDateTime.of(2024, 11, 30, 23, 59);

            PasswordResetToken prt = new PasswordResetToken();
            prt.setId(3L);
            prt.setToken("reset-token-xyz");
            prt.setUser(user);
            prt.setExpiresAt(expires);
            prt.setUsed(false);

            assertThat(prt.getId()).isEqualTo(3L);
            assertThat(prt.getToken()).isEqualTo("reset-token-xyz");
            assertThat(prt.getUser()).isSameAs(user);
            assertThat(prt.getExpiresAt()).isEqualTo(expires);
            assertThat(prt.isUsed()).isFalse();
        }

        @Test
        @DisplayName("all-args constructor sets every field")
        void allArgsConstructor_setsEveryField() {
            User user = new User();
            LocalDateTime expires = LocalDateTime.of(2025, 3, 15, 12, 0);
            PasswordResetToken prt = new PasswordResetToken(7L, "tok-all-args", user, expires, true);

            assertThat(prt.getId()).isEqualTo(7L);
            assertThat(prt.getToken()).isEqualTo("tok-all-args");
            assertThat(prt.getUser()).isSameAs(user);
            assertThat(prt.getExpiresAt()).isEqualTo(expires);
            assertThat(prt.isUsed()).isTrue();
        }

        @Test
        @DisplayName("setUsed(true) marks token as consumed")
        void setUsed_marksTokenAsConsumed() {
            PasswordResetToken prt = PasswordResetToken.builder()
                    .token("use-me")
                    .expiresAt(LocalDateTime.now().plusHours(1))
                    .build();

            assertThat(prt.isUsed()).isFalse();
            prt.setUsed(true);
            assertThat(prt.isUsed()).isTrue();
        }

        @Test
        @DisplayName("expiresAt in the past represents an expired token")
        void expiresAt_inPastRepresentsExpiredToken() {
            LocalDateTime pastTime = LocalDateTime.of(2020, 1, 1, 0, 0);
            PasswordResetToken prt = PasswordResetToken.builder()
                    .token("old-token")
                    .expiresAt(pastTime)
                    .build();

            assertThat(prt.getExpiresAt()).isBefore(LocalDateTime.now());
        }

        @Test
        @DisplayName("equals and hashCode are value-based")
        void equalsAndHashCode_areValueBased() {
            LocalDateTime expires = LocalDateTime.of(2025, 1, 1, 0, 0);
            PasswordResetToken p1 = PasswordResetToken.builder().id(1L).token("tok").expiresAt(expires).used(false).build();
            PasswordResetToken p2 = PasswordResetToken.builder().id(1L).token("tok").expiresAt(expires).used(false).build();

            assertThat(p1).isEqualTo(p2);
            assertThat(p1.hashCode()).isEqualTo(p2.hashCode());
        }

        @Test
        @DisplayName("toString contains token value")
        void toString_containsTokenValue() {
            PasswordResetToken prt = PasswordResetToken.builder()
                    .id(9L)
                    .token("my-reset-token")
                    .expiresAt(LocalDateTime.now().plusHours(24))
                    .build();

            assertThat(prt.toString()).contains("my-reset-token");
        }
    }
}
