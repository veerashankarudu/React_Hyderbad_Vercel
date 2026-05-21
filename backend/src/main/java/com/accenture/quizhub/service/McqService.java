package com.accenture.quizhub.service;

import com.accenture.quizhub.dto.request.McqRequest;
import com.accenture.quizhub.dto.response.CommentResponse;
import com.accenture.quizhub.dto.response.McqResponse;
import com.accenture.quizhub.entity.*;
import com.accenture.quizhub.enums.McqStatus;
import com.accenture.quizhub.exception.BadRequestException;
import com.accenture.quizhub.exception.ResourceNotFoundException;
import com.accenture.quizhub.repository.*;
import lombok.RequiredArgsConstructor;
import java.util.Map;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class McqService {

    private final McqRepository mcqRepository;
    private final TechStackRepository techStackRepository;
    private final TopicRepository topicRepository;
    private final ReviewCommentRepository reviewCommentRepository;
    private final AIService aiService;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final McqVersionRepository mcqVersionRepository;

    @Transactional
    public McqResponse createMcq(McqRequest request, User creator) {
        TechStack techStack = techStackRepository.findById(request.getTechStackId())
                .orElseThrow(() -> new ResourceNotFoundException("Tech stack not found"));

        Topic topic = null;
        if (request.getTopicId() != null) {
            topic = topicRepository.findById(request.getTopicId())
                    .orElseThrow(() -> new ResourceNotFoundException("Topic not found"));
        }

        Mcq mcq = new Mcq();
        mcq.setQuestionStem(sanitize(request.getQuestionStem()));
        mcq.setOptionA(sanitize(request.getOptionA()));
        mcq.setOptionB(sanitize(request.getOptionB()));
        mcq.setOptionC(sanitize(request.getOptionC()));
        mcq.setOptionD(sanitize(request.getOptionD()));
        mcq.setCorrectAnswer(request.getCorrectAnswer().toUpperCase().substring(0, 1));
        mcq.setDifficulty(request.getDifficulty());
        mcq.setTechStack(techStack);
        mcq.setTopic(topic);
        mcq.setCreator(creator);
        mcq.setStatus(request.isSendForReview() ? McqStatus.READY_FOR_REVIEW : McqStatus.DRAFT);

        if (mcqRepository.existsByQuestionStemIgnoreCase(mcq.getQuestionStem())) {
            Long dupId = mcqRepository.findFirstByQuestionStemIgnoreCase(mcq.getQuestionStem())
                    .map(Mcq::getId).orElse(null);
            String msg = dupId != null
                    ? "DUPLICATE:" + dupId + ":Duplicate question — already exists in the database"
                    : "Duplicate question — already exists in the database";
            throw new BadRequestException(msg);
        }

        String aiWarning = null;
        try {
            aiService.enrichMcq(mcq);
        } catch (Exception e) {
            aiWarning = "AI service unavailable. MCQ saved without AI validation.";
        }

        Mcq saved = mcqRepository.save(mcq);
        McqResponse response = toResponse(saved);
        response.setAiWarning(aiWarning);
        return response;
    }

    @Transactional
    public McqResponse updateMcq(Long id, McqRequest request, User currentUser) {
        Mcq mcq = mcqRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MCQ not found with id: " + id));

        boolean isAdmin = currentUser.getRole().name().equals("ADMIN");
        boolean isCreator = mcq.getCreator().getId().equals(currentUser.getId());

        // Only creator can edit DRAFT; admin can edit any non-DRAFT
        if (!isCreator && !(isAdmin && mcq.getStatus() != McqStatus.DRAFT)) {
            throw new BadRequestException("You are not allowed to edit this MCQ");
        }

        // Only DRAFT or REJECTED MCQs can be edited
        if (mcq.getStatus() != McqStatus.DRAFT && mcq.getStatus() != McqStatus.REJECTED) {
            if (!isAdmin) {
                throw new BadRequestException("MCQ cannot be edited in status: " + mcq.getStatus());
            }
        }

        TechStack techStack = techStackRepository.findById(request.getTechStackId())
                .orElseThrow(() -> new ResourceNotFoundException("Tech stack not found"));

        Topic topic = null;
        if (request.getTopicId() != null) {
            topic = topicRepository.findById(request.getTopicId())
                    .orElseThrow(() -> new ResourceNotFoundException("Topic not found"));
        }

        mcq.setQuestionStem(sanitize(request.getQuestionStem()));
        mcq.setOptionA(sanitize(request.getOptionA()));
        mcq.setOptionB(sanitize(request.getOptionB()));
        mcq.setOptionC(sanitize(request.getOptionC()));
        mcq.setOptionD(sanitize(request.getOptionD()));
        mcq.setCorrectAnswer(request.getCorrectAnswer().toUpperCase().substring(0, 1));
        mcq.setDifficulty(request.getDifficulty());
        mcq.setTechStack(techStack);
        mcq.setTopic(topic);

        if (request.isSendForReview() && mcq.getStatus() == McqStatus.DRAFT) {
            mcq.setStatus(McqStatus.READY_FOR_REVIEW);
        } else if (request.isSendForReview() && mcq.getStatus() == McqStatus.REJECTED) {
            // After rejection, creator can resubmit
            mcq.setStatus(McqStatus.READY_FOR_REVIEW);
        }

        // Snapshot before saving
        snapshotVersion(mcq, currentUser, request.isSendForReview() ? "Resubmitted for review" : "Updated");

        String aiWarning = null;
        try {
            aiService.enrichMcq(mcq);
        } catch (Exception e) {
            aiWarning = "AI service unavailable. MCQ saved without AI validation.";
        }

        Mcq saved = mcqRepository.save(mcq);

        // Notify admins if submitted for review
        if (request.isSendForReview() && saved.getStatus() == McqStatus.READY_FOR_REVIEW) {
            String preview = saved.getQuestionStem().length() > 70
                    ? saved.getQuestionStem().substring(0, 70) + "..." : saved.getQuestionStem();
            String mcqRef = saved.getTechStack() != null
                    ? saved.getTechStack().getName().toUpperCase().replace(" ", "-") + "-" + saved.getId()
                    : "MCQ-" + saved.getId();
            userRepository.findAll().stream()
                    .filter(u -> u.getRole().name().equals("ADMIN"))
                    .forEach(admin -> notificationService.notify(
                            admin, preview, "SUBMITTED", saved.getId(), currentUser, mcqRef));
        }

        McqResponse response = toResponse(saved);
        response.setAiWarning(aiWarning);
        return response;
    }

    @Transactional
    public McqResponse submitForReview(Long id, User currentUser) {
        Mcq mcq = mcqRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MCQ not found"));

        if (!mcq.getCreator().getId().equals(currentUser.getId())) {
            throw new BadRequestException("Only the creator can submit for review");
        }
        if (mcq.getStatus() != McqStatus.DRAFT && mcq.getStatus() != McqStatus.REJECTED) {
            throw new BadRequestException("MCQ must be in DRAFT or REJECTED state to submit for review");
        }

        mcq.setStatus(McqStatus.READY_FOR_REVIEW);

        // Run AI scoring before saving
        try {
            java.util.Map<String, Object> aiResult = aiService.validateAnswer(
                    mcq.getQuestionStem(), mcq.getOptionA(), mcq.getOptionB(),
                    mcq.getOptionC(), mcq.getOptionD(), mcq.getCorrectAnswer());
            Object scoreObj = aiResult.get("confidenceScore");
            if (scoreObj != null) {
                int score = ((Number) scoreObj).intValue();
                mcq.setAiScore(score);
                mcq.setAiRisk(score >= 85 ? "LOW" : score >= 60 ? "MEDIUM" : "HIGH");
            }
        } catch (Exception ignored) {}

        Mcq saved = mcqRepository.save(mcq);

        // Notify all ADMIN users that a new MCQ is ready for review
        String preview = saved.getQuestionStem().length() > 70
                ? saved.getQuestionStem().substring(0, 70) + "..."
                : saved.getQuestionStem();
        String mcqRef = saved.getTechStack() != null
                ? saved.getTechStack().getName().toUpperCase().replace(" ", "-") + "-" + saved.getId()
                : "MCQ-" + saved.getId();
        userRepository.findAll().stream()
                .filter(u -> u.getRole().name().equals("ADMIN"))
                .forEach(admin -> notificationService.notify(
                        admin, preview, "SUBMITTED", saved.getId(), currentUser, mcqRef));

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public Page<McqResponse> getMyMcqs(User user, McqStatus status, String search, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("updatedAt").descending());
        Page<Mcq> mcqs = mcqRepository.findByCreatorWithFilters(user.getId(), status, search, pageable);
        return mcqs.map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public McqResponse getMcqById(Long id, User currentUser) {
        Mcq mcq = mcqRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MCQ not found"));
        return toResponse(mcq);
    }

    @Transactional
    public void deleteMcq(Long id, User currentUser) {
        Mcq mcq = mcqRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MCQ not found"));
        if (!mcq.getCreator().getId().equals(currentUser.getId())) {
            throw new BadRequestException("Only the creator can delete this MCQ");
        }
        if (mcq.getStatus() != McqStatus.DRAFT) {
            throw new BadRequestException("Only DRAFT MCQs can be deleted");
        }
        mcqRepository.delete(mcq);
    }

    /** Saves a version snapshot of the MCQ before modification. */
    private void snapshotVersion(Mcq mcq, User actor, String changeNote) {
        try {
            Integer maxVer = mcqVersionRepository.findMaxVersionByMcqId(mcq.getId());
            McqVersion snap = McqVersion.builder()
                .mcqId(mcq.getId())
                .versionNumber(maxVer == null ? 1 : maxVer + 1)
                .questionStem(mcq.getQuestionStem())
                .optionA(mcq.getOptionA())
                .optionB(mcq.getOptionB())
                .optionC(mcq.getOptionC())
                .optionD(mcq.getOptionD())
                .correctAnswer(mcq.getCorrectAnswer())
                .difficulty(mcq.getDifficulty() != null ? mcq.getDifficulty().name() : null)
                .changedByName(actor.getFullName())
                .changedByEnterpriseId(actor.getEnterpriseId())
                .statusAtTime(mcq.getStatus() != null ? mcq.getStatus().name() : null)
                .changeNote(changeNote)
                .build();
            mcqVersionRepository.save(snap);
        } catch (Exception ignored) { /* snapshot failures must not block the main save */ }
    }

    public McqResponse toResponse(Mcq mcq) {
        List<CommentResponse> comments = reviewCommentRepository
                .findByMcqIdOrderByCreatedAtDesc(mcq.getId())
                .stream()
                .map(c -> CommentResponse.builder()
                        .id(c.getId())
                        .comment(c.getComment())
                        .reviewerEnterpriseId(c.getReviewer().getEnterpriseId())
                        .createdAt(c.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        return McqResponse.builder()
                .id(mcq.getId())
                .questionStem(mcq.getQuestionStem())
                .optionA(mcq.getOptionA())
                .optionB(mcq.getOptionB())
                .optionC(mcq.getOptionC())
                .optionD(mcq.getOptionD())
                .correctAnswer(mcq.getCorrectAnswer())
                .difficulty(mcq.getDifficulty())
                .status(mcq.getStatus())
                .techStackId(mcq.getTechStack().getId())
                .techStackName(mcq.getTechStack().getName())
                .topicId(mcq.getTopic() != null ? mcq.getTopic().getId() : null)
                .topicName(mcq.getTopic() != null ? mcq.getTopic().getName() : null)
                .creatorEnterpriseId(mcq.getCreator().getEnterpriseId())
                .creatorFullName(mcq.getCreator().getFullName())
                .reviewerEnterpriseId(mcq.getReviewer() != null ? mcq.getReviewer().getEnterpriseId() : null)
                .reviewerFullName(mcq.getReviewer() != null ? mcq.getReviewer().getFullName() : null)
                .comments(comments)
                .version(mcq.getVersion())
                .createdAt(mcq.getCreatedAt())
                .updatedAt(mcq.getUpdatedAt())
                .aiScore(mcq.getAiScore())
                .aiRisk(mcq.getAiRisk())
                .build();
    }

    /**
     * Strips HTML/script tags from user-supplied text to prevent XSS.
     * Removes anything inside < > brackets, then decodes common HTML entities.
     */
    private static String sanitize(String input) {
        if (input == null) return null;
        // Remove all HTML tags (including script, iframe, img onerror, etc.)
        String stripped = input.replaceAll("<[^>]*>", "");
        // Decode common HTML entities to plain text
        stripped = stripped
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&amp;", "&")
            .replace("&quot;", "\"")
            .replace("&#x27;", "'")
            .replace("&#x2F;", "/");
        return stripped.trim();
    }
}
