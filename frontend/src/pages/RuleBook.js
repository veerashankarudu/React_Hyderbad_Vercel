import React, { useState, useEffect, useRef } from 'react';
import {
  PenLine, Send, Search, CheckCircle2, RotateCcw, UserRound, ClipboardCheck,
  Scale, RefreshCw, Library, Code2, Shield, Brain, FileText, Lock,
  Bot, Target, SlidersHorizontal, Link2, BarChart3, Zap, RefreshCcw, Users,
  Keyboard, Server, Activity, Gauge, Cpu, Wrench, Plug, Database, AlertTriangle,
  Layers, Upload, Play, Trophy
} from 'lucide-react';
import Navbar from '../components/Navbar';
import './RuleBook.css';

/* ── Animated counter hook ── */
function useCountUp(target, duration = 1200) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    ref.current = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(ref.current); }
      else setCount(start);
    }, 16);
    return () => clearInterval(ref.current);
  }, [target, duration]);
  return count;
}

/* ── Intersection observer for scroll-in animations ── */
function AnimateIn({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    if (el) obs.observe(el);
    return () => { if (el) obs.unobserve(el); };
  }, []);
  return (
    <div ref={ref} className={`rb-animate ${visible ? 'rb-visible' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ── Floating particles background ── */
function ParticlesBg() {
  return (
    <div className="rb-particles">
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} className="rb-particle" style={{
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 8}s`,
          animationDuration: `${6 + Math.random() * 8}s`,
          width: `${4 + Math.random() * 8}px`,
          height: `${4 + Math.random() * 8}px`,
          opacity: 0.12 + Math.random() * 0.2,
        }} />
      ))}
    </div>
  );
}

const LIFECYCLE = [
  { stage: 'DRAFT', color: '#6B7280', gradient: 'linear-gradient(135deg, #6B7280, #9CA3AF)', icon: <PenLine size={18} />, desc: 'Question being created. Only author can see & edit.' },
  { stage: 'READY FOR REVIEW', color: '#A100FF', gradient: 'linear-gradient(135deg, #A100FF, #C77DFF)', icon: <Send size={18} />, desc: 'Submitted for review. Admin assigns a reviewer.' },
  { stage: 'UNDER REVIEW', color: '#D97706', gradient: 'linear-gradient(135deg, #D97706, #FBBF24)', icon: <Search size={18} />, desc: 'Reviewer evaluating. Can approve, reject, or comment.' },
  { stage: 'APPROVED', color: '#059669', gradient: 'linear-gradient(135deg, #059669, #34D399)', icon: <CheckCircle2 size={18} />, desc: 'Passed review! Enters Question Bank for quizzes.' },
  { stage: 'REJECTED', color: '#DC2626', gradient: 'linear-gradient(135deg, #DC2626, #F87171)', icon: <RotateCcw size={18} />, desc: 'Needs revision. Author gets feedback & resubmits.' },
];

const REVIEW_STEPS = [
  { icon: <PenLine size={16} />, title: 'Create', text: 'SME writes question and clicks "Save & Send for Review"' },
  { icon: <Search size={16} />, title: 'Dup Check', text: 'System checks duplicates. ≥30% match → BLOCKED' },
  { icon: <Send size={16} />, title: 'Submit', text: 'Clean question → READY_FOR_REVIEW status' },
  { icon: <UserRound size={16} />, title: 'Assign', text: 'Admin assigns reviewer (same tech stack, not creator)' },
  { icon: <ClipboardCheck size={16} />, title: 'Review', text: 'Reviewer evaluates → UNDER_REVIEW status' },
  { icon: <Scale size={16} />, title: 'Decide', text: 'Approve, Reject, or Comment' },
  { icon: <RefreshCw size={16} />, title: 'Revise', text: 'If rejected → SME edits and resubmits' },
  { icon: <Library size={16} />, title: 'Bank', text: 'If approved → enters Question Bank for quizzes' },
];

const ROLES = [
  {
    role: 'SME', fullName: 'Subject Matter Expert', icon: <Code2 size={20} />, color: '#A100FF',
    perms: ['Create/edit/delete own MCQs', 'Submit for review', 'Bulk upload (CSV/Excel)', 'AI-generate questions', 'View stats & leaderboard', 'Take quizzes', 'Live Quiz battles'],
  },
  {
    role: 'Admin', fullName: 'Administrator', icon: <Shield size={20} />, color: '#B84DFF',
    perms: ['All SME permissions +', 'Assign reviewers', 'Manage Question Bank', 'Manage Tech Stacks & Topics', 'Manage users', 'View all analytics & audit logs', 'Build & publish assessments'],
  },
];

const AI_FEATURES = [
  { icon: <Brain size={18} />, title: 'Smart Generation', desc: 'Generates MCQs from Tech Stack + Topic + Difficulty using local Ollama LLM' },
  { icon: <Shield size={18} />, title: 'Auto Dup-Screen', desc: 'Each generated question auto-checked for ≥30% similarity & replaced (up to 3 retries)' },
  { icon: <FileText size={18} />, title: 'Draft First', desc: 'All AI questions saved as DRAFT — human review still required before approval' },
  { icon: <Lock size={18} />, title: 'Privacy First', desc: 'Uses local Ollama model — no data leaves your machine. Zero cloud dependency' },
  { icon: <RefreshCcw size={18} />, title: 'Regenerate', desc: 'Unhappy? Regenerate individual questions or the entire batch instantly' },
  { icon: <Bot size={18} />, title: 'AI Check', desc: 'Manual duplicate scan anytime via the AI button on the edit form' },
];

const ALL_SHORTCUTS = [
  {
    section: '🌐 Global — always active',
    color: '#A100FF',
    rows: [
      { keys: ['?'], desc: 'Show / hide this shortcuts overlay' },
      { keys: ['Esc'], desc: 'Close any modal or panel' },
      { keys: ['Ctrl', 'K'], desc: 'Focus search on current page' },
      { keys: ['Ctrl', 'N'], desc: 'Create a new question' },
      { keys: ['Ctrl', 'D'], desc: 'Go to Dashboard' },
      { keys: ['Ctrl', 'H'], desc: 'Open Rule Book (help)' },
      { keys: ['Ctrl', 'B'], desc: 'Go to Bulk Upload' },
      { keys: ['Ctrl', 'Shift', 'A'], desc: 'Open AI Studio' },
      { keys: ['Ctrl', 'Shift', 'D'], desc: 'Toggle dark / light mode' },
      { keys: ['Ctrl', '/'], desc: 'Toggle sidebar' },
      { keys: ['Alt', 'T'], desc: 'Toggle notifications panel' },
    ],
  },
  {
    section: '🧭 Navigation — press G then a letter',
    color: '#059669',
    rows: [
      { keys: ['G', 'D'], desc: 'Dashboard' },
      { keys: ['G', 'Q'], desc: 'My Questions' },
      { keys: ['G', 'K'], desc: 'Kanban Board' },
      { keys: ['G', 'R'], desc: 'Pending Reviews' },
      { keys: ['G', 'A'], desc: 'Analytics' },
      { keys: ['G', 'L'], desc: 'Leaderboard' },
      { keys: ['G', 'B'], desc: 'Question Bank' },
      { keys: ['G', 'I'], desc: 'Inbox' },
      { keys: ['G', 'U'], desc: 'Bulk Upload' },
      { keys: ['G', 'S'], desc: 'Settings' },
    ],
  },
  {
    section: '📝 My Questions page',
    color: '#D97706',
    rows: [
      { keys: ['N'], desc: 'New question' },
      { keys: ['F'], desc: 'Focus search / filter bar' },
      { keys: ['J'], desc: 'Next question in list' },
      { keys: ['K'], desc: 'Previous question in list' },
    ],
  },
  {
    section: '✅ Pending Reviews page',
    color: '#DC2626',
    rows: [
      { keys: ['A'], desc: 'Approve selected' },
      { keys: ['R'], desc: 'Reject selected' },
      { keys: ['J'], desc: 'Next item' },
      { keys: ['K'], desc: 'Previous item' },
    ],
  },
  {
    section: '🗂️ Kanban Board page',
    color: '#0EA5E9',
    rows: [
      { keys: ['←'], desc: 'Move card left' },
      { keys: ['→'], desc: 'Move card right' },
      { keys: ['F'], desc: 'Filter cards' },
    ],
  },
  {
    section: '🏦 Question Bank page',
    color: '#7C3AED',
    rows: [
      { keys: ['F'], desc: 'Focus search' },
      { keys: ['E'], desc: 'Export questions' },
      { keys: ['B'], desc: 'Go to Bulk Upload' },
    ],
  },
  {
    section: '📊 Analytics page',
    color: '#0891B2',
    rows: [
      { keys: ['1'], desc: 'Overview tab' },
      { keys: ['2'], desc: 'Trends tab' },
      { keys: ['3'], desc: 'Breakdown tab' },
    ],
  },
  {
    section: '⚡ Live Quiz page',
    color: '#16A34A',
    rows: [
      { keys: ['S'], desc: 'Start new session' },
      { keys: ['J'], desc: 'Join session' },
    ],
  },
  {
    section: '🤖 AI Studio page',
    color: '#9333EA',
    rows: [
      { keys: ['Ctrl', 'Enter'], desc: 'Send message' },
      { keys: ['C'], desc: 'Clear chat history' },
      { keys: ['G'], desc: 'Generate new MCQ' },
    ],
  },
  {
    section: '📖 Rule Book page',
    color: '#B84DFF',
    rows: [
      { keys: ['1'], desc: 'Lifecycle tab' },
      { keys: ['2'], desc: 'Roles tab' },
      { keys: ['3'], desc: 'Duplicate tab' },
      { keys: ['4'], desc: 'AI Rules tab' },
      { keys: ['5'], desc: 'Workflow tab' },
      { keys: ['6'], desc: 'Quizzes tab' },
      { keys: ['7'], desc: 'Infra tab' },
      { keys: ['8'], desc: 'MCP Tools tab' },
      { keys: ['9'], desc: 'Security tab' },
      { keys: ['0'], desc: 'Shortcuts tab' },
    ],
  },
];

const INFRA_SERVICES = [
  {
    name: 'Prometheus',
    color: '#E6522C',
    gradient: 'linear-gradient(135deg, #E6522C, #FF7F50)',
    icon: <Activity size={20} />,
    port: '9090',
    url: 'http://localhost:9090',
    badge: 'Metrics Store',
    facts: [
      'Scrapes /actuator/prometheus every 10 seconds',
      '29 custom QuizHub business metrics tracked',
      'Metrics: MCQ counts, review rates, AI calls, live quiz activity',
      'Labels: tech_stack, difficulty, status, user_role',
      'Retention: 15 days (default)',
      'Targets page: http://localhost:9090/targets',
    ],
  },
  {
    name: 'Grafana',
    color: '#F46800',
    gradient: 'linear-gradient(135deg, #F46800, #FFAA44)',
    icon: <BarChart3 size={20} />,
    port: '3001',
    url: 'http://localhost:3001',
    badge: 'Dashboard',
    facts: [
      'Login: admin / quizhub',
      'Pre-provisioned Business Metrics dashboard (17 panels)',
      'Panels: MCQ pipeline, approval rate, AI usage, live quiz stats',
      'Datasource auto-wired to Prometheus on startup',
      'Dashboard JSON at observability/dashboards/quizhub-business.json',
      'Started via: docker-compose -f docker-compose.observability.yml up -d',
    ],
  },
  {
    name: 'Redis',
    color: '#DC382C',
    gradient: 'linear-gradient(135deg, #DC382C, #FF6B6B)',
    icon: <Database size={20} />,
    port: '6379',
    url: 'redis://localhost:6379',
    badge: 'Cache + Blacklist',
    facts: [
      'Rate limiter: sliding window counter per IP per endpoint',
      'Login: 100 req/60s | Join: 10/60s | Validate: 20/60s',
      'AI endpoints: 60 req/60s | MCQ writes: 60 req/60s',
      'JWT token blacklist: logout writes token hash, auth filter checks it',
      'Fallback: in-memory ConcurrentHashMap when Redis is unavailable',
      'Start: brew services start redis (or included in start.sh)',
    ],
  },
];

const MCP_TOOLS = [
  {
    num: 1, name: 'searchQuestions',
    desc: 'Search MCQs by keyword, tech stack, or status. Returns ID, stem, difficulty, status.',
    params: ['keyword', 'techStack?', 'status?'],
    color: '#A100FF',
  },
  {
    num: 2, name: 'checkDuplicate',
    desc: 'Check if a question already exists. Returns similar Qs with similarity %. Use before creating.',
    params: ['questionStem', 'techStackId?'],
    color: '#059669',
  },
  {
    num: 3, name: 'getTechStacks',
    desc: 'Get all tech stacks with IDs and topic counts. Use to find the correct techStackId.',
    params: [],
    color: '#0EA5E9',
  },
  {
    num: 4, name: 'getDashboardStats',
    desc: 'Get live dashboard stats: total MCQs, approved count, pending reviews, per-stack breakdown.',
    params: [],
    color: '#D97706',
  },
  {
    num: 5, name: 'createMcq',
    desc: 'Create a new MCQ. AI validates inputs before save.',
    params: ['questionStem', 'optionA-D', 'correctAnswer', 'difficulty', 'techStackId', 'topicId'],
    color: '#DC2626',
  },
  {
    num: 6, name: 'getMcqById',
    desc: 'Get full MCQ detail by ID: question, options, correct answer, review history.',
    params: ['mcqId'],
    color: '#7C3AED',
  },
  {
    num: 7, name: 'generateQuestions',
    desc: 'Use AI to generate MCQ questions for a topic + difficulty. Returns draft questions to review.',
    params: ['topic', 'difficulty', 'count (1-10)'],
    color: '#0891B2',
  },
  {
    num: 8, name: 'checkQuality',
    desc: 'Score an MCQ 0-100: clarity, distractor quality, technical accuracy, difficulty fit.',
    params: ['questionStem', 'optionA-D', 'correctAnswer', 'difficulty'],
    color: '#16A34A',
  },
];

const SECURITY_FEATURES = [
  {
    icon: <Shield size={20} />,
    title: 'HTTP Security Headers',
    color: '#7C3AED',
    items: [
      'Content-Security-Policy — blocks inline scripts & unsafe eval',
      'HSTS — forces HTTPS for 1 year including subdomains',
      'X-Frame-Options: DENY — prevents clickjacking iframes',
      'Referrer-Policy: strict-origin-when-cross-origin',
      'Permissions-Policy — disables camera, mic, geolocation, payment',
    ],
  },
  {
    icon: <Gauge size={20} />,
    title: 'Redis Rate Limiting',
    color: '#DC2626',
    items: [
      'Sliding window counter: Redis INCR + EXPIRE per IP per route',
      'Login: 100 req / 60s — brute-force protection',
      'Live Join: 10 req / 60s — flood protection',
      'AI endpoints: 60 req / 60s — cost control',
      'Fallback to in-memory bucket when Redis unavailable',
      '429 Too Many Requests with Retry-After header',
    ],
  },
  {
    icon: <Lock size={20} />,
    title: 'JWT Blacklist (Logout)',
    color: '#D97706',
    items: [
      'POST /api/v1/auth/logout extracts token from Authorization header',
      'Token hash stored in Redis with TTL = remaining token lifetime',
      'Every request: JwtAuthFilter checks blacklist before trusting token',
      'Prevents token reuse after logout — true stateless invalidation',
      '@PostConstruct validates JWT secret on startup — fails fast if missing',
    ],
  },
  {
    icon: <AlertTriangle size={20} />,
    title: 'AI Input Sanitizer',
    color: '#059669',
    items: [
      'Strips PII before sending to LLM: email, phone, SSN, credit card, IP',
      'Prompt injection detection: blocks "ignore previous", "jailbreak", "DAN", etc.',
      'Applied to: chatReply, chatReplyWithHistory, streamChat, toolChat',
      'Returns 400 Bad Request if injection pattern is detected',
      'Zero cloud exposure — Ollama LLM runs fully local',
    ],
  },
  {
    icon: <Activity size={20} />,
    title: 'CI/CD Pipeline',
    color: '#0EA5E9',
    items: [
      'GitHub Actions: triggers on push/PR to main & develop branches',
      'Jobs: backend-test (Java 17 + MySQL) → frontend-test (Node 20)',
      'OWASP dependency-check security scan on every build',
      'Docker build validation for both backend and frontend images',
      'Backend uses H2 in-memory DB for tests — zero external deps',
    ],
  },
  {
    icon: <Server size={20} />,
    title: 'Production Profile',
    color: '#B84DFF',
    items: [
      'application-prod.yml: ddl-auto=validate, Flyway enabled',
      'Restricted actuator: only /health and /prometheus exposed',
      'Log level WARN — no DEBUG in production',
      'No JWT secret default — must be set via environment variable',
      'Graceful shutdown: 30s drain before process exits',
    ],
  },
];

const QUIZ_RULES = [
  { icon: <CheckCircle2 size={18} />, title: 'Approved Only', desc: 'Only APPROVED questions can be used in quizzes' },
  { icon: <SlidersHorizontal size={18} />, title: 'Quiz Builder', desc: 'Set title, time limit, passing score, question count' },
  { icon: <Link2 size={18} />, title: 'Unique Links', desc: 'Each assessment gets a unique token/link to share' },
  { icon: <Shield size={18} />, title: 'Anti-Cheat', desc: 'Timer, chatbot hidden, navigation locked during exam' },
  { icon: <BarChart3 size={18} />, title: 'Auto-Grading', desc: 'Instant results: score, time, per-question breakdown' },
  { icon: <Zap size={18} />, title: 'Live Mode', desc: 'Real-time multiplayer battles with live leaderboard' },
];

const QUESTION_TYPES_DATA = [
  { id: 'SINGLE_MCQ', icon: '🔘', title: 'Single Choice MCQ', badge: 'Classic', color: '#A100FF', desc: 'Standard multiple-choice with exactly one correct answer. The most common question type.' },
  { id: 'MULTI_MCQ', icon: '☑️', title: 'Multiple Choice', badge: 'Multi', color: '#059669', desc: 'Select ALL correct answers from multiple options. Partial credit supported.' },
  { id: 'DRAG_ORDER', icon: '↕️', title: 'Drag & Drop Ordering', badge: 'Interactive', color: '#0EA5E9', desc: 'Arrange items in correct sequential order by dragging. Tests knowledge of lifecycle/steps.' },
  { id: 'MATCH_PAIRS', icon: '🔗', title: 'Match Concept to Definition', badge: 'Matching', color: '#D97706', desc: 'Connect concepts to their definitions by drawing lines. Great for terminology.' },
  { id: 'CODE_OUTPUT', icon: '➡️', title: 'Match Code to Output', badge: 'Matching', color: '#7C3AED', desc: 'Match code snippets to their corresponding outputs. Tests code reading skills.' },
  { id: 'FILL_BLANK', icon: '✏️', title: 'Fill in the Blank', badge: 'Input', color: '#DC2626', desc: 'Complete code by filling missing keywords or identifiers. Tests precise syntax recall.' },
  { id: 'PREDICT_OUTPUT', icon: '🔮', title: 'Predict Program Output', badge: 'Tracing', color: '#0891B2', desc: 'Read code and predict exactly what the console will output. Deep logic tracing.' },
  { id: 'DEBUG_CODE', icon: '🐛', title: 'Debug the Code', badge: 'Fix', color: '#16A34A', desc: 'Identify bugs and runtime errors in given code. Tests debugging mindset.' },
  { id: 'CODE_REARRANGE', icon: '🧩', title: 'Code Rearrangement', badge: 'Puzzle', color: '#B84DFF', desc: 'Rearrange shuffled code blocks into a valid program. Tests structural understanding.' },
  { id: 'SQL_BUILDER', icon: '🗃️', title: 'Interactive SQL Builder', badge: 'Builder', color: '#E6522C', desc: 'Drag SQL clauses to construct valid queries. Tests database query construction skills.' },
  { id: 'ARCH_LAYERS', icon: '🏗️', title: 'Architecture Layers', badge: 'Design', color: '#4F46E5', desc: 'Drag components into correct architecture layers (Controller/Service/Repo). System design.' },
  { id: 'CODE_REVIEW', icon: '👁️', title: 'Code Review Challenge', badge: 'Review', color: '#9333EA', desc: 'Identify security and performance issues in PR-style code. OWASP awareness.' },
  { id: 'PIPELINE_BUILD', icon: '🔧', title: 'Stream Pipeline Builder', badge: 'Builder', color: '#0F766E', desc: 'Build a Java Stream pipeline from available operators. Functional programming mastery.' },
  { id: 'FLOWCHART', icon: '📊', title: 'Flowchart Question', badge: 'Visual', color: '#0369A1', desc: 'Answer questions based on flowchart/algorithm diagrams. Visual logic reasoning.' },
  { id: 'DEVOPS_PIPE', icon: '🚀', title: 'DevOps Pipeline', badge: 'CI/CD', color: '#0891B2', desc: 'Arrange CI/CD pipeline stages in the correct order. DevOps process knowledge.' },
  { id: 'SECURE_CODE', icon: '🛡️', title: 'Secure Coding', badge: 'Security', color: '#B45309', desc: 'Identify OWASP vulnerabilities and write secure fixes. Security-first mindset.' },
  { id: 'RIDDLE', icon: '🧩', title: 'Tech Riddles', badge: 'Fun', color: '#7C3AED', desc: 'Solve creative riddles about programming concepts. Engagement + lateral thinking.' },
  { id: 'CROSSWORD', icon: '✚', title: 'Crossword Puzzle', badge: 'Puzzle', color: '#6D28D9', desc: 'Fill the crossword grid with tech terms from clues. Vocabulary reinforcement.' },
];

const BULK_COLUMNS = [
  { num: 1, name: 'ID', req: false, desc: 'Question ID / sequence number — ignored by system, for your reference only', example: '1' },
  { num: 2, name: 'Tech Stack', req: true, desc: 'Must match an existing tech stack exactly (e.g. Spring Boot, Core Java). Click any name in the panel below to copy it.', example: 'Spring Boot' },
  { num: 3, name: 'Topic', req: false, desc: 'Topic name within the tech stack — optional, but helps with filtering', example: 'Dependency Injection' },
  { num: 4, name: 'Difficulty', req: true, desc: 'EASY, MEDIUM, or HARD — must be uppercase exactly as shown', example: 'MEDIUM' },
  { num: 5, name: 'Question Stem', req: true, desc: 'The MCQ question text — the actual question being asked', example: 'What is the purpose of @Autowired?' },
  { num: 6, name: 'Option A', req: true, desc: 'Text for option A', example: 'Dependency injection' },
  { num: 7, name: 'Option B', req: true, desc: 'Text for option B', example: 'Marks a bean as singleton' },
  { num: 8, name: 'Option C', req: true, desc: 'Text for option C', example: 'Enables AOP' },
  { num: 9, name: 'Option D', req: true, desc: 'Text for option D', example: 'Creates a new thread' },
  { num: 10, name: 'Correct Answer', req: true, desc: 'Letter of the correct option: A, B, C, or D — uppercase only', example: 'A' },
];

const LIVE_QUIZ_FLOW = [
  { icon: '🎯', step: 'Create Session', role: 'Host', color: '#A100FF', desc: 'Host opens Live Quiz page, selects an existing Quiz or Assessment, sets session name' },
  { icon: '🔑', step: 'Session Code', role: 'System', color: '#059669', desc: 'System generates a 6-character join code (e.g. SPRING) + opens WebSocket channel' },
  { icon: '👥', step: 'Join Lobby', role: 'Players', color: '#0EA5E9', desc: 'Players navigate to /live/join, enter session code — all see live lobby with player list' },
  { icon: '▶️', step: 'Start Battle', role: 'Host', color: '#D97706', desc: 'Host clicks Start — all connected players receive first question simultaneously via WebSocket' },
  { icon: '⚡', step: 'Answer & Score', role: 'Players', color: '#DC2626', desc: 'Per-question countdown timer. Correct answer + faster speed = more points (speed bonus)' },
  { icon: '📊', step: 'Live Board', role: 'All', color: '#7C3AED', desc: 'Leaderboard updates in real-time after each question. Position shifts visible live' },
  { icon: '🏆', step: 'Final Results', role: 'All', color: '#16A34A', desc: 'Session ends with full breakdown: final rank, score, per-question accuracy, time taken' },
];

const LEADERBOARD_MODES = [
  {
    mode: 'Reviewers',
    icon: '🏅',
    color: '#A100FF',
    desc: 'Ranks all reviewers by number of MCQs reviewed. Encourages fast, thorough review cycles. Resets never — cumulative all-time count.',
    badges: [
      { icon: '👑', label: 'Champion', rule: 'Rank #1' },
      { icon: '🔥', label: 'Hot Streak', rule: '≥10 reviews' },
      { icon: '⭐', label: 'Rising Star', rule: '≥5 reviews' },
      { icon: '💪', label: 'Contributor', rule: '≥3 reviews' },
    ],
  },
  {
    mode: 'Assessment',
    icon: '📝',
    color: '#059669',
    desc: 'Ranks candidates by score % on a specific exam. Filter by assessment name and tech stack. Exportable to CSV.',
    badges: [
      { icon: '👑', label: 'Topper', rule: 'Rank #1' },
      { icon: '🔥', label: 'Expert', rule: '≥90%' },
      { icon: '⭐', label: 'Proficient', rule: '≥75%' },
      { icon: '💪', label: 'Learner', rule: '≥50%' },
    ],
  },
  {
    mode: 'Live Quiz',
    icon: '⚡',
    color: '#D97706',
    desc: 'Ranks players within a specific live session by combined score (accuracy + speed bonus). Filter by session date.',
    badges: [
      { icon: '👑', label: 'Battle King', rule: 'Rank #1 in session' },
      { icon: '🔥', label: 'Speed Demon', rule: 'Fastest correct answer' },
      { icon: '⭐', label: 'Accurate', rule: '≥90% correct answers' },
      { icon: '💪', label: 'Fighter', rule: 'Completed full session' },
    ],
  },
];

export default function RuleBook() {
  const [activeTab, setActiveTab] = useState('lifecycle');
  const thresholdCount = useCountUp(30, 1500);

  const tabs = [
    { id: 'lifecycle', icon: <RefreshCw size={15} />, label: 'Lifecycle' },
    { id: 'roles', icon: <Users size={15} />, label: 'Roles' },
    { id: 'duplicate', icon: <Shield size={15} />, label: 'Duplicate' },
    { id: 'ai', icon: <Bot size={15} />, label: 'AI Rules' },
    { id: 'review', icon: <FileText size={15} />, label: 'Workflow' },
    { id: 'quiz', icon: <Target size={15} />, label: 'Quizzes' },
    { id: 'infra', icon: <Server size={15} />, label: 'Infra' },
    { id: 'mcp', icon: <Plug size={15} />, label: 'MCP Tools' },
    { id: 'security', icon: <Lock size={15} />, label: 'Security' },
    { id: 'shortcuts', icon: <Keyboard size={15} />, label: 'Shortcuts' },
    { id: 'question_types', icon: <Layers size={15} />, label: 'Q Types' },
    { id: 'bulk_upload', icon: <Upload size={15} />, label: 'Bulk Upload' },
    { id: 'live_quiz', icon: <Play size={15} />, label: 'Live Quiz' },
    { id: 'leaderboard', icon: <Trophy size={15} />, label: 'Leaderboard' },
  ];

  // Number key tab switching on the RuleBook page
  useEffect(() => {
    const tabIds = ['lifecycle', 'roles', 'duplicate', 'ai', 'review', 'quiz', 'infra', 'mcp', 'security', 'shortcuts'];
    const handler = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
      const raw = Number.parseInt(e.key, 10);
      // 1-9 → index 0-8, 0 → index 9 (shortcuts)
      const idx = e.key === '0' ? 9 : (raw >= 1 && raw <= 9 ? raw - 1 : -1);
      if (idx >= 0 && idx < tabIds.length) setActiveTab(tabIds[idx]);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        {/* Hero Banner */}
        <div className="rb-hero">
          <ParticlesBg />
          <div className="rb-hero-content">
            <h1 className="rb-title">
              <span className="rb-title-icon">📖</span>
              Rule Book
            </h1>
            <p className="rb-subtitle">Everything about how QuizHub AI works — animated & interactive</p>
            <div className="rb-hero-stats">
              <div className="rb-stat"><span className="rb-stat-num">5</span><span className="rb-stat-label">Stages</span></div>
              <div className="rb-stat"><span className="rb-stat-num">2</span><span className="rb-stat-label">Roles</span></div>
              <div className="rb-stat"><span className="rb-stat-num">18</span><span className="rb-stat-label">Q Types</span></div>
              <div className="rb-stat"><span className="rb-stat-num">30%</span><span className="rb-stat-label">Dup Threshold</span></div>
              <div className="rb-stat"><span className="rb-stat-num">8</span><span className="rb-stat-label">MCP Tools</span></div>
              <div className="rb-stat"><span className="rb-stat-num">29</span><span className="rb-stat-label">Metrics</span></div>
            </div>
          </div>
        </div>

        {/* Animated Tab Bar */}
        <div className="rb-tab-bar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`rb-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="rb-tab-icon">{tab.icon}</span>
              <span className="rb-tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Panels */}
        <div className="rb-panel" key={activeTab}>

          {/* ── LIFECYCLE ── */}
          {activeTab === 'lifecycle' && (
            <div className="rb-lifecycle-panel">
              <h2 className="rb-panel-title">MCQ Lifecycle — 5 Stage Pipeline</h2>
              <div className="rb-pipeline">
                {LIFECYCLE.map((s, i) => (
                  <AnimateIn key={s.stage} delay={i * 150}>
                    <div className="rb-pipe-node">
                      <div className="rb-pipe-icon" style={{ background: s.gradient }}>
                        <span>{s.icon}</span>
                      </div>
                      {i < LIFECYCLE.length - 1 && <div className="rb-pipe-connector"><div className="rb-pipe-connector-pulse" /></div>}
                      <div className="rb-pipe-card">
                        <div className="rb-pipe-badge" style={{ color: s.color, borderColor: s.color }}>{s.stage}</div>
                        <p>{s.desc}</p>
                      </div>
                    </div>
                  </AnimateIn>
                ))}
              </div>
            </div>
          )}

          {/* ── ROLES ── */}
          {activeTab === 'roles' && (
            <div className="rb-roles-panel">
              <h2 className="rb-panel-title">Roles & Permissions</h2>
              <div className="rb-roles-grid">
                {ROLES.map((r, i) => (
                  <AnimateIn key={r.role} delay={i * 200}>
                    <div className="rb-role-card-v2">
                      <div className="rb-role-header" style={{ background: `linear-gradient(135deg, ${r.color}, ${r.color}88)` }}>
                        <span className="rb-role-icon">{r.icon}</span>
                        <div>
                          <h3>{r.role}</h3>
                          <span>{r.fullName}</span>
                        </div>
                      </div>
                      <ul className="rb-role-perms">
                        {r.perms.map((p, j) => (
                          <li key={j}><span className="rb-check">✓</span> {p}</li>
                        ))}
                      </ul>
                    </div>
                  </AnimateIn>
                ))}
              </div>
            </div>
          )}

          {/* ── DUPLICATE ── */}
          {activeTab === 'duplicate' && (
            <div className="rb-dup-panel">
              <h2 className="rb-panel-title">Duplicate Detection — Hard Block</h2>
              <AnimateIn>
                <div className="rb-dup-hero">
                  <div className="rb-dup-meter">
                    <svg viewBox="0 0 120 120" className="rb-dup-ring">
                      <circle cx="60" cy="60" r="50" className="rb-dup-ring-bg" />
                      <circle cx="60" cy="60" r="50" className="rb-dup-ring-fill" style={{ strokeDashoffset: `${314 - (314 * thresholdCount / 100)}` }} />
                    </svg>
                    <div className="rb-dup-meter-text">
                      <span className="rb-dup-num">{thresholdCount}%</span>
                      <span className="rb-dup-label">Threshold</span>
                    </div>
                  </div>
                  <div className="rb-dup-explain">
                    <h3>Hard Block Rule</h3>
                    <p>If any existing question matches ≥ <strong>30%</strong> similarity, you <strong>cannot</strong> send for review. Fix it first!</p>
                    <div className="rb-dup-visual">
                      <div className="rb-dup-bar"><div className="rb-dup-bar-fill safe" style={{width:'25%'}} /><span>25% — Safe</span></div>
                      <div className="rb-dup-bar"><div className="rb-dup-bar-fill danger" style={{width:'45%'}} /><span>45% — Blocked</span></div>
                    </div>
                  </div>
                </div>
              </AnimateIn>
              <div className="rb-dup-rules">
                {[
                  'Every question checked against ALL existing questions in the database',
                  'Similarity ≥ 30% → flagged as potential duplicate',
                  '"Save & Send for Review" with duplicates → HARD BLOCKED',
                  'Save as Draft still works — must resolve before submitting',
                  'AI Check button for manual duplicate scan anytime',
                  'Shows similar Q#ID, percentage badge, and question stem',
                ].map((rule, i) => (
                  <AnimateIn key={i} delay={i * 100}>
                    <div className="rb-dup-rule">
                      <div className="rb-dup-rule-num">{i + 1}</div>
                      <p>{rule}</p>
                    </div>
                  </AnimateIn>
                ))}
              </div>
            </div>
          )}

          {/* ── AI ── */}
          {activeTab === 'ai' && (
            <div className="rb-ai-panel">
              <h2 className="rb-panel-title">AI Generation — How It Works</h2>
              <div className="rb-ai-grid">
                {AI_FEATURES.map((f, i) => (
                  <AnimateIn key={i} delay={i * 100}>
                    <div className="rb-ai-card">
                      <div className="rb-ai-card-glow" />
                      <div className="rb-ai-card-icon">{f.icon}</div>
                      <h4>{f.title}</h4>
                      <p>{f.desc}</p>
                    </div>
                  </AnimateIn>
                ))}
              </div>
            </div>
          )}

          {/* ── REVIEW WORKFLOW ── */}
          {activeTab === 'review' && (
            <div className="rb-review-panel">
              <h2 className="rb-panel-title">Review Workflow — 8 Steps</h2>
              <div className="rb-timeline">
                <div className="rb-tl-line" />
                {REVIEW_STEPS.map((s, i) => (
                  <AnimateIn key={i} delay={i * 120}>
                    <div className={`rb-tl-item ${i % 2 === 0 ? 'left' : 'right'}`}>
                      <div className="rb-tl-dot">{s.icon}</div>
                      <div className="rb-tl-card">
                        <h4>Step {i + 1}: {s.title}</h4>
                        <p>{s.text}</p>
                      </div>
                    </div>
                  </AnimateIn>
                ))}
              </div>
            </div>
          )}

          {/* ── QUIZ ── */}
          {activeTab === 'quiz' && (
            <div className="rb-quiz-panel">
              <h2 className="rb-panel-title">Quiz & Assessment Rules</h2>
              <div className="rb-quiz-grid">
                {QUIZ_RULES.map((item, i) => (
                  <AnimateIn key={i} delay={i * 100}>
                    <div className="rb-quiz-card">
                      <div className="rb-quiz-card-icon">{item.icon}</div>
                      <div>
                        <h4>{item.title}</h4>
                        <p>{item.desc}</p>
                      </div>
                    </div>
                  </AnimateIn>
                ))}
              </div>
            </div>
          )}
          {/* ── INFRA ── */}
          {activeTab === 'infra' && (
            <div className="rb-infra-panel">
              <h2 className="rb-panel-title">🖥️ Infrastructure — Prometheus · Grafana · Redis</h2>
              <p className="rb-infra-intro">Three always-on backing services that give QuizHub observability, caching, and rate-limiting without any code changes to your workflow.</p>
              <div className="rb-infra-grid">
                {INFRA_SERVICES.map((svc, i) => (
                  <AnimateIn key={svc.name} delay={i * 150}>
                    <div className="rb-infra-card">
                      <div className="rb-infra-card-header" style={{ background: svc.gradient }}>
                        <span className="rb-infra-icon">{svc.icon}</span>
                        <div className="rb-infra-title-block">
                          <h3>{svc.name}</h3>
                          <span className="rb-infra-badge">{svc.badge}</span>
                        </div>
                        <div className="rb-infra-port">:{svc.port}</div>
                      </div>
                      <ul className="rb-infra-facts">
                        {svc.facts.map((f, j) => (
                          <li key={`${svc.name}-${j}`}>
                            <span className="rb-infra-dot" style={{ background: svc.color }} />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <a className="rb-infra-link" href={svc.url} target="_blank" rel="noopener noreferrer">
                        Open {svc.name} →
                      </a>
                    </div>
                  </AnimateIn>
                ))}
              </div>
              <AnimateIn delay={500}>
                <div className="rb-infra-start-tip">
                  <Cpu size={16} />
                  <span>Start all infra in one command: <code>bash start.sh</code> — or run Docker Compose directly: <code>docker-compose -f docker-compose.observability.yml up -d</code></span>
                </div>
              </AnimateIn>
            </div>
          )}

          {/* ── MCP ── */}
          {activeTab === 'mcp' && (
            <div className="rb-mcp-panel">
              <h2 className="rb-panel-title">🔌 MCP Tools — Model Context Protocol</h2>
              <div className="rb-mcp-intro-row">
                <div className="rb-mcp-intro-card">
                  <Plug size={28} style={{ color: '#A100FF' }} />
                  <div>
                    <h4>What is MCP?</h4>
                    <p>Model Context Protocol lets AI assistants (Claude, GitHub Copilot, etc.) call live QuizHub APIs as tools. The MCP server runs at <strong>localhost:8085</strong> and exposes 8 callable tools.</p>
                  </div>
                </div>
                <div className="rb-mcp-intro-card">
                  <Wrench size={28} style={{ color: '#059669' }} />
                  <div>
                    <h4>How to use</h4>
                    <p>Connect any MCP-compatible client to <strong>http://localhost:8085/sse</strong>. The AI can then search, create, and evaluate questions without leaving the chat.</p>
                  </div>
                </div>
              </div>
              <div className="rb-mcp-tools-grid">
                {MCP_TOOLS.map((tool, i) => (
                  <AnimateIn key={tool.name} delay={i * 80}>
                    <div className="rb-mcp-tool-card">
                      <div className="rb-mcp-tool-num" style={{ background: tool.color }}>{tool.num}</div>
                      <div className="rb-mcp-tool-body">
                        <code className="rb-mcp-tool-name" style={{ color: tool.color }}>{tool.name}()</code>
                        <p className="rb-mcp-tool-desc">{tool.desc}</p>
                        {tool.params.length > 0 && (
                          <div className="rb-mcp-tool-params">
                            {tool.params.map(p => (
                              <span key={p} className="rb-mcp-param">{p}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </AnimateIn>
                ))}
              </div>
            </div>
          )}

          {/* ── SECURITY ── */}
          {activeTab === 'security' && (
            <div className="rb-security-panel">
              <h2 className="rb-panel-title">🔒 Security & Production Features</h2>
              <p className="rb-security-intro">Production-grade hardening built into the Spring Boot backend — active on every request.</p>
              <div className="rb-security-grid">
                {SECURITY_FEATURES.map((feat, i) => (
                  <AnimateIn key={feat.title} delay={i * 100}>
                    <div className="rb-security-card">
                      <div className="rb-security-card-header" style={{ borderLeftColor: feat.color }}>
                        <span className="rb-security-icon" style={{ color: feat.color }}>{feat.icon}</span>
                        <h4 style={{ color: feat.color }}>{feat.title}</h4>
                      </div>
                      <ul className="rb-security-items">
                        {feat.items.map((item, j) => (
                          <li key={`${feat.title}-${j}`}>
                            <span className="rb-security-bullet" style={{ background: feat.color }} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </AnimateIn>
                ))}
              </div>
            </div>
          )}

          {/* ── SHORTCUTS ── */}
          {activeTab === 'shortcuts' && (
            <div className="rb-shortcuts-panel">
              <h2 className="rb-panel-title">⌨️ Keyboard Shortcuts — Full Reference</h2>
              <p className="rb-shortcuts-intro">Press <kbd className="rb-kbd">?</kbd> anywhere to open the live overlay. These shortcuts work site-wide — no configuration needed.</p>
              <div className="rb-shortcuts-grid">
                {ALL_SHORTCUTS.map((group, gi) => (
                  <AnimateIn key={gi} delay={gi * 80}>
                    <div className="rb-shortcut-group">
                      <div className="rb-shortcut-group-header" style={{ borderLeftColor: group.color }}>
                        <span>{group.section}</span>
                      </div>
                      <div className="rb-shortcut-rows">
                        {group.rows.map((row, ri) => (
                          <div key={ri} className="rb-shortcut-row">
                            <span className="rb-shortcut-keys">
                              {row.keys.map((k, ki) => (
                                <React.Fragment key={ki}>
                                  {ki > 0 && <span className="rb-key-plus">+</span>}
                                  <kbd className="rb-kbd">{k}</kbd>
                                </React.Fragment>
                              ))}
                            </span>
                            <span className="rb-shortcut-desc">{row.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </AnimateIn>
                ))}
              </div>
              <div className="rb-shortcuts-tip">
                <Keyboard size={16} />
                <span>Pro tip: press <kbd className="rb-kbd">G</kbd> then a letter within <strong>800 ms</strong> to jump to any page instantly</span>
              </div>
            </div>
          )}

          {/* ── QUESTION TYPES ── */}
          {activeTab === 'question_types' && (
            <div className="rb-qt-panel">
              <h2 className="rb-panel-title">🎮 18 Question Types — Interactive Challenge Formats</h2>
              <p className="rb-qt-intro">Beyond standard MCQ, QuizHub supports 18 interactive question formats. Each type is playable in Live Quiz battles and Assessments. Access via the Question Types page or Quiz Builder.</p>
              <div className="rb-qt-grid">
                {QUESTION_TYPES_DATA.map((qt, i) => (
                  <AnimateIn key={qt.id} delay={i * 60}>
                    <div className="rb-qt-card">
                      <div className="rb-qt-card-top" style={{ borderTopColor: qt.color }}>
                        <span className="rb-qt-icon">{qt.icon}</span>
                        <span className="rb-qt-badge" style={{ background: qt.color }}>{qt.badge}</span>
                      </div>
                      <div className="rb-qt-body">
                        <h4 className="rb-qt-title" style={{ color: qt.color }}>{qt.title}</h4>
                        <p className="rb-qt-desc">{qt.desc}</p>
                        <code className="rb-qt-id">{qt.id}</code>
                      </div>
                    </div>
                  </AnimateIn>
                ))}
              </div>
            </div>
          )}

          {/* ── BULK UPLOAD ── */}
          {activeTab === 'bulk_upload' && (
            <div className="rb-bulk-panel">
              <h2 className="rb-panel-title">📤 Bulk Upload — CSV / Excel Format Spec</h2>
              <p className="rb-bulk-intro">Upload hundreds of MCQs at once via CSV or Excel. Download the official template from the Bulk Upload page. All uploaded questions are saved as <strong>DRAFT</strong> — no direct approval.</p>
              <AnimateIn>
                <div className="rb-bulk-tip">
                  <Upload size={16} style={{ color: '#A100FF' }} />
                  <span>Go to <strong>Bulk Upload page</strong> → click <strong>"Download Template_MCQs.xlsx"</strong> to get the pre-formatted Excel file with all headers.</span>
                </div>
              </AnimateIn>
              <div className="rb-bulk-table-wrap">
                <table className="rb-bulk-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Column Name</th>
                      <th>Required?</th>
                      <th>Description</th>
                      <th>Example</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BULK_COLUMNS.map((col, i) => (
                      <tr key={i} className={col.req ? 'rb-bulk-required' : ''}>
                        <td className="rb-bulk-num">{col.num}</td>
                        <td className="rb-bulk-name">{col.name}</td>
                        <td><span className={`rb-bulk-req-badge ${col.req ? 'yes' : 'no'}`}>{col.req ? 'Yes' : 'No'}</span></td>
                        <td className="rb-bulk-desc">{col.desc}</td>
                        <td><code className="rb-bulk-example">{col.example}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="rb-bulk-rules">
                {[
                  'Supported formats: .csv, .xlsx, .xls — max 10 MB',
                  'Duplicate check runs on every row — duplicates ≥30% are flagged but NOT blocked (imported as DRAFT)',
                  'Row validation runs before save — any row with missing required column is skipped with error shown',
                  'Tech stack names must match exactly — use the copy-to-clipboard buttons on the Bulk Upload page',
                  'DIFFICULTY must be uppercase: EASY, MEDIUM, or HARD. Any other value fails the row',
                  'Upload result shows: imported count, failed count, per-row error details',
                ].map((rule, i) => (
                  <AnimateIn key={i} delay={i * 80}>
                    <div className="rb-bulk-rule">
                      <div className="rb-bulk-rule-dot" />
                      <p>{rule}</p>
                    </div>
                  </AnimateIn>
                ))}
              </div>
            </div>
          )}

          {/* ── LIVE QUIZ ── */}
          {activeTab === 'live_quiz' && (
            <div className="rb-live-panel">
              <h2 className="rb-panel-title">⚡ Live Quiz — Real-Time Multiplayer Battles</h2>
              <p className="rb-live-intro">Live Quiz is a Kahoot-style real-time battle. A host runs the session; players join via session code. All communication happens over WebSocket — no page refresh needed.</p>
              <div className="rb-live-flow">
                {LIVE_QUIZ_FLOW.map((step, i) => (
                  <AnimateIn key={i} delay={i * 120}>
                    <div className="rb-live-step">
                      <div className="rb-live-step-icon" style={{ background: step.color }}>{step.icon}</div>
                      {i < LIVE_QUIZ_FLOW.length - 1 && <div className="rb-live-connector"><div className="rb-live-pulse" /></div>}
                      <div className="rb-live-step-card">
                        <div className="rb-live-step-header">
                          <span className="rb-live-step-num">{i + 1}</span>
                          <strong>{step.step}</strong>
                          <span className="rb-live-role-badge" style={{ background: step.color }}>{step.role}</span>
                        </div>
                        <p>{step.desc}</p>
                      </div>
                    </div>
                  </AnimateIn>
                ))}
              </div>
              <AnimateIn delay={600}>
                <div className="rb-live-tech-note">
                  <Activity size={16} style={{ color: '#A100FF' }} />
                  <span><strong>Tech stack:</strong> Spring WebSocket with STOMP over SockJS. Session state held in-memory (SimpleBroker). For clustered deployment, replace with RabbitMQ STOMP broker. Live sessions tracked in <code>QuizSessionController</code> → <code>LiveSessionController</code>.</span>
                </div>
              </AnimateIn>
            </div>
          )}

          {/* ── LEADERBOARD ── */}
          {activeTab === 'leaderboard' && (
            <div className="rb-lb-panel">
              <h2 className="rb-panel-title">🏆 Leaderboard — 3 Ranking Modes</h2>
              <p className="rb-lb-intro">Three independent leaderboards track different kinds of achievement. Each has its own badge system. Access via the Leaderboard page — switch modes with the tab bar.</p>
              <div className="rb-lb-modes">
                {LEADERBOARD_MODES.map((lb, i) => (
                  <AnimateIn key={lb.mode} delay={i * 150}>
                    <div className="rb-lb-card">
                      <div className="rb-lb-card-header" style={{ background: `linear-gradient(135deg, ${lb.color}, ${lb.color}88)` }}>
                        <span className="rb-lb-mode-icon">{lb.icon}</span>
                        <div>
                          <h3>{lb.mode} Leaderboard</h3>
                        </div>
                      </div>
                      <p className="rb-lb-desc">{lb.desc}</p>
                      <div className="rb-lb-badges">
                        <h5>Badges</h5>
                        <div className="rb-lb-badge-row">
                          {lb.badges.map((b, j) => (
                            <div key={j} className="rb-lb-badge">
                              <span className="rb-lb-badge-icon">{b.icon}</span>
                              <div>
                                <strong>{b.label}</strong>
                                <span>{b.rule}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </AnimateIn>
                ))}
              </div>
              <AnimateIn delay={500}>
                <div className="rb-lb-export-note">
                  <BarChart3 size={16} style={{ color: '#059669' }} />
                  <span>Assessment and Live Quiz leaderboards are <strong>exportable to CSV</strong>. Filter by exam name, tech stack, or date range before exporting.</span>
                </div>
              </AnimateIn>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
