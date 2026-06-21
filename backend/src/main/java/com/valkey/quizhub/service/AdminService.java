package com.valkey.quizhub.service;

import com.valkey.quizhub.dto.request.AssignReviewerRequest;
import com.valkey.quizhub.dto.request.AddUserRequest;
import com.valkey.quizhub.dto.request.ReviewRequest;
import com.valkey.quizhub.dto.response.McqResponse;
import com.valkey.quizhub.dto.response.AuditLogResponse;
import com.valkey.quizhub.dto.response.UserSummary;
import com.valkey.quizhub.entity.*;
import com.valkey.quizhub.enums.McqStatus;
import com.valkey.quizhub.enums.Role;
import com.valkey.quizhub.exception.BadRequestException;
import com.valkey.quizhub.exception.ResourceNotFoundException;
import com.valkey.quizhub.repository.*;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final McqRepository mcqRepository;
    private final UserRepository userRepository;
    private final ReviewCommentRepository reviewCommentRepository;
    private final McqService mcqService;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final AuditLogRepository auditLogRepository;
    private final TechStackRepository techStackRepository;
    private final PasswordEncoder passwordEncoder;
    private final InboxMessageService inboxMessageService;

    @Transactional(readOnly = true)
    public Page<McqResponse> getAllMcqs(McqStatus status, String search, Long techStackId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("updatedAt").descending());
        // Admin cannot see DRAFT MCQs — Draft is accessible only to the creator (spec requirement)
        Page<Mcq> mcqs = mcqRepository.findAll((root, query, cb) -> {
            var predicates = new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();
            // Always exclude DRAFT from admin view
            predicates.add(cb.notEqual(root.get("status"), McqStatus.DRAFT));
            // Apply optional filters on top
            if (status != null && status != McqStatus.DRAFT) predicates.add(cb.equal(root.get("status"), status));
            if (techStackId != null) predicates.add(cb.equal(root.get("techStack").get("id"), techStackId));
            if (search != null && !search.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("questionStem")), "%" + search.toLowerCase() + "%"));
            }
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        }, pageable);
        return mcqs.map(mcqService::toResponse);
    }

    @Transactional
    public McqResponse assignReviewer(Long mcqId, AssignReviewerRequest request, User admin) {
        Mcq mcq = mcqRepository.findById(mcqId)
                .orElseThrow(() -> new ResourceNotFoundException("MCQ not found"));

        if (mcq.getStatus() != McqStatus.READY_FOR_REVIEW) {
            throw new BadRequestException("MCQ must be in READY_FOR_REVIEW state to assign reviewer");
        }

        User reviewer = userRepository.findById(request.getReviewerId())
                .orElseThrow(() -> new ResourceNotFoundException("Reviewer not found"));

        if (reviewer.getId().equals(mcq.getCreator().getId())) {
            throw new BadRequestException("Reviewer cannot be the same as the creator");
        }

        // Reviewer must share a tech stack with the MCQ
        boolean hasMatchingStack = reviewer.getTechStacks().stream()
                .anyMatch(ts -> ts.getId().equals(mcq.getTechStack().getId()));
        if (!hasMatchingStack) {
            throw new BadRequestException("Reviewer does not have expertise in the MCQ's tech stack");
        }

        mcq.setReviewer(reviewer);
        mcq.setStatus(McqStatus.UNDER_REVIEW);
        McqResponse saved = mcqService.toResponse(mcqRepository.save(mcq));

        String preview = mcq.getQuestionStem().length() > 70
                ? mcq.getQuestionStem().substring(0, 70) + "..."
                : mcq.getQuestionStem();
        String mcqRef = mcq.getTechStack() != null
                ? mcq.getTechStack().getName().toUpperCase().replace(" ", "-") + "-" + mcq.getId()
                : "MCQ-" + mcq.getId();
        notificationService.notify(reviewer,
                preview,
                "ASSIGNED", mcq.getId(), admin, mcqRef);
        emailService.sendReviewerAssignedEmail(mcq, reviewer, admin);
        inboxMessageService.sendSystem(
            reviewer,
            "📋 New MCQ Assigned for Review — " + mcqRef,
            "Hi " + reviewer.getFullName() + ",\n\n" +
            "You have been assigned to review a new MCQ.\n\n" +
            "MCQ: " + preview + "\n" +
            "Tech Stack: " + (mcq.getTechStack() != null ? mcq.getTechStack().getName() : "N/A") + "\n" +
            "Assigned by: " + admin.getFullName() + "\n\n" +
            "Please log in and go to Pending Reviews to action this.\n\n— QuizHub AI",
            mcq.getId()
        );

        return saved;
    }

    @Transactional(readOnly = true)
    public List<UserSummary> getEligibleReviewers(Long mcqId) {
        Mcq mcq = mcqRepository.findById(mcqId)
                .orElseThrow(() -> new ResourceNotFoundException("MCQ not found"));

        return userRepository.findAll().stream()
                .filter(u -> !u.getId().equals(mcq.getCreator().getId()))
                .filter(u -> u.getTechStacks().stream()
                        .anyMatch(ts -> ts.getId().equals(mcq.getTechStack().getId())))
                .map(u -> UserSummary.builder()
                        .id(u.getId())
                        .enterpriseId(u.getEnterpriseId())
                        .fullName(u.getFullName())
                        .role(u.getRole().name())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public UserSummary changeUserRole(Long userId, String roleStr, User admin) {
        if (admin.getId().equals(userId)) {
            throw new BadRequestException("You cannot change your own role");
        }
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Role newRole;
        try {
            newRole = Role.valueOf(roleStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid role: " + roleStr);
        }
        target.setRole(newRole);
        // Reset password to match the new role's standard demo password
        String rolePassword = newRole == Role.ADMIN ? "Admin@123" : "Sme@1234";
        target.setPasswordHash(passwordEncoder.encode(rolePassword));
        userRepository.save(target);
        auditLogRepository.save(AuditLog.builder()
                .actorEnterpriseId(admin.getEnterpriseId())
                .action("ROLE_CHANGED")
                .targetEnterpriseId(target.getEnterpriseId())
                .details("Role changed to " + newRole.name())
                .timestamp(LocalDateTime.now())
                .build());
        return toSummary(target);
    }

    @Transactional(readOnly = true)
    public List<UserSummary> getAllUsers() {
        return userRepository.findAll().stream()
                .map(u -> UserSummary.builder()
                        .id(u.getId())
                        .enterpriseId(u.getEnterpriseId())
                        .fullName(u.getFullName())
                        .email(u.getEmail())
                        .role(u.isApproved() ? u.getRole().name() : "PENDING")
                        .approved(u.isApproved())
                        .techStacks(u.getTechStacks().stream()
                                .map(ts -> ts.getName())
                                .distinct()
                                .collect(Collectors.toList()))
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public UserSummary approveUser(Long userId, User admin) {
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        target.setApproved(true);
        userRepository.save(target);
        auditLogRepository.save(AuditLog.builder()
                .actorEnterpriseId(admin.getEnterpriseId())
                .action("USER_APPROVED")
                .targetEnterpriseId(target.getEnterpriseId())
                .details("Account approved")
                .timestamp(LocalDateTime.now())
                .build());
        return toSummary(target);
    }

    @Transactional
    public void rejectUser(Long userId, User admin) {
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        String eid = target.getEnterpriseId();
        userRepository.delete(target);
        auditLogRepository.save(AuditLog.builder()
                .actorEnterpriseId(admin.getEnterpriseId())
                .action("USER_REJECTED")
                .targetEnterpriseId(eid)
                .details("Registration rejected and account deleted")
                .timestamp(LocalDateTime.now())
                .build());
    }

    @Transactional
    public UserSummary addUser(AddUserRequest request, User admin) {
        if (userRepository.existsByEnterpriseId(request.getEnterpriseId())) {
            throw new BadRequestException("Enterprise ID already exists: " + request.getEnterpriseId());
        }
        Role role;
        try { role = Role.valueOf(request.getRole().toUpperCase()); }
        catch (IllegalArgumentException e) { throw new BadRequestException("Invalid role: " + request.getRole()); }

        List<TechStack> techStacks = new ArrayList<>();
        if (request.getTechStackIds() != null) {
            for (Long tsId : request.getTechStackIds()) {
                techStackRepository.findById(tsId).ifPresent(techStacks::add);
            }
        }
        User user = User.builder()
                .enterpriseId(request.getEnterpriseId())
                .fullName(request.getFullName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode("Welcome@123"))
                .role(role)
                .approved(true)
                .techStacks(techStacks)
                .build();
        userRepository.save(user);
        auditLogRepository.save(AuditLog.builder()
                .actorEnterpriseId(admin.getEnterpriseId())
                .action("USER_ADDED_BY_ADMIN")
                .targetEnterpriseId(user.getEnterpriseId())
                .details("Created with role " + role.name())
                .timestamp(LocalDateTime.now())
                .build());
        return toSummary(user);
    }

    @Transactional
    public void deleteMcq(Long id) {
        Mcq mcq = mcqRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MCQ not found"));
        mcqRepository.delete(mcq);
    }

    @Transactional(readOnly = true)
    public List<AuditLogResponse> getAuditLog() {
        return auditLogRepository.findAllByOrderByTimestampDesc().stream()
                .map(a -> AuditLogResponse.builder()
                        .id(a.getId())
                        .actorEnterpriseId(a.getActorEnterpriseId())
                        .action(a.getAction())
                        .targetEnterpriseId(a.getTargetEnterpriseId())
                        .details(a.getDetails())
                        .timestamp(a.getTimestamp())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public byte[] exportMcqsToExcel(McqStatus status, Long techStackId, User actor) throws IOException {
        // Fetch matching MCQs
        List<Mcq> mcqs;
        if (status != null || techStackId != null) {
            mcqs = mcqRepository.findAll((root, query, cb) -> {
                var predicates = new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();
                if (status != null) predicates.add(cb.equal(root.get("status"), status));
                if (techStackId != null) predicates.add(cb.equal(root.get("techStack").get("id"), techStackId));
                return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
            });
        } else {
            mcqs = mcqRepository.findAll();
        }

        // Build Excel
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("MCQs");
            String[] headers = {"ID", "Tech Stack", "Topic", "Difficulty", "Status",
                    "Question", "Option A", "Option B", "Option C", "Option D",
                    "Correct Answer", "Creator", "Reviewer", "AI Score", "AI Risk", "Created At"};

            CellStyle headerStyle = workbook.createCellStyle();
            Font hFont = workbook.createFont();
            hFont.setBold(true);
            hFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(hFont);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, i == 5 ? 12000 : 5500);
            }

            int rowNum = 1;
            for (Mcq m : mcqs) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(m.getId());
                row.createCell(1).setCellValue(m.getTechStack() != null ? m.getTechStack().getName() : "");
                row.createCell(2).setCellValue(m.getTopic() != null ? m.getTopic().getName() : "");
                row.createCell(3).setCellValue(m.getDifficulty() != null ? m.getDifficulty().name() : "");
                row.createCell(4).setCellValue(m.getStatus() != null ? m.getStatus().name() : "");
                row.createCell(5).setCellValue(m.getQuestionStem());
                row.createCell(6).setCellValue(m.getOptionA());
                row.createCell(7).setCellValue(m.getOptionB());
                row.createCell(8).setCellValue(m.getOptionC());
                row.createCell(9).setCellValue(m.getOptionD());
                row.createCell(10).setCellValue(m.getCorrectAnswer());
                row.createCell(11).setCellValue(m.getCreator() != null ? m.getCreator().getFullName() : "");
                row.createCell(12).setCellValue(m.getReviewer() != null ? m.getReviewer().getFullName() : "");
                row.createCell(13).setCellValue(m.getAiScore() != null ? m.getAiScore() : 0);
                row.createCell(14).setCellValue(m.getAiRisk() != null ? m.getAiRisk() : "");
                row.createCell(15).setCellValue(m.getCreatedAt() != null ? m.getCreatedAt().toString() : "");
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            byte[] bytes = out.toByteArray();

            // Audit log
            String filterDesc = "Total: " + mcqs.size() +
                    (status != null ? ", Status: " + status.name() : "") +
                    (techStackId != null ? ", TechStack: " + techStackId : "");
            auditLogRepository.save(AuditLog.builder()
                    .actorEnterpriseId(actor.getEnterpriseId())
                    .action("MCQ_EXPORT")
                    .targetEnterpriseId(null)
                    .details(filterDesc)
                    .timestamp(LocalDateTime.now())
                    .build());

            // Notify all admins
            userRepository.findAll().stream()
                    .filter(u -> u.getRole() == Role.ADMIN)
                    .forEach(admin -> notificationService.notify(admin,
                            actor.getFullName() + " downloaded " + mcqs.size() + " MCQ(s)" +
                                    (status != null ? " [" + status.name() + "]" : ""),
                            "DOWNLOAD", null, actor, null));

            return bytes;
        }
    }

    private UserSummary toSummary(User u) {
        return UserSummary.builder()
                .id(u.getId())
                .enterpriseId(u.getEnterpriseId())
                .fullName(u.getFullName())
                .email(u.getEmail())
                .role(u.isApproved() ? u.getRole().name() : "PENDING")
                .approved(u.isApproved())
                .techStacks(u.getTechStacks() == null ? List.of() : u.getTechStacks().stream()
                        .map(ts -> ts.getName()).distinct().collect(Collectors.toList()))
                .build();
    }
}
