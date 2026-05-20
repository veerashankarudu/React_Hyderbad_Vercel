package com.accenture.quizhub.controller;

import com.accenture.quizhub.entity.User;
import com.accenture.quizhub.exception.ResourceNotFoundException;
import com.accenture.quizhub.repository.UserRepository;
import com.accenture.quizhub.service.BulkUploadService;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/upload")
@RequiredArgsConstructor
public class UploadController {

    private final BulkUploadService bulkUploadService;
    private final UserRepository userRepository;

    @PostMapping("/bulk")
    public ResponseEntity<Map<String, Object>> bulkUpload(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal String enterpriseId) throws IOException {
        User user = userRepository.findByEnterpriseId(enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return ResponseEntity.ok(bulkUploadService.processUpload(file, user));
    }

    @GetMapping("/template")
    public ResponseEntity<byte[]> downloadTemplate() throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Template_MCQs");

            // Header row
            String[] headers = {
                "Question_id", "Technology_Stack", "Topic", "Difficulty",
                "Question_Stem", "Option_A", "Option_B", "Option_C", "Option_D", "Correct_Answer"
            };
            CellStyle headerStyle = workbook.createCellStyle();
            Font font = workbook.createFont();
            font.setBold(true);
            headerStyle.setFont(font);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, 6000);
            }

            // Sample row
            String[] sample = {
                "1001", "Spring Boot", "Auto Configuration", "MEDIUM",
                "What does @SpringBootApplication combine?",
                "@Component only", "@Configuration, @EnableAutoConfiguration and @ComponentScan",
                "@Bean only", "@Controller only", "B"
            };
            Row sampleRow = sheet.createRow(1);
            for (int i = 0; i < sample.length; i++) {
                sampleRow.createCell(i).setCellValue(sample[i]);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            byte[] bytes = out.toByteArray();

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"Template_MCQs.xlsx\"")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .contentLength(bytes.length)
                    .body(bytes);
        }
    }
}
