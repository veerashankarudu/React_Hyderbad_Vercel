package com.accenture.quizhub.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class SubmitLiveAnswerRequest {

    @NotNull(message = "Question ID is required")
    private Long questionId;

    @NotBlank(message = "Selected option is required")
    @Pattern(regexp = "^[ABCD]$", message = "Selected option must be A, B, C, or D")
    private String selectedOption;

    /** Client-measured response time in milliseconds (informational; server validates) */
    @Min(0)
    private long responseTimeMs;
}
