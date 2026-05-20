package com.accenture.quizhub.repository;

import com.accenture.quizhub.entity.Topic;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface TopicRepository extends JpaRepository<Topic, Long> {
    List<Topic> findByTechStackId(Long techStackId);
    Optional<Topic> findByNameIgnoreCaseAndTechStackId(String name, Long techStackId);
}
