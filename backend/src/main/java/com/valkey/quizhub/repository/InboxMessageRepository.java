package com.valkey.quizhub.repository;

import com.valkey.quizhub.entity.InboxMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface InboxMessageRepository extends JpaRepository<InboxMessage, Long> {

    List<InboxMessage> findByRecipientIdOrderBySentAtDesc(Long recipientId);

    List<InboxMessage> findBySenderIdOrderBySentAtDesc(Long senderId);

    long countByRecipientIdAndReadFalse(Long recipientId);

    List<InboxMessage> findByRecipientIdAndStarredTrueOrderBySentAtDesc(Long recipientId);

    @Modifying
    @Query("UPDATE InboxMessage m SET m.read = true WHERE m.recipient.id = :userId AND m.read = false")
    void markAllReadForUser(@Param("userId") Long userId);
}
