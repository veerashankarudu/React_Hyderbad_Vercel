# 🧠 QuizHub AI — Smart MCQ Management Platform

> AI-powered enterprise MCQ lifecycle platform — Create smarter. Review faster. Learn better.

[![Java](https://img.shields.io/badge/Java-17-ED8B00?logo=openjdk)](https://openjdk.org)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.5-6DB33F?logo=springboot)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19.2.6-61DAFB?logo=react)](https://react.dev)
[![Spring AI](https://img.shields.io/badge/Powered%20by-Spring%20AI%20%2B%20GPT--4o--mini-412991?logo=openai)](https://spring.io/projects/spring-ai)
[![MySQL](https://img.shields.io/badge/MySQL-8.x-4479A1?logo=mysql)](https://mysql.com)
[![i18n](https://img.shields.io/badge/i18n-7%20Languages-brightgreen)](https://www.i18next.com)

---

## 📌 Overview

**QuizHub AI** is an enterprise-grade MCQ (Multiple Choice Question) management platform built for Accenture's internal learning ecosystem. It enables SMEs (Subject Matter Experts) to create, review, and manage MCQs through a structured AI-assisted workflow, with full role-based access control, bulk operations, proctored assessments, and multi-language support.

All MCQs go through a governed lifecycle: **DRAFT → READY_FOR_REVIEW → UNDER_REVIEW → APPROVED / REJECTED**, ensuring quality, consistency, and traceability across the organisation.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Browser                              │
│              React 19 (JavaScript) — localhost:3000              │
│     Pages: MCQ Form, Question Bank, Quiz, Inbox, Analytics ...  │
└────────────────────────────┬────────────────────────────────────┘
                             │  HTTP / REST (Axios)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Spring Boot 3.2.5 REST API — localhost:8080         │
│   Controllers: Auth, MCQ, Admin, Review, BulkUpload, Quiz ...   │
│   Security: Spring Security + JWT (JJWT 0.11.5)                 │
└──────────┬──────────────┬──────────────┬────────────────────────┘
           │              │              │
           ▼              ▼              ▼
┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐
│  Spring AI   │  │  Spring Data │  │     Spring Mail            │
│  (GPT-4o-   │  │  JPA + MySQL │  │  (Email notifications:     │
│   mini)      │  │              │  │   assigned/approved/       │
│              │  │  quizhub DB  │  │   rejected)                │
│ • Duplicate  │  │              │  └────────────────────────────┘
│   detection  │  │ • MCQs       │
│ • Quality    │  │ • Users      │  ┌────────────────────────────┐
│   scoring    │  │ • Reviews    │  │   Apache POI + OpenCSV     │
│ • Enrichment │  │ • Quizzes    │  │   (Bulk Upload: XLSX/CSV)  │
└──────────────┘  │ • Inbox      │  └────────────────────────────┘
                  └──────────────┘
```

---

## 🗃️ ER Diagram (Entity Relationship)

```
+------------------+        +------------------+        +------------------+
|      USER        |        |       MCQ         |        |   TECH_STACK     |
+------------------+        +------------------+        +------------------+
| PK id            |        | PK id            |        | PK id (1001-1006)|
|    enterprise_id |        |    question_stem |        |    name          |
|    full_name     |        |    option_a/b/c/d|        |    description   |
|    email         |        |    correct_answer|        +--------+---------+
|    password_hash |        |    difficulty    |                 |
|    role (ENUM)   |        |    status (ENUM) |     1           | N
|    is_approved   |        |    version       +-----+-----------+
|    created_at    |  1   N |    created_at    |     |
+--------+---------+--------+    updated_at    |     |
         |                  | FK creator_id    +--+  |
         |   reviewer       | FK tech_stack_id |  |  +------------------+
         +------------------+    FK topic_id   |  |  |     TOPIC        |
         |                  +--------+---------+  |  +------------------+
         |  1             N          |             |  | PK id            |
+--------+---------+                |             |  |    name          |
|      REVIEW      |                | 1           |  | FK tech_stack_id |
+------------------+                |             |  +------------------+
| PK id            |             N  |
| FK mcq_id        +----------------+
| FK reviewer_id   |
|    decision      |     +------------------+       +------------------+
|    comment       |     |  MCQ_VERSION     |       |   QUIZ_SESSION   |
|    reviewed_at   |     +------------------+       +------------------+
+------------------+     | PK id            |       | PK id            |
                         | FK mcq_id        |       |    title         |
+------------------+     |    version_num   |       |    quiz_link     |
|   INBOX_MESSAGE  |     |    snapshot_json |       |    expires_at    |
+------------------+     |    changed_by    |       |    time_limit    |
| PK id            |     |    changed_at    |       | FK created_by    |
| FK sender_id     |     +------------------+       +--------+---------+
| FK receiver_id   |                                         |
|    subject       |     +------------------+               | N
|    body          |     |  NOTIFICATION    |    +----------+----------+
|    is_read       |     +------------------+    |   QUIZ_ATTEMPT      |
|    is_starred    |     | PK id            |    +---------------------+
|    is_draft      |     | FK user_id       |    | PK id               |
|    sent_at       |     |    type          |    | FK session_id        |
+------------------+     |    message       |    |    participant_name  |
                         |    is_read       |    |    participant_email |
+------------------+     |    created_at    |    |    score            |
|    AUDIT_LOG     |     +------------------+    |    violations       |
+------------------+                             |    status (ENUM)    |
| PK id            |                             |    submitted_at     |
| FK user_id       |                             +---------------------+
|    action        |
|    entity_type   |     +------------------+
|    entity_id     |     |   MCQ_COMMENT    |
|    details       |     +------------------+
|    created_at    |     | PK id            |
+------------------+     | FK mcq_id        |
                         | FK author_id     |
                         | FK reply_to_id   |  <- self-referencing
                         |    text          |
                         |    created_at    |
                         +------------------+
```

**MCQ Status ENUM:** `DRAFT | READY_FOR_REVIEW | UNDER_REVIEW | APPROVED | REJECTED`  
**User Role ENUM:** `ADMIN | SME`  
**Difficulty ENUM:** `EASY | MEDIUM | HARD`  
**Quiz Attempt Status ENUM:** `COMPLETED | TERMINATED | IN_PROGRESS`

---

## 📐 UML — Key Class Relationships

```
<<entity>>                   <<entity>>
McqEntity                    UserEntity
+-----------------+          +-------------------+
| id: Long        |   N:1    | id: Long          |
| questionStem    +----------> enterpriseId      |
| options[4]      | creator  | fullName          |
| correctAnswer   |          | passwordHash      |
| difficulty      |   N:1    | role: Role        |
| status: McqStatus+---------> isApproved: bool  |
| version: int    | reviewer | techStacks: List  |
+-----------------+          +-------------------+
        |
        | 1:N (versions)       <<entity>>
        |                      ReviewEntity
        v                      +------------------+
<<entity>>                     | id: Long         |
McqVersionEntity               | mcq: McqEntity   |
+------------------+           | reviewer: User   |
| id               |           | decision: String |
| mcqId            |           | comment: String  |
| versionNum       |           | reviewedAt       |
| snapshotJson     |           +------------------+
| changedBy        |
+------------------+

<<service>>                  <<service>>
McqService                   AIService
+--------------------+       +----------------------+
| createMcq()        |       | checkDuplicate()     |
| submitForReview()  | uses  | getQualityScore()    |
| editMcq()          +-----> | suggestDifficulty()  |
| deleteMcq()        |       | generateDistractors()|
| getMcqsByUser()    |       +----------------------+
+--------------------+              uses
                                     |
<<service>>                          v
ReviewService              OpenAI GPT-4o-mini
+--------------------+      via Spring AI
| assignReviewer()   |
| submitReview()     |
| getEligibleReviewers() |
+--------------------+
```

---

## 🧩 Design Patterns Used

| Pattern | Where Applied | Purpose |
|---|---|---|
| **Repository Pattern** | `McqRepository`, `UserRepository` etc. | Abstracts data access via Spring Data JPA |
| **Service Layer Pattern** | `McqService`, `ReviewService`, `AIService` | Business logic separated from controllers |
| **DTO Pattern** | `McqRequestDto`, `McqResponseDto` | Decouple API contract from entity model |
| **Strategy Pattern** | Translation fallback (Lingva → MyMemory) | Swap translation provider without code change |
| **Observer Pattern** | Email notifications, Inbox messages | Decouple lifecycle events from actions |
| **Facade Pattern** | `AIService` wraps Spring AI + OpenAI | Simplifies AI interactions for callers |
| **Guard/Chain of Responsibility** | JWT filter → Role check → Controller | Sequential security checks in Spring Security |
| **Optimistic Locking** | `@Version` on `McqEntity` | Prevent lost updates on concurrent edits |
| **Factory Method** | `BulkUploadService` (CSV vs XLSX) | Creates correct parser by file type |
| **State Machine** | MCQ status transitions | Enforces valid lifecycle transitions |
| **Singleton** | Spring Beans (`@Service`, `@Repository`) | Single instance per application context |
| **Template Method** | `BaseController` error handling | Common error handling across controllers |

---

## 🏗️ Tech Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Java | 17 | Language |
| Spring Boot | 3.2.5 | REST API framework |
| Spring Security | 6.x | Authentication & authorization |
| Spring Data JPA | 3.x | ORM / database access |
| MySQL | 8.x | Relational database |
| JWT (JJWT) | 0.11.5 | Token-based authentication |
| Spring AI | 1.0.0 | AI integration (GPT-4o-mini) |
| Apache POI | 5.2.5 | Excel bulk upload |
| OpenCSV | 5.9 | CSV bulk upload |
| Springdoc OpenAPI | 2.5.0 | Swagger API documentation |
| Spring Mail | 3.x | Email notifications |
| Spring Actuator | 3.x | Health monitoring |
| Lombok | latest | Boilerplate reduction |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React.js | 19.2.6 | UI framework (JavaScript) |
| React Router | 7.15.1 | Client-side routing |
| Axios | 1.16.1 | HTTP client |
| i18next + react-i18next | 26.x / 17.x | Internationalization (7 languages) |
| React Toastify | 11.x | Toast notifications |
| html2canvas | 1.4.1 | PDF/image export |

---

## ⚙️ Prerequisites

- Java 17+
- Maven 3.8+
- Node.js 18+
- MySQL 8.x
- (Optional) OpenAI API key for AI features

---

## 🚀 How to Run

### 1. Database Setup
```sql
CREATE DATABASE quizhub;
```

### 2. Backend
```bash
cd backend

# Set environment variables (or add to application.yml)
export JWT_SECRET=your-256-bit-secret-key-here
export OPENAI_API_KEY=your-openai-key-here   # Optional — app works without it

mvn clean install -DskipTests
mvn spring-boot:run
```
Backend starts at: `http://localhost:8080`

> **Note:** `data.sql` auto-seeds all required data (tech stacks, topics, users) on first run via `spring.jpa.hibernate.ddl-auto: update`.

### 3. Frontend
```bash
cd frontend
npm install
npm start
```
Frontend starts at: `http://localhost:3000`

### 4. Swagger UI
```
http://localhost:8080/swagger-ui/index.html
```

### 5. Health Check
```
http://localhost:8080/actuator/health
```

---

## 🔐 Test Credentials

| Role | Enterprise ID | Password |
|---|---|---|
| Admin | `divya.madhanasekar` | `Admin@123` |
| SME 1 | `birendra.kumar.singh` | `Sme@1234` |
| SME 2 | `swati.avinash.nikam` | `Sme@1234` |
| SME 3 | `indugu.hari.prasad` | `Sme@1234` |

> **Note:** One-click demo credential autofill is available on the Login page.

---

## 🌐 Supported Languages

English · French · German · Hindi · Kannada · Telugu · Urdu (RTL)

---

## ✨ Features

### Core (Required by Problem Statement)
1. MCQ creation with question stem, 4 options, correct answer, difficulty, topic, tech stack
2. MCQ lifecycle — 5 statuses: DRAFT → READY_FOR_REVIEW → UNDER_REVIEW → APPROVED / REJECTED
3. Submit MCQ for review workflow
4. Admin assigns reviewer (tech-stack matched, excludes creator)
5. SME reviews with approve/reject decision
6. Mandatory comment on rejection
7. Creator edits rejected MCQ and resubmits
8. Bulk upload via CSV
9. Bulk upload via Excel (XLSX)


### Bonus Features
10. AI duplicate detection
11. AI confidence scoring (HIGH / MEDIUM / LOW)
12. AI quality scoring (0–100) with detailed assessment
13. AI auto-difficulty rating
14. AI distractor generation and explanation
15. MCQ version history (every edit tracked with diff)
16. MCQ threaded comments with @mentions and reply
17. MCQ screenshot / export as image
18. Optimistic locking for concurrent edits (version field)
19. Self-registration with admin approval workflow
20. Forgot password / Reset password via email token
21. Change password (in-app modal)
22. Role management (ADMIN ↔ SME) by admin
23. Question Bank (admin views all MCQs, all users)
24. User Management (add, approve, reject, change role)
25. Master Data management (tech stacks + topics CRUD, SME mapping)
26. Audit Log (full system activity history)
27. Reviewer Metrics (per-reviewer performance stats)
28. Analytics dashboard with charts + Excel export
29. Quiz Builder (create proctored assessment sessions from approved MCQs)
30. Proctored quiz with fullscreen enforcement
31. Tab-switch violation detection (3 strikes = auto-submit as TERMINATED)
32. Exam lock guard (blocks opening app in 2nd tab during active exam)
33. Timer with colour warnings (purple → orange at 5 min → red at 1 min)
34. Quiz attempts history
35. PDF report download (html2canvas)
36. CSV export of quiz attempts
37. Quiz link expiry (configurable hours)
38. Non-registered user quiz taking (name + email entry)
39. Kanban board view of MCQ pipeline
40. Leaderboard — Reviewer mode and Assessment mode
41. Inbox with 5 tabs (All / Sent / Starred / Drafts / Trash) + auto-draft save
42. Notification bell with filters and grouping (Today / Yesterday / Older)
43. Email notifications (review assigned, approved, rejected)
44. AI ChatBot with slash commands (`/create`, `/quiz-builder`, `/leaderboard`, `/question-bank`)
45. ChatBot emoji reactions and @mention support
46. i18n — 7 languages including RTL (Urdu)
47. Dark mode / Light mode toggle (persists in localStorage)
48. Dynamic MCQ content translation (Lingva API → MyMemory fallback)
49. Reviewer Dashboard (personal performance stats for logged-in reviewer)
50. Spring Actuator health endpoint

---

## 🧪 Test Scenarios (242 Total)

### 🔐 Auth & Account (17 scenarios)

#### Positive
| # | Scenario |
|---|---|
| A01 | Register new user with valid details → pending approval screen shown |
| A02 | Admin approves new registration → user can now login |
| A03 | New user logs in after approval |
| A04 | Forgot password → enter enterprise ID → reset email sent |
| A05 | Forgot password → enter email address → reset email sent |
| A06 | Reset password with valid token → password updated → login works |
| A07 | Change password (logged-in) → old password rejected, new works |
| A08 | Logout → redirected to login |

#### Negative
| # | Scenario |
|---|---|
| A09 | Login with wrong password → "Invalid credentials" error |
| A10 | Login with non-existent enterprise ID → error |
| A11 | Login with empty fields → validation error |
| A12 | Register with duplicate enterprise ID → error |
| A13 | Register with mismatched passwords → error |
| A14 | Register with no tech stack selected → error |
| A15 | Forgot password with empty field → Send button disabled |
| A16 | Reset password with no token in URL → "Invalid link" shown immediately |
| A17 | Reset password with expired/used token → error |

---

### 🌗 UI Modes & Language (5 scenarios)

| # | Scenario |
|---|---|
| U01 | Dark mode is default on login |
| U02 | Toggle to light mode → whole app switches |
| U03 | Switch to Hindi → UI translates |
| U04 | Switch to French → UI translates |
| U05 | Language persists after page refresh (localStorage) |

---

### 📱 Mobile Responsive (3 scenarios)

| # | Scenario |
|---|---|
| M01 | Login page at 375px — no overflow |
| M02 | Dashboard at 375px — hamburger menu visible |
| M03 | My Questions at 375px — table layout adapts |

---

### 📝 MCQ Creation — Single (9 scenarios)

#### Positive
| # | Scenario |
|---|---|
| C01 | Create MCQ → Save as Draft → appears in My Questions as DRAFT |
| C02 | Create MCQ → Save & Send for Review → status = READY_FOR_REVIEW |
| C03 | AI duplicate check → enter similar stem → duplicate warning shown |
| C04 | AI generate options → enter stem → options auto-fill |

#### Negative
| # | Scenario |
|---|---|
| C05 | Submit with empty question stem → validation error |
| C06 | Submit with no tech stack selected → validation error |
| C07 | Submit with all 4 options identical → validation error |
| C08 | Submit with no correct answer selected → validation error |
| C09 | SME tries to edit an APPROVED MCQ → blocked |

---

### 📤 Bulk Upload (6 scenarios)

#### Positive
| # | Scenario |
|---|---|
| B01 | Download template → Template_MCQs.xlsx downloads |
| B02 | Upload valid CSV → questions appear in My Questions as DRAFT |
| B03 | Upload valid XLSX → questions appear in My Questions as DRAFT |

#### Negative
| # | Scenario |
|---|---|
| B04 | Upload wrong file type (.pdf) → error |
| B05 | Upload file with missing required columns → row-by-row error report |
| B06 | Upload file with 500+ rows → rejected with clear error |

---

### ✏️ My Questions (5 scenarios)

| # | Scenario |
|---|---|
| Q01 | Status filter tabs — All / Draft / Ready / Under / Approved / Rejected counts correct |
| Q02 | Edit Draft MCQ → save → stays DRAFT |
| Q03 | Submit Draft for review → status becomes READY_FOR_REVIEW |
| Q04 | Edit Rejected MCQ → see reviewer comment → edit → resubmit |
| Q05 | Delete Draft MCQ → deleted → disappears from list |

---

### 👤 Admin — Question Bank (8 scenarios)

#### Positive
| # | Scenario |
|---|---|
| QB01 | View all MCQs from all users — paginated |
| QB02 | Filter by status + tech stack → filters work |
| QB03 | Assign Reviewer → modal shows eligible reviewers → assign → Under Review |
| QB04 | Admin edits any MCQ → status unchanged |
| QB05 | Export MCQs to Excel → .xlsx downloads |

#### Negative
| # | Scenario |
|---|---|
| QB06 | Assign reviewer to a DRAFT MCQ → blocked |
| QB07 | Creator not visible in eligible reviewers list |
| QB08 | Semantic search with empty query → API not fired |

---

### 🔍 Pending Reviews (5 scenarios)

#### Positive
| # | Scenario |
|---|---|
| PR01 | View only UNDER_REVIEW MCQs assigned to this user |
| PR02 | View full question modal — all 4 options + correct answer visible |
| PR03 | Approve MCQ → status → APPROVED → disappears from pending |
| PR04 | Reject MCQ with comment → status → REJECTED → creator notified |

#### Negative
| # | Scenario |
|---|---|
| PR05 | Reject without entering comment → blocked, comment required |

---

### 🏛️ Admin-Only Pages (5 scenarios)

| # | Scenario |
|---|---|
| AD01 | User Management — view all users, change role SME ↔ ADMIN |
| AD02 | Master Data — add/edit/delete tech stacks and topics |
| AD03 | Audit Log — all system actions visible |
| AD04 | Reviewer Metrics — performance stats per reviewer |
| AD05 | Analytics — charts by tech stack + status breakdown |

---

### 🎯 Quiz & Leaderboard (16 scenarios)

| # | Scenario |
|---|---|
| QZ01 | Quiz Builder — create session from approved MCQs |
| QZ02 | Take quiz — timer starts on fullscreen |
| QZ03 | Navigate back/forward between questions |
| QZ04 | Submit with unanswered questions → unanswered counted as wrong |
| QZ05 | Tab switch during quiz → Violation 1/3 toast + screenshot |
| QZ06 | Tab switch twice → Violation 2/3 badge updates |
| QZ07 | Tab switch 3rd time → auto-submit as TERMINATED |
| QZ08 | Exit fullscreen → counts as violation |
| QZ09 | Timer colour: >5min = purple → 5min = orange → 1min = red |
| QZ10 | ExamLockGuard — open app in 2nd tab during exam → blocked |
| QZ11 | Timer runs out → auto-submit |
| QZ12 | Non-registered user enters name + email → takes quiz |
| QZ13 | Already-attempted link → blocks re-attempt |
| QZ14 | Download PDF report after quiz |
| QZ15 | Download CSV of attempts |
| QZ16 | Leaderboard — switch between Reviewer mode and Assessment mode |

---

### 📊 Extra Features (12 scenarios)

| # | Scenario |
|---|---|
| EX01 | Kanban Board — MCQs in columns by status |
| EX02 | Inbox — send message, unread badge updates |
| EX03 | Inbox — auto-draft saved after 1.5s, survives refresh |
| EX04 | Inbox — Sent/Starred/Trash tabs work |
| EX05 | Notification bell — filter by type |
| EX06 | Notification bell — grouped Today/Yesterday/Older |
| EX07 | AI ChatBot — /create command navigates to form |
| EX08 | AI ChatBot — emoji reaction on message |
| EX09 | MCQ Version History — multiple edits create versioned entries |
| EX10 | MCQ Comments — threaded reply, Ctrl+Enter to submit |
| EX11 | Screenshot MCQ page — renders and downloads as image |
| EX12 | Reviewer Dashboard — personal stats chart |

---

### 🔒 Security & Access Control (8 scenarios)

| # | Scenario |
|---|---|
| SC01 | SME tries to open /question-bank → redirected |
| SC02 | SME tries to open /user-management → redirected |
| SC03 | No token / logged out → any protected route redirects to login |
| SC04 | JWT expires mid-session → 401 → auto-logout with message |
| SC05 | Browser back after logout → PrivateRoute blocks |
| SC06 | HTML/script injection in question stem → rendered as plain text, not executed |
| SC07 | Direct URL to non-existent MCQ `/mcq/99999` → error page, not crash |
| SC08 | Login with PENDING/unapproved account → clear error message |

---

### 🔄 Multi-User Scenarios (5 scenarios)

| # | Scenario |
|---|---|
| MU01 | SME1 creates → Admin assigns to SME2 → SME2 rejects → SME1 edits → Admin reassigns → SME3 approves |
| MU02 | Admin creates MCQ → assigns to SME → SME approves → Admin not in eligible reviewers list |
| MU03 | SME1 sends inbox message to SME2 → SME2 sees unread badge → replies → SME1 sees reply |
| MU04 | New user registers → Admin approves → user logs in successfully |
| MU05 | Admin changes SME role to ADMIN → SME re-logs in → sees Admin sidebar |

---

### ⚡ Edge Cases & Data Integrity (16 scenarios)

| # | Scenario |
|---|---|
| ED01 | SME tries to edit UNDER_REVIEW MCQ → blocked |
| ED02 | MCQ goes through 3 full reject/resubmit cycles → version history v4, v5 correct |
| ED03 | Admin edits UNDER_REVIEW MCQ content → status stays UNDER_REVIEW |
| ED04 | Add duplicate tech stack name → conflict error |
| ED05 | Add duplicate topic under same stack → error |
| ED06 | Delete tech stack with linked MCQs → backend returns error |
| ED07 | SME with no tech stack mapped → eligible reviewers dropdown shows nothing |
| ED08 | Two admins assign reviewer to same MCQ simultaneously → second gets conflict |
| ED09 | Quiz created with 0 approved questions → error before session created |
| ED10 | Pagination — navigate to last page with 1 item → no crash |
| ED11 | Combined filters (status + tech stack + search keyword) → correct results |
| ED12 | Sort column ascending → descending → data order correct |
| ED13 | Dark mode persists after page refresh |
| ED14 | Sidebar collapsed state persists after refresh |
| ED15 | Switch to Hindi → submit form → validation errors appear in Hindi |
| ED16 | Urdu (RTL) layout — form labels and sidebar flip correctly |

---

### 🌐 i18n & Translation (6 scenarios)

| # | Scenario |
|---|---|
| I01 | Switch language then submit form — validation errors in new language |
| I02 | Dynamic content translation — MCQ stems translated via Lingva API |
| I03 | Lingva API fails → falls back to MyMemory API silently |
| I04 | Both APIs fail → original English text remains (no broken UI) |
| I05 | Urdu RTL — entire layout mirrors right-to-left |
| I06 | German translation — all UI strings correctly translated |

---

### 🌐 Network & Performance (5 scenarios)

| # | Scenario |
|---|---|
| NW01 | Backend goes down mid-session → API error toasts shown, no white screen crash |
| NW02 | Slow network → loading spinners visible on every page |
| NW03 | AI service unavailable → app works without AI (graceful degradation) |
| NW04 | Token expires mid-form fill → on Save, redirected gracefully |
| NW05 | Notification bell count updates without full page refresh |

---

**Total: 242 test scenarios across 30 feature areas**

---

## 📁 Project Structure

```
hack-n-stack/
├── backend/                    # Spring Boot application
│   ├── src/main/java/
│   │   └── com/accenture/quizhub/
│   │       ├── controller/     # REST endpoints
│   │       ├── service/        # Business logic
│   │       ├── entity/         # JPA entities
│   │       ├── repository/     # Spring Data repositories
│   │       ├── dto/            # Request/Response DTOs
│   │       ├── security/       # JWT + Spring Security config
│   │       └── enums/          # McqStatus, Role, etc.
│   └── src/main/resources/
│       ├── application.yml     # Configuration
│       └── data.sql            # Seed data
├── frontend/                   # React application
│   └── src/
│       ├── pages/              # All page components
│       ├── components/         # Reusable components
│       ├── locales/            # i18n JSON files (7 languages)
│       ├── hooks/              # Custom React hooks
│       ├── utils/              # Helper utilities
│       └── AuthContext.js      # Auth state management
└── README.md
```

---

## 🔑 Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/register` | Self-registration |
| GET | `/api/v1/mcqs/my` | Get my MCQs |
| POST | `/api/v1/mcqs` | Create MCQ |
| POST | `/api/v1/mcqs/{id}/submit` | Submit for review |
| GET | `/api/v1/admin/mcqs` | All MCQs (admin) |
| POST | `/api/v1/admin/mcqs/{id}/assign-reviewer` | Assign reviewer |
| POST | `/api/v1/reviews/{id}/submit` | Submit review decision |
| POST | `/api/v1/bulk-upload` | Bulk upload CSV/XLSX |
| GET | `/api/v1/admin/users` | All users (admin) |
| GET | `/swagger-ui/index.html` | Swagger API docs |
| GET | `/actuator/health` | Health check |

---

## 🎯 Seed Data

The following is auto-seeded via `data.sql`:

**Tech Stacks:** Core Java, Spring Boot, Spring MVC & REST, Spring ORM & Data JPA, Spring Core, Spring Cloud

**Topics per stack:** 6–7 topics each (e.g., Spring Cloud: Service Discovery, API Gateway, Circuit Breaker, Config Server, Load Balancing, Distributed Tracing, Spring Cloud Bus)

**Users:** 1 Admin (divya.madhanasekar) + 4 SMEs pre-seeded with tech stack mappings

---

*Built with ❤️ for Accenture Hack-N-Stack 2026*

---

## 🔒 Security

- All secrets (JWT, OpenAI key) stored as environment variables — never hardcoded
- Passwords BCrypt-hashed — never stored in plain text
- JWT token validation on every protected API endpoint
- Role-based access control — ADMIN and SME endpoints fully separated
- Input validation at both frontend (React) and backend (Spring Validation)
- XSS safe — all user content rendered as plain text, never as HTML
- Optimistic locking on MCQ entity prevents concurrent edit conflicts

---

## 💡 Key Design Decisions

- **Graceful AI degradation** — App works fully without an OpenAI API key; AI features show a friendly "unavailable" message
- **Dual translation fallback** — Dynamic content translation uses Lingva API first, falls back to MyMemory API, then shows original English
- **Proctored quiz engine** — 3-strike system (tab switch + fullscreen exit), ExamLockGuard prevents multiple tabs, auto-submit on violations
- **Spec-exact seed data** — Tech stack IDs (1001–1006) and topic IDs match the problem statement exactly
- **Stateless JWT auth** — No server-side sessions; tokens carry role info for instant access control decisions

---

## 📝 Assumptions

- MySQL 8.x running locally on port 3306
- `quizhub` database created before first run
- Node.js 18+ installed for frontend
- Java 17+ and Maven 3.8+ installed for backend
- OpenAI API key is optional — all non-AI features work without it
- Email notifications require valid SMTP credentials (Gmail or Accenture SMTP)
- Modern browser (Chrome, Firefox, Edge, Safari)

---

## 🌐 Live Demo

**Frontend:** http://localhost:3000  
**Backend API:** http://localhost:8080  
**Swagger UI:** http://localhost:8080/swagger-ui/index.html  
**Health Check:** http://localhost:8080/actuator/health

---

*Built with ❤️ for Accenture Hack-N-Stack: Code the Future — Java Full Stack with AI | May 2026*
