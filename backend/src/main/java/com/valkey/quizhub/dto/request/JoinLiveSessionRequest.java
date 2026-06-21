package com.valkey.quizhub.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class JoinLiveSessionRequest {

    @NotBlank(message = "Display name is required")
    @Size(min = 2, max = 50, message = "Display name must be 2–50 characters")
    @Pattern(regexp = "^[\\w\\s\\-\\.]+$", message = "Display name contains invalid characters")
    private String displayName;

    /** Team name for team battle mode (optional — assigned by host or self-selected) */
    @Size(max = 50, message = "Team name must be at most 50 characters")
    private String teamName;
}
