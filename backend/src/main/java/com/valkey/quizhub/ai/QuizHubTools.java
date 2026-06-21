package com.valkey.quizhub.ai;

import com.valkey.quizhub.repository.McqRepository;
import com.valkey.quizhub.repository.TechStackRepository;
import com.valkey.quizhub.repository.TopicRepository;
import com.valkey.quizhub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

/**
 * Tool Calling — Spring AI Pattern #4
 * 
 * These @Tool-annotated methods are callable by the LLM during chat.
 * The AI can decide to invoke these to fetch live data from QuizHub.
 */
@Component
@RequiredArgsConstructor
public class QuizHubTools {

    private final McqRepository mcqRepository;
    private final TechStackRepository techStackRepository;
    private final TopicRepository topicRepository;
    private final UserRepository userRepository;

    @Tool(description = "Get the total number of MCQs in the QuizHub system")
    public String getTotalMcqCount() {
        long count = mcqRepository.count();
        return "There are " + count + " MCQs in QuizHub.";
    }

    @Tool(description = "Get the number of available tech stacks in QuizHub")
    public String getTechStackCount() {
        long count = techStackRepository.count();
        return "There are " + count + " tech stacks configured in QuizHub.";
    }

    @Tool(description = "Get the number of topics across all tech stacks")
    public String getTopicCount() {
        long count = topicRepository.count();
        return "There are " + count + " topics across all tech stacks.";
    }

    @Tool(description = "Get the total number of registered users in QuizHub")
    public String getUserCount() {
        long count = userRepository.count();
        return "There are " + count + " registered users in QuizHub.";
    }

    @Tool(description = "List all tech stack names available in QuizHub")
    public String listTechStacks() {
        var stacks = techStackRepository.findAll();
        if (stacks.isEmpty()) return "No tech stacks found.";
        StringBuilder sb = new StringBuilder("Available tech stacks: ");
        stacks.forEach(ts -> sb.append(ts.getName()).append(", "));
        return sb.substring(0, sb.length() - 2);
    }

    @Tool(description = "Get MCQ count for a specific status: DRAFT, READY_FOR_REVIEW, APPROVED, or REJECTED")
    public String getMcqCountByStatus(@ToolParam(description = "The MCQ status to filter by") String status) {
        try {
            var mcqStatus = com.valkey.quizhub.enums.McqStatus.valueOf(status.toUpperCase());
            long count = mcqRepository.countByStatus(mcqStatus);
            return "There are " + count + " MCQs with status " + status.toUpperCase() + ".";
        } catch (IllegalArgumentException e) {
            return "Invalid status. Use: DRAFT, READY_FOR_REVIEW, APPROVED, or REJECTED.";
        }
    }
}
