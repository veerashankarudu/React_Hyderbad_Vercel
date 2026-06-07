import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import API from '../api';
import './LiveJoin.css';

export default function LiveJoin() {
  const { pin: pinParam } = useParams();
  const [searchParams] = useSearchParams();
  const queryPin = searchParams.get('pin');
  const initialPin = pinParam || queryPin || '';
  const navigate = useNavigate();

  const [pin, setPin] = useState(initialPin);
  const [displayName, setDisplayName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [step, setStep] = useState(initialPin ? 'name' : 'pin');  // 'pin' | 'name' | 'loading'
  const [sessionInfo, setSessionInfo] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialPin) {
      validatePin(initialPin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function validatePin(pinValue) {
    setError('');
    setStep('loading');
    try {
      const { data } = await API.get(`/live/sessions/${pinValue}/validate`);
      setSessionInfo(data);
      setStep('name');
    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid or expired PIN';
      setError(msg);
      setStep('pin');
    }
  }

  async function handlePinSubmit(e) {
    e.preventDefault();
    const cleanPin = pin.trim().replace(/\s/g, '');
    if (cleanPin.length !== 6) {
      setError('PIN must be exactly 6 digits');
      return;
    }
    await validatePin(cleanPin);
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }
    setError('');
    setStep('loading');
    try {
      const cleanPin = pin.trim().replace(/\s/g, '');
      const { data } = await API.post(`/live/sessions/${cleanPin}/join`, {
        displayName: displayName.trim(),
        teamName: sessionInfo?.teamMode ? teamName.trim() || null : null,
      });
      // Store rejoin token locally for reconnects
      sessionStorage.setItem(`live_rejoin_${data.sessionId}`, data.rejoinToken);
      sessionStorage.setItem(`live_participant_${data.sessionId}`, JSON.stringify({
        participantId: data.participantId,
        displayName: data.displayName,
      }));
      navigate(`/live/lobby/${data.sessionId}`, { state: { joinData: data } });
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to join session';
      setError(msg);
      setStep('name');
    }
  }

  function handlePinChange(e) {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(val);
  }

  return (
    <div className="live-join-container">
      <div className="live-join-card">
        <div className="live-join-logo">
          <span className="live-badge">LIVE</span>
          <h1>Quiz Battle</h1>
          <p className="live-join-subtitle">Enter a game PIN to join</p>
        </div>

        {step === 'pin' && (
          <form className="live-join-form" onSubmit={handlePinSubmit}>
            <div className="pin-input-wrapper">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="pin-input"
                placeholder="000000"
                value={pin}
                onChange={handlePinChange}
                maxLength={6}
                autoFocus
                aria-label="Game PIN"
              />
            </div>
            {error && <p className="live-join-error">{error}</p>}
            <button
              type="submit"
              className="live-join-btn primary"
              disabled={pin.length !== 6}
            >
              Enter
            </button>
          </form>
        )}

        {step === 'loading' && (
          <div className="live-join-loading">
            <div className="live-spinner" />
            <p>Connecting…</p>
          </div>
        )}

        {step === 'name' && sessionInfo && (
          <form className="live-join-form" onSubmit={handleJoin}>
            <div className="session-preview">
              <p className="session-quiz-title">{sessionInfo.quizTitle}</p>
              <p className="session-participants">
                {sessionInfo.participantCount} player{sessionInfo.participantCount !== 1 ? 's' : ''} waiting
              </p>
              {sessionInfo.sessionMode === 'POLL' && (
                <p className="session-mode-info">📊 Anonymous Poll Mode — no scoring</p>
              )}
              {sessionInfo.teamMode && (
                <p className="session-mode-info">👥 Team Battle Mode</p>
              )}
            </div>
            <input
              type="text"
              className="name-input"
              placeholder="Your display name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={50}
              autoFocus
              aria-label="Display name"
            />
            {sessionInfo.teamMode && (
              <input
                type="text"
                className="name-input"
                placeholder="Team name (e.g. Team Alpha)"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                maxLength={50}
                aria-label="Team name"
                style={{ marginTop: '0.75rem' }}
              />
            )}
            {error && <p className="live-join-error">{error}</p>}
            <button
              type="submit"
              className="live-join-btn primary"
              disabled={!displayName.trim()}
            >
              Join Game!
            </button>
            <button
              type="button"
              className="live-join-btn secondary"
              onClick={() => { setStep('pin'); setError(''); setSessionInfo(null); }}
            >
              Change PIN
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
