# Spec-Driven Development Document
## Smart Quiz AI Hub — Level 1 Hackathon
### Hack-N-Stack: Code the Future | Java Full Stack with AI 2026

---

## Table of Contents
1. [Problem Overview](#1-problem-overview)
2. [Goals & Non-Goals](#2-goals--non-goals)
3. [Actors & Roles](#3-actors--roles)
4. [User Stories](#4-user-stories)
5. [MCQ Lifecycle State Machine](#5-mcq-lifecycle-state-machine)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [System Architecture](#8-system-architecture)
9. [Database Schema](#9-database-schema)
10. [REST API Contracts](#10-rest-api-contracts)
11. [Frontend Component Design](#11-frontend-component-design)
12. [AI Integration Spec](#12-ai-integration-spec)
13. [Bulk Upload Spec](#13-bulk-upload-spec)
14. [Business Rules & Validations](#14-business-rules--validations)
15. [Error Handling Strategy](#15-error-handling-strategy)
16. [Security Spec](#16-security-spec)
17. [Test Scenarios](#17-test-scenarios)
18. [Assumptions & Open Questions](#18-assumptions--open-questions)
19. [Edge Cases & Gap Analysis](#19-edge-cases--gap-analysis)

---

## 1. Problem Overview

Valkey ATCI's Learning and Talent Transformation (L&TT) team currently relies on **third-party tools** (e.g., Google Forms, Kahoot) to create and administer quiz questions. This leads to:

- No control over quiz data
- No customization or branding
- No unified review/approval workflow
- No leaderboard or performance tracking
- No bulk management of questions
- Limited analytics and reporting

### Solution
Build an **internal Smart Quiz AI Hub** — a full-stack Java + React/Angular application with:
- A structured MCQ lifecycle (Draft → Approved)
- Role-based access (SME and Admin)
- Bulk upload via Excel
- AI-powered question generation and duplicate detection

---

## 2. Goals & Non-Goals

### Goals
- [x] Centralized MCQ repository
- [x] Role-based access control (SME, Admin)
- [x] Full MCQ lifecycle management
- [x] Single question creation via UI form
- [x] Bulk question upload via Excel template
- [x] Review & approval workflow with comments
- [x] Admin question bank management
- [x] Admin reviewer assignment
- [x] Spring AI integration for generation & similarity detection

### Non-Goals (Out of Scope for Level 1)
- [ ] Quiz session/exam taking by participants
- [ ] Leaderboard and scoring
- [ ] Email/push notifications on status change
- [ ] Multi-language support
- [ ] Advanced analytics/reporting dashboard

---

## 3. Actors & Roles

| Role | Description | Access Level |
|------|-------------|-------------|
| **SME** | Subject Matter Expert. Creates, edits, and reviews MCQs within their skill domain | Standard user |
| **Admin** | Super-user. All SME capabilities + manages question bank + assigns reviewers | Elevated user |

### Role Permission Matrix

| Feature | SME | Admin |
|---------|-----|-------|
| Create MCQ (single) | ✅ | ✅ |
| Bulk upload MCQs | ✅ | ✅ |
| View own questions | ✅ | ✅ |
| Edit own Draft/Rejected MCQ | ✅ | ✅ |
| Edit any MCQ (any status except Draft-others) | ❌ | ✅ |
| Review assigned MCQs | ✅ | ✅ |
| View all MCQs (Question Bank) | ❌ | ✅ |
| Assign reviewer to MCQ | ❌ | ✅ |
| Approve/Reject MCQ | ✅ (assigned only) | ✅ (any) |

---

## 4. User Stories

### Authentication
- **US-001**: As a user, I want to log in with my enterprise credentials so that I can access the platform based on my role.
- **US-002**: As a user, I want to be redirected to my role-specific dashboard after login.

### SME — Question Creation
- **US-101**: As an SME, I want to create a single MCQ using a form so that I can add questions to the repository.
- **US-102**: As an SME, I want to save an MCQ as Draft so that I can come back and edit it later.
- **US-103**: As an SME, I want to submit an MCQ for review (Ready for Review) so that it enters the approval workflow.
- **US-104**: As an SME, I want to bulk upload MCQs from an Excel file so that I can add multiple questions efficiently.
- **US-105**: As an SME, I want to download the Excel template so that I know the correct format for bulk upload.

### SME — Question Management
- **US-201**: As an SME, I want to view all my MCQs with their current status in a paginated table so that I have visibility over my questions.
- **US-202**: As an SME, I want to edit a Draft MCQ so that I can refine it before submitting.
- **US-203**: As an SME, I want to edit a Rejected MCQ and view reviewer comments so that I can address the feedback and resubmit.
- **US-204**: As an SME, I want to resubmit a Rejected MCQ for review after updating it.

### SME — Review
- **US-301**: As an SME, I want to see all MCQs assigned to me for review in a Pending Reviews tab.
- **US-302**: As an SME, I want to view the full details of an MCQ before approving or rejecting it.
- **US-303**: As an SME, I want to approve an MCQ so that it moves to the Approved state.
- **US-304**: As an SME, I want to reject an MCQ with mandatory comments so that the creator knows what to fix.

### Admin — Question Bank
- **US-401**: As an Admin, I want to view all MCQs from all SMEs in a paginated Question Bank table.
- **US-402**: As an Admin, I want to assign a reviewer SME to a "Ready for Review" MCQ.
- **US-403**: As an Admin, I want to see a filtered list of eligible SMEs (same tech stack, not the creator) when assigning a reviewer.
- **US-404**: As an Admin, I want to edit any MCQ (except another user's Draft) at any stage.

### AI Features
- **US-501**: As an SME, I want AI to suggest similar/duplicate questions when I create a new MCQ so that I avoid duplicates.
- **US-502**: As an SME/Admin, I want AI to help generate MCQ options based on a question stem so that I can speed up question creation.

---

## 5. MCQ Lifecycle State Machine

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
                    ▼                                         │
              ┌──────────┐                                    │
   Create ──► │  DRAFT   │◄── Edit (creator only)            │
              └──────────┘                                    │
                    │                                         │
          "Save & Send for Review"                            │
                    │                                         │
                    ▼                                         │
        ┌─────────────────────┐                               │
        │  READY FOR REVIEW   │                               │
        └─────────────────────┘                               │
                    │                                         │
          Admin assigns reviewer                              │
                    │                                         │
                    ▼                                         │
          ┌──────────────────┐                                │
          │   UNDER REVIEW   │                                │
          └──────────────────┘                                │
           │               │                                  │
        Approve          Reject                               │
           │               │                                  │
           ▼               ▼                                  │
      ┌──────────┐   ┌──────────┐                             │
      │ APPROVED │   │ REJECTED │─── Creator edits ──────────┘
      └──────────┘   └──────────┘
```

### State Transition Rules

| From State | Action | By | To State |
|-----------|--------|----|---------|
| — | Create MCQ | SME/Admin | `DRAFT` |
| `DRAFT` | Save & Send for Review | Creator | `READY_FOR_REVIEW` |
| `READY_FOR_REVIEW` | Assign Reviewer | Admin | `UNDER_REVIEW` |
| `UNDER_REVIEW` | Approve | Assigned Reviewer | `APPROVED` |
| `UNDER_REVIEW` | Reject (with comments) | Assigned Reviewer | `REJECTED` |
| `REJECTED` | Edit & Resubmit | Creator | `READY_FOR_REVIEW` |
| `DRAFT` | Edit | Creator only | `DRAFT` |
| Any (except others' `DRAFT`) | Edit | Admin | Same state |

---

## 6. Functional Requirements

### FR-01: Authentication & Authorization
- FR-01.1: System must support login with enterprise ID and password.
- FR-01.2: System must enforce role-based access (SME vs Admin) on all endpoints.
- FR-01.3: JWT tokens must be used for stateless session management.
- FR-01.4: Token expiry must be handled gracefully (redirect to login).
- FR-01.5: After login, the header/navbar displays the user as **`enterprise_id [role]`** format — e.g. `birendra.kumar.singh [expert]` for SME, `divya.madhanasekar [admin]` for Admin (from Slide 7/12 screenshots).

### FR-02: MCQ Creation (Single)
- FR-02.1: Clicking "+ Add Question" button shows a choice dialog with two options: **"Add from UI"** and **"Bulk Upload"** (from Slide 8).
- FR-02.2: "Add from UI" opens a form with: Question Stem (textarea), Technology Stack (dropdown), Topic (dropdown), Difficulty (dropdown: Easy/Medium/Hard), Option A, Option B, Option C, Option D, Correct Answer field.
- FR-02.3: "Save" button saves with `DRAFT` status.
- FR-02.4: "Save & Send for Review" saves with `READY_FOR_REVIEW` status.
- FR-02.5: All fields except Topic are mandatory.
- FR-02.6: AI similarity check must run before saving and warn if duplicates found.

### FR-03: MCQ Bulk Upload
- FR-03.1: System must provide a downloadable Excel template (`Template_MCQs.xlsx`). Both `.xlsx` and `.csv` files are accepted for upload (Slide 8).
- FR-03.2: Upload form shows: Download Template button, file chooser, expected columns list.
- FR-03.3: Upload must validate: tech stack, topic, difficulty, question stem, 4 options, correct answer.
- FR-03.4: Invalid rows must be highlighted in an error report shown to the user.
- FR-03.5: Valid MCQs are saved as `DRAFT` and appear in "My Questions".
- FR-03.6: Partial upload is allowed (valid rows saved, invalid rows reported).

### FR-04: My Questions
- FR-04.1: Paginated table showing all MCQs created by the logged-in user. Table header: "Questions created by logged-in user".
- FR-04.2: **Status filter tabs** at top: All (count) | Draft (count) | Ready for Review (count) | Under Review (count) | Approved (count) | Rejected (count).
- FR-04.3: Columns: Question Stem (truncated), Technology Stack (colored badge), Topic, Difficulty (colored badge), Status (colored badge), Actions.
- FR-04.4: Edit button visible only for `DRAFT` and `REJECTED` status MCQs.
- FR-04.5: Edit form for `REJECTED` MCQ must show Reviewer Comments field with rejection feedback.
- FR-04.6: Default sort: most recently updated first. Pagination shows "Showing X to Y of Z questions".

### FR-05: My Pending Reviews
- FR-05.1: Show only MCQs assigned to the logged-in user with `UNDER_REVIEW` status.
- FR-05.2: Page header shows **summary counters**: `X Pending  Y Approved  Z Rejected` (counts of MCQs in each state assigned to this reviewer — from Slide 10 screenshot).
- FR-05.3: Each row shows: Creator Enterprise ID, Question Stem (truncated), Submitted date/time, **"Pending" badge** (yellow), "View Full Question" button, Feedback textbox labeled **"Add feedback (optional)..."**, Approve (green) and Reject (pink/red) buttons.
- FR-05.4: Feedback textbox label says "optional" — it is optional for APPROVE but **mandatory (validated) for REJECT**.
- FR-05.5: "View Full Question" opens a modal showing: Question Stem, all 4 options, correct answer marked with checkmark.
- FR-05.6: Approve updates MCQ status to `APPROVED`.
- FR-05.7: Reject requires non-empty comment, updates status to `REJECTED`, saves comment.
- FR-05.8: After approving or rejecting, the row is removed from this tab. Status updates are immediately visible on creator's My Questions tab.

### FR-06: Admin — Question Bank Management
- FR-06.1: Paginated table of ALL MCQs with creator's enterprise ID visible.
- FR-06.2: Filter tabs by Status (All, Draft, Ready for Review, Under Review, Approved, Rejected). Additional filters: Tech Stack, Topic, Difficulty, Creator.
- FR-06.3: Table columns: Question (stem), Creator, Status (badge), **Reviewer** (enterprise ID if assigned), Actions.
- FR-06.4: "Assign Reviewer" button visible only on `READY_FOR_REVIEW` MCQs. "Edit" button visible on ALL MCQs (per Admin rules).
- FR-06.5: Assign Reviewer dialog shows: Technology Stack, Topic, Creator Enterprise ID, dropdown labeled "Choose reviewer mapped for [TechStack]".
- FR-06.6: Eligible reviewers = all users (SMEs **and Admins**) with matching tech stack in `sme_tech_mapping`, excluding the creator. An Admin can be assigned as a reviewer.
- FR-06.7: On assign: MCQ status changes to `UNDER_REVIEW`, reviewer_id saved. Change immediately visible in Question Bank Management table.
- FR-06.8: "Edit" button available for all MCQs except `DRAFT` MCQs not created by the Admin.

### FR-07: Master Data
- FR-07.1: Technology stacks loaded from DB master table (not hardcoded).
- FR-07.2: Topics are linked to technology stacks (topic dropdown filters by selected tech stack).
- FR-07.3: SME-to-tech-stack mapping maintained in DB.

---

## 7. Non-Functional Requirements

| Category | Requirement |
|----------|------------|
| **Performance** | Page load < 2 seconds; API response < 500ms for list endpoints |
| **Scalability** | Should support up to 1000 MCQs and 100 concurrent users |
| **Security** | JWT auth, input validation, SQL injection prevention, XSS protection |
| **Usability** | Responsive UI, error messages must be user-friendly |
| **Availability** | Application should run on localhost for demo purposes |
| **Maintainability** | Code must follow Java/React best practices, documented API |
| **Data Integrity** | MCQ status transitions must be atomic |

---

## 8. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND                              │
│         ReactJS / AngularJS (Port: 3000)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  SME Module  │  │ Admin Module │  │  Auth Module │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP/REST (JSON)
                         │ Authorization: Bearer <JWT>
┌────────────────────────▼────────────────────────────────┐
│                 BACKEND (Spring Boot)                    │
│                   Port: 8080                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Spring Security (JWT Filter)        │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Auth        │  │  MCQ         │  │  Admin       │  │
│  │  Controller  │  │  Controller  │  │  Controller  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Auth        │  │  MCQ         │  │  Upload      │  │
│  │  Service     │  │  Service     │  │  Service     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Spring AI Service                   │   │
│  │  (Question Generation + Similarity Detection)    │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Spring Data JPA / Hibernate            │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                    DATABASE                              │
│              MySQL 8.4 / PostgreSQL                     │
│   users | mcqs | tech_stacks | topics |                 │
│   sme_tech_mapping | review_comments                    │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | ReactJS | 18+ |
| HTTP Client | Axios | Latest |
| State Management | React Context / Redux | Latest |
| Backend | Spring Boot | 3.x (LTS) |
| Security | Spring Security + JWT | 3.x |
| ORM | Spring Data JPA + Hibernate | 3.x |
| AI | Spring AI | Latest |
| Database | MySQL | 8.4 |
| Build Tool | Maven | 3.x |
| Java | OpenJDK | 17+ |

---

## 9. Database Schema

### Table: `users`
```sql
CREATE TABLE users (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    enterprise_id VARCHAR(50)  NOT NULL UNIQUE,
    full_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          ENUM('SME', 'ADMIN') NOT NULL DEFAULT 'SME',
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Table: `tech_stacks`
```sql
CREATE TABLE tech_stacks (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL UNIQUE,
    is_active  BOOLEAN NOT NULL DEFAULT TRUE
);
```

### Table: `topics`
```sql
CREATE TABLE topics (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    tech_stack_id BIGINT NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (tech_stack_id) REFERENCES tech_stacks(id)
);
```

### Table: `sme_tech_mapping`
```sql
CREATE TABLE sme_tech_mapping (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id       BIGINT NOT NULL,
    tech_stack_id BIGINT NOT NULL,
    UNIQUE KEY uq_user_tech (user_id, tech_stack_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (tech_stack_id) REFERENCES tech_stacks(id)
);
```

### Table: `mcqs`
```sql
CREATE TABLE mcqs (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    question_stem   TEXT         NOT NULL,
    tech_stack_id   BIGINT       NOT NULL,
    topic_id        BIGINT,
    difficulty      ENUM('EASY', 'MEDIUM', 'HARD') NOT NULL,
    option_a        VARCHAR(500) NOT NULL,
    option_b        VARCHAR(500) NOT NULL,
    option_c        VARCHAR(500) NOT NULL,
    option_d        VARCHAR(500) NOT NULL,
    correct_answer  ENUM('A', 'B', 'C', 'D') NOT NULL,
    status          ENUM('DRAFT','READY_FOR_REVIEW','UNDER_REVIEW','APPROVED','REJECTED') NOT NULL DEFAULT 'DRAFT',
    creator_id      BIGINT       NOT NULL,
    reviewer_id     BIGINT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tech_stack_id) REFERENCES tech_stacks(id),
    FOREIGN KEY (topic_id) REFERENCES topics(id),
    FOREIGN KEY (creator_id) REFERENCES users(id),
    FOREIGN KEY (reviewer_id) REFERENCES users(id)
);
```

### Table: `review_comments`
```sql
CREATE TABLE review_comments (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    mcq_id      BIGINT       NOT NULL,
    reviewer_id BIGINT       NOT NULL,
    comment     TEXT         NOT NULL,
    action      ENUM('REJECTED', 'APPROVED') NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mcq_id) REFERENCES mcqs(id),
    FOREIGN KEY (reviewer_id) REFERENCES users(id)
);
```

### ER Diagram (Text)
```
users ──< sme_tech_mapping >── tech_stacks ──< topics
  │                                               │
  │ (creator_id)                                  │
  └──────────────────────────> mcqs <─────────────┘
                                │  (topic_id)
                                │ (reviewer_id) ──> users
                                │
                                └──< review_comments >── users (reviewer_id)
```

---

## 10. REST API Contracts

### Base URL: `http://localhost:8080/api/v1`
### Headers: `Authorization: Bearer <JWT>`

---

### 10.1 Auth Endpoints

#### POST `/auth/login`
**Request:**
```json
{
  "enterpriseId": "john.doe",
  "password": "password123"
}
```
**Response 200:**
```json
{
  "token": "eyJhbGci...",
  "role": "SME",
  "enterpriseId": "john.doe",
  "fullName": "John Doe"
}
```
**Response 401:**
```json
{ "error": "Invalid credentials" }
```

---

### 10.2 MCQ Endpoints (SME + Admin)

#### GET `/mcqs/my-questions?page=0&size=10&status=DRAFT`
List MCQs created by the logged-in user.

**Response 200:**
```json
{
  "content": [
    {
      "id": 1,
      "questionStem": "What is polymorphism?",
      "techStack": "Java",
      "topic": "OOP",
      "difficulty": "MEDIUM",
      "status": "DRAFT",
      "createdAt": "2026-06-20T10:00:00",
      "updatedAt": "2026-06-20T10:00:00"
    }
  ],
  "totalElements": 25,
  "totalPages": 3,
  "currentPage": 0
}
```

#### GET `/mcqs/{id}`
Get full MCQ detail (including reviewer comments if REJECTED).

**Response 200:**
```json
{
  "id": 1,
  "questionStem": "What is polymorphism?",
  "techStack": { "id": 1, "name": "Java" },
  "topic": { "id": 2, "name": "OOP" },
  "difficulty": "MEDIUM",
  "optionA": "Overloading only",
  "optionB": "One interface, many implementations",
  "optionC": "A type of inheritance",
  "optionD": "None of the above",
  "correctAnswer": "B",
  "status": "REJECTED",
  "creatorId": "john.doe",
  "reviewerComments": [
    {
      "reviewer": "jane.smith",
      "comment": "Option A is incomplete. Please elaborate.",
      "action": "REJECTED",
      "createdAt": "2026-06-20T14:00:00"
    }
  ]
}
```

#### POST `/mcqs`
Create a new MCQ.

**Request:**
```json
{
  "questionStem": "What is polymorphism?",
  "techStackId": 1,
  "topicId": 2,
  "difficulty": "MEDIUM",
  "optionA": "...",
  "optionB": "...",
  "optionC": "...",
  "optionD": "...",
  "correctAnswer": "B",
  "action": "SAVE"
}
```
> `action`: `"SAVE"` → `DRAFT` | `"SEND_FOR_REVIEW"` → `READY_FOR_REVIEW`

**Response 201:**
```json
{ "id": 42, "status": "DRAFT", "message": "MCQ created successfully" }
```

#### PUT `/mcqs/{id}`
Update an existing MCQ (only DRAFT or REJECTED, or Admin).

**Request:** Same as POST body
**Response 200:**
```json
{ "id": 42, "status": "READY_FOR_REVIEW", "message": "MCQ updated and sent for review" }
```

#### DELETE `/mcqs/{id}`
Delete a DRAFT MCQ (creator or Admin only).

**Response 200:**
```json
{ "message": "MCQ deleted successfully" }
```

---

### 10.3 Review Endpoints

#### GET `/mcqs/pending-reviews?page=0&size=10`
List MCQs assigned to the logged-in user for review (UNDER_REVIEW only).

**Response 200:** Same paginated structure as `/mcqs/my-questions`

#### POST `/mcqs/{id}/review`
Submit review decision.

**Request:**
```json
{
  "action": "REJECT",
  "comment": "Option A needs clarification."
}
```
> `action`: `"APPROVE"` | `"REJECT"` (comment required for REJECT)

**Response 200:**
```json
{ "id": 42, "status": "REJECTED", "message": "MCQ rejected with comments" }
```

---

### 10.4 Admin Endpoints

#### GET `/admin/question-bank?page=0&size=10&status=&techStackId=&creatorId=`
All MCQs with filters.

**Response 200:** Paginated MCQ list with `creatorEnterpriseId` field.

#### POST `/admin/mcqs/{id}/assign-reviewer`
Assign a reviewer to a READY_FOR_REVIEW MCQ.

**Request:**
```json
{ "reviewerId": 15 }
```
**Response 200:**
```json
{ "id": 42, "status": "UNDER_REVIEW", "reviewerEnterpriseId": "jane.smith" }
```

#### GET `/admin/eligible-reviewers?techStackId=1&excludeUserId=10`
Get list of all users (SMEs **and Admins**) eligible to review — same tech stack in `sme_tech_mapping`, excluding the creator. Admins can also be assigned as reviewers.

**Response 200:**
```json
[
  { "id": 15, "enterpriseId": "jane.smith", "fullName": "Jane Smith", "role": "SME" },
  { "id": 18, "enterpriseId": "bob.jones", "fullName": "Bob Jones", "role": "SME" },
  { "id": 2,  "enterpriseId": "admin.user", "fullName": "Admin User", "role": "ADMIN" }
]
```

---

### 10.5 Upload Endpoints

#### GET `/upload/template`
Download the Excel template.

**Response:** Binary file (`Template_MCQs.xlsx`)

#### POST `/upload/bulk`
Upload populated Excel file.

**Request:** `multipart/form-data` with file field `mcqFile`

**Response 200:**
```json
{
  "totalRows": 20,
  "successCount": 17,
  "failureCount": 3,
  "errors": [
    { "row": 5, "field": "correctAnswer", "message": "Must be A, B, C, or D" },
    { "row": 9, "field": "difficulty", "message": "Invalid difficulty level" },
    { "row": 14, "field": "questionStem", "message": "Required field is empty" }
  ]
}
```

---

### 10.6 Master Data Endpoints

#### GET `/master/tech-stacks`
**Response 200:**
```json
[
  { "id": 1, "name": "Java" },
  { "id": 2, "name": "Spring Boot" },
  { "id": 3, "name": "ReactJS" }
]
```

#### GET `/master/topics?techStackId=1`
**Response 200:**
```json
[
  { "id": 1, "name": "OOP", "techStackId": 1 },
  { "id": 2, "name": "Collections", "techStackId": 1 }
]
```

---

### 10.7 AI Endpoints

#### POST `/ai/check-similarity`
Check if a question is similar to existing ones.

**Request:**
```json
{ "questionStem": "Explain polymorphism in Java" }
```
**Response 200:**
```json
{
  "hasSimilar": true,
  "similarQuestions": [
    { "id": 5, "questionStem": "What is polymorphism?", "similarity": 0.87 }
  ]
}
```

#### POST `/ai/generate-options`
AI-generate MCQ options for a question stem.

**Request:**
```json
{
  "questionStem": "What does JVM stand for?",
  "techStack": "Java"
}
```
**Response 200:**
```json
{
  "optionA": "Java Virtual Machine",
  "optionB": "Java Variable Manager",
  "optionC": "Java Verified Module",
  "optionD": "Java Version Manager",
  "suggestedCorrectAnswer": "A"
}
```

---

## 11. Frontend Component Design

### 11.1 Page / Route Structure

```
/login                          → LoginPage
/dashboard                      → Dashboard (role-aware)
  /my-questions                 → MyQuestionsPage
    /my-questions/new           → CreateQuestionPage
    /my-questions/edit/:id      → EditQuestionPage
    /my-questions/bulk-upload   → BulkUploadPage
  /pending-reviews              → PendingReviewsPage
    /pending-reviews/:id        → ReviewDetailPage
  /question-bank (Admin only)   → QuestionBankPage
    /question-bank/edit/:id     → AdminEditQuestionPage
```

### 11.2 Component Hierarchy

```
App
├── AuthProvider (context)
├── Router
│   ├── LoginPage
│   │   └── LoginForm
│   └── ProtectedLayout
│       ├── Navbar
│       ├── Sidebar (role-conditional tabs)
│       └── Routes
│           ├── MyQuestionsPage
│           │   ├── QuestionTable (paginated)
│           │   ├── StatusBadge
│           │   └── ActionButtons
│           ├── CreateEditQuestionPage
│           │   ├── QuestionForm
│           │   │   ├── TechStackDropdown
│           │   │   ├── TopicDropdown (filtered)
│           │   │   ├── DifficultySelector
│           │   │   ├── OptionsInput (x4)
│           │   │   ├── CorrectAnswerRadio
│           │   │   └── AISimilarityWarning
│           │   └── RejectionCommentsBox (conditional)
│           ├── BulkUploadPage
│           │   ├── TemplateDownloadButton
│           │   ├── FileUploadDropzone
│           │   └── UploadResultTable
│           ├── PendingReviewsPage
│           │   ├── ReviewTable
│           │   └── ReviewActionPanel
│           │       ├── FeedbackTextarea
│           │       ├── ApproveButton
│           │       └── RejectButton
│           └── QuestionBankPage (Admin)
│               ├── FilterPanel
│               ├── QuestionBankTable
│               └── AssignReviewerDialog
│                   ├── MCQSummaryCard
│                   └── ReviewerDropdown
```

### 11.3 Status Badge Colors

| Status | Color |
|--------|-------|
| DRAFT | Grey |
| READY_FOR_REVIEW | Blue |
| UNDER_REVIEW | Yellow/Orange |
| APPROVED | Green |
| REJECTED | Red |

---

## 12. AI Integration Spec

### Tool: Spring AI

#### 12.1 Similarity Detection
- **When triggered:** Every time a user types/pastes a question stem (debounced 800ms)
- **Algorithm:** Cosine similarity using vector embeddings
- **Threshold:** Warn if similarity > 0.75
- **Storage:** Use a vector store or calculate on-the-fly against existing APPROVED + READY_FOR_REVIEW questions

#### 12.2 Option Generation
- **When triggered:** User clicks "AI Suggest Options" button in the form
- **LLM Prompt Template:**
  ```
  Generate 4 multiple choice options for the following question about {techStack}.
  Question: {questionStem}
  Return JSON with optionA, optionB, optionC, optionD, and correctAnswer (A/B/C/D).
  Make only one option clearly correct. Others should be plausible but wrong.
  ```

#### 12.3 Spring AI Config (application.yml)
```yaml
spring:
  ai:
    openai:
      api-key: ${OPENAI_API_KEY}
      chat:
        model: gpt-4o-mini
      embedding:
        model: text-embedding-3-small
```

---

## 13. Bulk Upload Spec

### Excel Template Format (`Template_MCQs.xlsx`)
> **Column order from Slide 9 UI screenshot — includes Question ID as first column**
> **Slide 8 says "CSV or XLSX" — both formats accepted**

| Column | Field | Required | Allowed Values |
|--------|-------|----------|----------------|
| A | Question ID | No | Optional — ignored on import (auto-generated by DB) |
| B | Technology Stack | Yes | Must match master list (e.g. "Spring Boot") |
| C | Topic | Yes | Must match master list for given tech stack |
| D | Difficulty | Yes | Easy / Medium / Hard (case-insensitive) |
| E | Question Stem | Yes | Non-empty string |
| F | Option A | Yes | Non-empty string |
| G | Option B | Yes | Non-empty string |
| H | Option C | Yes | Non-empty string |
| I | Option D | Yes | Non-empty string |
| J | Correct Answer | Yes | A / B / C / D (case-insensitive) |

### Validation Rules
1. TechStack must exist in `tech_stacks` table
2. Topic (if provided) must belong to the given TechStack
3. Difficulty must be exactly `EASY`, `MEDIUM`, or `HARD`
4. CorrectAnswer must be exactly `A`, `B`, `C`, or `D`
5. No field in columns A, C, D, E, F, G, H, I can be blank
6. Max 500 rows per upload

### Processing
- Library: **Apache POI**
- Rows 1 is header (skipped)
- Processing starts from Row 2
- On partial success: valid rows saved, error report returned

---

## 14. Business Rules & Validations

### BR-01: State Transitions
- Only the **creator** can transition a `DRAFT` to `READY_FOR_REVIEW`
- Only an **Admin** can transition `READY_FOR_REVIEW` to `UNDER_REVIEW` (via assignment)
- Only the **assigned reviewer** can transition `UNDER_REVIEW` to `APPROVED` or `REJECTED`
- Only the **creator** can transition `REJECTED` back to `READY_FOR_REVIEW`
- Admin can perform any transition except editing another user's `DRAFT`

### BR-02: Reviewer Assignment
- Reviewer must have the **same tech stack** as the MCQ
- Reviewer **cannot be the creator** of the MCQ
- Reviewer **can be an Admin**
- One MCQ can only have **one active reviewer** at a time

### BR-03: Rejection
- Rejection **requires** a non-empty comment
- Comments are **preserved** through multiple review cycles
- Creator can view **all** historical comments when editing a Rejected MCQ

### BR-04: Editing
- `DRAFT` → Only creator OR Admin (if they are the creator)
- `REJECTED` → Only creator OR Admin
- `READY_FOR_REVIEW`, `UNDER_REVIEW`, `APPROVED` → Only Admin
- If Admin edits a non-Draft MCQ, status remains **unchanged**

### BR-05: Duplicate Detection
- System warns (not blocks) on similarity > 0.75
- Final decision to proceed is with the SME/Admin

---

## 15. Error Handling Strategy

### HTTP Status Codes

| Scenario | Status Code |
|----------|------------|
| Success | 200 / 201 |
| Bad request / validation failure | 400 |
| Unauthorized (no/invalid token) | 401 |
| Forbidden (role mismatch) | 403 |
| Resource not found | 404 |
| State transition violation | 409 Conflict |
| Server error | 500 |

### Standard Error Response
```json
{
  "timestamp": "2026-06-20T10:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Correct answer must be A, B, C, or D",
  "path": "/api/v1/mcqs"
}
```

### Frontend Error Handling
- 401 → Clear token, redirect to `/login`
- 403 → Show "Access Denied" message
- 400 → Show field-level validation errors inline
- 500 → Show generic "Something went wrong" toast

---

## 16. Security Spec

### Authentication
- JWT-based stateless auth
- Token validity: 24 hours
- Refresh token: Not required for Level 1

### Authorization
- Spring Security method-level security (`@PreAuthorize`)
- Role checks on every endpoint:
  - `ROLE_SME` — own MCQ operations
  - `ROLE_ADMIN` — all operations

### Input Validation
- All string inputs: trimmed, max length enforced
- SQL Injection: prevented via JPA parameterized queries
- XSS: sanitize HTML entities in question text
- File Upload: validate MIME type (`.xlsx` or `.csv` allowed), max size 5MB

### Password Storage
- BCrypt hashing (strength 10)

---

## 17. Test Scenarios

### Authentication
- [ ] Valid login returns JWT
- [ ] Invalid password returns 401
- [ ] Expired token returns 401
- [ ] SME accessing Admin endpoint returns 403

### MCQ Creation
- [ ] SME creates MCQ with all fields → saved as DRAFT
- [ ] SME creates MCQ with "Send for Review" → saved as READY_FOR_REVIEW
- [ ] Missing required field → 400 with field error
- [ ] Invalid correct answer value → 400

### Lifecycle
- [ ] SME sends DRAFT to review → status becomes READY_FOR_REVIEW
- [ ] Admin assigns reviewer → status becomes UNDER_REVIEW
- [ ] Reviewer approves → status becomes APPROVED
- [ ] Reviewer rejects with no comment → 400 error
- [ ] Reviewer rejects with comment → status becomes REJECTED
- [ ] Creator edits REJECTED MCQ and resubmits → status becomes READY_FOR_REVIEW
- [ ] SME tries to edit APPROVED MCQ → 403 error

### Admin
- [ ] Admin sees all MCQs in Question Bank
- [ ] Admin assigns reviewer from eligible list only
- [ ] Creator not in eligible reviewer list
- [ ] Admin edits READY_FOR_REVIEW MCQ → status unchanged

### Bulk Upload
- [ ] Valid Excel file → all rows saved as DRAFT
- [ ] File with some invalid rows → valid rows saved, errors reported
- [ ] Empty file → 400 error
- [ ] Wrong file type → 400 error
- [ ] File > 5MB → 400 error

### AI
- [ ] Similarity check returns results for similar question
- [ ] Similarity check returns empty for unique question
- [ ] Option generation returns 4 options + correct answer

---

## 18. Assumptions & Open Questions

### Assumptions
1. Users (SMEs and Admins) are pre-seeded in the database (no self-registration)
2. Tech stacks, topics, and SME-tech mappings are pre-seeded via SQL scripts
3. Authentication is done against the local database (not LDAP/AD integration)
4. The application runs locally on `localhost` for the hackathon demo
5. Only one reviewer can be assigned per MCQ at any time
6. Admin can assign themselves as reviewer
7. Passwords are hashed using BCrypt before seeding

### Open Questions

| # | Question | Default Assumption |
|---|----------|--------------------|
| OQ-1 | Should MCQ status revert when admin re-assigns a reviewer? | Re-assignment only allowed on READY_FOR_REVIEW (status stays) |
| OQ-2 | Can the same SME review the same MCQ multiple times? | Yes, if re-assigned |
| OQ-3 | Should rejected MCQs show all historical comments or only latest? | Show all |
| OQ-4 | What happens if an Admin deletes a user who has pending reviews? | Out of scope |
| OQ-5 | Is there a max number of review cycles? | No limit |
| OQ-6 | Should AI similarity check against DRAFT questions too? | No — only APPROVED + READY_FOR_REVIEW |

---

## 19. Edge Cases & Gap Analysis

> This section documents every edge case identified from the problem statement that could be missed during development. Each is categorized and tagged with the component it affects.

---

### 19.1 MCQ Lifecycle Edge Cases

#### EC-L01: Admin is the Creator — Can They Edit Their Own Draft?
- **Scenario:** Admin creates an MCQ (status = DRAFT). Can they edit it?
- **Rule:** YES. The restriction is "Admin cannot edit *another user's* Draft". Admin can always edit their own Draft.
- **Implementation:** Backend check → `mcq.creatorId == currentUser.id` → allow edit regardless of role.

#### EC-L02: Admin Tries to Re-assign Reviewer on UNDER_REVIEW MCQ
- **Scenario:** MCQ is already `UNDER_REVIEW`. Admin wants to change the reviewer.
- **Rule:** Admin can only assign a reviewer when status is `READY_FOR_REVIEW`. Re-assignment while `UNDER_REVIEW` is NOT allowed unless explicitly supported.
- **Decision:** Block re-assignment on `UNDER_REVIEW`. Return 409 Conflict with message "MCQ is already under review. Cannot reassign."

#### EC-L03: What if MCQ is Edited While Reviewer is Reviewing It?
- **Scenario:** Creator edits MCQ (REJECTED state) and resubmits at the same time reviewer is still looking at old version.
- **Rule:** This cannot happen simultaneously — once status is `REJECTED`, it's no longer `UNDER_REVIEW`. The reviewer has already acted.
- **Safe:** No concurrency issue here due to sequential state transitions.

#### EC-L04: Two Admins Assign Reviewer Simultaneously (Race Condition)
- **Scenario:** Admin A and Admin B both open the Assign Reviewer dialog for the same MCQ and click Assign at the same time.
- **Rule:** Use optimistic locking (`@Version` on MCQ entity). The second admin gets a 409 Conflict error.
- **Implementation:** Add `version` column to `mcqs` table. JPA `@Version` annotation handles this.

#### EC-L05: Creator Tries to Review Their Own MCQ
- **Scenario:** An SME who created MCQ is somehow assigned as reviewer (e.g., direct API call).
- **Rule:** Block at API level. Return 403 Forbidden: "You cannot review your own MCQ."
- **Implementation:** Backend check → `mcq.creatorId != reviewerId` on both assign and review endpoints.

#### EC-L06: Approved MCQ — Can it Ever Go Back?
- **Scenario:** Admin wants to re-open an already APPROVED MCQ.
- **Rule:** `APPROVED` is a **terminal state** for Level 1. Once approved, it cannot be un-approved.
- **Admin Edit Exception:** Admin CAN edit the *content* of an APPROVED MCQ (fix typos), but status stays `APPROVED`.

#### EC-L07: Creator Deactivated After Submitting MCQ
- **Scenario:** SME submits MCQ for review, then their account is deactivated.
- **Rule:** MCQ continues through the lifecycle normally. The creator field remains, but the user is inactive.
- **Display:** Show enterprise ID even if user is inactive (do not delete MCQs on user deactivation).

#### EC-L08: Admin Assigns Themselves as Reviewer for Their Own MCQ
- **Scenario:** Admin is both the creator and tries to assign themselves as the reviewer.
- **Rule:** BLOCK. Same rule as SMEs — creator cannot review their own MCQ.
- **Error:** 400 Bad Request: "Reviewer cannot be the same as the creator."

---

### 19.2 Reviewer Assignment Edge Cases

#### EC-R01: No Eligible Reviewer Exists for a Tech Stack
- **Scenario:** MCQ has tech stack "Cassandra" but no other SME/Admin in the system has that skill.
- **Rule:** Return empty list from `/admin/eligible-reviewers`. Show UI message: "No eligible reviewers available for this tech stack."
- **Admin Action:** Admin can either add a tech stack mapping for another user first, or the MCQ stays as `READY_FOR_REVIEW`.

#### EC-R02: Only One SME Knows the Tech Stack and They Are the Creator
- **Scenario:** Only `sme.java` knows Java, and the MCQ was created by `sme.java`.
- **Rule:** Empty eligible reviewer list unless an Admin also has that tech stack mapped in `sme_tech_mapping`.
- **Note:** Admins **must** have tech stack entries in `sme_tech_mapping` to appear in the eligible reviewer dropdown. This is a data setup requirement — seed data must include Admin tech stack mappings.
- **Problem Statement (Slide 12):** *"The admin can also assign another admin as the reviewer."*

#### EC-R03: Reviewer Submits Review Twice (Double Submit)
- **Scenario:** Reviewer clicks Approve button, API responds slowly, reviewer clicks again.
- **Rule:** Check MCQ status before processing. If status is already `APPROVED` or `REJECTED`, return 409 Conflict: "This MCQ has already been reviewed."
- **Frontend:** Disable Approve/Reject buttons after first click (loading state).

#### EC-R04: Non-Assigned SME Tries to Review via Direct API Call
- **Scenario:** SME `bob.jones` is NOT the assigned reviewer but sends a POST to `/mcqs/5/review`.
- **Rule:** Backend checks `mcq.reviewerId == currentUser.id`. If not, return 403 Forbidden.

---

### 19.3 Bulk Upload Edge Cases

#### EC-B01: Duplicate Question Stems Within the Same Upload File
- **Scenario:** Row 3 and Row 12 have the exact same question stem in the same Excel file.
- **Rule:** Treat as separate MCQs (allow duplicates within a batch). AI similarity check is for awareness only, not blocking.
- **Enhancement:** Flag duplicate rows within the file in the error report with a WARNING (not error).

#### EC-B02: Tech Stack Name Case Mismatch
- **Scenario:** Excel has "java" but DB has "Java".
- **Rule:** Case-insensitive matching during validation. Normalize to DB value on save.
- **Implementation:** `tech_stacks.name` lookup using `LOWER()` or `.equalsIgnoreCase()`.

#### EC-B03: Password-Protected Excel File
- **Scenario:** User uploads an encrypted/password-protected `.xlsx`.
- **Rule:** Apache POI will throw an exception. Return 400: "File is password-protected. Please upload an unprotected file."

#### EC-B04: Excel File with Merged Cells
- **Scenario:** User has merged cells in their Excel template, breaking column alignment.
- **Rule:** Detect merged cell regions and treat them as validation errors for affected rows. Report: "Row X: Merged cells detected. Please use the standard template."

#### EC-B05: Wrong File Type Uploaded (e.g., .xls, .pdf)
- **Scenario:** User uploads an old `.xls` or `.pdf` format.
- **Rule:** Validate MIME type AND file extension. Only `.xlsx` and `.csv` accepted (Slide 8).
- **Error:** 400: "Invalid file type. Only .xlsx or .csv files are accepted."

#### EC-B06: Blank Rows in the Middle of the Excel File
- **Scenario:** Row 5 is completely empty, but rows 6-10 have valid data.
- **Rule:** Skip blank rows gracefully. Do not count them as errors.

#### EC-B07: Extra/Unknown Columns in Excel
- **Scenario:** User adds extra columns (Column J onwards) to the template.
- **Rule:** Ignore extra columns. Only process columns A-I.

#### EC-B08: More Than 500 Rows
- **Scenario:** User tries to upload 600 rows.
- **Rule:** Reject entire upload with 400: "Upload exceeds maximum limit of 500 rows per batch."

#### EC-B09: File Upload Size Limit
- **Scenario:** User uploads a 10MB Excel file.
- **Rule:** Max file size = 5MB. Return 400: "File size exceeds 5MB limit."
- **Spring Config:** `spring.servlet.multipart.max-file-size=5MB`

#### EC-B10: CorrectAnswer Points to an Empty Option
- **Scenario:** CorrectAnswer = "C" but Option C cell is blank.
- **Rule:** Validate that the option referenced by CorrectAnswer is non-empty. Flag as error.

---

### 19.4 Concurrency & Data Integrity Edge Cases

#### EC-C01: SME Submits DRAFT for Review Twice (Double Click)
- **Scenario:** SME clicks "Save & Send for Review" twice quickly.
- **Rule:** Idempotent check — if status is already `READY_FOR_REVIEW`, second call returns 200 with current state (no re-processing).
- **Frontend:** Disable button after first click.

#### EC-C02: Simultaneous Bulk Uploads by Same User
- **Scenario:** SME opens two tabs and uploads two files simultaneously.
- **Rule:** Each upload is independent. Both processed normally. Duplicates handled by AI similarity warning.

#### EC-C03: MCQ Deleted While Under Review
- **Scenario:** Admin deletes an MCQ that is currently `UNDER_REVIEW`.
- **Rule:** Block deletion of any MCQ not in `DRAFT` state. Only `DRAFT` MCQs can be deleted.
- **Error:** 409 Conflict: "Only Draft MCQs can be deleted."

---

### 19.5 Auth & Session Edge Cases

#### EC-A01: Token Expires Mid-Session
- **Scenario:** User is on the Edit Question page, token expires, they click Save.
- **Rule:** API returns 401. Frontend detects 401 → clears token → redirects to `/login` with message: "Session expired. Please log in again."
- **Frontend:** Axios interceptor handles global 401.

#### EC-A02: User's Role Changed While Logged In
- **Scenario:** Admin downgrades an SME to... (N/A for Level 1 — roles are pre-seeded).
- **Decision:** Out of scope. Roles are pre-seeded and static for Level 1.

#### EC-A03: Same User Logged In on Two Browsers
- **Scenario:** `sme.java` is logged in on Chrome and Firefox simultaneously.
- **Rule:** JWT is stateless — both sessions are valid independently. No conflict.

#### EC-A04: Brute Force Login Attempts
- **Scenario:** Attacker tries many passwords on an enterprise ID.
- **Rule:** For Level 1, implement basic rate limiting (max 5 failed attempts → 1 minute lockout on the backend).

---

### 19.6 Validation Edge Cases

#### EC-V01: All Four Options Are Identical
- **Scenario:** SME enters the same text for all 4 options.
- **Rule:** Validate that all 4 options are distinct. Return 400: "All options must be unique."

#### EC-V02: Correct Answer Contradicts Option Text
- **Scenario:** This is a content quality issue, not a technical one. AI similarity/generation helps here.
- **Rule:** Technical validation only ensures correct answer field is A/B/C/D. Content quality = reviewer's job.

#### EC-V03: Extremely Long Question Stem
- **Scenario:** SME pastes a 10,000 character paragraph as question stem.
- **Rule:** Max question stem length = 2000 characters. Max option length = 500 characters.
- **DB Column:** `question_stem TEXT` supports this, but add application-level validation.

#### EC-V04: HTML/Script Injection in Question Text
- **Scenario:** SME types `<script>alert('xss')</script>` in question stem.
- **Rule:** Sanitize all text inputs server-side using OWASP HTML Sanitizer or strip HTML tags before saving.
- **Frontend:** Display as plain text, not rendered HTML.

#### EC-V05: SQL Injection via Question Text
- **Scenario:** SME types `'; DROP TABLE mcqs; --` in question stem.
- **Rule:** JPA parameterized queries prevent this automatically. Never use raw SQL string concatenation.

#### EC-V06: Topic Not Belonging to Selected Tech Stack
- **Scenario:** API receives `techStackId=1` (Java) and `topicId=9` (Angular topic).
- **Rule:** Backend validates `topic.techStackId == request.techStackId`. Return 400 if mismatch.

#### EC-V07: Non-existent Tech Stack or Topic ID in Request
- **Scenario:** API receives `techStackId=9999` which doesn't exist.
- **Rule:** Return 404: "Tech stack not found."

---

### 19.7 UI/UX Edge Cases

#### EC-U01: Empty State — No Questions Yet
- **Scenario:** New SME with zero MCQs visits "My Questions" tab.
- **Rule:** Show friendly empty state: "You haven't created any questions yet. Click 'Add Question' to get started."

#### EC-U02: Pagination — Last Page with Fewer Items
- **Scenario:** 21 MCQs, page size 10 — page 3 has only 1 item.
- **Rule:** Handled by Spring Data's `Page` object naturally. Frontend renders whatever is in `content[]`.

#### EC-U03: Rejection Comment Exceeds Display Area
- **Scenario:** Reviewer writes a 2000-character rejection comment.
- **Rule:** Show first 300 chars with "Read more" toggle in the Edit form.

#### EC-U04: Session Timeout Warning
- **Scenario:** JWT is about to expire (e.g., 5 minutes left).
- **Rule:** Frontend tracks token expiry time, shows a warning banner 5 minutes before expiry.

#### EC-U05: Browser Back Button After Successful Submit
- **Scenario:** SME submits a question, then presses browser back button, then re-submits form.
- **Rule:** After successful create/update, redirect to `/my-questions` (GET). Back button goes to list, not the form with pre-filled data. This prevents duplicate submissions.

---

### 19.8 Admin-Specific Edge Cases

#### EC-AD01: Admin Edits Content of UNDER_REVIEW MCQ — Does it Reset Review?
- **Scenario:** MCQ is `UNDER_REVIEW`. Admin edits the question stem. Should the review restart?
- **Decision:** Admin edit does NOT change the status. Review continues with the updated content. The reviewer sees the latest version.
- **Note:** This is a deliberate design choice — Admin edits are corrections, not new submissions.

#### EC-AD02: Question Bank Pagination with Active Filters
- **Scenario:** Admin filters by `status=APPROVED` + `techStackId=1`. Result is 0 items on page 3.
- **Rule:** If requested page > totalPages, return page 0 of filtered results (or empty content with metadata). Do not return 404.

#### EC-AD03: Assigning Reviewer to MCQ Not in READY_FOR_REVIEW State
- **Scenario:** Admin tries POST `/admin/mcqs/5/assign-reviewer` but MCQ 5 is in `DRAFT`.
- **Rule:** Return 409 Conflict: "Reviewer can only be assigned to MCQs in 'Ready for Review' status."

---

### 19.9 Missing Fields from Original Spec (Additions)

The following were implied but not explicitly stated in the problem statement:

| # | Gap Identified | Resolution |
|---|----------------|-----------|
| G-01 | No mention of MCQ deletion | Allow deletion of DRAFT only (creator or Admin) |
| G-02 | No mention of what happens when topic is not selected | Topic is optional; tech stack is mandatory |
| G-03 | No mention of question stem character limit | Set 2000 char max |
| G-04 | No explicit mention of pagination defaults | Default page size = 10, max = 50 |
| G-05 | No mention of sort order for lists | Default: `updatedAt DESC` |
| G-06 | No mention of what "View Full Question" shows in Pending Reviews | Show full MCQ detail including all 4 options and correct answer |
| G-07 | No mention of whether correct answer is shown to reviewer | YES — reviewer must see the correct answer to validate it |
| G-08 | No mention of whether APPROVED MCQs appear in My Questions | YES — show all statuses including APPROVED in My Questions tab |
| G-09 | No mention of max options length | Set 500 char max per option |
| G-10 | No mention of CORS config for frontend-backend connection | Allow `http://localhost:3000` in Spring CORS config |
| G-11 | No mention of how topics cascade when tech stack changes in edit | Changing tech stack resets topic to null (UI clears topic dropdown) |
| G-12 | No mention of audit trail | Capture `created_at`, `updated_at` on all tables; `review_comments` provides review history |

---

### 19.10 Updated Database Schema (Additions from Edge Cases)

```sql
-- Add optimistic locking to mcqs table (EC-C01, EC-L04)
ALTER TABLE mcqs ADD COLUMN version INT NOT NULL DEFAULT 0;

-- Add max_length enforcement notes (EC-V03)
-- question_stem: TEXT (app enforces 2000 chars)
-- option_a/b/c/d: VARCHAR(500) already handles this

-- Ensure topic_id is nullable (G-02)
-- topic_id BIGINT NULL -- already defined this way
```

---

### 19.11 Updated API Error Responses (from Edge Cases)

| Edge Case | HTTP Code | Error Message |
|-----------|-----------|---------------|
| EC-L02 | 409 | "MCQ is already under review. Cannot reassign reviewer." |
| EC-L05 / EC-AD03 | 400 | "Reviewer cannot be the same as the creator." |
| EC-R03 | 409 | "This MCQ has already been reviewed." |
| EC-R04 | 403 | "You are not assigned as the reviewer for this MCQ." |
| EC-B03 | 400 | "File is password-protected. Please upload an unprotected file." |
| EC-B05 | 400 | "Invalid file type. Only .xlsx or .csv files are accepted." |
| EC-B08 | 400 | "Upload exceeds maximum limit of 500 rows per batch." |
| EC-B09 | 400 | "File size exceeds 5MB limit." |
| EC-C03 | 409 | "Only Draft MCQs can be deleted." |
| EC-V01 | 400 | "All four options must be unique." |
| EC-V06 | 400 | "Selected topic does not belong to the selected tech stack." |
| EC-V07 | 404 | "Tech stack not found." |
| EC-AD03 | 409 | "Reviewer can only be assigned to MCQs in 'Ready for Review' status." |

---

## Appendix A: Seed Data

### Technology Stacks
> **Exact data from Slide 15 of Level1_ProblemStatement.pptx — IDs start at 1001**
```sql
INSERT INTO tech_stacks (id, name) VALUES
(1001, 'Spring Cloud'),
(1002, 'Spring Boot'),
(1003, 'Spring Core'),
(1004, 'Spring MVC & REST'),
(1005, 'Spring ORM & Data JPA'),
(1006, 'Core Java');
```

### Sample SME Users (passwords: `Password@123`)
> **Exact enterprise IDs from Slide 16 of Level1_ProblemStatement.pptx**
```sql
INSERT INTO users (enterprise_id, full_name, email, password_hash, role) VALUES
('divya.madhanasekar', 'Divya Madhanasekar', 'divya.madhanasekar@valkey.com', '<bcrypt>', 'ADMIN'),
('gaurav.a.bhola',     'Gaurav Bhola',       'gaurav.a.bhola@valkey.com',     '<bcrypt>', 'SME'),
('birendra.kumar.singh','Birendra Singh',     'birendra.kumar.singh@valkey.com','<bcrypt>', 'SME'),
('swati.avinash.nikam','Swati Nikam',        'swati.avinash.nikam@valkey.com', '<bcrypt>', 'SME'),
('indugu.hari.prasad', 'Hari Prasad',        'indugu.hari.prasad@valkey.com',  '<bcrypt>', 'SME');
```

### SME-to-Tech-Stack Mappings
> **Exact mappings from Slide 16. Admin (divya.madhanasekar) mapped to all stacks per Slide 12 rule.**
```sql
-- gaurav.a.bhola (id=2) → Spring Cloud, Spring Core
INSERT INTO sme_tech_mapping (user_id, tech_stack_id) VALUES (2, 1001), (2, 1003);

-- birendra.kumar.singh (id=3) → Spring Boot
INSERT INTO sme_tech_mapping (user_id, tech_stack_id) VALUES (3, 1002);

-- divya.madhanasekar (id=4) → Spring MVC & REST, Spring Cloud
INSERT INTO sme_tech_mapping (user_id, tech_stack_id) VALUES (4, 1004), (4, 1001);

-- swati.avinash.nikam (id=5) → Spring Boot
INSERT INTO sme_tech_mapping (user_id, tech_stack_id) VALUES (5, 1002);

-- indugu.hari.prasad (id=6) → Spring Cloud
INSERT INTO sme_tech_mapping (user_id, tech_stack_id) VALUES (6, 1001);

-- Admin (divya.madhanasekar, id=1) mapped to ALL stacks so can review any MCQ
INSERT INTO sme_tech_mapping (user_id, tech_stack_id) VALUES
(1, 1001), (1, 1002), (1, 1003), (1, 1004), (1, 1005), (1, 1006);
```

### Topics
> **Exact data from Slide 15 — only Spring Cloud topics shown. Add stub topics for other stacks.**
```sql
INSERT INTO topics (id, tech_stack_id, name) VALUES
-- Spring Cloud (1001)
(1001, 1001, 'Introduction to Spring Cloud'),
(1002, 1001, 'Service Discovery design pattern – Eureka Server & Discovery Client'),
(1003, 1001, 'Eureka Heartbeats & Self Preservation'),
(1004, 1001, 'Spring Cloud Loadbalancer'),
(1005, 1001, 'Spring Cloud OpenFeign'),
(1006, 1001, 'Resilience4J- Circuit Breaker'),
(1007, 1001, 'Spring Boot Actuator'),
-- Spring Boot (1002)
(2001, 1002, 'Spring Boot Introduction'),
(2002, 1002, 'Spring Boot project'),
(2003, 1002, 'Spring Boot Starters'),
(2004, 1002, 'SpringBootApplication annotation'),
(2005, 1002, 'SpringApplication'),
-- Spring Core (1003)
(3001, 1003, 'Spring Core Concepts'),
(3002, 1003, 'Dependency Injection'),
(3003, 1003, 'Spring Beans'),
-- Spring MVC & REST (1004)
(4001, 1004, 'Spring MVC Architecture'),
(4002, 1004, 'REST Controllers'),
(4003, 1004, 'Request Mapping'),
-- Spring ORM & Data JPA (1005)
(5001, 1005, 'JPA Basics'),
(5002, 1005, 'Spring Data Repositories'),
(5003, 1005, 'Hibernate'),
-- Core Java (1006)
(6001, 1006, 'Java Basics'),
(6002, 1006, 'Collections'),
(6003, 1006, 'Java 8 Features');
```

### Sample MCQ Data
> **Exact rows from Slide 14 of Level1_ProblemStatement.pptx**
```sql
INSERT INTO mcqs (id, question_stem, option_a, option_b, option_c, option_d, correct_answer, difficulty, tech_stack_id, topic_id, creator_id, status) VALUES
(1001,
 'Alex is building a microservices-based system using Spring Boot. He wants features like centralized configuration, service discovery, and client-side load balancing without building everything from scratch. Which is the primary purpose of Spring Cloud?',
 'To replace Spring Boot completely',
 'To provide tools for building distributed systems and microservices',
 'To manage only database transactions',
 'To handle only UI development',
 'B', 'MEDIUM', 1001, 1001, 3, 'READY_FOR_REVIEW'),
(1002,
 'John has multiple instances of a service running dynamically in the cloud. He wants each service to automatically register itself and discover others without hardcoding URLs. Which component is used for this purpose?',
 'Spring MVC',
 'Eureka Server',
 'Hibernate',
 'Apache Tomcat',
 'B', 'MEDIUM', 1001, 1001, 3, 'APPROVED');
```



```
hack-n-stack/
├── backend/                          ← Spring Boot
│   ├── src/main/java/com/valkey/quizhub/
│   │   ├── config/                   ← Security, CORS, AI config
│   │   ├── controller/               ← REST Controllers
│   │   ├── service/                  ← Business logic
│   │   ├── repository/               ← JPA Repositories
│   │   ├── entity/                   ← JPA Entities
│   │   ├── dto/                      ← Request/Response DTOs
│   │   ├── enums/                    ← McqStatus, Role, Difficulty
│   │   ├── exception/                ← Custom exceptions + GlobalExceptionHandler
│   │   └── ai/                       ← Spring AI services
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   ├── data.sql                  ← Seed data
│   │   └── templates/Template_MCQs.xlsx
│   └── pom.xml
│
├── frontend/                         ← ReactJS
│   ├── src/
│   │   ├── api/                      ← Axios API calls
│   │   ├── components/               ← Reusable components
│   │   ├── pages/                    ← Route-level pages
│   │   ├── context/                  ← Auth context
│   │   ├── hooks/                    ← Custom hooks
│   │   └── utils/                    ← Helpers
│   └── package.json
│
├── SPEC.md                           ← This document
└── README.md                         ← Setup & run instructions
```

---


---

## 20. Sequence Diagrams

> Exact call-by-call flow between Frontend → Backend → DB → AI for the 5 most critical operations.

### 20.1 User Login
```
Frontend          Backend              DB
   |── POST /auth/login ───────────────►
   |  {enterpriseId, password}          |── SELECT user WHERE enterprise_id=? ──►
   |                                    |◄── user row ────────────────────────────
   |                                    |  BCrypt.verify(password, hash)
   |                                    |  Generate JWT (role, id, expiry)
   |◄── 200 {token, role, name} ────────
   |  localStorage.setItem(token)
   |  redirect → /dashboard
```

### 20.2 SME Creates MCQ (with AI check)
```
Frontend          Backend              DB              Spring AI
   |── POST /mcqs ──────────────────────►
   |  {stem, options, techStack...}     |  Validate JWT + body fields
   |                                    |── check similarity ─────────────────►
   |                                    |◄── {hasSimilar, matches} ────────────
   |                                    |  (if AI down: skip, add aiWarning)
   |                                    |── INSERT INTO mcqs ─────────────────►
   |                                    |◄── mcq.id ───────────────────────────
   |◄── 201 {id, status, aiWarning?} ───
```

### 20.3 Admin Assigns Reviewer
```
Frontend(Admin)   Backend              DB
   |── GET /admin/eligible-reviewers?techStackId=1&excludeUserId=10 ─────────►
   |                                    |── SELECT u.* FROM users u
   |                                    |   JOIN sme_tech_mapping ON user_id
   |                                    |   WHERE tech_stack_id=1 AND u.id!=10
   |◄── [{id, name, enterpriseId}] ─────
   |  Admin picks reviewerId=15
   |── POST /admin/mcqs/42/assign ──────►
   |  {reviewerId: 15}                  |  Check status == READY_FOR_REVIEW
   |                                    |  Check reviewerId != creatorId
   |                                    |  @Version optimistic lock check
   |                                    |── UPDATE mcqs SET status=UNDER_REVIEW,
   |                                    |   reviewer_id=15, version=version+1 ──►
   |◄── 200 {status: UNDER_REVIEW} ─────
```

### 20.4 Reviewer Rejects MCQ
```
Frontend(SME)     Backend              DB
   |── GET /mcqs/pending-reviews ───────►
   |◄── [list: UNDER_REVIEW MCQs] ───────
   |  Click View Full Question
   |── GET /mcqs/42 ────────────────────►
   |◄── full MCQ + options + history ────
   |  Type comment, click Reject
   |── POST /mcqs/42/review ────────────►
   |  {action:"REJECT", comment:"..."}   |  Validate reviewer == currentUser
   |                                    |  Validate comment not empty
   |                                    |── UPDATE mcqs SET status=REJECTED ──►
   |                                    |── INSERT INTO review_comments ───────►
   |◄── 200 {status: REJECTED} ──────────
   |  Remove row from Pending Reviews
```

### 20.5 Bulk Upload
```
Frontend          Backend              DB
   |── POST /upload/bulk (xlsx file) ───►
   |  multipart/form-data               |  Validate MIME = .xlsx
   |                                    |  Validate size <= 5MB
   |                                    |  Apache POI: open workbook
   |                                    |  Skip header row (row 1)
   |                                    |  For each data row:
   |                                    |    skip blank rows
   |                                    |    validate required columns
   |                                    |    lookup tech_stack (case-insensitive)
   |                                    |    collect error OR build MCQ object
   |                                    |── Batch INSERT valid MCQs ──────────►
   |◄── 200 {success:17, failed:3,
   |         errors:[{row,field,msg}]} ──
```

---

## 21. Database Indexes

> Add these after all CREATE TABLE statements. Without them, list queries do full table scans.

```sql
-- My Questions tab: WHERE creator_id = ? AND status = ?
CREATE INDEX idx_mcqs_creator_status   ON mcqs (creator_id, status);

-- Pending Reviews tab: WHERE reviewer_id = ? AND status = 'UNDER_REVIEW'
CREATE INDEX idx_mcqs_reviewer_status  ON mcqs (reviewer_id, status);

-- Admin Question Bank: combined filter by status + tech stack
CREATE INDEX idx_mcqs_status_tech      ON mcqs (status, tech_stack_id);

-- Single column fallbacks for flexible filtering
CREATE INDEX idx_mcqs_creator_id       ON mcqs (creator_id);
CREATE INDEX idx_mcqs_reviewer_id      ON mcqs (reviewer_id);
CREATE INDEX idx_mcqs_status           ON mcqs (status);
CREATE INDEX idx_mcqs_tech_stack_id    ON mcqs (tech_stack_id);

-- Eligible reviewer lookup
CREATE INDEX idx_sme_tech_stack        ON sme_tech_mapping (tech_stack_id);
CREATE INDEX idx_sme_tech_user         ON sme_tech_mapping (user_id);

-- Topic dropdown cascade filter
CREATE INDEX idx_topics_tech_stack     ON topics (tech_stack_id);

-- Load all comments for a rejected MCQ
CREATE INDEX idx_comments_mcq_id       ON review_comments (mcq_id);

-- Login lookup
CREATE UNIQUE INDEX idx_users_eid      ON users (enterprise_id);
```

| Index | Query It Speeds Up |
|-------|-------------------|
| `idx_mcqs_creator_status` | My Questions tab |
| `idx_mcqs_reviewer_status` | Pending Reviews tab |
| `idx_mcqs_status_tech` | Admin question bank combined filter |
| `idx_sme_tech_stack` | Eligible reviewer lookup |
| `idx_topics_tech_stack` | Topic dropdown cascade |
| `idx_comments_mcq_id` | Load rejection comment history |

---

## 22. Full Configuration Reference

### 22.1 Backend — `src/main/resources/application.yml`

```yaml
server:
  port: 8080

spring:
  application:
    name: smart-quiz-ai-hub

  datasource:
    url: jdbc:mysql://localhost:3306/quizhub?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
    username: root
    password: root
    driver-class-name: com.mysql.cj.jdbc.Driver

  jpa:
    hibernate:
      ddl-auto: validate        # use 'create' on first run, then 'validate'
    show-sql: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQL8Dialect

  sql:
    init:
      mode: always              # runs data.sql seed on startup

  servlet:
    multipart:
      enabled: true
      max-file-size: 5MB
      max-request-size: 6MB

  ai:
    openai:
      api-key: ${OPENAI_API_KEY:sk-placeholder}
      chat:
        options:
          model: gpt-4o-mini
          temperature: 0.7
      embedding:
        options:
          model: text-embedding-3-small

app:
  jwt:
    secret: ${JWT_SECRET:myS3cr3tK3yForJWTThatIsAtLeast32Chars!}
    expiration-ms: 86400000     # 24 hours

  cors:
    allowed-origins:
      - http://localhost:3000   # React dev server
      - http://localhost:4200   # Angular dev server

  upload:
    max-rows: 500

  ai:
    similarity-threshold: 0.75
    fallback-enabled: true      # if AI down, continue without check

logging:
  level:
    root: INFO
    com.valkey.quizhub: DEBUG
    org.springframework.security: WARN
  file:
    name: logs/quizhub.log
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n"
```

### 22.2 Frontend — `frontend/.env`

```env
REACT_APP_API_BASE_URL=http://localhost:8080/api/v1
REACT_APP_TOKEN_KEY=quizhub_token
REACT_APP_PAGE_SIZE=10
```

### 22.3 `docker-compose.yml`

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.4
    container_name: quizhub-mysql
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: quizhub
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      retries: 5

  backend:
    build: ./backend
    container_name: quizhub-backend
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:mysql://mysql:3306/quizhub?useSSL=false&allowPublicKeyRetrieval=true
      SPRING_DATASOURCE_USERNAME: root
      SPRING_DATASOURCE_PASSWORD: root
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      mysql:
        condition: service_healthy

  frontend:
    build: ./frontend
    container_name: quizhub-frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  mysql_data:
```

---

## 23. Maven Dependencies (pom.xml)

```xml
<dependencies>

  <!-- Spring Boot Web -->
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
  </dependency>

  <!-- Spring Security -->
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
  </dependency>

  <!-- JWT — version 0.11.5 -->
  <dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.11.5</version>
  </dependency>
  <dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.11.5</version>
    <scope>runtime</scope>
  </dependency>
  <dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.11.5</version>
    <scope>runtime</scope>
  </dependency>

  <!-- Spring Data JPA + Hibernate -->
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
  </dependency>

  <!-- MySQL Driver -->
  <dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <scope>runtime</scope>
  </dependency>

  <!-- Bean Validation (@NotNull, @Size, @NotBlank) -->
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
  </dependency>

  <!-- Spring AI — version 1.0.0 -->
  <dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-openai-spring-boot-starter</artifactId>
    <version>1.0.0</version>
  </dependency>

  <!-- Apache POI — Excel parsing — version 5.2.5 -->
  <dependency>
    <groupId>org.apache.poi</groupId>
    <artifactId>poi-ooxml</artifactId>
    <version>5.2.5</version>
  </dependency>

  <!-- Lombok -->
  <dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <optional>true</optional>
  </dependency>

  <!-- Actuator — GET /actuator/health -->
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
  </dependency>

  <!-- Swagger UI — http://localhost:8080/swagger-ui/index.html -->
  <dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.5.0</version>
  </dependency>

  <!-- Testing -->
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
  </dependency>
  <dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-test</artifactId>
    <scope>test</scope>
  </dependency>
  <dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>test</scope>
  </dependency>

</dependencies>
```

---

## 24. Logging Strategy

### What to Log

| Event | Level | Message Format |
|-------|-------|----------------|
| App startup | INFO | `SmartQuizAIHub started on port 8080` |
| Login success | INFO | `User [john.doe] logged in` |
| Login failure | WARN | `Failed login for [john.doe]` |
| MCQ created | INFO | `MCQ [id=42] created by [john.doe] status=DRAFT` |
| Status changed | INFO | `MCQ [id=42] DRAFT→READY_FOR_REVIEW by [john.doe]` |
| Reviewer assigned | INFO | `MCQ [id=42] assigned to [jane.smith] by [admin.user]` |
| MCQ approved | INFO | `MCQ [id=42] APPROVED by [jane.smith]` |
| MCQ rejected | INFO | `MCQ [id=42] REJECTED by [jane.smith]` |
| Bulk upload | INFO | `Bulk upload by [john.doe]: 22 saved, 3 failed` |
| Unauthorized | WARN | `403 on [/admin/question-bank] by [sme.java]` |
| Invalid JWT | WARN | `Invalid JWT token received` |
| AI call | DEBUG | `AI similarity check for stem hash [abc123]` |
| AI failure | ERROR | `Spring AI unavailable — skipping similarity check` |
| Slow query | WARN | `Slow query on mcqs table [523ms]` |

### What NEVER to Log
- Passwords (plain or hashed)
- JWT token values
- Full question content at INFO level
- Any PII beyond enterprise ID

### AI Failure Fallback Rule
If Spring AI is unavailable (no key, timeout, rate limit):
1. Log ERROR with full stack trace
2. **Continue saving MCQ** — never block the user for an AI issue
3. Return `"aiWarning": "Similarity check unavailable"` in response body
4. Frontend shows a yellow info banner (not a blocking error)

---

## 25. Hackathon Execution Plan

### Build Order — Most Critical Decision

```
WRONG ORDER (Common Mistake)     CORRECT ORDER
─────────────────────────────    ──────────────────────────────
1. AI features first             1. Auth + JWT
2. Bulk upload                   2. MCQ Create + My Questions
3. Admin section                 3. Review Workflow
4. Core lifecycle                4. Admin Question Bank + Assign Reviewer
5. Auth (last)                   5. Bulk Upload
                                 6. AI Integration (last — mock if time runs out)
```

A fully working app WITHOUT AI scores higher than broken AI with no core workflow.

---

### Phase 1 — Foundation (Day 1 AM)

| Task | Est. Time |
|------|----------|
| Spring Boot project + all packages | 30 min |
| MySQL schema (6 tables + indexes + seed data.sql) | 30 min |
| JWT: login endpoint + JwtFilter + SecurityConfig + CORS | 1.5 hr |
| React app + routing + AuthContext + PrivateRoute | 1 hr |
| Login page + Axios instance + global 401 interceptor | 45 min |
| **Checkpoint: Login works end-to-end** | — |

### Phase 2 — Core MCQ (Day 1 PM)

| Task | Est. Time |
|------|----------|
| MCQ entity + repo + service + controller | 1.5 hr |
| POST /mcqs + GET /mcqs/{id} | 45 min |
| GET /mcqs/my-questions paginated | 30 min |
| GET /master/tech-stacks + /master/topics | 30 min |
| Create Question form UI | 1.5 hr |
| My Questions table with status badges | 1 hr |
| **Checkpoint: SME can create and view own MCQs** | — |

### Phase 3 — Review Workflow (Day 2 AM)

| Task | Est. Time |
|------|----------|
| PUT /mcqs/{id} with state transition validation | 1 hr |
| POST /mcqs/{id}/review (approve + reject + comment) | 45 min |
| GET /mcqs/pending-reviews paginated | 30 min |
| Edit form showing rejection comments UI | 1 hr |
| Pending Reviews tab with approve/reject panel UI | 1 hr |
| **Checkpoint: Full review cycle works** | — |

### Phase 4 — Admin Features (Day 2 PM)

| Task | Est. Time |
|------|----------|
| GET /admin/question-bank with all filters | 45 min |
| GET /admin/eligible-reviewers | 30 min |
| POST /admin/mcqs/{id}/assign-reviewer | 30 min |
| Question Bank page with filter panel UI | 1.5 hr |
| Assign Reviewer dialog UI | 45 min |
| **Checkpoint: Admin workflow complete** | — |

### Phase 5 — Bulk Upload (Day 3 AM)

| Task | Est. Time |
|------|----------|
| Create Template_MCQs.xlsx | 20 min |
| Apache POI parser + row validator service | 1.5 hr |
| POST /upload/bulk + GET /upload/template | 45 min |
| Bulk Upload page + error result table UI | 1 hr |
| **Checkpoint: Bulk upload with error report works** | — |

### Phase 6 — AI Integration (Day 3 PM)

| Task | Est. Time |
|------|----------|
| Spring AI similarity service + graceful fallback | 1.5 hr |
| Spring AI option generation service | 1 hr |
| /ai/check-similarity + /ai/generate-options endpoints | 45 min |
| AI warning banner + Generate Options button UI | 45 min |
| **Checkpoint: AI features with fallback** | — |

### Phase 7 — Polish + Submission (Day 4)

| Task | Est. Time |
|------|----------|
| Status badge colors + UI polish | 1 hr |
| Empty states + loading spinners | 45 min |
| Toast notifications | 45 min |
| GET /auth/me endpoint | 20 min |
| End-to-end test all scenarios | 1.5 hr |
| Fix critical bugs | 1 hr |
| Record demo video (max 5 min) | 45 min |
| Complete submission PPT | 1 hr |
| Delete target/ + zip source code (max 10MB) | 15 min |
| **Submission complete** | — |

---

### Definition of Done — Per Feature

- [ ] API returns correct HTTP status codes for all cases
- [ ] Business rules enforced server-side (never trust frontend only)
- [ ] UI works without browser console errors
- [ ] 1 happy path + 1 error path tested manually
- [ ] No stack traces in backend logs for normal operations

---

### Three Missing API Endpoints (Addition to Section 10)

#### GET `/auth/me`
Frontend needs this on page refresh to reload user name and role from stored JWT.

**Response 200:**
```json
{ "enterpriseId": "john.doe", "fullName": "John Doe", "role": "SME" }
```

#### POST `/auth/logout`
JWT is stateless — this is a client-side token clear. Backend is a no-op returning 200.

**Response 200:**
```json
{ "message": "Logged out successfully" }
```

#### GET `/mcqs/my-questions?search=keyword&page=0&size=10`
Keyword search within own MCQs by question stem content.

**Response 200:**
```json
{ "content": [...], "totalElements": 5, "totalPages": 1, "currentPage": 0 }
```

---

### Feedback Textbox Logical Gap — Final Decision

**Problem Statement (Slide 10):** "The reviewer SME should be able to provide feedback in the Feedback textbox on the main page"

**Decision: Option A chosen**
- The feedback textbox IS the rejection comment field
- Visible at all times on the Pending Reviews row
- Validated and required ONLY when Reject button is clicked
- Submitted with REJECT action in a single API call: `POST /mcqs/{id}/review`
- Not saved as a draft note — no extra endpoint needed
- Fully satisfies the requirement

---

*Document Version: 2.0 | Updated: June 20, 2026 | Hack-N-Stack Level 1*

---

---

# SECTION 20: Live Quiz Battle Mode (Kahoot-style)
## Spec-Driven Development Document — Phase 2 Feature

> **Version:** 1.0 | **Date:** June 20, 2026 | **Author:** Team Valkey

---

## 20.1 Problem Statement

QuizHub AI currently supports self-paced individual assessments. There is no way for a host to run a **real-time competitive quiz** where all participants answer simultaneously, see live scores, and compete on a leaderboard. Platforms like Kahoot! and Mentimeter have proven that live quiz competitions drive engagement, learning retention, and participation in corporate and classroom settings.

**Gap:** QuizHub needs a Live Quiz Battle mode — host-controlled, PIN-joined, real-time, gamified.

---

## 20.2 Goals & Non-Goals

### Goals
- Allow any Admin or SME to host a live quiz session from any approved quiz
- Participants join using a 6-digit PIN — no login required for guests
- All participants answer the same question at the same time
- Difficulty-based scoring with time bonus
- Live leaderboard after every question
- Host controls: start, next, pause, extend timer, kick, end
- Reconnect recovery: participants can rejoin after disconnect without losing score
- Anti-cheat: no duplicate answers, no joins after session starts, no answer after timer

### Non-Goals (Phase 2)
- Team battle mode (group vs group)
- Video/image questions
- Anonymous polls (no scoring)
- Mobile native app
- Slack/Teams invite links
- Session recording/replay
- Adaptive difficulty

---

## 20.3 What Already Exists (Reuse, Do Not Rebuild)

| Existing Asset | How It Is Reused |
|---|---|
| `QuizController.java` — `Collections.shuffle()` | Question randomization — already works |
| `LoginRateLimitFilter.java` | Rate limiting — already applied |
| `StatsController.java` + `Analytics.js` | Post-session analytics — already works |
| `AIController.java` + `ChatBot.js` | AI hints/explanations after reveal |
| `NotificationController.java` | Session invite notifications |
| `Leaderboard.js` | Final results page |
| `QuizSession` entity | Referenced by new `LiveSession` |
| `QuizAttempt` entity | Final scores saved here for logged-in participants |
| `/actuator/health` | Monitoring — already configured |
| Approved MCQs in `mcq` table | Question pool for live sessions |
| JWT Auth | Host authentication; participants optional |

---

## 20.4 Actors & Roles

| Actor | Description |
|---|---|
| **Host** | Admin or SME. Creates session, controls pace, sees host dashboard |
| **Participant (logged-in)** | Joins by PIN, score saved to profile and `QuizAttempt` |
| **Participant (guest)** | Joins by PIN + display name only, score not persisted |

---

## 20.5 User Stories

### Host Stories
| ID | Story | Acceptance Criteria |
|---|---|---|
| LQ-H1 | As a Host, I want to start a live session from an existing quiz so participants can join | Session created, unique PIN shown, status = WAITING |
| LQ-H2 | As a Host, I want to see who has joined before I start | Lobby shows participant list updating in real time |
| LQ-H3 | As a Host, I want to advance to the next question | All participants see the same question simultaneously |
| LQ-H4 | As a Host, I want to pause the timer | Timer freezes for all participants |
| LQ-H5 | As a Host, I want to extend the timer by 15 seconds | Countdown increases for all participants |
| LQ-H6 | As a Host, I want to kick a disruptive participant | Participant is removed and cannot rejoin this session |
| LQ-H7 | As a Host, I want to end the session early | Session ends, final leaderboard shown to all |
| LQ-H8 | As a Host, I want to see a final results dashboard | Leaderboard with accuracy, avg score, most missed question |

### Participant Stories
| ID | Story | Acceptance Criteria |
|---|---|---|
| LQ-P1 | As a Participant, I want to join by entering a PIN | Valid PIN → lobby; invalid/expired PIN → error message |
| LQ-P2 | As a Participant, I want to see a countdown timer on each question | Timer visible and synced with all other players |
| LQ-P3 | As a Participant, I want instant feedback after answering | Green = correct + points earned; Red = wrong + 0 points |
| LQ-P4 | As a Participant, I want to see the leaderboard between questions | Top 5 shown with my rank highlighted |
| LQ-P5 | As a Participant, I want to rejoin if I disconnect | Rejoin token restores my score and active state |
| LQ-P6 | As a Guest, I want to join without creating an account | Display name + PIN only, no password required |

---

## 20.6 PIN Lifecycle

```
Host starts → Fresh 6-digit PIN generated (e.g. 483921) → status: WAITING
Players join by PIN → status: WAITING (joins still accepted)
Host clicks Start → status: ACTIVE (no new joins accepted)
Quiz ends (all questions done OR host ends early) → status: ENDED → PIN INVALID
Same quiz started again → new session → new PIN (e.g. 752104)
Auto-expire: sessions in WAITING for >2h with no start → auto-mark ENDED
```

**PIN generation rules:**
- Always 6 digits, zero-padded (`000001` → `999999`)
- Unique among all non-`ENDED` sessions at time of creation
- On collision, regenerate (max 10 attempts, then throw error)
- Multiple simultaneous live sessions allowed (different hosts, different PINs)

---

## 20.7 Scoring Formula

$$\text{points} = \text{base} \times \left(1 - \frac{t_{\text{answer}}}{t_{\text{limit}}} \times 0.5\right)$$

| Difficulty | Base Score | Instant Answer | Answer at Time Limit | Wrong / Timeout |
|---|---|---|---|---|
| EASY | 1,000 | 1,000 | 500 | 0 |
| MEDIUM | 1,500 | 1,500 | 750 | 0 |
| HARD | 2,000 | 2,000 | 1,000 | 0 |

- `t_answer` = milliseconds from question display to answer click
- `t_limit` = question time limit in milliseconds (default 30,000ms)
- Score rounded to nearest integer

---

## 20.8 Database Schema — New Tables

### Table: `live_session`
```sql
CREATE TABLE live_session (
  id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
  quiz_id               BIGINT NOT NULL,
  host_user_id          BIGINT NOT NULL,
  pin                   CHAR(6) NOT NULL,
  status                ENUM('WAITING','ACTIVE','ENDED') NOT NULL DEFAULT 'WAITING',
  current_question_index INT NOT NULL DEFAULT 0,
  time_limit_seconds    INT NOT NULL DEFAULT 30,
  created_at            DATETIME NOT NULL,
  started_at            DATETIME,
  ended_at              DATETIME,
  UNIQUE KEY uq_pin_active (pin, status),
  FOREIGN KEY (quiz_id) REFERENCES quiz_session(id),
  FOREIGN KEY (host_user_id) REFERENCES user(id)
);
```

### Table: `live_participant`
```sql
CREATE TABLE live_participant (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id     BIGINT NOT NULL,
  user_id        BIGINT,                          -- NULL for guests
  display_name   VARCHAR(50) NOT NULL,
  rejoin_token   CHAR(36) NOT NULL,               -- UUID
  total_score    INT NOT NULL DEFAULT 0,
  rank           INT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,   -- FALSE = kicked
  joined_at      DATETIME NOT NULL,
  UNIQUE KEY uq_session_name (session_id, display_name),
  FOREIGN KEY (session_id) REFERENCES live_session(id),
  FOREIGN KEY (user_id) REFERENCES user(id)
);
```

### Table: `live_answer`
```sql
CREATE TABLE live_answer (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id        BIGINT NOT NULL,
  participant_id    BIGINT NOT NULL,
  question_id       BIGINT NOT NULL,
  selected_option   CHAR(1) NOT NULL,             -- A | B | C | D
  is_correct        BOOLEAN NOT NULL,
  points_earned     INT NOT NULL DEFAULT 0,
  response_time_ms  BIGINT NOT NULL,
  answered_at       DATETIME NOT NULL,
  UNIQUE KEY uq_one_answer (session_id, participant_id, question_id),
  FOREIGN KEY (session_id) REFERENCES live_session(id),
  FOREIGN KEY (participant_id) REFERENCES live_participant(id),
  FOREIGN KEY (question_id) REFERENCES mcq(id)
);
```

---

## 20.9 REST API Contracts

### POST `/api/v1/live/sessions`
**Auth:** SME or Admin (JWT required)
**Request:**
```json
{ "quizId": 5, "timeLimitSeconds": 30 }
```
**Response 201:**
```json
{ "sessionId": 42, "pin": "483921", "status": "WAITING", "quizTitle": "Spring Boot Basics" }
```

### GET `/api/v1/live/sessions/{pin}/validate`
**Auth:** None
**Response 200:**
```json
{ "sessionId": 42, "status": "WAITING", "quizTitle": "Spring Boot Basics", "participantCount": 7 }
```
**Response 404:** `{ "error": "Invalid or expired PIN" }`

### POST `/api/v1/live/sessions/{pin}/join`
**Auth:** Optional (JWT if logged in)
**Request:**
```json
{ "displayName": "Veera" }
```
**Response 200:**
```json
{ "participantId": 101, "rejoinToken": "uuid-here", "sessionId": 42 }
```
**Response 409:** `{ "error": "Display name already taken in this session" }`
**Response 400:** `{ "error": "Session has already started" }`

### POST `/api/v1/live/sessions/{id}/start`
**Auth:** Host only
**Response 200:** `{ "status": "ACTIVE", "firstQuestion": { ... } }`

### POST `/api/v1/live/sessions/{id}/next`
**Auth:** Host only
**Response 200:** `{ "questionIndex": 2, "question": { ... } }` or `{ "status": "ENDED" }` if last question

### POST `/api/v1/live/sessions/{id}/pause`
**Auth:** Host only
**Response 200:** `{ "paused": true, "secondsRemaining": 17 }`

### POST `/api/v1/live/sessions/{id}/extend`
**Auth:** Host only
**Request:** `{ "addSeconds": 15 }`
**Response 200:** `{ "secondsRemaining": 32 }`

### POST `/api/v1/live/sessions/{id}/kick/{participantId}`
**Auth:** Host only
**Response 200:** `{ "kicked": true }`

### POST `/api/v1/live/sessions/{id}/end`
**Auth:** Host only
**Response 200:** `{ "status": "ENDED", "finalLeaderboard": [ ... ] }`

### GET `/api/v1/live/sessions/{id}/leaderboard`
**Auth:** None
**Response 200:**
```json
[
  { "rank": 1, "displayName": "Veera", "totalScore": 12500, "lastGain": 1800 },
  { "rank": 2, "displayName": "Dilip", "totalScore": 11200, "lastGain": 1400 }
]
```

### POST `/api/v1/live/sessions/{id}/reconnect`
**Auth:** None
**Request:** `{ "participantId": 101, "rejoinToken": "uuid-here" }`
**Response 200:**
```json
{
  "restored": true,
  "currentQuestionIndex": 3,
  "totalScore": 4500,
  "currentQuestion": { ... }
}
```
**Response 403:** `{ "error": "Invalid rejoin token" }`
**Response 400:** `{ "error": "Participant has been kicked" }`

---

## 20.10 WebSocket Spec (STOMP over SockJS)

**Dependency to add to `pom.xml`:**
```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-websocket</artifactId>
</dependency>
```

**Endpoint:** `ws://localhost:8080/ws` (SockJS fallback enabled)

### Server → All Players (Broadcast)

| Topic | Triggered By | Payload |
|---|---|---|
| `/topic/session/{id}/joined` | Any participant joins | `{ displayName, participantCount }` |
| `/topic/session/{id}/question` | Host clicks Next/Start | `{ questionIndex, stem, optA, optB, optC, optD, timeLimitSeconds, difficulty }` |
| `/topic/session/{id}/timer` | Every second server-side | `{ secondsRemaining }` |
| `/topic/session/{id}/reveal` | Timer ends or host advances | `{ correctOption, explanation, questionStats }` |
| `/topic/session/{id}/leaderboard` | After every reveal | `[{ rank, displayName, totalScore, lastGain }]` |
| `/topic/session/{id}/host-control` | Pause/extend/kick | `{ action: "PAUSE"|"EXTEND"|"KICK", payload }` |
| `/topic/session/{id}/end` | Host ends session | `{ finalLeaderboard[], sessionStats }` |

### Client → Server (App Destinations)

| Destination | Who | Payload |
|---|---|---|
| `/app/session/{id}/answer` | Participant | `{ participantId, selectedOption, responseTimeMs }` |
| `/app/session/{id}/rejoin` | Reconnecting participant | `{ participantId, rejoinToken }` |

---

## 20.11 Frontend Pages & Components

### Pages

| Route | Component | Description |
|---|---|---|
| `/live/join` | `LiveJoin.js` | PIN input field + display name; validates PIN via REST before proceeding |
| `/live/lobby/:sessionId` | `LiveLobby.js` | "Waiting for host..." + live participant list via WebSocket |
| `/live/host/:sessionId` | `LiveHost.js` | PIN display, participant count, Start/Next/Pause/Extend/Kick/End controls |
| `/live/play/:sessionId` | `LivePlay.js` | Full-screen question + circular countdown timer + 4 colored answer buttons |
| `/live/results/:sessionId` | `LiveResults.js` | Final leaderboard + confetti + "Play Again" / "Back to Dashboard" |

### Components

| Component | Props | Description |
|---|---|---|
| `PinDisplay` | `pin` | Large animated 6-digit PIN with copy-to-clipboard button |
| `WaitingLobby` | `participants[]` | Live-updating list of joined players |
| `QuestionCard` | `question, secondsRemaining, totalSeconds` | Full-screen question text + circular progress timer |
| `AnswerButton` | `label, option, onClick, disabled` | A=🔴 B=🔵 C=🟡 D=🟢; disabled after answer submitted |
| `ScoreReveal` | `isCorrect, pointsEarned, correctOption` | "✅ Correct! +1200 pts" or "❌ Wrong! +0 pts" overlay |
| `LiveLeaderboard` | `entries[], myParticipantId` | Top-5 animated list; highlights current player's row |
| `HostControls` | `onPause, onExtend, onNext, onEnd, onKick` | Host action buttons with confirmation dialogs for destructive actions |
| `ConfettiResults` | `leaderboard[], myRank` | Final screen with canvas confetti animation |

### WebSocket Client Setup (React)
```javascript
// Install: npm install @stomp/stompjs sockjs-client
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const client = new Client({
  webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
  reconnectDelay: 3000,   // auto-reconnect after 3s
  onConnect: () => {
    client.subscribe(`/topic/session/${sessionId}/question`, onQuestion);
    client.subscribe(`/topic/session/${sessionId}/reveal`, onReveal);
    client.subscribe(`/topic/session/${sessionId}/leaderboard`, onLeaderboard);
    client.subscribe(`/topic/session/${sessionId}/end`, onEnd);
    client.subscribe(`/topic/session/${sessionId}/host-control`, onHostControl);
  },
  onDisconnect: () => attemptRejoin(sessionId, participantId, rejoinToken),
});
client.activate();
```

---

## 20.12 Anti-Cheat Rules

| Rule | Enforcement |
|---|---|
| No duplicate answers per question | DB unique constraint `(session_id, participant_id, question_id)` |
| No join after session starts | REST `/join` returns 400 if status = `ACTIVE` or `ENDED` |
| No duplicate display names per session | DB unique constraint `(session_id, display_name)` |
| No answer after timer expires | Server validates `answeredAt ≤ questionStartedAt + timeLimitSeconds` |
| Kicked participant cannot rejoin | `/reconnect` returns 400 if `is_active = false` |
| Tab-switch detection | `document.addEventListener('visibilitychange')` — log event, warn participant |

---

## 20.13 Business Rules

1. A session PIN is always exactly 6 digits, zero-padded
2. A PIN is unique among all sessions with status `WAITING` or `ACTIVE`
3. Sessions in `WAITING` status for more than 2 hours are auto-expired to `ENDED`
4. Once a session moves to `ACTIVE`, no new participants can join
5. A host can only have one `ACTIVE` session at a time
6. Guest participants (no JWT) are identified solely by `rejoinToken`
7. Logged-in participants' final scores are saved to `QuizAttempt` table on session end
8. The host is never counted as a participant in the leaderboard
9. Questions are shuffled once at session creation (`Collections.shuffle`) — same order for all participants
10. Options (A/B/C/D) are NOT shuffled — option text stays fixed to maintain correct answer integrity

---

## 20.14 Error Handling

| Scenario | HTTP Code | Message |
|---|---|---|
| Invalid PIN | 404 | `"Invalid or expired PIN"` |
| Session already active (late join) | 400 | `"Session has already started"` |
| Display name taken | 409 | `"Display name already taken in this session"` |
| Invalid rejoin token | 403 | `"Invalid rejoin token"` |
| Participant kicked | 400 | `"You have been removed from this session"` |
| Non-host tries host action | 403 | `"Only the session host can perform this action"` |
| Answer after timer | 400 | `"Question timer has expired"` |
| Duplicate answer | 409 | `"You have already answered this question"` |
| No approved MCQs in quiz | 400 | `"Quiz has no approved questions available"` |

---

## 20.15 Non-Functional Requirements

| Requirement | Target |
|---|---|
| Max participants per session | 200 (Phase 1), 1,000+ with Redis (Phase 2) |
| Question broadcast latency | < 200ms for all connected clients |
| WebSocket reconnect time | < 3 seconds (SockJS built-in retry) |
| PIN generation collision handling | Max 10 retries before error |
| Session auto-expiry check | Background job runs every 15 minutes |
| Timer accuracy | ±500ms tolerance (server is source of truth) |

---

## 20.16 Test Scenarios

### Backend Unit Tests
| ID | Scenario | Expected |
|---|---|---|
| LQ-T1 | Generate PIN when no active sessions exist | Valid 6-digit PIN returned |
| LQ-T2 | Generate PIN when collision occurs | Regenerated until unique |
| LQ-T3 | Score calculation: EASY, answered at t=0ms | 1000 pts |
| LQ-T4 | Score calculation: MEDIUM, answered at t=15000ms of 30000ms limit | 1125 pts |
| LQ-T5 | Score calculation: wrong answer | 0 pts |
| LQ-T6 | Score calculation: answer at exactly time limit | 750 pts (MEDIUM) |
| LQ-T7 | Join with duplicate display name | 409 Conflict |
| LQ-T8 | Join after session ACTIVE | 400 Bad Request |
| LQ-T9 | Reconnect with valid token | Score restored, current state returned |
| LQ-T10 | Reconnect with invalid token | 403 Forbidden |
| LQ-T11 | Kicked participant tries to reconnect | 400 Bad Request |
| LQ-T12 | Submit answer twice for same question | 409 Conflict |
| LQ-T13 | Submit answer after timer expired | 400 Bad Request |
| LQ-T14 | Non-host calls `/start` | 403 Forbidden |
| LQ-T15 | Auto-expire session after 2h in WAITING | Status = ENDED |

### Frontend Tests
| ID | Scenario | Expected |
|---|---|---|
| LQ-F1 | Enter invalid PIN | Error message shown, no navigation |
| LQ-F2 | Enter valid PIN | Navigate to lobby page |
| LQ-F3 | Answer button clicked | Button disabled, score reveal shown |
| LQ-F4 | Timer reaches zero | Buttons disabled automatically |
| LQ-F5 | WebSocket disconnect | Auto-reconnect attempt shown |
| LQ-F6 | Host clicks Kick | Confirmation dialog shown |
| LQ-F7 | Final results page | Leaderboard displayed, confetti fired |

---

## 20.17 Implementation Order

| Step | Task | Files Created/Modified |
|---|---|---|
| 1 | Backend entities + repositories | `LiveSession.java`, `LiveParticipant.java`, `LiveAnswer.java`, 3 repos |
| 2 | PIN generation service | `LiveSessionService.java` |
| 3 | REST controller | `LiveSessionController.java` |
| 4 | WebSocket config + STOMP handlers | `WebSocketConfig.java`, `LiveSessionMessageHandler.java` |
| 5 | Host control endpoints + broadcast | Added to `LiveSessionController.java` |
| 6 | Session auto-expiry scheduler | `LiveSessionScheduler.java` |
| 7 | Frontend `/live/join` | `LiveJoin.js` + `LiveJoin.test.js` |
| 8 | Frontend `/live/lobby/:id` | `LiveLobby.js` + `LiveLobby.test.js` |
| 9 | Frontend `/live/host/:id` | `LiveHost.js` + `LiveHost.test.js` |
| 10 | Frontend `/live/play/:id` | `LivePlay.js` + `LivePlay.test.js` |
| 11 | Frontend `/live/results/:id` | `LiveResults.js` + `LiveResults.test.js` |
| 12 | Shared components | `PinDisplay`, `AnswerButton`, `LiveLeaderboard`, `ScoreReveal`, `HostControls`, `ConfettiResults` |
| 13 | Integration tests | `LiveSessionControllerIntegrationTest.java` |
| 14 | Redis pub/sub (scale) | `RedisConfig.java`, update `application.yml` |

---

## 20.18 Production Gaps & Resolutions

### 20.18.1 DB Constraint Fix — PIN Uniqueness

**Problem:** `UNIQUE KEY uq_pin_active (pin, status)` allows the same PIN to exist once with `WAITING` and once with `ACTIVE` simultaneously.

**Fix:** Drop the composite unique key. Enforce uniqueness in the service layer instead:
```java
// LiveSessionService.java — PIN generation
private String generateUniquePin() {
    for (int i = 0; i < 10; i++) {
        String pin = String.format("%06d", new Random().nextInt(1_000_000));
        boolean taken = liveSessionRepository.existsByPinAndStatusIn(
            pin, List.of(LiveSessionStatus.WAITING, LiveSessionStatus.ACTIVE)
        );
        if (!taken) return pin;
    }
    throw new RuntimeException("Could not generate unique PIN after 10 attempts");
}
```
**Updated schema:** Remove `UNIQUE KEY uq_pin_active`. Add index only:
```sql
CREATE INDEX idx_live_session_pin ON live_session (pin);
```

---

### 20.18.2 Timer Authority — Server is Source of Truth

> **Rule (explicit):** The server timer is authoritative. Client-side countdown is **visual only** — purely for UX smoothness. The server decides when a question ends, not the client.

**Implementation:**
- Server starts a `ScheduledFuture` per question on `/start` and `/next`
- Every second, broadcasts `{ secondsRemaining }` to `/topic/session/{id}/timer`
- When server timer hits 0, it triggers reveal regardless of client state
- Client cannot submit an answer after server timer has ended (validated by `answeredAt` timestamp)
- Client clock drift is irrelevant — server `answeredAt` is stamped when message arrives at server

---

### 20.18.3 Host Disconnect Handling

**Scenario:** Host's browser crashes or network drops during an `ACTIVE` session.

**Business rules added:**
1. Host disconnect detected via WebSocket `SessionDisconnectEvent`
2. Session auto-pauses immediately — broadcast `{ action: "PAUSE" }` to all participants
3. Participants see: *"Host disconnected — session paused. Waiting for host to reconnect..."*
4. Host has **5 minutes** to reconnect (identified by JWT + sessionId)
5. On host reconnect → session resumes from current question state (already persisted in DB)
6. If host does not reconnect within 5 minutes → session auto-ends, final leaderboard computed from answers received so far

**New field on `live_session`:**
```sql
host_disconnected_at DATETIME,   -- NULL = host connected
```

**New scheduled check:** Every 30 seconds, check sessions where `host_disconnected_at < NOW() - 5 minutes` → auto-end them.

---

### 20.18.4 Server Restart Recovery

**Problem:** If the backend pod restarts mid-session, all in-memory timer state and WebSocket connections are lost.

**Phase 1 solution (no Redis required):** Persist enough state to DB that sessions can be resumed:
- `current_question_index` already on `live_session` ✅
- Add `question_started_at DATETIME` to `live_session` — set each time host advances
- Add `is_paused BOOLEAN DEFAULT FALSE` to `live_session`
- On restart, `LiveSessionScheduler` checks for `ACTIVE` sessions and auto-ends them with a grace message

**Phase 2 solution (Redis):** Store timer state in Redis with TTL. On reconnect, restore from Redis before falling back to DB.

**New field on `live_session`:**
```sql
question_started_at  DATETIME,
is_paused            BOOLEAN NOT NULL DEFAULT FALSE
```

---

### 20.18.5 Rate Limiting — Public Join Endpoint

**Problem:** `/api/v1/live/sessions/{pin}/join` is public — vulnerable to PIN brute force and bot floods.

**Solution:** Extend existing `LoginRateLimitFilter` pattern to cover the join endpoint:

| Endpoint | Limit | Window | Block Duration |
|---|---|---|---|
| `POST /live/sessions/{pin}/join` | 10 requests | per IP per minute | 15 minutes |
| `GET /live/sessions/{pin}/validate` | 20 requests | per IP per minute | 5 minutes |

**Implementation:**
```java
// Extend LoginRateLimitFilter to also cover /live paths
private static final Map<String, RateLimitEntry> JOIN_RATE_MAP = new ConcurrentHashMap<>();
// Apply: if (request.getRequestURI().contains("/live/sessions/") && request.getMethod().equals("POST"))
```

**Response when rate limited:**
```json
HTTP 429 Too Many Requests
{ "error": "Too many join attempts. Please wait before trying again." }
```

---

### 20.18.6 Host Disconnect — Co-host / Transfer (Phase 2)

Out of scope for Phase 1. Add to Phase 2 backlog:
- Admin can designate a co-host before session starts
- On host disconnect, co-host auto-promoted to host role
- Original host demoted to participant on rejoin

---

### 20.18.7 Question Preloading

**Optimization:** Silently preload the next question on the client side immediately after the current question is broadcast, so the transition appears instant.

**Implementation:**
- After `/next` call returns, server includes `nextQuestionPreview: { stem only, no options }` in response (so participants can't see options early)
- Full question (with options) only revealed via `/topic/session/{id}/question` broadcast
- Client pre-renders the question card hidden, then animates it in on broadcast

---

### 20.18.8 Observability & Metrics

**Add to Actuator:**
```java
// LiveSessionMetrics.java — Micrometer gauges
registry.gauge("live.sessions.active", activeSessions);
registry.gauge("live.sessions.waiting", waitingSessions);
registry.counter("live.answers.submitted");
registry.timer("live.answer.latency");
registry.gauge("live.websocket.connections", wsConnectionCount);
```

**Accessible at:** `GET /actuator/metrics/live.sessions.active`

---

### 20.18.9 Audit Logging

Extend existing audit log pattern for live session events:

| Event | Level | Message |
|---|---|---|
| Session created | INFO | `LiveSession [pin=483921] created by [veera.k] for quiz [id=5]` |
| Session started | INFO | `LiveSession [id=42] STARTED by [veera.k] — 14 participants` |
| Participant kicked | WARN | `Participant [displayName=Dilip] KICKED from session [id=42] by host [veera.k]` |
| Session ended | INFO | `LiveSession [id=42] ENDED — duration 18m, 14 participants, avg score 8420` |
| Host disconnected | WARN | `Host [veera.k] disconnected from ACTIVE session [id=42] — auto-paused` |
| PIN brute-forced | WARN | `Rate limit triggered on /join from IP [x.x.x.x]` |

---

### 20.18.10 Memory & Resource Cleanup

**Cleanup rules:**

| Resource | When Cleaned | How |
|---|---|---|
| WebSocket subscriptions | On session `ENDED` | `messagingTemplate.convertAndSend` final end message; clients unsubscribe on receipt |
| In-memory timer (`ScheduledFuture`) | When timer fires or host calls `/next`/`/end` | `future.cancel(false)` |
| `ENDED` sessions older than 30 days | Nightly batch | `LiveSessionScheduler` — `DELETE FROM live_session WHERE status='ENDED' AND ended_at < NOW() - INTERVAL 30 DAY` |
| Expired reconnect tokens | On session end | `is_active = false` for all participants; token no longer validated |
| Orphaned `WAITING` sessions (>2h) | Every 15 min | Existing auto-expiry rule in `LiveSessionScheduler` |

---

### 20.18.11 Accessibility

| Requirement | Implementation |
|---|---|
| Keyboard answering | `AnswerButton` responds to keys `1`/`2`/`3`/`4` or `A`/`B`/`C`/`D` |
| Screen reader labels | All `AnswerButton` components have `aria-label="Option A: {text}"` |
| Timer announcement | Timer broadcasts `aria-live="polite"` on 10s, 5s, 3s, 2s, 1s |
| Color independence | Answer buttons use both color AND shape icon (🔴🔷🟡🟢) + letter label — not color alone |
| High contrast | CSS `prefers-color-scheme` + `prefers-contrast` media queries applied to `QuestionCard` and `AnswerButton` |
| Focus management | On question load, focus moves to first `AnswerButton` automatically |

---

*Section 20.18 added: June 20, 2026 | Production Gap Resolutions | Team Valkey*

---

*Section 20 added: June 20, 2026 | Live Quiz Battle Mode | Team Valkey*