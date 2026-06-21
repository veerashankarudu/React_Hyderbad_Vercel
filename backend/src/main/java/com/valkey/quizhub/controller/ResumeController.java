package com.valkey.quizhub.controller;

import com.valkey.quizhub.service.AIService;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/resume")
@RequiredArgsConstructor
public class ResumeController {

    private final AIService aiService;

    @PostMapping("/analyze")
    public ResponseEntity<Map<String, Object>> analyzeResume(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "jobRole", required = false) String jobRole,
            @RequestParam(value = "jobDescription", required = false) String jobDescription) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No file uploaded"));
        }

        String filename = file.getOriginalFilename();
        if (filename == null) filename = "";
        String lower = filename.toLowerCase();

        if (!lower.endsWith(".pdf") && !lower.endsWith(".docx") && !lower.endsWith(".doc") && !lower.endsWith(".txt")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Unsupported file type. Please upload PDF, DOCX, or TXT."));
        }

        try {
            String text = extractText(file, lower);
            if (text == null || text.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Could not extract text from the uploaded file."));
            }

            Map<String, Object> result = aiService.analyzeResume(text, jobRole, jobDescription);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to process resume: " + e.getMessage()));
        }
    }

    private String extractText(MultipartFile file, String lowerName) throws Exception {
        if (lowerName.endsWith(".pdf")) {
            return extractPdfText(file);
        } else if (lowerName.endsWith(".docx")) {
            return extractDocxText(file);
        } else {
            return new String(file.getBytes());
        }
    }

    private String extractPdfText(MultipartFile file) throws Exception {
        try (PDDocument doc = Loader.loadPDF(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(doc);
        }
    }

    private String extractDocxText(MultipartFile file) throws Exception {
        try (InputStream is = file.getInputStream();
             XWPFDocument doc = new XWPFDocument(is)) {
            return doc.getParagraphs().stream()
                    .map(XWPFParagraph::getText)
                    .collect(Collectors.joining("\n"));
        }
    }
}
