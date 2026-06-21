package com.valkey.quizhub.enums;

public enum QuestionType {
    SINGLE,          // Single correct answer (radio buttons)
    MULTI,           // Multiple correct answers (checkboxes)
    DRAG_ORDER,      // Drag & Drop Ordering
    MATCH_PAIRS,     // Match Concept to Definition
    CODE_OUTPUT,     // Match Code to Output
    FILL_BLANK,      // Fill in the Blank
    PREDICT_OUTPUT,  // Predict Program Output
    DEBUG_CODE,      // Debug the Code
    CODE_REARRANGE,  // Code Rearrangement
    SQL_BUILDER,     // Interactive SQL Builder
    ARCH_LAYERS,     // Architecture Layers
    CODE_REVIEW,     // Code Review Challenge
    PIPELINE_BUILD,  // Stream Pipeline Builder
    FLOWCHART,       // Flowchart Question
    DEVOPS_PIPE,     // DevOps Pipeline
    SECURE_CODE,     // Secure Coding
    RIDDLE           // Tech Riddles
}
