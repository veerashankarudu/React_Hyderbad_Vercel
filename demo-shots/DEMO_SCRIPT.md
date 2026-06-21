# QuizHub AI — Demo Recording Script with Voiceover

> **Duration:** ~8–10 minutes  
> **Recording Tool:** QuickTime / OBS / Loom  
> **App URLs:** Frontend http://localhost:3000 | Backend http://localhost:8080  
> **Tip:** Start screen recording BEFORE the first step.

---

## SCENE 1: INTRO & LOGIN (0:00 – 0:40)

**[Show: Login page]**

🎙️ VOICEOVER:
> "Welcome to QuizHub AI — an intelligent MCQ management platform built for Valkey's Hack-N-Stack 2026. This platform enables Subject Matter Experts to create, review, and manage technical interview questions powered by AI. Let's walk through the key features."

**[Action: Login as SME]**
- Enterprise ID: `indugu.hari.prasad`
- Password: `Sme@1234`

🎙️ VOICEOVER:
> "We'll log in as an SME — a Subject Matter Expert. The platform supports role-based access with SME and Admin roles, secured with JWT authentication."

---

## SCENE 2: SME DASHBOARD (0:40 – 1:10)

**[Show: Home page after login]**

🎙️ VOICEOVER:
> "The SME dashboard shows a summary of your questions — total created, pending reviews, approved count, and recent activity. You can see quick-access cards for creating MCQs, viewing your questions, and accessing AI tools."

**[Action: Point out stats cards, recent activity]**

---

## SCENE 3: CREATE MCQ (1:10 – 2:00)

**[Action: Click "Create MCQ" → Fill form]**

🎙️ VOICEOVER:
> "Creating a question is straightforward. Select a tech stack — like Spring Boot — choose a topic, set the difficulty level, write the question stem, and provide four options with the correct answer marked. You can save as draft or submit directly for review."

**[Action: Fill in a sample MCQ about Spring Boot, select difficulty, add options]**

🎙️ VOICEOVER:
> "The platform supports rich text in question stems, code snippets, and even image-based questions extracted via AI."

---

## SCENE 4: AI MCQ GENERATION (2:00 – 3:00)

**[Action: Navigate to AI Studio or AI Generate page]**

🎙️ VOICEOVER:
> "One of our most powerful features — AI-powered question generation. Select a tech stack and topic, choose difficulty and count, and the AI generates complete MCQs with distractors, correct answers, and explanations."

**[Action: Generate 3 questions for "Spring Boot" → "REST APIs" → Medium]**

🎙️ VOICEOVER:
> "The AI uses Spring AI integrated with large language models. It generates questions that are technically accurate, with plausible distractors that test real understanding. Each generated question can be edited and submitted for review."

---

## SCENE 5: BULK UPLOAD (3:00 – 3:40)

**[Action: Navigate to Bulk Upload page]**

🎙️ VOICEOVER:
> "For large-scale content creation, SMEs can bulk upload MCQs via Excel or CSV. Download our template, fill in your questions, and upload. The system validates format, maps tech stacks automatically, and reports row-level errors for any issues."

**[Action: Show template download button, upload area]**

---

## SCENE 6: MY QUESTIONS & FILTERS (3:40 – 4:10)

**[Action: Navigate to My Questions page]**

🎙️ VOICEOVER:
> "The 'My Questions' view shows all MCQs you've created with full filtering — by status, tech stack, topic, and difficulty. You can search by keywords, sort by date, and track the lifecycle of each question from draft to approval."

**[Action: Apply filters — show status filter, tech stack filter]**

---

## SCENE 7: REVIEW WORKFLOW (4:10 – 5:00)

**[Action: Log out → Login as Admin: `divya.madhanasekar` / `Admin@123`]**

🎙️ VOICEOVER:
> "Now let's see the reviewer perspective. Admins and assigned reviewers see pending MCQs in their review queue. They can examine each question, run an AI quality analysis, and approve or reject with mandatory feedback."

**[Action: Show Pending Reviews → Open one MCQ → Show AI Copilot analysis]**

🎙️ VOICEOVER:
> "The AI Copilot assists reviewers by analyzing question quality, detecting potential issues, and providing confidence scores — making the review process faster and more consistent."

---

## SCENE 8: QUESTION BANK & ADMIN (5:00 – 5:40)

**[Action: Navigate to Question Bank (Admin view)]**

🎙️ VOICEOVER:
> "Admins have access to the full Question Bank — all MCQs across all creators. They can filter, search, export to Excel, manage users, and view the complete audit trail of every action taken on the platform."

**[Action: Show filters, export button, navigate to Audit Log]**

---

## SCENE 9: ANALYTICS & KANBAN (5:40 – 6:20)

**[Action: Navigate to Analytics page]**

🎙️ VOICEOVER:
> "The Analytics dashboard provides visual insights — MCQ distribution by tech stack, status breakdown charts, reviewer leaderboards, and approval rate metrics. Data can be filtered by date range and exported."

**[Action: Show charts, leaderboard]**

**[Action: Navigate to Kanban Board]**

🎙️ VOICEOVER:
> "The Kanban board gives a visual workflow view — drag and drop MCQs across status columns from Draft to Approved."

---

## SCENE 10: LIVE QUIZ SESSION (6:20 – 7:20)

**[Action: Navigate to Live Sessions → Create Session]**

🎙️ VOICEOVER:
> "QuizHub supports real-time live quiz sessions. A host creates a session, selects questions, and generates a PIN code. Participants join using the PIN and answer questions in real-time with a live leaderboard."

**[Action: Show session creation, PIN display, lobby view]**

🎙️ VOICEOVER:
> "The live session uses WebSocket connections for instant updates — timer sync, answer submissions, and leaderboard changes happen in real-time across all connected devices."

---

## SCENE 11: SMART INTERVIEW KIT (7:20 – 8:10)

**[Action: Navigate to Resume Interview page → Upload a PDF resume]**

🎙️ VOICEOVER:
> "The Smart Interview Kit is our AI-powered interview preparation tool. Upload a candidate's resume, and the AI generates 30 personalized interview questions across 6 categories — Technical, Coding, SQL, Project-Based, Behavioral, and Scenario questions — each with model answers."

**[Action: Upload resume, wait for results, show tabs with questions]**

🎙️ VOICEOVER:
> "Questions are tailored to the candidate's actual skills and experience. Interviewers get a complete, ready-to-use interview kit in under a minute."

---

## SCENE 12: CHAT, NOTIFICATIONS & i18n (8:10 – 8:50)

**[Action: Show Chat panel, Notification bell, Inbox]**

🎙️ VOICEOVER:
> "The platform includes real-time group chat for team collaboration, a notification system that alerts users about review decisions and assignments, and a full inbox for direct messaging between users."

**[Action: Switch language to Hindi or French]**

🎙️ VOICEOVER:
> "QuizHub supports 7 languages — English, Hindi, French, German, Kannada, Telugu, and Urdu — making it accessible to global teams."

---

## SCENE 13: DARK MODE & UX (8:50 – 9:10)

**[Action: Toggle dark mode]**

🎙️ VOICEOVER:
> "The entire UI supports dark and light themes with a single toggle, providing comfortable viewing in any environment."

---

## SCENE 14: CLOSING — TEST COVERAGE (9:10 – 9:40)

**[Action: Show terminal with test results or coverage report]**

🎙️ VOICEOVER:
> "QuizHub AI is backed by 2,029 automated tests — 1,072 backend tests with 92.5% code coverage, and 957 frontend tests with 80% coverage. Zero failures. The platform is production-ready, secure, and fully tested."

**[Show: JaCoCo report or terminal output]**

🎙️ VOICEOVER:
> "Thank you for watching the QuizHub AI demo. Built with Spring Boot, React 19, Spring AI, and MySQL — delivering intelligent MCQ management at scale."

---

## QUICK REFERENCE — LOGIN CREDENTIALS

| Role  | Enterprise ID            | Password    |
|-------|--------------------------|-------------|
| Admin | `divya.madhanasekar`     | `Admin@123` |
| Admin | `gaurav.a.bhola`         | `Admin@123` |
| SME   | `indugu.hari.prasad`     | `Sme@1234`  |
| SME   | `birendra.kumar.singh`   | `Sme@1234`  |
| SME   | `swati.avinash.nikam`    | `Sme@1234`  |

---

## RECORDING TIPS

1. **Resolution:** Record at 1920×1080 minimum
2. **Browser:** Use Chrome/Edge, clear other tabs
3. **Speed:** Pause 2–3 seconds on each important screen
4. **Voiceover:** Record audio separately in QuickTime or use Loom's built-in mic
5. **Cursor:** Use a cursor highlighter extension for visibility
6. **Clean state:** Clear browser cache before recording for fresh login experience
