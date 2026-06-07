import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useLiveSession } from '../hooks/useLiveSession';
import API from '../api';
import './LiveLobby.css';

export default function LiveLobby() {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const joinData = location.state?.joinData;
  const participantId = joinData?.participantId;
  const displayName = joinData?.displayName;
  const quizTitle = joinData?.quizTitle;

  const [participants, setParticipants] = useState([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);

  useLiveSession(Number(sessionId), {
    onEvent: (event) => {
      switch (event.type) {
        case 'PARTICIPANT_JOINED':
          setParticipantCount(event.payload.participantCount || 0);
          setParticipants(prev => {
            const exists = prev.some(p => p.participantId === event.payload.participantId);
            if (exists) return prev;
            return [...prev, {
              participantId: event.payload.participantId,
              displayName: event.payload.displayName,
            }];
          });
          break;
        case 'SESSION_STARTED':
          // Will transition via QUESTION_STARTED
          break;
        case 'PARTICIPANT_KICKED':
          if (String(event.payload.participantId) === String(participantId)) {
            navigate('/live/join', { replace: true, state: { error: 'You were removed from the session' } });
          }
          setParticipants(prev => prev.filter(p => p.participantId !== event.payload.participantId));
          break;
        default:
          break;
      }
    },
    onQuestion: (question) => {
      setCurrentQuestion(question);
      navigate(`/live/play/${sessionId}`, {
        replace: true,
        state: { participantId, displayName, question },
      });
    },
  });

  // Redirect if no join data (direct navigation)
  useEffect(() => {
    if (!joinData) {
      // Try to reconnect from sessionStorage
      const stored = sessionStorage.getItem(`live_participant_${sessionId}`);
      if (!stored) {
        navigate('/live/join', { replace: true });
      }
    }
  }, [joinData, sessionId, navigate]);

  // Fetch initial participant count from REST (WebSocket may arrive late)
  useEffect(() => {
    API.get(`/live/sessions/${sessionId}/leaderboard`)
      .then(({ data }) => {
        setParticipantCount(data.length);
        setParticipants(data.map(e => ({ participantId: e.participantId, displayName: e.displayName })));
      })
      .catch(() => {});
  }, [sessionId]);

  return (
    <div className="live-lobby-container">
      <div className="live-lobby-content">
        <div className="live-lobby-header">
          <span className="live-badge-pulse">LIVE</span>
          <h1 className="lobby-quiz-title">{quizTitle || 'Quiz Battle'}</h1>
          <p className="lobby-waiting">Waiting for host to start…</p>
        </div>

        <div className="lobby-your-name">
          <p>You joined as</p>
          <strong>{displayName || 'Player'}</strong>
        </div>

        <div className="lobby-participant-count">
          <div className="participant-number">{participantCount}</div>
          <div className="participant-label">player{participantCount !== 1 ? 's' : ''} in lobby</div>
        </div>

        {participants.length > 0 && (
          <div className="lobby-player-list">
            {participants.slice(-12).map(p => (
              <span key={p.participantId} className="lobby-player-chip">
                {p.displayName}
              </span>
            ))}
          </div>
        )}

        <div className="lobby-pulse-animation">
          <div className="pulse-ring" />
          <div className="pulse-ring delay-1" />
          <div className="pulse-ring delay-2" />
        </div>
      </div>
    </div>
  );
}
