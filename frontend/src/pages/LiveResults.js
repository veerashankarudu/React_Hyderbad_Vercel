import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import API from '../api';
import { generateCertificate } from '../utils/generateCertificate';
import './LiveResults.css';

const PODIUM_COLORS = ['#f9ca24', '#a29bfe', '#fd79a8'];
const PODIUM_ICONS  = ['🥇', '🥈', '🥉'];

const MEDAL_ICONS = { 1: '🥇', 2: '🥈', 3: '🥉' };

function getMedalIcon(rank) {
  return MEDAL_ICONS[rank] || '🎖️';
}

function getPodiumRank(visualIdx) {
  if (visualIdx === 1) return 1;
  if (visualIdx === 0) return 2;
  return 3;
}

export default function LiveResults() {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [leaderboard, setLeaderboard] = useState(location.state?.leaderboard || []);
  const [loading, setLoading] = useState(!location.state?.leaderboard);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  // participantId passed via location.state from LivePlay (player) or LiveHost (host)
  const myParticipantId = location.state?.myParticipantId || null;
  const isHost = user?.role === 'SME' || user?.role === 'ADMIN';

  // Fetch leaderboard if not passed via state
  useEffect(() => {
    if (!location.state?.leaderboard) {
      API.get(`/live/sessions/${sessionId}/leaderboard`)
        .then(({ data }) => { setLeaderboard(data); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [sessionId, location.state]);

  // Confetti animation
  useEffect(() => {
    if (loading || leaderboard.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      w: Math.random() * 10 + 5,
      h: Math.random() * 5 + 3,
      color: ['#6c5ce7', '#a29bfe', '#f9ca24', '#fd79a8', '#00b894', '#e17055'][Math.floor(Math.random() * 6)],
      speed: Math.random() * 3 + 1,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.15,
    }));

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        ctx.save();
        ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
        p.y += p.speed;
        p.angle += p.spin;
        if (p.y > canvas.height) {
          p.y = -10;
          p.x = Math.random() * canvas.width;
        }
      });
      animFrameRef.current = requestAnimationFrame(draw);
    }

    draw();

    // Stop after 8s
    const stop = setTimeout(() => {
      cancelAnimationFrame(animFrameRef.current);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, 8000);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      clearTimeout(stop);
    };
  }, [loading, leaderboard]);

  if (loading) {
    return (
      <div className="live-results-container">
        <div className="results-spinner" />
      </div>
    );
  }

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  // Find current player's result
  const myResult = myParticipantId
    ? leaderboard.find(e => e.participantId === myParticipantId)
    : null;

  return (
    <div className="live-results-container">
      <canvas ref={canvasRef} className="confetti-canvas" />

      <div className="results-content">
        <div className="results-header">
          <span className="results-trophy">🏆</span>
          <h1>Final Results</h1>
          <p className="results-subtitle">Quiz Battle Complete!</p>
        </div>

        {/* Player's personal score card */}
        {myResult && (
          <div className="results-my-score">
            <span className="results-my-icon">
              {getMedalIcon(myResult.rank)}
            </span>
            <div>
              <div className="results-my-name">{myResult.displayName}</div>
              <div className="results-my-detail">
                Rank #{myResult.rank} · {myResult.totalScore} pts
              </div>
            </div>
          </div>
        )}

        {/* Podium */}
        {top3.length > 0 && (
          <div className="podium">
            {/* Re-order: 2nd, 1st, 3rd for visual podium layout */}
            {[top3[1], top3[0], top3[2]].filter(Boolean).map((entry) => {
              const rank = entry.rank || (leaderboard.indexOf(entry) + 1);
              const heights = { 1: '180px', 2: '140px', 3: '100px' };
              return (
                <div
                  key={entry.participantId}
                  className="podium-place"
                  style={{ '--podium-color': PODIUM_COLORS[rank - 1] }}
                >
                  <div className="podium-name">{entry.displayName}</div>
                  <div className="podium-score">{entry.totalScore}</div>
                  <div className="podium-icon">{PODIUM_ICONS[rank - 1]}</div>
                  <div className="podium-bar" style={{ height: heights[rank] || '100px' }}>
                    <span className="podium-rank">#{rank}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Rest of leaderboard */}
        {rest.length > 0 && (
          <div className="results-rest">
            {rest.map(entry => (
              <div key={entry.participantId} className="results-row">
                <span className="results-rank">#{entry.rank}</span>
                <span className="results-name">{entry.displayName}</span>
                <span className="results-score">{entry.totalScore}</span>
              </div>
            ))}
          </div>
        )}

        <div className="results-actions">
          {myResult && (
            <button
              className="results-cert-btn"
              onClick={() => {
                const correctCount = myResult.correctCount || 0;
                const totalQuestions = myResult.totalQuestions || 1;
                const percentage = Math.round((correctCount / totalQuestions) * 100);
                generateCertificate({
                  name: myResult.displayName || user?.fullName || 'Participant',
                  score: correctCount,
                  total: totalQuestions,
                  percentage,
                  rank: myResult.rank <= 3 ? myResult.rank : null,
                  techStack: 'Live Quiz Battle',
                  date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                });
              }}
            >
              🎓 Download Certificate
            </button>
          )}
          <button
            className="results-home-btn"
            onClick={() => navigate('/live/join')}
          >
            🎮 Play Again
          </button>
          {isHost && (
            <button
              className="results-sessions-btn"
              onClick={() => navigate('/live')}
            >
              📋 My Sessions
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
