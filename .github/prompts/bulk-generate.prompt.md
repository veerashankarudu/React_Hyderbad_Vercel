---
name: Bulk Generate Questions
description: Generate multiple MCQ questions for a topic in one go
---

Generate ${input:count:5} MCQ questions for QuizHub.

**Tech Stack**: ${input:techStack:Spring Boot}
**Topic**: ${input:topic:Annotations}
**Difficulty mix**: 2 EASY, 2 MEDIUM, 1 HARD (adjust if count is different)

For EACH question:
1. Call `checkDuplicate` — skip if >85% similar to existing
2. Write the question following MCQ Expert skill rules
3. Call `createMcq` to save it as DRAFT

At the end, show a summary table:
| # | Question (first 60 chars) | Difficulty | Result |
|---|--------------------------|------------|--------|
| 1 | ...                      | EASY       | ✅ Created / ⚠️ Skipped (duplicate) |
