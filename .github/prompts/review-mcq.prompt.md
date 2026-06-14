---
name: Review MCQ Question
description: Review an existing MCQ for quality, accuracy, and QuizHub standards
---

Review this MCQ question for QuizHub quality standards:

```
${input:questionText:Paste the full question here with all 4 options}
```

Check and report on:
1. **Clarity** — Is the stem clear and unambiguous?
2. **Correctness** — Is the correct answer actually correct?
3. **Distractors** — Are the 3 wrong answers plausible (not obviously silly)?
4. **Difficulty** — Does the difficulty label match the actual complexity?
5. **Duplicates** — Call `checkDuplicate` to check if similar question exists
6. **Quality Score** — Call `checkQuality` if the question ID is known

Final verdict: APPROVE / REJECT / NEEDS EDIT
If NEEDS EDIT — provide the corrected version.
