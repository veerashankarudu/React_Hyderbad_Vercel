package com.accenture.quizhub.dto.response;

import lombok.*;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSummary {
    private Long id;
    private String enterpriseId;
    private String fullName;
    private String role;
    private String email;
    private List<String> techStacks;
    private boolean approved;
}
