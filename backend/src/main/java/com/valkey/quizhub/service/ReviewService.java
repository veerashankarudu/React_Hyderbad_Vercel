package com.valkey.quizhub.service;

import com.valkey.quizhub.config.QuizHubMetrics;
import com.valkey.quizhub.dto.request.ReviewRequest;
import com.valkey.quizhub.dto.response.McqResponse;
import com.valkey.quizhub.entity.*;
import com.valkey.quizhub.enums.McqStatus;
import com.valkey.quizhub.exception.BadRequestException;
import com.valkey.quizhub.exception.ResourceNotFoundException;
import com.valkey.quizhub.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final McqRepository mcqRepository;
    private final ReviewCommentRepository reviewCommentRepository;
    private final McqService mcqService;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final InboxMessageService inboxMessageService;
    private final AppConfigService appConfigService;
    private final QuizHubMetrics metrics;

    @Transactional(readOnly = true)
    public Page<McqResponse> getAssignedReviews(User reviewer, McqStatus status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("updatedAt").descending());
        Page<Mcq> mcqs;
        if (status != null) {
            mcqs = mcqRepository.findByReviewerIdAndStatus(reviewer.getId(), status, pageable);
        } else {
            mcqs = mcqRepository.findByReviewerId(reviewer.getId(), pageable);
        }
        return mcqs.map(mcqService::toResponse);
    }

    @Transactional
    public McqResponse submitReview(Long mcqId, ReviewRequest request, User reviewer) {
        Mcq mcq = mcqRepository.findById(mcqId)
                .orElseThrow(() -> new ResourceNotFoundException("MCQ not found"));

        if (mcq.getReviewer() == null || !mcq.getReviewer().getId().equals(reviewer.getId())) {
            throw new BadRequestException("You are not the assigned reviewer for this MCQ");
        }
        if (mcq.getStatus() != McqStatus.UNDER_REVIEW) {
            throw new BadRequestException("MCQ is not under review");
        }

        boolean isRejection = "REJECT".equals(request.getAction());
        if (isRejection) {
            if (request.getComment() == null || request.getComment().isBlank()) {
                throw new BadRequestException("A comment is required when rejecting an MCQ");
            }
            // Increment rejection count
            int newCount = (mcq.getRejectionCount() != null ? mcq.getRejectionCount() : 0) + 1;
            mcq.setRejectionCount(newCount);

            // Check if max rejection limit is enabled and exceeded
            if (appConfigService.isRejectionLimitEnabled()) {
                int maxAllowed = appConfigService.getMaxRejectionCount();
                if (newCount >= maxAllowed) {
                    mcq.setStatus(McqStatus.PERMANENTLY_REJECTED);
                } else {
                    mcq.setStatus(McqStatus.REJECTED);
                }
            } else {
                mcq.setStatus(McqStatus.REJECTED);
            }
        } else {
            mcq.setStatus(McqStatus.APPROVED);
        }

        if (request.getComment() != null && !request.getComment().isBlank()) {            ReviewComment comment = new ReviewComment();
            comment.setMcq(mcq);
            comment.setReviewer(reviewer);
            comment.setComment(request.getComment());
            reviewCommentRepository.save(comment);
        }

        McqResponse result = mcqService.toResponse(mcqRepository.save(mcq));

        if (isRejection) {
            metrics.mcqRejected.increment();
        } else {
            metrics.mcqApproved.increment();
        }

        String preview = mcq.getQuestionStem().length() > 60
                ? mcq.getQuestionStem().substring(0, 60) + "..."
                : mcq.getQuestionStem();
        String mcqRef = mcq.getTechStack() != null
                ? mcq.getTechStack().getName().toUpperCase().replace(" ", "-") + "-" + mcq.getId()
                : "MCQ-" + mcq.getId();
        if (isRejection) {
            String notifType = mcq.getStatus() == McqStatus.PERMANENTLY_REJECTED ? "PERMANENTLY_REJECTED" : "REJECTED";
            notificationService.notify(mcq.getCreator(), preview, notifType, mcq.getId(), reviewer, mcqRef);
            emailService.sendMcqRejectedEmail(mcq, reviewer, request.getComment());
            String inboxTitle = mcq.getStatus() == McqStatus.PERMANENTLY_REJECTED
                    ? "🚫 MCQ Permanently Rejected — " + mcqRef
                    : "❌ MCQ Rejected — " + mcqRef;
            String inboxBody = mcq.getStatus() == McqStatus.PERMANENTLY_REJECTED
                    ? "Hi " + mcq.getCreator().getFullName() + ",\n\n" +
                      "Your MCQ has been rejected for the final time (rejection #" + mcq.getRejectionCount() + ").\n\n" +
                      "MCQ: " + preview + "\n" +
                      "Reviewed by: " + reviewer.getFullName() + "\n" +
                      "Reason: " + request.getComment() + "\n\n" +
                      "This question has reached the maximum rejection limit and cannot be resubmitted.\n\n— QuizHub AI"
                    : "Hi " + mcq.getCreator().getFullName() + ",\n\n" +
                      "Your MCQ has been reviewed and requires revision (rejection #" + mcq.getRejectionCount() + ").\n\n" +
                      "MCQ: " + preview + "\n" +
                      "Reviewed by: " + reviewer.getFullName() + "\n" +
                      "Reason: " + request.getComment() + "\n\n" +
                      "Please edit and resubmit the question.\n\n— QuizHub AI";
            inboxMessageService.sendSystem(
                mcq.getCreator(),
                inboxTitle,
                inboxBody,
                mcq.getId()
            );
        } else {
            notificationService.notify(mcq.getCreator(), preview, "APPROVED", mcq.getId(), reviewer, mcqRef);
            emailService.sendMcqApprovedEmail(mcq, reviewer);
            inboxMessageService.sendSystem(
                mcq.getCreator(),
                "✅ MCQ Approved — " + mcqRef,
                "Hi " + mcq.getCreator().getFullName() + ",\n\n" +
                "Great news! Your MCQ has been reviewed and APPROVED.\n\n" +
                "MCQ: " + preview + "\n" +
                "Approved by: " + reviewer.getFullName() + "\n\n" +
                "The question is now part of the Question Bank.\n\n— QuizHub AI",
                mcq.getId()
            );
        }

        return result;
    }

    @Transactional
    public McqResponse addComment(Long mcqId, String commentText, User reviewer) {
        Mcq mcq = mcqRepository.findById(mcqId)
                .orElseThrow(() -> new ResourceNotFoundException("MCQ not found"));

        if (mcq.getReviewer() == null || !mcq.getReviewer().getId().equals(reviewer.getId())) {
            throw new BadRequestException("You are not the assigned reviewer for this MCQ");
        }

        if (commentText == null || commentText.isBlank()) {
            throw new BadRequestException("Comment cannot be empty");
        }

        ReviewComment comment = new ReviewComment();
        comment.setMcq(mcq);
        comment.setReviewer(reviewer);
        comment.setComment(commentText);
        reviewCommentRepository.save(comment);

        return mcqService.toResponse(mcq);
    }
}
