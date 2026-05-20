package com.accenture.quizhub.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogResponse {
    private Long id;
    private String actorEnterpriseId;
    private String action;
    private String targetEnterpriseId;
    private String details;
    private LocalDateTime timestamp;
}
