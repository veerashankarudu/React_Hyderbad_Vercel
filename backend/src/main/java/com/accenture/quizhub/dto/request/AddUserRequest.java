package com.accenture.quizhub.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.util.List;

@Data
public class AddUserRequest {
    @NotBlank private String enterpriseId;
    @NotBlank private String fullName;
    @Email @NotBlank private String email;
    @NotBlank private String role; // SME or ADMIN
    private List<Long> techStackIds;
}
