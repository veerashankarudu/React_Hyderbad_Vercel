package com.valkey.quizhub.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AssignReviewerRequest {
    @NotNull(message = "Reviewer ID is required")
    private Long reviewerId;
}
