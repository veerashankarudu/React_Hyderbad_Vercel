import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API, { cachedGet } from '../api';
import { useAuth } from '../AuthContext';
import Navbar from '../components/Navbar';
import { useTranslation } from 'react-i18next';
import { useContentTranslation } from '../hooks/useContentTranslation';
import './KanbanBoard.css';

const COLUMNS = [
  { status: 'DRAFT',            labelKey: 'kanban.colDraft',       color: '#6B7280', light: '#F3F4F6', accent: '#6B7280' },
  { status: 'READY_FOR_REVIEW', labelKey: 'kanban.colReady',       color: '#D97706', light: '#FFFBEB', accent: '#F59E0B' },
  { status: 'UNDER_REVIEW',     labelKey: 'kanban.colUnderReview', color: '#2563EB', light: '#EFF6FF', accent: '#3B82F6' },
  { status: 'APPROVED',         labelKey: 'kanban.colApproved',    color: '#059669', light: '#ECFDF5', accent: '#10B981' },
  { status: 'REJECTED',         labelKey: 'kanban.colRejected',    color: '#DC2626', light: '#FEF2F2', accent: '#EF4444' },
];

const DIFF_COLOR  = { EASY: '#059669', MEDIUM: '#D97706', HARD: '#DC2626' };
const DIFF_BG     = { EASY: '#D1FAE5', MEDIUM: '#FEF3C7', HARD: '#FEE2E2' };

function truncate(str, n = 85) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n) + '…' : str;
}

function ageLabel(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return '1d old';
  return `${days}d old`;
}

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic avatar colour from name string
const AVATAR_COLORS = ['#6983FF','#2563EB','#059669','#D97706','#DC2626','#0891B2','#6983FF','#DB2777'];
function avatarColor(name) {
  if (!name) return '#6B7280';
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default function KanbanBoard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isAdmin = user?.role === 'ADMIN';

  const [mcqs, setMcqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterTech, setFilterTech] = useState('');
  const [techStacks, setTechStacks] = useState([]);

  const fetchMcqs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const endpoint = isAdmin ? '/admin/mcqs' : '/mcqs';
      const { data } = await API.get(endpoint);
      setMcqs(Array.isArray(data) ? data : (data.content || []));
    } catch {
      setError('Failed to load MCQs.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { fetchMcqs(); }, [fetchMcqs]);

  useEffect(() => {
    cachedGet('/master/tech-stacks')
      .then(({ data }) => setTechStacks(Array.isArray(data) ? data : (data.content || [])))
      .catch(() => {});
  }, []);

  const q = search.toLowerCase().trim();
  const filtered = mcqs.filter(m => {
    const matchTech = !filterTech || String(m.techStackId) === filterTech || m.techStackName === filterTech;
    const matchSearch = !q ||
      (m.questionStem || '').toLowerCase().includes(q) ||
      (m.creatorFullName || '').toLowerCase().includes(q) ||
      (m.creatorEnterpriseId || '').toLowerCase().includes(q) ||
      (m.reviewerFullName || '').toLowerCase().includes(q) ||
      (m.topicName || '').toLowerCase().includes(q);
    return matchTech && matchSearch;
  });

  // Translate all visible card stems and tech stack names
  const filteredStems = filtered.map(m => m.questionStem || '');
  const filteredTechs = filtered.map(m => m.techStackName || '');
  const txFilteredStems = useContentTranslation(filteredStems);
  const txFilteredTechs = useContentTranslation(filteredTechs);
  const stemMap = Object.fromEntries(filtered.map((m, i) => [m.id, txFilteredStems[i] || m.questionStem]));
  const techMap = Object.fromEntries(filtered.map((m, i) => [m.id, txFilteredTechs[i] || m.techStackName]));

  const byStatus = status => filtered.filter(m => m.status === status);
  const total = filtered.length;
  const approvedCount = byStatus('APPROVED').length;
  const rejectedCount = byStatus('REJECTED').length;
  const activeCount = total - approvedCount - rejectedCount;

  return (
    <>
      <Navbar />
      <div className="kanban-page">
      {/* ── Header ── */}
      <div className="kanban-header">
        <div className="kanban-title-row">
          <h2>{t('kanban.title')}</h2>
          <p className="kanban-subtitle">
            {isAdmin ? t('kanban.subtitleAdmin') : t('kanban.subtitleMine')}
          </p>
        </div>
        <div className="kanban-controls">
          <input
            className="kanban-search"
            placeholder={t('kanban.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="kanban-select"
            value={filterTech}
            onChange={e => setFilterTech(e.target.value)}
          >
            <option value="">{t('kanban.allTechStacks')}</option>
            {techStacks.map(ts => (
              <option key={ts.id} value={String(ts.id)}>{ts.name}</option>
            ))}
          </select>
          <button className="kanban-refresh" onClick={fetchMcqs} title={t('kanban.refresh')}>{t('kanban.refresh')}</button>
        </div>
      </div>

      {/* ── Ticket Summary bar ── */}
      {!loading && (
        <div className="kanban-stats-bar">
          <div className="kstat-box kstat-active">
            <div className="kstat-label">{t('kanban.active')}</div>
            <div className="kstat-num">{activeCount}</div>
          </div>
          <div className="kstat-divider" />
          <div className="kstat-box kstat-approved">
            <div className="kstat-label">{t('kanban.approved')}</div>
            <div className="kstat-num">{approvedCount}</div>
          </div>
          <div className="kstat-divider" />
          <div className="kstat-box kstat-rejected">
            <div className="kstat-label">{t('kanban.rejected')}</div>
            <div className="kstat-num">{rejectedCount}</div>
          </div>
          <div className="kstat-divider kstat-divider--wide" />
          {COLUMNS.map(col => {
            const cnt = byStatus(col.status).length;
            const pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
            return (
              <div key={col.status} className="kstat-row-item">
                <span className="kstat-row-label">{t(col.labelKey)}</span>
                <div className="kstat-bar-wrap">
                  <div className="kstat-bar-fill" style={{ width: `${pct}%`, background: col.accent }} />
                </div>
                <span className="kstat-row-count">{cnt}</span>
              </div>
            );
          })}
        </div>
      )}

      {error && <div className="kanban-error">{error}</div>}
      {loading && <div className="kanban-loading">{t('kanban.loading')}</div>}

      {/* ── Board columns ── */}
      {!loading && (
        <div className="kanban-board">
          {COLUMNS.map(col => {
            const cards = byStatus(col.status);
            return (
              <div key={col.status} className="kanban-column">
                {/* Column header */}
                <div className="kanban-col-header" style={{ borderTopColor: col.accent }}>
                  <span className="kanban-col-dot" style={{ background: col.accent }} />
                  <span className="kanban-col-title">{t(col.labelKey)}</span>
                  <span className="kanban-col-count" style={{ background: col.light, color: col.color }}>
                    {cards.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="kanban-cards">
                  {cards.length === 0 && (
                    <div className="kanban-empty">{t('kanban.empty')}</div>
                  )}
                  {cards.map(mcq => (
                    <KanbanCard
                      key={mcq.id}
                      mcq={mcq}
                      isAdmin={isAdmin}
                      accentColor={col.accent}
                      t={t}
                      translatedStem={stemMap[mcq.id]}
                      translatedTech={techMap[mcq.id]}
                      onClick={() => navigate(`/mcq/${mcq.id}`)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
    </>
  );
}

function KanbanCard({ mcq, isAdmin, accentColor, onClick, t, translatedStem, translatedTech }) {
  const diff   = mcq.difficulty || 'MEDIUM';
  const dColor = DIFF_COLOR[diff]  || '#6B7280';
  const dBg    = DIFF_BG[diff]     || '#F3F4F6';
  // translate age label
  const rawAge = (() => {
    if (!mcq.createdAt) return null;
    const diff2 = Date.now() - new Date(mcq.createdAt).getTime();
    const days = Math.floor(diff2 / 86400000);
    if (days === 0) return t('kanban.today');
    if (days === 1) return t('kanban.oneDay');
    return t('kanban.daysOld', { days });
  })();
  const creatorName = mcq.creatorFullName || mcq.creatorEnterpriseId || '?';
  const reviewerName = mcq.reviewerFullName || mcq.reviewerEnterpriseId;

  return (
    <div
      className="kanban-card"
      style={{ '--card-accent': accentColor }}
      onClick={onClick}
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      {/* Top row: ID + age */}
      <div className="kcard-top">
        <span className="kcard-id">#{mcq.id}</span>
        {rawAge && <span className="kcard-age">{rawAge}</span>}
      </div>

      {/* Question stem */}
      <p className="kcard-stem">{truncate(translatedStem || mcq.questionStem, 90)}</p>

      {/* Tech stack + topic tags */}
      <div className="kcard-tags">
        {mcq.techStackName && (
          <span className="kcard-tag kcard-tag--tech">{translatedTech || mcq.techStackName}</span>
        )}
        {mcq.topicName && (
          <span className="kcard-tag kcard-tag--topic">{mcq.topicName}</span>
        )}
        <span className="kcard-tag kcard-tag--diff" style={{ color: dColor, background: dBg }}>
          {diff}
        </span>
      </div>

      {/* AI score badge */}
      {mcq.aiScore != null && (
        <div className="kcard-score"
          style={{ color: mcq.aiScore >= 80 ? '#059669' : mcq.aiScore >= 60 ? '#D97706' : '#DC2626' }}>
          🏅 Score {mcq.aiScore}/100
        </div>
      )}

      {/* Footer: avatars + names */}
      <div className="kcard-footer">
        <div className="kcard-person-row">
          <span
            className="kcard-avatar"
            style={{ background: avatarColor(creatorName) }}
            title={`Creator: ${creatorName}`}
          >
            {initials(creatorName)}
          </span>
          <span className="kcard-person-label">{creatorName}</span>
        </div>
        {reviewerName && (
          <div className="kcard-person-row kcard-person-row--reviewer">
            <span
              className="kcard-avatar kcard-avatar--reviewer"
              style={{ background: avatarColor(reviewerName) }}
              title={`Reviewer: ${reviewerName}`}
            >
              {initials(reviewerName)}
            </span>
            <span className="kcard-person-label kcard-person-label--reviewer">
              🔍 {reviewerName}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

