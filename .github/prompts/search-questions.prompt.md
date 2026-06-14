---
name: Search Questions
description: Search QuizHub for existing questions by topic, keyword, or tech stack
---

Search QuizHub for questions matching:

**Keyword**: ${input:keyword:transactional}
**Tech Stack** (optional): ${input:techStack:}
**Status** (optional): ${input:status:APPROVED}

Call `searchQuestions` with these filters.

Format results as:
| ID | Question (first 80 chars) | Difficulty | Status | Tech Stack |
|----|--------------------------|------------|--------|------------|
| .. | ...                      | MEDIUM     | ✅ APPROVED | Spring Boot |

If 0 results → say "No questions found. Want me to create one?"
If >10 results → show top 10 and say "Showing 10 of X results. Narrow your search?"
