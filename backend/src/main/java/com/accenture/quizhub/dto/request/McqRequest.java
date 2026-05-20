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

    @NotBlank(message = "Option A is required")
    private String optionA;

    @NotBlank(message = "Option B is required")
    private String optionB;

    @NotBlank(message = "Option C is required")
    private String optionC;

    @NotBlank(message = "Option D is required")
    private String optionD;

    @NotBlank(message = "Correct answer is required")
    @Pattern(regexp = "[ABCDabcd]", message = "Correct answer must be A, B, C or D")
    private String correctAnswer;

    private boolean sendForReview = false;
}
