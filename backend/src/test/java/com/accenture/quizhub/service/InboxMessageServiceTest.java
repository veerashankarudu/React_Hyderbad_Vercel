package com.accenture.quizhub.service;

import com.accenture.quizhub.entity.InboxMessage;
import com.accenture.quizhub.entity.User;
import com.accenture.quizhub.enums.Role;
import com.accenture.quizhub.exception.ResourceNotFoundException;
import com.accenture.quizhub.repository.InboxMessageRepository;
import com.accenture.quizhub.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class InboxMessageServiceTest {

    @Mock InboxMessageRepository inboxRepository;
    @Mock UserRepository userRepository;
    @InjectMocks InboxMessageService inboxService;

    private User makeUser(Long id, String eid) {
        return User.builder()
                .id(id).enterpriseId(eid).fullName("User " + eid)
                .email(eid + "@test.com")
                .role(Role.SME).approved(true)
                .techStacks(new ArrayList<>())
                .build();
    }

    private InboxMessage makeMsg(Long id, User recipient, User sender) {
        return InboxMessage.builder()
                .id(id).recipient(recipient).sender(sender)
                .subject("Subject " + id).body("Body " + id)
                .messageType(sender == null ? "SYSTEM" : "USER")
                .read(false).starred(false)
                .sentAt(LocalDateTime.now())
                .build();
    }

    // ─── sendSystem ───────────────────────────────────────────────────────────

    @Test
    void sendSystem_savesMessageWithNullSender() {
        User recipient = makeUser(1L, "alice");
        InboxMessage saved = makeMsg(10L, recipient, null);
        when(inboxRepository.save(any())).thenReturn(saved);

        inboxService.sendSystem(recipient, "MCQ Approved", "Your MCQ was approved", 42L);

        ArgumentCaptor<InboxMessage> captor = ArgumentCaptor.forClass(InboxMessage.class);
        verify(inboxRepository).save(captor.capture());
        assertThat(captor.getValue().getSender()).isNull();
        assertThat(captor.getValue().getSubject()).isEqualTo("MCQ Approved");
        assertThat(captor.getValue().getMcqId()).isEqualTo(42L);
        assertThat(captor.getValue().getMessageType()).isEqualTo("SYSTEM");
    }

    // ─── send ─────────────────────────────────────────────────────────────────

    @Test
    void send_validRecipient_savesAndReturnsMapped() {
        User sender = makeUser(1L, "alice");
        User recipient = makeUser(2L, "bob");
        InboxMessage saved = makeMsg(10L, recipient, sender);
        when(userRepository.findByEnterpriseId("bob")).thenReturn(Optional.of(recipient));
        when(inboxRepository.save(any())).thenReturn(saved);

        Map<String, Object> result = inboxService.send(sender, "bob", "Hello", "Hi Bob");

        assertThat(result.get("id")).isEqualTo(10L);
        assertThat(result.get("subject")).isEqualTo("Subject 10");
    }

    @Test
    void send_recipientNotFound_throwsResourceNotFoundException() {
        User sender = makeUser(1L, "alice");
        when(userRepository.findByEnterpriseId("unknown")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> inboxService.send(sender, "unknown", "Hello", "Hi"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ─── getInbox ────────────────────────────────────────────────────────────

    @Test
    void getInbox_returnsMessagesForRecipient() {
        User alice = makeUser(1L, "alice");
        User bob = makeUser(2L, "bob");
        InboxMessage msg = makeMsg(10L, alice, bob);
        when(inboxRepository.findByRecipientIdOrderBySentAtDesc(1L)).thenReturn(List.of(msg));

        List<Map<String, Object>> result = inboxService.getInbox(alice);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).get("id")).isEqualTo(10L);
    }

    // ─── getSent ─────────────────────────────────────────────────────────────

    @Test
    void getSent_returnsSentMessages() {
        User alice = makeUser(1L, "alice");
        User bob = makeUser(2L, "bob");
        InboxMessage msg = makeMsg(10L, bob, alice);
        when(inboxRepository.findBySenderIdOrderBySentAtDesc(1L)).thenReturn(List.of(msg));

        List<Map<String, Object>> result = inboxService.getSent(alice);

        assertThat(result).hasSize(1);
    }

    // ─── countUnread ─────────────────────────────────────────────────────────

    @Test
    void countUnread_returnsCount() {
        User alice = makeUser(1L, "alice");
        when(inboxRepository.countByRecipientIdAndReadFalse(1L)).thenReturn(3L);

        long count = inboxService.countUnread(alice);

        assertThat(count).isEqualTo(3L);
    }

    // ─── getStarred ──────────────────────────────────────────────────────────

    @Test
    void getStarred_returnsStarredMessages() {
        User alice = makeUser(1L, "alice");
        InboxMessage msg = makeMsg(10L, alice, makeUser(2L, "bob"));
        msg.setStarred(true);
        when(inboxRepository.findByRecipientIdAndStarredTrueOrderBySentAtDesc(1L)).thenReturn(List.of(msg));

        List<Map<String, Object>> result = inboxService.getStarred(alice);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).get("starred")).isEqualTo(true);
    }

    // ─── toggleStar ──────────────────────────────────────────────────────────

    @Test
    void toggleStar_ownMessage_flipsStarred() {
        User alice = makeUser(1L, "alice");
        InboxMessage msg = makeMsg(10L, alice, makeUser(2L, "bob"));
        msg.setStarred(false);
        when(inboxRepository.findById(10L)).thenReturn(Optional.of(msg));
        when(inboxRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> result = inboxService.toggleStar(10L, alice);

        assertThat(result.get("starred")).isEqualTo(true);
    }

    @Test
    void toggleStar_notOwnMessage_doesNotChange() {
        User alice = makeUser(1L, "alice");
        User bob = makeUser(2L, "bob");
        InboxMessage msg = makeMsg(10L, bob, alice); // bob is recipient, not alice
        msg.setStarred(false);
        when(inboxRepository.findById(10L)).thenReturn(Optional.of(msg));

        Map<String, Object> result = inboxService.toggleStar(10L, alice);

        assertThat(result.get("starred")).isEqualTo(false);
        verify(inboxRepository, never()).save(any());
    }

    // ─── markRead ────────────────────────────────────────────────────────────

    @Test
    void markRead_ownMessage_setsReadTrue() {
        User alice = makeUser(1L, "alice");
        InboxMessage msg = makeMsg(10L, alice, makeUser(2L, "bob"));
        msg.setRead(false);
        when(inboxRepository.findById(10L)).thenReturn(Optional.of(msg));
        when(inboxRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        inboxService.markRead(10L, alice);

        assertThat(msg.isRead()).isTrue();
        verify(inboxRepository).save(msg);
    }

    @Test
    void markRead_notOwnMessage_doesNotSave() {
        User alice = makeUser(1L, "alice");
        User bob = makeUser(2L, "bob");
        InboxMessage msg = makeMsg(10L, bob, alice); // bob is recipient
        msg.setRead(false);
        when(inboxRepository.findById(10L)).thenReturn(Optional.of(msg));

        inboxService.markRead(10L, alice);

        verify(inboxRepository, never()).save(any());
    }

    // ─── markAllRead ─────────────────────────────────────────────────────────

    @Test
    void markAllRead_callsRepositoryBulkUpdate() {
        User alice = makeUser(1L, "alice");

        inboxService.markAllRead(alice);

        verify(inboxRepository).markAllReadForUser(1L);
    }

    // ─── delete ──────────────────────────────────────────────────────────────

    @Test
    void delete_asRecipient_deletesMessage() {
        User alice = makeUser(1L, "alice");
        InboxMessage msg = makeMsg(10L, alice, makeUser(2L, "bob"));
        when(inboxRepository.findById(10L)).thenReturn(Optional.of(msg));

        inboxService.delete(10L, alice);

        verify(inboxRepository).delete(msg);
    }

    @Test
    void delete_asSender_deletesMessage() {
        User alice = makeUser(1L, "alice");
        User bob = makeUser(2L, "bob");
        InboxMessage msg = makeMsg(10L, bob, alice); // alice is sender
        when(inboxRepository.findById(10L)).thenReturn(Optional.of(msg));

        inboxService.delete(10L, alice);

        verify(inboxRepository).delete(msg);
    }

    @Test
    void delete_neitherSenderNorRecipient_doesNotDelete() {
        User alice = makeUser(1L, "alice");
        User bob = makeUser(2L, "bob");
        User charlie = makeUser(3L, "charlie");
        InboxMessage msg = makeMsg(10L, bob, charlie); // neither
        when(inboxRepository.findById(10L)).thenReturn(Optional.of(msg));

        inboxService.delete(10L, alice);

        verify(inboxRepository, never()).delete(any(InboxMessage.class));
    }

    @Test
    void delete_messageNotFound_throwsException() {
        when(inboxRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> inboxService.delete(99L, makeUser(1L, "alice")))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
