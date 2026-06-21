package com.valkey.quizhub.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentResponse {
    private Long id;
    private String comment;
    private String reviewerEnterpriseId;
    private LocalDateTime createdAt;
}
