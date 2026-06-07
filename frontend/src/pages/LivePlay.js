import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import API from '../api';
import { useLiveSession } from '../hooks/useLiveSession';
import './LivePlay.css';

const COLORS = { A: '#e63946', B: '#457b9d', C: '#e9c46a', D: '#2a9d8f' };
const ICONS  = { A: '▲', B: '◆', C: '●', D: '★' };

export default function LivePlay() {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const participantId = location.state?.participantId
    || (() => {
      try {
        const stored = sessionStorage.getItem(`live_participant_${sessionId}`);
        if (stored) return JSON.parse(stored).participantId;
      } catch { /* ignore */ }
      return null;
    })();

  // Guard: no participant means they reloaded without joining — send them back
  useEffect(() => {
    if (!participantId) {
      navigate(`/live/join`, { replace: true });
    }
  }, [participantId, navigate]);

  // phases: waiting | countdown | question | answered | result | ended
  const [phase, setPhase] = useState(location.state?.question ? 'countdown' : 'waiting');
  const [question, setQuestion] = useState(location.state?.question || null);
  const [countdown, setCountdown] = useState(3);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answerResult, setAnswerResult] = useState(null);
  const [questionResult, setQuestionResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeLimitTotal, setTimeLimitTotal] = useState(30);
  const [isPaused, setIsPaused] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [myRank, setMyRank] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const questionStartRef = useRef(null);

  // ── 3-2-1 countdown before question ─────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setPhase('question');
      setTimeLeft(question.timeLimitSeconds);
      setTimeLimitTotal(question.timeLimitSeconds);
      questionStartRef.current = Date.now();
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown, question]);

  // ── Question timer ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'question' || isPaused || timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft(n => Math.max(0, n - 1)), 1000);
    return () => clearTimeout(t);
  }, [phase, isPaused, timeLeft]);

  // ── Auto time-out ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'question' && timeLeft === 0 && !selectedOption) {
      setPhase('answered');
    }
  }, [phase, timeLeft, selectedOption]);

  // ── WebSocket events ─────────────────────────────────────────────────────────
  const handleEvent = useCallback((event) => {
    switch (event.type) {
      case 'SESSION_PAUSED':   setIsPaused(true);  break;
      case 'SESSION_RESUMED':  setIsPaused(false); break;
      case 'QUESTION_STARTED':
        // Extend time: backend sends QUESTION_STARTED with extraSeconds when host extends
        if (event.payload.extraSeconds) {
          setTimeLeft(t => t + event.payload.extraSeconds);
        }
        break;
      case 'SESSION_ENDED':
        navigate(`/live/results/${sessionId}`, {
          replace: true, state: { leaderboard: event.payload.leaderboard, myParticipantId: participantId },
        });
        break;
      case 'PARTICIPANT_KICKED':
        if (String(event.payload.participantId) === String(participantId)) {
          navigate('/live/join', { replace: true });
        }
        break;
      default: break;
    }
  }, [navigate, sessionId, participantId]);

  const handleQuestion = useCallback((q) => {
    setQuestion(q);
    setCountdown(3);
    setPhase('countdown');
    setSelectedOption(null);
    setAnswerResult(null);
    setQuestionResult(null);
    setMyRank(null);
  }, []);

  const handleQuestionResult = useCallback((result) => {
    setQuestionResult(result);
    // find my rank
    const me = result.leaderboard?.find(e => String(e.participantId) === String(participantId));
    if (me) { setMyRank(me.rank); setTotalScore(me.totalScore); }
    setPhase('result');
  }, [participantId]);

  useLiveSession(Number(sessionId), {
    onEvent: handleEvent,
    onQuestion: handleQuestion,
    onQuestionResult: handleQuestionResult,
  });

  // ── Submit answer ─────────────────────────────────────────────────────────────
  async function submitAnswer(option) {
    if (submitting || selectedOption || phase !== 'question') return;
    setSelectedOption(option);
    setSubmitting(true);
    const responseTimeMs = Date.now() - (questionStartRef.current || Date.now());
    try {
      const { data } = await API.post(
        `/live/sessions/${sessionId}/participants/${participantId}/answers`,
        { questionId: question.questionId, selectedOption: option, responseTimeMs }
      );
      setAnswerResult(data);
      setTotalScore(data.totalScore);
      setPhase('answered');
    } catch {
      setPhase('answered');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Keyboard 1-4 shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'question') return;
    const map = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
    const handler = (e) => { const o = map[e.key]; if (o) submitAnswer(o); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, question]);

  const timerPct = timeLimitTotal > 0 ? (timeLeft / timeLimitTotal) * 100 : 100;
  const timerUrgent = timeLeft <= 5 && phase === 'question';

  // ════════════════════════════════════════════════════════════════════════════════
  // WAITING
  // ════════════════════════════════════════════════════════════════════════════════
  if (phase === 'waiting') {
    return (
      <div className="kh-waiting">
        <div className="kh-waiting-logo">⚡</div>
        <h2>Get ready!</h2>
        <p>The host will start soon…</p>
        <div className="kh-dots"><span /><span /><span /></div>
        <div className="kh-score-badge">Score: {totalScore}</div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // 3-2-1 COUNTDOWN
  // ════════════════════════════════════════════════════════════════════════════════
  if (phase === 'countdown') {
    return (
      <div className="kh-countdown-screen">
        <div className="kh-countdown-q">
          Q{(question?.questionIndex || 0) + 1} / {question?.totalQuestions}
        </div>
        <div className="kh-countdown-number" key={countdown}>{countdown || 'GO!'}</div>
        <p className="kh-countdown-hint">Get ready to answer…</p>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // QUESTION + ANSWERED (same layout, buttons lock after answer)
  // ════════════════════════════════════════════════════════════════════════════════
  if ((phase === 'question' || phase === 'answered') && question) {
    const locked = phase === 'answered';
    return (
      <div className="kh-question-screen">
        {isPaused && (
          <div className="kh-pause-overlay">
            <div className="kh-pause-icon">⏸</div>
            <p>Game paused by host</p>
          </div>
        )}

        {/* Top bar: progress + timer */}
        <div className="kh-top-bar">
          <div className="kh-progress-pill">
            Q{(question.questionIndex || 0) + 1}/{question.totalQuestions}
          </div>
          <div className={`kh-timer-ring ${timerUrgent ? 'urgent' : ''}`}>
            <svg viewBox="0 0 44 44">
              <circle cx="22" cy="22" r="18" />
              <circle
                cx="22" cy="22" r="18"
                className="kh-timer-arc"
                style={{ strokeDashoffset: `${(1 - timerPct / 100) * 113}px` }}
              />
            </svg>
            <span>{timeLeft}</span>
          </div>
          <div className="kh-score-pill">{totalScore} pts</div>
        </div>

        {/* Timer bar */}
        <div className="kh-timer-strip">
          <div
            className={`kh-timer-fill ${timerUrgent ? 'urgent' : ''}`}
            style={{ width: `${timerPct}%` }}
          />
        </div>

        {/* Question text */}
        <div className="kh-question-box">
          <p className="kh-question-text">{question.questionStem}</p>
        </div>

        {/* Feedback banner when answered */}
        {locked && (
          <div className={`kh-feedback-banner ${
            !answerResult ? 'timeout' : answerResult.correct ? 'correct' : 'wrong'
          }`}>
            {!answerResult && '⏰ Time\'s up!'}
            {answerResult && answerResult.correct && `✅ Correct! +${answerResult.pointsEarned} pts`}
            {answerResult && !answerResult.correct && '❌ Wrong answer'}
          </div>
        )}

        {/* Answer grid — Kahoot style full-width color blocks */}
        <div className="kh-answers-grid">
          {['A', 'B', 'C', 'D'].map(opt => {
            const text = question[`option${opt}`];
            if (!text) return null;
            let mod = '';
            if (locked) {
              if (selectedOption === opt) mod = answerResult?.correct ? 'chosen-correct' : 'chosen-wrong';
              else mod = 'dimmed';
            }
            return (
              <button
                key={opt}
                className={`kh-answer-btn kh-answer-btn--${opt} ${mod}`}
                onClick={() => submitAnswer(opt)}
                disabled={locked}
              >
                <span className="kh-answer-icon">{ICONS[opt]}</span>
                <span className="kh-answer-text">{text}</span>
              </button>
            );
          })}
        </div>

        {locked && !answerResult && (
          <p className="kh-waiting-result">Waiting for results…</p>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // RESULT — correct answer reveal + leaderboard
  // ════════════════════════════════════════════════════════════════════════════════
  if (phase === 'result' && questionResult) {
    const correct = questionResult.correctAnswer;
    const isCorrect = selectedOption === correct;
    return (
      <div className="kh-result-screen">
        {/* Correct answer reveal */}
        <div className="kh-reveal-header">
          <div className={`kh-reveal-badge kh-answer-btn--${correct}`}>
            <span className="kh-answer-icon">{ICONS[correct]}</span>
            Correct: {questionResult[`option${correct}`] || correct}
          </div>
          {isCorrect
            ? <p className="kh-reveal-you correct">🎉 You got it right!</p>
            : selectedOption
              ? <p className="kh-reveal-you wrong">😅 Better luck next time</p>
              : <p className="kh-reveal-you timeout">⏰ Time ran out</p>
          }
        </div>

        {/* Leaderboard */}
        {questionResult.leaderboard?.length > 0 && (
          <div className="kh-leaderboard-panel">
            <div className="kh-lb-title">🏆 Leaderboard</div>
            {questionResult.leaderboard.slice(0, 5).map((entry, i) => {
              const isMe = String(entry.participantId) === String(participantId);
              const medals = ['🥇', '🥈', '🥉'];
              return (
                <div key={entry.participantId} className={`kh-lb-row ${isMe ? 'me' : ''}`} style={{ animationDelay: `${i * 0.1}s` }}>
                  <span className="kh-lb-pos">{medals[i] || `#${entry.rank}`}</span>
                  <span className="kh-lb-name">{entry.displayName}{isMe ? ' (You)' : ''}</span>
                  <span className="kh-lb-score">{entry.totalScore}</span>
                </div>
              );
            })}
            {myRank > 5 && (
              <div className="kh-lb-row me kh-lb-you-below">
                <span className="kh-lb-pos">#{myRank}</span>
                <span className="kh-lb-name">You</span>
                <span className="kh-lb-score">{totalScore}</span>
              </div>
            )}
          </div>
        )}

        <p className="kh-next-hint">Next question coming up…</p>
      </div>
    );
  }

  return null;
}
