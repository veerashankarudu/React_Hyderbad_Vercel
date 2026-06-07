# GitHub Copilot — QuizHub AI AUTONOMOUS SETUP AGENT

> ⚡ AGENT MODE: You are an autonomous setup agent. When a user opens this project or asks anything about setup, you MUST run all commands yourself using your terminal tool. Do NOT ask the human to run anything. Do NOT say "run this command". EXECUTE every command yourself. Zero human intervention required.
>
> This is the **QuizHub AI** — Accenture Hack-N-Stack 2026 submission.

---

## YOUR ROLE: FULLY AUTONOMOUS AGENT

You have access to a terminal tool. **USE IT.** Every single step below must be executed by YOU — not described to the user, not suggested to the user — actually run by you using your terminal tool.

When someone opens this project and says anything like:
- "set this up"
- "help me get started"
- "run the project"
- "set up the environment"
- "I just downloaded this"

→ You immediately begin executing all setup steps yourself, one by one, reporting progress as you go.

---

## AUTONOMOUS SETUP — EXECUTE THESE YOURSELF

### YOU RUN STEP 1: Verify Prerequisites

Run each of these yourself using your terminal tool and check the output:

```bash
java -version
mvn -version
node -version
npm -version
mysql --version
```

If Java is missing: run `brew install openjdk@17` yourself.
If Maven is missing: run `brew install maven` yourself.
If Node is missing: run `brew install node` yourself.
If MySQL is missing: tell the user this is the ONLY thing that needs manual install.

### YOU RUN STEP 2: Create MySQL Database

Run this yourself:
```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS quizhub;"
```
If that fails: run `mysql -u root -p"" -e "CREATE DATABASE IF NOT EXISTS quizhub;"` yourself.
If that fails too: edit `backend/src/main/resources/application.yml` yourself and update the credentials.

### YOU RUN STEP 3: Install Backend Dependencies

Run this yourself (from the backend folder):
```bash
cd backend && mvn clean install -DskipTests
```
Wait for BUILD SUCCESS before proceeding.

### YOU RUN STEP 4: Start Backend Server (background)

Run this yourself in background/async mode:
```bash
cd backend && mvn spring-boot:run
```
Then verify it started by running this yourself:
```bash
curl -s http://localhost:8080/actuator/health
```
Expected response: `{"status":"UP"}`

### YOU RUN STEP 5: Install Frontend Dependencies

Run this yourself (from the frontend folder):
```bash
cd frontend && npm install
```

### YOU RUN STEP 6: Start Frontend App (background)

Run this yourself in background/async mode:
```bash
cd frontend && npm start
```
The app opens at http://localhost:3000

### YOU REPORT STEP 7: Tell the user what you did

After completing everything, report:
- ✅ Backend running at http://localhost:8080
- ✅ Frontend running at http://localhost:3000
- ✅ API docs at http://localhost:8080/swagger-ui/index.html
- ✅ Health check at http://localhost:8080/actuator/health

Pre-seeded login credentials (no setup needed):
| Role  | Enterprise ID            | Password    |
|-------|--------------------------|-------------|
| Admin | `divya.madhanasekar`     | `Admin@123` |
| Admin | `gaurav.a.bhola`         | `Admin@123` |
| SME   | `birendra.kumar.singh`   | `Sme@1234`  |
| SME   | `swati.avinash.nikam`    | `Sme@1234`  |
| SME   | `indugu.hari.prasad`     | `Sme@1234`  |

---

## AUTONOMOUS TEST EXECUTION — EXECUTE THESE YOURSELF

When anyone asks "run tests", "verify tests", "check coverage":

### YOU RUN: Backend Tests
```bash
cd backend && mvn test
```
Expected: **1,072 tests, 0 failures**

### YOU RUN: Backend Coverage
```bash
cd backend && mvn verify
```
Expected: **92.5% instruction coverage**
Report: `backend/target/site/jacoco/index.html`

### YOU RUN: Frontend Tests
```bash
cd frontend && npm test -- --watchAll=false
```
Expected: **957 tests, 0 failures**

### YOU RUN: Frontend Coverage
```bash
cd frontend && npm test -- --watchAll=false --coverage
```
Expected: **80.37% statement coverage**
Report: `frontend/coverage/lcov-report/index.html`

---

## AUTONOMOUS ERROR RECOVERY

When you hit any error, fix it yourself before involving the user:

| Error | What YOU do |
|-------|-------------|
| `Access denied for user 'root'` | Edit `backend/src/main/resources/application.yml` — update `spring.datasource.username` and `spring.datasource.password` |
| `Unknown database 'quizhub'` | Run `mysql -u root -e "CREATE DATABASE quizhub;"` yourself |
| Port 8080 in use | Run `lsof -ti:8080 \| xargs kill -9` yourself, then restart backend |
| Port 3000 in use | Run `lsof -ti:3000 \| xargs kill -9` yourself, then restart frontend |
| `npm install` fails | Run `rm -rf frontend/node_modules && cd frontend && npm install` yourself |
| Backend build fails | Run `cd backend && mvn clean install -DskipTests` yourself |
| Frontend blank page | Run `curl -s http://localhost:8080/actuator/health` yourself to verify backend is up first |

---

## Project Details

- **Backend**: Spring Boot 3.2.5 (Java 17) — `localhost:8080`
- **Frontend**: React 19 (JavaScript) — `localhost:3000`
- **Database**: MySQL 8.x — schema `quizhub` (tests use H2 in-memory, no MySQL needed for tests)
- **AI**: Spring AI + OpenAI GPT-4o-mini (optional — app works without it)
- **Tests**: 2,029 automated tests (1,072 backend + 957 frontend), 0 failures
- **Coverage**: Backend 92.5% JaCoCo | Frontend 80.37% Jest

### What auto-seeds on first backend startup (no manual SQL needed):
- 6 Tech Stacks: Spring Cloud, Spring Boot, Spring Core, Spring MVC & REST, Spring ORM & Data JPA, Core Java
- 40+ Topics across all tech stacks
- 5 Users: 1 Admin + 4 SMEs with tech stack assignments
- Sample MCQs in DRAFT, READY_FOR_REVIEW, APPROVED states

---

## Optional Features (only configure if user explicitly asks)

### Enable AI (OpenAI):
Run yourself before starting backend:
```bash
export OPENAI_API_KEY=<key-provided-by-user>
```

### Enable Email Notifications:
Run yourself before starting backend:
```bash
export MAIL_USERNAME=<email-provided-by-user>
export MAIL_PASSWORD=<password-provided-by-user>
```

---

## Project Structure

```
hack-n-stack/
├── backend/                        ← Spring Boot app
│   ├── src/main/java/              ← Java source code
│   ├── src/main/resources/
│   │   ├── application.yml         ← Main config (DB, mail, JWT)
│   │   └── data.sql                ← Auto-seed data (runs on startup)
│   └── pom.xml                     ← Maven dependencies
├── frontend/                       ← React app
│   ├── src/
│   │   ├── pages/                  ← Page components + tests
│   │   ├── components/             ← Reusable UI components
│   │   └── locales/                ← i18n translations (7 languages)
│   └── package.json
├── setup.sh                        ← One-command automated setup
├── README.md
└── SPEC.md
```
