import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../AuthContext';
import API from '../api';
import Navbar from '../components/Navbar';
import './LiveQuiz.css';

const STATUS_LABEL = {
  WAITING: 'Waiting',
  ACTIVE: 'Live',
  ENDED: 'Ended',
};

const STATUS_CLASS = {
  WAITING: 'status-waiting',
  ACTIVE: 'status-active',
  ENDED: 'status-ended',
};

function formatDate(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function LiveQuiz() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [participatedSessions, setParticipatedSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Create form state ─────────────────────────────────────────────────────
  const [techStacks, setTechStacks] = useState([]);
  const [topics, setTopics] = useState([]);
  const [form, setForm] = useState({
    title: '',
    techStackName: '',
    topicName: '',
    difficulty: '',
    questionCount: 10,
    timeLimitSeconds: 30,
    sessionMode: 'BATTLE',
    teamMode: false,
    adaptiveDifficulty: false,
    recordingEnabled: false,
    cohostEnterpriseId: '',
  });
  const [creating, setCreating] = useState(false);

  const isSmeOrAdmin = user?.role === 'SME' || user?.role === 'ADMIN';

  const loadSessions = useCallback(async () => {
    try {
      const [hostedRes, participatedRes] = await Promise.allSettled([
        isSmeOrAdmin ? API.get('/live/sessions/my-sessions') : Promise.resolve({ data: [] }),
        API.get('/live/sessions/participated-sessions'),
      ]);
      if (hostedRes.status === 'fulfilled') setSessions(hostedRes.value.data);
      if (participatedRes.status === 'fulfilled') setParticipatedSessions(participatedRes.value.data);
    } catch {
      setError('Failed to load your live sessions.');
    } finally {
      setLoading(false);
    }
  }, [isSmeOrAdmin]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // ── Load master data for create form ─────────────────────────────────────
  useEffect(() => {
    if (!isSmeOrAdmin) return;
    const cached = key => { try { const v = sessionStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } };
    const cache = (key, data) => { try { sessionStorage.setItem(key, JSON.stringify(data)); } catch {} };

    const cachedTS = cached('master_techStacks');
    if (cachedTS) setTechStacks(cachedTS);
    else API.get('/master/tech-stacks').then(r => {
      const d = Array.isArray(r.data) ? r.data : (r.data.content || []);
      setTechStacks(d); cache('master_techStacks', d);
    }).catch(() => {});

    const cachedTopics = cached('master_allTopics');
    if (cachedTopics) setTopics(cachedTopics);
    else API.get('/master/tech-stacks').then(async r => {
      const stacks = Array.isArray(r.data) ? r.data : (r.data.content || []);
      const all = [];
      for (const ts of stacks) {
        try {
          const t = await API.get(`/master/tech-stacks/${ts.id}/topics`);
          (Array.isArray(t.data) ? t.data : []).forEach(tp => { if (!all.find(x => x.name === tp.name)) all.push(tp); });
        } catch {}
      }
      setTopics(all); cache('master_allTopics', all);
    }).catch(() => {});
  }, [isSmeOrAdmin]);

  const handle = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const createLiveQuiz = async () => {
    if (!form.title.trim()) { toast.error('Please enter a quiz title.'); return; }
    setCreating(true);
    try {
      // Step 1: create a quiz session to pick questions
      const qsRes = await API.post('/quiz-sessions', {
        title: form.title.trim(),
        techStackName: form.techStackName || null,
        topicName: form.topicName || null,
        difficulty: form.difficulty || null,
        questionCount: form.questionCount,
        timeLimitMinutes: 30,
        linkValidHours: 168,
      });
      if (qsRes.data.error) { toast.error(qsRes.data.error); return; }
      const quizId = qsRes.data.id;

      // Step 2: create live session with the quiz
      const lsRes = await API.post('/live/sessions', {
        quizId,
        timeLimitSeconds: form.timeLimitSeconds,
        sessionMode: form.sessionMode,
        teamMode: form.teamMode,
        adaptiveDifficulty: form.adaptiveDifficulty,
        recordingEnabled: form.recordingEnabled,
        cohostEnterpriseId: form.cohostEnterpriseId || null,
      });
      const session = lsRes.data;
      toast.success(`Live quiz created! PIN: ${session.pin}`);
      setForm({ title: '', techStackName: '', topicName: '', difficulty: '', questionCount: 10, timeLimitSeconds: 30, sessionMode: 'BATTLE', teamMode: false, adaptiveDifficulty: false, recordingEnabled: false, cohostEnterpriseId: '' });
      loadSessions();
      navigate(`/live/host/${session.id}`, { state: { session } });
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to create live quiz.');
    } finally {
      setCreating(false);
    }
  };

  function handleJoinGame() {
    navigate('/live/join');
  }

  function handleGoToSession(session) {
    if (session.status === 'WAITING' || session.status === 'ACTIVE') {
      navigate(`/live/host/${session.id}`, { state: { session } });
    } else {
      navigate(`/live/sessions/${session.id}`);
    }
  }

  const activeSessions = sessions.filter(s => s.status === 'WAITING' || s.status === 'ACTIVE');
  const pastHostedSessions = sessions.filter(s => s.status === 'ENDED' && s.startedAt);

  // Deduplicate participated sessions: exclude any session already shown in hosted list
  const hostedIds = new Set(sessions.map(s => s.id));
  const pastParticipated = participatedSessions.filter(s => !hostedIds.has(s.id));

  const hasPastSessions = pastHostedSessions.length > 0 || pastParticipated.length > 0;

  return (
    <div className="app-layout">
      <Navbar />
      <main className="app-main">
      <div className="lq-page">
      {/* Header */}
      <div className="lq-header">
        <div className="lq-header-left">
          <span className="lq-bolt">⚡</span>
          <div>
            <h1 className="lq-title">Live Quiz Battle</h1>
            <p className="lq-subtitle">Host a Kahoot-style live quiz or join a game</p>
          </div>
        </div>
        <button className="lq-join-btn" onClick={handleJoinGame}>
          🎮 Join a Game
        </button>
      </div>

      {/* Create Live Quiz — SME/ADMIN only */}
      {isSmeOrAdmin && (
        <section className="lq-section">
          <div className="lq-create-card">
            <div className="lq-create-header">
              <h2 className="lq-create-title">⚡ Create Live Quiz</h2>
              <p className="lq-create-subtitle">Generate questions from the question bank and launch a Kahoot-style battle</p>
            </div>
            <div className="lq-create-form">
              <div className="lq-form-row lq-form-row-full">
                <label htmlFor="lq-title">Quiz Title</label>
                <input
                  id="lq-title"
                  type="text"
                  className="lq-input"
                  placeholder="e.g. Spring Boot Live Battle – Batch 3"
                  value={form.title}
                  onChange={e => handle('title', e.target.value)}
                />
              </div>
              <div className="lq-form-row">
                <label htmlFor="lq-techstack">Tech Stack <span className="lq-opt">(optional)</span></label>
                <select id="lq-techstack" className="lq-select" value={form.techStackName} onChange={e => handle('techStackName', e.target.value)}>
                  <option value="">All Tech Stacks</option>
                  {techStacks.map(ts => <option key={ts.id} value={ts.name}>{ts.name}</option>)}
                </select>
              </div>
              <div className="lq-form-row">
                <label htmlFor="lq-topic">Topic <span className="lq-opt">(optional)</span></label>
                <select id="lq-topic" className="lq-select" value={form.topicName} onChange={e => handle('topicName', e.target.value)}>
                  <option value="">All Topics</option>
                  {topics.map(tp => <option key={tp.id} value={tp.name}>{tp.name}</option>)}
                </select>
              </div>
              <div className="lq-form-row">
                <label htmlFor="lq-difficulty">Difficulty</label>
                <select id="lq-difficulty" className="lq-select" value={form.difficulty} onChange={e => handle('difficulty', e.target.value)}>
                  <option value="">Any</option>
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>
              <div className="lq-form-row">
                <label htmlFor="lq-qcount">Questions</label>
                <select id="lq-qcount" className="lq-select" value={form.questionCount} onChange={e => handle('questionCount', Number(e.target.value))}>
                  {[5, 10, 15, 20, 25, 30].map(n => <option key={n} value={n}>{n} Questions</option>)}
                </select>
              </div>
              <div className="lq-form-row">
                <label htmlFor="lq-timelimit">Time per Question</label>
                <select id="lq-timelimit" className="lq-select" value={form.timeLimitSeconds} onChange={e => handle('timeLimitSeconds', Number(e.target.value))}>
                  {[10, 15, 20, 30, 45, 60, 90, 120].map(n => <option key={n} value={n}>{n}s per question</option>)}
                </select>
              </div>

              {/* ── Phase 2: Advanced Options ────────────────────────────── */}
              <div className="lq-form-row lq-form-row-full">
                <label className="lq-advanced-label">⚙️ Advanced Options</label>
              </div>
              <div className="lq-form-row">
                <label htmlFor="lq-mode">Session Mode</label>
                <select id="lq-mode" className="lq-select" value={form.sessionMode} onChange={e => handle('sessionMode', e.target.value)}>
                  <option value="BATTLE">⚔️ Battle (Scored)</option>
                  <option value="POLL">📊 Poll (Anonymous, No Scoring)</option>
                </select>
              </div>
              <div className="lq-form-row">
                <label htmlFor="lq-cohost">Co-Host <span className="lq-opt">(optional)</span></label>
                <input
                  id="lq-cohost"
                  type="text"
                  className="lq-input"
                  placeholder="Enterprise ID of co-host"
                  value={form.cohostEnterpriseId}
                  onChange={e => handle('cohostEnterpriseId', e.target.value)}
                />
              </div>
              <div className="lq-form-row lq-form-row-full lq-toggles">
                <label className="lq-toggle">
                  <input type="checkbox" checked={form.teamMode} onChange={e => handle('teamMode', e.target.checked)} />
                  <span>👥 Team Battle Mode</span>
                </label>
                <label className="lq-toggle">
                  <input type="checkbox" checked={form.adaptiveDifficulty} onChange={e => handle('adaptiveDifficulty', e.target.checked)} />
                  <span>🧠 Adaptive Difficulty</span>
                </label>
                <label className="lq-toggle">
                  <input type="checkbox" checked={form.recordingEnabled} onChange={e => handle('recordingEnabled', e.target.checked)} />
                  <span>🎥 Record Session (Replay)</span>
                </label>
              </div>

              <div className="lq-form-actions">
                <button className="lq-create-btn" onClick={createLiveQuiz} disabled={creating}>
                  {creating ? '⏳ Generating...' : '⚡ Generate Live Quiz'}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Active sessions — hosts only */}
      {isSmeOrAdmin && (
        <section className="lq-section">
          <h2 className="lq-section-title">
            <span className="lq-dot lq-dot--live" /> Active Sessions
          </h2>
          {loading ? (
            <div className="lq-spinner-wrap"><div className="lq-spinner" /></div>
          ) : null}
          {!loading && error ? (
            <p className="lq-error">{error}</p>
          ) : null}
          {!loading && !error && activeSessions.length === 0 ? (
            <div className="lq-empty">
              <p>No active sessions. Use the form above to generate and launch a live quiz!</p>
            </div>
          ) : null}
          {!loading && !error && activeSessions.length > 0 ? (
            <div className="lq-cards">
              {activeSessions.map(s => (
                <SessionCard key={s.id} session={s} onOpen={handleGoToSession} />
              ))}
            </div>
          ) : null}
        </section>
      )}

      {/* Past sessions — everyone sees their hosted + participated */}
      <section className="lq-section">
        <h2 className="lq-section-title">
          <span className="lq-dot lq-dot--ended" /> Past Sessions
        </h2>
        {loading && <div className="lq-spinner-wrap"><div className="lq-spinner" /></div>}
        {!loading && !hasPastSessions ? (
          <p className="lq-muted">No completed sessions yet.</p>
        ) : null}
        {!loading && pastHostedSessions.length > 0 && (
          <>
            {pastParticipated.length > 0 && (
              <p className="lq-subsection-label">Hosted by you</p>
            )}
            <div className="lq-cards">
              {pastHostedSessions.map(s => (
                <SessionCard key={s.id} session={s} onOpen={handleGoToSession} label="Host" />
              ))}
            </div>
          </>
        )}
        {!loading && pastParticipated.length > 0 && (
          <>
            {pastHostedSessions.length > 0 && (
              <p className="lq-subsection-label" style={{ marginTop: '1rem' }}>Sessions you played</p>
            )}
            <div className="lq-cards">
              {pastParticipated.map(s => (
                <SessionCard key={s.id} session={s} onOpen={handleGoToSession} label="Player" />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
      </main>
    </div>
  );
}

function SessionCard({ session, onOpen, label }) {
  const isLive = session.status === 'ACTIVE';
  const isWaiting = session.status === 'WAITING';

  const copyInviteLink = (e) => {
    e.stopPropagation();
    const link = `${window.location.origin}/live/join?pin=${session.pin}`;
    navigator.clipboard.writeText(link).then(() => {
      toast.success('Invite link copied!');
    }).catch(() => {
      toast.info(`PIN: ${session.pin}`);
    });
  };

  return (
    <button
      className={`lq-card ${isLive ? 'lq-card--live' : ''}`}
      onClick={() => onOpen(session)}
      type="button"
    >
      <div className="lq-card-top">
        <div className="lq-card-title">
          {session.quizTitle}
          {session.teamMode && <span className="lq-mode-badge lq-mode-badge--team">👥 Team</span>}
          {session.sessionMode === 'POLL' && <span className="lq-mode-badge lq-mode-badge--poll">📊 Poll</span>}
          {session.adaptiveDifficulty && <span className="lq-mode-badge lq-mode-badge--adaptive">🧠 Adaptive</span>}
          {session.recordingEnabled && <span className="lq-mode-badge lq-mode-badge--recording">🎥 Rec</span>}
        </div>
        <span className={`lq-status ${STATUS_CLASS[session.status]}`}>
          {isLive && <span className="lq-pulse" />}
          {STATUS_LABEL[session.status]}
        </span>
      </div>

      <div className="lq-card-meta">
        <span title="PIN">🔑 {session.pin}</span>
        <span title="Questions">❓ {session.totalQuestions}Q</span>
        <span title="Participants">👥 {session.participantCount}</span>
        <span title="Time limit">⏱ {session.timeLimitSeconds}s</span>
        {label && <span className="lq-role-tag">{label === 'Player' ? '🎮 Player' : '🎤 Host'}</span>}
        {(isLive || isWaiting) && (
          <span className="lq-share-btn" title="Copy invite link" onClick={copyInviteLink}>🔗 Share</span>
        )}
      </div>

      {session.winnerDisplayName && (
        <div className="lq-card-winner">
          🥇 <strong>{session.winnerDisplayName}</strong>
          <span className="lq-winner-score">{session.winnerScore} pts</span>
        </div>
      )}

      <div className="lq-card-footer">
        <span className="lq-card-date">{formatDate(session.createdAt)}</span>
        <span className="lq-card-action">
          {isLive || isWaiting ? 'Manage →' : 'View Results →'}
        </span>
      </div>
    </button>
  );
}

SessionCard.propTypes = {
  session: PropTypes.shape({
    id: PropTypes.number.isRequired,
    status: PropTypes.string.isRequired,
    quizTitle: PropTypes.string.isRequired,
    pin: PropTypes.string.isRequired,
    totalQuestions: PropTypes.number.isRequired,
    participantCount: PropTypes.number.isRequired,
    timeLimitSeconds: PropTypes.number.isRequired,
    winnerDisplayName: PropTypes.string,
    winnerScore: PropTypes.number,
    createdAt: PropTypes.string,
  }).isRequired,
  onOpen: PropTypes.func.isRequired,
  label: PropTypes.string,
};
