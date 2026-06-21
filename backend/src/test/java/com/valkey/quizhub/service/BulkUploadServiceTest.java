package com.valkey.quizhub.service;

import com.valkey.quizhub.entity.*;
import com.valkey.quizhub.enums.Difficulty;
import com.valkey.quizhub.enums.McqStatus;
import com.valkey.quizhub.enums.Role;
import com.valkey.quizhub.exception.BadRequestException;
import com.valkey.quizhub.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class BulkUploadServiceTest {

    @Mock private McqRepository mcqRepository;
    @Mock private TechStackRepository techStackRepository;
    @Mock private TopicRepository topicRepository;
    @Mock private McqService mcqService;
    @Mock private AIService aiService;
    @InjectMocks private BulkUploadService bulkUploadService;

    private User uploader;
    private TechStack javaStack;

    @BeforeEach
    void setUp() {
        org.springframework.test.util.ReflectionTestUtils.setField(bulkUploadService, "maxRows", 500);

        javaStack = TechStack.builder().id(1L).name("Java").build();
        uploader = User.builder().id(1L).enterpriseId("sme").fullName("SME").role(Role.SME).build();
    }

    private String buildCsvContent(String... dataRows) {
        StringBuilder sb = new StringBuilder();
        sb.append("Question ID,Tech Stack,Topic,Difficulty,Question Stem,Option A,Option B,Option C,Option D,Correct Answer\n");
        for (String row : dataRows) {
            sb.append(row).append("\n");
        }
        return sb.toString();
    }

    // ─── CSV UPLOAD ───────────────────────────────────────────────────────────

    @Test
    void processUpload_validCsv_returnsSuccessCount() throws Exception {
        String csv = buildCsvContent("Q001,Java,Core,EASY,What is Java?,Lang,Coffee,Island,Tool,A");
        MockMultipartFile file = new MockMultipartFile("file", "test.csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8));

        when(techStackRepository.findByNameIgnoreCase("Java")).thenReturn(Optional.of(javaStack));
        when(mcqRepository.existsByQuestionStemIgnoreCase("What is Java?")).thenReturn(false);
        when(topicRepository.findByNameIgnoreCaseAndTechStackId("Core", 1L)).thenReturn(Optional.empty());
        Mcq saved = Mcq.builder().id(1L).questionStem("What is Java?").status(McqStatus.DRAFT)
                .techStack(javaStack).creator(uploader).difficulty(Difficulty.EASY)
                .optionA("Lang").optionB("Coffee").optionC("Island").optionD("Tool")
                .correctAnswer("A").build();
        when(mcqRepository.save(any())).thenReturn(saved);

        var result = bulkUploadService.processUpload(file, uploader);
        assertEquals(1, result.get("success"));
        assertEquals(0, result.get("failed"));
    }

    @Test
    void processUpload_unsupportedFileType_throwsBadRequest() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "test.txt", "text/plain",
                "data".getBytes());
        assertThrows(BadRequestException.class, () -> bulkUploadService.processUpload(file, uploader));
    }

    @Test
    void processUpload_duplicateQuestion_recordsFailure() throws Exception {
        String csv = buildCsvContent("Q001,Java,Core,EASY,What is Java?,Lang,Coffee,Island,Tool,A");
        MockMultipartFile file = new MockMultipartFile("file", "test.csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8));

        when(techStackRepository.findByNameIgnoreCase("Java")).thenReturn(Optional.of(javaStack));
        when(mcqRepository.existsByQuestionStemIgnoreCase("What is Java?")).thenReturn(true);
        when(mcqRepository.findFirstByQuestionStemIgnoreCase("What is Java?"))
                .thenReturn(Optional.of(Mcq.builder().id(5L).build()));
        var result = bulkUploadService.processUpload(file, uploader);
        assertEquals(0, result.get("success"));
        assertEquals(1, result.get("failed"));
    }

    @Test
    void processUpload_unknownTechStack_recordsFailure() throws Exception {
        String csv = buildCsvContent("Q001,UnknownTech,Core,EASY,What is Java?,Lang,Coffee,Island,Tool,A");
        MockMultipartFile file = new MockMultipartFile("file", "test.csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8));

        when(techStackRepository.findByNameIgnoreCase("UnknownTech")).thenReturn(Optional.empty());

        var result = bulkUploadService.processUpload(file, uploader);
        assertEquals(0, result.get("success"));
        assertEquals(1, result.get("failed"));
    }

    @Test
    void processUpload_invalidCorrectAnswer_recordsFailure() throws Exception {
        String csv = buildCsvContent("Q001,Java,Core,EASY,What is Java?,Lang,Coffee,Island,Tool,E");
        MockMultipartFile file = new MockMultipartFile("file", "test.csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8));

        when(techStackRepository.findByNameIgnoreCase("Java")).thenReturn(Optional.of(javaStack));
        when(mcqRepository.existsByQuestionStemIgnoreCase(any())).thenReturn(false);

        var result = bulkUploadService.processUpload(file, uploader);
        assertEquals(0, result.get("success"));
        assertEquals(1, result.get("failed"));
    }

    @Test
    void processUpload_emptyQuestionStem_recordsFailure() throws Exception {
        String csv = buildCsvContent("Q001,Java,Core,EASY, ,Lang,Coffee,Island,Tool,A");
        MockMultipartFile file = new MockMultipartFile("file", "test.csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8));

        when(techStackRepository.findByNameIgnoreCase("Java")).thenReturn(Optional.of(javaStack));
        when(mcqRepository.existsByQuestionStemIgnoreCase(any())).thenReturn(false);

        var result = bulkUploadService.processUpload(file, uploader);
        assertEquals(1, result.get("failed"));
    }

    @Test
    void processUpload_nullFilename_throwsBadRequest() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", (String) null, "text/csv",
                "data".getBytes());
        assertThrows(BadRequestException.class, () -> bulkUploadService.processUpload(file, uploader));
    }

    @Test
    void processUpload_multipleRows_countsBothSuccessAndFailure() throws Exception {
        String csv = buildCsvContent(
                "Q001,Java,Core,EASY,What is Java?,Lang,Coffee,Island,Tool,A",
                "Q002,Java,Core,EASY,What is Java?,Lang,Coffee,Island,Tool,A"  // duplicate
        );
        MockMultipartFile file = new MockMultipartFile("file", "test.csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8));

        when(techStackRepository.findByNameIgnoreCase("Java")).thenReturn(Optional.of(javaStack));
        when(topicRepository.findByNameIgnoreCaseAndTechStackId(any(), any())).thenReturn(Optional.empty());
        // First call false, second call true (simulating duplicate on second row)
        when(mcqRepository.existsByQuestionStemIgnoreCase("What is Java?"))
                .thenReturn(false)
                .thenReturn(true);
        when(mcqRepository.findFirstByQuestionStemIgnoreCase("What is Java?"))
                .thenReturn(Optional.of(Mcq.builder().id(1L).build()));
        Mcq saved = Mcq.builder().id(1L).questionStem("What is Java?").status(McqStatus.DRAFT)
                .techStack(javaStack).creator(uploader).difficulty(Difficulty.EASY)
                .optionA("Lang").optionB("Coffee").optionC("Island").optionD("Tool")
                .correctAnswer("A").build();
        when(mcqRepository.save(any())).thenReturn(saved);

        var result = bulkUploadService.processUpload(file, uploader);
        assertEquals(1, result.get("success"));
        assertEquals(1, result.get("failed"));
    }

    @Test
    void processUpload_insufficientColumns_recordsFailure() throws Exception {
        // Row has only 5 columns (< 10 required)
        String csv = buildCsvContent("Q001,Java,Core,EASY,Short row");
        MockMultipartFile file = new MockMultipartFile("file", "test.csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8));

        var result = bulkUploadService.processUpload(file, uploader);
        assertEquals(0, result.get("success"));
        assertEquals(1, result.get("failed"));
    }

    @Test
    void processUpload_emptyOptionA_recordsFailure() throws Exception {
        // optionA (col 5) is blank
        String csv = buildCsvContent("Q001,Java,Core,EASY,What is Java?, ,Coffee,Island,Tool,A");
        MockMultipartFile file = new MockMultipartFile("file", "test.csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8));

        when(techStackRepository.findByNameIgnoreCase("Java")).thenReturn(Optional.of(javaStack));
        when(mcqRepository.existsByQuestionStemIgnoreCase("What is Java?")).thenReturn(false);

        var result = bulkUploadService.processUpload(file, uploader);
        assertEquals(0, result.get("success"));
        assertEquals(1, result.get("failed"));
    }

    @Test
    void processUpload_invalidDifficulty_recordsFailure() throws Exception {
        // "INVALID" is not a valid Difficulty enum value
        String csv = buildCsvContent("Q001,Java,Core,INVALID,What is Java?,Lang,Coffee,Island,Tool,A");
        MockMultipartFile file = new MockMultipartFile("file", "test.csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8));

        when(techStackRepository.findByNameIgnoreCase("Java")).thenReturn(Optional.of(javaStack));
        when(mcqRepository.existsByQuestionStemIgnoreCase("What is Java?")).thenReturn(false);

        var result = bulkUploadService.processUpload(file, uploader);
        assertEquals(0, result.get("success"));
        assertEquals(1, result.get("failed"));
    }

    @Test
    void processUpload_exceedsMaxRows_throwsBadRequest() throws Exception {
        // Build CSV with 501 data rows (maxRows is set to 500 in setUp)
        String[] rows = new String[501];
        for (int i = 0; i < 501; i++) {
            rows[i] = "Q" + i + ",Java,Core,EASY,Question " + i + "?,Lang,Coffee,Island,Tool,A";
        }
        String csv = buildCsvContent(rows);
        MockMultipartFile file = new MockMultipartFile("file", "big.csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8));

        assertThrows(BadRequestException.class, () -> bulkUploadService.processUpload(file, uploader));
    }

    @Test
    void processUpload_validXlsx_returnsSuccessCount() throws Exception {
        // Build a minimal valid XLSX in memory using Apache POI
        org.apache.poi.xssf.usermodel.XSSFWorkbook workbook =
                new org.apache.poi.xssf.usermodel.XSSFWorkbook();
        org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet();
        // Header row (row 0)
        org.apache.poi.ss.usermodel.Row header = sheet.createRow(0);
        for (int i = 0; i < 10; i++) header.createCell(i).setCellValue("H" + i);
        // Data row (row 1)
        org.apache.poi.ss.usermodel.Row data = sheet.createRow(1);
        data.createCell(0).setCellValue("Q001");
        data.createCell(1).setCellValue("Java");
        data.createCell(2).setCellValue("Core");
        data.createCell(3).setCellValue("EASY");
        data.createCell(4).setCellValue("What is the JVM?");
        data.createCell(5).setCellValue("Runtime engine");
        data.createCell(6).setCellValue("Compiler");
        data.createCell(7).setCellValue("IDE");
        data.createCell(8).setCellValue("Framework");
        data.createCell(9).setCellValue("A");
        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
        workbook.write(baos);
        workbook.close();

        MockMultipartFile file = new MockMultipartFile("file", "test.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                baos.toByteArray());

        when(techStackRepository.findByNameIgnoreCase("Java")).thenReturn(Optional.of(javaStack));
        when(mcqRepository.existsByQuestionStemIgnoreCase("What is the JVM?")).thenReturn(false);
        when(topicRepository.findByNameIgnoreCaseAndTechStackId("Core", 1L)).thenReturn(Optional.empty());
        Mcq saved = Mcq.builder().id(2L).questionStem("What is the JVM?").status(McqStatus.DRAFT)
                .techStack(javaStack).creator(uploader).difficulty(Difficulty.EASY)
                .optionA("Runtime engine").optionB("Compiler").optionC("IDE").optionD("Framework")
                .correctAnswer("A").build();
        when(mcqRepository.save(any())).thenReturn(saved);

        var result = bulkUploadService.processUpload(file, uploader);
        assertEquals(1, result.get("success"));
        assertEquals(0, result.get("failed"));
    }

    @Test
    void processUpload_withTopicFound_setsTopicOnMcq() throws Exception {
        String csv = buildCsvContent("Q001,Java,Core,EASY,What is the JDK?,Lang,Tool,Lib,Framework,B");
        MockMultipartFile file = new MockMultipartFile("file", "test.csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8));

        Topic coreTopic = mock(Topic.class);
        when(techStackRepository.findByNameIgnoreCase("Java")).thenReturn(Optional.of(javaStack));
        when(mcqRepository.existsByQuestionStemIgnoreCase("What is the JDK?")).thenReturn(false);
        when(topicRepository.findByNameIgnoreCaseAndTechStackId("Core", 1L))
                .thenReturn(Optional.of(coreTopic));
        Mcq saved = Mcq.builder().id(3L).questionStem("What is the JDK?").status(McqStatus.DRAFT)
                .techStack(javaStack).creator(uploader).difficulty(Difficulty.EASY)
                .optionA("Lang").optionB("Tool").optionC("Lib").optionD("Framework")
                .correctAnswer("B").build();
        when(mcqRepository.save(any())).thenReturn(saved);

        var result = bulkUploadService.processUpload(file, uploader);
        assertEquals(1, result.get("success"));
        // Verify the topic lookup was exercised and the topic was set on the saved MCQ
        ArgumentCaptor<Mcq> captor = ArgumentCaptor.forClass(Mcq.class);
        verify(mcqRepository).save(captor.capture());
        assertEquals(coreTopic, captor.getValue().getTopic());
    }

    @Test
    void processUpload_aiSimilarMatch_recordsFailure() throws Exception {
        String csv = buildCsvContent("Q001,Java,Core,EASY,Describe polymorphism in OOP,Lang,Tool,OS,DB,A");
        MockMultipartFile file = new MockMultipartFile("file", "test.csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8));

        when(techStackRepository.findByNameIgnoreCase("Java")).thenReturn(Optional.of(javaStack));
        when(mcqRepository.existsByQuestionStemIgnoreCase(any())).thenReturn(false);
        when(topicRepository.findByNameIgnoreCaseAndTechStackId(any(), any())).thenReturn(Optional.empty());

        // AI returns a match with >= 30% similarity — should block the import
        java.util.Map<String, Object> match = new java.util.HashMap<>();
        match.put("id", 42);
        match.put("similarityPercent", 75);
        match.put("questionStem", "Explain polymorphism");
        when(aiService.checkDuplicateAgainstDb(any(), any()))
                .thenReturn(java.util.List.of(match));

        var result = bulkUploadService.processUpload(file, uploader);
        assertEquals(0, result.get("success"));
        assertEquals(1, result.get("failed"));
    }
}
