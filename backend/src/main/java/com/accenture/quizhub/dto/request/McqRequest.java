package com.accenture.quizhub.dto.request;

import com.accenture.quizhub.enums.Difficulty;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class McqRequest {

    @NotBlank(message = "Question stem is required")
    private String questionStem;

    @NotNull(message = "Technology stack is required")
    private Long techStackId;

    private Long topicId;

    @NotNull(message = "Difficulty is required")
    private Difficulty difficulty;

    private String optionA;

    private String optionB;

    private String optionC;

    private String optionD;

    private String correctAnswer;

    /** SINGLE (radio - one answer) or MULTI (checkbox - multiple answers) or advanced types */
    private String questionType = "SINGLE";

    /** JSON payload for advanced question types (ordering, matching, code blocks, etc.) */
    private String contentJson;

    private boolean sendForReview = false;

    /** When true, skips duplicate/similarity checks (used by force-add from bulk upload) */
    private boolean skipDuplicateCheck = false;
}
