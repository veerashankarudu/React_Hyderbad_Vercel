import React, { useState, useEffect, useRef } from 'react';
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
  { stage: 'DRAFT', color: '#6B7280', gradient: 'linear-gradient(135deg, #6B7280, #9CA3AF)', icon: '✏️', desc: 'Question being created. Only author can see & edit.' },
  { stage: 'READY FOR REVIEW', color: '#7C3AED', gradient: 'linear-gradient(135deg, #7C3AED, #A78BFA)', icon: '📨', desc: 'Submitted for review. Admin assigns a reviewer.' },
  { stage: 'UNDER REVIEW', color: '#D97706', gradient: 'linear-gradient(135deg, #D97706, #FBBF24)', icon: '🔎', desc: 'Reviewer evaluating. Can approve, reject, or comment.' },
  { stage: 'APPROVED', color: '#059669', gradient: 'linear-gradient(135deg, #059669, #34D399)', icon: '✅', desc: 'Passed review! Enters Question Bank for quizzes.' },
  { stage: 'REJECTED', color: '#DC2626', gradient: 'linear-gradient(135deg, #DC2626, #F87171)', icon: '↩️', desc: 'Needs revision. Author gets feedback & resubmits.' },
];

const REVIEW_STEPS = [
  { icon: '✍️', title: 'Create', text: 'SME writes question and clicks "Save & Send for Review"' },
  { icon: '🔍', title: 'Dup Check', text: 'System checks duplicates. ≥30% match → BLOCKED' },
  { icon: '📨', title: 'Submit', text: 'Clean question → READY_FOR_REVIEW status' },
  { icon: '👤', title: 'Assign', text: 'Admin assigns reviewer (same tech stack, not creator)' },
  { icon: '📋', title: 'Review', text: 'Reviewer evaluates → UNDER_REVIEW status' },
  { icon: '⚖️', title: 'Decide', text: 'Approve ✅, Reject ❌, or Comment 💬' },
  { icon: '🔄', title: 'Revise', text: 'If rejected → SME edits and resubmits' },
  { icon: '🏛️', title: 'Bank', text: 'If approved → enters Question Bank for quizzes' },
];

const ROLES = [
  {
    role: 'SME', fullName: 'Subject Matter Expert', icon: '🧑‍💻', color: '#6366F1',
    perms: ['Create/edit/delete own MCQs', 'Submit for review', 'Bulk upload (CSV/Excel)', 'AI-generate questions', 'View stats & leaderboard', 'Take quizzes', 'Live Quiz battles'],
  },
  {
    role: 'Admin', fullName: 'Administrator', icon: '🛡️', color: '#8B5CF6',
    perms: ['All SME permissions +', 'Assign reviewers', 'Manage Question Bank', 'Manage Tech Stacks & Topics', 'Manage users', 'View all analytics & audit logs', 'Build & publish assessments'],
  },
];

const AI_FEATURES = [
  { icon: '🧠', title: 'Smart Generation', desc: 'Generates MCQs from Tech Stack + Topic + Difficulty using local Ollama LLM' },
  { icon: '🛡️', title: 'Auto Dup-Screen', desc: 'Each generated question auto-checked for ≥30% similarity & replaced (up to 3 retries)' },
  { icon: '📝', title: 'Draft First', desc: 'All AI questions saved as DRAFT — human review still required before approval' },
  { icon: '🔒', title: 'Privacy First', desc: 'Uses local Ollama model — no data leaves your machine. Zero cloud dependency' },
  { icon: '🔄', title: 'Regenerate', desc: 'Unhappy? Regenerate individual questions or the entire batch instantly' },
  { icon: '🤖', title: 'AI Check', desc: 'Manual duplicate scan anytime via the 🤖 button on the edit form' },
];

const QUIZ_RULES = [
  { icon: '✅', title: 'Approved Only', desc: 'Only APPROVED questions can be used in quizzes' },
  { icon: '🎛️', title: 'Quiz Builder', desc: 'Set title, time limit, passing score, question count' },
  { icon: '🔗', title: 'Unique Links', desc: 'Each assessment gets a unique token/link to share' },
  { icon: '🛡️', title: 'Anti-Cheat', desc: 'Timer, chatbot hidden, navigation locked during exam' },
  { icon: '📊', title: 'Auto-Grading', desc: 'Instant results: score, time, per-question breakdown' },
  { icon: '⚡', title: 'Live Mode', desc: 'Real-time multiplayer battles with live leaderboard' },
];

export default function RuleBook() {
  const [activeTab, setActiveTab] = useState('lifecycle');
  const thresholdCount = useCountUp(30, 1500);

  const tabs = [
    { id: 'lifecycle', icon: '🔄', label: 'Lifecycle' },
    { id: 'roles', icon: '👥', label: 'Roles' },
    { id: 'duplicate', icon: '🛡️', label: 'Duplicate' },
    { id: 'ai', icon: '🤖', label: 'AI Rules' },
    { id: 'review', icon: '📝', label: 'Workflow' },
    { id: 'quiz', icon: '🎯', label: 'Quizzes' },
  ];

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
              <div className="rb-stat"><span className="rb-stat-num">30%</span><span className="rb-stat-label">Dup Threshold</span></div>
              <div className="rb-stat"><span className="rb-stat-num">8</span><span className="rb-stat-label">Review Steps</span></div>
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
                    <h3>🚫 Hard Block Rule</h3>
                    <p>If any existing question matches ≥ <strong>30%</strong> similarity, you <strong>cannot</strong> send for review. Fix it first!</p>
                    <div className="rb-dup-visual">
                      <div className="rb-dup-bar"><div className="rb-dup-bar-fill safe" style={{width:'25%'}} /><span>25% — Safe ✅</span></div>
                      <div className="rb-dup-bar"><div className="rb-dup-bar-fill danger" style={{width:'45%'}} /><span>45% — Blocked 🚫</span></div>
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
                  '🤖 AI Check button for manual duplicate scan anytime',
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
        </div>
      </main>
    </div>
  );
}
