---
name: Create MCQ Question
description: Generate a new MCQ question for QuizHub with all required fields
---

Create a new MCQ question for QuizHub with the following details:

**Tech Stack**: ${input:techStack:Spring Boot}
**Topic**: ${input:topic:Dependency Injection}
**Difficulty**: ${input:difficulty:MEDIUM}

Requirements:
1. First call `checkDuplicate` to make sure the question doesn't already exist
2. Write a clear question stem — one concept, no trick wording
3. Write 4 options (A/B/C/D) — one correct, three plausible distractors
4. Add a short explanation for the correct answer
5. Then call `createMcq` to save it with status DRAFT

Follow the MCQ Expert skill rules for quality.
