package com.accenture.quizhub.service;

import com.accenture.quizhub.dto.request.ReviewRequest;
import com.accenture.quizhub.dto.response.McqResponse;
import com.accenture.quizhub.entity.*;
import com.accenture.quizhub.enums.McqStatus;
import com.accenture.quizhub.exception.BadRequestException;
import com.accenture.quizhub.exception.ResourceNotFoundException;
import com.accenture.quizhub.repository.*;
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
            mcq.setStatus(McqStatus.REJECTED);
        } else {
            mcq.setStatus(McqStatus.APPROVED);
        }

        if (request.getComment() != null && !request.getComment().isBlank()) {
            ReviewComment comment = new ReviewComment();
            comment.setMcq(mcq);
            comment.setReviewer(reviewer);
            comment.setComment(request.getComment());
            reviewCommentRepository.save(comment);
        }

        McqResponse result = mcqService.toResponse(mcqRepository.save(mcq));

        String preview = mcq.getQuestionStem().length() > 60
                ? mcq.getQuestionStem().substring(0, 60) + "..."
                : mcq.getQuestionStem();
        String mcqRef = mcq.getTechStack() != null
                ? mcq.getTechStack().getName().toUpperCase().replace(" ", "-") + "-" + mcq.getId()
                : "MCQ-" + mcq.getId();
        if (isRejection) {
            notificationService.notify(mcq.getCreator(), preview, "REJECTED", mcq.getId(), reviewer, mcqRef);
            emailService.sendMcqRejectedEmail(mcq, reviewer, request.getComment());
            inboxMessageService.sendSystem(
                mcq.getCreator(),
                "❌ MCQ Rejected — " + mcqRef,
                "Hi " + mcq.getCreator().getFullName() + ",\n\n" +
                "Your MCQ has been reviewed and requires revision.\n\n" +
                "MCQ: " + preview + "\n" +
                "Reviewed by: " + reviewer.getFullName() + "\n" +
                "Reason: " + request.getComment() + "\n\n" +
                "Please edit and resubmit the question.\n\n— QuizHub AI",
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
