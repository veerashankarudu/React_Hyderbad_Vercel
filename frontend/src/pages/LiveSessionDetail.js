import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import Navbar from '../components/Navbar';
import './LiveSessionDetail.css';

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleString();
}

function formatDuration(startedAt, endedAt) {
  if (!startedAt || !endedAt) return '—';
  const ms = new Date(endedAt) - new Date(startedAt);
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function LiveSessionDetail() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterName, setFilterName] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [lbRes, sessRes] = await Promise.all([
          API.get(`/live/sessions/${sessionId}/leaderboard`),
          API.get(`/live/sessions/${sessionId}/summary`),
        ]);
        setLeaderboard(lbRes.data);
        // Only treat as "not available" if session was never started (abandoned)
        if (sessRes.data.startedAt) {
          setSession(sessRes.data);
        }
        // else session exists but was abandoned → session stays null → shows "Not Available"
      } catch (e) {
        setError('Failed to load session details.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId]);

  const filtered = leaderboard.filter(p =>
    !filterName || (p.displayName || '').toLowerCase().includes(filterName.toLowerCase())
  );

  const totalPlayers = leaderboard.length;
  const avgScore = totalPlayers
    ? Math.round(leaderboard.reduce((a, c) => a + (c.totalScore || 0), 0) / totalPlayers)
    : 0;
  const topScore = leaderboard[0]?.totalScore || 0;
  const winner = leaderboard[0]?.displayName || '—';

  // ── CSV Download ────────────────────────────────────────────────────────────
  const downloadCSV = () => {
    const headers = ['Rank', 'Name', 'Score', 'Joined At'];
    const rows = filtered.map(p => [
      p.rank || filtered.indexOf(p) + 1,
      `"${(p.displayName || '').replace(/"/g, '""')}"`,
      p.totalScore || 0,
      `"${formatDate(p.joinedAt)}"`,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `live_session_${sessionId}_results.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ── PDF Download ─────────────────────────────────────────────────────────────
  const downloadPDF = () => {
    const rows = filtered.map(p => `
      <tr>
        <td>${p.rank || filtered.indexOf(p) + 1}</td>
        <td>${p.displayName || ''}</td>
        <td><strong>${p.totalScore || 0}</strong></td>
        <td>${formatDate(p.joinedAt)}</td>
      </tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
      <title>Live Session ${sessionId} – Results</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        .meta { color: #555; font-size: 11px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #5b21b6; color: #fff; padding: 7px 6px; text-align: left; font-size: 11px; }
        td { padding: 6px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
        tr:nth-child(even) td { background: #f9f5ff; }
        .podium { display: flex; gap: 16px; margin-bottom: 16px; }
        .pod { text-align: center; padding: 8px 16px; border-radius: 8px; background: #f3e8ff; }
        .pod .rank { font-size: 22px; }
        .pod .name { font-weight: bold; font-size: 13px; }
        .pod .score { color: #5b21b6; font-weight: bold; }
      </style></head><body>
      <h1>${session?.quizTitle || 'Live Quiz'} – Session Results</h1>
      <div class="meta">Session PIN: ${session?.pin || sessionId} &nbsp;|&nbsp; Date: ${formatDate(session?.startedAt)} &nbsp;|&nbsp; Players: ${totalPlayers}</div>
      <div class="podium">
        ${leaderboard.slice(0, 3).map((p, i) => `
          <div class="pod">
            <div class="rank">${['🥇','🥈','🥉'][i]}</div>
            <div class="name">${p.displayName}</div>
            <div class="score">${p.totalScore} pts</div>
          </div>`).join('')}
      </div>
      <table>
        <thead><tr><th>#</th><th>Name</th><th>Score</th><th>Joined At</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:12px;color:#888;font-size:10px">Generated: ${new Date().toLocaleString()}</p>
      </body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.print();
  };

  const rankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <>
      <Navbar />
      <div className="lsd-page">
        {/* Header */}
        <div className="lsd-header">
          <button className="lsd-back" onClick={() => navigate('/live')}>← Back</button>
          <div className="lsd-title-group">
            <h1 className="lsd-title">
              {session?.quizTitle || `Session #${sessionId}`}
            </h1>
            <p className="lsd-subtitle">
              PIN: <strong>{session?.pin || '—'}</strong> &nbsp;·&nbsp;
              {formatDate(session?.startedAt)} &nbsp;·&nbsp;
              Duration: {formatDuration(session?.startedAt, session?.endedAt || session?.createdAt)}
            </p>
          </div>
        </div>

        {error && <div className="lsd-error">{error}</div>}
        {loading && <div className="lsd-loading">Loading session details…</div>}

        {/* Session was abandoned (ended before quiz started) */}
        {!loading && !error && !session && (
          <div className="lsd-empty-state">
            <div className="lsd-empty-icon">⚠️</div>
            <h2>Session Not Available</h2>
            <p>This session was ended before the quiz was started — no results to display.</p>
            <button className="lsd-back" onClick={() => navigate('/live')}>← Back to Sessions</button>
          </div>
        )}

        {!loading && !error && session && (
          <>
            {/* Summary cards */}
            <div className="lsd-summary-row">
              <div className="lsd-card">
                <div className="lsd-card-value">{totalPlayers}</div>
                <div className="lsd-card-label">Players</div>
              </div>
              <div className="lsd-card">
                <div className="lsd-card-value">{avgScore}</div>
                <div className="lsd-card-label">Avg Score</div>
              </div>
              <div className="lsd-card lsd-card--gold">
                <div className="lsd-card-value">{topScore}</div>
                <div className="lsd-card-label">Top Score</div>
              </div>
              <div className="lsd-card lsd-card--winner">
                <div className="lsd-card-value lsd-card-winner-name">🏆 {winner}</div>
                <div className="lsd-card-label">Winner</div>
              </div>
            </div>

            {/* Podium — top 3 */}
            {leaderboard.length >= 1 && (
              <div className="lsd-podium-section">
                <h3 className="lsd-section-title">🏆 Podium</h3>
                <div className="lsd-podium">
                  {/* 2nd place */}
                  {leaderboard[1] && (
                    <div className="lsd-pod lsd-pod--2nd">
                      <div className="lsd-pod-medal">🥈</div>
                      <div className="lsd-pod-name">{leaderboard[1].displayName}</div>
                      <div className="lsd-pod-score">{leaderboard[1].totalScore} pts</div>
                      <div className="lsd-pod-bar lsd-pod-bar--2nd" />
                    </div>
                  )}
                  {/* 1st place */}
                  <div className="lsd-pod lsd-pod--1st">
                    <div className="lsd-pod-crown">👑</div>
                    <div className="lsd-pod-medal">🥇</div>
                    <div className="lsd-pod-name">{leaderboard[0].displayName}</div>
                    <div className="lsd-pod-score">{leaderboard[0].totalScore} pts</div>
                    <div className="lsd-pod-bar lsd-pod-bar--1st" />
                  </div>
                  {/* 3rd place */}
                  {leaderboard[2] && (
                    <div className="lsd-pod lsd-pod--3rd">
                      <div className="lsd-pod-medal">🥉</div>
                      <div className="lsd-pod-name">{leaderboard[2].displayName}</div>
                      <div className="lsd-pod-score">{leaderboard[2].totalScore} pts</div>
                      <div className="lsd-pod-bar lsd-pod-bar--3rd" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Full leaderboard table */}
            <div className="lsd-table-section">
              <div className="lsd-table-toolbar">
                <h3 className="lsd-section-title" style={{ margin: 0 }}>Full Leaderboard</h3>
                <div className="lsd-toolbar-right">
                  <input
                    className="lsd-search"
                    type="text"
                    placeholder="Search player…"
                    value={filterName}
                    onChange={e => setFilterName(e.target.value)}
                  />
                  <button className="lsd-btn-dl csv" onClick={downloadCSV} title="Download CSV">⬇ CSV</button>
                  <button className="lsd-btn-dl pdf" onClick={downloadPDF} title="Download PDF">⬇ PDF</button>
                </div>
              </div>

              {filtered.length === 0 ? (
                <p className="lsd-empty">No players found.</p>
              ) : (
                <div className="lsd-table-wrap">
                  <table className="lsd-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Player</th>
                        <th>Score</th>
                        <th>Joined At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((p, i) => {
                        const rank = p.rank || i + 1;
                        return (
                          <tr key={p.participantId} className={rank <= 3 ? 'lsd-row--top' : ''}>
                            <td className="lsd-rank-cell">{rankIcon(rank)}</td>
                            <td className="lsd-name-cell">
                              <span className="lsd-player-name">{p.displayName}</span>
                            </td>
                            <td className="lsd-score-cell">
                              <span className="lsd-score-badge">{p.totalScore || 0}</span>
                            </td>
                            <td className="lsd-date-cell">{formatDate(p.joinedAt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
