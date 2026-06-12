import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import API, { cachedGet, isCacheWarm, getCacheSync } from '../api';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';
import './Analytics.css';

const STATUS_META = {
  APPROVED:         { label: 'Approved',         color: '#059669', bg: '#D1FAE5' },
  REJECTED:         { label: 'Rejected',         color: '#DC2626', bg: '#FEE2E2' },
  UNDER_REVIEW:     { label: 'Under Review',     color: '#D97706', bg: '#FEF3C7' },
  READY_FOR_REVIEW: { label: 'Ready for Review', color: '#A100FF', bg: '#F3E8FF' },
  DRAFT:            { label: 'Draft',            color: '#6B7280', bg: '#F3F4F6' },
};

const PALETTE = ['#A100FF','#3B82F6','#10B981','#F59E0B','#EF4444','#B84DFF','#06B6D4','#84CC16','#EC4899','#14B8A6'];

function BarChart({ data, valueKey = 'count', labelKey = 'techStack', title }) {
  const { t } = useTranslation();
  if (!data?.length) return <div className="an-empty">{t('common.noData')}</div>;
  const max = Math.max(...data.map(d => Number(d[valueKey])));
  return (
    <div className="an-bar-chart">
      {title && <div className="an-chart-title">{title}</div>}
      {data.map((d, i) => (
        <div key={d[labelKey] + i} className="an-bar-row">
          <span className="an-bar-label">{d[labelKey]}</span>
          <div className="an-bar-track">
            <div className="an-bar-fill" style={{ width: `${max ? Math.round((Number(d[valueKey]) / max) * 100) : 0}%`, background: PALETTE[i % PALETTE.length] }} />
          </div>
          <span className="an-bar-val">{d[valueKey]}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ data }) {
  const { t } = useTranslation();
  const total = data.reduce((s, d) => s + Number(d.value), 0);
  if (!total) return <div className="an-empty">{t('common.noData')}</div>;
  let cumulativePct = 0;
  const SIZE = 140, STROKE = 28, r = (SIZE - STROKE) / 2;
  const circ = 2 * Math.PI * r;
  const slices = data.map(d => {
    const pct = (Number(d.value) / total) * 100;
    const offset = circ - (cumulativePct / 100) * circ;
    cumulativePct += pct;
    return { ...d, pct, offset, dasharray: `${(pct / 100) * circ} ${circ}` };
  });
  return (
    <div className="an-donut-wrap">
      <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={SIZE/2} cy={SIZE/2} r={r} stroke="#F3F4F6" strokeWidth={STROKE} fill="none" />
        {slices.map((s, i) => (
          <circle key={i} cx={SIZE/2} cy={SIZE/2} r={r}
            stroke={s.color} strokeWidth={STROKE} fill="none"
            strokeDasharray={s.dasharray} strokeDashoffset={s.offset}
            strokeLinecap="butt" />
        ))}
      </svg>
      <div className="an-donut-center">
        <span className="an-donut-total">{total}</span>
        <span className="an-donut-lbl">{t('analytics.total')}</span>
      </div>
      <div className="an-donut-legend">
        {data.map(d => (
          <div key={d.label} className="an-legend-row">
            <span className="an-legend-dot" style={{ background: d.color }} />
            <span className="an-legend-label">{d.label}</span>
            <span className="an-legend-val">{d.value}</span>
            <span className="an-legend-pct">{total ? Math.round((d.value / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Analytics() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';

  const [summary, setSummary] = useState(() => getCacheSync('/stats/summary') || null);
  const [byStack, setByStack] = useState(() => getCacheSync('/stats/by-tech-stack') || []);
  const [loading, setLoading] = useState(() => !isCacheWarm('/stats/summary'));

  // Date range state
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo] = useState('');
  const [exporting, setExporting] = useState(false);



  const fetchData = useCallback((from, to) => {
    setLoading(true);
    const params = {};
    if (from) params.from = from;
    if (to)   params.to   = to;
    Promise.allSettled([
      cachedGet('/stats/summary',       { params }),
      cachedGet('/stats/by-tech-stack', { params }),
    ]).then(([sumR, stackR]) => {
      if (sumR.status === 'fulfilled')   setSummary(sumR.value.data);
      if (stackR.status === 'fulfilled') setByStack(stackR.value.data);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData('', ''); }, [fetchData]);

  function handleApplyFilter() {
    setAppliedFrom(fromDate);
    setAppliedTo(toDate);
    fetchData(fromDate, toDate);
  }

  function handleClearFilter() {
    setFromDate('');
    setToDate('');
    setAppliedFrom('');
    setAppliedTo('');
    fetchData('', '');
  }

  async function handleExportExcel() {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (appliedFrom) params.set('from', appliedFrom);
      if (appliedTo)   params.set('to', appliedTo);
      const token = localStorage.getItem('token');
      const url = `/api/v1/stats/export${params.toString() ? '?' + params.toString() : ''}`;
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error('Export failed');
      const blob = await resp.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `QuizHub_Analytics_${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      alert(t('analytics.exportFailed'));
    } finally {
      setExporting(false);
    }
  }

  function handlePrintPdf() {
    window.print();
  }

  const donutData = summary ? [
    { label: t('analytics.approved'),   value: summary.approved || 0,  color: '#059669' },
    { label: t('analytics.underReview'), value: summary.inReview  || 0, color: '#D97706' },
    { label: t('analytics.draft'),       value: summary.draft     || 0, color: '#9CA3AF' },
    { label: t('analytics.rejected'),    value: summary.rejected  || 0, color: '#EF4444' },
  ] : [];

  const statCards = summary ? [
    { label: isAdmin ? t('analytics.totalQAdmin') : t('analytics.totalQMine'), value: summary.totalMcqs || 0, icon: '📚', color: '#A100FF', bg: '#F3E8FF', route: isAdmin ? '/question-bank' : '/my-questions' },
    { label: t('analytics.approved'),     value: summary.approved || 0, icon: '✅', color: '#059669', bg: '#D1FAE5', route: isAdmin ? '/question-bank?status=APPROVED' : '/my-questions?status=APPROVED' },
    { label: t('analytics.inReview'),     value: summary.inReview  || 0, icon: '🔍', color: '#D97706', bg: '#FEF3C7', route: isAdmin ? '/pending-reviews' : '/my-questions?status=UNDER_REVIEW' },
    { label: t('analytics.rejected'),     value: summary.rejected || 0, icon: '❌', color: '#DC2626', bg: '#FEE2E2', route: isAdmin ? '/question-bank?status=REJECTED' : '/my-questions?status=REJECTED' },
    { label: t('analytics.draft'),        value: summary.draft     || 0, icon: '📝', color: '#6B7280', bg: '#F3F4F6', route: isAdmin ? '/question-bank?status=DRAFT' : '/my-questions?status=DRAFT' },
    { label: t('analytics.approvalRate'), value: summary.totalMcqs > 0 ? `${Math.round((summary.approved / summary.totalMcqs) * 100)}%` : '0%', icon: '📈', color: '#059669', bg: '#D1FAE5', route: null },
  ] : [];

  return (
    <>
      <Navbar />
      <div className="an-page">
        <div className="an-header">
          <div className="an-header-top">
            <div>
              <h1>{t('analytics.title')}</h1>
              <p>{t('analytics.subtitle')}</p>
            </div>
            <div className="an-export-btns">
              <button className="an-btn-excel" onClick={handleExportExcel} disabled={exporting}>
                {exporting ? t('analytics.exporting') : t('analytics.exportExcel')}
              </button>
              <button className="an-btn-pdf" onClick={handlePrintPdf}>
                {t('analytics.printPdf')}
              </button>
            </div>
          </div>

          {/* Date range filter bar */}
          <div className="an-filter-bar">
            <label className="an-filter-label">{t('analytics.from')}</label>
            <input
              type="date"
              className="an-date-input"
              value={fromDate}
              max={toDate || undefined}
              onChange={e => setFromDate(e.target.value)}
            />
            <label className="an-filter-label">{t('analytics.to')}</label>
            <input
              type="date"
              className="an-date-input"
              value={toDate}
              min={fromDate || undefined}
              onChange={e => setToDate(e.target.value)}
            />
            <button className="an-btn-apply" onClick={handleApplyFilter}>{t('analytics.apply')}</button>
            {(appliedFrom || appliedTo) && (
              <button className="an-btn-clear" onClick={handleClearFilter}>{t('analytics.clear')}</button>
            )}
            {(appliedFrom || appliedTo) && (
              <span className="an-filter-badge">
                {appliedFrom || '…'} → {appliedTo || t('analytics.now')}
              </span>
            )}
          </div>
        </div>

        {loading && <div className="an-loading">Loading analytics…</div>}

        {!loading && summary && (
          <>
            {/* Stat cards — clickable, navigate to filtered views */}
            <div className="an-stat-grid">
              {statCards.map(c => (
                <button
                  key={c.label}
                  className="an-stat-card"
                  style={{ borderLeft: `4px solid ${c.color}`, cursor: c.route ? 'pointer' : 'default' }}
                  onClick={() => c.route && navigate(c.route)}
                  title={c.route ? `View ${c.label}` : undefined}
                >
                  <div className="an-stat-icon" style={{ background: c.bg }}>{c.icon}</div>
                  <div className="an-stat-body">
                    <div className="an-stat-val" style={{ color: c.color }}>{c.value}</div>
                    <div className="an-stat-label">{c.label}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Charts row */}
            <div className="an-charts-row">
              {/* Status donut */}
              <div className="an-chart-card">
                <div className="an-chart-heading">{t('analytics.statusBreakdown')}</div>
                <DonutChart data={donutData} />
              </div>

              {/* By tech stack bar */}
              <div className="an-chart-card an-chart-wide">
                <div className="an-chart-heading">{t('analytics.byStackTitle')}</div>
                <BarChart data={byStack} valueKey="count" labelKey="techStack" />
              </div>
            </div>

            {/* Quick links to related pages */}
            <div className="an-quick-links">
              <button className="an-quick-link" onClick={() => navigate('/reviewer-dashboard')}>
                📊 {t('rd.title')}
              </button>
              <button className="an-quick-link" onClick={() => navigate('/leaderboard')}>
                🏆 {t('analytics.leaderboardTitle')}
              </button>
              <button className="an-quick-link" onClick={() => navigate('/reviewer-metrics')}>
                ⭐ {t('rm.title')}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
