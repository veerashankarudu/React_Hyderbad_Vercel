package com.valkey.quizhub.controller;

import com.valkey.quizhub.entity.Mcq;
import com.valkey.quizhub.entity.User;
import com.valkey.quizhub.enums.McqStatus;
import com.valkey.quizhub.exception.ResourceNotFoundException;
import com.valkey.quizhub.repository.McqRepository;
import com.valkey.quizhub.repository.UserRepository;
import com.valkey.quizhub.service.AppConfigService;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/stats")
@RequiredArgsConstructor
public class StatsController {

    private final McqRepository mcqRepository;
    private final UserRepository userRepository;
    private final AppConfigService appConfigService;

    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private User resolveUser(String enterpriseId) {
        return userRepository.findByEnterpriseId(enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    /**
     * Resolve optional date range — defaults to all-time (epoch → now) if not supplied.
     */
    private LocalDateTime[] resolveDateRange(LocalDate from, LocalDate to) {
        LocalDateTime start = (from != null) ? from.atStartOfDay() : LocalDateTime.of(2000, 1, 1, 0, 0);
        LocalDateTime end   = (to   != null) ? to.plusDays(1).atStartOfDay() : LocalDateTime.now().plusDays(1);
        return new LocalDateTime[]{ start, end };
    }

    /**
     * Global platform stats (admin) or personal stats (SME).
     * Supports optional ?from=YYYY-MM-DD&to=YYYY-MM-DD date filtering.
     */
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getSummary(
            @AuthenticationPrincipal String enterpriseId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        User user = resolveUser(enterpriseId);
        Map<String, Object> result = new LinkedHashMap<>();
        boolean filtered = (from != null || to != null);
        LocalDateTime[] range = resolveDateRange(from, to);
        LocalDateTime start = range[0], end = range[1];

        if ("ADMIN".equals(user.getRole().name())) {
            if (filtered) {
                result.put("totalMcqs", mcqRepository.countByDateRange(start, end));
                result.put("approved",  mcqRepository.countByStatusAndDateRange(McqStatus.APPROVED, start, end));
                result.put("inReview",  mcqRepository.countByStatusAndDateRange(McqStatus.UNDER_REVIEW, start, end)
                                      + mcqRepository.countByStatusAndDateRange(McqStatus.READY_FOR_REVIEW, start, end));
                result.put("rejected",  mcqRepository.countByStatusAndDateRange(McqStatus.REJECTED, start, end));
                result.put("permanentlyRejected", mcqRepository.countByStatusAndDateRange(McqStatus.PERMANENTLY_REJECTED, start, end));
                result.put("draft",     mcqRepository.countByStatusAndDateRange(McqStatus.DRAFT, start, end));
            } else {
                result.put("totalMcqs", mcqRepository.count());
                result.put("approved",  mcqRepository.countByStatus(McqStatus.APPROVED));
                result.put("inReview",  mcqRepository.countByStatus(McqStatus.UNDER_REVIEW)
                                      + mcqRepository.countByStatus(McqStatus.READY_FOR_REVIEW));
                result.put("rejected",  mcqRepository.countByStatus(McqStatus.REJECTED));
                result.put("permanentlyRejected", mcqRepository.countByStatus(McqStatus.PERMANENTLY_REJECTED));
                result.put("draft",     mcqRepository.countByStatus(McqStatus.DRAFT));
            }
        } else {
            Long uid = user.getId();
            if (filtered) {
                result.put("totalMcqs", mcqRepository.countByCreatorIdAndDateRange(uid, start, end));
                result.put("approved",  mcqRepository.countByCreatorIdAndStatusAndDateRange(uid, McqStatus.APPROVED, start, end));
                result.put("inReview",  mcqRepository.countByCreatorIdAndStatusAndDateRange(uid, McqStatus.UNDER_REVIEW, start, end)
                                      + mcqRepository.countByCreatorIdAndStatusAndDateRange(uid, McqStatus.READY_FOR_REVIEW, start, end));
                result.put("rejected",  mcqRepository.countByCreatorIdAndStatusAndDateRange(uid, McqStatus.REJECTED, start, end));
                result.put("permanentlyRejected", mcqRepository.countByCreatorIdAndStatusAndDateRange(uid, McqStatus.PERMANENTLY_REJECTED, start, end));
                result.put("draft",     mcqRepository.countByCreatorIdAndStatusAndDateRange(uid, McqStatus.DRAFT, start, end));
            } else {
                result.put("totalMcqs", mcqRepository.countByCreatorId(uid));
                result.put("approved",  mcqRepository.countByCreatorIdAndStatus(uid, McqStatus.APPROVED));
                result.put("inReview",  mcqRepository.countByCreatorIdAndStatus(uid, McqStatus.UNDER_REVIEW)
                                      + mcqRepository.countByCreatorIdAndStatus(uid, McqStatus.READY_FOR_REVIEW));
                result.put("rejected",  mcqRepository.countByCreatorIdAndStatus(uid, McqStatus.REJECTED));
                result.put("permanentlyRejected", mcqRepository.countByCreatorIdAndStatus(uid, McqStatus.PERMANENTLY_REJECTED));
                result.put("draft",     mcqRepository.countByCreatorIdAndStatus(uid, McqStatus.DRAFT));
            }
        }
        return ResponseEntity.ok(result);
    }

    /**
     * MCQ count per tech stack for bar/pie chart.
     * Supports optional ?from=YYYY-MM-DD&to=YYYY-MM-DD date filtering.
     */
    @GetMapping("/by-tech-stack")
    public ResponseEntity<List<Map<String, Object>>> getByTechStack(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        boolean filtered = (from != null || to != null);
        List<Object[]> rows;
        if (filtered) {
            LocalDateTime[] range = resolveDateRange(from, to);
            rows = mcqRepository.countByTechStackAndDateRange(range[0], range[1]);
        } else {
            rows = mcqRepository.countByTechStack();
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("techStack", row[0]);
            m.put("count", row[1]);
            result.add(m);
        }
        return ResponseEntity.ok(result);
    }

    /**
     * Top 10 reviewers leaderboard.
     */
    @GetMapping("/leaderboard")
    public ResponseEntity<List<Map<String, Object>>> getLeaderboard() {
        List<Object[]> rows = mcqRepository.topReviewers(PageRequest.of(0, 10));
        List<Map<String, Object>> result = new ArrayList<>();
        int rank = 1;
        for (Object[] row : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("rank", rank++);
            m.put("userId", row[0]);
            m.put("fullName", row[1]);
            m.put("enterpriseId", row[2]);
            m.put("reviewCount", row[3]);
            result.add(m);
        }
        return ResponseEntity.ok(result);
    }

    /**
     * Recent activity feed — last 8 MCQ updates.
     */
    @GetMapping("/recent-activity")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getRecentActivity(@AuthenticationPrincipal String enterpriseId) {
        User user = resolveUser(enterpriseId);
        boolean isAdmin = "ADMIN".equals(user.getRole().name());
        List<Mcq> recent = mcqRepository.findRecentActivity(PageRequest.of(0, 8));
        List<Map<String, Object>> result = new ArrayList<>();
        for (Mcq m : recent) {
            if (!isAdmin && !m.getCreator().getId().equals(user.getId())) continue;
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", m.getId());
            item.put("questionStem", m.getQuestionStem().length() > 80
                    ? m.getQuestionStem().substring(0, 80) + "..." : m.getQuestionStem());
            item.put("status", m.getStatus().name());
            item.put("techStack", m.getTechStack() != null ? m.getTechStack().getName() : "");
            item.put("creatorName", m.getCreator().getFullName());
            item.put("updatedAt", m.getUpdatedAt());
            result.add(item);
            if (result.size() >= 6) break;
        }
        return ResponseEntity.ok(result);
    }

    /**
     * Reviewer personal stats dashboard.
     */
    @GetMapping("/reviewer-stats")
    public ResponseEntity<Map<String, Object>> getReviewerStats(@AuthenticationPrincipal String enterpriseId) {
        User user = resolveUser(enterpriseId);
        Map<String, Object> result = new LinkedHashMap<>();

        long totalAssigned = mcqRepository.countByReviewerId(user.getId());
        long approved = mcqRepository.countByReviewerIdAndStatus(user.getId(), McqStatus.APPROVED);
        long rejected = mcqRepository.countByReviewerIdAndStatus(user.getId(), McqStatus.REJECTED);
        long pending = mcqRepository.countByReviewerIdAndStatus(user.getId(), McqStatus.UNDER_REVIEW)
                     + mcqRepository.countByReviewerIdAndStatus(user.getId(), McqStatus.READY_FOR_REVIEW);

        result.put("totalAssigned", totalAssigned);
        result.put("approved", approved);
        result.put("rejected", rejected);
        result.put("pending", pending);
        result.put("approvalRate", totalAssigned > 0 ? Math.round((approved * 100.0) / totalAssigned) : 0);

        List<Object[]> byStack = mcqRepository.countReviewedByTechStack(user.getId());
        List<Map<String, Object>> stackBreakdown = new ArrayList<>();
        for (Object[] row : byStack) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("techStack", row[0]);
            m.put("count", row[1]);
            stackBreakdown.add(m);
        }
        result.put("byTechStack", stackBreakdown);

        return ResponseEntity.ok(result);
    }

    /**
     * All-reviewer performance metrics (Admin view).
     */
    @GetMapping("/reviewer-metrics")
    public ResponseEntity<List<Map<String, Object>>> getReviewerMetrics(@AuthenticationPrincipal String enterpriseId) {
        User user = resolveUser(enterpriseId);
        if (!"ADMIN".equals(user.getRole().name())) {
            return ResponseEntity.status(403).build();
        }
        List<Object[]> rows = mcqRepository.reviewerPerformanceMetrics();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : rows) {
            long total   = ((Number) row[3]).longValue();
            long approved = ((Number) row[4]).longValue();
            long rejected = ((Number) row[5]).longValue();
            long pending  = ((Number) row[6]).longValue();
            long done = approved + rejected;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("userId", row[0]);
            m.put("fullName", row[1]);
            m.put("enterpriseId", row[2]);
            m.put("totalAssigned", total);
            m.put("completed", done);
            m.put("approved", approved);
            m.put("rejected", rejected);
            m.put("pending", pending);
            m.put("approvalRate", done > 0 ? Math.round((approved * 100.0) / done) : 0);
            result.add(m);
        }
        return ResponseEntity.ok(result);
    }

    /**
     * SLA breach: MCQs stuck in READY_FOR_REVIEW / UNDER_REVIEW for > 48 hours.
     */
    @GetMapping("/sla-breach")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getSlaBreached(@AuthenticationPrincipal String enterpriseId) {
        User user = resolveUser(enterpriseId);
        if (!"ADMIN".equals(user.getRole().name())) return ResponseEntity.status(403).build();
        int slaDays = appConfigService.getSlaBreachThresholdDays();
        LocalDateTime threshold = LocalDateTime.now().minusDays(slaDays);
        List<McqStatus> reviewStatuses = List.of(McqStatus.READY_FOR_REVIEW, McqStatus.UNDER_REVIEW);
        List<Mcq> breached = mcqRepository.findSlaBreached(reviewStatuses, threshold);
        List<Map<String, Object>> result = breached.stream().map(m -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", m.getId());
            item.put("questionStem", m.getQuestionStem().length() > 100
                    ? m.getQuestionStem().substring(0, 100) + "…" : m.getQuestionStem());
            item.put("status", m.getStatus().name());
            item.put("techStack", m.getTechStack() != null ? m.getTechStack().getName() : "");
            item.put("creatorName", m.getCreator() != null ? m.getCreator().getFullName() : "");
            item.put("reviewerName", m.getReviewer() != null ? m.getReviewer().getFullName() : "Unassigned");
            item.put("updatedAt", m.getUpdatedAt());
            long hoursStuck = java.time.Duration.between(m.getUpdatedAt(), LocalDateTime.now()).toHours();
            item.put("hoursStuck", hoursStuck);
            item.put("daysStuck", hoursStuck / 24);
            item.put("slaThresholdDays", slaDays);
            return item;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    /**
     * Export analytics report as Excel.
     * Optional ?from=YYYY-MM-DD&to=YYYY-MM-DD for date range.
     * Admin exports all MCQs; SME exports only their own.
     */
    @GetMapping("/export")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> exportAnalytics(
            @AuthenticationPrincipal String enterpriseId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) throws IOException {

        User user = resolveUser(enterpriseId);
        boolean isAdmin = "ADMIN".equals(user.getRole().name());
        LocalDateTime[] range = resolveDateRange(from, to);

        List<Mcq> mcqs;
        if (from != null || to != null) {
            mcqs = mcqRepository.findAllForExport(range[0], range[1]);
        } else {
            mcqs = mcqRepository.findAllForExport();
        }
        // SMEs can only see their own questions
        if (!isAdmin) {
            final Long uid = user.getId();
            mcqs = mcqs.stream().filter(m -> m.getCreator().getId().equals(uid)).collect(Collectors.toList());
        }

        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            // ── Summary sheet ──────────────────────────────────────────────
            Sheet summary = wb.createSheet("Summary");
            CellStyle headerStyle = wb.createCellStyle();
            Font headerFont = wb.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.LAVENDER.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            String rangeLabel = (from != null || to != null)
                    ? (from != null ? from.toString() : "All") + " → " + (to != null ? to.toString() : "Now")
                    : "All Time";

            String[][] summaryData = {
                { "Report",        "QuizHub AI — Analytics Export" },
                { "Generated By",  user.getFullName() + " (" + user.getEnterpriseId() + ")" },
                { "Date Range",    rangeLabel },
                { "Generated At",  LocalDateTime.now().format(DT_FMT) },
                { "", "" },
                { "Metric", "Count" },
                { "Total MCQs",    String.valueOf(mcqs.size()) },
                { "Approved",      String.valueOf(mcqs.stream().filter(m -> m.getStatus() == McqStatus.APPROVED).count()) },
                { "Rejected",      String.valueOf(mcqs.stream().filter(m -> m.getStatus() == McqStatus.REJECTED).count()) },
                { "Under Review",  String.valueOf(mcqs.stream().filter(m -> m.getStatus() == McqStatus.UNDER_REVIEW || m.getStatus() == McqStatus.READY_FOR_REVIEW).count()) },
                { "Draft",         String.valueOf(mcqs.stream().filter(m -> m.getStatus() == McqStatus.DRAFT).count()) },
            };
            for (int i = 0; i < summaryData.length; i++) {
                Row row = summary.createRow(i);
                for (int j = 0; j < summaryData[i].length; j++) {
                    Cell cell = row.createCell(j);
                    cell.setCellValue(summaryData[i][j]);
                    if (i == 5 || i == 0) cell.setCellStyle(headerStyle);
                }
            }
            summary.setColumnWidth(0, 6000);
            summary.setColumnWidth(1, 10000);

            // ── MCQs sheet ─────────────────────────────────────────────────
            Sheet mcqSheet = wb.createSheet("MCQs");
            String[] cols = { "ID", "Question (truncated)", "Tech Stack", "Topic", "Difficulty", "Status",
                               "Creator", "Reviewer", "AI Score", "Created At", "Updated At" };
            Row hdr = mcqSheet.createRow(0);
            for (int i = 0; i < cols.length; i++) {
                Cell c = hdr.createCell(i);
                c.setCellValue(cols[i]);
                c.setCellStyle(headerStyle);
            }
            int rowIdx = 1;
            for (Mcq m : mcqs) {
                Row row = mcqSheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(m.getId());
                String q = m.getQuestionStem();
                row.createCell(1).setCellValue(q.length() > 120 ? q.substring(0, 120) + "…" : q);
                row.createCell(2).setCellValue(m.getTechStack() != null ? m.getTechStack().getName() : "");
                row.createCell(3).setCellValue(m.getTopic() != null ? m.getTopic().getName() : "");
                row.createCell(4).setCellValue(m.getDifficulty() != null ? m.getDifficulty().name() : "");
                row.createCell(5).setCellValue(m.getStatus().name());
                row.createCell(6).setCellValue(m.getCreator() != null ? m.getCreator().getFullName() : "");
                row.createCell(7).setCellValue(m.getReviewer() != null ? m.getReviewer().getFullName() : "");
                row.createCell(8).setCellValue(m.getAiScore() != null ? m.getAiScore().toString() : "");
                row.createCell(9).setCellValue(m.getCreatedAt() != null ? m.getCreatedAt().format(DT_FMT) : "");
                row.createCell(10).setCellValue(m.getUpdatedAt() != null ? m.getUpdatedAt().format(DT_FMT) : "");
            }
            for (int i = 0; i < cols.length; i++) mcqSheet.autoSizeColumn(i);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            String filename = "QuizHub_Analytics_" + LocalDate.now() + ".xlsx";
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(out.toByteArray());
        }
    }
}

