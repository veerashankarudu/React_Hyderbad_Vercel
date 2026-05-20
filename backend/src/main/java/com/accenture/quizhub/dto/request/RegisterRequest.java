package com.accenture.quizhub.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.util.List;

@Data
public class RegisterRequest {
    @NotBlank(message = "Enterprise ID is required")
    private String enterpriseId;

    @NotBlank(message = "Full name is required")
    private String fullName;

    @Email(message = "Valid email is required")
    @NotBlank(message = "Email is required")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    @Pattern(
        regexp = "^(?=.*[0-9])(?=.*[a-zA-Z]).{8,}$",
        message = "Password must be at least 8 characters and contain at least one letter and one number"
    )
    private String password;

    // Optional: tech stack IDs the SME is skilled in
    private List<Long> techStackIds;
}
