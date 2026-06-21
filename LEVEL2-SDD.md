# Level 2 — Spec-Driven Development (SDD)

> Derived from: `Level2_ProblemStatement (1) (1).pptx`  
> Project: Hack-N-Stack 2026 — Smart Quiz AI Hub  
> Date: June 20, 2026

---

## 1. Objective

Transform the existing MCQ repository platform into an **AI-Enabled Intelligent Quiz Platform** (Smart Quiz AI Hub) that reduces manual effort for Subject Matter Experts (SMEs) through:

1. AI-driven content generation — ensuring **consistency and scalability**
2. Automated duplicate/similarity detection — using **similarity scoring** to reduce redundancy

### 1.1 Current Challenges (Level 1 Limitations)

| # | Challenge | Impact |
|---|-----------|--------|
| C-1 | **Time-Intensive Manual Question Creation** | Creating and curating questions manually is time-consuming, limiting scalability and slowing content expansion |
| C-2 | **No Duplicate Detection Mechanism** | No automated way to identify duplicate or semantically similar questions, leading to redundancy |

### 1.2 Level 2 Goal

Significantly reduce manual effort for SMEs by leveraging AI to streamline the creation, management, and optimization of the MCQ repository. Transform the platform into an intelligent, scalable, and automated system.

---

## 2. Features

### 2.1 AI-Powered MCQ Generation

| Field | Description |
|-------|-------------|
| **Actor** | SME / Admin |
| **Entry Point** | "Add Question" → "Generate with AI" |
| **Input Form** | Technology Stack, Topic, Difficulty Level, Number of Questions |
| **Output** | Generated MCQs appear under "My Questions" tab with status = `DRAFT` |
| **Duplicate Guard** | During generation, each MCQ is auto-checked for similarity. If similarity ≥ 30%, discard and regenerate a replacement. |

#### Acceptance Criteria

- [ ] SME can select technology stack, topic, difficulty, and count
- [ ] Clicking "Generate Question" calls Spring AI to produce MCQs
- [ ] Generated MCQs are saved with `DRAFT` status
- [ ] Each generated MCQ is checked against existing questions (same tech stack + topic)
- [ ] If similarity score ≥ 30%, the question is replaced with a newly generated one
- [ ] Generation process completes without manual intervention

---

### 2.2 AI-Driven Duplicate Detection (Manual Upload Flow)

| Field | Description |
|-------|-------------|
| **Actor** | SME / Admin |
| **Trigger (Manual)** | "Duplicate Check" button on Edit page |
| **Trigger (Auto)** | "Save & Send for Review" button |
| **Scope** | Compare against existing questions in the same technology stack AND topic |
| **Threshold** | Similarity ≥ 30% = REJECT |

#### Acceptance Criteria

- [ ] "Duplicate Check" button on Edit page runs similarity check
- [ ] Similarity check also auto-triggers on "Save & Send for Review"
- [ ] If similarity ≥ 30%: show error with details of similar existing questions
- [ ] SME must edit the MCQ and re-check before sending for review
- [ ] MCQ can only be sent for review if similarity < 30%
- [ ] Works for both one-by-one manual upload AND bulk upload

---

## 3. Technology Stack (Required)

| Layer | Technology |
|-------|-----------|
| Backend | Java (JDK 8+), Spring Framework (any LTS) |
| AI Integration | Spring AI (question generation + similarity detection) |
| Database | SQL (PostgreSQL / MySQL) or NoSQL (MongoDB / Cassandra) |
| Frontend | ReactJS or AngularJS |

> Additional open-source libraries/frameworks permitted.  
> Non-licensed software strongly recommended.  
> Refer to the **Installation Guide** available in the Reference Documents section of the Hackathon site.

**Note:** Participants can use any additional libraries/frameworks apart from the above to fulfil the requirements.

---

## 4. Business Rules

| # | Rule |
|---|------|
| BR-1 | Similarity threshold = **30%** |
| BR-2 | Similarity scope = same **technology stack** AND same **topic** |
| BR-3 | AI-generated MCQs: duplicate check during **generation** (auto-replace) |
| BR-4 | Manually uploaded MCQs: duplicate check on **Edit page** (manual or on save) |
| BR-5 | Generated questions default to **DRAFT** status |
| BR-6 | Questions with similarity ≥ 30% **cannot** be sent for review |

### 4.1 Duplicate Check Timing (Critical Distinction)

| Upload Method | When Duplicate Check Happens | Action on ≥ 30% |
|--------------|------------------------------|------------------|
| **AI-Generated MCQs** | During generation (automatic) | Silently discard & regenerate replacement |
| **Manual Upload (one-by-one)** | On Edit page via "Duplicate Check" button OR on "Save & Send for Review" | Show error + similar questions list; SME must edit |
| **Bulk Upload** | On Edit page via "Duplicate Check" button OR on "Save & Send for Review" | Show error + similar questions list; SME must edit |

---

## 5. API Contracts

### 5.1 Generate MCQs with AI

```
POST /api/v1/mcq/generate-ai
```

**Request Body:**
```json
{
  "techStackId": 1,
  "topicId": 5,
  "difficulty": "MEDIUM",
  "count": 5
}
```

**Response:**
```json
{
  "generated": 5,
  "replaced": 1,
  "questions": [
    {
      "id": 101,
      "questionStem": "...",
      "options": ["A", "B", "C", "D"],
      "correctOption": "B",
      "difficulty": "MEDIUM",
      "status": "DRAFT",
      "similarityScore": 0.12
    }
  ]
}
```

---

### 5.2 Duplicate/Similarity Check

```
POST /api/v1/mcq/duplicate-check
```

**Request Body:**
```json
{
  "questionStem": "What is dependency injection in Spring?",
  "techStackId": 1,
  "topicId": 5
}
```

**Response (No Duplicate):**
```json
{
  "isDuplicate": false,
  "maxSimilarity": 0.18,
  "similarQuestions": []
}
```

**Response (Duplicate Found):**
```json
{
  "isDuplicate": true,
  "maxSimilarity": 0.45,
  "similarQuestions": [
    {
      "id": 42,
      "questionStem": "Explain dependency injection in Spring Framework",
      "similarity": 0.45
    }
  ]
}
```

---

## 6. UI Flow

### 6.1 AI Generation Flow

```
Main Page → "Add Question" → "Generate with AI"
  → Form: [Tech Stack] [Topic] [Difficulty] [Count]
  → Click "Generate Question"
  → Loading... (AI generates + auto duplicate check)
  → Questions appear in "My Questions" tab (status: DRAFT)
```

### 6.2 Duplicate Check Flow (Manual Upload)

```
Edit Page → SME writes/uploads question
  → Click "Duplicate Check" (or "Save & Send for Review")
  → AI compares against existing questions (same stack + topic)
  → IF similarity < 30%: ✅ Allow save/review
  → IF similarity ≥ 30%: ❌ Show error + similar questions list
     → SME edits → Re-check → Repeat until < 30%
```

---

## 7. Similarity Detection Logic

```
Input: New question text
Scope: All existing questions WHERE tech_stack = X AND topic = Y
       (MUST match BOTH technology stack AND topic — not one or the other)
Method: Semantic similarity via Spring AI (embeddings + cosine similarity scoring)
Threshold: 0.30 (30%)
Action if ≥ 30%:
  - AI Generation: silently replace with new question
  - Manual Upload: block + show error with similar question details
```

---

## 8. Design Guidelines

> **"Kindly note this page is for reference only and participants have the liberty to design it as per their ideas."**  
> — Stated 3 times in the PPT (Slides 6, 7, 8)

- UI screenshots in the PPT are **reference only** — not mandatory designs
- Participants are free to design the interface as they see fit
- Functionality must be preserved; visual layout is flexible

---

## 9. Abbreviations / Legend

| Abbreviation | Full Form |
|-------------|----------|
| SME | Subject Matter Expert |
| MCQ | Multiple Choice Question |
| AI | Artificial Intelligence |
| SDD | Spec-Driven Development |
| LTS | Long Term Support |
| SQL | Structured Query Language |
| NoSQL | Not Only SQL |
| JDK | Java Development Kit |

---

## 10. Future Scope (Not Required for Level 2)

These are mentioned in the PPT as future enhancements but are NOT part of Level 2 requirements:

1. **Live quizzes during training sessions** — improve participant engagement
2. **Leaderboards** — encourage healthy competition and track progress
3. **Adaptive learning** — personalize quiz difficulty based on individual performance
4. **Analytics** — detailed insights into user engagement and knowledge gaps
5. **Mobile compatibility** — support on-the-go learning via smartphones/tablets
6. **Multilingual support** — accommodate diverse user base, improve global accessibility
7. **Collaboration tools** — peer-to-peer interaction and group quiz sessions for collective learning

---

## 11. Definition of Done

- [ ] AI generates MCQs from tech stack + topic + difficulty + count
- [ ] Generated MCQs are saved as DRAFT
- [ ] Duplicate detection runs during AI generation (auto-replace if ≥ 30%)
- [ ] Duplicate check button works on Edit page
- [ ] Duplicate check auto-triggers on "Save & Send for Review"
- [ ] Error message shows similar questions when similarity ≥ 30%
- [ ] Only questions with similarity < 30% can be sent for review
- [ ] Works for single and bulk uploads
- [ ] Spring AI integration is functional
- [ ] UI allows SME to interact with all features without manual backend steps
