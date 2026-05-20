package com.accenture.quizhub.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank(message = "Enterprise ID is required")
    private String enterpriseId;

    @NotBlank(message = "Password is required")
    private String password;
}
