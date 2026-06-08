import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useContentTranslation } from '../hooks/useContentTranslation';
import { toast } from 'react-toastify';
import html2canvas from 'html2canvas';
import { useAuth } from '../AuthContext';
import { generateCertificate } from '../utils/generateCertificate';
import QuestionStemRenderer from '../components/QuestionStemRenderer';
import './TakeQuiz.css';

const BASE = 'http://localhost:8080/api/v1';

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ── Animated circular SVG countdown timer ───────────────────────────────────
function CircularTimer({ timeLeft, totalTime }) {
  const { t } = useTranslation();
  const r = 42;
  const circ = 2 * Math.PI * r;
  const pct = totalTime > 0 ? timeLeft / totalTime : 0;
  const offset = circ * (1 - pct);
  const critical = timeLeft <= 60;
  const warn = timeLeft <= 300 && timeLeft > 60;
  const color = critical ? '#ef4444' : warn ? '#f59e0b' : '#C77DFF';

  return (
    <div className="tq-circ-timer">
      <svg width="108" height="108" viewBox="0 0 108 108">
        <circle cx="54" cy="54" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7" />
        <circle
          cx="54" cy="54" r={r} fill="none"
          stroke={color} strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 54 54)"
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.4s ease' }}
        />
      </svg>
      <div className="tq-circ-center">
        <span className={`tq-circ-time ${critical ? 'critical' : warn ? 'warn' : ''}`}>{fmtTime(timeLeft)}</span>
        <span className="tq-circ-label">{t('common.remaining')}</span>
      </div>
    </div>
  );
}

// ── Confetti burst for high scores ──────────────────────────────────────────
function Confetti() {
  const colors = ['#A100FF', '#10b981', '#f59e0b', '#ef4444', '#B84DFF', '#06b6d4', '#ec4899'];
  const pieces = Array.from({ length: 70 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    color: colors[i % colors.length],
    delay: `${Math.random() * 2.5}s`,
    duration: `${2.2 + Math.random() * 2}s`,
    width: `${6 + Math.random() * 7}px`,
    height: `${7 + Math.random() * 9}px`,
    rotate: `${Math.random() * 360}deg`,
  }));

  return (
    <div className="tq-confetti-wrap" aria-hidden="true">
      {pieces.map(p => (
        <div key={p.id} className="tq-confetti-piece" style={{
          left: p.left, background: p.color,
          animationDelay: p.delay, animationDuration: p.duration,
          width: p.width, height: p.height, transform: `rotate(${p.rotate})`,
        }} />
      ))}
    </div>
  );
}

// ── Animated topic bar ───────────────────────────────────────────────────────
function TopicBar({ topic, percent, strength, delay }) {
  const { t } = useTranslation();
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(percent), delay);
    return () => clearTimeout(t);
  }, [percent, delay]);

  const color = strength === 'STRONG' ? '#10b981' : strength === 'AVERAGE' ? '#f59e0b' : '#ef4444';
  const chip = strength === 'STRONG' ? t('tq.chipStrong') : strength === 'AVERAGE' ? t('tq.chipAverage') : t('tq.chipWeak');

  return (
    <div className="tq-tbar-row">
      <div className="tq-tbar-label">
        <span className="tq-tbar-name">{topic}</span>
        <span className="tq-tbar-pct" style={{ color }}>{percent}%</span>
      </div>
      <div className="tq-tbar-track">
        <div className="tq-tbar-fill" style={{ width: `${w}%`, background: color, transition: `width 1s ease ${delay}ms` }} />
      </div>
      <span className={`tq-schip tq-schip-${(strength || '').toLowerCase()}`}>{chip}</span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
export default function TakeQuiz() {
  const { t } = useTranslation();
  const { token } = useParams();
  const { user } = useAuth();

  // UI steps: 'loading' | 'info-form' | 'rules' | 'quiz' | 'results' | 'error'
  const [step, setStep] = useState('loading');
  const [expiredMsg, setExpiredMsg] = useState('');

  // Session data
  const [session, setSession] = useState(null);

  // Candidate info — pre-filled from logged-in user
  const [candidateName, setCandidateName] = useState(user?.fullName || '');
  const [candidateEmail, setCandidateEmail] = useState(user?.email || '');
  const [infoError, setInfoError] = useState('');
  const [checkingEmail, setCheckingEmail] = useState(false);

  // Quiz state
  const [questions, setQuestions] = useState([]);
  const [shuffledOrder, setShuffledOrder] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const timerRef = useRef(null);

  // Anti-cheat
  const [violations, setViolations] = useState(0);
  const [warningMsg, setWarningMsg] = useState('');
  const violationsRef = useRef(0);
  const screenshotRef = useRef(null);
  const quizContainerRef = useRef(null);
  const submittingRef = useRef(false);

  // Results
  const [results, setResults] = useState(null);
  const [animScore, setAnimScore] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const resultsRef = useRef(null);
  const completedAt = useRef(null);

  // Translate current quiz question content
  const tqIndex = shuffledOrder[currentIdx] ?? currentIdx;
  const tqQuestion = questions[tqIndex] || null;
  const tqTexts = tqQuestion
    ? [tqQuestion.questionStem, tqQuestion.optionA, tqQuestion.optionB, tqQuestion.optionC, tqQuestion.optionD]
    : ['', '', '', '', ''];
  const [txTQStem, txTQA, txTQB, txTQC, txTQD] = useContentTranslation(tqTexts);
  const txTQOptions = { A: txTQA || '', B: txTQB || '', C: txTQC || '', D: txTQD || '' };

  // ── Exam lock: track active exam in sessionStorage so ExamLockGuard
  //    can redirect unauthenticated users back if they navigate away ──────
  useEffect(() => {
    if (step === 'quiz') {
      sessionStorage.setItem('activeExamToken', token);
    } else if (step === 'results' || step === 'error') {
      sessionStorage.removeItem('activeExamToken');
    }
  }, [step, token]);

  // Always clean up on unmount (e.g. user closes the tab mid-exam)
  useEffect(() => {
    return () => sessionStorage.removeItem('activeExamToken');
  }, []);

  // ── Load session ────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${BASE}/quiz-sessions/take/${token}`)
      .then(async r => {
        if (r.status === 410) {
          const d = await r.json().catch(() => ({}));
          setExpiredMsg(d.error || 'This quiz link has expired.');
          setStep('error');
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then(data => {
        if (!data) { if (step !== 'error') setStep('error'); return; }
        setSession(data);
        setQuestions(data.questions || []);
        setStep('info-form');
      })
      .catch(() => setStep('error'));
  }, [token]);

  // ── Animate score counter on results ────────────────────────────────────
  useEffect(() => {
    if (step !== 'results' || !results) return;
    completedAt.current = new Date();
    let cur = 0;
    const target = results.percent;
    const tick = Math.max(1, Math.floor(target / 50));
    const id = setInterval(() => {
      cur = Math.min(cur + tick, target);
      setAnimScore(cur);
      if (cur >= target) clearInterval(id);
    }, 25);
    return () => clearInterval(id);
  }, [step, results]);

  // ── Submit quiz (called by timer, violations, or manual) ────────────────
  const submitQuiz = useCallback(async (forcedStatus) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    clearInterval(timerRef.current);

    const timeTaken = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    const body = {
      name: candidateName,
      email: candidateEmail,
      answers,
      violationCount: violationsRef.current,
      violationScreenshot: screenshotRef.current || null,
      timeTakenSeconds: timeTaken,
    };

    try {
      const r = await fetch(`${BASE}/quiz-sessions/take/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) {
        toast.error(data.error || t('tq.submissionFailed'));
        submittingRef.current = false;
        return;
      }
      setResults(data);
      setStep('results');
    } catch {
      toast.error(t('tq.networkError'));
      submittingRef.current = false;
    }
  }, [token, candidateName, candidateEmail, answers, startTime]);

  // ── Anti-cheat: tab / window visibility ────────────────────────────────
  useEffect(() => {
    if (step !== 'quiz') return;
    const handleVisibility = async () => {
      if (document.hidden) {
        const newCount = violationsRef.current + 1;
        violationsRef.current = newCount;
        setViolations(newCount);

        // Capture screenshot on first violation
        if (newCount === 1 && quizContainerRef.current && !screenshotRef.current) {
          try {
            const canvas = await html2canvas(quizContainerRef.current, { scale: 0.5 });
            screenshotRef.current = canvas.toDataURL('image/png');
          } catch {}
        }

        if (newCount >= 3) {
          setWarningMsg('');
          toast.error(t('tq.autoSubmitted'), { autoClose: false });
          await submitQuiz('TERMINATED');
        } else {
          setWarningMsg(t('tq.violationWarning', { n: newCount }));
          toast.warn(t('tq.violationTabToast', { n: newCount }));
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [step, submitQuiz]);

  // ── Anti-cheat: fullscreen exit ─────────────────────────────────────────
  useEffect(() => {
    if (step !== 'quiz') return;
    const handleFsChange = async () => {
      if (!document.fullscreenElement) {
        const newCount = violationsRef.current + 1;
        violationsRef.current = newCount;
        setViolations(newCount);

        if (newCount >= 3) {
          toast.error(t('tq.autoSubmitted'), { autoClose: false });
          await submitQuiz('TERMINATED');
        } else {
          setWarningMsg(t('tq.violationFsWarning', { n: newCount }));
          toast.warn(t('tq.violationFsToast', { n: newCount }));
        }
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, [step, submitQuiz]);

  // ── Countdown timer ─────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'quiz') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          submitQuiz('COMPLETED');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [step, submitQuiz]);

  // ── Start quiz (after rules) ─────────────────────────────────────────────
  const startQuiz = async () => {
    // Shuffle question order seeded by email (deterministic per candidate)
    const indices = questions.map((_, i) => i);
    const seed = candidateEmail.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const rng = mulberry32(seed);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    setShuffledOrder(indices);
    const t = (session?.timeLimitMinutes || 30) * 60;
    setTimeLeft(t);
    setTotalTime(t);
    setStartTime(Date.now());

    // Request fullscreen
    try {
      await document.documentElement.requestFullscreen();
    } catch {}

    setStep('quiz');
  };

  // ── Handle answer selection ──────────────────────────────────────────────
  const selectAnswer = (mcqId, label) => {
    const mcq = questions.find(q => q.id === mcqId);
    if (mcq && mcq.questionType === 'MULTI') {
      // Toggle multi-select: store as comma-separated sorted string
      setAnswers(a => {
        const current = (a[String(mcqId)] || '').split(',').filter(Boolean);
        const updated = current.includes(label) ? current.filter(k => k !== label) : [...current, label].sort();
        return { ...a, [String(mcqId)]: updated.join(',') };
      });
    } else {
      setAnswers(a => ({ ...a, [String(mcqId)]: label }));
    }
  };

  // ── Re-enter fullscreen prompt ───────────────────────────────────────────
  const reenterFullscreen = () => {
    document.documentElement.requestFullscreen().catch(() => {});
  };

  // ── Validate candidate info ──────────────────────────────────────────────
  const handleInfoSubmit = async () => {
    setInfoError('');
    if (!candidateName.trim()) { setInfoError(t('tq.enterFullName')); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(candidateEmail)) { setInfoError(t('tq.enterValidEmail')); return; }
    // Pre-check: has this email already attempted?
    setCheckingEmail(true);
    try {
      const r = await fetch(`${BASE}/quiz-sessions/take/${token}/check-attempt?email=${encodeURIComponent(candidateEmail)}`);
      if (r.ok) {
        const d = await r.json();
        if (d.alreadyAttempted) {
          setInfoError(t('tq.alreadyAttempted'));
          setCheckingEmail(false);
          return;
        }
      }
    } catch { /* network issues — let backend block on submit */ }
    setCheckingEmail(false);
    setStep('rules');
  };

  // ── Prevent copy/paste ───────────────────────────────────────────────────
  const blockCopy = (e) => e.preventDefault();

  // ── Download PDF via browser print ──────────────────────────────────────
  const downloadPDF = () => {
    setDownloading(true);
    setTimeout(() => {
      window.print();
      setDownloading(false);
    }, 200);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  if (step === 'loading') return (
    <div className="tq-center">
      <div className="tq-loading-box">
        <div className="tq-spinner" />
        <p>{t('tq.loadingAssessment')}</p>
      </div>
    </div>
  );

  if (step === 'error') return (
    <div className="tq-center">
      <div className="tq-error-box">
        <div className="tq-error-icon">{expiredMsg ? '⏰' : '🚫'}</div>
        <h2>{expiredMsg ? 'Link Expired' : t('tq.notFoundTitle')}</h2>
        <p>{expiredMsg || t('tq.notFoundMsg')}</p>
      </div>
    </div>
  );

  // ── Step 1: Candidate info ───────────────────────────────────────────────
  if (step === 'info-form') return (
    <div className="tq-center tq-entry-bg">
      <div className="tq-entry-card">
        <div className="tq-entry-badge">{t('tq.proctoredBadge')}</div>
        <h1 className="tq-entry-title">{session?.title}</h1>
        <div className="tq-entry-meta">
          <span><strong>{session?.questions?.length}</strong> {t('tq.questions')}</span>
          <span className="tq-meta-sep" />
          <span><strong>{session?.timeLimitMinutes}</strong> {t('tq.minutes')}</span>
          <span className="tq-meta-sep" />
          <span>{t('tq.proctored')}</span>
        </div>
        <div className="tq-entry-divider" />
        <div className="tq-form-body">
          <div className="tq-field">
            <label>{t('tq.fullNameLabel')}</label>
            <input
              type="text" placeholder={t('tq.fullNamePlaceholder')}
              value={candidateName} onChange={e => setCandidateName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleInfoSubmit()}
            />
          </div>
          <div className="tq-field">
            <label>{t('tq.emailLabel')}</label>
            <input
              type="email" placeholder={t('tq.emailPlaceholder')}
              value={candidateEmail} onChange={e => setCandidateEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleInfoSubmit()}
            />
          </div>
          {infoError && <div className="tq-field-error">{infoError}</div>}
          <button className="tq-btn-primary" onClick={handleInfoSubmit} disabled={checkingEmail}>
            {checkingEmail ? t('tq.checking') : t('tq.continue')}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Step 2: Rules ────────────────────────────────────────────────────────
  if (step === 'rules') return (
    <div className="tq-center tq-entry-bg">
      <div className="tq-rules-card">
        <div className="tq-rules-header">
          <h2>{t('tq.rulesTitle')}</h2>
          <p>{t('tq.rulesSubtitle')}</p>
        </div>
        <div className="tq-rules-grid">
          {[
            { icon: '⏱', titleKey: 'ruleTimerTitle', descKey: 'ruleTimerDesc', timePfx: true },
            { icon: '🖥️', titleKey: 'ruleFullscreenTitle', descKey: 'ruleFullscreenDesc' },
            { icon: '🚫', titleKey: 'ruleTabTitle', descKey: 'ruleTabDesc' },
            { icon: '⚠️', titleKey: 'ruleStrikesTitle', descKey: 'ruleStrikesDesc' },
            { icon: '📋', titleKey: 'ruleCopyTitle', descKey: 'ruleCopyDesc' },
            { icon: '🔀', titleKey: 'ruleShuffleTitle', descKey: 'ruleShuffleDesc' },
            { icon: '1️⃣', titleKey: 'ruleOneAttemptTitle', descKey: 'ruleOneAttemptDesc' },
            { icon: '✅', titleKey: 'ruleNoHintsTitle', descKey: 'ruleNoHintsDesc' },
          ].map(r => (
            <div key={r.titleKey} className="tq-rule-item">
              <span className="tq-rule-icon">{r.icon}</span>
              <div>
                <div className="tq-rule-title">{r.timePfx ? `${session?.timeLimitMinutes} ${t(`tq.${r.titleKey}`)}` : t(`tq.${r.titleKey}`)}</div>
                <div className="tq-rule-desc">{t(`tq.${r.descKey}`)}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="tq-rules-consent">{t('tq.consent')}</p>
        <div className="tq-rules-actions">
          <button className="tq-btn-outline" onClick={() => setStep('info-form')}>{t('tq.back')}</button>
          <button className="tq-btn-primary" onClick={startQuiz}>{t('tq.startAssessment')}</button>
        </div>
      </div>
    </div>
  );

  // ── Step 3: Quiz ─────────────────────────────────────────────────────────
  if (step === 'quiz') {
    const qIndex = shuffledOrder[currentIdx] ?? currentIdx;
    const q = questions[qIndex];
    const answered = Object.keys(answers).length;
    const total = questions.length;
    const isLastQ = currentIdx === total - 1;

    return (
      <div
        className="tq-exam-root"
        ref={quizContainerRef}
        onCopy={blockCopy} onCut={blockCopy} onContextMenu={blockCopy}
      >
        {/* Invisible anti-cheat watermark (shows only in screenshots) */}
        <div className="tq-watermark" aria-hidden="true">
          {candidateName} · {candidateEmail}
        </div>

        {/* Violation warning banner */}
        {warningMsg && (
          <div className="tq-warning-banner">
            <span>{warningMsg}</span>
            <div className="tq-warning-actions">
              {!document.fullscreenElement && (
                <button onClick={reenterFullscreen} className="tq-btn-fs">{t('tq.reenterFullscreen')}</button>
              )}
              <button onClick={() => setWarningMsg('')} className="tq-btn-dismiss">{t('tq.dismiss')}</button>
            </div>
          </div>
        )}

        <div className="tq-exam-layout">
          {/* ── Sidebar ─────────────────────────────────────────────── */}
          <aside className="tq-sidebar">
            {/* Candidate avatar */}
            <div className="tq-sidebar-candidate">
              <div className="tq-avatar">{candidateName.charAt(0).toUpperCase()}</div>
              <div className="tq-avatar-info">
                <div className="tq-avatar-name">{candidateName}</div>
                <div className="tq-avatar-email">{candidateEmail}</div>
              </div>
            </div>

            {/* Circular timer */}
            <CircularTimer timeLeft={timeLeft} totalTime={totalTime} />

            {/* Stats row */}
            <div className="tq-sidebar-stats">
              <div className="tq-stat">
                <span className="tq-stat-val tq-stat-green">{answered}</span>
                <span className="tq-stat-lbl">{t('tq.answered')}</span>
              </div>
              <div className="tq-stat-divider" />
              <div className="tq-stat">
                <span className="tq-stat-val tq-stat-amber">{total - answered}</span>
                <span className="tq-stat-lbl">{t('tq.pending')}</span>
              </div>
            </div>

            {violations > 0 && (
              <div className="tq-violations-badge">⚠️ {violations}/3 violations</div>
            )}

            {/* Question palette */}
            <div className="tq-palette-label">{t('tq.questionPalette')}</div>
            <div className="tq-palette">
              {shuffledOrder.map((qi, i) => {
                const qid = questions[qi]?.id;
                const done = qid && answers[String(qid)];
                return (
                  <button
                    key={i}
                    className={`tq-pq ${i === currentIdx ? 'active' : ''} ${done ? 'done' : ''}`}
                    onClick={() => setCurrentIdx(i)}
                    title={`Q${i + 1}${done ? ' ✓' : ''}`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="tq-palette-legend">
              <span><span className="tq-pleg done" /> {t('tq.answeredLegend')}</span>
              <span><span className="tq-pleg active" /> {t('tq.currentLegend')}</span>
              <span><span className="tq-pleg" /> {t('tq.unansweredLegend')}</span>
            </div>
          </aside>

          {/* ── Main question area ──────────────────────────────────── */}
          <main className="tq-exam-main">
            {/* Top bar */}
            <div className="tq-exam-topbar">
              <div className="tq-exam-title-text">{session?.title}</div>
              <div className="tq-topbar-right">
                <span className="tq-topbar-count">{answered}/{total} answered</span>
                <div className="tq-topbar-bar">
                  <div className="tq-topbar-fill" style={{ width: `${(answered / total) * 100}%` }} />
                </div>
              </div>
            </div>

            {q && (
              <div className="tq-question-panel" key={q.id}>
                {/* Question header */}
                <div className="tq-q-header">
                  <div className="tq-q-badge">
                    <span className="tq-q-num">Q{currentIdx + 1}</span>
                    <span className="tq-q-of">/ {total}</span>
                  </div>
                  <div className="tq-q-tags">
                    <span className="tq-tag tq-tag-stack">{q.techStackName}</span>
                    <span className="tq-tag">{q.topicName}</span>
                    <span className={`tq-tag tq-diff-${(q.difficulty || '').toLowerCase()}`}>{q.difficulty}</span>
                  </div>
                </div>

                <div className="tq-question-stem" onCopy={blockCopy} onCut={blockCopy}>
                  <QuestionStemRenderer text={txTQStem || q.questionStem} />
                </div>

                <div className="tq-options">
                  {q.questionType === 'MULTI' && <p style={{fontSize:'0.85rem',color:'#6b7280',marginBottom:'0.5rem'}}>Select all correct answers:</p>}
                  {['A', 'B', 'C', 'D'].map(label => {
                    const text = txTQOptions[label] || q[`option${label}`];
                    const isMulti = q.questionType === 'MULTI';
                    const answerStr = answers[String(q.id)] || '';
                    const selected = isMulti ? answerStr.split(',').includes(label) : answerStr === label;
                    return (
                      <button
                        key={label}
                        className={`tq-option ${selected ? 'selected' : ''}`}
                        onClick={() => selectAnswer(q.id, label)}
                        onCopy={blockCopy}
                      >
                        <span className="tq-opt-label">{isMulti ? (selected ? '☑' : '☐') : label}</span>
                        <span className="tq-opt-text">{text}</span>
                        {selected && <span className="tq-opt-check">✓</span>}
                      </button>
                    );
                  })}
                </div>

                <div className="tq-exam-nav">
                  <button
                    className="tq-btn-nav"
                    onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
                    disabled={currentIdx === 0}
                  >{t('tq.prev')}</button>

                  {isLastQ ? (
                    <button
                      className="tq-btn-submit-final"
                      onClick={() => {
                        if (window.confirm(t('tq.confirmSubmit', { n: answered, total }))) {
                          submitQuiz('COMPLETED');
                        }
                      }}
                    >{t('tq.submitAssessment')}</button>
                  ) : (
                    <button
                      className="tq-btn-next"
                      onClick={() => setCurrentIdx(i => Math.min(total - 1, i + 1))}
                    >{t('tq.next')}</button>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    );
  }

  // ── Step 4: Results ──────────────────────────────────────────────────────
  if (step === 'results' && results) {
    const pct = results.percent;
    const grade = pct >= 80
      ? { label: t('tq.gradeExcellent'), color: '#10b981', ring: '#34d399', bg: 'linear-gradient(135deg,#ecfdf5,#d1fae5)' }
      : pct >= 60
      ? { label: t('tq.gradeGood'),      color: '#A100FF', ring: '#C77DFF', bg: 'linear-gradient(135deg,#eef2ff,#e0e7ff)' }
      : pct >= 40
      ? { label: t('tq.gradeAverage'),   color: '#f59e0b', ring: '#fbbf24', bg: 'linear-gradient(135deg,#fffbeb,#fef3c7)' }
      : { label: t('tq.gradeNeedsImprovement'), color: '#ef4444', ring: '#f87171', bg: 'linear-gradient(135deg,#fef2f2,#fee2e2)' };

    const strong = results.topicBreakdown?.filter(t => t.strength === 'STRONG') || [];
    const weak   = results.topicBreakdown?.filter(t => t.strength === 'WEAK')   || [];
    const avg    = results.topicBreakdown?.filter(t => t.strength === 'AVERAGE') || [];
    const dateStr = completedAt.current
      ? completedAt.current.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
      : new Date().toLocaleString();

    return (
      <div className="tq-results-root">
        {pct >= 80 && <Confetti />}

        <div className="tq-results-page no-print-btn" ref={resultsRef}>
          {/* ── Report header ─────────────────────────────────────── */}
          <div className="tq-report-header">
            <div className="tq-report-brand">{t('tq.reportBrand')}</div>
            <div className="tq-report-candidate">
              <span>👤 {candidateName}</span>
              <span>📧 {candidateEmail}</span>
              <span>📅 {dateStr}</span>
            </div>
          </div>

          <div className="tq-results-body">
            {/* ── Score hero ────────────────────────────────────────── */}
            <div className="tq-score-hero" style={{ background: grade.bg }}>
              <div className="tq-score-ring-wrap">
                <svg width="170" height="170" viewBox="0 0 170 170">
                  <circle cx="85" cy="85" r="72" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="10" />
                  <circle
                    cx="85" cy="85" r="72" fill="none"
                    stroke={grade.ring} strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 72}`}
                    strokeDashoffset={`${2 * Math.PI * 72 * (1 - animScore / 100)}`}
                    transform="rotate(-90 85 85)"
                    style={{ transition: 'stroke-dashoffset 0.04s linear' }}
                  />
                </svg>
                <div className="tq-score-inside">
                  <span className="tq-score-pct" style={{ color: grade.color }}>{animScore}%</span>
                  <span className="tq-score-grade" style={{ color: grade.color }}>{grade.label}</span>
                </div>
              </div>

              <div className="tq-score-meta">
                {results.status === 'TERMINATED' && (
                  <div className="tq-terminated-badge">{t('tq.terminated')}</div>
                )}
                <div className="tq-score-pills">
                  <div className="tq-score-pill">
                    <span className="tq-pill-val" style={{ color: '#10b981' }}>{results.score}</span>
                    <span className="tq-pill-lbl">{t('tq.correct')}</span>
                  </div>
                  <div className="tq-score-pill">
                    <span className="tq-pill-val" style={{ color: '#ef4444' }}>{results.total - results.score}</span>
                    <span className="tq-pill-lbl">{t('tq.incorrect')}</span>
                  </div>
                  <div className="tq-score-pill">
                    <span className="tq-pill-val" style={{ color: '#A100FF' }}>{results.total}</span>
                    <span className="tq-pill-lbl">{t('tq.total')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Topic performance bars ────────────────────────────── */}
            {results.topicBreakdown?.length > 0 && (
              <div className="tq-section">
                <h3 className="tq-section-title">{t('tq.topicPerformance')}</h3>
                <div className="tq-topic-bars">
                  {results.topicBreakdown.map((t, i) => (
                    <TopicBar key={t.topic} topic={t.topic} percent={t.percent} strength={t.strength} delay={i * 180} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Strengths vs Study ────────────────────────────────── */}
            <div className="tq-insights-row">
              <div className="tq-insight-card tq-insight-good">
                <h4>{t('tq.yourStrengths')}</h4>
                {strong.length > 0 ? (
                  <ul className="tq-insight-list">
                    {strong.map(t => (
                      <li key={t.topic}>
                        <span>{t.topic}</span>
                        <span className="tq-insight-pct strong">{t.percent}%</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="tq-insight-empty">{t('tq.keepPractising')}</p>
                )}
                {avg.length > 0 && (
                  <>
                    <h5 className="tq-insight-sub">{t('tq.avgPerformance')}</h5>
                    <ul className="tq-insight-list">
                      {avg.map(t => (
                        <li key={t.topic}>
                          <span>{t.topic}</span>
                          <span className="tq-insight-pct avg">{t.percent}%</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              <div className="tq-insight-card tq-insight-study">
                <h4>{t('tq.topicsToStudy')}</h4>
                {weak.length > 0 ? (
                  <>
                    <ul className="tq-insight-list">
                      {weak.map(t => (
                        <li key={t.topic}>
                          <span>{t.topic}</span>
                          <span className="tq-insight-pct weak">{t.percent}%</span>
                        </li>
                      ))}
                    </ul>
                    <p className="tq-study-note">{t('tq.studyNote')}</p>
                  </>
                ) : (
                  <p className="tq-insight-empty">{t('tq.noWeakAreas')}</p>
                )}
              </div>
            </div>

            {/* ── Footer ───────────────────────────────────────────── */}
            <div className="tq-results-footer">
              <p>{t('tq.thankYou', { name: candidateName })}</p>
              <button className="tq-btn-pdf no-print" onClick={downloadPDF} disabled={downloading}>
                {downloading ? t('tq.preparing') : t('tq.downloadPdf')}
              </button>
              <button className="tq-btn-cert no-print" onClick={() => {
                const rank = pct >= 90 ? 1 : pct >= 80 ? 2 : pct >= 70 ? 3 : null;
                generateCertificate({
                  name: candidateName || 'Participant',
                  score: results.score,
                  total: results.total,
                  percentage: pct,
                  rank,
                  techStack: session?.title || '',
                  date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                });
              }}>
                🎓 {t('quiz.downloadCert', 'Download Certificate')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Simple seeded PRNG (mulberry32)
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
