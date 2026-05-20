package com.accenture.quizhub.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AssignReviewerRequest {
    @NotNull(message = "Reviewer ID is required")
    private Long reviewerId;
}
