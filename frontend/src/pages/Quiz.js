import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import API from '../api';
import { useTranslation } from 'react-i18next';
import { useContentTranslation } from '../hooks/useContentTranslation';
import { useAuth } from '../AuthContext';
import { generateCertificate } from '../utils/generateCertificate';
import './Quiz.css';

const OPTION_KEYS = ['A', 'B', 'C', 'D'];
const OPTION_COLORS = { A: '#6983FF', B: '#3B82F6', C: '#10B981', D: '#F59E0B' };

const DIFF_COLOR = { EASY: '#059669', MEDIUM: '#D97706', HARD: '#DC2626' };

export default function Quiz() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();

  // Setup phase
  const [techStacks, setTechStacks] = useState([]);
  const [config, setConfig] = useState({ techStackId: '', count: 10, difficulty: '', adaptive: false });

  // Quiz phase
  const [phase, setPhase] = useState('setup'); // setup | playing | result
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null); // current card selection
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);
  const [timerActive, setTimerActive] = useState(false);

  // Adaptive mode state
  const [adaptiveResults, setAdaptiveResults] = useState([]);
  const [nextDiff, setNextDiff] = useState('MEDIUM');
  const [grading, setGrading] = useState(false);

  // Result phase
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    API.get('/master/tech-stacks').then(r => setTechStacks(r.data || [])).catch(() => {});
  }, []);

  // Per-question 30s timer
  useEffect(() => {
    if (!timerActive) return;
    setTimeLeft(30);
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(interval);
          handleNext(true); // auto-advance on timeout
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, timerActive]);

  const startQuiz = async () => {
    setLoading(true); setError('');
    try {
      if (config.adaptive) {
        // Adaptive: fetch first question at MEDIUM
        const params = { difficulty: 'MEDIUM' };
        if (config.techStackId) params.techStackId = config.techStackId;
        const { data } = await API.get('/quiz/adaptive-question', { params });
        if (data.exhausted) { setError(t('quiz.noQuestions')); setLoading(false); return; }
        setQuestions([data]);
        setAdaptiveResults([]);
        setNextDiff('MEDIUM');
        setAnswers({});
        setSelected(null);
        setCurrent(0);
        setPhase('playing');
        setTimerActive(true);
        setLoading(false);
        return;
      }
      const params = { count: config.count };
      if (config.techStackId) params.techStackId = config.techStackId;
      const { data } = await API.get('/quiz/questions', { params });
      if (!data.length) { setError(t('quiz.noQuestions')); setLoading(false); return; }
      setQuestions(data);
      setAnswers({});
      setSelected(null);
      setCurrent(0);
      setPhase('playing');
      setTimerActive(true);
    } catch (err) {
      setError(err.response?.data?.message || t('quiz.failedLoad'));
    } finally { setLoading(false); }
  };

  // Adaptive: grade one answer immediately, record result, learn next difficulty
  const gradeAdaptive = useCallback(async (answerKey) => {
    const q = questions[current];
    if (!q) return null;
    setGrading(true);
    try {
      const { data } = await API.post('/quiz/adaptive-answer', { mcqId: q.id, answer: answerKey || '' });
      const entry = {
        mcqId: q.id,
        questionStem: q.questionStem,
        yourAnswer: answerKey || null,
        correctAnswer: data.correctAnswer,
        correct: data.correct,
        difficulty: q.difficulty,
      };
      setAdaptiveResults(prev => [...prev, entry]);
      setNextDiff(data.nextDifficulty || 'MEDIUM');
      return entry;
    } catch {
      return null;
    } finally { setGrading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, current]);

  const handleSelect = (key) => {
    if (selected) return; // already answered
    setSelected(key);
    setTimerActive(false);
    if (config.adaptive) {
      gradeAdaptive(key);
      return;
    }
    setAnswers(prev => ({ ...prev, [questions[current].id]: key }));
  };

  const finishAdaptive = useCallback((resultsArr) => {
    const score = resultsArr.filter(r => r.correct).length;
    setResult({
      score,
      total: resultsArr.length,
      percentage: resultsArr.length ? Math.round((score * 100) / resultsArr.length) : 0,
      results: resultsArr,
    });
    setPhase('result');
  }, []);

  const handleNext = useCallback((auto = false) => {
    if (config.adaptive) {
      // Adaptive flow: grade-on-timeout, then fetch next at adjusted difficulty or finish
      const proceed = async () => {
        let resultsArr = adaptiveResults;
        if (auto && !selected) {
          const entry = await gradeAdaptive('');
          if (entry) resultsArr = [...adaptiveResults, entry];
        }
        setTimerActive(false);
        if (resultsArr.length >= config.count) {
          finishAdaptive(resultsArr);
          return;
        }
        try {
          const params = {
            difficulty: nextDiff,
            excludeIds: questions.map(q => q.id).join(','),
          };
          if (config.techStackId) params.techStackId = config.techStackId;
          const { data } = await API.get('/quiz/adaptive-question', { params });
          if (data.exhausted) { finishAdaptive(resultsArr); return; }
          setQuestions(prev => [...prev, data]);
          setCurrent(c => c + 1);
          setSelected(null);
          setTimerActive(true);
        } catch {
          finishAdaptive(resultsArr);
        }
      };
      if (!auto && !selected) return;
      proceed();
      return;
    }
    if (!auto && !selected) return; // require selection unless auto-advance
    setTimerActive(false);
    setTimeout(() => {
      if (current + 1 >= questions.length) {
        submitQuiz();
      } else {
        setCurrent(c => c + 1);
        setSelected(null);
        setTimerActive(true);
      }
    }, auto ? 0 : 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, questions, selected, answers, adaptiveResults, nextDiff, config]);

  const submitQuiz = async () => {
    setTimerActive(false);
    setSubmitting(true);
    try {
      const { data } = await API.post('/quiz/submit', { answers });
      setResult(data);
      setPhase('result');
    } catch (err) {
      setError(t('quiz.failedSubmit'));
    } finally { setSubmitting(false); }
  };

  const restartQuiz = () => {
    setPhase('setup');
    setQuestions([]);
    setAnswers({});
    setSelected(null);
    setCurrent(0);
    setResult(null);
    setError('');
    setAdaptiveResults([]);
    setNextDiff('MEDIUM');
  };

  const q = questions[current];
  const progress = config.adaptive
    ? Math.round((adaptiveResults.length / config.count) * 100)
    : (questions.length ? Math.round(((current) / questions.length) * 100) : 0);

  // Translate current question content
  const currentQTexts = q
    ? [q.questionStem, q.optionA, q.optionB, q.optionC, q.optionD]
    : ['', '', '', '', ''];
  const [txQStem, txQA, txQB, txQC, txQD] = useContentTranslation(currentQTexts);
  const txQOptions = { A: txQA || '', B: txQB || '', C: txQC || '', D: txQD || '' };

  // Translate result breakdown stems
  const resultStems = result?.results?.map(r => r.questionStem) || [];
  const txResultStems = useContentTranslation(resultStems);

  return (
    <>
      <Navbar />
      <div className="quiz-page">

        {/* ── SETUP ── */}
        {phase === 'setup' && (
          <div className="quiz-setup-card">
            <div className="quiz-setup-header">
              <span className="quiz-setup-icon">🎯</span>
              <h1>{t('quiz.title')}</h1>
              <p>{t('quiz.subtitle')}</p>
            </div>
            <div className="quiz-setup-body">
              <div className="quiz-setup-row">
                <label>{t('quiz.techStackLabel')}</label>
                <select value={config.techStackId} onChange={e => setConfig(c => ({ ...c, techStackId: e.target.value }))}>
                  <option value="">{t('quiz.allTechStacks')}</option>
                  {techStacks.map(ts => <option key={ts.id} value={ts.id}>{ts.name}</option>)}
                </select>
              </div>
              <div className="quiz-setup-row">
                <label>{t('quiz.numQuestions')}</label>
                <div className="quiz-count-pills">
                  {[5, 10, 15, 20].map(n => (
                    <button key={n} type="button"
                      className={`quiz-count-pill${config.count === n ? ' active' : ''}`}
                      onClick={() => setConfig(c => ({ ...c, count: n }))}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="quiz-setup-row">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={config.adaptive}
                    onChange={e => setConfig(c => ({ ...c, adaptive: e.target.checked }))}
                  />
                  🧠 {t('quiz.adaptiveMode', 'Adaptive Mode')} — {t('quiz.adaptiveModeDesc', 'difficulty adjusts to your performance')}
                </label>
              </div>
              {error && <div className="quiz-error">{error}</div>}
              <button
                className="quiz-start-btn"
                onClick={startQuiz}
                disabled={loading}
              >
                {loading ? t('quiz.loading') : t('quiz.startQuiz')}
              </button>
            </div>
          </div>
        )}

        {/* ── PLAYING ── */}
        {phase === 'playing' && q && (
          <div className="quiz-play-wrap">
            {/* Progress bar */}
            <div className="quiz-progress-bar">
              <div className="quiz-progress-fill" style={{ width: `${progress}%` }} />
            </div>

            {/* Header row */}
            <div className="quiz-play-header">
              <span className="quiz-qnum">{t('quiz.questionOf', { n: current + 1, total: config.adaptive ? config.count : questions.length })}</span>
              <div className="quiz-meta-pills">
                {config.adaptive && (
                  <span className="quiz-diff-pill" style={{ background: '#7C3AED22', color: '#7C3AED' }}>
                    🧠 ADAPTIVE
                  </span>
                )}
                <span className="quiz-diff-pill" style={{ background: `${DIFF_COLOR[q.difficulty]}22`, color: DIFF_COLOR[q.difficulty] }}>
                  {q.difficulty}
                </span>
                {q.techStack && <span className="quiz-stack-pill">{q.techStack}</span>}
                {q.topic && <span className="quiz-topic-pill">{q.topic}</span>}
              </div>
              {timerActive && timeLeft !== null && (
                <div className={`quiz-timer${timeLeft <= 5 ? ' urgent' : ''}`}>
                  ⏱ {timeLeft}s
                </div>
              )}
            </div>

            {/* Question card */}
            <div className="quiz-question-card">
              <p className="quiz-question-stem">{txQStem || q.questionStem}</p>

              <div className="quiz-options">
                {OPTION_KEYS.map(key => {
                  const text = txQOptions[key] || q[`option${key}`];
                  let cls = 'quiz-option';
                  if (selected) {
                    if (key === selected) cls += ' selected';
                  }
                  return (
                    <button
                      key={key}
                      type="button"
                      className={cls}
                      onClick={() => handleSelect(key)}
                      disabled={!!selected}
                      style={selected === key ? { borderColor: OPTION_COLORS[key], background: `${OPTION_COLORS[key]}15` } : {}}
                    >
                      <span className="quiz-opt-key" style={{ background: selected === key ? OPTION_COLORS[key] : undefined, color: selected === key ? 'white' : undefined }}>
                        {key}
                      </span>
                      <span className="quiz-opt-text">{text}</span>
                    </button>
                  );
                })}
              </div>

              <div className="quiz-play-actions">
                <button
                  className="quiz-skip-btn"
                  type="button"
                  onClick={() => { setSelected('_skipped'); handleNext(false); }}
                  disabled={!!selected}
                >
                  {t('quiz.skip')}
                </button>
                <button
                  className="quiz-next-btn"
                  type="button"
                  onClick={() => handleNext(false)}
                  disabled={!selected || submitting || grading}
                >
                  {(config.adaptive ? adaptiveResults.length >= config.count : current + 1 === questions.length)
                    ? (submitting ? t('quiz.submitting') : t('quiz.finish'))
                    : t('quiz.next')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── RESULT ── */}
        {phase === 'result' && result && (
          <div className="quiz-result-wrap">
            {/* Score card */}
            <div className={`quiz-score-card ${result.percentage >= 80 ? 'excellent' : result.percentage >= 50 ? 'good' : 'poor'}`}>
              <div className="quiz-score-emoji">
                {result.percentage >= 80 ? '🎉' : result.percentage >= 50 ? '👍' : '💪'}
              </div>
              <div className="quiz-score-big">{result.percentage}%</div>
              <div className="quiz-score-label">
                {result.score} / {result.total} correct
              </div>
              <div className="quiz-score-msg">
                {result.percentage >= 80 ? t('quiz.excellent') : result.percentage >= 50 ? t('quiz.goodEffort') : t('quiz.keepPractising')}
              </div>
              <div className="quiz-result-actions">
                <button className="quiz-retry-btn" onClick={restartQuiz}>{t('quiz.tryAgain')}</button>
                <button className="quiz-home-btn" onClick={() => navigate('/')}>{t('quiz.dashboard')}</button>
                <button className="quiz-cert-btn" onClick={() => {
                  const rank = result.percentage >= 90 ? 1 : result.percentage >= 80 ? 2 : result.percentage >= 70 ? 3 : null;
                  generateCertificate({
                    name: user?.fullName || 'Participant',
                    score: result.score,
                    total: result.total,
                    percentage: result.percentage,
                    rank,
                    techStack: config.techStackId ? techStacks.find(ts => String(ts.id) === String(config.techStackId))?.name : null,
                    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                  });
                }}>🎓 {t('quiz.downloadCert', 'Download Certificate')}</button>
              </div>
            </div>

            {/* Per-question breakdown */}
            <div className="quiz-breakdown">
              <h3>{t('quiz.answerBreakdown')}</h3>
              {result.results.map((r, i) => (
                <div key={r.mcqId} className={`quiz-breakdown-row ${r.correct ? 'correct' : 'wrong'}`}>
                  <span className="qb-idx">{i + 1}</span>
                  <div className="qb-content">
                    <p className="qb-stem">{txResultStems[i] || r.questionStem}</p>
                    <div className="qb-answer-row">
                      <span className={`qb-ans-pill ${r.correct ? 'correct' : 'wrong'}`}>
                        {t('quiz.yourAnswer', { ans: r.yourAnswer || '—' })}
                      </span>
                      {!r.correct && (
                        <span className="qb-ans-pill correct">
                          {t('quiz.correct', { ans: r.correctAnswer })}
                        </span>
                      )}
                      <span className="qb-diff-tag" style={{ color: DIFF_COLOR[r.difficulty] }}>{r.difficulty}</span>
                    </div>
                  </div>
                  <span className="qb-result-icon">{r.correct ? '✓' : '✗'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
