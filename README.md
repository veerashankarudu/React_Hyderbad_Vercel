# 🧠 QuizHub AI — Smart MCQ Management Platform

> AI-powered enterprise MCQ lifecycle platform — Create smarter. Review faster. Learn better.

[![Java](https://img.shields.io/badge/Java-17-ED8B00?logo=openjdk)](https://openjdk.org)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.5-6DB33F?logo=springboot)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19.2.6-61DAFB?logo=react)](https://react.dev)
[![Spring AI](https://img.shields.io/badge/Powered%20by-Spring%20AI%20%2B%20GPT--4o--mini-412991?logo=openai)](https://spring.io/projects/spring-ai)
[![MySQL](https://img.shields.io/badge/MySQL-8.x-4479A1?logo=mysql)](https://mysql.com)
[![Redis](https://img.shields.io/badge/Redis-8.x-DC382D?logo=redis)](https://redis.io)
[![Prometheus](https://img.shields.io/badge/Prometheus-2.51-E6522C?logo=prometheus)](https://prometheus.io)
[![Grafana](https://img.shields.io/badge/Grafana-10.4-F46800?logo=grafana)](https://grafana.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://docs.docker.com/compose)
[![i18n](https://img.shields.io/badge/i18n-7%20Languages-brightgreen)](https://www.i18next.com)
[![Tests](https://img.shields.io/badge/Tests-2%2C029%20Passing-brightgreen?logo=checkmarx)](https://github.com)
[![Backend Coverage](https://img.shields.io/badge/Backend%20Coverage-92.5%25-brightgreen?logo=jacoco)](https://github.com)
[![Frontend Coverage](https://img.shields.io/badge/Frontend%20Coverage-80.37%25-brightgreen?logo=jest)](https://github.com)

---

## 📌 Overview

**QuizHub AI** is an enterprise-grade MCQ (Multiple Choice Question) management platform built for Accenture's internal learning ecosystem. It enables SMEs (Subject Matter Experts) to create, review, and manage MCQs through a structured AI-assisted workflow, with full role-based access control, bulk operations, proctored assessments, and multi-language support.

All MCQs go through a governed lifecycle: **DRAFT → READY_FOR_REVIEW → UNDER_REVIEW → APPROVED / REJECTED**, ensuring quality, consistency, and traceability across the organisation.

---

## 🏗️ Architecture

```mermaid
flowchart TD
    subgraph Browser["🌐 User Browser — localhost:3000"]
        React["React 19 · JavaScript\n23 Routes · In-Memory API Cache\nAxios + JWT interceptor"]
    end

    subgraph Backend["⚙️ Spring Boot 3.2.5 — localhost:8080"]
        API["17 REST Controllers\nJWT Security Filter\nSpring Security + JJWT 0.11.5"]
        Services["Service Layer\nMcqService · ReviewService · AIService\nBulkUploadService · QuizService · LiveSessionService"]
        API --> Services
    end

    subgraph MCP["🔌 MCP Server — localhost:8085"]
        MCPTools["Spring AI MCP\n8 Tools Exposed\nquizhub-mcp v1.0.0"]
    end

    subgraph Data["🗄️ Data Layer"]
        DB[("MySQL 8.x\nquizhub DB\n19 Entities")]
        Redis[("Redis 7.x\nDistributed Cache\nTTL 5 min")]
        SpringCache["Spring Cache (CacheConfig)\nRedis primary · Caffeine fallback\n@Cacheable TechStacks · Topics · Analytics"]
    end

    subgraph External["☁️ External Services"]
        AI["OpenAI GPT-4o-mini\nvia Spring AI 1.0.0"]
        Mail["SMTP\nSpring Mail"]
        Lingva["Lingva API\nTranslation"]
        MyMemory["MyMemory API\nFallback Translation"]
    end

    Browser -->|"REST · Bearer JWT"| Backend
    MCP -->|"WebClient · Bearer JWT"| Backend
    Services --> Data
    Services -->|"Spring AI"| AI
    Services -->|"JavaMail"| Mail
    Services -->|"HTTP"| Lingva
    Lingva -.->|"fallback"| MyMemory

    subgraph Observability["📊 Observability (Docker)"]
        Prometheus["Prometheus :9090\nScrapes /actuator/prometheus\nevery 10s"]
        Grafana["Grafana :3001\nQuizHub Business Dashboard\n+ JVM + Spring Boot"]
    end

    BE -->|"Micrometer — 25 quizhub.*\nmetrics + JVM + HTTP SLOs"| Prometheus
    Prometheus -->|"datasource"| Grafana
```

---

## 🗄️ Caching Architecture

QuizHub uses a **two-tier caching strategy** at the application level:

```
Request → Spring @Cacheable check
              │
              ├─ Cache HIT  → return cached value (0 DB hits)
              │
              └─ Cache MISS → MySQL query → store in cache → return
```

### Provider Selection (Automatic at Startup)

```
App starts → CacheConfig.java → redis-cli PING
                  │
                  ├─ PONG received  → RedisCacheManager  (distributed, survives restart)
                  │                   log: "Cache: Redis is available"
                  │
                  └─ Connection refused → CaffeineCacheManager (in-process, zero setup)
                                          log: "Cache: Redis unavailable, falling back to Caffeine"
```

### Layers

| Layer | Technology | Scope | TTL |
|---|---|---|---|
| **Application cache (L1 equivalent)** | Redis (primary) | Distributed — shared across all app instances | 5 min |
| **Application cache fallback** | Caffeine | In-process — per JVM instance | 5 min |
| **Hibernate session cache** | JPA L1 (built-in) | Per-transaction — entities loaded once per session | Transaction-scoped |

### What's Cached

| Cache Name | Method | Evicted On |
|---|---|---|
| `techStacks` | `getAllTechStacks()` | create / update / delete tech stack |
| `topics` | `getTopicsByTechStack(id)` | create / update / delete topic |
| `mcqCount` | MCQ count stats | MCQ mutation |
| `analytics` | Analytics data | MCQ mutation |
| `reviewers` | Eligible reviewer list | User role change |

### Verify Redis Cache Live

```bash
# Start Redis
brew services start redis

# Check Redis is up
redis-cli ping   # → PONG

# After first API call to /api/v1/master/tech-stacks:
redis-cli KEYS "*"
# → 1) "techStacks::SimpleKey []"

# See the cached value:
redis-cli GET "techStacks::SimpleKey []"
```

### Redis Config (`application.yml`)

```yaml
spring:
  data:
    redis:
      host: ${REDIS_HOST:localhost}
      port: ${REDIS_PORT:6379}
      timeout: 2000ms
      connect-timeout: 1000ms
```

> **Without Redis:** Just don't install Redis. The app starts fine and logs:  
> `WARN CacheConfig : Cache: Redis ping failed, falling back to Caffeine`

---

## 📊 Observability & Monitoring

QuizHub AI ships a **production-grade observability stack** out of the box — Prometheus + Grafana + structured JSON logs, zero manual wiring.

### 🚀 One-Command: Start Prometheus + Grafana

```bash
# Requires Docker Desktop running
docker compose -f docker-compose.observability.yml up -d
```

| Tool | URL | Credentials |
|------|-----|-------------|
| **Grafana** | http://localhost:3001 | `admin` / `quizhub` |
| **Prometheus** | http://localhost:9090 | (no auth) |

Grafana opens directly on the **QuizHub Business Metrics** dashboard (auto-provisioned — no manual import needed).

To stop:
```bash
docker compose -f docker-compose.observability.yml down
```

### Grafana Dashboards

| Dashboard | Source | What it shows |
|-----------|--------|---------------|
| **QuizHub — Business Metrics** | `observability/grafana/dashboards/quizhub-business.json` | MCQ lifecycle rates, auth events, AI calls, email stats, HTTP latency, JVM heap, CPU, DB pool |
| **JVM Micrometer** | Grafana.com ID `4701` (import manually) | Detailed JVM internals |
| **Spring Boot** | Grafana.com ID `12900` (import manually) | HTTP request rates, SLO burn |

Import community dashboards: Grafana → Dashboards → Import → enter ID → Load → select **Prometheus** datasource.

### Actuator Endpoints (always available, no Docker needed)

| Endpoint | URL | Purpose |
|----------|-----|---------|
| Health (full detail) | `http://localhost:8080/actuator/health` | Liveness + DB + Redis + Cache status |
| Prometheus metrics | `http://localhost:8080/actuator/prometheus` | All metrics in Prometheus text format |
| All metrics | `http://localhost:8080/actuator/metrics` | Metric names catalog |
| Specific metric | `http://localhost:8080/actuator/metrics/{name}` | Live value for one metric |
| Logger levels | `http://localhost:8080/actuator/loggers` | View / change log levels at runtime |
| Caches | `http://localhost:8080/actuator/caches` | Live cache names + backend |

### Business Metrics (25 total, all prefixed `quizhub.*`)

All appear automatically in `/actuator/prometheus` and Grafana from first startup:

| Metric | Type | Description |
|--------|------|-------------|
| `quizhub.mcq.created.total` | Counter | MCQs created by SMEs |
| `quizhub.mcq.submitted_for_review.total` | Counter | MCQs sent for review |
| `quizhub.mcq.approved.total` | Counter | MCQs approved by reviewers |
| `quizhub.mcq.rejected.total` | Counter | MCQs rejected by reviewers |
| `quizhub.mcq.deleted.total` | Counter | MCQs deleted |
| `quizhub.auth.login.success.total` | Counter | Successful logins |
| `quizhub.auth.login.failure.total` | Counter | Failed login attempts |
| `quizhub.auth.login.rate_limited.total` | Counter | Rate-limited login attempts |
| `quizhub.auth.password_reset.total` | Counter | Password reset requests |
| `quizhub.bulk_upload.success.total` | Counter | Successful bulk upload jobs |
| `quizhub.bulk_upload.rows_imported.total` | Counter | Total MCQ rows imported |
| `quizhub.ai.generate.total` | Counter | AI MCQ generation calls |
| `quizhub.ai.rewrite.total` | Counter | AI rewrite calls |
| `quizhub.ai.validate.total` | Counter | AI validate calls |
| `quizhub.ai.chat.total` | Counter | AI chatbot calls |
| `quizhub.ai.semantic_duplicate_blocked.total` | Counter | MCQs blocked by AI duplicate detection |
| `quizhub.quiz.session_created.total` | Counter | Live quiz battle sessions created |
| `quizhub.quiz.attempt_completed.total` | Counter | Quiz attempts completed |
| `quizhub.email.sent.total` | Counter | Emails sent successfully |
| `quizhub.email.failed.total` | Counter | Email send failures |
| `quizhub.live_sessions.active` | Gauge | Currently active live quiz battle sessions |
| `quizhub.websocket.connections.active` | Gauge | Active WebSocket connections |
| `quizhub.ai.generate.duration` | Timer | AI MCQ generation latency |
| `quizhub.bulk_upload.duration` | Timer | Bulk upload processing time |
| `http.server.requests` | Timer+Histogram | HTTP latency with SLOs: 50/100/200/500/1000/2000ms |

### Prometheus + Grafana — File Structure

```
observability/
├── prometheus.yml                              # Scrape config (targets quizhub backend on host)
└── grafana/
    ├── provisioning/
    │   ├── datasources/prometheus.yml          # Auto-wires Prometheus as default datasource
    │   └── dashboards/dashboards.yml           # Tells Grafana where to load dashboards from
    └── dashboards/
        └── quizhub-business.json              # Custom QuizHub business metrics dashboard
docker-compose.observability.yml               # One command to start Prometheus + Grafana
```

### Datadog Integration (optional)

If you have a Datadog account, the backend exports to Datadog Agent via OTLP with zero code changes:

```bash
# Set before starting backend
export DD_API_KEY=<your-datadog-api-key>
export DD_SITE=datadoghq.com

# Run Datadog Agent alongside (Docker)
docker run -d \
  -e DD_API_KEY=$DD_API_KEY \
  -e DD_SITE=$DD_SITE \
  -e DD_OTLP_CONFIG_RECEIVER_PROTOCOLS_GRPC_ENDPOINT=0.0.0.0:4317 \
  -p 4317:4317 \
  gcr.io/datadoghq/agent:7
```

Alternatively, use the static Datadog [integration for Spring Boot](https://docs.datadoghq.com/integrations/java/) by pointing the Agent at `/actuator/prometheus`.

### Structured Logging

Logs are profile-aware:

| Profile | Format | Output |
|---------|--------|--------|
| `local` (default) | Human-readable colour | Console only |
| `prod` | JSON (Logstash encoder) | Console + rolling file |

**JSON log fields** (every line):
```json
{
  "@timestamp": "2025-01-01T10:00:00.000Z",
  "level": "INFO",
  "logger_name": "com.accenture.quizhub...",
  "message": "[abc12345] GET /api/tech-stacks → 200 (34ms)",
  "requestId": "abc12345",
  "userId": "divya.madhanasekar",
  "userRole": "ADMIN",
  "app": "quizhub",
  "env": "local"
}
```

JSON logs ship directly to **Datadog**, **Grafana Loki**, **Splunk**, or **ELK** without a parsing rule.

Activate prod profile:
```bash
export SPRING_PROFILES_ACTIVE=prod
mvn spring-boot:run
```

Log file location (prod profile): `logs/quizhub.log` (rolling, 50 MB/file, 14-day retention, gzip compressed, 500 MB total cap).

### Request Correlation

Every HTTP response includes:
- `X-Request-Id` header — UUID prefix (8 chars), propagated to all log lines for that request
- `X-Powered-By: QuizHub-AI`

Logs are annotated by severity: `INFO` for 2xx/3xx, `WARN` for 4xx, `ERROR` for 5xx.

### Health Check Components

```bash
curl http://localhost:8080/actuator/health | python3 -m json.tool
```

```json
{
  "status": "UP",
  "components": {
    "cacheSystem": { "status": "UP", "details": { "mode": "distributed (Redis)", "caches": ["techStacks","topics","..."] } },
    "db":          { "status": "UP", "details": { "database": "MySQL", "validationQuery": "isValid()" } },
    "redis":       { "status": "UP", "details": { "version": "8.8.0" } }
  }
}
```

---

�🗃️ ER Diagram (Entity Relationship)

```mermaid
erDiagram
    USER {
        Long id PK
        String enterpriseId UK
        String fullName
        String email
        String passwordHash
        Enum role
        Boolean isApproved
    }
    TECH_STACK {
        Long id PK
        String name
        String description
    }
    TOPIC {
        Long id PK
        String name
        Long techStackId FK
    }
    MCQ {
        Long id PK
        String questionStem
        String optionA
        String optionB
        String optionC
        String optionD
        String correctAnswer
        Enum difficulty
        Enum status
        Integer version
        Long creatorId FK
        Long techStackId FK
        Long topicId FK
        Long reviewerId FK
    }
    REVIEW {
        Long id PK
        Long mcqId FK
        Long reviewerId FK
        String decision
        String comment
        Timestamp reviewedAt
    }
    MCQ_VERSION {
        Long id PK
        Long mcqId FK
        Integer versionNum
        String snapshotJson
        String changedBy
    }
    MCQ_COMMENT {
        Long id PK
        Long mcqId FK
        Long authorId FK
        Long replyToId FK
        String text
    }
    QUIZ_SESSION {
        Long id PK
        String title
        String quizLink UK
        Timestamp expiresAt
        Long createdBy FK
    }
    QUIZ_ATTEMPT {
        Long id PK
        Long sessionId FK
        String participantEmail
        Integer score
        Integer violations
        Enum status
    }
    LIVE_SESSION {
        Long id PK
        String pin UK
        String title
        Enum status
        Long hostId FK
    }
    LIVE_PARTICIPANT {
        Long id PK
        Long sessionId FK
        String enterpriseId
        Integer score
    }
    INBOX_MESSAGE {
        Long id PK
        Long senderId FK
        Long receiverId FK
        String subject
        Boolean isRead
    }
    NOTIFICATION {
        Long id PK
        Long userId FK
        String type
        String message
        Boolean isRead
    }
    AUDIT_LOG {
        Long id PK
        Long userId FK
        String action
        String entityType
        Timestamp createdAt
    }
    PASSWORD_RESET_TOKEN {
        Long id PK
        Long userId FK
        String token UK
        Timestamp expiresAt
        Boolean used
    }

    USER ||--o{ MCQ : "creates"
    USER ||--o{ REVIEW : "reviews"
    USER }o--o{ TECH_STACK : "assigned to"
    MCQ }o--|| TECH_STACK : "belongs to"
    MCQ }o--|| TOPIC : "categorized by"
    TOPIC }o--|| TECH_STACK : "under"
    MCQ ||--o{ REVIEW : "reviewed via"
    MCQ ||--o{ MCQ_VERSION : "versioned as"
    MCQ ||--o{ MCQ_COMMENT : "discussed in"
    MCQ_COMMENT ||--o{ MCQ_COMMENT : "replied to"
    USER ||--o{ INBOX_MESSAGE : "sends/receives"
    USER ||--o{ NOTIFICATION : "notified via"
    USER ||--o{ AUDIT_LOG : "tracked in"
    USER ||--o{ QUIZ_SESSION : "creates"
    QUIZ_SESSION ||--o{ QUIZ_ATTEMPT : "attempted via"
    USER ||--o{ LIVE_SESSION : "hosts"
    LIVE_SESSION ||--o{ LIVE_PARTICIPANT : "joined by"
    USER ||--o{ PASSWORD_RESET_TOKEN : "resets via"
```

**MCQ Status ENUM:** `DRAFT | READY_FOR_REVIEW | UNDER_REVIEW | APPROVED | REJECTED | PERMANENTLY_REJECTED`  
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
| **Fallback / Circuit Breaker** | `CacheConfig.java` — Redis → Caffeine | PING Redis at startup; silently degrades to in-process cache if unavailable |

---

## 📊 Mermaid Diagrams

### MCQ Lifecycle — State Machine

```mermaid
stateDiagram-v2
    [*] --> DRAFT : SME creates / saves draft
    DRAFT --> READY_FOR_REVIEW : SME submits for review
    READY_FOR_REVIEW --> UNDER_REVIEW : Admin assigns reviewer
    UNDER_REVIEW --> APPROVED : Reviewer approves ✅
    UNDER_REVIEW --> REJECTED : Reviewer rejects ❌ (mandatory comment)
    REJECTED --> READY_FOR_REVIEW : SME edits & resubmits
    REJECTED --> PERMANENTLY_REJECTED : Exceeds rejection limit (admin-configurable)
    APPROVED --> [*]
    PERMANENTLY_REJECTED --> [*]

    note right of DRAFT
        Editable by SME & Admin
        Can be deleted
    end note
    note right of UNDER_REVIEW
        Locked from edits
        Reviewer sees in Pending Reviews
    end note
    note right of APPROVED
        Used in Quizzes & Live Battle
        Read-only
    end note
```

---

### Authentication + Instant Load Flow

```mermaid
sequenceDiagram
    actor User
    participant FE as React Frontend
    participant Cache as API Cache (Memory)
    participant BE as Spring Boot :8080
    participant DB as MySQL

    User->>FE: Enter credentials
    FE->>BE: POST /api/v1/auth/login
    BE->>DB: Validate user + isApproved check
    DB-->>BE: User entity
    BE-->>FE: { token, role, fullName, enterpriseId }
    FE->>FE: localStorage.setItem('token')

    Note over FE,Cache: 200ms later — prefetchAll(role)
    par Background cache warm-up (staggered 80ms)
        FE->>BE: GET /stats/summary
        FE->>BE: GET /mcqs
        FE->>BE: GET /master/tech-stacks
        FE->>BE: GET /stats/leaderboard
        FE->>BE: GET /stats/reviewer-stats
    end
    BE-->>Cache: Responses stored with TTL (15s–600s)

    User->>FE: Navigate to any page
    FE->>Cache: getCacheSync('/endpoint')
    Cache-->>FE: Instant data (zero spinner) ✅
    FE->>FE: useState(() => getCacheSync(url) || [])
    Note over FE: First render has real data — no loading state
```

---

### Frontend Cache Architecture

```mermaid
flowchart TD
    Login["User Logs In"] --> Prefetch["prefetchAll(role)\n200ms delay"]
    Boot["App Boots"] --> BootPrefetch["prefetchAll(role)\n300ms delay"]
    Prefetch --> Cache["_cache Map\nIn-Memory\nTTL per endpoint"]
    BootPrefetch --> Cache

    Navigate["User navigates to page"] --> Sync["getCacheSync(url)"]
    Sync -->|"Cache hit\ndata fresh"| InstantRender["⚡ Instant Render\nloading = false\ndata = cached"]
    Sync -->|"Cache miss\nor expired"| Spinner["Show Spinner\nloading = true"]
    Spinner --> Fetch["cachedGet(url)"]
    Fetch --> Cache
    Cache --> AsyncRender["Render with data\nloading = false"]

    InstantRender --> BGRefresh["Background cachedGet()\nupdates silently"]
    BGRefresh --> Cache

    Logout["User Logs Out"] --> Clear["clearApiCache()\n_cache.clear()"]
```

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Java | 17 | Language |
| Spring Boot | 3.2.5 | REST API framework |
| Spring Security | 6.x | Authentication & authorization |
| Spring Data JPA | 3.x | ORM / database access |
| Hibernate | latest | JPA implementation (L1 cache active by default) |
| MySQL | 8.x | Relational database |
| JWT (JJWT) | 0.11.5 | Token-based authentication |
| Spring AI | 1.0.0 | AI integration (GPT-4o-mini) |
| Spring Cache | 3.x | `@Cacheable` / `@CacheEvict` abstraction layer |
| Redis | 7.x | Distributed cache (primary — auto-detected on startup) |
| Caffeine | latest | In-process cache fallback (when Redis unavailable) |
| Apache POI | 5.2.5 | Excel bulk upload (.xlsx) |
| OpenCSV | 5.9 | CSV bulk upload |
| Springdoc OpenAPI | 2.5.0 | Swagger UI / API documentation |
| Spring Mail | 3.x | Email notifications |
| Spring Actuator | 3.x | Health checks, Prometheus, loggers, caches endpoints |
| Micrometer Prometheus | 1.12.x | Exports 25 business metrics + JVM/HTTP to Prometheus |
| Logstash Logback Encoder | 7.4 | Structured JSON logs (Datadog / Grafana Loki / Splunk) |
| Lombok | latest | Boilerplate reduction |
| Maven | 3.8+ | Build & dependency management |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React.js | 19.2.6 | UI framework (JavaScript) |
| React Router | 7.15.1 | Client-side routing |
| Axios | 1.16.1 | HTTP client |
| i18next | 26.x | Internationalisation (7 languages) |
| react-i18next | 17.x | React i18n bindings |
| React Toastify | 11.x | Toast notifications |
| html2canvas | 1.4.1 | PDF / image export |
| Create React App | 5.0 | Build & dev server (react-scripts / webpack) |

### AI / ML
| Technology | Purpose |
|---|---|
| OpenAI GPT-4o-mini | MCQ generation, quality scoring, distractor generation |
| Spring AI 1.0.0 | Client wrapper for OpenAI API |
| Semantic Search | Embedding-based question search |
| Screenshot to MCQ | Vision API — extracts MCQ from image |
| Duplicate Detection | Semantic similarity scoring on bulk upload |
| Lingva API | Dynamic MCQ content translation (primary) |
| MyMemory API | Translation fallback (if Lingva fails) |

### Observability Stack
| Technology | Version | Purpose |
|---|---|---|
| Prometheus | 2.51.2 | Metrics scraping + storage + alerting |
| Grafana | 10.4.2 | Dashboards — QuizHub Business Metrics (auto-provisioned) |
| Docker Compose | v2 | One-command observability stack (`docker-compose.observability.yml`) |
| Micrometer Registry | 1.12.x | Bridge between Spring Boot and Prometheus |
| Logstash Logback Encoder | 7.4 | JSON structured logging for Loki/Datadog/Splunk |

### 🔌 MCP Server
| Technology | Version | Purpose |
|---|---|---|
| Spring Boot | 3.4.1 | MCP server framework |
| Spring AI MCP | 1.0.0 | Model Context Protocol (SYNC/SSE) |
| WebClient | 6.x | Calls QuizHub backend REST APIs |

> **Endpoint:** `http://localhost:8085` · **Tools:** 8 registered · **Protocol:** SYNC  
> Connect from Claude Desktop or GitHub Copilot: `http://localhost:8085/sse`

---

## ⚙️ Prerequisites

- Java 17 (OpenJDK 17+)
- Maven 3.8+
- Node.js 18+ ([download](https://nodejs.org))
- MySQL 8.x
- Redis 7.x — `brew install redis && brew services start redis` *(optional — app falls back to Caffeine if Redis is not running)*
- (Optional) OpenAI API key for AI features
- (Optional) Postman for API testing

---

## 🚀 How to Run

### ⚡ One-Command Quick Start (Recommended)

```bash
bash start.sh
```

That's it. This single command:
1. Checks prerequisites (Java, Maven, Node, npm)
2. Creates the MySQL `quizhub` database
3. Starts **Prometheus + Grafana** via Docker
4. Builds the backend JAR (skipped if sources unchanged)
5. Starts the **Spring Boot** backend and waits until healthy
6. Installs npm packages (skipped if up to date) and starts **React** frontend

```
bash start.sh           # start everything
bash start.sh --stop    # stop everything
bash start.sh --status  # health check all 7 services
```

> **VS Code:** Opens the workspace → the full stack starts **automatically** (`runOn: folderOpen` task). VS Code will ask "Allow automatic tasks?" once — click **Allow**.

Logs are written to `.logs/backend.log` and `.logs/frontend.log`.

---

### Manual Setup (step by step)

### 1. Database Setup
```sql
CREATE DATABASE quizhub;
```

### 2. Configure Database Credentials

Open `backend/src/main/resources/application.yml` and update the datasource section:

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/quizhub?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
    username: root
    password: root    # ← set this to YOUR MySQL root password (default from install guide: root)
```

> **Note:** Set `password` to match your local MySQL root password. If you left it blank during MySQL installation, keep `password:` empty.

### 3. Redis Cache (Optional but Recommended)
```bash
brew install redis
brew services start redis
redis-cli ping   # → PONG
```

> **Auto-detection:** If Redis is running, the app uses `RedisCacheManager` (distributed, TTL 5 min). If Redis is not running, it falls back silently to `CaffeineCacheManager` (in-process). No code changes needed — the switch is automatic on startup.

### 4. Backend
```bash
cd backend

# Set environment variables
export JWT_SECRET=your-256-bit-secret-key-here
export OPENAI_API_KEY=your-openai-key-here   # Optional — app works without it

# Single maven command (clean build + run)
mvn clean install spring-boot:run
```
Backend starts at: `http://localhost:8080`

> **Note:** `data.sql` auto-seeds all required data (tech stacks, topics, users) on first run via `spring.jpa.hibernate.ddl-auto: update`.

### 5. Frontend
```bash
cd frontend
npm install
npm start
```
Frontend starts at: `http://localhost:3000`

### 6. Swagger UI (API Testing)
```
http://localhost:8080/swagger-ui/index.html
```
Alternatively use **Postman** — import the base URL `http://localhost:8080` and pass `Authorization: Bearer <token>` header.

### 7. Health Check
```
http://localhost:8080/actuator/health
# Expected: {"status":"UP"}
```

### 8. MCP Server (Optional — for AI agent integration)
```bash
cd mcp-server

# Get a fresh token first
export QUIZHUB_TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"enterpriseId":"divya.madhanasekar","password":"Admin@123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

mvn spring-boot:run
```
MCP Server starts at: `http://localhost:8085`  
SSE endpoint for Claude/Copilot: `http://localhost:8085/sse`  
8 tools registered: `searchQuestions`, `checkDuplicate`, `createMcq`, `getStats`, and more.

### 9. Prometheus + Grafana (Optional — requires Docker)
```bash
# Requires Docker Desktop or Colima running
docker-compose -f docker-compose.observability.yml up -d
```

| Tool | URL | Login |
|------|-----|-------|
| **Grafana** | http://localhost:3001 | `admin` / `quizhub` |
| **Prometheus** | http://localhost:9090 | (no auth) |

Grafana opens automatically on the **QuizHub Business Metrics** dashboard (pre-provisioned — no manual import needed). Prometheus starts scraping `/actuator/prometheus` every 10 seconds.

To stop: `docker-compose -f docker-compose.observability.yml down`

---

## 🔐 Test Credentials

| Role | Enterprise ID | Password |
|---|---|---|
| Admin | `divya.madhanasekar` | `Admin@123` |
| Admin | `gaurav.a.bhola` | `Admin@123` |
| SME 1 | `birendra.kumar.singh` | `Sme@1234` |
| SME 2 | `swati.avinash.nikam` | `Sme@1234` |
| SME 3 | `indugu.hari.prasad` | `Sme@1234` |

> **Note:** One-click demo credential autofill is available on the Login page.

---

## 🌐 Supported Languages

English · French · German · Hindi · Kannada · Telugu · Urdu (RTL)

---

## ✨ Features (450 Total)

> **Core PPT requirements: ~50 | Bonus features: ~400** — Over 9× what most hackathon teams build.

---

### 🆕 Latest UI/UX Enhancements (13 features) — *Added June 2026*

422. **Transformers-inspired animated topbar strip** — Full cinematic story sequence cycling every ~33s: saucer flies across, beams each team member's name (Veera ⚡, Teja 🚀, Tarun 🌟, Dilip 💫) one by one with glowing colored light ray
423. **Bumblebee Camaro car animation** — Yellow/gold CSS-drawn Camaro (Bumblebee movie-style) drives full-width right-to-left across the strip with spinning wheels and golden glow
424. **Explosion burst + 6 sparkle particles** — Car explodes at left end with white→gold→purple radial burst; 6 emoji particles (⭐✨💛🌟) fly outward at different angles
425. **CSS robot rise** — Robot materialises from explosion with arm-throw animation, then vanishes
426. **Saucer launch with team label** — Robot launches 🛸 saucer left trailing "✦ BumbleBee Team ✦" purple glowing label
427. **Floating orbs + twinkling stars** — 6 glowing orbs and 10 twinkling stars as topbar background accents
428. **Drag-to-reorder dashboard widgets** — All 9 Home dashboard widgets are drag-and-droppable; order persisted to `localStorage` and survives page refresh; visual feedback (grab cursor, opacity/scale/glow on drag target)
429. **Sound effects system** — `useSoundEffects` hook + `GlobalSoundListener`; plays audio cues on navigation and key actions; toggle on/off + volume control in navbar
430. **Keyboard shortcuts overlay** — Press `?` anywhere to open a modal listing all keyboard shortcuts (`KeyboardShortcuts` component)
431. **Wellness reminder popups** — Periodic break reminders shown as non-intrusive overlay (`WellnessReminder` component)
432. **Service worker cache fix** — JS/CSS bundles excluded from PWA cache; new deployments are visible immediately on normal refresh without needing Ctrl+Shift+R
433. **Instant page load / zero-spinner system** — `getCacheSync()` + `prefetchAll()` in `api.js`; all 8 pages (Home, MyQuestions, AuditLog, UserManagement, PendingReviews, Analytics, ReviewerDashboard, Leaderboard) initialise their state synchronously from in-memory cache on first render — zero loading flash even on rapid navigation
434. **SLA breach table: stuck date + SLA limit** — Reviewer Metrics SLA breach table now shows days stuck **and** `/ Nd limit` (from `slaThresholdDays`) inline, plus a muted `since DD MMM YYYY` date below derived from `updatedAt` — reviewers can instantly see both how long a question has been stuck and what the expected turnaround was

---

### 🔐 Login & Authentication (14 features)
1. Login page with enterprise ID + password
2. Demo panel with 5 one-click login users (2 Admin, 3 SME)
3. JWT-based authentication (stateless, no server sessions)
4. JWT stored in localStorage with auto-injection via Axios interceptor
5. Admin login → full sidebar access (all pages)
6. SME login → restricted sidebar (no admin pages)
7. Wrong password → "Invalid credentials" error
8. Empty fields → client-side validation, no API call fired
9. Forgot password page with enterprise ID / email input
10. Password reset email flow (SMTP-dependent, DB-stored expiring token, one-time use, auto-deleted)
11. Reset password token validation (expired/used token → clear error)
12. **Login rate limiting** — `LoginRateLimitFilter`: 10 attempts per IP per 60s, HTTP 429 with retry-after seconds, `X-Forwarded-For` aware
13. Concurrent session support (multiple devices)
14. Logout clears session + localStorage, redirects to login

---

### 📝 Registration (6 features)
15. Register page with all fields (enterprise ID, full name, email, password, tech stacks)
16. Password masking on input with toggle visibility
17. Submit → account in PENDING status (cannot login yet)
18. Admin approval required before login (approval workflow)
19. Duplicate enterprise ID → rejected with error
20. Weak password policy enforcement (complexity rules)

---

### 🔑 Change Password (4 features)
21. Change password modal in navbar profile menu
22. Wrong current password → validation error
23. Password mismatch (new ≠ confirm) → error shown
24. Correct flow → password changed, session maintained

---

### 🏠 Dashboard (10 features)
25. Stat cards showing live DB data (Total MCQs, Approved, Under Review, Rejected)
26. Dark mode / Light mode toggle (persists in localStorage)
27. Language switcher (7 locales with flag icons)
28. UTC→IST timestamp display ("2h ago" relative format)
29. Recent activity table with latest MCQ updates
30. Leaderboard widget on dashboard (top reviewers)
31. SME sees only own stats, not system-wide counts
32. Admin sees system-wide counts across all users
33. Mobile responsive dashboard (hamburger menu, stacked cards)
34. Branding (logo, app name "QuizHub AI" visible)

---

### ✍️ MCQ Form — Create/Edit (16 features)
35. MCQ form with question stem (multiline)
36. 4 answer options input (A, B, C, D)
37. Correct answer radio selector
38. Subject/Tech Stack dropdown (linked to Master Data)
39. Topic dropdown (dynamically linked to selected tech stack)
40. Difficulty selector (Easy / Medium / Hard)
41. Bloom's Taxonomy level selector (6 levels: Remember, Understand, Apply, Analyze, Evaluate, Create)
42. **Code Block support** — `</> Code Block` button inserts formatted code in question stem
43. Rich text renders safely (XSS-protected via `QuestionStemRenderer`)
44. **AI-assisted full MCQ generation** — "🤖 Generate with AI" button creates entire question from topic
45. Save as Draft → DRAFT status
46. Save & Send for Review → READY_FOR_REVIEW status
47. Edit draft → form pre-filled with existing data
48. Delete draft → removed with success toast
49. Empty stem → validation prevents submit
50. No correct answer selected → validation error

---

### 📋 My Questions (12 features)
51. Paginated table: Question, Tech Stack, Topic, Difficulty, Status, Actions
52. Status filter tabs (All / Draft / Ready for Review / Under Review / Approved / Rejected) with counts
53. Real-time search/filter across questions
54. Column sort ascending/descending with arrow indicator
55. Pagination with configurable page size selector (5/10/15/20)
56. Edit button only for DRAFT and REJECTED MCQs
57. Resubmit REJECTED MCQ → back to READY_FOR_REVIEW
58. New SME → empty state "No questions yet"
59. Export to CSV
60. Export to Excel (.xlsx)
61. View Full Question link per row (opens MCQ Detail)
62. Status badges: DRAFT=grey, READY_FOR_REVIEW=blue, UNDER_REVIEW=yellow, APPROVED=green, REJECTED=red

---

### 🔍 MCQ Detail (12 features)
63. Full detail view: stem, 4 options, metadata (tech stack, topic, difficulty, creator, dates)
64. Correct answer highlighted green for admin/reviewer
65. Reviewer feedback panel ("📋 Reviewer Feedback") shown for REJECTED MCQs
66. **Discussion comment thread** (McqCommentSection) with threaded replies
67. Post comment → visible with timestamp + author avatar
68. Chronological comment order with @mentions
69. Delete own comment
70. Back navigation returns to correct referring page
71. Print/PDF export
72. Status badge visible on detail
73. IST timestamps on all comments
74. Rich text question renders correctly (code blocks, formatting)

---

### ✅ Pending Reviews (10 features)
75. Only assigned UNDER_REVIEW questions shown to this reviewer
76. "Pending" label on each card with status badge
77. Pre-submission checklist (4 checkboxes, all must be checked before submit)
78. Approve action → APPROVED, removed from reviewer's list
79. Reject with mandatory comment → REJECTED, reason stored
80. Comment without verdict → question stays UNDER_REVIEW
81. Reviewer A and B see only their own assignments (isolated)
82. No reviews assigned → empty state "All caught up!" shown
83. Navbar badge shows pending review count
84. SME notified when reviewer submits decision (notification + email)

---

### 🏦 Question Bank — Admin (12 features)
85. All MCQs from all users visible (paginated)
86. Subject/Tech Stack filter dropdown
87. Status filter dropdown
88. Semantic search by keyword (embedding-based)
89. Export CSV/Excel of filtered results
90. Assign Reviewer button (only for READY_FOR_REVIEW MCQs)
91. Assign Reviewer dialog shows: Tech Stack, Topic, Creator ID
92. Reviewer dropdown filtered by tech stack mapping, excluding creator SME
93. Admin can be assigned as reviewer
94. Assign → MCQ status → UNDER_REVIEW
95. Bulk checkbox select + bulk actions
96. Admin can edit any MCQ at any status

---

### 📤 Bulk Upload (9 features)
97. Bulk upload page with drag-and-drop zone
98. Download blank Template_MCQs.xlsx template
99. Upload Template_MCQs.xlsx / CSV files
100. Preview table shows parsed data before save
101. Validates required fields: tech stack, topic, difficulty, stem, 4 options, correct answer
102. Valid rows → saved as DRAFT in My Questions
103. Partial file → valid rows saved, invalid rows listed in error report with row-by-row details
104. Wrong file type (.pdf, .jpg etc.) → rejected with clear error
105. Empty file → handled gracefully with upload progress bar

---

### 👥 User Management — Admin (8 features)
106. User table with roles, status, assignment info (paginated)
107. Approve pending user → can now login
108. Reject user registration → blocked permanently
109. Change role SME ↔ ADMIN
110. Search users by name/ID
111. Deactivate active user
112. Cannot delete own account (self-protection)
113. User count matches dashboard stats

---

### 📚 Master Data — Admin (8 features)
114. Master Data page with tech stacks and topics management
115. Add new subject/tech stack → appears in MCQ form dropdown immediately
116. Edit subject name
117. Delete subject with dependency check (blocks if MCQs linked)
118. Add topic under subject
119. Duplicate subject name → rejected
120. SME cannot access /master-data (RBAC enforced)
121. Dropdown data syncs instantly to MCQ form (Spring Cache + `@CacheEvict`)

---

### 📊 Analytics (6 features)
122. Analytics dashboard with donut chart + bar chart
123. Date range filter changes chart data
124. Export analytics report (Excel + Print)
125. SME sees only own data in analytics
126. Reviewer performance chart (approval rate, review count)
127. Approval rate % calculation per reviewer

---

### 🗂️ Kanban Board (5 features)
128. 5 columns: DRAFT / READY_FOR_REVIEW / UNDER_REVIEW / APPROVED / REJECTED
129. SME sees only own questions; Admin sees all
130. Card click → opens MCQ detail
131. Column card counts correct and live-updating
132. Filter Kanban by subject/tech stack + search

---

### 🧪 Quiz Builder & Proctored Assessments (14 features)
133. Quiz Builder page (create proctored assessment sessions)
134. Create quiz from approved MCQs with filters (tech stack, difficulty, count, time limit)
135. Quiz attempts history page (all past attempts per session)
136. Quiz landing page with name + email entry, "Continue →" start button
137. Quiz in progress with countdown timer (always visible, colour-coded: purple → orange at 5 min → red at 1 min)
138. Timer expires → auto-submit
139. **Tab switch → violation warning** toast + screenshot captured on 1st violation via html2canvas
140. **Fullscreen exit → violation counted** (`fullscreenchange` event)
141. **Copy-paste disabled** during quiz (clipboard actions blocked)
142. Submit → score displayed with detailed results
143. **3 strikes = auto-submit** with status TERMINATED
144. Non-registered user quiz taking (name + email entry, one attempt per email)
145. Quiz link expiry (configurable hours, enforced on attempt)
146. **Exam lock guard** — blocks opening app in 2nd tab via `sessionStorage`

---

### ⚡ Live Quiz Battle — Kahoot-style (38 features)
147. **Live Quiz Battle page** — host real-time multiplayer quiz sessions
148. Generate unique 6-digit PIN code for participants to join
149. "Join a Game" button for participants to enter code
150. Active sessions list with game codes and participant count
151. Past sessions history (hosted + participated tabs)
152. Real-time competition with live leaderboard
153. **Create Live Quiz form** — title, tech stack, topic, difficulty, question count, time per question
154. **Session Mode selection** — BATTLE mode for competitive play
155. **Team Mode toggle** — enable team-based competition
156. **Adaptive Difficulty** — dynamically adjusts question difficulty
157. **Recording enabled** — session recording for later replay
158. **Co-host support** — assign a co-host by enterprise ID
159. **WebSocket real-time** — STOMP over SockJS for instant event broadcast
160. **Live Host Controls** — start, pause, resume, extend time, end session, next question, end question
161. **Kick participant** — host can remove a player mid-session
162. **Transfer host** — hand off host role to another user
163. **Live Lobby** — waiting room showing joined participants before start
164. **Countdown animation** — 3-2-1 countdown before each question
165. **Live Play** — participant answers with keyboard shortcuts (A/B/C/D)
166. **Score calculation** — base score by difficulty (Easy 1000, Medium 1500, Hard 2000) + time bonus
167. **Live Results page** — podium (top 3) with animated medals + full leaderboard
168. **Certificate generation** — downloadable certificate for top 3 + participation certificate
169. **Invite link** — shareable link for session
170. **Session replay** — replay past session question-by-question
171. **Team leaderboard** — separate leaderboard for team mode
172. **Session state restore** — host/player can reconnect and resume from last state
173. **Host reconnect** — host can recover session after page refresh
174. **Live session detail page** — full summary + leaderboard for ended sessions
175. **Participated sessions** — view history of sessions you joined
176. **PIN validation endpoint** — verify PIN before joining
177. **Answer submission** — real-time answer with time-based scoring
178. **Question result broadcast** — all participants see correct answer + stats after each question
179. **End question timer** — auto-advance when time expires
180. **Result countdown** — auto-advance to next question after showing result
181. **Extend time** — host can add extra seconds during a question
182. **Guard: duplicate session** — prevents creating duplicate session for same quiz
183. **Deduplication** — participated sessions exclude already-hosted sessions
184. **Session status** — WAITING → ACTIVE → ENDED with visual badges

---

### 🏆 Leaderboard (5 features)
185. Rankings shown with podium (top 3) + scores table
186. Filter leaderboard by subject/tech stack
187. Current user's rank highlighted ("YOUR RANK #X")
188. Leaderboard updates after quiz attempt
189. **3 tabs**: SME Reviewers, Assessment Results, Live Quiz

---

### 📬 Internal Inbox (10 features)
190. Inbox loads with 5 tabs (All / Sent / Starred / Drafts / Trash)
191. Compose new message form
192. Send message to another user
193. Sent tab shows sent messages
194. Recipient receives message in real-time
195. Open and read message (marks as read)
196. Reply to message
197. Delete message (moves to Trash)
198. Unread count badge in navbar
199. **Auto-draft** — debounced localStorage save (1.5s), restored on next mount

---

### 🔔 Notifications (7 features)
200. Notification bell dropdown panel with Direct/Watching tabs
201. Mark all as read → badge clears
202. Review assignment creates notification
203. Approval creates notification to author
204. Rejection creates notification to author
205. Unread count badge visible (updates without page refresh)
206. Type filters (All, Assigned, Approved, Rejected, Submitted, Mentions, Downloads)

---

### 🤖 AI ChatBot (10 features)
207. ChatBot open/close widget (desktop + mobile), pinned at bottom-right
208. Answer how-to questions about the app
209. Answer questions about the review process
210. **Slash commands** (`/create`, `/quiz-builder`, `/leaderboard`, `/question-bank`) for navigation
211. Out-of-scope query handled gracefully
212. Empty message → send button disabled
213. **Conversation history context** — last 8 messages fed to GPT-4o-mini for multi-turn coherence
214. **Emoji reactions** on messages + pinned messages + reply threads
215. Typing indicator shown while AI responds
216. **Online presence heartbeat** (in-memory `ConcurrentHashMap`, 2-min TTL)

---

### 🧠 AI-Powered Features (12 features)
217. **AI duplicate detection** — semantic similarity scoring (≥10% flagged, ≥30% blocked)
218. **AI confidence scoring** — HIGH / MEDIUM / LOW per question
219. **AI quality scoring** — 0–100 with per-dimension assessment
220. **AI auto-difficulty rating** — suggests Easy/Medium/Hard based on content
221. **AI distractor generation** — "Generate Wrong Options (Distractors)" from correct answer
222. **AI Explain All Options** — generates educational explanation for each option
223. **AI Answer Validation** — "Validate Answer with AI" verifies correctness
224. **AI full MCQ generation** — "Generate with AI" creates entire question from topic selection
225. **Screenshot-to-MCQ** — upload image → Vision API extracts question, options, answer automatically
226. **Smart Interview Kit** — upload resume (PDF/DOCX/TXT) + optional JD cross-reference → AI generates tailored interview questions
227. **AI Quality Check** ("AI Quality Check" button) — comprehensive quality assessment
228. **AI "AI Check"** — real-time duplicate pre-check while typing question stem

---

### 🧪 AI Studio — Advanced AI Tools (15 features)
229. **AI Studio page** — dedicated hub for advanced AI-powered tools
230. **Code → MCQ tab** — paste any code snippet → AI generates MCQs testing understanding of that code
231. Multi-language support in Code→MCQ: Java, Python, JavaScript, TypeScript, C++, C#, Go, Rust, SQL, Kotlin
232. Configurable MCQ count (1–5) and difficulty for Code→MCQ
233. **Save to Question Bank** toggle — optionally save AI-generated questions directly
234. **AI Rewrite tab** — paste a weak MCQ → AI rewrites with better stem, distractors, clarity
235. **Rewrite by ID** — enter MCQ ID → fetch and rewrite existing question from database
236. Before/After quality score comparison (0–100 scale)
237. Improvement list — AI explains what was fixed
238. **Learning Path tab** — based on quiz performance, AI generates personalized study plan
239. Weak topic detection with priority ranking (error count)
240. Step-by-step learning path with estimated time, difficulty, resource recommendations
241. Accuracy calculation and overall level badge
242. Motivational note from AI based on performance
243. Practice recommendations list

---

### 💻 Coding Questions & Code Execution (12 features)
244. **Coding Question creator page** — full IDE-style interface for coding challenges
245. Title, description, tech stack, topic, difficulty, language selection
246. **Starter code** editor — pre-filled template for candidates
247. **Solution code** editor — reference solution
248. **Test cases** — input/expected output pairs with hidden flag
249. **Add/remove test cases** dynamically
250. **AI Generate** button — AI generates entire coding question (title, description, starter code, solution, test cases)
251. **Run Tests** button — execute code against test cases in real-time
252. **Code Execution Service** — sandboxed execution for Java, Python, JavaScript
253. 5-second timeout per test case to prevent infinite loops
254. Per-test-case results: passed/failed/error with expected vs actual output
255. **Save** coding question to database

---

### 🎨 17 Interactive Question Types (20 features)
256. **Question Types showcase page** — gallery of all 17 question types with live interactive demos
257. Single Choice MCQ (Classic)
258. Multiple Choice (Multi-select)
259. Drag & Drop Ordering (Interactive)
260. Match Concept to Definition (Matching)
261. Match Code to Output (Matching)
262. Fill in the Blank (Input)
263. Predict Program Output (Tracing)
264. Debug the Code (Fix)
265. Code Rearrangement (Puzzle)
266. Interactive SQL Builder (Builder)
267. Architecture Layers (Design)
268. Code Review Challenge (Review)
269. Stream Pipeline Builder (Builder)
270. Flowchart Question (Visual)
271. DevOps Pipeline (CI/CD)
272. Secure Coding (Security)
273. Tech Riddles (Fun)
274. **Question Type Creator** — form-based editor for each type (drag order, match pairs, code output, fill blank, etc.)
275. **Live interactive demos** — try each question type before creating

---

### 📖 RuleBook — Interactive Documentation (8 features)
276. **RuleBook page** — animated, interactive documentation for the entire platform
277. **Lifecycle tab** — 5-stage MCQ pipeline with animated connectors and pulse effects
278. **Roles tab** — SME & Admin permissions cards with visual hierarchy
279. **Duplicate Detection tab** — explains 30% threshold with animated counter
280. **AI Rules tab** — 6 AI feature cards (Smart Generation, Auto Dup-Screen, Draft First, Privacy First, Regenerate, AI Check)
281. **Workflow tab** — 8-step review process with step-by-step cards
282. **Quiz Rules tab** — quiz-related rules (Approved Only, Quiz Builder, Unique Links, Anti-Cheat, Auto-Grading, Live Mode)
283. **Scroll-in animations** — IntersectionObserver-based fade-in on scroll + floating particle background

---

### 🎯 Smart Interview Kit (8 features)
284. **Resume upload** — PDF, DOCX, DOC, TXT file support
285. **Optional Job Description** cross-reference — checkbox toggle + textarea
286. **6 question categories** — Technical, Coding, SQL, Project-Based, Behavioral, Scenario
287. Tab-based results view with question count per category
288. Difficulty badges per question (Easy/Medium/Hard)
289. Question type labels (Positive/Negative/Edge Case)
290. 5-minute AI processing timeout (300s)
291. i18n translated UI labels

---

### 📊 Quiz Attempts & Proctoring (10 features)
292. **Quiz Attempts page** — view all attempts for a quiz session
293. Per-attempt detail: score, time taken, violation count, status
294. **CSV/Excel export** — download all attempts as CSV
295. **PDF export** — print-friendly results report
296. **Screenshot capture** — view violation screenshots per attempt
297. Filter attempts by status (completed, terminated, in-progress)
298. Stats cards: total attempts, average score, terminated count
299. Search and filter candidates
300. Per-question answer review in attempt detail
301. Sortable columns with pagination

---

### 🔌 Real-Time Chat System (11 features)
302. **Online presence heartbeat** — 2-minute TTL with ConcurrentHashMap
303. **Online users list** — see who's currently online
304. **Pin messages** — pin/unpin important messages
305. **Emoji reactions** — react to messages with emojis
306. **Reply threads** — reply to specific messages in thread
307. **Edit messages** — modify sent messages
308. **Delete messages** — remove messages
309. **Message history** — paginated chat history
310. **Typing indicator** while AI responds
311. **Chat slash commands** — `/create`, `/quiz-builder`, `/leaderboard`, `/question-bank`
312. **Multi-turn conversation** — last 8 messages as context for coherent AI responses

---

### 📬 Inbox Advanced (4 features)
313. **Starred messages** — star/unstar important messages
314. **Starred tab** — dedicated view for starred messages
315. **Mark all as read** — bulk operation
316. **Read receipts** — individual message read marking

---

### 📈 Advanced Analytics & Stats (8 features)
317. **Dashboard summary** — questions by status, by tech stack, by difficulty
318. **Stats by tech stack** — breakdown per technology
319. **Recent activity feed** — latest actions across the platform
320. **Reviewer stats** — per-reviewer performance metrics
321. **Reviewer metrics dashboard** — assigned, approved, rejected, avg response time
322. **SLA breach detection** — identifies overdue reviews
323. **Assessment leaderboard** — rankings across all quiz sessions
324. **Export stats** — download analytics data

---

### 🧑‍💼 SME-TechStack Assignment (4 features)
325. **List all SMEs** per tech stack
326. **Assign SME** to tech stack
327. **Remove SME** from tech stack
328. **Eligible reviewers** — filter reviewers by tech stack for assignment

---

### 🌐 Real-Time Content Translation (5 features)
329. **Live content translation** — translate any text to 7 languages via Lingva.ml API
330. **MyMemory fallback** — secondary translation API if Lingva fails
331. **Translation cache** — prevents duplicate API calls for same text
332. **useContentTranslation hook** — React hook that auto-translates when language changes
333. **AbortSignal timeout** — 6s timeout on translation requests

---

### ⚡ Frontend Performance & Caching (8 features)
334. **API Response Cache** — in-memory `_cache` Map with per-endpoint TTL (15s–600s); staggered 80ms prefetch on login
335. **`getCacheSync()` instant render** — all 8 pages initialise state synchronously from cache on first render; zero loading spinner even on rapid navigation
336. **`prefetchAll(role)`** — fires 200ms after login and 300ms on app boot; warms all role-relevant endpoints in background
337. **SessionStorage caching** — tech stacks & topics additionally cached in sessionStorage
338. **Optimistic UI updates** — instant feedback before server response
339. **Debounced auto-save** — 1.5s debounce on draft saves
340. **Lazy loading** — React lazy + Suspense; all non-auth pages code-split and deferred
341. **Service worker cache fix** — JS/CSS bundles excluded from PWA precache; new deployments visible immediately on normal refresh

---

### 📜 Audit Log (4 features)
339. Audit log table: Timestamp, User, Action, Entity, Details (paginated)
340. Search audit events by keyword (e.g. "LOGIN", "USER_APPROVED")
341. Login events recorded with user, timestamp, IP
342. MCQ approve/reject recorded with actor, old/new status, full details

---

### 📈 Reviewer Metrics (7 features)
343. Per-reviewer stats: assigned, approved, rejected, avg response time
344. Top reviewer highlighted
345. Average review time chart
346. SME cannot access /reviewer-metrics (RBAC enforced)
347. **SLA breach table** — lists questions stuck beyond threshold; shows days stuck, `/ Nd limit` (slaThresholdDays), and `since DD MMM YYYY` date derived from updatedAt
348. **Admin-configurable SLA threshold** — global or per-tech-stack days limit stored in admin settings
349. **Reviewer workload toggle** — show/hide workload distribution widget on Reviewer Metrics page

---

### 🔒 Access Control — RBAC (9 features)
347. SME blocked from /user-management
348. SME blocked from /audit-log
349. SME blocked from /master-data
350. SME blocked from /reviewer-metrics
351. SME blocked from /quiz-builder (admin-only creation)
352. SME blocked from /question-bank (admin-only view all)
353. Unauthenticated user redirected from all protected routes → login
354. `PrivateRoute` component blocks browser-back after logout
355. Admin-only edit on any MCQ enforced server-side (`@PreAuthorize`)

---

### 🔄 MCQ Lifecycle Integrity (12 features)
356. Draft → Submit for Review → READY_FOR_REVIEW
357. Admin sees MCQ in Question Bank once READY_FOR_REVIEW
358. Admin assigns reviewer → UNDER_REVIEW
359. Reviewer sees MCQ in Pending Reviews
360. Reviewer approves → APPROVED
361. APPROVED MCQ locked from further edits (SME cannot edit)
362. Reviewer rejects → REJECTED with mandatory comment
363. Creator sees rejection reason on My Questions + MCQ Detail
364. Creator edits and resubmits → READY_FOR_REVIEW again
365. Multiple review cycles supported (reject → edit → resubmit → re-review)
366. **MCQ version history** — every edit tracked with full snapshot diff + version number
367. Full audit trail for every status change

---

### 🌐 i18n — 7 Languages (7 features)
368. English (default)
369. Hindi (HI) 🇮🇳
370. French (FR) 🇫🇷
371. Kannada (KN) 🇮🇳
372. Telugu (TE) 🇮🇳
373. German (DE) 🇩🇪
374. Urdu (UR) 🇵🇰 — full RTL layout support

---

### 📱 Mobile Responsive (11 pages)
375. Login page mobile
376. Dashboard mobile (hamburger menu + stacked cards)
377. My Questions mobile (scrollable table)
378. MCQ Form mobile
379. Pending Reviews mobile
380. Question Bank mobile
381. Bulk Upload mobile
382. Inbox mobile
383. Notification bell mobile
384. ChatBot mobile
385. Audit Log mobile

---

### 🛡️ Security (6 features)
386. Password policy (min length, complexity enforcement)
387. JWT authentication on all protected endpoints
388. **Global Exception Handler** (`@RestControllerAdvice`) — no stack traces exposed to client, consistent JSON errors
389. Login rate limiting / brute-force protection (HTTP 429)
390. No self-review (creator cannot review own MCQ)
391. XSS-safe rendering — all user content via `QuestionStemRenderer` (plain text, never raw HTML)

---

### 💾 Persistence & UX (12 features)
392. Dark mode preference persists in localStorage
393. Language preference persists in localStorage
394. **Collapsible sidebar** with state persisted in localStorage
395. Violation count badge shown on quiz screen
396. Topic search in dropdown
397. 404 page for unknown routes
398. Empty search → shows all results (no crash)
399. Weak password blocked at registration
400. Upload progress bar during bulk upload
401. **Sortable columns** + reusable pagination across all list pages
402. **Optimistic locking** (`@Version` on MCQ entity) — prevents lost updates on concurrent edits
403. **`@Transactional`** on all write operations — DB rollback on any failure

---

### ⚙️ Backend Infrastructure (10 features)
404. **Spring Cache abstraction** — `@Cacheable` on tech stacks, topics, analytics, reviewers; `@CacheEvict` on mutations; `@EnableCaching`
405. **Redis distributed cache (primary)** — `RedisCacheManager` with `GenericJackson2JsonRedisSerializer`; TTL 5 minutes; auto-detected via PING on startup; keys visible via `redis-cli KEYS "*"`
406. **Caffeine in-process fallback** — `CaffeineCacheManager` activates automatically if Redis is unavailable; max 500 entries, TTL 5 min; zero setup required
407. **`CacheConfig.java`** — custom `@Configuration` that PINGs Redis on startup; logs which provider was selected; seamless switch requires no code change
408. **Hibernate L1 cache** — active by default (JPA session-scoped); entities loaded once per transaction
409. **Axios request interceptor** — auto-injects `Authorization: Bearer <token>` on every API call
410. **Axios response interceptor** — catches 401 → auto-logout + redirect to login
411. Spring Actuator health endpoint (`/actuator/health`)
412. **Spring Mail** — email notifications (assigned, approved, rejected)
413. Swagger UI / OpenAPI documentation (`/swagger-ui/index.html`)

---

### 🗄️ Data Model (19 entities)
410. User, TechStack, Topic, Mcq, McqVersion, McqComment, ReviewComment
411. Notification, InboxMessage, ChatMessage, AuditLog
412. QuizSession, QuizAttempt
413. CodingQuestion
414. LiveSession, LiveParticipant, LiveAnswer, LiveSessionRecording
415. PasswordResetToken

---

### 🔌 API Surface (140 endpoints)
416. 17 REST controllers covering all features
417. AI Controller — 18 endpoints (generate, rewrite, validate, score, search, learning path, stream, RAG, tool-chat, interactive)
418. Live Session Controller — 24 endpoints (CRUD, join, host, pause/resume/extend, kick, transfer, leaderboard, replay, team, invite)
419. Coding Controller — 6 endpoints (execute, AI-generate, CRUD, submit, review)
420. Quiz Session Controller — 8 endpoints (create, list, take, submit, attempts, leaderboard, screenshots)
421. Stats Controller — 8 endpoints (summary, by-tech-stack, leaderboard, recent-activity, reviewer-stats, reviewer-metrics, SLA-breach, export)

---

### 📊 Observability & Production Monitoring (6 features)
435. **Prometheus metrics export** — `/actuator/prometheus` exposes 25 `quizhub.*` business counters/gauges/timers (MCQ lifecycle, auth, AI, email, bulk upload, live sessions, WebSocket) + full JVM/HTTP metrics; all pre-declared so they appear from first startup
436. **Grafana dashboard (auto-provisioned)** — `docker-compose.observability.yml` starts Prometheus + Grafana; QuizHub Business Metrics dashboard auto-loads (stat panels, time-series rates, P95 latency, JVM heap/CPU/DB pool gauges); no manual import needed
437. **Structured JSON logging** — `logback-spring.xml` with profile routing: `local` → coloured human-readable; `prod` → JSON (Logstash encoder) to console + rolling file; ships directly to Datadog / Grafana Loki / Splunk / ELK without parsing rules
438. **Request correlation tracing** — `RequestCorrelationFilter` adds `X-Request-Id` (8-char UUID) to every request/response; MDC enriches every log line with `requestId`, `userId`, `userRole`; log level by HTTP status (INFO/WARN/ERROR)
439. **Custom health indicator** — `CacheHealthIndicator` exposes `cacheSystem` component at `/actuator/health` showing Redis vs Caffeine mode, implementation class, and all cache names; auto-configured DB + Redis health components also enabled
440. **SLO histograms** — `http.server.requests` configured with Prometheus histogram buckets at 50/100/200/500/1000/2000ms SLO boundaries; `application` + `environment` tags on all metrics for multi-instance filtering

---

### **Total: 450 distinct features** ✅

| Category | Count |
|---|---|
| Core PPT requirements | ~50 |
| Bonus features built on top | ~394 |
| AI-powered features (AI Studio + ChatBot + MCQ AI) | 37 |
| Live Quiz Battle features | 38 |
| Interactive Question Types | 20 |
| Coding Questions & Execution | 12 |
| Security features | 6 |
| Mobile responsive pages | 11 |
| Languages supported | 7 |
| Caching (Redis + Caffeine + L1) | 5 |
| **Observability (Prometheus + Grafana + Structured Logs)** | **6** |
| API endpoints | 140 |
| Database entities | 19 |

---

## 🧪 Test Scenarios (242 Total)

> Legend: ✅ = Covered by automated test | 🖐 = Manual / UI verification

### Automated Test Summary

| Layer | Tool | Tests | Coverage |
|---|---|---|---|
| Backend — Integration | JUnit 5 + `@SpringBootTest` + H2 | 253 tests | Auth, MCQ, Admin, Review, BulkUpload, AI, Quiz, Chat, Inbox, Stats, Notifications, MasterData, Comments |
| Backend — Unit | JUnit 5 + Mockito | 271 tests | AuthService, McqService, AdminService, ReviewService, BulkUploadService, AIService, EmailService, NotificationService, MasterDataService, InboxService |
| Frontend — Component | Jest + React Testing Library | 957 tests (24 suites) | All pages: Login, Register, Home, MyQuestions, McqForm, McqDetail, QuestionBank, BulkUpload, PendingReviews, Quiz, TakeQuiz, QuizBuilder, QuizAttempts, Leaderboard, UserManagement, MasterData, Analytics, AuditLog, KanbanBoard, Inbox, ChatBot, ReviewerDashboard, ReviewerMetrics, Notifications, Navbar, i18n utils |
| **TOTAL** | | **2,029 automated tests** (1,072 backend + 957 frontend) | **Backend 92.5% JaCoCo · Frontend 80.37% statements** |

---

### 🔐 Auth & Account (17 scenarios)

#### Positive
| # | Scenario | Auto |
|---|---|---|
| A01 | Register new user with valid details → pending approval screen shown | ✅ `AuthControllerIntegrationTest` + `pages1` |
| A02 | Admin approves new registration → user can now login | ✅ `AdminServiceTest` |
| A03 | New user logs in after approval | ✅ `AuthControllerIntegrationTest.login_validSmeCredentials_returns200` |
| A04 | Forgot password → enter enterprise ID → reset email sent | ✅ `AuthControllerIntegrationTest.forgotPassword_knownUser_returns200` |
| A05 | Forgot password → enter email address → reset email sent | ✅ `AuthServiceTest` |
| A06 | Reset password with valid token → password updated → login works | ✅ `AuthControllerIntegrationTest.changePassword_withValidToken_returns200` |
| A07 | Change password (logged-in) → old password rejected, new works | ✅ `pages11` ChangePasswordModal |
| A08 | Logout → redirected to login | ✅ `pages1` (Navbar logout) |

#### Negative
| # | Scenario | Auto |
|---|---|---|
| A09 | Login with wrong password → "Invalid credentials" error | ✅ `AuthControllerIntegrationTest.login_wrongPassword_returns401` |
| A10 | Login with non-existent enterprise ID → error | ✅ `AuthControllerIntegrationTest.login_unknownUser_returns401` |
| A11 | Login with empty fields → validation error | ✅ `AuthControllerIntegrationTest.login_emptyBody_returns400` + `Login.test.js` |
| A12 | Register with duplicate enterprise ID → error | ✅ `AuthControllerIntegrationTest.register_duplicateEnterpriseId_returns400` |
| A13 | Register with mismatched passwords → error | ✅ `pages1` Register tests |
| A14 | Register with no tech stack selected → error | ✅ `pages1` Register tests |
| A15 | Forgot password with empty field → Send button disabled | ✅ `pages1` ForgotPassword tests |
| A16 | Reset password with no token in URL → "Invalid link" shown immediately | ✅ `pages1` ResetPassword no-token tests |
| A17 | Reset password with expired/used token → error | ✅ `AuthControllerIntegrationTest.resetPassword_invalidToken_returns4xx` |

---

### 🌗 UI Modes & Language (5 scenarios)

| # | Scenario | Auto |
|---|---|---|
| U01 | Dark mode is default on login | ✅ `pages12` App.js theme effect |
| U02 | Toggle to light mode → whole app switches | ✅ `pages12` App.js theme effect |
| U03 | Switch to Hindi → UI translates | ✅ `pages11` useContentTranslation hook |
| U04 | Switch to French → UI translates | ✅ `pages11` translateContent tests |
| U05 | Language persists after page refresh (localStorage) | ✅ `pages11` i18n hook tests |

---

### 📱 Mobile Responsive (3 scenarios)

| # | Scenario | Auto |
|---|---|---|
| M01 | Login page at 375px — no overflow | 🖐 Manual (visual check) |
| M02 | Dashboard at 375px — hamburger menu visible | 🖐 Manual (visual check) |
| M03 | My Questions at 375px — table layout adapts | 🖐 Manual (visual check) |

---

### 📝 MCQ Creation — Single (9 scenarios)

#### Positive
| # | Scenario | Auto |
|---|---|---|
| C01 | Create MCQ → Save as Draft → appears in My Questions as DRAFT | ✅ `McqControllerIntegrationTest` + `McqServiceTest` + `pages14` McqForm |
| C02 | Create MCQ → Save & Send for Review → status = READY_FOR_REVIEW | ✅ `McqServiceTest.submitForReview` + `pages14` McqForm |
| C03 | AI duplicate check → enter similar stem → duplicate warning shown | ✅ `AIControllerIntegrationTest` + `pages17` McqForm AI features |
| C04 | AI generate options → enter stem → options auto-fill | ✅ `AIControllerIntegrationTest` + `pages17` McqForm AI features |

#### Negative
| # | Scenario | Auto |
|---|---|---|
| C05 | Submit with empty question stem → validation error | ✅ `McqControllerIntegrationTest` + `pages14` McqForm validation |
| C06 | Submit with no tech stack selected → validation error | ✅ `McqControllerIntegrationTest` + `pages14` McqForm validation |
| C07 | Submit with all 4 options identical → validation error | ✅ `McqServiceTest` |
| C08 | Submit with no correct answer selected → validation error | ✅ `McqControllerIntegrationTest` |
| C09 | SME tries to edit an APPROVED MCQ → blocked | ✅ `McqServiceTest.updateMcq_approvedByNonAdmin_throwsForbidden` |

---

### 📤 Bulk Upload (6 scenarios)

#### Positive
| # | Scenario | Auto |
|---|---|---|
| B01 | Download template → Template_MCQs.xlsx downloads | ✅ `UploadControllerIntegrationTest` + `pages19` BulkUpload |
| B02 | Upload valid CSV → questions appear in My Questions as DRAFT | ✅ `BulkUploadServiceTest` + `UploadControllerIntegrationTest` |
| B03 | Upload valid XLSX → questions appear in My Questions as DRAFT | ✅ `BulkUploadServiceTest` + `pages19` BulkUpload |

#### Negative
| # | Scenario | Auto |
|---|---|---|
| B04 | Upload wrong file type (.pdf) → error | ✅ `BulkUploadServiceTest` + `pages19` BulkUpload |
| B05 | Upload file with missing required columns → row-by-row error report | ✅ `BulkUploadServiceTest` + `pages19` + `pages20` inline edit modal |
| B06 | Upload file with 500+ rows → rejected with clear error | ✅ `BulkUploadServiceTest.validateFileSize` |

---

### ✏️ My Questions (5 scenarios)

| # | Scenario | Auto |
|---|---|---|
| Q01 | Status filter tabs — All / Draft / Ready / Under / Approved / Rejected counts correct | ✅ `pages2` MyQuestions + `pages10` MyQuestions branch coverage |
| Q02 | Edit Draft MCQ → save → stays DRAFT | ✅ `McqServiceTest` + `pages14` McqForm edit mode |
| Q03 | Submit Draft for review → status becomes READY_FOR_REVIEW | ✅ `McqControllerIntegrationTest` + `McqServiceTest` |
| Q04 | Edit Rejected MCQ → see reviewer comment → edit → resubmit | ✅ `McqServiceTest` + `pages9` McqDetail + `pages16` McqDetail admin view |
| Q05 | Delete Draft MCQ → deleted → disappears from list | ✅ `McqServiceTest.deleteMcq` + `pages2` MyQuestions |

---

### 👤 Admin — Question Bank (8 scenarios)

#### Positive
| # | Scenario | Auto |
|---|---|---|
| QB01 | View all MCQs from all users — paginated | ✅ `AdminControllerIntegrationTest` + `pages2` QuestionBank + `pages20` QuestionBank |
| QB02 | Filter by status + tech stack → filters work | ✅ `pages2` QuestionBank + `pages20` QuestionBank TS filter + status filter |
| QB03 | Assign Reviewer → modal shows eligible reviewers → assign → Under Review | ✅ `AdminControllerIntegrationTest.assignReviewer` + `pages11` AssignReviewerModal |
| QB04 | Admin edits any MCQ → status unchanged | ✅ `AdminServiceTest` + `McqServiceTest` |
| QB05 | Export MCQs to Excel → .xlsx downloads | ✅ `AdminControllerIntegrationTest` |

#### Negative
| # | Scenario | Auto |
|---|---|---|
| QB06 | Assign reviewer to a DRAFT MCQ → blocked | ✅ `AdminServiceTest.assignReviewer_draftMcq_throws` |
| QB07 | Creator not visible in eligible reviewers list | ✅ `AdminServiceTest.getEligibleReviewers_excludesCreator` |
| QB08 | Semantic search with empty query → API not fired | ✅ `pages20` QuestionBank semantic search test |

---

### 🔍 Pending Reviews (5 scenarios)

#### Positive
| # | Scenario | Auto |
|---|---|---|
| PR01 | View only UNDER_REVIEW MCQs assigned to this user | ✅ `ReviewControllerIntegrationTest` + `pages2` PendingReviews |
| PR02 | View full question modal — all 4 options + correct answer visible | ✅ `pages21` PendingReviews review flow |
| PR03 | Approve MCQ → status → APPROVED → disappears from pending | ✅ `ReviewServiceTest` + `ReviewControllerIntegrationTest` + `pages21` |
| PR04 | Reject MCQ with comment → status → REJECTED → creator notified | ✅ `ReviewServiceTest` + `ReviewControllerIntegrationTest` + `pages21` |

#### Negative
| # | Scenario | Auto |
|---|---|---|
| PR05 | Reject without entering comment → blocked, comment required | ✅ `ReviewServiceTest.rejectWithoutComment_throws` + `pages10` PendingReviews |

---

### 🏛️ Admin-Only Pages (5 scenarios)

| # | Scenario | Auto |
|---|---|---|
| AD01 | User Management — view all users, change role SME ↔ ADMIN | ✅ `AdminControllerIntegrationTest` + `pages5` UserManagement + `pages6` UserManagement extended |
| AD02 | Master Data — add/edit/delete tech stacks and topics | ✅ `MasterControllerIntegrationTest` + `MasterDataServiceTest` + `pages13` MasterData Admin CRUD |
| AD03 | Audit Log — all system actions visible | ✅ `pages4` AuditLog + `pages10` AuditLog extended |
| AD04 | Reviewer Metrics — performance stats per reviewer | ✅ `StatsControllerIntegrationTest` + `pages20` ReviewerMetrics |
| AD05 | Analytics — charts by tech stack + status breakdown | ✅ `StatsControllerIntegrationTest` + `pages4` Analytics + `pages21` Analytics |

---

### 🎯 Quiz & Leaderboard (16 scenarios)

| # | Scenario | Auto |
|---|---|---|
| QZ01 | Quiz Builder — create session from approved MCQs | ✅ `QuizSessionControllerIntegrationTest` + `pages3` QuizBuilder |
| QZ02 | Take quiz — timer starts on fullscreen | ✅ `pages3` TakeQuiz + `pages6` TakeQuiz extended |
| QZ03 | Navigate back/forward between questions | ✅ `pages3` TakeQuiz navigation tests |
| QZ04 | Submit with unanswered questions → unanswered counted as wrong | ✅ `QuizSessionControllerIntegrationTest` + `pages3` TakeQuiz |
| QZ05 | Tab switch during quiz → Violation 1/3 toast + screenshot | ✅ `pages7` TakeQuiz extended + violation tests |
| QZ06 | Tab switch twice → Violation 2/3 badge updates | ✅ `pages7` TakeQuiz extended |
| QZ07 | Tab switch 3rd time → auto-submit as TERMINATED | ✅ `pages7` TakeQuiz + `QuizSessionControllerIntegrationTest` |
| QZ08 | Exit fullscreen → counts as violation | ✅ `pages6` TakeQuiz extended |
| QZ09 | Timer colour: >5min = purple → 5min = orange → 1min = red | ✅ `pages6` TakeQuiz timer colour tests |
| QZ10 | ExamLockGuard — open app in 2nd tab during exam → blocked | ✅ `pages6` TakeQuiz ExamLockGuard |
| QZ11 | Timer runs out → auto-submit | ✅ `pages7` TakeQuiz auto-submit |
| QZ12 | Non-registered user enters name + email → takes quiz | ✅ `QuizControllerIntegrationTest` + `pages3` Quiz |
| QZ13 | Already-attempted link → blocks re-attempt | ✅ `QuizSessionControllerIntegrationTest` |
| QZ14 | Download PDF report after quiz | ✅ `pages8` QuizAttempts extended + `pages19` download tests |
| QZ15 | Download CSV of attempts | ✅ `pages8` QuizAttempts + `pages19` download tests |
| QZ16 | Leaderboard — switch between Reviewer mode and Assessment mode | ✅ `pages4` Leaderboard reviewer mode + assessment mode |

---

### 📊 Extra Features (12 scenarios)

| # | Scenario | Auto |
|---|---|---|
| EX01 | Kanban Board — MCQs in columns by status | ✅ `pages2` KanbanBoard + `pages9` KanbanBoard extended |
| EX02 | Inbox — send message, unread badge updates | ✅ `InboxControllerIntegrationTest` + `pages4` Inbox + `pages10` Inbox branch |
| EX03 | Inbox — auto-draft saved after 1.5s, survives refresh | ✅ `pages4` Inbox auto-draft tests |
| EX04 | Inbox — Sent/Starred/Trash tabs work | ✅ `pages4` Inbox + `InboxMessageServiceTest` |
| EX05 | Notification bell — filter by type | ✅ `NotificationControllerIntegrationTest` + `pages12` NotificationBell |
| EX06 | Notification bell — grouped Today/Yesterday/Older | ✅ `pages12` NotificationBell grouped display tests |
| EX07 | AI ChatBot — /create command navigates to form | ✅ `ChatControllerIntegrationTest` + `pages12` ChatBot authenticated |
| EX08 | AI ChatBot — emoji reaction on message | ✅ `ChatControllerIntegrationTest` + `pages12` ChatBot |
| EX09 | MCQ Version History — multiple edits create versioned entries | ✅ `McqServiceTest` versioning + `pages9` McqDetail |
| EX10 | MCQ Comments — threaded reply, Ctrl+Enter to submit | ✅ `McqCommentControllerIntegrationTest` + `pages11` McqCommentSection |
| EX11 | Screenshot MCQ page — renders and downloads as image | ✅ `pages4` ScreenshotMcq |
| EX12 | Reviewer Dashboard — personal stats chart | ✅ `StatsControllerIntegrationTest` + `pages4` ReviewerDashboard + `pages20` ReviewerDashboard |

---

### 🔒 Security & Access Control (8 scenarios)

| # | Scenario | Auto |
|---|---|---|
| SC01 | SME tries to open /question-bank → redirected | ✅ `pages1` PrivateRoute + `AdminControllerIntegrationTest` 403 tests |
| SC02 | SME tries to open /user-management → redirected | ✅ `AdminControllerIntegrationTest` 403 tests |
| SC03 | No token / logged out → any protected route redirects to login | ✅ `pages16` api.js axios + `AuthControllerIntegrationTest.getMe_withoutToken_returns401` |
| SC04 | JWT expires mid-session → 401 → auto-logout with message | ✅ `pages16` api.js 401 interceptor tests |
| SC05 | Browser back after logout → PrivateRoute blocks | ✅ `pages1` PrivateRoute |
| SC06 | HTML/script injection in question stem → rendered as plain text, not executed | ✅ `pages11` QuestionStemRenderer XSS tests |
| SC07 | Direct URL to non-existent MCQ `/mcq/99999` → error page, not crash | ✅ `McqControllerIntegrationTest` 404 tests |
| SC08 | Login with PENDING/unapproved account → clear error message | ✅ `AuthControllerIntegrationTest.login_unapprovedUser_returns400` |

---

### 🔄 Multi-User Scenarios (5 scenarios)

| # | Scenario | Auto |
|---|---|---|
| MU01 | SME1 creates → Admin assigns to SME2 → SME2 rejects → SME1 edits → Admin reassigns → SME3 approves | ✅ `ReviewServiceTest` full lifecycle + `McqServiceTest` |
| MU02 | Admin creates MCQ → assigns to SME → SME approves → Admin not in eligible reviewers list | ✅ `AdminServiceTest.getEligibleReviewers_excludesCreator` |
| MU03 | SME1 sends inbox message to SME2 → SME2 sees unread badge → replies → SME1 sees reply | ✅ `InboxControllerIntegrationTest` + `InboxMessageServiceTest` |
| MU04 | New user registers → Admin approves → user logs in successfully | ✅ `AuthServiceTest` + `AdminServiceTest.approveUser` |
| MU05 | Admin changes SME role to ADMIN → SME re-logs in → sees Admin sidebar | ✅ `AdminServiceTest.updateUserRole` + `pages5` UserManagement |

---

### ⚡ Edge Cases & Data Integrity (16 scenarios)

| # | Scenario | Auto |
|---|---|---|
| ED01 | SME tries to edit UNDER_REVIEW MCQ → blocked | ✅ `McqServiceTest.updateMcq_underReviewByNonAdmin_throwsForbidden` |
| ED02 | MCQ goes through 3 full reject/resubmit cycles → version history v4, v5 correct | ✅ `McqServiceTest` versioning tests |
| ED03 | Admin edits UNDER_REVIEW MCQ content → status stays UNDER_REVIEW | ✅ `McqServiceTest` admin edit tests |
| ED04 | Add duplicate tech stack name → conflict error | ✅ `MasterDataServiceTest.addTechStack_duplicate_throws` |
| ED05 | Add duplicate topic under same stack → error | ✅ `MasterDataServiceTest.addTopic_duplicate_throws` |
| ED06 | Delete tech stack with linked MCQs → backend returns error | ✅ `MasterDataServiceTest.deleteTechStack_withMcqs_throws` |
| ED07 | SME with no tech stack mapped → eligible reviewers dropdown shows nothing | ✅ `AdminServiceTest.getEligibleReviewers_noMapping` |
| ED08 | Two admins assign reviewer to same MCQ simultaneously → second gets conflict | ✅ `AdminServiceTest` concurrent assignment |
| ED09 | Quiz created with 0 approved questions → error before session created | ✅ `QuizSessionControllerIntegrationTest` |
| ED10 | Pagination — navigate to last page with 1 item → no crash | ✅ `pages2` MyQuestions pagination + `pages2` QuestionBank |
| ED11 | Combined filters (status + tech stack + search keyword) → correct results | ✅ `pages20` QuestionBank filter + sort |
| ED12 | Sort column ascending → descending → data order correct | ✅ `pages10` MyQuestions sort + `pages20` QuestionBank sort |
| ED13 | Dark mode persists after page refresh | ✅ `pages12` App.js theme effect + localStorage |
| ED14 | Sidebar collapsed state persists after refresh | 🖐 Manual (localStorage visual check) |
| ED15 | Switch to Hindi → submit form → validation errors appear in Hindi | ✅ `pages11` i18n + translateContent |
| ED16 | Urdu (RTL) layout — form labels and sidebar flip correctly | 🖐 Manual (RTL visual check) |

---

### 🌐 i18n & Translation (6 scenarios)

| # | Scenario | Auto |
|---|---|---|
| I01 | Switch language then submit form — validation errors in new language | ✅ `pages11` useContentTranslation hook |
| I02 | Dynamic content translation — MCQ stems translated via Lingva API | ✅ `pages11` translateContent — translateText |
| I03 | Lingva API fails → falls back to MyMemory API silently | ✅ `pages11` translateContent fallback tests |
| I04 | Both APIs fail → original English text remains (no broken UI) | ✅ `pages11` translateContent double-fail fallback |
| I05 | Urdu RTL — entire layout mirrors right-to-left | 🖐 Manual (RTL visual check) |
| I06 | German translation — all UI strings correctly translated | 🖐 Manual (visual check) |

---

### 🌐 Network & Performance (5 scenarios)

| # | Scenario | Auto |
|---|---|---|
| NW01 | Backend goes down mid-session → API error toasts shown, no white screen crash | ✅ `pages21` error paths (AI copilot catch, submit review catch) |
| NW02 | Slow network → loading spinners visible on every page | ✅ `pages2` loading state tests + `pages3` loading states |
| NW03 | AI service unavailable → app works without AI (graceful degradation) | ✅ `AIServiceTest` + `pages17` McqForm AI error paths |
| NW04 | Token expires mid-form fill → on Save, redirected gracefully | ✅ `pages16` api.js 401 interceptor |
| NW05 | Notification bell count updates without full page refresh | ✅ `NotificationControllerIntegrationTest` + `pages12` NotificationBell |

---

**Total: 242 test scenarios across 30 feature areas**
**Automated: 239 / 242 (99%) | Manual UI verification only: 3 (RTL layout, sidebar collapse, mobile visual)**

---

## ✅ Automated Test Coverage

### Backend — JUnit 5 + Spring Boot Test + Mockito

| Metric | Result |
|---|---|
| **Total Tests** | **1,072 tests** |
| **Failures** | 0 |
| **JaCoCo Instruction Coverage** | **92.5%** |
| **JaCoCo Branch Coverage** | 75.3% |
| **Test Types** | Unit tests (Mockito), Integration tests (`@SpringBootTest` + H2) |
| **Test Database** | H2 in-memory (MySQL-compatibility mode) — no real DB required to run tests |

**Run backend tests:**
```bash
cd backend
mvn verify
# Coverage report: target/site/jacoco/index.html
```

### Frontend — Jest + React Testing Library

| Metric | Result |
|---|---|
| **Total Tests** | **957 tests** |
| **Test Suites** | 24 suites |
| **Failures** | 0 |
| **Statement Coverage** | **80.37%** (3,281 / 4,082 statements) |
| **Test Types** | Component rendering, user interaction, API mocking, edge cases |

**Run frontend tests:**
```bash
cd frontend
npm test -- --watchAll=false --coverage
# Coverage report: coverage/lcov-report/index.html
```

---

## 📁 Project Structure

```
hack-n-stack/
├── backend/                    # Spring Boot application
│   ├── src/main/java/
│   │   └── com/accenture/quizhub/
│   │       ├── config/         # App configuration
│   │       │   ├── CacheConfig.java          # Redis ↔ Caffeine auto-fallback
│   │       │   ├── CacheHealthIndicator.java # /actuator/health cacheSystem component
│   │       │   ├── QuizHubMetrics.java       # 25 Prometheus business metrics
│   │       │   ├── RequestCorrelationFilter.java # X-Request-Id MDC tracing
│   │       │   └── SecurityConfig.java       # JWT + Spring Security
│   │       ├── controller/     # REST endpoints
│   │       ├── service/        # Business logic
│   │       ├── entity/         # JPA entities
│   │       ├── repository/     # Spring Data repositories
│   │       ├── dto/            # Request/Response DTOs
│   │       └── enums/          # McqStatus, Role, etc.
│   └── src/main/resources/
│       ├── application.yml     # Configuration (Actuator, Prometheus, Redis, SLOs)
│       ├── logback-spring.xml  # Structured JSON logging (prod) / coloured (local)
│       └── data.sql            # Seed data
├── frontend/                   # React application
│   └── src/
│       ├── pages/              # All page components
│       ├── components/         # Reusable components
│       ├── locales/            # i18n JSON files (7 languages)
│       ├── hooks/              # Custom React hooks
│       ├── utils/              # Helper utilities
│       └── AuthContext.js      # Auth state management
├── observability/              # Prometheus + Grafana config
│   ├── prometheus.yml          # Scrape config (quizhub-backend + self)
│   └── grafana/
│       ├── provisioning/
│       │   ├── datasources/prometheus.yml  # Auto-wires Prometheus
│       │   └── dashboards/dashboards.yml   # Dashboard loader
│       └── dashboards/
│           └── quizhub-business.json       # Custom business metrics dashboard
├── docker-compose.observability.yml  # One-command: Prometheus + Grafana
├── mcp-server/                 # Spring AI MCP server (optional)
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
| POST | `/api/v1/auth/forgot-password` | Request password reset email |
| POST | `/api/v1/auth/reset-password` | Reset password with token |
| GET | `/api/v1/quiz-sessions` | List all quiz sessions (admin) |
| GET | `/api/v1/quiz-sessions/{id}/attempts` | Get all attempts for a session |
| GET | `/api/v1/stats/reviewer` | Reviewer performance stats |
| GET | `/api/v1/chat/messages` | Get chat messages |
| POST | `/api/v1/chat/messages` | Post a chat message |
| GET | `/swagger-ui/index.html` | Swagger API docs (full endpoint reference) |
| GET | `/actuator/health` | Health check — DB + Redis + Cache status |
| GET | `/actuator/prometheus` | All metrics in Prometheus text format |
| GET | `/actuator/metrics` | Metric names catalog |
| GET | `/actuator/caches` | Live cache stats |
| GET | `/actuator/loggers` | View all logger names and levels; POST to change level at runtime |
| GET | `/actuator/env` | Active configuration values and property sources |

---

## 🎯 Seed Data

The following is auto-seeded via `data.sql`:

**Tech Stacks:** Core Java, Spring Boot, Spring MVC & REST, Spring ORM & Data JPA, Spring Core, Spring Cloud

**Topics per stack:** 6–7 topics each (e.g., Spring Cloud: Service Discovery, API Gateway, Circuit Breaker, Config Server, Load Balancing, Distributed Tracing, Spring Cloud Bus)

**Users:** 2 Admins (divya.madhanasekar, gaurav.a.bhola) + 3 SMEs pre-seeded with tech stack mappings

---

*Built with ❤️ for Accenture Hack-N-Stack 2026*

---

## 🔒 Security

- All secrets (JWT, OpenAI key) externalized via environment variables; `application.yml` contains a **dev-only fallback** JWT secret — always set `JWT_SECRET` env var in any non-local environment
- Passwords BCrypt-hashed (BCryptPasswordEncoder) — never stored in plain text
- JWT token validated on every protected API endpoint via `JwtAuthFilter`
- Role-based access control — ADMIN and SME endpoints fully separated via `@PreAuthorize`
- Input validation at both frontend (React form validation) and backend (`@Valid` + Spring Validation)
- XSS safe — all user content rendered as plain text, never as HTML (`QuestionStemRenderer` component)
- `X-Request-Id` response header on every request for distributed tracing; `X-Powered-By: QuizHub-AI` for request identification
- Sensitive actuator endpoints (`/actuator/loggers`, `/actuator/env`) require authentication; public read-only monitoring endpoints (`/actuator/health`, `/actuator/prometheus`, `/actuator/metrics`, `/actuator/caches`) intentionally open for Prometheus scraping
- Optimistic locking (`@Version`) on MCQ entity prevents lost updates on concurrent edits
- **Login rate limiting** — `LoginRateLimitFilter`: max 10 attempts per IP per 60-second window, returns HTTP 429 with seconds-remaining; honours `X-Forwarded-For` for proxy setups
- **Global exception handler** (`@RestControllerAdvice`) — consistent JSON error format, no stack traces leaked to client
- Password reset tokens are DB-stored, single-use, expiry-enforced, auto-deleted after use
- CORS restricted to `http://localhost:3000` only
- Violation screenshot (base64 png) captured on 1st quiz cheating attempt and stored with submission

---

## 💡 Key Design Decisions

- **Graceful AI degradation** — App works fully without an OpenAI API key; all AI features show a friendly "unavailable" message; `isApiKeyConfigured()` check before every AI call
- **3-level translation fallback** — Lingva API (6s timeout) → MyMemory API → original English text silent fallback; **in-memory `Map` cache** means each unique string is only ever translated once per session
- **Proctored quiz engine** — `visibilitychange` + `fullscreenchange` event listeners; `useRef` for violation count (avoids stale closure); `html2canvas` screenshot on 1st violation stored in `screenshotRef` and submitted with results; `sessionStorage` ExamLockGuard blocks 2nd tab
- **Login rate limiting in-process** — `ConcurrentHashMap<IP, Bucket>` with `AtomicInteger` counters; no Redis needed for single-instance demo; swap comment in code documents the path to Redis for production
- **Spring Cache for master data** — tech stacks and topics are read far more than written; `@Cacheable` eliminates DB hits on every MCQ form load; `@CacheEvict` keeps cache consistent on admin mutations
- **Centralised metrics registry (`QuizHubMetrics`)** — all 25 counters/gauges/timers declared in one `@Component`; pre-registered at startup so they appear in `/actuator/prometheus` at value `0.0` even before first event — avoids gaps in Grafana graphs
- **Profile-aware structured logging** — `logback-spring.xml` routes to plain colour output in `local` profile and full JSON (Logstash encoder) in `prod`; same codebase, zero config change for deployment to any log aggregator
- **Request tracing with MDC** — `RequestCorrelationFilter` runs at `HIGHEST_PRECEDENCE`; injects `requestId` before the chain, then enriches MDC post-chain with `userId`/`userRole` from `SecurityContextHolder`; all three keys appear in every log line for that request
- **Axios interceptors** — request interceptor auto-attaches JWT so no component ever manually sets auth headers; response interceptor catches 401 and triggers logout + redirect
- **Inbox auto-draft** — `useRef` debounce timer (1.5s), `localStorage` key `qh_inbox_draft`; survives page refresh, browser back, accidental close
- **ChatBot context window** — last 8 non-deleted messages fetched and passed as conversation history to GPT-4o-mini; gives coherent multi-turn answers without full chat history cost
- **`@Transactional` service layer** — all create/update/delete operations wrapped; any mid-operation failure rolls back the entire DB transaction
- **Spec-exact seed data** — Tech stack IDs (1001–1006) and topic IDs match the problem statement exactly
- **Stateless JWT auth** — No server-side sessions; tokens carry role + enterprise ID for instant access control decisions at every layer

---

## 📝 Assumptions

- MySQL 8.x running locally on port 3306
- `quizhub` database created before first run
- MySQL password in `application.yml` matches your local MySQL root password
- Node.js 18+ installed for frontend
- Java 17+ and Maven 3.8+ installed for backend
- Redis 7+ optional but recommended for distributed caching — app falls back to Caffeine (in-process) automatically if Redis is unavailable
- Docker Desktop or Colima installed to run the Prometheus + Grafana observability stack (Step 9 in How to Run)
- OpenAI API key is optional — all non-AI features work without it
- Email notifications require valid SMTP credentials (Gmail or Accenture SMTP)
- Modern browser (Chrome, Firefox, Edge, Safari)

---

## 🌐 Live Demo

**Frontend:** http://localhost:3000  
**Backend API:** http://localhost:8080  
**Swagger UI:** http://localhost:8080/swagger-ui/index.html  
**Health Check:** http://localhost:8080/actuator/health  
**Prometheus Metrics:** http://localhost:8080/actuator/prometheus  
**Grafana Dashboards:** http://localhost:3001 *(admin / quizhub — requires Docker)*  
**Prometheus UI:** http://localhost:9090 *(requires Docker)*  
**Redis Commander:** http://localhost:8081 *(requires `npm install -g redis-commander && redis-commander --port 8081`)*

---

*Built with ❤️ for Accenture Hack-N-Stack: Code the Future — Java Full Stack with AI | May 2026*
