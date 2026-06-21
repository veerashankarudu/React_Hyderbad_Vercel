package com.valkey.quizhub.service;

import com.valkey.quizhub.config.QuizHubMetrics;
import com.valkey.quizhub.dto.request.McqRequest;
import com.valkey.quizhub.dto.response.CommentResponse;
import com.valkey.quizhub.dto.response.McqResponse;
import com.valkey.quizhub.entity.*;
import com.valkey.quizhub.enums.McqStatus;
import com.valkey.quizhub.exception.BadRequestException;
import com.valkey.quizhub.exception.ResourceNotFoundException;
import com.valkey.quizhub.repository.*;
import lombok.RequiredArgsConstructor;
import java.util.Map;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
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
    private final InboxMessageService inboxMessageService;
    private final AppConfigService appConfigService;
    private final QuizHubMetrics metrics;
    private final BreethMemoryService breethMemoryService;

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
        mcq.setCorrectAnswer(normalizeCorrectAnswer(request.getCorrectAnswer(), request.getQuestionType()));
        mcq.setQuestionType(com.valkey.quizhub.enums.QuestionType.valueOf(
                request.getQuestionType() != null ? request.getQuestionType().toUpperCase() : "SINGLE"));
        mcq.setContentJson(request.getContentJson());
        mcq.setDifficulty(request.getDifficulty());
        mcq.setTechStack(techStack);
        mcq.setTopic(topic);
        mcq.setCreator(creator);
        mcq.setStatus(request.isSendForReview() ? McqStatus.READY_FOR_REVIEW : McqStatus.DRAFT);

        if (mcqRepository.existsByQuestionStemIgnoreCase(mcq.getQuestionStem()) && !request.isSkipDuplicateCheck()) {
            Long dupId = mcqRepository.findFirstByQuestionStemIgnoreCase(mcq.getQuestionStem())
                    .map(Mcq::getId).orElse(null);
            String msg = dupId != null
                    ? "DUPLICATE:" + dupId + ":Duplicate question — already exists in the database"
                    : "Duplicate question — already exists in the database";
            throw new BadRequestException(msg);
        }

        // AI semantic duplicate check — catches questions with different wording but same meaning
        if (!request.isSkipDuplicateCheck()) {
        try {
            List<Mcq> pool = mcqRepository.findAll().stream()
                    .filter(m -> m.getStatus() != McqStatus.REJECTED && m.getStatus() != McqStatus.PERMANENTLY_REJECTED)
                    .filter(m -> m.getTechStack() != null && m.getTechStack().getId().equals(techStack.getId()))
                    .limit(50)
                    .collect(Collectors.toList());
            List<Map<String, Object>> similar = aiService.checkDuplicateAgainstDb(mcq.getQuestionStem(), pool);
            similar.stream()
                    .filter(r -> !r.containsKey("error"))
                    .filter(r -> r.get("similarityPercent") != null
                            && ((Number) r.get("similarityPercent")).intValue() >= 30)
                    .findFirst()
                    .ifPresent(match -> {
                        int pct = ((Number) match.get("similarityPercent")).intValue();
                        Object matchId = match.get("id");
                        throw new BadRequestException("SIMILAR:" + matchId + ":" + pct
                                + "%:AI detected " + pct + "% similarity with existing MCQ #" + matchId);
                    });
        } catch (BadRequestException e) {
            throw e; // re-throw similarity rejection
        } catch (Exception ignored) {
            // AI unavailable — fall through to save without semantic check
        }
        }

        String aiWarning = null;
        try {
            aiService.enrichMcq(mcq);
        } catch (Exception e) {
            aiWarning = "AI service unavailable. MCQ saved without AI validation.";
        }

        Mcq saved = mcqRepository.save(mcq);
        metrics.mcqCreated.increment();

        // Record MCQ creation in Breeth AI memory (async, non-blocking)
        try {
            breethMemoryService.recordMcqCreated(
                creator.getFullName(),
                techStack.getName(),
                topic != null ? topic.getName() : "General",
                saved.getQuestionStem(),
                saved.getDifficulty() != null ? saved.getDifficulty().name() : "MEDIUM"
            );
        } catch (Exception ignored) {
            // Breeth is optional — don't block MCQ creation
        }

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

        // Permanently rejected MCQs cannot be edited by anyone
        if (mcq.getStatus() == McqStatus.PERMANENTLY_REJECTED) {
            throw new BadRequestException("This MCQ has been permanently rejected and cannot be edited.");
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
        mcq.setCorrectAnswer(normalizeCorrectAnswer(request.getCorrectAnswer(), request.getQuestionType()));
        mcq.setQuestionType(com.valkey.quizhub.enums.QuestionType.valueOf(
                request.getQuestionType() != null ? request.getQuestionType().toUpperCase() : "SINGLE"));
        mcq.setContentJson(request.getContentJson());
        mcq.setDifficulty(request.getDifficulty());
        mcq.setTechStack(techStack);
        mcq.setTopic(topic);

        if (request.isSendForReview() && mcq.getStatus() == McqStatus.PERMANENTLY_REJECTED) {
            throw new BadRequestException("This MCQ has been permanently rejected and cannot be resubmitted.");
        }
        if (request.isSendForReview() && mcq.getStatus() == McqStatus.DRAFT) {
            mcq.setStatus(McqStatus.READY_FOR_REVIEW);
        } else if (request.isSendForReview() && mcq.getStatus() == McqStatus.REJECTED) {
            // Check rejection limit before allowing resubmit
            if (appConfigService.isRejectionLimitEnabled()) {
                int maxAllowed = appConfigService.getMaxRejectionCount();
                int currentCount = mcq.getRejectionCount() != null ? mcq.getRejectionCount() : 0;
                if (currentCount >= maxAllowed) {
                    mcq.setStatus(McqStatus.PERMANENTLY_REJECTED);
                    mcqRepository.save(mcq);
                    throw new BadRequestException("This MCQ has been rejected " + currentCount + " time(s) and reached the max limit of " + maxAllowed + ". It cannot be resubmitted.");
                }
            }
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
        if (mcq.getStatus() == McqStatus.PERMANENTLY_REJECTED) {
            throw new BadRequestException("This MCQ has been permanently rejected after reaching the maximum rejection limit. It cannot be resubmitted.");
        }
        if (mcq.getStatus() != McqStatus.DRAFT && mcq.getStatus() != McqStatus.REJECTED) {
            throw new BadRequestException("MCQ must be in DRAFT or REJECTED state to submit for review");
        }

        // Check rejection limit before allowing resubmit
        if (mcq.getStatus() == McqStatus.REJECTED && appConfigService.isRejectionLimitEnabled()) {
            int maxAllowed = appConfigService.getMaxRejectionCount();
            int currentCount = mcq.getRejectionCount() != null ? mcq.getRejectionCount() : 0;
            if (currentCount >= maxAllowed) {
                mcq.setStatus(McqStatus.PERMANENTLY_REJECTED);
                mcqRepository.save(mcq);
                throw new BadRequestException("This MCQ has been rejected " + currentCount + " time(s) and has reached the maximum limit of " + maxAllowed + ". It cannot be resubmitted.");
            }
        }

        // AI semantic duplicate check before allowing submit for review (PPT Slide 8 requirement)
        try {
            List<Mcq> pool = mcqRepository.findAll().stream()
                    .filter(m -> m.getStatus() != McqStatus.REJECTED && m.getStatus() != McqStatus.PERMANENTLY_REJECTED)
                    .filter(m -> !m.getId().equals(mcq.getId()))
                    .filter(m -> m.getTechStack() != null && mcq.getTechStack() != null
                            && m.getTechStack().getId().equals(mcq.getTechStack().getId()))
                    .limit(50)
                    .collect(Collectors.toList());
            List<Map<String, Object>> similar = aiService.checkDuplicateAgainstDb(mcq.getQuestionStem(), pool);
            similar.stream()
                    .filter(r -> !r.containsKey("error"))
                    .filter(r -> r.get("similarityPercent") != null
                            && ((Number) r.get("similarityPercent")).intValue() >= 30)
                    .findFirst()
                    .ifPresent(match -> {
                        int pct = ((Number) match.get("similarityPercent")).intValue();
                        Object matchId = match.get("id");
                        throw new BadRequestException("DUPLICATE:" + matchId + ":"
                                + pct + "% similarity detected with existing MCQ #" + matchId
                                + ". Please revise before submitting for review.");
                    });
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception ignored) {
            // AI unavailable — allow submit without semantic check
        }

        // If reviewer already assigned (resubmit after rejection), go directly to UNDER_REVIEW
        if (mcq.getStatus() == McqStatus.REJECTED && mcq.getReviewer() != null) {
            mcq.setStatus(McqStatus.UNDER_REVIEW);
        } else {
            mcq.setStatus(McqStatus.READY_FOR_REVIEW);
        }

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
        metrics.mcqSubmittedForReview.increment();

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

        // Notify the assigned reviewer (if any) that the SME has resubmitted after rejection
        if (saved.getReviewer() != null) {
            notificationService.notify(
                    saved.getReviewer(), preview, "SUBMITTED", saved.getId(), currentUser, mcqRef);
            inboxMessageService.sendSystem(
                    saved.getReviewer(),
                    "🔄 MCQ Resubmitted — " + mcqRef,
                    "Hi " + saved.getReviewer().getFullName() + ",\n\n" +
                    currentUser.getFullName() + " has revised and resubmitted an MCQ for your review.\n\n" +
                    "MCQ: " + preview + "\n\n" +
                    "Please review the updated question.\n\n— QuizHub AI",
                    saved.getId()
            );
        }

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public Page<McqResponse> getMyMcqs(User user, McqStatus status, String search, int page, int size) {
        if (size > 100) size = 100;
        if (search != null && search.length() > 200) search = search.substring(0, 200);
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
        metrics.mcqDeleted.increment();
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
                .questionType(mcq.getQuestionType() != null ? mcq.getQuestionType().name() : "SINGLE")
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
                .aiGenerated(mcq.getAiGenerated() != null ? mcq.getAiGenerated() : false)
                .contentJson(mcq.getContentJson())
                .rejectionCount(mcq.getRejectionCount() != null ? mcq.getRejectionCount() : 0)
                .rejectionLimitEnabled(appConfigService.isRejectionLimitEnabled())
                .maxRejectionLimit(appConfigService.getMaxRejectionCount())
                .build();
    }

    /**
     * Strips HTML/script tags from user-supplied text to prevent XSS.
     * Uses Jsoup with NONE safelist — removes all HTML tags and attributes.
     */
    private static String sanitize(String input) {
        if (input == null) return null;
        return Jsoup.clean(input, Safelist.none()).trim();
    }

    /**
     * Normalizes correctAnswer:
     * - SINGLE type: "A" (single letter)
     * - MULTI type: "A,B,D" (sorted comma-separated letters)
     */
    private String normalizeCorrectAnswer(String answer, String questionType) {
        if (answer == null) return "A";
        String upper = answer.toUpperCase().trim();
        if ("MULTI".equalsIgnoreCase(questionType)) {
            // Multi: accept "A,B,D" or "ABD" — normalize to sorted comma-separated
            String[] parts = upper.replace(" ", "").split("[,]+");
            java.util.TreeSet<String> sorted = new java.util.TreeSet<>();
            for (String p : parts) {
                for (char c : p.toCharArray()) {
                    if (c >= 'A' && c <= 'D') sorted.add(String.valueOf(c));
                }
            }
            return sorted.isEmpty() ? "A" : String.join(",", sorted);
        }
        // Single: first letter only
        return upper.substring(0, 1);
    }
}
