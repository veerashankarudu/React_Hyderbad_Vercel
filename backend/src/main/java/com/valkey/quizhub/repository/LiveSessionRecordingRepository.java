package com.valkey.quizhub.repository;

import com.valkey.quizhub.entity.LiveSessionRecording;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LiveSessionRecordingRepository extends JpaRepository<LiveSessionRecording, Long> {

    List<LiveSessionRecording> findBySessionIdOrderBySequenceNumAsc(Long sessionId);

    int countBySessionId(Long sessionId);
}
