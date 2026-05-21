package com.accenture.quizhub.service;

import com.accenture.quizhub.entity.*;
import com.accenture.quizhub.enums.Difficulty;
import com.accenture.quizhub.enums.McqStatus;
import com.accenture.quizhub.exception.BadRequestException;
import com.accenture.quizhub.repository.*;
import lombok.RequiredArgsConstructor;
import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvException;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BulkUploadService {

    private final McqRepository mcqRepository;
    private final TechStackRepository techStackRepository;
    private final TopicRepository topicRepository;
    private final McqService mcqService;
    private final AIService aiService;

    @Value("${app.upload.max-rows:500}")
    private int maxRows;

    @Transactional
    public Map<String, Object> processUpload(MultipartFile file, User uploader) throws IOException {
        String filename = file.getOriginalFilename();
        if (filename == null) throw new BadRequestException("Invalid file");

        String lower = filename.toLowerCase();
        List<String[]> rows;
        if (lower.endsWith(".csv")) {
            rows = parseCsv(file.getInputStream());
        } else if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
            rows = parseExcel(file.getInputStream());
        } else {
            throw new BadRequestException("Only CSV and XLSX files are supported");
        }

        if (rows.size() > maxRows) {
            throw new BadRequestException("File exceeds maximum of " + maxRows + " rows");
        }

        int success = 0;
        int failed = 0;
        List<Map<String, String>> errors = new ArrayList<>();
        List<Map<String, String>> imported = new ArrayList<>();

        for (int i = 0; i < rows.size(); i++) {
            String[] row = rows.get(i);
            int lineNum = i + 2; // 1-based, accounting for header

            // Pre-extract all columns for error reporting (so the frontend can pre-fill an inline edit form)
            final String rowTechStack  = row.length > 1 ? row[1].trim() : "";
            final String rowTopic      = row.length > 2 ? row[2].trim() : "";
            final String rowDifficulty = row.length > 3 ? row[3].trim() : "";
            final String rowStem       = row.length > 4 ? row[4].trim() : "";
            final String rowOptA       = row.length > 5 ? row[5].trim() : "";
            final String rowOptB       = row.length > 6 ? row[6].trim() : "";
            final String rowOptC       = row.length > 7 ? row[7].trim() : "";
            final String rowOptD       = row.length > 8 ? row[8].trim() : "";
            final String rowAnswer     = row.length > 9 ? row[9].trim() : "";

            try {
                // Columns: Question ID (A, ignored), Tech Stack (B), Topic (C), Difficulty (D),
                //          Question Stem (E), Option A (F), Option B (G), Option C (H), Option D (I), Correct Answer (J)
                if (row.length < 10) throw new BadRequestException("Row has insufficient columns");

                // col 0 = Question ID (ignored)
                String techStackName = rowTechStack;
                String topicName = rowTopic;
                String difficultyStr = rowDifficulty.toUpperCase();
                String questionStem = rowStem;
                String optA = rowOptA;
                String optB = rowOptB;
                String optC = rowOptC;
                String optD = rowOptD;
                String correctAns = rowAnswer.toUpperCase();

                if (questionStem.isBlank()) throw new BadRequestException("Question stem is empty");
                if (optA.isBlank()) throw new BadRequestException("Option A is required");
                if (optB.isBlank()) throw new BadRequestException("Option B is required");
                if (optC.isBlank()) throw new BadRequestException("Option C is required");
                if (optD.isBlank()) throw new BadRequestException("Option D is required");
                if (!correctAns.matches("[ABCD]")) throw new BadRequestException("Correct answer must be A, B, C or D");

                // Duplicate detection — skip if same question stem already exists
                if (mcqRepository.existsByQuestionStemIgnoreCase(questionStem)) {
                    Long dupId = mcqRepository.findFirstByQuestionStemIgnoreCase(questionStem)
                            .map(com.accenture.quizhub.entity.Mcq::getId).orElse(null);
                    String msg = dupId != null
                            ? "DUPLICATE:" + dupId + ":Duplicate question — already exists in the database"
                            : "Duplicate question — already exists in the database";
                    throw new BadRequestException(msg);
                }

                Difficulty difficulty = Difficulty.valueOf(difficultyStr);

                TechStack techStack = techStackRepository.findByNameIgnoreCase(techStackName)
                        .orElseThrow(() -> new BadRequestException("Unknown tech stack: " + techStackName));

                Topic topic = null;
                if (!topicName.isBlank()) {
                    topic = topicRepository.findByNameIgnoreCaseAndTechStackId(topicName, techStack.getId())
                            .orElse(null);
                }

                // AI similarity check — block if any existing question >= 30% similar
                List<Mcq> pool = mcqRepository.findAll().stream()
                        .filter(m -> m.getStatus() != McqStatus.REJECTED)
                        .filter(m -> m.getTechStack() != null && m.getTechStack().getId().equals(techStack.getId()))
                        .limit(50)
                        .collect(Collectors.toList());
                List<Map<String, Object>> similar = aiService.checkDuplicateAgainstDb(questionStem, pool);
                Optional<Map<String, Object>> topMatch = similar.stream()
                        .filter(r -> !r.containsKey("error"))
                        .filter(r -> r.get("similarityPercent") != null
                                && ((Number) r.get("similarityPercent")).intValue() >= 30)
                        .findFirst();
                if (topMatch.isPresent()) {
                    Map<String, Object> match = topMatch.get();
                    int pct = ((Number) match.get("similarityPercent")).intValue();
                    Object matchId = match.get("id");
                    throw new BadRequestException("SIMILAR:" + matchId + ":" + pct + "%:AI detected "
                            + pct + "% similarity with existing MCQ #" + matchId);
                }

                Mcq mcq = new Mcq();
                mcq.setQuestionStem(questionStem);
                mcq.setOptionA(optA);
                mcq.setOptionB(optB);
                mcq.setOptionC(optC);
                mcq.setOptionD(optD);
                mcq.setCorrectAnswer(correctAns.substring(0, 1));
                mcq.setDifficulty(difficulty);
                mcq.setTechStack(techStack);
                mcq.setTopic(topic);
                mcq.setCreator(uploader);
                mcq.setStatus(McqStatus.DRAFT);
                mcqRepository.save(mcq);
                success++;
                Map<String, String> ok = new HashMap<>();
                ok.put("row", String.valueOf(lineNum));
                ok.put("stem", questionStem.length() > 80 ? questionStem.substring(0, 80) + "…" : questionStem);
                ok.put("techStack", techStackName);
                ok.put("topic", topicName);
                imported.add(ok);

            } catch (Exception e) {
                failed++;
                Map<String, String> err = new HashMap<>();
                err.put("row", String.valueOf(lineNum));
                err.put("error", e.getMessage());
                err.put("techStack", rowTechStack);
                err.put("topic", rowTopic);
                err.put("difficulty", rowDifficulty.isEmpty() ? "MEDIUM" : rowDifficulty.toUpperCase());
                err.put("questionStem", rowStem);
                err.put("optionA", rowOptA);
                err.put("optionB", rowOptB);
                err.put("optionC", rowOptC);
                err.put("optionD", rowOptD);
                err.put("correctAnswer", rowAnswer.toUpperCase());
                errors.add(err);
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("totalRows", rows.size());
        result.put("success", success);
        result.put("failed", failed);
        result.put("errors", errors);
        result.put("importedRows", imported);
        return result;
    }

    private List<String[]> parseCsv(InputStream is) throws IOException {
        try (CSVReader reader = new CSVReader(new InputStreamReader(is))) {
            List<String[]> all = reader.readAll();
            // Skip header row (first row)
            if (all.size() > 1) {
                return all.subList(1, all.size());
            }
            return new ArrayList<>();
        } catch (CsvException e) {
            throw new IOException("Failed to parse CSV: " + e.getMessage(), e);
        }
    }

    private List<String[]> parseExcel(InputStream is) throws IOException {
        List<String[]> rows = new ArrayList<>();
        try (Workbook workbook = new XSSFWorkbook(is)) {
            Sheet sheet = workbook.getSheetAt(0);
            int firstRow = sheet.getFirstRowNum() + 1; // skip header
            for (int i = firstRow; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                int lastCol = row.getLastCellNum();
                String[] data = new String[lastCol];
                for (int j = 0; j < lastCol; j++) {
                    Cell cell = row.getCell(j);
                    data[j] = cell != null ? cell.toString().trim() : "";
                }
                rows.add(data);
            }
        }
        return rows;
    }
}
