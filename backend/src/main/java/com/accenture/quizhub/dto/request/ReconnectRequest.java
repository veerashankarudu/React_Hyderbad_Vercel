package com.accenture.quizhub.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ReconnectRequest {

    @NotBlank(message = "Rejoin token is required")
    private String rejoinToken;
}
