package com.accenture.quizhub.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class ReviewRequest {

    @NotBlank(message = "Action is required")
    @Pattern(regexp = "APPROVE|REJECT", message = "Action must be APPROVE or REJECT")
    private String action;

    private String comment;
}
