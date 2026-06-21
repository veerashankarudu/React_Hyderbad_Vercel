package com.valkey.quizhub.service;

import com.valkey.quizhub.entity.Notification;
import com.valkey.quizhub.entity.User;
import com.valkey.quizhub.enums.Role;
import com.valkey.quizhub.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock private NotificationRepository notificationRepository;
    @InjectMocks private NotificationService notificationService;

    private User recipient;
    private User actor;

    @BeforeEach
    void setUp() {
        recipient = User.builder().id(1L).enterpriseId("rec").fullName("Recipient User").role(Role.SME).build();
        actor     = User.builder().id(2L).enterpriseId("act").fullName("Actor Name").role(Role.ADMIN).build();
    }

    // ─── notify ───────────────────────────────────────────────────────────────

    @Test
    void notify_withActor_savesNotificationWithActorInfo() {
        notificationService.notify(recipient, "Test msg", "REVIEW", 10L, actor, "Q-001");
        ArgumentCaptor<Notification> cap = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(cap.capture());
        Notification saved = cap.getValue();
        assertEquals("Test msg", saved.getMessage());
        assertEquals("Actor Name", saved.getActorName());
        assertEquals("AN", saved.getActorInitials());
        assertEquals("Q-001", saved.getMcqRef());
        assertEquals(10L, saved.getMcqId());
    }

    @Test
    void notify_withoutActor_usesSystemDefaults() {
        notificationService.notify(recipient, "System msg", "INFO", 5L);
        ArgumentCaptor<Notification> cap = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(cap.capture());
        Notification saved = cap.getValue();
        assertEquals("System", saved.getActorName());
        assertEquals("SY", saved.getActorInitials());
    }

    @Test
    void notify_setsRecipient() {
        notificationService.notify(recipient, "msg", "TYPE", null, actor, null);
        ArgumentCaptor<Notification> cap = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(cap.capture());
        assertEquals(recipient, cap.getValue().getUser());
    }

    @Test
    void notify_setsType() {
        notificationService.notify(recipient, "msg", "APPROVED", 1L, actor, "Q-001");
        ArgumentCaptor<Notification> cap = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(cap.capture());
        assertEquals("APPROVED", cap.getValue().getType());
    }

    @Test
    void notify_singleNameActor_buildsInitialsFromFirstTwoChars() {
        User singleName = User.builder().id(3L).fullName("Alice").role(Role.SME).build();
        notificationService.notify(recipient, "msg", "T", 1L, singleName, null);
        ArgumentCaptor<Notification> cap = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(cap.capture());
        assertEquals("AL", cap.getValue().getActorInitials());
    }

    // ─── getRecent ────────────────────────────────────────────────────────────

    @Test
    void getRecent_returnsFilteredByDate() {
        Notification recent = Notification.builder().id(1L).user(recipient)
                .message("recent").type("REVIEW").createdAt(LocalDateTime.now().minusDays(1)).build();
        Notification old = Notification.builder().id(2L).user(recipient)
                .message("old").type("REVIEW").createdAt(LocalDateTime.now().minusDays(40)).build();
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(1L))
                .thenReturn(Arrays.asList(recent, old));

        List<Map<String, Object>> result = notificationService.getRecent(recipient, null);
        assertEquals(1, result.size());
        assertEquals("recent", result.get(0).get("message"));
    }

    @Test
    void getRecent_filteredByType() {
        Notification n1 = Notification.builder().id(1L).user(recipient)
                .message("review msg").type("REVIEW").createdAt(LocalDateTime.now()).build();
        Notification n2 = Notification.builder().id(2L).user(recipient)
                .message("info msg").type("INFO").createdAt(LocalDateTime.now()).build();
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(1L))
                .thenReturn(Arrays.asList(n1, n2));

        List<Map<String, Object>> result = notificationService.getRecent(recipient, "REVIEW");
        assertEquals(1, result.size());
        assertEquals("review msg", result.get(0).get("message"));
    }

    @Test
    void getRecent_nullTypeReturnsAll() {
        Notification n1 = Notification.builder().id(1L).user(recipient)
                .message("msg1").type("REVIEW").createdAt(LocalDateTime.now()).build();
        Notification n2 = Notification.builder().id(2L).user(recipient)
                .message("msg2").type("INFO").createdAt(LocalDateTime.now()).build();
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(1L))
                .thenReturn(Arrays.asList(n1, n2));

        List<Map<String, Object>> result = notificationService.getRecent(recipient, null);
        assertEquals(2, result.size());
    }

    // ─── countUnread ─────────────────────────────────────────────────────────

    @Test
    void countUnread_returnsCountFromRepository() {
        when(notificationRepository.countByUserIdAndReadFalse(1L)).thenReturn(5L);
        assertEquals(5L, notificationService.countUnread(recipient));
    }

    @Test
    void countUnread_returnsZeroWhenNone() {
        when(notificationRepository.countByUserIdAndReadFalse(1L)).thenReturn(0L);
        assertEquals(0L, notificationService.countUnread(recipient));
    }

    // ─── markAllRead ─────────────────────────────────────────────────────────

    @Test
    void markAllRead_callsRepositoryMethod() {
        notificationService.markAllRead(recipient);
        verify(notificationRepository).markAllReadByUserId(1L);
    }

    // ─── markRead ─────────────────────────────────────────────────────────────

    @Test
    void markRead_matchingUser_setsReadTrue() {
        Notification n = Notification.builder().id(10L).user(recipient).read(false).build();
        when(notificationRepository.findById(10L)).thenReturn(Optional.of(n));
        notificationService.markRead(10L, recipient);
        assertTrue(n.isRead());
        verify(notificationRepository).save(n);
    }

    @Test
    void markRead_differentUser_doesNotSetRead() {
        User other = User.builder().id(99L).build();
        Notification n = Notification.builder().id(10L).user(other).read(false).build();
        when(notificationRepository.findById(10L)).thenReturn(Optional.of(n));
        notificationService.markRead(10L, recipient);
        assertFalse(n.isRead());
        verify(notificationRepository, never()).save(any());
    }

    @Test
    void markRead_notFound_doesNothing() {
        when(notificationRepository.findById(99L)).thenReturn(Optional.empty());
        assertDoesNotThrow(() -> notificationService.markRead(99L, recipient));
        verify(notificationRepository, never()).save(any());
    }
}
