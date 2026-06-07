import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import API from '../api';
import { useAuth } from '../AuthContext';
import SortableTh from '../components/SortableTh';
import TablePagination from '../components/TablePagination';
import { useTranslation } from 'react-i18next';
import './Leaderboard.css';

const MEDALS = ['🥇', '🥈', '🥉'];

const LB_COLUMNS = [
  { key: 'fullName', labelKey: 'lb.colFullName' },
  { key: 'enterpriseId', labelKey: 'lb.colEnterpriseId' },
  { key: 'reviewCount', labelKey: 'lb.colReviewCount' },
];

function getLbVal(r, key) {
  if (key === 'reviewCount') return r.reviewCount ?? 0;
  return (r[key] || '').toString().toLowerCase();
}

function buildInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = ['#7C3AED','#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#84CC16','#EC4899','#14B8A6'];

function rankLabel(idx) {
  if (idx === 0) return '🥇 #1';
  if (idx === 1) return '🥈 #2';
  if (idx === 2) return '🥉 #3';
  return `#${idx + 1}`;
}

function getBadge(rank, reviewCount) {
  if (rank === 0) return { icon: '👑', labelKey: 'lb2.badgeChampion', cls: 'badge-champion' };
  if (reviewCount >= 10) return { icon: '🔥', labelKey: 'lb2.badgeHotStreak', cls: 'badge-hot' };
  if (reviewCount >= 5)  return { icon: '⭐', labelKey: 'lb2.badgeRisingStar', cls: 'badge-star' };
  if (reviewCount >= 3)  return { icon: '💪', labelKey: 'lb2.badgeContributor', cls: 'badge-contrib' };
  return null;
}

function getAssessmentBadge(rank, pct) {
  if (rank === 0) return { icon: '👑', label: 'Topper', cls: 'badge-champion' };
  if (pct >= 90)  return { icon: '🔥', label: 'Expert',    cls: 'badge-hot' };
  if (pct >= 75)  return { icon: '⭐', label: 'Proficient', cls: 'badge-star' };
  if (pct >= 50)  return { icon: '💪', label: 'Learner',   cls: 'badge-contrib' };
  return null;
}

function fmtTime(secs) {
  if (!secs) return '—';
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${m}m ${s}s`;
}

export default function Leaderboard() {
  // ── Mode: 'reviewers' | 'assessment' | 'live' ─────────────────────────────
  const [mode, setMode] = useState('reviewers');

  // ── Reviewer leaderboard state ────────────────────────────────────────────
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState('reviewCount');
  const [sortDir, setSortDir] = useState('desc');
  const [lbPage, setLbPage] = useState(1);
  const [lbPageSize, setLbPageSize] = useState(10);

  // ── Assessment leaderboard state ──────────────────────────────────────────
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [assData, setAssData] = useState([]);
  const [assLoading, setAssLoading] = useState(false);
  const [assError, setAssError] = useState('');
  const [assSearch, setAssSearch] = useState('');
  const [assPage, setAssPage] = useState(1);
  const [assPageSize, setAssPageSize] = useState(10);
  const [topN, setTopN] = useState('');

  // ── Live Quiz leaderboard state ───────────────────────────────────────────
  const [liveSessions, setLiveSessions] = useState([]);
  const [selectedLiveSession, setSelectedLiveSession] = useState('');
  const [liveData, setLiveData] = useState([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState('');
  const [liveSearch, setLiveSearch] = useState('');
  const [livePage, setLivePage] = useState(1);
  const [livePageSize, setLivePageSize] = useState(10);

  const { t } = useTranslation();

  function downloadCSV(rows) {
    const headers = ['Rank', 'Candidate', 'Email', 'Exam', 'Score%', 'Time', 'Date', 'Status', 'Badge'];
    const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [
      headers.join(','),
      ...rows.map(r => {
        const badge = getAssessmentBadge(r.rank - 1, r.percent);
        return [
          r.rank,
          escape(r.candidateName),
          escape(r.candidateEmail),
          escape(r.sessionTitle),
          r.percent,
          fmtTime(r.timeTakenSeconds),
          r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '',
          r.status || '',
          badge ? `${badge.icon} ${badge.label}` : '—',
        ].join(',');
      }),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const examLabel = selectedSession
      ? (sessions.find(s => String(s.id) === String(selectedSession))?.title || 'assessment')
      : 'all-assessments';
    const topLabel = topN ? `-top${topN}` : '';
    a.download = `leaderboard-${examLabel}${topLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  const { user } = useAuth();

  const handleLbSort = (key) => {
    if (sortCol === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }
    else { setSortCol(key); setSortDir(key === 'reviewCount' ? 'desc' : 'asc'); }
    setLbPage(1);
  };

  // Load reviewer leaderboard once
  useEffect(() => {
    API.get('/stats/leaderboard')
      .then(({ data }) => setData(data))
      .catch(() => setError(t('lb2.failedLoad')))
      .finally(() => setLoading(false));
  }, []);

  // Load assessment leaderboard when mode switches or filters change
  const loadAssessment = useCallback(() => {
    setAssLoading(true);
    setAssError('');
    const params = new URLSearchParams();
    if (selectedSession) params.set('sessionId', selectedSession);
    if (fromDate) params.set('from', fromDate);
    if (toDate)   params.set('to', toDate);
    API.get(`/quiz-sessions/assessment-leaderboard?${params}`)
      .then(({ data }) => {
        setSessions(data.sessions || []);
        setAssData(data.leaderboard || []);
        setAssPage(1);
      })
      .catch(() => setAssError('Failed to load assessment leaderboard.'))
      .finally(() => setAssLoading(false));
  }, [selectedSession, fromDate, toDate]);

  useEffect(() => {
    if (mode === 'assessment') loadAssessment();
  }, [mode, loadAssessment]);

  // Also pre-load session list when switching to assessment tab
  useEffect(() => {
    if (mode === 'assessment' && sessions.length === 0) loadAssessment();
  }, [mode]);

  // Load live quiz leaderboard
  const loadLive = useCallback(() => {
    setLiveLoading(true);
    setLiveError('');
    const params = new URLSearchParams();
    if (selectedLiveSession) params.set('sessionId', selectedLiveSession);
    API.get(`/live/sessions/leaderboard?${params}`)
      .then(({ data }) => {
        setLiveSessions(data.sessions || []);
        setLiveData(data.leaderboard || []);
        setLivePage(1);
      })
      .catch(() => setLiveError('Failed to load live quiz leaderboard.'))
      .finally(() => setLiveLoading(false));
  }, [selectedLiveSession]);

  useEffect(() => {
    if (mode === 'live') loadLive();
  }, [mode, loadLive]);

  const top3 = data.slice(0, 3);
  const myRankIdx = data.findIndex(r => r.enterpriseId === user?.enterpriseId);
  const myEntry   = myRankIdx >= 0 ? data[myRankIdx] : null;
  const leader    = data[0];
  const reviewsToLeader = myEntry && leader ? Math.max(0, leader.reviewCount - myEntry.reviewCount) : 0;

  // Assessment podium: respect Top N (staircase shows for N > 3)
  const podiumN = topN && parseInt(topN) > 0 ? parseInt(topN) : 3;
  const assTop3 = assData.slice(0, podiumN);

  return (
    <>
      <Navbar />
      <div className="lb-page">
        {/* ── Mode Tabs ─────────────────────────────────────────────────────── */}
        <div className="lb-mode-tabs">
          <button
            className={`lb-mode-tab${mode === 'reviewers' ? ' active' : ''}`}
            onClick={() => setMode('reviewers')}
          >
            📝 SME Reviewers
          </button>
          <button
            className={`lb-mode-tab${mode === 'assessment' ? ' active' : ''}`}
            onClick={() => setMode('assessment')}
          >
            🎯 Assessment Results
          </button>
          <button
            className={`lb-mode-tab${mode === 'live' ? ' active' : ''}`}
            onClick={() => setMode('live')}
          >
            ⚡ Live Quiz
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* REVIEWER LEADERBOARD                                              */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {mode === 'reviewers' && (
          <>
            <div className="lb-header">
              <div className="lb-header-content">
                <h1>{t('lb.title')}</h1>
                <p>{t('lb.subtitle')}</p>
              </div>
              {myEntry && (
                <div className="lb-my-rank-card">
                  <div className="lb-my-rank-avatar" style={{ background: AVATAR_COLORS[myRankIdx % AVATAR_COLORS.length] }}>
                    {buildInitials(myEntry.fullName)}
                  </div>
                  <div className="lb-my-rank-info">
                    <div className="lb-my-rank-label">{t('lb2.yourRank')}</div>
                    <div className="lb-my-rank-num">{rankLabel(myRankIdx)}</div>
                    <div className="lb-my-rank-sub">
                      {myEntry.reviewCount} {t('lb.reviews')}
                      {reviewsToLeader > 0 && <span className="lb-gap-hint"> · {reviewsToLeader} {t('lb2.toLead')}</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {loading && <div className="lb-loading">{t('lb.loading')}</div>}
            {error && <div className="lb-error">{error}</div>}
            {!loading && !error && data.length === 0 && (
              <div className="lb-empty"><div className="lb-empty-icon">🏆</div><p>{t('lb.empty')}</p></div>
            )}

            {!loading && top3.length > 0 && (
              <div className="lb-podium">
                {([top3[1], top3[0], top3[2]]).map((r, podiumIdx) => {
                  const rankIndices = [1, 0, 2];
                  const actualRank = rankIndices[podiumIdx];
                  if (!r) return <div key={`podium-empty-${actualRank}`} className="podium-empty" />;
                  const heights = ['podium-2nd', 'podium-1st', 'podium-3rd'];
                  const badge = getBadge(actualRank, r.reviewCount);
                  const isFirst = actualRank === 0;
                  return (
                    <div key={r.userId} className={`podium-item ${heights[podiumIdx]}${isFirst ? ' podium-item-first' : ''}`}>
                      <div className="podium-avatar-wrap">
                        {isFirst && <div className="podium-crown">👑</div>}
                        <div className={`podium-avatar${isFirst ? ' podium-avatar-glow' : ''}`}
                          style={{ background: AVATAR_COLORS[actualRank % AVATAR_COLORS.length] }}>
                          {buildInitials(r.fullName)}
                        </div>
                      </div>
                      <div className="podium-medal">{MEDALS[actualRank]}</div>
                      {badge && <div className={`podium-badge ${badge.cls}`}>{badge.icon} {t(badge.labelKey)}</div>}
                      <div className="podium-name">{r.fullName}</div>
                      <div className="podium-id">{r.enterpriseId}</div>
                      <div className="podium-count">{r.reviewCount} <span>{t('lb.reviews')}</span></div>
                      <div className="podium-base" />
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && data.length > 0 && (
              <div className="lb-table-wrap">
                <div style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <input type="text" className="lb-search-input" placeholder={t('lb.searchPlaceholder')}
                    value={search} onChange={e => { setSearch(e.target.value); setLbPage(1); }} />
                </div>
                <table className="lb-table">
                  <thead>
                    <tr>
                      <th>{t('lb.rank')}</th>
                      {LB_COLUMNS.map(col => (
                        <SortableTh key={col.key} colKey={col.key} label={t(col.labelKey)}
                          sortCol={sortCol} sortDir={sortDir} onSort={handleLbSort} />
                      ))}
                      <th>{t('lb2.badgeHeader')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let rows = [...data];
                      if (search) {
                        const q = search.toLowerCase();
                        rows = rows.filter(r => (r.fullName || '').toLowerCase().includes(q) || (r.enterpriseId || '').toLowerCase().includes(q));
                      }
                      rows = rows.sort((a, b) => {
                        const av = getLbVal(a, sortCol), bv = getLbVal(b, sortCol);
                        if (av < bv) return sortDir === 'asc' ? -1 : 1;
                        if (av > bv) return sortDir === 'asc' ? 1 : -1;
                        return 0;
                      });
                      const totalPages = Math.ceil(rows.length / lbPageSize);
                      const paged = rows.slice((lbPage - 1) * lbPageSize, lbPage * lbPageSize);
                      return (
                        <>
                          {paged.map((r) => {
                            const globalRank = data.indexOf(r);
                            const badge = getBadge(globalRank, r.reviewCount);
                            const isMe = r.enterpriseId === user?.enterpriseId;
                            return (
                              <tr key={r.userId} className={`${globalRank < 3 ? 'lb-top3-row' : ''} ${isMe ? 'lb-me-row' : ''}`}>
                                <td className="lb-rank-cell">
                                  {globalRank < 3 ? MEDALS[globalRank] : <span className="lb-rank-num">#{r.rank}</span>}
                                </td>
                                <td>
                                  <div className="lb-reviewer">
                                    <div className="lb-avatar-sm" style={{ background: AVATAR_COLORS[globalRank % AVATAR_COLORS.length] }}>
                                      {buildInitials(r.fullName)}
                                    </div>
                                    <span className="lb-reviewer-name">{r.fullName}</span>
                                    {isMe && <span className="lb-you-tag">{t('lb2.youTag')}</span>}
                                  </div>
                                </td>
                                <td className="lb-eid">{r.enterpriseId}</td>
                                <td>
                                  <div className="lb-reviews-cell">
                                    <div className="lb-bar-bg">
                                      <div className="lb-bar-fill" style={{
                                        width: `${Math.round((r.reviewCount / (data[0]?.reviewCount || 1)) * 100)}%`,
                                        background: AVATAR_COLORS[globalRank % AVATAR_COLORS.length],
                                      }} />
                                    </div>
                                    <span className="lb-count-num">{r.reviewCount}</span>
                                  </div>
                                </td>
                                <td>
                                  {badge ? <span className={`lb-badge ${badge.cls}`}>{badge.icon} {t(badge.labelKey)}</span>
                                         : <span className="lb-badge-none">—</span>}
                                </td>
                              </tr>
                            );
                          })}
                          {totalPages > 1 && (
                            <tr>
                              <td colSpan={5} style={{ padding: '0.75rem 1rem', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                                <TablePagination page={lbPage} totalPages={totalPages} pageSize={lbPageSize}
                                  onPageChange={setLbPage} onSizeChange={n => { setLbPageSize(n); setLbPage(1); }} totalItems={rows.length} />
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ASSESSMENT LEADERBOARD                                            */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {mode === 'assessment' && (
          <>
            <div className="lb-header">
              <div className="lb-header-content">
                <h1>🎯 Assessment Leaderboard</h1>
                <p>Top candidates ranked by score across assessments</p>
              </div>
            </div>

            {/* Filters bar */}
            <div className="lb-ass-filters">
              <div className="lb-ass-filter-group">
                <label>Exam</label>
                <select className="lb-ass-select" value={selectedSession}
                  onChange={e => { setSelectedSession(e.target.value); setAssPage(1); }}>
                  <option value="">All Assessments</option>
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>
              <div className="lb-ass-filter-group">
                <label>From Date</label>
                <input type="date" className="lb-ass-date" value={fromDate}
                  onChange={e => { setFromDate(e.target.value); setAssPage(1); }} />
              </div>
              <div className="lb-ass-filter-group">
                <label>To Date</label>
                <input type="date" className="lb-ass-date" value={toDate}
                  onChange={e => { setToDate(e.target.value); setAssPage(1); }} />
              </div>
              <div className="lb-ass-filter-group">
                <label>Top N</label>
                <input
                  type="number" min="1" max="9999"
                  className="lb-ass-date"
                  style={{ width: 80 }}
                  placeholder="e.g. 10"
                  value={topN}
                  onChange={e => { setTopN(e.target.value); setAssPage(1); }}
                />
              </div>
              <button className="lb-ass-apply-btn" onClick={loadAssessment}>
                🔍 Apply
              </button>
              {(selectedSession || fromDate || toDate || topN) && (
                <button className="lb-ass-clear-btn" onClick={() => {
                  setSelectedSession(''); setFromDate(''); setToDate(''); setTopN('');
                }}>✕ Clear</button>
              )}
            </div>

            {assLoading && <div className="lb-loading">Loading...</div>}
            {assError && <div className="lb-error">{assError}</div>}
            {!assLoading && !assError && assData.length === 0 && (
              <div className="lb-empty">
                <div className="lb-empty-icon">🎯</div>
                <p>No assessment results yet. Create a quiz and have candidates attempt it!</p>
              </div>
            )}

            {/* Podium / Staircase */}
            {!assLoading && assTop3.length > 0 && (
              podiumN <= 3 ? (
                /* Classic 3-person podium */
                <div className="lb-podium">
                  {([assTop3[1], assTop3[0], assTop3[2]]).map((r, podiumIdx) => {
                    const rankIndices = [1, 0, 2];
                    const actualRank = rankIndices[podiumIdx];
                    if (!r) return <div key={`ass-podium-empty-${actualRank}`} className="podium-empty" />;
                    const heights = ['podium-2nd', 'podium-1st', 'podium-3rd'];
                    const badge = getAssessmentBadge(actualRank, r.percent);
                    const isFirst = actualRank === 0;
                    return (
                      <div key={r.attemptId} className={`podium-item ${heights[podiumIdx]}${isFirst ? ' podium-item-first' : ''}`}>
                        <div className="podium-avatar-wrap">
                          {isFirst && <div className="podium-crown">👑</div>}
                          <div className={`podium-avatar${isFirst ? ' podium-avatar-glow' : ''}`}
                            style={{ background: AVATAR_COLORS[actualRank % AVATAR_COLORS.length] }}>
                            {buildInitials(r.candidateName)}
                          </div>
                        </div>
                        <div className="podium-medal">{MEDALS[actualRank]}</div>
                        {badge && <div className={`podium-badge ${badge.cls}`}>{badge.icon} {badge.label}</div>}
                        <div className="podium-name">{r.candidateName}</div>
                        <div className="podium-id" style={{ fontSize: '0.72rem' }}>{r.sessionTitle}</div>
                        <div className="podium-count">{r.percent}% <span>score</span></div>
                        <div className="podium-base" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Staircase podium for N > 3: rank N (left, shortest) → rank 1 (right, tallest) */
                <div className="lb-staircase">
                  {[...assTop3].sort((a, b) => b.rank - a.rank).map((r, i) => {
                    const N = assTop3.length;
                    const minH = 50, maxH = 190;
                    const barH = minH + (i / (N - 1)) * (maxH - minH);
                    const badge = getAssessmentBadge(r.rank - 1, r.percent);
                    const isFirst = r.rank === 1;
                    const barColor = r.percent >= 75 ? '#10B981' : r.percent >= 50 ? '#F59E0B' : '#EF4444';
                    return (
                      <div key={r.attemptId} className={`stair-item${isFirst ? ' stair-item-first' : ''}`}>
                        {/* Info above the bar */}
                        <div className="stair-info">
                          {isFirst && <div className="stair-crown">👑</div>}
                          <div className={`stair-avatar${isFirst ? ' stair-avatar-glow' : ''}`}
                            style={{ background: AVATAR_COLORS[(r.rank - 1) % AVATAR_COLORS.length] }}>
                            {buildInitials(r.candidateName)}
                          </div>
                          <div className="stair-medal">
                            {r.rank <= 3 ? MEDALS[r.rank - 1] : `#${r.rank}`}
                          </div>
                          {badge && <div className={`stair-badge podium-badge ${badge.cls}`}>{badge.icon} {badge.label}</div>}
                          <div className="stair-name">{r.candidateName}</div>
                          <div className="stair-pct" style={{ color: barColor }}>{r.percent}%</div>
                        </div>
                        {/* The step bar */}
                        <div className="stair-bar" style={{ height: `${barH}px`, background: barColor }} />
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* Toolbar + Runners Up bar cards + Full table */}
            {!assLoading && assData.length > 0 && (() => {
              let rows = [...assData];
              if (assSearch) {
                const q = assSearch.toLowerCase();
                rows = rows.filter(r =>
                  (r.candidateName || '').toLowerCase().includes(q) ||
                  (r.candidateEmail || '').toLowerCase().includes(q) ||
                  (r.sessionTitle || '').toLowerCase().includes(q)
                );
              }
              if (topN && parseInt(topN) > 0) rows = rows.slice(0, parseInt(topN));
              const runnersUp = rows.filter(r => r.rank > 3);
              const totalPages = Math.ceil(rows.length / assPageSize);
              const paged = rows.slice((assPage - 1) * assPageSize, assPage * assPageSize);
              return (
                <>
                  {/* Toolbar */}
                  <div style={{ margin: '1rem 0 0.75rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input type="text" className="lb-search-input" placeholder="Search by name or email..."
                      value={assSearch} onChange={e => { setAssSearch(e.target.value); setAssPage(1); }} />
                    <span className="lb-ass-count">{rows.length} candidate{rows.length !== 1 ? 's' : ''}</span>
                    <button className="lb-ass-download-btn" onClick={() => downloadCSV(rows)} title="Download filtered list as CSV">
                      ⬇️ Download CSV
                    </button>
                  </div>

                  {/* Runners Up — rank 4+ as horizontal bar cards */}
                  {runnersUp.length > 0 && (
                    <div className="lb-runners-section">
                      <div className="lb-runners-header">🏅 Runners Up</div>
                      <div className="lb-runners-list">
                        {runnersUp.map(r => {
                          const badge = getAssessmentBadge(r.rank - 1, r.percent);
                          const isTerminated = r.status === 'TERMINATED';
                          const barColor = r.percent >= 75 ? '#10B981' : r.percent >= 50 ? '#F59E0B' : '#EF4444';
                          return (
                            <div key={r.attemptId} className="lb-runner-card">
                              <div className="lb-runner-rank">#{r.rank}</div>
                              <div className="lb-runner-avatar"
                                style={{ background: AVATAR_COLORS[(r.rank - 1) % AVATAR_COLORS.length] }}>
                                {buildInitials(r.candidateName)}
                              </div>
                              <div className="lb-runner-info">
                                <div className="lb-runner-name">
                                  {r.candidateName}
                                  {isTerminated && <span className="lb-terminated-tag">🚨 Terminated</span>}
                                </div>
                                <div className="lb-runner-meta">{r.candidateEmail} · {r.sessionTitle}</div>
                              </div>
                              <div className="lb-runner-bar-wrap">
                                <div className="lb-runner-bar-bg">
                                  <div className="lb-runner-bar-fill" style={{ width: `${r.percent}%`, background: barColor }} />
                                </div>
                                <span className="lb-runner-pct" style={{ color: barColor }}>{r.percent}%</span>
                              </div>
                              <div className="lb-runner-time">{fmtTime(r.timeTakenSeconds)}</div>
                              {badge
                                ? <span className={`lb-badge ${badge.cls}`}>{badge.icon} {badge.label}</span>
                                : <span className="lb-badge-none">—</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Full results table */}
                  <div className="lb-table-wrap" style={{ marginTop: '1.5rem' }}>
                    <table className="lb-table">
                      <thead>
                        <tr>
                          <th>Rank</th><th>Candidate</th><th>Email</th><th>Exam</th>
                          <th>Score</th><th>Time</th><th>Date</th><th>Badge</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paged.map(r => {
                          const badge = getAssessmentBadge(r.rank - 1, r.percent);
                          const isTerminated = r.status === 'TERMINATED';
                          return (
                            <tr key={r.attemptId} className={r.rank <= 3 ? 'lb-top3-row' : ''}>
                              <td className="lb-rank-cell">
                                {r.rank <= 3 ? MEDALS[r.rank - 1] : <span className="lb-rank-num">#{r.rank}</span>}
                              </td>
                              <td>
                                <div className="lb-reviewer">
                                  <div className="lb-avatar-sm"
                                    style={{ background: AVATAR_COLORS[(r.rank - 1) % AVATAR_COLORS.length] }}>
                                    {buildInitials(r.candidateName)}
                                  </div>
                                  <span className="lb-reviewer-name">{r.candidateName}</span>
                                  {isTerminated && <span className="lb-terminated-tag">🚨 Terminated</span>}
                                </div>
                              </td>
                              <td className="lb-eid">{r.candidateEmail}</td>
                              <td className="lb-eid" style={{ maxWidth: 160, whiteSpace: 'normal' }}>{r.sessionTitle}</td>
                              <td>
                                <div className="lb-reviews-cell">
                                  <div className="lb-bar-bg">
                                    <div className="lb-bar-fill" style={{
                                      width: `${r.percent}%`,
                                      background: r.percent >= 75 ? '#10B981' : r.percent >= 50 ? '#F59E0B' : '#EF4444',
                                    }} />
                                  </div>
                                  <span className="lb-count-num">{r.percent}%</span>
                                </div>
                              </td>
                              <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{fmtTime(r.timeTakenSeconds)}</td>
                              <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '—'}
                              </td>
                              <td>
                                {badge ? <span className={`lb-badge ${badge.cls}`}>{badge.icon} {badge.label}</span>
                                       : <span className="lb-badge-none">—</span>}
                              </td>
                            </tr>
                          );
                        })}
                        {totalPages > 1 && (
                          <tr>
                            <td colSpan={8} style={{ padding: '0.75rem 1rem', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                              <TablePagination page={assPage} totalPages={totalPages} pageSize={assPageSize}
                                onPageChange={setAssPage} onSizeChange={n => { setAssPageSize(n); setAssPage(1); }} totalItems={rows.length} />
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* LIVE QUIZ LEADERBOARD                                             */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {mode === 'live' && (
          <>
            <div className="lb-header">
              <div className="lb-header-content">
                <h1>⚡ Live Quiz Leaderboard</h1>
                <p>Top performers across all live quiz sessions</p>
              </div>
            </div>

            {/* Session filter */}
            <div className="lb-ass-filters" style={{ marginBottom: '1rem' }}>
              <label className="lb-ass-filter-label">Session</label>
              <select
                className="lb-ass-select"
                value={selectedLiveSession}
                onChange={e => { setSelectedLiveSession(e.target.value); setLivePage(1); }}
              >
                <option value="">All Sessions (Combined)</option>
                {liveSessions.map(s => (
                  <option key={s.id} value={s.id}>
                    #{s.pin} — {s.title} ({s.participantCount} players)
                    {s.startedAt ? ` · ${new Date(s.startedAt).toLocaleDateString()}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {liveLoading && <div className="lb-loading">Loading...</div>}
            {liveError && <div className="lb-error">{liveError}</div>}
            {!liveLoading && !liveError && liveData.length === 0 && (
              <div className="lb-empty">
                <div className="lb-empty-icon">⚡</div>
                <p>No live quiz sessions completed yet. Host a live quiz to see results here!</p>
              </div>
            )}

            {/* Podium for top 3 */}
            {!liveLoading && liveData.length > 0 && (() => {
              const top3 = liveData.slice(0, 3);
              return (
                <div className="lb-podium">
                  {([top3[1], top3[0], top3[2]]).map((r, podiumIdx) => {
                    const rankIndices = [1, 0, 2];
                    const actualRank = rankIndices[podiumIdx];
                    if (!r) return <div key={`live-podium-empty-${actualRank}`} className="podium-empty" />;
                    const heights = ['podium-2nd', 'podium-1st', 'podium-3rd'];
                    const isFirst = actualRank === 0;
                    return (
                      <div key={r.participantId} className={`podium-item ${heights[podiumIdx]}${isFirst ? ' podium-item-first' : ''}`}>
                        <div className="podium-avatar-wrap">
                          {isFirst && <div className="podium-crown">👑</div>}
                          <div className={`podium-avatar${isFirst ? ' podium-avatar-glow' : ''}`}
                            style={{ background: AVATAR_COLORS[actualRank % AVATAR_COLORS.length] }}>
                            {buildInitials(r.displayName)}
                          </div>
                        </div>
                        <div className="podium-medal">{MEDALS[actualRank]}</div>
                        <div className="podium-name">{r.displayName}</div>
                        {!selectedLiveSession && (
                          <div className="podium-id" style={{ fontSize: '0.72rem' }}>{r.sessionTitle}</div>
                        )}
                        <div className="podium-count">{r.totalScore.toLocaleString()} <span>pts</span></div>
                        <div className="podium-base" />
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Full leaderboard table */}
            {!liveLoading && liveData.length > 0 && (() => {
              let rows = [...liveData];
              if (liveSearch) {
                const q = liveSearch.toLowerCase();
                rows = rows.filter(r =>
                  (r.displayName || '').toLowerCase().includes(q) ||
                  (r.sessionTitle || '').toLowerCase().includes(q)
                );
              }
              const totalPages = Math.ceil(rows.length / livePageSize);
              const paged = rows.slice((livePage - 1) * livePageSize, livePage * livePageSize);
              return (
                <>
                  <div style={{ margin: '1rem 0 0.75rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      className="lb-search-input"
                      placeholder="Search by player name..."
                      value={liveSearch}
                      onChange={e => { setLiveSearch(e.target.value); setLivePage(1); }}
                    />
                    <span className="lb-ass-count">{rows.length} player{rows.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="lb-table-wrap">
                    <table className="lb-table">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Player</th>
                          {!selectedLiveSession && <th>Session</th>}
                          <th>Score</th>
                          {!selectedLiveSession && <th>Date</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {paged.map(r => (
                          <tr key={`${r.participantId}-${r.sessionId}`} className={r.rank <= 3 ? 'lb-top3-row' : ''}>
                            <td className="lb-rank-cell">
                              {r.rank <= 3 ? MEDALS[r.rank - 1] : <span className="lb-rank-num">#{r.rank}</span>}
                            </td>
                            <td>
                              <div className="lb-reviewer">
                                <div className="lb-avatar-sm"
                                  style={{ background: AVATAR_COLORS[(r.rank - 1) % AVATAR_COLORS.length] }}>
                                  {buildInitials(r.displayName)}
                                </div>
                                <span className="lb-reviewer-name">{r.displayName}</span>
                              </div>
                            </td>
                            {!selectedLiveSession && (
                              <td className="lb-eid" style={{ maxWidth: 160, whiteSpace: 'normal' }}>
                                {r.sessionTitle}
                                <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  PIN: {r.sessionPin}
                                </span>
                              </td>
                            )}
                            <td>
                              <div className="lb-reviews-cell">
                                <span className="lb-count-num" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                                  {r.totalScore.toLocaleString()}
                                </span>
                                <span style={{ marginLeft: '0.25rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>pts</span>
                              </div>
                            </td>
                            {!selectedLiveSession && (
                              <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                {r.startedAt ? new Date(r.startedAt).toLocaleDateString() : '—'}
                              </td>
                            )}
                          </tr>
                        ))}
                        {totalPages > 1 && (
                          <tr>
                            <td colSpan={selectedLiveSession ? 3 : 5} style={{ padding: '0.75rem 1rem', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                              <TablePagination
                                page={livePage}
                                totalPages={totalPages}
                                pageSize={livePageSize}
                                onPageChange={setLivePage}
                                onSizeChange={n => { setLivePageSize(n); setLivePage(1); }}
                                totalItems={rows.length}
                              />
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}
          </>
        )}
      </div>
    </>
  );
}
