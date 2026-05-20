package com.accenture.quizhub.repository;

import com.accenture.quizhub.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findTop100ByOrderByCreatedAtDesc();

    List<ChatMessage> findByCreatedAtAfterOrderByCreatedAtAsc(LocalDateTime since);

    List<ChatMessage> findByPinnedTrue();
}
