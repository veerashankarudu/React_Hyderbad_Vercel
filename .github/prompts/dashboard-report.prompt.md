---
name: Dashboard Stats Report
description: Get a full summary of QuizHub platform activity and stats
---

Pull a complete QuizHub dashboard report right now.

Call `getDashboardStats` and format the results as:

## QuizHub Platform Summary

| Metric | Count |
|--------|-------|
| Total Questions | ... |
| Approved | ... |
| Pending Review | ... |
| Draft | ... |
| Rejected | ... |

Then call `getTechStacks` and show:
- Which tech stacks are active
- How many questions per stack (if available)

End with a one-line health summary:
> "Platform is healthy / needs attention because..."
