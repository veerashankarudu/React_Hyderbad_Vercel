package com.valkey.quizhub.service;

import com.valkey.quizhub.dto.request.AddUserRequest;
import com.valkey.quizhub.dto.request.AssignReviewerRequest;
import com.valkey.quizhub.dto.response.AuditLogResponse;
import com.valkey.quizhub.dto.response.McqResponse;
import com.valkey.quizhub.dto.response.UserSummary;
import com.valkey.quizhub.entity.*;
import com.valkey.quizhub.enums.Difficulty;
import com.valkey.quizhub.enums.McqStatus;
import com.valkey.quizhub.enums.Role;
import com.valkey.quizhub.exception.BadRequestException;
import com.valkey.quizhub.exception.ResourceNotFoundException;
import com.valkey.quizhub.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock private McqRepository mcqRepository;
    @Mock private UserRepository userRepository;
    @Mock private ReviewCommentRepository reviewCommentRepository;
    @Mock private McqService mcqService;
    @Mock private NotificationService notificationService;
    @Mock private EmailService emailService;
    @Mock private AuditLogRepository auditLogRepository;
    @Mock private TechStackRepository techStackRepository;
    @Mock private InboxMessageService inboxMessageService;
    @InjectMocks private AdminService adminService;

    private final PasswordEncoder realEncoder = new BCryptPasswordEncoder();
    private User admin;
    private User sme;
    private TechStack techStack;
    private Mcq mcqReadyForReview;

    @BeforeEach
    void setUp() {
        org.springframework.test.util.ReflectionTestUtils.setField(adminService, "passwordEncoder", realEncoder);

        techStack = TechStack.builder().id(1L).name("Java").build();

        admin = User.builder().id(1L).enterpriseId("admin").fullName("Admin").role(Role.ADMIN).approved(true)
                .techStacks(Collections.emptyList()).build();

        sme = User.builder().id(2L).enterpriseId("sme").fullName("SME")
                .role(Role.SME).approved(true)
                .techStacks(Collections.singletonList(techStack)).build();

        mcqReadyForReview = Mcq.builder()
                .id(10L).questionStem("What is Java?")
                .optionA("Lang").optionB("Coffee").optionC("Island").optionD("Tool")
                .correctAnswer("A").difficulty(Difficulty.EASY)
                .techStack(techStack).creator(sme).status(McqStatus.READY_FOR_REVIEW).build();
    }

    // ─── ASSIGN REVIEWER ─────────────────────────────────────────────────────

    @Test
    void assignReviewer_validRequest_setsUnderReview() {
        User reviewer = User.builder().id(3L).enterpriseId("rev").fullName("Reviewer")
                .role(Role.SME).techStacks(Collections.singletonList(techStack)).build();
        when(mcqRepository.findById(10L)).thenReturn(Optional.of(mcqReadyForReview));
        when(userRepository.findById(3L)).thenReturn(Optional.of(reviewer));
        when(mcqRepository.save(any())).thenReturn(mcqReadyForReview);
        McqResponse mockResp = McqResponse.builder().id(10L).status(McqStatus.UNDER_REVIEW).build();
        when(mcqService.toResponse(any())).thenReturn(mockResp);

        AssignReviewerRequest req = new AssignReviewerRequest();
        req.setReviewerId(3L);

        McqResponse resp = adminService.assignReviewer(10L, req, admin);
        assertEquals(McqStatus.UNDER_REVIEW, resp.getStatus());
    }

    @Test
    void assignReviewer_mcqNotReadyForReview_throwsBadRequest() {
        mcqReadyForReview.setStatus(McqStatus.DRAFT);
        when(mcqRepository.findById(10L)).thenReturn(Optional.of(mcqReadyForReview));
        AssignReviewerRequest req = new AssignReviewerRequest();
        req.setReviewerId(3L);
        assertThrows(BadRequestException.class, () -> adminService.assignReviewer(10L, req, admin));
    }

    @Test
    void assignReviewer_reviewerIsCreator_throwsBadRequest() {
        when(mcqRepository.findById(10L)).thenReturn(Optional.of(mcqReadyForReview));
        when(userRepository.findById(2L)).thenReturn(Optional.of(sme)); // sme is creator
        AssignReviewerRequest req = new AssignReviewerRequest();
        req.setReviewerId(2L);
        assertThrows(BadRequestException.class, () -> adminService.assignReviewer(10L, req, admin));
    }

    @Test
    void assignReviewer_reviewerLacksMatchingTechStack_throwsBadRequest() {
        TechStack other = TechStack.builder().id(99L).name("Python").build();
        User reviewer = User.builder().id(3L).enterpriseId("rev")
                .techStacks(Collections.singletonList(other)).build();
        when(mcqRepository.findById(10L)).thenReturn(Optional.of(mcqReadyForReview));
        when(userRepository.findById(3L)).thenReturn(Optional.of(reviewer));
        AssignReviewerRequest req = new AssignReviewerRequest();
        req.setReviewerId(3L);
        assertThrows(BadRequestException.class, () -> adminService.assignReviewer(10L, req, admin));
    }

    @Test
    void assignReviewer_mcqNotFound_throwsResourceNotFound() {
        when(mcqRepository.findById(99L)).thenReturn(Optional.empty());
        AssignReviewerRequest req = new AssignReviewerRequest();
        req.setReviewerId(3L);
        assertThrows(ResourceNotFoundException.class, () -> adminService.assignReviewer(99L, req, admin));
    }

    @Test
    void assignReviewer_reviewerNotFound_throwsResourceNotFound() {
        when(mcqRepository.findById(10L)).thenReturn(Optional.of(mcqReadyForReview));
        when(userRepository.findById(99L)).thenReturn(Optional.empty());
        AssignReviewerRequest req = new AssignReviewerRequest();
        req.setReviewerId(99L);
        assertThrows(ResourceNotFoundException.class, () -> adminService.assignReviewer(10L, req, admin));
    }

    @Test
    void assignReviewer_notifiesReviewer() {
        User reviewer = User.builder().id(3L).enterpriseId("rev").fullName("Reviewer")
                .role(Role.SME).techStacks(Collections.singletonList(techStack)).build();
        when(mcqRepository.findById(10L)).thenReturn(Optional.of(mcqReadyForReview));
        when(userRepository.findById(3L)).thenReturn(Optional.of(reviewer));
        when(mcqRepository.save(any())).thenReturn(mcqReadyForReview);
        when(mcqService.toResponse(any())).thenReturn(McqResponse.builder().id(10L).status(McqStatus.UNDER_REVIEW).build());
        AssignReviewerRequest req = new AssignReviewerRequest();
        req.setReviewerId(3L);
        adminService.assignReviewer(10L, req, admin);
        verify(notificationService).notify(eq(reviewer), any(), eq("ASSIGNED"), any(), any(), any());
    }

    // ─── CHANGE ROLE ─────────────────────────────────────────────────────────

    @Test
    void changeUserRole_toAdmin_updatesRoleAndResetsPassword() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(sme));
        UserSummary result = adminService.changeUserRole(2L, "ADMIN", admin);
        assertEquals("ADMIN", result.getRole());
        assertTrue(realEncoder.matches("Admin@123", sme.getPasswordHash()));
    }

    @Test
    void changeUserRole_toSme_resetsToSmePassword() {
        User existingAdmin = User.builder().id(3L).enterpriseId("other.admin")
                .role(Role.ADMIN).approved(true).techStacks(new ArrayList<>()).build();
        when(userRepository.findById(3L)).thenReturn(Optional.of(existingAdmin));
        adminService.changeUserRole(3L, "SME", admin);
        assertTrue(realEncoder.matches("Sme@1234", existingAdmin.getPasswordHash()));
    }

    @Test
    void changeUserRole_selfChange_throwsBadRequest() {
        assertThrows(BadRequestException.class, () -> adminService.changeUserRole(1L, "SME", admin));
    }

    @Test
    void changeUserRole_userNotFound_throwsResourceNotFound() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> adminService.changeUserRole(99L, "SME", admin));
    }

    @Test
    void changeUserRole_invalidRole_throwsBadRequest() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(sme));
        assertThrows(BadRequestException.class, () -> adminService.changeUserRole(2L, "SUPERUSER", admin));
    }

    @Test
    void changeUserRole_savesAuditLog() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(sme));
        adminService.changeUserRole(2L, "ADMIN", admin);
        verify(auditLogRepository).save(any());
    }

    // ─── GET ELIGIBLE REVIEWERS ───────────────────────────────────────────────

    @Test
    void getEligibleReviewers_excludesCreator() {
        when(mcqRepository.findById(10L)).thenReturn(Optional.of(mcqReadyForReview));
        when(userRepository.findAll()).thenReturn(Arrays.asList(sme, admin));
        // sme is the creator — should be excluded. admin has no matching tech stack — also excluded.
        List<UserSummary> result = adminService.getEligibleReviewers(10L);
        assertTrue(result.stream().noneMatch(u -> u.getEnterpriseId().equals("sme")));
    }

    @Test
    void getEligibleReviewers_onlyReturnsTechStackMatch() {
        TechStack other = TechStack.builder().id(99L).name("Python").build();
        User pythonDev = User.builder().id(4L).enterpriseId("python.dev").fullName("Python Dev")
                .role(Role.SME).techStacks(Collections.singletonList(other)).build();
        when(mcqRepository.findById(10L)).thenReturn(Optional.of(mcqReadyForReview));
        when(userRepository.findAll()).thenReturn(Arrays.asList(sme, pythonDev));
        List<UserSummary> result = adminService.getEligibleReviewers(10L);
        assertTrue(result.stream().noneMatch(u -> u.getEnterpriseId().equals("python.dev")));
    }

    @Test
    void getEligibleReviewers_mcqNotFound_throwsResourceNotFound() {
        when(mcqRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> adminService.getEligibleReviewers(99L));
    }

    // ─── GET ALL USERS ────────────────────────────────────────────────────────

    @Test
    void getAllUsers_returnsAllUsers() {
        when(userRepository.findAll()).thenReturn(Arrays.asList(admin, sme));
        List<UserSummary> result = adminService.getAllUsers();
        assertEquals(2, result.size());
    }

    @Test
    void getAllUsers_unapprovedUser_roleIsPending() {
        User pending = User.builder().id(5L).enterpriseId("pending.user").fullName("Pending")
                .email("p@test.com").role(Role.SME).approved(false)
                .techStacks(new ArrayList<>()).build();
        when(userRepository.findAll()).thenReturn(Collections.singletonList(pending));
        List<UserSummary> result = adminService.getAllUsers();
        assertEquals("PENDING", result.get(0).getRole());
        assertFalse(result.get(0).isApproved());
    }

    // ─── APPROVE USER ─────────────────────────────────────────────────────────

    @Test
    void approveUser_setsApprovedTrueAndSavesAuditLog() {
        User pending = User.builder().id(5L).enterpriseId("pending.user").fullName("Pending")
                .email("p@test.com").role(Role.SME).approved(false)
                .techStacks(new ArrayList<>()).build();
        when(userRepository.findById(5L)).thenReturn(Optional.of(pending));
        adminService.approveUser(5L, admin);
        assertTrue(pending.isApproved());
        verify(userRepository).save(pending);
        verify(auditLogRepository).save(any());
    }

    @Test
    void approveUser_userNotFound_throwsResourceNotFound() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> adminService.approveUser(99L, admin));
    }

    // ─── REJECT USER ──────────────────────────────────────────────────────────

    @Test
    void rejectUser_deletesUserAndSavesAuditLog() {
        User pending = User.builder().id(5L).enterpriseId("pending.user").fullName("Pending")
                .email("p@test.com").role(Role.SME).approved(false)
                .techStacks(new ArrayList<>()).build();
        when(userRepository.findById(5L)).thenReturn(Optional.of(pending));
        adminService.rejectUser(5L, admin);
        verify(userRepository).delete(pending);
        verify(auditLogRepository).save(any());
    }

    @Test
    void rejectUser_userNotFound_throwsResourceNotFound() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> adminService.rejectUser(99L, admin));
    }

    // ─── ADD USER ─────────────────────────────────────────────────────────────

    @Test
    void addUser_validRequest_createsUserAndAuditLog() {
        when(userRepository.existsByEnterpriseId("new.user")).thenReturn(false);
        when(techStackRepository.findById(1L)).thenReturn(Optional.of(techStack));

        AddUserRequest req = new AddUserRequest();
        req.setEnterpriseId("new.user");
        req.setFullName("New User");
        req.setEmail("new@example.com");
        req.setRole("SME");
        req.setTechStackIds(Collections.singletonList(1L));

        UserSummary result = adminService.addUser(req, admin);
        assertEquals("new.user", result.getEnterpriseId());
        verify(userRepository).save(any());
        verify(auditLogRepository).save(any());
    }

    @Test
    void addUser_noTechStacks_createsUserWithEmptyList() {
        when(userRepository.existsByEnterpriseId("new.user")).thenReturn(false);
        AddUserRequest req = new AddUserRequest();
        req.setEnterpriseId("new.user");
        req.setFullName("New User");
        req.setEmail("new@example.com");
        req.setRole("ADMIN");
        req.setTechStackIds(null);
        UserSummary result = adminService.addUser(req, admin);
        assertEquals("new.user", result.getEnterpriseId());
        assertEquals("ADMIN", result.getRole());
    }

    @Test
    void addUser_duplicateEnterpriseId_throwsBadRequest() {
        when(userRepository.existsByEnterpriseId("sme")).thenReturn(true);
        AddUserRequest req = new AddUserRequest();
        req.setEnterpriseId("sme");
        req.setFullName("Duplicate");
        req.setEmail("dup@example.com");
        req.setRole("SME");
        assertThrows(BadRequestException.class, () -> adminService.addUser(req, admin));
    }

    @Test
    void addUser_invalidRole_throwsBadRequest() {
        when(userRepository.existsByEnterpriseId("new.user")).thenReturn(false);
        AddUserRequest req = new AddUserRequest();
        req.setEnterpriseId("new.user");
        req.setFullName("New User");
        req.setEmail("new@example.com");
        req.setRole("SUPERUSER");
        assertThrows(BadRequestException.class, () -> adminService.addUser(req, admin));
    }

    // ─── DELETE MCQ ───────────────────────────────────────────────────────────

    @Test
    void deleteMcq_validId_deletesMcq() {
        when(mcqRepository.findById(10L)).thenReturn(Optional.of(mcqReadyForReview));
        adminService.deleteMcq(10L);
        verify(mcqRepository).delete(mcqReadyForReview);
    }

    @Test
    void deleteMcq_notFound_throwsResourceNotFound() {
        when(mcqRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> adminService.deleteMcq(99L));
    }

    // ─── GET AUDIT LOG ────────────────────────────────────────────────────────

    @Test
    void getAuditLog_returnsAllLogsInOrder() {
        AuditLog log = AuditLog.builder()
                .id(1L).actorEnterpriseId("admin").action("USER_APPROVED")
                .targetEnterpriseId("sme").details("Account approved")
                .timestamp(java.time.LocalDateTime.now()).build();
        when(auditLogRepository.findAllByOrderByTimestampDesc())
                .thenReturn(Collections.singletonList(log));
        List<AuditLogResponse> result = adminService.getAuditLog();
        assertEquals(1, result.size());
        assertEquals("USER_APPROVED", result.get(0).getAction());
        assertEquals("admin", result.get(0).getActorEnterpriseId());
    }

    @Test
    void getAuditLog_emptyRepository_returnsEmptyList() {
        when(auditLogRepository.findAllByOrderByTimestampDesc())
                .thenReturn(Collections.emptyList());
        List<AuditLogResponse> result = adminService.getAuditLog();
        assertTrue(result.isEmpty());
    }
}
