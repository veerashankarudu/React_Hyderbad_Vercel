# QuizHub AI — Complete Screenshot Evidence Checklist

> **Source:** Level 1 PPT (Slides 3-16) + Level 2 PPT (Slides 3-8)
> **Goal:** Capture every single feature end-to-end with screenshots
> **App:** http://localhost:3000 | Backend: http://localhost:8080

---

## CREDENTIALS

| Role  | Enterprise ID            | Password    |
|-------|--------------------------|-------------|
| Admin | `divya.madhanasekar`     | `Admin@123` |
| SME   | `indugu.hari.prasad`     | `Sme@1234`  |
| SME   | `birendra.kumar.singh`   | `Sme@1234`  |

---

## LEVEL 1 FEATURES (From PPT Slides 3-16)

### 1. AUTHENTICATION & LOGIN
| # | Screenshot | Action | Status |
|---|-----------|--------|--------|
| 1.1 | Login Page (empty) | Show login form with Enterprise ID + Password fields | ☐ |
| 1.2 | SME Login | Login as `indugu.hari.prasad` / `Sme@1234` | ☐ |
| 1.3 | SME Dashboard after login | Show role displayed in header as enterprise_id [expert] | ☐ |
| 1.4 | Logout + Admin Login | Login as `divya.madhanasekar` / `Admin@123` | ☐ |
| 1.5 | Admin Dashboard after login | Show role displayed as enterprise_id [admin] | ☐ |
| 1.6 | Invalid credentials error | Show error message on wrong password | ☐ |

---

### 2. SME — CREATE SINGLE MCQ (PPT Slide 8)
| # | Screenshot | Action | Status |
|---|-----------|--------|--------|
| 2.1 | "Add Question" button click | Show two options: "Add from UI" and "Bulk Upload" | ☐ |
| 2.2 | Add from UI form (empty) | Show form: Question Stem, Tech Stack dropdown, Topic dropdown, Difficulty, 4 Options, Correct Answer | ☐ |
| 2.3 | Tech Stack dropdown populated | Show all 6 tech stacks from master list | ☐ |
| 2.4 | Topic dropdown (filtered by tech stack) | Select Spring Boot → show Spring Boot topics only | ☐ |
| 2.5 | Difficulty dropdown | Show Easy / Medium / Hard options | ☐ |
| 2.6 | Filled form with all fields | Complete MCQ filled in | ☐ |
| 2.7 | Save as Draft | Click Save → MCQ saved with DRAFT status | ☐ |
| 2.8 | Save & Send for Review | Click Save & Send → MCQ saved with READY_FOR_REVIEW status | ☐ |

---

### 3. SME — BULK UPLOAD MCQs (PPT Slide 9)
| # | Screenshot | Action | Status |
|---|-----------|--------|--------|
| 3.1 | Bulk Upload page | Show upload form with file chooser | ☐ |
| 3.2 | Download Template button | Click to download Template_MCQs.xlsx | ☐ |
| 3.3 | Template file contents | Show Excel template columns | ☐ |
| 3.4 | Upload valid file | Upload populated CSV/XLSX → success message | ☐ |
| 3.5 | Upload with errors | Upload file with invalid rows → show row-level error report | ☐ |
| 3.6 | Uploaded MCQs in My Questions | Show uploaded MCQs with DRAFT status in My Questions tab | ☐ |

---

### 4. SME — MY QUESTIONS & STATUS TRACKING (PPT Slide 7)
| # | Screenshot | Action | Status |
|---|-----------|--------|--------|
| 4.1 | My Questions tab (full view) | Paginated table with all SME's MCQs | ☐ |
| 4.2 | Status filter tabs | Show All / Draft / Ready for Review / Under Review / Approved / Rejected with counts | ☐ |
| 4.3 | Filter by DRAFT status | Click Draft tab → only Draft MCQs shown | ☐ |
| 4.4 | Filter by APPROVED status | Click Approved tab → only Approved MCQs shown | ☐ |
| 4.5 | Filter by REJECTED status | Click Rejected tab → show rejected MCQs | ☐ |
| 4.6 | Edit button visible for Draft | Edit button shown on Draft MCQ row | ☐ |
| 4.7 | Edit button visible for Rejected | Edit button shown on Rejected MCQ row | ☐ |
| 4.8 | No Edit button for Approved | Edit button NOT shown on Approved MCQ | ☐ |
| 4.9 | Pagination controls | Show "Showing X to Y of Z questions" | ☐ |

---

### 5. SME — EDIT/UPDATE MCQ (PPT Slide 7)
| # | Screenshot | Action | Status |
|---|-----------|--------|--------|
| 5.1 | Edit Draft MCQ | Click Edit on Draft → form opens with pre-filled data | ☐ |
| 5.2 | Edit Rejected MCQ | Click Edit on Rejected → form shows reviewer comments | ☐ |
| 5.3 | Reviewer comments visible | Comments from rejection clearly displayed | ☐ |
| 5.4 | Save (update without status change) | Click Save → MCQ updated, status unchanged | ☐ |
| 5.5 | Save & Send for Review (resubmit) | Click Save & Send → status changes to READY_FOR_REVIEW | ☐ |

---

### 6. SME — REVIEW QUESTIONS (PPT Slide 10)
| # | Screenshot | Action | Status |
|---|-----------|--------|--------|
| 6.1 | My Pending Reviews tab | Show MCQs assigned for review with "Pending" label | ☐ |
| 6.2 | Summary counters | Show X Pending, Y Approved, Z Rejected counts | ☐ |
| 6.3 | View Full Question button | Click → modal shows full MCQ details (stem, 4 options, correct answer) | ☐ |
| 6.4 | Feedback textbox | Show "Add feedback" text field | ☐ |
| 6.5 | Approve MCQ | Click Approve → MCQ status changes to APPROVED | ☐ |
| 6.6 | Reject MCQ with comment | Enter feedback → Click Reject → status changes to REJECTED | ☐ |
| 6.7 | Reject without comment (validation) | Click Reject without feedback → show error (mandatory) | ☐ |
| 6.8 | Approved MCQ reflected in creator's My Questions | Switch to creator login → show MCQ now has APPROVED status | ☐ |

---

### 7. ADMIN — QUESTION BANK MANAGEMENT (PPT Slide 12)
| # | Screenshot | Action | Status |
|---|-----------|--------|--------|
| 7.1 | Question Bank tab (full view) | Paginated table of ALL MCQs from all creators | ☐ |
| 7.2 | Creator Enterprise ID visible | Show creator's enterprise_id column | ☐ |
| 7.3 | Status filter tabs | Filter by All/Draft/Ready for Review/Under Review/Approved/Rejected | ☐ |
| 7.4 | Filter by Ready for Review | Show only READY_FOR_REVIEW MCQs | ☐ |
| 7.5 | Assign Reviewer button visible | "Assign Reviewer" button on READY_FOR_REVIEW MCQ | ☐ |
| 7.6 | Edit button on all statuses | Admin Edit button available on any MCQ | ☐ |

---

### 8. ADMIN — ASSIGN REVIEWER (PPT Slide 12)
| # | Screenshot | Action | Status |
|---|-----------|--------|--------|
| 8.1 | Assign Reviewer dialog | Click Assign → dialog shows Tech Stack, Topic, Creator ID | ☐ |
| 8.2 | Reviewer dropdown | Show SMEs matching MCQ's tech stack (excluding creator) | ☐ |
| 8.3 | Admin as reviewer option | Show admin also available as reviewer in dropdown | ☐ |
| 8.4 | Assign button click | Click Assign → MCQ status changes to UNDER_REVIEW | ☐ |
| 8.5 | Status update visible in table | Question Bank now shows UNDER_REVIEW + reviewer name | ☐ |

---

### 9. MCQ LIFECYCLE — FULL CYCLE (PPT Slide 5)
| # | Screenshot | Action | Status |
|---|-----------|--------|--------|
| 9.1 | DRAFT state | MCQ just created | ☐ |
| 9.2 | READY_FOR_REVIEW state | After "Save & Send for Review" | ☐ |
| 9.3 | UNDER_REVIEW state | After admin assigns reviewer | ☐ |
| 9.4 | APPROVED state | After reviewer approves | ☐ |
| 9.5 | REJECTED state | After reviewer rejects | ☐ |
| 9.6 | Re-submitted after rejection | Creator edits rejected MCQ → sends back for review | ☐ |

---

### 10. MASTER DATA (PPT Slides 13-16)
| # | Screenshot | Action | Status |
|---|-----------|--------|--------|
| 10.1 | Technology Stack list | Show all 6 tech stacks in dropdown/list | ☐ |
| 10.2 | Topics filtered by tech stack | Show topics change based on selected tech stack | ☐ |
| 10.3 | SME-Tech Stack mapping | Show SMEs tagged to their tech stacks (admin view) | ☐ |

---

## LEVEL 2 FEATURES (From PPT Slides 3-8)

### 11. AI-POWERED MCQ GENERATION (PPT Slide 6)
| # | Screenshot | Action | Status |
|---|-----------|--------|--------|
| 11.1 | "Generate with AI" option | Click Add Question → show "Generate with AI" option | ☐ |
| 11.2 | AI Generation form | Form with: Tech Stack, Topic, Difficulty, Number of Questions | ☐ |
| 11.3 | Generate button click (loading) | Show AI generation in progress | ☐ |
| 11.4 | Generated MCQs result | Show generated questions (with DRAFT status) | ☐ |
| 11.5 | Generated MCQs in My Questions | Navigate to My Questions → new AI-generated drafts visible | ☐ |
| 11.6 | Duplicate auto-replacement | Show that similarity ≥30% MCQs were auto-replaced during generation | ☐ |

---

### 12. AI DUPLICATE/SIMILARITY DETECTION (PPT Slides 7-8)
| # | Screenshot | Action | Status |
|---|-----------|--------|--------|
| 12.1 | Duplicate Check button on Edit page | Show "Duplicate Check" button visible | ☐ |
| 12.2 | Duplicate check — NO duplicate found | Click Duplicate Check → similarity < 30% → green success | ☐ |
| 12.3 | Duplicate check — DUPLICATE found | Click Duplicate Check → similarity ≥ 30% → error with similar questions list | ☐ |
| 12.4 | Similar questions details | Show matched questions from question bank with similarity % | ☐ |
| 12.5 | Block Send for Review (duplicate) | Try "Save & Send for Review" with ≥30% → blocked with error | ☐ |
| 12.6 | Allow Send for Review (no duplicate) | Edit MCQ to be unique → Send for Review succeeds (< 30%) | ☐ |
| 12.7 | Auto-check on Save & Send | Duplicate check auto-triggers on "Save & Send for Review" | ☐ |

---

## BONUS/EXTRA FEATURES (Built beyond PPT requirements)

### 13. ANALYTICS & DASHBOARD
| # | Screenshot | Action | Status |
|---|-----------|--------|--------|
| 13.1 | Analytics page | MCQ distribution charts by tech stack | ☐ |
| 13.2 | Status breakdown chart | Pie/bar chart of MCQ statuses | ☐ |
| 13.3 | Reviewer leaderboard | Top reviewers by approval count | ☐ |

---

### 14. LIVE QUIZ SESSION
| # | Screenshot | Action | Status |
|---|-----------|--------|--------|
| 14.1 | Create session | Session creation form | ☐ |
| 14.2 | PIN code display | Generated session PIN | ☐ |
| 14.3 | Participant lobby | Waiting room with joined users | ☐ |
| 14.4 | Live question display | Real-time question with timer | ☐ |
| 14.5 | Live leaderboard | Real-time scores | ☐ |

---

### 15. SMART INTERVIEW KIT
| # | Screenshot | Action | Status |
|---|-----------|--------|--------|
| 15.1 | Resume upload page | Upload form for PDF resume | ☐ |
| 15.2 | AI generating questions | Loading/progress state | ☐ |
| 15.3 | Generated interview questions | 30 questions across 6 categories | ☐ |
| 15.4 | Category tabs | Technical/Coding/SQL/Project/Behavioral/Scenario | ☐ |

---

### 16. KANBAN BOARD
| # | Screenshot | Action | Status |
|---|-----------|--------|--------|
| 16.1 | Kanban board view | Visual workflow columns (Draft → Approved) | ☐ |
| 16.2 | Drag and drop | MCQ moved between status columns | ☐ |

---

### 17. 17 QUESTION TYPES (AI-Generated)
| # | Screenshot | Action | Status |
|---|-----------|--------|--------|
| 17.1 | SINGLE choice MCQ | Standard single-answer question | ☐ |
| 17.2 | MULTI choice MCQ | Multiple correct answers | ☐ |
| 17.3 | DRAG_ORDER | Sequence ordering question | ☐ |
| 17.4 | MATCH_PAIRS | Matching pairs question | ☐ |
| 17.5 | CODE_OUTPUT | Predict code output | ☐ |
| 17.6 | FILL_BLANK | Fill in the blanks | ☐ |
| 17.7 | PREDICT_OUTPUT | Predict output question | ☐ |
| 17.8 | DEBUG_CODE | Find and fix the bug | ☐ |
| 17.9 | CODE_REARRANGE | Rearrange code lines | ☐ |
| 17.10 | SQL_BUILDER | SQL query building | ☐ |
| 17.11 | ARCH_LAYERS | Architecture layer question | ☐ |
| 17.12 | CODE_REVIEW | Code review question | ☐ |
| 17.13 | PIPELINE_BUILD | CI/CD pipeline building | ☐ |
| 17.14 | FLOWCHART | Flowchart question | ☐ |
| 17.15 | DEVOPS_PIPE | DevOps pipeline | ☐ |
| 17.16 | SECURE_CODE | Security code review | ☐ |
| 17.17 | RIDDLE | Technical riddle | ☐ |

---

### 18. CHAT, NOTIFICATIONS & i18n
| # | Screenshot | Action | Status |
|---|-----------|--------|--------|
| 18.1 | AI Chatbot | Chat panel open | ☐ |
| 18.2 | Notification bell | Notification dropdown with alerts | ☐ |
| 18.3 | Language switcher | i18n toggle showing languages | ☐ |
| 18.4 | Hindi/French UI | UI switched to another language | ☐ |

---

### 19. DARK MODE & UX
| # | Screenshot | Action | Status |
|---|-----------|--------|--------|
| 19.1 | Light mode | Full page in light theme | ☐ |
| 19.2 | Dark mode | Full page in dark theme | ☐ |
| 19.3 | Theme toggle button | Toggle switch visible | ☐ |

---

### 20. TEST COVERAGE & QUALITY
| # | Screenshot | Action | Status |
|---|-----------|--------|--------|
| 20.1 | Backend tests passing | Terminal: 1,072 tests, 0 failures | ☐ |
| 20.2 | Backend coverage report | JaCoCo: 92.5% instruction coverage | ☐ |
| 20.3 | Frontend tests passing | Terminal: 957 tests, 0 failures | ☐ |
| 20.4 | Frontend coverage report | Jest: 80.37% statement coverage | ☐ |
| 20.5 | Swagger API docs | http://localhost:8080/swagger-ui/index.html | ☐ |
| 20.6 | Health check endpoint | http://localhost:8080/actuator/health → {"status":"UP"} | ☐ |

---

## EXECUTION ORDER

1. **Start with SME login (Sections 1-6)** — covers all Level 1 SME features
2. **Switch to Admin (Sections 7-9)** — covers Admin + full lifecycle
3. **AI features (Sections 11-12)** — covers all Level 2 requirements
4. **Bonus features (Sections 13-20)** — shows extra value beyond requirements
5. **Test evidence (Section 20)** — proves quality

---

## TOTAL SCREENSHOTS NEEDED: ~100+

**Priority:**
- 🔴 CRITICAL (Level 1 PPT required): Sections 1-10
- 🔴 CRITICAL (Level 2 PPT required): Sections 11-12
- 🟡 HIGH VALUE (differentiators): Sections 13-17
- 🟢 NICE TO HAVE: Sections 18-20
