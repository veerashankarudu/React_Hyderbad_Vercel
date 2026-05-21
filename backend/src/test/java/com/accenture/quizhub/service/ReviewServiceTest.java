package com.accenture.quizhub.service;

import com.accenture.quizhub.dto.request.ReviewRequest;
import com.accenture.quizhub.dto.response.McqResponse;
import com.accenture.quizhub.entity.*;
import com.accenture.quizhub.enums.Difficulty;
import com.accenture.quizhub.enums.McqStatus;
import com.accenture.quizhub.enums.Role;
import com.accenture.quizhub.exception.BadRequestException;
import com.accenture.quizhub.exception.ResourceNotFoundException;
import com.accenture.quizhub.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReviewServiceTest {

    @Mock private McqRepository mcqRepository;
    @Mock private ReviewCommentRepository reviewCommentRepository;
    @Mock private McqService mcqService;
    @Mock private NotificationService notificationService;
    @Mock private EmailService emailService;
    @Mock private InboxMessageService inboxMessageService;
    @InjectMocks private ReviewService reviewService;

    private User reviewer;
    private User creator;
    private TechStack techStack;
    private Mcq mcqUnderReview;

    @BeforeEach
    void setUp() {
        techStack = TechStack.builder().id(1L).name("Java").build();

        creator = User.builder().id(1L).enterpriseId("creator").fullName("Creator").role(Role.SME).build();
        reviewer = User.builder().id(2L).enterpriseId("reviewer").fullName("Reviewer").role(Role.SME)
                .techStacks(Collections.singletonList(techStack)).build();

        mcqUnderReview = Mcq.builder()
                .id(10L)
                .questionStem("What is Java?")
                .optionA("Language").optionB("Coffee").optionC("Island").optionD("Tool")
                .correctAnswer("A").difficulty(Difficulty.EASY)
                .techStack(techStack).creator(creator).reviewer(reviewer)
                .status(McqStatus.UNDER_REVIEW).build();
    }

    // ─── SUBMIT REVIEW — APPROVE ─────────────────────────────────────────────

    @Test
    void submitReview_approve_setsApprovedStatus() {
        ReviewRequest req = new ReviewRequest();
        req.setAction("APPROVE");
        req.setComment("Looks good");

        when(mcqRepository.findById(10L)).thenReturn(Optional.of(mcqUnderReview));
        when(mcqRepository.save(any())).thenReturn(mcqUnderReview);
        McqResponse mockResp = McqResponse.builder().id(10L).status(McqStatus.APPROVED).build();
        when(mcqService.toResponse(any())).thenReturn(mockResp);

        McqResponse resp = reviewService.submitReview(10L, req, reviewer);
        assertEquals(McqStatus.APPROVED, resp.getStatus());
    }

    @Test
    void submitReview_reject_withComment_setsRejectedStatus() {
        ReviewRequest req = new ReviewRequest();
        req.setAction("REJECT");
        req.setComment("Incorrect answer");

        when(mcqRepository.findById(10L)).thenReturn(Optional.of(mcqUnderReview));
        when(mcqRepository.save(any())).thenReturn(mcqUnderReview);
        McqResponse mockResp = McqResponse.builder().id(10L).status(McqStatus.REJECTED).build();
        when(mcqService.toResponse(any())).thenReturn(mockResp);

        McqResponse resp = reviewService.submitReview(10L, req, reviewer);
        assertEquals(McqStatus.REJECTED, resp.getStatus());
    }

    @Test
    void submitReview_reject_withoutComment_throwsBadRequest() {
        ReviewRequest req = new ReviewRequest();
        req.setAction("REJECT");
        req.setComment("");

        when(mcqRepository.findById(10L)).thenReturn(Optional.of(mcqUnderReview));
        assertThrows(BadRequestException.class, () -> reviewService.submitReview(10L, req, reviewer));
    }

    @Test
    void submitReview_reject_withBlankComment_throwsBadRequest() {
        ReviewRequest req = new ReviewRequest();
        req.setAction("REJECT");
        req.setComment("   ");

        when(mcqRepository.findById(10L)).thenReturn(Optional.of(mcqUnderReview));
        assertThrows(BadRequestException.class, () -> reviewService.submitReview(10L, req, reviewer));
    }

    @Test
    void submitReview_wrongReviewer_throwsBadRequest() {
        User otherReviewer = User.builder().id(99L).enterpriseId("other").build();
        ReviewRequest req = new ReviewRequest();
        req.setAction("APPROVE");

        when(mcqRepository.findById(10L)).thenReturn(Optional.of(mcqUnderReview));
        assertThrows(BadRequestException.class, () -> reviewService.submitReview(10L, req, otherReviewer));
    }

    @Test
    void submitReview_mcqNotUnderReview_throwsBadRequest() {
        mcqUnderReview.setStatus(McqStatus.READY_FOR_REVIEW);
        ReviewRequest req = new ReviewRequest();
        req.setAction("APPROVE");

        when(mcqRepository.findById(10L)).thenReturn(Optional.of(mcqUnderReview));
        assertThrows(BadRequestException.class, () -> reviewService.submitReview(10L, req, reviewer));
    }

    @Test
    void submitReview_mcqNotFound_throwsResourceNotFound() {
        when(mcqRepository.findById(99L)).thenReturn(Optional.empty());
        ReviewRequest req = new ReviewRequest();
        req.setAction("APPROVE");
        assertThrows(ResourceNotFoundException.class, () -> reviewService.submitReview(99L, req, reviewer));
    }

    @Test
    void submitReview_reviewerIsNull_throwsBadRequest() {
        mcqUnderReview.setReviewer(null);
        ReviewRequest req = new ReviewRequest();
        req.setAction("APPROVE");
        when(mcqRepository.findById(10L)).thenReturn(Optional.of(mcqUnderReview));
        assertThrows(BadRequestException.class, () -> reviewService.submitReview(10L, req, reviewer));
    }

    @Test
    void submitReview_approve_noCommentRequired() {
        ReviewRequest req = new ReviewRequest();
        req.setAction("APPROVE");
        req.setComment(null);

        when(mcqRepository.findById(10L)).thenReturn(Optional.of(mcqUnderReview));
        when(mcqRepository.save(any())).thenReturn(mcqUnderReview);
        McqResponse mockResp = McqResponse.builder().id(10L).status(McqStatus.APPROVED).build();
        when(mcqService.toResponse(any())).thenReturn(mockResp);

        // No exception expected for approve without comment
        assertDoesNotThrow(() -> reviewService.submitReview(10L, req, reviewer));
    }

    @Test
    void submitReview_reject_savesComment() {
        ReviewRequest req = new ReviewRequest();
        req.setAction("REJECT");
        req.setComment("Bad question");

        when(mcqRepository.findById(10L)).thenReturn(Optional.of(mcqUnderReview));
        when(mcqRepository.save(any())).thenReturn(mcqUnderReview);
        when(mcqService.toResponse(any())).thenReturn(McqResponse.builder().id(10L).status(McqStatus.REJECTED).build());

        reviewService.submitReview(10L, req, reviewer);
        verify(reviewCommentRepository, times(1)).save(any());
    }

    @Test
    void submitReview_approve_withComment_savesComment() {
        ReviewRequest req = new ReviewRequest();
        req.setAction("APPROVE");
        req.setComment("Excellent question");

        when(mcqRepository.findById(10L)).thenReturn(Optional.of(mcqUnderReview));
        when(mcqRepository.save(any())).thenReturn(mcqUnderReview);
        when(mcqService.toResponse(any())).thenReturn(McqResponse.builder().id(10L).status(McqStatus.APPROVED).build());

        reviewService.submitReview(10L, req, reviewer);
        verify(reviewCommentRepository, times(1)).save(any());
    }

    @Test
    void submitReview_approve_notifiesCreator() {
        ReviewRequest req = new ReviewRequest();
        req.setAction("APPROVE");

        when(mcqRepository.findById(10L)).thenReturn(Optional.of(mcqUnderReview));
        when(mcqRepository.save(any())).thenReturn(mcqUnderReview);
        when(mcqService.toResponse(any())).thenReturn(McqResponse.builder().id(10L).status(McqStatus.APPROVED).build());

        reviewService.submitReview(10L, req, reviewer);
        verify(notificationService, times(1)).notify(eq(creator), any(), eq("APPROVED"), any(), any(), any());
    }

    @Test
    void submitReview_reject_notifiesCreator() {
        ReviewRequest req = new ReviewRequest();
        req.setAction("REJECT");
        req.setComment("Wrong answer");

        when(mcqRepository.findById(10L)).thenReturn(Optional.of(mcqUnderReview));
        when(mcqRepository.save(any())).thenReturn(mcqUnderReview);
        when(mcqService.toResponse(any())).thenReturn(McqResponse.builder().id(10L).status(McqStatus.REJECTED).build());

        reviewService.submitReview(10L, req, reviewer);
        verify(notificationService, times(1)).notify(eq(creator), any(), eq("REJECTED"), any(), any(), any());
    }

    // ─── COMMENT PERSISTENCE ─────────────────────────────────────────────────

    @Test
    void submitReview_approve_withoutComment_noCommentSaved() {
        ReviewRequest req = new ReviewRequest();
        req.setAction("APPROVE");
        req.setComment(null); // no comment on approve

        when(mcqRepository.findById(10L)).thenReturn(Optional.of(mcqUnderReview));
        when(mcqRepository.save(any())).thenReturn(mcqUnderReview);
        when(mcqService.toResponse(any())).thenReturn(McqResponse.builder().id(10L).status(McqStatus.APPROVED).build());

        reviewService.submitReview(10L, req, reviewer);
        verify(reviewCommentRepository, never()).save(any());
    }

    @Test
    void submitReview_approve_blankComment_noCommentSaved() {
        ReviewRequest req = new ReviewRequest();
        req.setAction("APPROVE");
        req.setComment("   "); // blank — should not save

        when(mcqRepository.findById(10L)).thenReturn(Optional.of(mcqUnderReview));
        when(mcqRepository.save(any())).thenReturn(mcqUnderReview);
        when(mcqService.toResponse(any())).thenReturn(McqResponse.builder().id(10L).status(McqStatus.APPROVED).build());

        reviewService.submitReview(10L, req, reviewer);
        verify(reviewCommentRepository, never()).save(any());
    }

    @Test
    void submitReview_reject_commentSavedWithCorrectReviewer() {
        ReviewRequest req = new ReviewRequest();
        req.setAction("REJECT");
        req.setComment("Incorrect option");

        when(mcqRepository.findById(10L)).thenReturn(Optional.of(mcqUnderReview));
        when(mcqRepository.save(any())).thenReturn(mcqUnderReview);
        when(mcqService.toResponse(any())).thenReturn(McqResponse.builder().id(10L).status(McqStatus.REJECTED).build());

        reviewService.submitReview(10L, req, reviewer);

        ArgumentCaptor<ReviewComment> captor = ArgumentCaptor.forClass(ReviewComment.class);
        verify(reviewCommentRepository).save(captor.capture());
        assertEquals(reviewer, captor.getValue().getReviewer());
    }

    @Test
    void submitReview_reject_commentSavedWithCorrectMcq() {
        ReviewRequest req = new ReviewRequest();
        req.setAction("REJECT");
        req.setComment("Wrong difficulty level");

        when(mcqRepository.findById(10L)).thenReturn(Optional.of(mcqUnderReview));
        when(mcqRepository.save(any())).thenReturn(mcqUnderReview);
        when(mcqService.toResponse(any())).thenReturn(McqResponse.builder().id(10L).status(McqStatus.REJECTED).build());

        reviewService.submitReview(10L, req, reviewer);

        ArgumentCaptor<ReviewComment> captor = ArgumentCaptor.forClass(ReviewComment.class);
        verify(reviewCommentRepository).save(captor.capture());
        assertEquals(mcqUnderReview, captor.getValue().getMcq());
    }

    @Test
    void submitReview_reject_commentTextIsPreserved() {
        ReviewRequest req = new ReviewRequest();
        req.setAction("REJECT");
        req.setComment("Question stem is ambiguous");

        when(mcqRepository.findById(10L)).thenReturn(Optional.of(mcqUnderReview));
        when(mcqRepository.save(any())).thenReturn(mcqUnderReview);
        when(mcqService.toResponse(any())).thenReturn(McqResponse.builder().id(10L).status(McqStatus.REJECTED).build());

        reviewService.submitReview(10L, req, reviewer);

        ArgumentCaptor<ReviewComment> captor = ArgumentCaptor.forClass(ReviewComment.class);
        verify(reviewCommentRepository).save(captor.capture());
        assertEquals("Question stem is ambiguous", captor.getValue().getComment());
    }

    // ─── GET ASSIGNED REVIEWS ────────────────────────────────────────────────

    @Test
    void getAssignedReviews_withStatus_callsFilteredRepo() {
        Page<Mcq> emptyPage = new PageImpl<>(Collections.emptyList());
        when(mcqRepository.findByReviewerIdAndStatus(eq(reviewer.getId()), eq(McqStatus.UNDER_REVIEW), any()))
                .thenReturn(emptyPage);

        Page<McqResponse> result = reviewService.getAssignedReviews(reviewer, McqStatus.UNDER_REVIEW, 0, 10);
        assertNotNull(result);
        assertEquals(0, result.getTotalElements());
        verify(mcqRepository).findByReviewerIdAndStatus(eq(reviewer.getId()), eq(McqStatus.UNDER_REVIEW), any());
    }

    @Test
    void getAssignedReviews_withoutStatus_callsUnfilteredRepo() {
        Page<Mcq> emptyPage = new PageImpl<>(Collections.emptyList());
        when(mcqRepository.findByReviewerId(eq(reviewer.getId()), any())).thenReturn(emptyPage);

        Page<McqResponse> result = reviewService.getAssignedReviews(reviewer, null, 0, 10);
        assertNotNull(result);
        verify(mcqRepository).findByReviewerId(eq(reviewer.getId()), any());
    }

    @Test
    void getAssignedReviews_withMcqs_mapsToResponses() {
        Page<Mcq> page = new PageImpl<>(Collections.singletonList(mcqUnderReview));
        when(mcqRepository.findByReviewerId(eq(reviewer.getId()), any())).thenReturn(page);
        McqResponse mockResp = McqResponse.builder().id(10L).status(McqStatus.UNDER_REVIEW).build();
        when(mcqService.toResponse(mcqUnderReview)).thenReturn(mockResp);

        Page<McqResponse> result = reviewService.getAssignedReviews(reviewer, null, 0, 10);
        assertEquals(1, result.getTotalElements());
        assertEquals(McqStatus.UNDER_REVIEW, result.getContent().get(0).getStatus());
    }
}
