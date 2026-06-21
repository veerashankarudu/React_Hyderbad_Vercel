package com.valkey.quizhub.service;

import com.valkey.quizhub.dto.request.McqRequest;
import com.valkey.quizhub.dto.response.McqResponse;
import com.valkey.quizhub.entity.*;
import com.valkey.quizhub.enums.Difficulty;
import com.valkey.quizhub.enums.McqStatus;
import com.valkey.quizhub.exception.BadRequestException;
import com.valkey.quizhub.exception.ResourceNotFoundException;
import com.valkey.quizhub.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;

import java.util.Collections;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class McqServiceTest {

    @Mock private McqRepository mcqRepository;
    @Mock private TechStackRepository techStackRepository;
    @Mock private TopicRepository topicRepository;
    @Mock private ReviewCommentRepository reviewCommentRepository;
    @Mock private AIService aiService;
    @Mock private NotificationService notificationService;
    @Mock private UserRepository userRepository;
    @Mock private McqVersionRepository mcqVersionRepository;
    @InjectMocks private McqService mcqService;

    private User smeUser;
    private User adminUser;
    private TechStack techStack;
    private McqRequest validRequest;

    @BeforeEach
    void setUp() {
        techStack = TechStack.builder().id(1L).name("Java").build();

        smeUser = User.builder().id(1L).enterpriseId("sme.user")
                .fullName("SME User").role(com.valkey.quizhub.enums.Role.SME).approved(true).build();

        adminUser = User.builder().id(2L).enterpriseId("admin.user")
                .fullName("Admin User").role(com.valkey.quizhub.enums.Role.ADMIN).approved(true).build();

        validRequest = new McqRequest();
        validRequest.setQuestionStem("What is Java?");
        validRequest.setOptionA("A language");
        validRequest.setOptionB("A coffee");
        validRequest.setOptionC("An island");
        validRequest.setOptionD("A tool");
        validRequest.setCorrectAnswer("A");
        validRequest.setDifficulty(Difficulty.EASY);
        validRequest.setTechStackId(1L);
    }

    // ─── CREATE MCQ ───────────────────────────────────────────────────────────

    @Test
    void createMcq_validRequest_savedAsDraft() {
        when(techStackRepository.findById(1L)).thenReturn(Optional.of(techStack));
        when(mcqRepository.existsByQuestionStemIgnoreCase(any())).thenReturn(false);
        when(reviewCommentRepository.findByMcqIdOrderByCreatedAtDesc(any())).thenReturn(Collections.emptyList());
        Mcq saved = buildMcq(1L, McqStatus.DRAFT);
        when(mcqRepository.save(any())).thenReturn(saved);

        McqResponse resp = mcqService.createMcq(validRequest, smeUser);

        assertNotNull(resp);
        assertEquals(McqStatus.DRAFT, resp.getStatus());
    }

    @Test
    void createMcq_sendForReview_savedAsReadyForReview() {
        validRequest.setSendForReview(true);
        when(techStackRepository.findById(1L)).thenReturn(Optional.of(techStack));
        when(mcqRepository.existsByQuestionStemIgnoreCase(any())).thenReturn(false);
        when(reviewCommentRepository.findByMcqIdOrderByCreatedAtDesc(any())).thenReturn(Collections.emptyList());
        Mcq saved = buildMcq(1L, McqStatus.READY_FOR_REVIEW);
        when(mcqRepository.save(any())).thenReturn(saved);
        // findAll is called to notify admins — return empty list
        lenient().when(userRepository.findAll()).thenReturn(Collections.emptyList());

        McqResponse resp = mcqService.createMcq(validRequest, smeUser);
        assertEquals(McqStatus.READY_FOR_REVIEW, resp.getStatus());
    }

    @Test
    void createMcq_duplicateQuestion_throwsBadRequest() {
        when(techStackRepository.findById(1L)).thenReturn(Optional.of(techStack));
        when(mcqRepository.existsByQuestionStemIgnoreCase("What is Java?")).thenReturn(true);
        when(mcqRepository.findFirstByQuestionStemIgnoreCase("What is Java?"))
                .thenReturn(Optional.of(buildMcq(5L, McqStatus.APPROVED)));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> mcqService.createMcq(validRequest, smeUser));
        assertTrue(ex.getMessage().contains("DUPLICATE"));
    }

    @Test
    void createMcq_unknownTechStack_throwsResourceNotFound() {
        when(techStackRepository.findById(99L)).thenReturn(Optional.empty());
        validRequest.setTechStackId(99L);
        assertThrows(com.valkey.quizhub.exception.ResourceNotFoundException.class,
                () -> mcqService.createMcq(validRequest, smeUser));
    }

    @Test
    void createMcq_aiFailure_setsWarning() {
        when(techStackRepository.findById(1L)).thenReturn(Optional.of(techStack));
        when(mcqRepository.existsByQuestionStemIgnoreCase(any())).thenReturn(false);
        doThrow(new RuntimeException("AI down")).when(aiService).enrichMcq(any());
        when(reviewCommentRepository.findByMcqIdOrderByCreatedAtDesc(any())).thenReturn(Collections.emptyList());
        Mcq saved = buildMcq(1L, McqStatus.DRAFT);
        when(mcqRepository.save(any())).thenReturn(saved);

        McqResponse resp = mcqService.createMcq(validRequest, smeUser);
        assertNotNull(resp.getAiWarning());
        assertTrue(resp.getAiWarning().contains("AI service unavailable"));
    }

    @Test
    void createMcq_correctAnswerNormalisedToUpperCase() {
        validRequest.setCorrectAnswer("b");
        when(techStackRepository.findById(1L)).thenReturn(Optional.of(techStack));
        when(mcqRepository.existsByQuestionStemIgnoreCase(any())).thenReturn(false);
        when(reviewCommentRepository.findByMcqIdOrderByCreatedAtDesc(any())).thenReturn(Collections.emptyList());
        Mcq saved = buildMcq(1L, McqStatus.DRAFT);
        saved.setCorrectAnswer("B");
        when(mcqRepository.save(any())).thenReturn(saved);

        McqResponse resp = mcqService.createMcq(validRequest, smeUser);
        assertEquals("B", resp.getCorrectAnswer());
    }

    // ─── UPDATE MCQ ───────────────────────────────────────────────────────────

    @Test
    void updateMcq_byCreatorOnDraft_succeeds() {
        Mcq existing = buildMcq(1L, McqStatus.DRAFT);
        existing.setCreator(smeUser);
        when(mcqRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(techStackRepository.findById(1L)).thenReturn(Optional.of(techStack));
        when(mcqRepository.save(any())).thenReturn(existing);
        when(reviewCommentRepository.findByMcqIdOrderByCreatedAtDesc(any())).thenReturn(Collections.emptyList());
        when(mcqVersionRepository.findMaxVersionByMcqId(any())).thenReturn(null);

        McqResponse resp = mcqService.updateMcq(1L, validRequest, smeUser);
        assertNotNull(resp);
    }

    @Test
    void updateMcq_byNonCreatorNonAdmin_throwsBadRequest() {
        User other = User.builder().id(99L).enterpriseId("other").role(com.valkey.quizhub.enums.Role.SME).build();
        Mcq existing = buildMcq(1L, McqStatus.DRAFT);
        existing.setCreator(smeUser);
        when(mcqRepository.findById(1L)).thenReturn(Optional.of(existing));
        assertThrows(BadRequestException.class, () -> mcqService.updateMcq(1L, validRequest, other));
    }

    @Test
    void updateMcq_onApprovedMcqBySme_throwsBadRequest() {
        Mcq existing = buildMcq(1L, McqStatus.APPROVED);
        existing.setCreator(smeUser);
        when(mcqRepository.findById(1L)).thenReturn(Optional.of(existing));
        assertThrows(BadRequestException.class, () -> mcqService.updateMcq(1L, validRequest, smeUser));
    }

    @Test
    void updateMcq_notFound_throwsResourceNotFound() {
        when(mcqRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(com.valkey.quizhub.exception.ResourceNotFoundException.class,
                () -> mcqService.updateMcq(99L, validRequest, smeUser));
    }

    // ─── DELETE MCQ ───────────────────────────────────────────────────────────

    @Test
    void deleteMcq_byCreatorOnDraft_succeeds() {
        Mcq existing = buildMcq(1L, McqStatus.DRAFT);
        existing.setCreator(smeUser);
        when(mcqRepository.findById(1L)).thenReturn(Optional.of(existing));
        mcqService.deleteMcq(1L, smeUser);
        verify(mcqRepository).delete(existing);
    }

    @Test
    void deleteMcq_notCreator_throwsBadRequest() {
        User other = User.builder().id(99L).build();
        Mcq existing = buildMcq(1L, McqStatus.DRAFT);
        existing.setCreator(smeUser);
        when(mcqRepository.findById(1L)).thenReturn(Optional.of(existing));
        assertThrows(BadRequestException.class, () -> mcqService.deleteMcq(1L, other));
    }

    @Test
    void deleteMcq_notDraft_throwsBadRequest() {
        Mcq existing = buildMcq(1L, McqStatus.APPROVED);
        existing.setCreator(smeUser);
        when(mcqRepository.findById(1L)).thenReturn(Optional.of(existing));
        assertThrows(BadRequestException.class, () -> mcqService.deleteMcq(1L, smeUser));
    }

    @Test
    void deleteMcq_notFound_throwsResourceNotFound() {
        when(mcqRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(com.valkey.quizhub.exception.ResourceNotFoundException.class,
                () -> mcqService.deleteMcq(99L, smeUser));
    }

    // ─── GET MCQ BY ID ────────────────────────────────────────────────────────

    @Test
    void getMcqById_draftByCreator_succeeds() {
        Mcq existing = buildMcq(1L, McqStatus.DRAFT);
        existing.setCreator(smeUser);
        when(mcqRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(reviewCommentRepository.findByMcqIdOrderByCreatedAtDesc(any())).thenReturn(Collections.emptyList());
        assertNotNull(mcqService.getMcqById(1L, smeUser));
    }

    @Test
    void getMcqById_draftByNonCreator_succeeds() {
        // TC-245: Draft MCQs are now accessible by any user (e.g. admin/reviewer)
        // to support the duplicate-preview modal in bulk upload.
        User other = User.builder().id(99L).build();
        Mcq existing = buildMcq(1L, McqStatus.DRAFT);
        existing.setCreator(smeUser);
        when(mcqRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(reviewCommentRepository.findByMcqIdOrderByCreatedAtDesc(any())).thenReturn(Collections.emptyList());
        assertNotNull(mcqService.getMcqById(1L, other));
    }

    @Test
    void getMcqById_approvedByAnyUser_succeeds() {
        Mcq existing = buildMcq(1L, McqStatus.APPROVED);
        existing.setCreator(smeUser);
        when(mcqRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(reviewCommentRepository.findByMcqIdOrderByCreatedAtDesc(any())).thenReturn(Collections.emptyList());
        assertNotNull(mcqService.getMcqById(1L, adminUser));
    }

    @Test
    void getMcqById_notFound_throwsResourceNotFound() {
        when(mcqRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(com.valkey.quizhub.exception.ResourceNotFoundException.class,
                () -> mcqService.getMcqById(99L, smeUser));
    }

    // ─── SUBMIT FOR REVIEW ────────────────────────────────────────────────────

    @Test
    void submitForReview_draftByCreator_setsReadyForReview() {
        Mcq existing = buildMcq(1L, McqStatus.DRAFT);
        existing.setCreator(smeUser);
        when(mcqRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(mcqRepository.save(any())).thenReturn(existing);
        when(userRepository.findAll()).thenReturn(Collections.emptyList());
        when(reviewCommentRepository.findByMcqIdOrderByCreatedAtDesc(any())).thenReturn(Collections.emptyList());

        McqResponse resp = mcqService.submitForReview(1L, smeUser);
        assertEquals(McqStatus.READY_FOR_REVIEW, resp.getStatus());
    }

    @Test
    void submitForReview_byNonCreator_throwsBadRequest() {
        User other = User.builder().id(99L).build();
        Mcq existing = buildMcq(1L, McqStatus.DRAFT);
        existing.setCreator(smeUser);
        when(mcqRepository.findById(1L)).thenReturn(Optional.of(existing));
        assertThrows(BadRequestException.class, () -> mcqService.submitForReview(1L, other));
    }

    @Test
    void submitForReview_alreadyUnderReview_throwsBadRequest() {
        Mcq existing = buildMcq(1L, McqStatus.UNDER_REVIEW);
        existing.setCreator(smeUser);
        when(mcqRepository.findById(1L)).thenReturn(Optional.of(existing));
        assertThrows(BadRequestException.class, () -> mcqService.submitForReview(1L, smeUser));
    }

    @Test
    void submitForReview_rejectedByCreator_succeeds() {
        Mcq existing = buildMcq(1L, McqStatus.REJECTED);
        existing.setCreator(smeUser);
        when(mcqRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(mcqRepository.save(any())).thenReturn(existing);
        when(userRepository.findAll()).thenReturn(Collections.emptyList());
        when(reviewCommentRepository.findByMcqIdOrderByCreatedAtDesc(any())).thenReturn(Collections.emptyList());

        McqResponse resp = mcqService.submitForReview(1L, smeUser);
        assertEquals(McqStatus.READY_FOR_REVIEW, resp.getStatus());
    }

    // ─── COMMENTS LOADING ────────────────────────────────────────────────────

    @Test
    void getMcqById_withComments_responseContainsComments() {
        User reviewer = User.builder().id(3L).enterpriseId("rev.user").fullName("Reviewer").build();
        Mcq existing = buildMcq(1L, McqStatus.APPROVED);
        existing.setCreator(smeUser);

        ReviewComment c1 = ReviewComment.builder()
                .id(10L).comment("Good question").reviewer(reviewer).mcq(existing).build();
        ReviewComment c2 = ReviewComment.builder()
                .id(11L).comment("Needs rewording").reviewer(reviewer).mcq(existing).build();

        when(mcqRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(reviewCommentRepository.findByMcqIdOrderByCreatedAtDesc(1L))
                .thenReturn(java.util.Arrays.asList(c1, c2));

        McqResponse resp = mcqService.getMcqById(1L, smeUser);
        assertNotNull(resp.getComments());
        assertEquals(2, resp.getComments().size());
    }

    @Test
    void getMcqById_commentsHaveCorrectReviewerEnterpriseId() {
        User reviewer = User.builder().id(3L).enterpriseId("rev.user").fullName("Reviewer").build();
        Mcq existing = buildMcq(1L, McqStatus.APPROVED);
        existing.setCreator(smeUser);

        ReviewComment c1 = ReviewComment.builder()
                .id(10L).comment("Looks good").reviewer(reviewer).mcq(existing).build();

        when(mcqRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(reviewCommentRepository.findByMcqIdOrderByCreatedAtDesc(1L))
                .thenReturn(Collections.singletonList(c1));

        McqResponse resp = mcqService.getMcqById(1L, smeUser);
        assertEquals("rev.user", resp.getComments().get(0).getReviewerEnterpriseId());
    }

    @Test
    void getMcqById_commentsHaveCorrectText() {
        User reviewer = User.builder().id(3L).enterpriseId("rev.user").fullName("Reviewer").build();
        Mcq existing = buildMcq(1L, McqStatus.APPROVED);
        existing.setCreator(smeUser);

        ReviewComment c1 = ReviewComment.builder()
                .id(10L).comment("Answer option B is wrong").reviewer(reviewer).mcq(existing).build();

        when(mcqRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(reviewCommentRepository.findByMcqIdOrderByCreatedAtDesc(1L))
                .thenReturn(Collections.singletonList(c1));

        McqResponse resp = mcqService.getMcqById(1L, smeUser);
        assertEquals("Answer option B is wrong", resp.getComments().get(0).getComment());
    }

    @Test
    void getMcqById_noComments_returnsEmptyCommentsList() {
        Mcq existing = buildMcq(1L, McqStatus.APPROVED);
        existing.setCreator(smeUser);
        when(mcqRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(reviewCommentRepository.findByMcqIdOrderByCreatedAtDesc(1L))
                .thenReturn(Collections.emptyList());

        McqResponse resp = mcqService.getMcqById(1L, smeUser);
        assertNotNull(resp.getComments());
        assertTrue(resp.getComments().isEmpty());
    }

    @Test
    void getMcqById_commentsLoadedViaDescOrderQuery() {
        Mcq existing = buildMcq(1L, McqStatus.APPROVED);
        existing.setCreator(smeUser);
        when(mcqRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(reviewCommentRepository.findByMcqIdOrderByCreatedAtDesc(1L))
                .thenReturn(Collections.emptyList());

        mcqService.getMcqById(1L, smeUser);
        // Verifies the correct sorted repository method is called, not findByMcqId
        verify(reviewCommentRepository).findByMcqIdOrderByCreatedAtDesc(1L);
    }

    // ─── GET MY MCQS ─────────────────────────────────────────────────────────

    @Test
    void getMyMcqs_returnsPagedResult() {
        Page<Mcq> page = new PageImpl<>(Collections.emptyList());
        when(mcqRepository.findByCreatorWithFilters(any(), any(), any(), any())).thenReturn(page);
        Page<McqResponse> result = mcqService.getMyMcqs(smeUser, null, null, 0, 10);
        assertNotNull(result);
        assertEquals(0, result.getTotalElements());
    }

    // ─── CREATE MCQ – additional branches ────────────────────────────────────

    @Test
    void createMcq_withTopicId_loadsTopicFromRepository() {
        Topic topic = Topic.builder().id(10L).name("Collections").techStack(techStack).build();
        validRequest.setTopicId(10L);
        when(techStackRepository.findById(1L)).thenReturn(Optional.of(techStack));
        when(topicRepository.findById(10L)).thenReturn(Optional.of(topic));
        when(mcqRepository.existsByQuestionStemIgnoreCase(any())).thenReturn(false);
        when(reviewCommentRepository.findByMcqIdOrderByCreatedAtDesc(any())).thenReturn(Collections.emptyList());
        Mcq saved = buildMcq(1L, McqStatus.DRAFT);
        when(mcqRepository.save(any())).thenReturn(saved);

        McqResponse resp = mcqService.createMcq(validRequest, smeUser);
        assertNotNull(resp);
        verify(topicRepository).findById(10L);
    }

    @Test
    void createMcq_topicNotFound_throwsResourceNotFound() {
        validRequest.setTopicId(99L);
        when(techStackRepository.findById(1L)).thenReturn(Optional.of(techStack));
        when(topicRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(com.valkey.quizhub.exception.ResourceNotFoundException.class,
                () -> mcqService.createMcq(validRequest, smeUser));
    }

    @Test
    void createMcq_duplicateNoExistingId_messageLacksDuplicatePrefix() {
        when(techStackRepository.findById(1L)).thenReturn(Optional.of(techStack));
        when(mcqRepository.existsByQuestionStemIgnoreCase(any())).thenReturn(true);
        when(mcqRepository.findFirstByQuestionStemIgnoreCase(any())).thenReturn(Optional.empty());

        com.valkey.quizhub.exception.BadRequestException ex =
                assertThrows(com.valkey.quizhub.exception.BadRequestException.class,
                        () -> mcqService.createMcq(validRequest, smeUser));
        assertFalse(ex.getMessage().startsWith("DUPLICATE:"));
        assertTrue(ex.getMessage().contains("Duplicate question"));
    }

    // ─── UPDATE MCQ – additional branches ────────────────────────────────────

    @Test
    void updateMcq_byCreatorOnRejected_succeeds() {
        Mcq existing = buildMcq(1L, McqStatus.REJECTED);
        existing.setCreator(smeUser);
        when(mcqRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(techStackRepository.findById(1L)).thenReturn(Optional.of(techStack));
        when(mcqVersionRepository.findMaxVersionByMcqId(any())).thenReturn(null);
        when(mcqRepository.save(any())).thenReturn(existing);
        when(reviewCommentRepository.findByMcqIdOrderByCreatedAtDesc(any())).thenReturn(Collections.emptyList());

        McqResponse resp = mcqService.updateMcq(1L, validRequest, smeUser);
        assertNotNull(resp);
    }

    @Test
    void updateMcq_byAdminOnApproved_succeeds() {
        Mcq existing = buildMcq(1L, McqStatus.APPROVED);
        existing.setCreator(smeUser);
        when(mcqRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(techStackRepository.findById(1L)).thenReturn(Optional.of(techStack));
        when(mcqVersionRepository.findMaxVersionByMcqId(any())).thenReturn(2);
        when(mcqRepository.save(any())).thenReturn(existing);
        when(reviewCommentRepository.findByMcqIdOrderByCreatedAtDesc(any())).thenReturn(Collections.emptyList());

        McqResponse resp = mcqService.updateMcq(1L, validRequest, adminUser);
        assertNotNull(resp);
    }

    @Test
    void updateMcq_sendForReview_onDraft_setsReadyForReview() {
        validRequest.setSendForReview(true);
        Mcq existing = buildMcq(1L, McqStatus.DRAFT);
        existing.setCreator(smeUser);
        Mcq saved = buildMcq(1L, McqStatus.READY_FOR_REVIEW);
        saved.setCreator(smeUser);
        when(mcqRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(techStackRepository.findById(1L)).thenReturn(Optional.of(techStack));
        when(mcqVersionRepository.findMaxVersionByMcqId(any())).thenReturn(null);
        when(mcqRepository.save(any())).thenReturn(saved);
        when(reviewCommentRepository.findByMcqIdOrderByCreatedAtDesc(any())).thenReturn(Collections.emptyList());
        when(userRepository.findAll()).thenReturn(Collections.emptyList());

        McqResponse resp = mcqService.updateMcq(1L, validRequest, smeUser);
        assertEquals(McqStatus.READY_FOR_REVIEW, resp.getStatus());
    }

    @Test
    void updateMcq_sendForReview_onRejected_setsReadyForReview() {
        validRequest.setSendForReview(true);
        Mcq existing = buildMcq(1L, McqStatus.REJECTED);
        existing.setCreator(smeUser);
        Mcq saved = buildMcq(1L, McqStatus.READY_FOR_REVIEW);
        saved.setCreator(smeUser);
        when(mcqRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(techStackRepository.findById(1L)).thenReturn(Optional.of(techStack));
        when(mcqVersionRepository.findMaxVersionByMcqId(any())).thenReturn(3);
        when(mcqRepository.save(any())).thenReturn(saved);
        when(reviewCommentRepository.findByMcqIdOrderByCreatedAtDesc(any())).thenReturn(Collections.emptyList());
        when(userRepository.findAll()).thenReturn(Collections.emptyList());

        McqResponse resp = mcqService.updateMcq(1L, validRequest, smeUser);
        assertEquals(McqStatus.READY_FOR_REVIEW, resp.getStatus());
    }

    @Test
    void updateMcq_withTopicId_loadsTopicFromRepository() {
        Topic topic = Topic.builder().id(5L).name("Generics").techStack(techStack).build();
        validRequest.setTopicId(5L);
        Mcq existing = buildMcq(1L, McqStatus.DRAFT);
        existing.setCreator(smeUser);
        when(mcqRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(techStackRepository.findById(1L)).thenReturn(Optional.of(techStack));
        when(topicRepository.findById(5L)).thenReturn(Optional.of(topic));
        when(mcqVersionRepository.findMaxVersionByMcqId(any())).thenReturn(null);
        when(mcqRepository.save(any())).thenReturn(existing);
        when(reviewCommentRepository.findByMcqIdOrderByCreatedAtDesc(any())).thenReturn(Collections.emptyList());

        McqResponse resp = mcqService.updateMcq(1L, validRequest, smeUser);
        assertNotNull(resp);
        verify(topicRepository).findById(5L);
    }

    @Test
    void updateMcq_sendForReview_notifiesAdmins() {
        validRequest.setSendForReview(true);
        Mcq existing = buildMcq(1L, McqStatus.DRAFT);
        existing.setCreator(smeUser);
        Mcq saved = buildMcq(1L, McqStatus.READY_FOR_REVIEW);
        saved.setCreator(smeUser);
        when(mcqRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(techStackRepository.findById(1L)).thenReturn(Optional.of(techStack));
        when(mcqVersionRepository.findMaxVersionByMcqId(any())).thenReturn(null);
        when(mcqRepository.save(any())).thenReturn(saved);
        when(reviewCommentRepository.findByMcqIdOrderByCreatedAtDesc(any())).thenReturn(Collections.emptyList());
        when(userRepository.findAll()).thenReturn(Collections.singletonList(adminUser));

        mcqService.updateMcq(1L, validRequest, smeUser);
        verify(notificationService).notify(eq(adminUser), any(), eq("SUBMITTED"), any(), any(), any());
    }

    @Test
    void updateMcq_snapshotVersionIncrementsFromExisting() {
        Mcq existing = buildMcq(1L, McqStatus.DRAFT);
        existing.setCreator(smeUser);
        when(mcqRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(techStackRepository.findById(1L)).thenReturn(Optional.of(techStack));
        when(mcqVersionRepository.findMaxVersionByMcqId(1L)).thenReturn(5);
        when(mcqRepository.save(any())).thenReturn(existing);
        when(reviewCommentRepository.findByMcqIdOrderByCreatedAtDesc(any())).thenReturn(Collections.emptyList());

        mcqService.updateMcq(1L, validRequest, smeUser);
        // snapshotVersion is called internally; verify it saves a version
        verify(mcqVersionRepository).save(any());
    }

    // ─── SUBMIT FOR REVIEW – AI scoring branches ─────────────────────────────

    @Test
    void submitForReview_aiScoreHigh_setsLowRisk() throws Exception {
        Mcq existing = buildMcq(1L, McqStatus.DRAFT);
        existing.setCreator(smeUser);
        when(mcqRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(mcqRepository.save(any())).thenReturn(existing);
        when(userRepository.findAll()).thenReturn(Collections.emptyList());
        when(reviewCommentRepository.findByMcqIdOrderByCreatedAtDesc(any())).thenReturn(Collections.emptyList());
        Map<String, Object> aiResult = new HashMap<>();
        aiResult.put("confidenceScore", 90);
        when(aiService.validateAnswer(any(), any(), any(), any(), any(), any())).thenReturn(aiResult);

        mcqService.submitForReview(1L, smeUser);
        assertEquals("LOW", existing.getAiRisk());
        assertEquals(90, existing.getAiScore());
    }

    @Test
    void submitForReview_aiScoreMedium_setsMediumRisk() throws Exception {
        Mcq existing = buildMcq(1L, McqStatus.DRAFT);
        existing.setCreator(smeUser);
        when(mcqRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(mcqRepository.save(any())).thenReturn(existing);
        when(userRepository.findAll()).thenReturn(Collections.emptyList());
        when(reviewCommentRepository.findByMcqIdOrderByCreatedAtDesc(any())).thenReturn(Collections.emptyList());
        Map<String, Object> aiResult = new HashMap<>();
        aiResult.put("confidenceScore", 70);
        when(aiService.validateAnswer(any(), any(), any(), any(), any(), any())).thenReturn(aiResult);

        mcqService.submitForReview(1L, smeUser);
        assertEquals("MEDIUM", existing.getAiRisk());
        assertEquals(70, existing.getAiScore());
    }

    @Test
    void submitForReview_aiScoreLow_setsHighRisk() throws Exception {
        Mcq existing = buildMcq(1L, McqStatus.DRAFT);
        existing.setCreator(smeUser);
        when(mcqRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(mcqRepository.save(any())).thenReturn(existing);
        when(userRepository.findAll()).thenReturn(Collections.emptyList());
        when(reviewCommentRepository.findByMcqIdOrderByCreatedAtDesc(any())).thenReturn(Collections.emptyList());
        Map<String, Object> aiResult = new HashMap<>();
        aiResult.put("confidenceScore", 50);
        when(aiService.validateAnswer(any(), any(), any(), any(), any(), any())).thenReturn(aiResult);

        mcqService.submitForReview(1L, smeUser);
        assertEquals("HIGH", existing.getAiRisk());
        assertEquals(50, existing.getAiScore());
    }

    @Test
    void submitForReview_aiValidateAnswerFails_scoreRemainsNull() throws Exception {
        Mcq existing = buildMcq(1L, McqStatus.DRAFT);
        existing.setCreator(smeUser);
        when(mcqRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(mcqRepository.save(any())).thenReturn(existing);
        when(userRepository.findAll()).thenReturn(Collections.emptyList());
        when(reviewCommentRepository.findByMcqIdOrderByCreatedAtDesc(any())).thenReturn(Collections.emptyList());
        when(aiService.validateAnswer(any(), any(), any(), any(), any(), any()))
                .thenThrow(new RuntimeException("AI timeout"));

        McqResponse resp = mcqService.submitForReview(1L, smeUser);
        assertNull(resp.getAiScore());
    }

    @Test
    void submitForReview_notifiesAdmins() {
        Mcq existing = buildMcq(1L, McqStatus.DRAFT);
        existing.setCreator(smeUser);
        when(mcqRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(mcqRepository.save(any())).thenReturn(existing);
        when(userRepository.findAll()).thenReturn(Collections.singletonList(adminUser));
        when(reviewCommentRepository.findByMcqIdOrderByCreatedAtDesc(any())).thenReturn(Collections.emptyList());

        mcqService.submitForReview(1L, smeUser);
        verify(notificationService).notify(eq(adminUser), any(), eq("SUBMITTED"), any(), any(), any());
    }

    // ─── GET MCQ BY ID – reviewer and topic branches ──────────────────────────

    @Test
    void getMcqById_withReviewer_responseContainsReviewerInfo() {
        Mcq existing = buildMcq(1L, McqStatus.APPROVED);
        existing.setCreator(smeUser);
        existing.setReviewer(adminUser);
        when(mcqRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(reviewCommentRepository.findByMcqIdOrderByCreatedAtDesc(any())).thenReturn(Collections.emptyList());

        McqResponse resp = mcqService.getMcqById(1L, smeUser);
        assertEquals("admin.user", resp.getReviewerEnterpriseId());
        assertEquals("Admin User", resp.getReviewerFullName());
    }

    @Test
    void getMcqById_withTopic_responseContainsTopicInfo() {
        Topic topic = Topic.builder().id(5L).name("Concurrency").techStack(techStack).build();
        Mcq existing = buildMcq(1L, McqStatus.APPROVED);
        existing.setCreator(smeUser);
        existing.setTopic(topic);
        when(mcqRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(reviewCommentRepository.findByMcqIdOrderByCreatedAtDesc(any())).thenReturn(Collections.emptyList());

        McqResponse resp = mcqService.getMcqById(1L, smeUser);
        assertEquals(5L, resp.getTopicId());
        assertEquals("Concurrency", resp.getTopicName());
    }

    // ─── GET MY MCQS – filter branches ───────────────────────────────────────

    @Test
    void getMyMcqs_withStatusFilter_returnsResult() {
        Page<Mcq> page = new PageImpl<>(Collections.emptyList());
        when(mcqRepository.findByCreatorWithFilters(any(), any(), any(), any())).thenReturn(page);
        Page<McqResponse> result = mcqService.getMyMcqs(smeUser, McqStatus.DRAFT, null, 0, 10);
        assertNotNull(result);
        verify(mcqRepository).findByCreatorWithFilters(eq(smeUser.getId()), eq(McqStatus.DRAFT), any(), any());
    }

    @Test
    void getMyMcqs_withSearchAndStatus_passesToRepository() {
        Page<Mcq> page = new PageImpl<>(Collections.emptyList());
        when(mcqRepository.findByCreatorWithFilters(any(), any(), any(), any())).thenReturn(page);
        Page<McqResponse> result = mcqService.getMyMcqs(smeUser, McqStatus.APPROVED, "Java", 1, 5);
        assertNotNull(result);
        verify(mcqRepository).findByCreatorWithFilters(eq(smeUser.getId()), eq(McqStatus.APPROVED), eq("Java"), any());
    }

    // ─── HELPER ──────────────────────────────────────────────────────────────

    private Mcq buildMcq(Long id, McqStatus status) {
        return Mcq.builder()
                .id(id)
                .questionStem("What is Java?")
                .optionA("A language").optionB("A coffee").optionC("An island").optionD("A tool")
                .correctAnswer("A")
                .difficulty(Difficulty.EASY)
                .techStack(techStack)
                .creator(smeUser)
                .status(status)
                .build();
    }
}
