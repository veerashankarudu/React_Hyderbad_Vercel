import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import API from '../api';
import { useLiveSession } from '../hooks/useLiveSession';
import './LiveHost.css';

export default function LiveHost() {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [session, setSession] = useState(location.state?.session || null);
  const [participants, setParticipants] = useState([]);
  const [phase, setPhase] = useState('lobby'); // lobby | countdown | question | result | ended
  const [countdown, setCountdown] = useState(3);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionResult, setQuestionResult] = useState(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [resultCountdown, setResultCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const showingResultsRef = useRef(false); // guard: only call end-question once per question

  // ── Restore state on page reload ─────────────────────────────────────────────
  useEffect(() => {
    async function restoreState() {
      try {
        const { data: state } = await API.get(`/live/sessions/${sessionId}/state`);
        // Always restore session metadata (PIN, title) in case location.state was lost
        setSession(state);
        if (state.status === 'ENDED') {
          navigate(`/live/results/${sessionId}`, { replace: true });
          return;
        }
        if (state.status === 'ACTIVE') {
          // Reload during an active question — restore question phase
          setIsPaused(state.paused || false);
          setTimeLeft(state.questionTimeLeft || 0);
          if (state.currentQuestion) {
            setCurrentQuestion(state.currentQuestion);
            setAnsweredCount(0);
          }
          showingResultsRef.current = false;
          setPhase('question');
        }
        // Restore participant list from leaderboard
        const { data: lb } = await API.get(`/live/sessions/${sessionId}/leaderboard`);
        if (lb.length > 0) {
          setParticipants(lb.map(e => ({
            participantId: e.participantId,
            displayName: e.displayName,
            totalScore: e.totalScore,
            rank: e.rank,
          })));
        }
      } catch {
        // If fetch fails (e.g. session not found), stay in lobby — error shown if host tries to act
      }
    }
    restoreState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // 3-2-1 countdown on host before question phase
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) { setPhase('question'); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // Timer countdown
  useEffect(() => {
    if (phase !== 'question' || isPaused || timeLeft <= 0) return;
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, isPaused, timeLeft]);

  // Auto-show results when timer hits 0 (host triggers end-question which broadcasts to all)
  useEffect(() => {
    if (phase === 'question' && timeLeft === 0 && !isPaused && !showingResultsRef.current) {
      showingResultsRef.current = true;
      doApiCall(() => API.post(`/live/sessions/${sessionId}/end-question`));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft, isPaused]);

  // Auto-advance to next question after 5s on results screen
  useEffect(() => {
    if (phase !== 'result') return;
    setResultCountdown(5);
  }, [phase, questionResult]);

  useEffect(() => {
    if (phase !== 'result') return;
    if (resultCountdown <= 0) {
      handleNext();
      return;
    }
    const t = setTimeout(() => setResultCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, resultCountdown]);

  const handleEvent = useCallback((event) => {
    switch (event.type) {
      case 'PARTICIPANT_JOINED':
        setParticipants(prev => {
          const exists = prev.some(p => p.participantId === event.payload.participantId);
          if (exists) return prev;
          return [...prev, { participantId: event.payload.participantId, displayName: event.payload.displayName, totalScore: 0 }];
        });
        break;
      case 'PARTICIPANT_KICKED':
        setParticipants(prev => prev.filter(p => p.participantId !== event.payload.participantId));
        break;
      case 'ANSWER_SUBMITTED':
        setAnsweredCount(event.payload.answeredCount || 0);
        break;
      case 'SESSION_PAUSED':
        setIsPaused(true);
        break;
      case 'SESSION_RESUMED':
        setIsPaused(false);
        break;
      case 'QUESTION_STARTED':
        // Extend time: backend sends QUESTION_STARTED with extraSeconds when host extends
        if (event.payload.extraSeconds) {
          setTimeLeft(t => t + event.payload.extraSeconds);
        }
        break;
      case 'SESSION_ENDED':
        setPhase('ended');
        navigate(`/live/results/${sessionId}`, { replace: true, state: { leaderboard: event.payload.leaderboard } });
        break;
      case 'LEADERBOARD_UPDATE':
        if (event.payload.entries) {
          setParticipants(event.payload.entries);
        }
        break;
      default:
        break;
    }
  }, [navigate, sessionId]);

  const handleQuestion = useCallback((question) => {
    showingResultsRef.current = false;
    setCurrentQuestion(question);
    setAnsweredCount(0);
    setTimeLeft(question.timeLimitSeconds);
    setQuestionResult(null);
    setCountdown(3);
    setPhase('countdown'); // show 3-2-1 then transitions to 'question'
  }, []);

  const handleQuestionResult = useCallback((result) => {
    setQuestionResult(result);
    setPhase('result');
    if (result.leaderboard) {
      setParticipants(result.leaderboard.map(e => ({
        participantId: e.participantId,
        displayName: e.displayName,
        totalScore: e.totalScore,
        rank: e.rank,
      })));
    }
  }, []);

  useLiveSession(Number(sessionId), {
    onEvent: handleEvent,
    onQuestion: handleQuestion,
    onQuestionResult: handleQuestionResult,
  });

  // ── Host actions ────────────────────────────────────────────────────────────────

  async function doApiCall(fn) {
    setLoading(true);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err.response?.data?.error || 'Action failed');
    } finally {
      setLoading(false);
    }
  }

  const handleStart = () => doApiCall(() => API.post(`/live/sessions/${sessionId}/start`));
  const handleResumeSession = () => doApiCall(() => API.post(`/live/sessions/${sessionId}/resume`));
  const handleNext = () => doApiCall(() => API.post(`/live/sessions/${sessionId}/next-question`));
  const handleEndQuestion = () => doApiCall(() => API.post(`/live/sessions/${sessionId}/end-question`));
  const handlePause = () => doApiCall(() => API.post(`/live/sessions/${sessionId}/pause`));
  const handleResume = () => doApiCall(() => API.post(`/live/sessions/${sessionId}/resume`));
  const handleExtend = (s) => doApiCall(() => API.post(`/live/sessions/${sessionId}/extend?seconds=${s}`));
  const handleEnd = () => {
    if (!window.confirm('End this session now?')) return;
    doApiCall(() => API.post(`/live/sessions/${sessionId}/end`));
  };
  const handleKick = (participantId, displayName) => {
    if (!window.confirm(`Remove ${displayName} from the session?`)) return;
    doApiCall(() => API.delete(`/live/sessions/${sessionId}/participants/${participantId}`));
  };

  const copyJoinLink = () => {
    const link = `${window.location.origin}/live/join/${session?.pin}`;
    navigator.clipboard.writeText(link).then(() => {
      // Could show a toast here
    });
  };

  const totalParticipants = participants.length;

  return (
    <div className="live-host-container">
      {/* Header */}
      <div className="live-host-header">
        <div className="host-header-left">
          <span className="live-badge">LIVE HOST</span>
          <h1>{session?.quizTitle || 'Quiz Battle'}</h1>
        </div>
        {session?.pin && (
          <div className="host-pin-display" onClick={copyJoinLink} title="Click to copy join link">
            <span className="pin-label">PIN</span>
            <span className="pin-value">{session.pin}</span>
            <span className="pin-copy">📋</span>
          </div>
        )}
        <button className="host-end-btn" onClick={handleEnd} disabled={loading}>
          End Session
        </button>
      </div>

      {error && <div className="host-error">{error}</div>}

      <div className="live-host-body">
        {/* Left: Controls */}
        <div className="host-controls-panel">
          {phase === 'lobby' && (
            <div className="control-section">
              <p className="waiting-text">
                {totalParticipants} player{totalParticipants !== 1 ? 's' : ''} in lobby
              </p>
              <button
                className="host-action-btn start-btn"
                onClick={handleStart}
                disabled={loading || totalParticipants === 0}
              >
                ▶ Start Quiz
              </button>
            </div>
          )}

          {phase === 'countdown' && (
            <div className="host-countdown-panel">
              <div className="host-countdown-label">Get Ready!</div>
              <div className="host-countdown-number">{countdown || '🎉'}</div>
              <div className="host-countdown-q">
                Q{(currentQuestion?.questionIndex || 0) + 1} of {currentQuestion?.totalQuestions}
              </div>
            </div>
          )}

          {phase === 'question' && (
            <div className="control-section">
              <div className="question-progress">
                Q{(currentQuestion?.questionIndex || 0) + 1} / {currentQuestion?.totalQuestions}
              </div>
              {currentQuestion?.questionStem && (
                <div className="host-question-text">{currentQuestion.questionStem}</div>
              )}
              <div className={`host-timer ${timeLeft <= 5 ? 'timer-urgent' : ''}`}>{timeLeft}s</div>
              <div className="answer-tally">
                {answeredCount} / {totalParticipants} answered
              </div>
              <div className="host-action-row">
                {isPaused ? (
                  <button className="host-action-btn resume-btn" onClick={handleResume} disabled={loading}>
                    ▶ Resume
                  </button>
                ) : (
                  <button className="host-action-btn pause-btn" onClick={handlePause} disabled={loading}>
                    ⏸ Pause
                  </button>
                )}
                <button className="host-action-btn next-btn" onClick={handleEndQuestion} disabled={loading}>
                  Show Results
                </button>
              </div>
              <div className="extend-row">
                <span>Add time:</span>
                {[10, 15, 30].map(s => (
                  <button key={s} className="extend-chip" onClick={() => handleExtend(s)} disabled={loading}>
                    +{s}s
                  </button>
                ))}
              </div>
            </div>
          )}

          {phase === 'result' && (
            <div className="control-section">
              <p className="result-label">Question Results</p>
              {questionResult && (
                <div className="option-counts">
                  {Object.entries(questionResult.optionCounts || {}).map(([opt, count]) => (
                    <div key={opt} className={`option-bar ${opt === questionResult.correctAnswer ? 'correct' : ''}`}>
                      <span className="opt-label">{opt}</span>
                      <div className="opt-bar-fill" style={{ width: `${Math.max(4, (count / (totalParticipants || 1)) * 100)}%` }} />
                      <span className="opt-count">{count}</span>
                    </div>
                  ))}
                </div>
              )}
              <button className="host-action-btn next-btn" onClick={handleNext} disabled={loading}>
                {currentQuestion?.questionIndex + 1 >= currentQuestion?.totalQuestions
                  ? 'End & Show Results' : `Next Question → (${resultCountdown}s)`}
              </button>
            </div>
          )}
        </div>

        {/* Right: Participant list */}
        <div className="host-participants-panel">
          <h3>Players ({totalParticipants})</h3>
          <div className="participant-list">
            {participants.map(p => (
              <div key={p.participantId} className="participant-row">
                <span className="p-rank">{p.rank || '–'}</span>
                <span className="p-name">{p.displayName}</span>
                <span className="p-score">{p.totalScore || 0}</span>
                <button
                  className="kick-btn"
                  onClick={() => handleKick(p.participantId, p.displayName)}
                  title="Remove player"
                >
                  ✕
                </button>
              </div>
            ))}
            {participants.length === 0 && (
              <p className="no-players">No players yet — share the PIN!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
