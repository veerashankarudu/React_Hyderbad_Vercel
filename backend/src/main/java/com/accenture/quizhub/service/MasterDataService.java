package com.accenture.quizhub.service;

import com.accenture.quizhub.entity.TechStack;
import com.accenture.quizhub.entity.Topic;
import com.accenture.quizhub.entity.User;
import com.accenture.quizhub.exception.BadRequestException;
import com.accenture.quizhub.exception.ResourceNotFoundException;
import com.accenture.quizhub.repository.TechStackRepository;
import com.accenture.quizhub.repository.TopicRepository;
import com.accenture.quizhub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MasterDataService {

    private final TechStackRepository techStackRepository;
    private final TopicRepository topicRepository;
    private final UserRepository userRepository;

    @Cacheable("techStacks")
    public List<TechStack> getAllTechStacks() {
        return techStackRepository.findAll();
    }

    public List<Topic> getAllTopics() {
        return topicRepository.findAll();
    }

    @Cacheable(value = "topics", key = "#techStackId")
    public List<Topic> getTopicsByTechStack(Long techStackId) {
        return topicRepository.findByTechStackId(techStackId);
    }

    public List<User> getEligibleReviewers(Long mcqId, Long creatorId) {
        return userRepository.findAll().stream()
                .filter(u -> !u.getId().equals(creatorId))
                .toList();
    }

    // ─── Tech Stack CRUD ──────────────────────────────────────────────────────

    @Transactional
    @CacheEvict(value = "techStacks", allEntries = true)
    public TechStack createTechStack(String name) {
        if (name == null || name.isBlank()) throw new BadRequestException("Tech stack name is required");
        if (techStackRepository.findByNameIgnoreCase(name.trim()).isPresent())
            throw new BadRequestException("Tech stack '" + name.trim() + "' already exists");
        TechStack ts = new TechStack();
        ts.setName(name.trim());
        return techStackRepository.save(ts);
    }

    @Transactional
    @CacheEvict(value = "techStacks", allEntries = true)
    public TechStack updateTechStack(Long id, String name) {
        TechStack ts = techStackRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tech stack not found"));
        if (name == null || name.isBlank()) throw new BadRequestException("Name is required");
        ts.setName(name.trim());
        return techStackRepository.save(ts);
    }

    @Transactional
    @CacheEvict(value = "techStacks", allEntries = true)
    public void deleteTechStack(Long id) {
        if (!techStackRepository.existsById(id))
            throw new ResourceNotFoundException("Tech stack not found");
        techStackRepository.deleteById(id);
    }

    // ─── Topic CRUD ───────────────────────────────────────────────────────────

    @Transactional
    @CacheEvict(value = "topics", key = "#techStackId")
    public Topic createTopic(Long techStackId, String name) {
        TechStack ts = techStackRepository.findById(techStackId)
                .orElseThrow(() -> new ResourceNotFoundException("Tech stack not found"));
        if (name == null || name.isBlank()) throw new BadRequestException("Topic name is required");
        Topic topic = new Topic();
        topic.setName(name.trim());
        topic.setTechStack(ts);
        return topicRepository.save(topic);
    }

    @Transactional
    @CacheEvict(value = "topics", allEntries = true)
    public Topic updateTopic(Long topicId, String name) {
        Topic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new ResourceNotFoundException("Topic not found"));
        if (name == null || name.isBlank()) throw new BadRequestException("Name is required");
        topic.setName(name.trim());
        return topicRepository.save(topic);
    }

    @Transactional
    @CacheEvict(value = "topics", allEntries = true)
    public void deleteTopic(Long topicId) {
        if (!topicRepository.existsById(topicId))
            throw new ResourceNotFoundException("Topic not found");
        topicRepository.deleteById(topicId);
    }

    // ─── SME ↔ TechStack mapping ──────────────────────────────────────────────

    public List<User> getAllSmes() {
        return userRepository.findByRole(com.accenture.quizhub.enums.Role.SME);
    }

    public List<User> getSmesByTechStack(Long techStackId) {
        if (!techStackRepository.existsById(techStackId))
            throw new ResourceNotFoundException("Tech stack not found");
        return userRepository.findByTechStacksId(techStackId);
    }

    @Transactional
    public void addSmeToTechStack(Long techStackId, Long userId) {
        TechStack ts = techStackRepository.findById(techStackId)
                .orElseThrow(() -> new ResourceNotFoundException("Tech stack not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (user.getTechStacks() == null) {
            user.setTechStacks(new java.util.ArrayList<>());
        }
        boolean alreadyMapped = user.getTechStacks().stream()
                .anyMatch(t -> t.getId().equals(techStackId));
        if (!alreadyMapped) {
            user.getTechStacks().add(ts);
            userRepository.save(user);
        }
    }

    @Transactional
    public void removeSmeFromTechStack(Long techStackId, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (user.getTechStacks() != null) {
            user.getTechStacks().removeIf(t -> t.getId().equals(techStackId));
            userRepository.save(user);
        }
    }
}
