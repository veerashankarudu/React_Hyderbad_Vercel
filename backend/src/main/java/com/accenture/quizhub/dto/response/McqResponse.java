package com.accenture.quizhub.dto.response;

import com.accenture.quizhub.enums.Difficulty;
import com.accenture.quizhub.enums.McqStatus;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class McqResponse {
    private Long id;
    private String questionStem;
    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;
    private String correctAnswer;
    private String questionType;
    private Difficulty difficulty;
    private McqStatus status;
    private Long techStackId;
    private String techStackName;
    private Long topicId;
    private String topicName;
    private String creatorEnterpriseId;
    private String creatorFullName;
    private String reviewerEnterpriseId;
    private String reviewerFullName;
    private List<CommentResponse> comments;
    private Integer version;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String aiWarning;
    private Integer aiScore;
    private String aiRisk;
    private Boolean aiGenerated;
    private String contentJson;
}
