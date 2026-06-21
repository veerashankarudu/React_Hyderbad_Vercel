package com.valkey.quizhub.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String enterpriseId;
    private String fullName;
    private String email;
    private String role;
}
