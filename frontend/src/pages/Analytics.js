import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import API from '../api';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';
import SortableTh from '../components/SortableTh';
import TablePagination from '../components/TablePagination';
import './Analytics.css';

const STATUS_META = {
  APPROVED:         { label: 'Approved',         color: '#059669', bg: '#D1FAE5' },
  REJECTED:         { label: 'Rejected',         color: '#DC2626', bg: '#FEE2E2' },
  UNDER_REVIEW:     { label: 'Under Review',     color: '#D97706', bg: '#FEF3C7' },
  READY_FOR_REVIEW: { label: 'Ready for Review', color: '#7C3AED', bg: '#EDE9FE' },
  DRAFT:            { label: 'Draft',            color: '#6B7280', bg: '#F3F4F6' },
};

const PALETTE = ['#7C3AED','#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#84CC16','#EC4899','#14B8A6'];

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
  const isAdmin = user?.role === 'ADMIN';

  const [summary, setSummary] = useState(null);
  const [byStack, setByStack] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [reviewerStats, setReviewerStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Date range state
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo] = useState('');
  const [exporting, setExporting] = useState(false);

  // Leaderboard table state
  const [lbSearch, setLbSearch] = useState('');
  const [lbSortCol, setLbSortCol] = useState('reviewCount');
  const [lbSortDir, setLbSortDir] = useState('desc');
  const [lbPage, setLbPage] = useState(1);
  const [lbPageSize, setLbPageSize] = useState(10);

  useEffect(() => { setLbPage(1); }, [lbSearch, lbPageSize]);

  const fetchData = useCallback((from, to) => {
    setLoading(true);
    const params = {};
    if (from) params.from = from;
    if (to)   params.to   = to;
    Promise.allSettled([
      API.get('/stats/summary',       { params }),
      API.get('/stats/by-tech-stack', { params }),
      API.get('/stats/leaderboard'),
      API.get('/stats/reviewer-stats'),
    ]).then(([sumR, stackR, lbR, revR]) => {
      if (sumR.status === 'fulfilled')   setSummary(sumR.value.data);
      if (stackR.status === 'fulfilled') setByStack(stackR.value.data);
      if (lbR.status === 'fulfilled')    setLeaderboard(lbR.value.data);
      if (revR.status === 'fulfilled')   setReviewerStats(revR.value.data);
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

  const handleLbSort = (key) => {
    if (lbSortCol === key) setLbSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setLbSortCol(key); setLbSortDir('desc'); }
    setLbPage(1);
  };

  const lbFiltered = [...leaderboard]
    .filter(r => !lbSearch ||
      r.fullName?.toLowerCase().includes(lbSearch.toLowerCase()) ||
      r.enterpriseId?.toLowerCase().includes(lbSearch.toLowerCase()))
    .sort((a, b) => {
      const av = typeof a[lbSortCol] === 'number' ? a[lbSortCol] : (a[lbSortCol] || '').toString().toLowerCase();
      const bv = typeof b[lbSortCol] === 'number' ? b[lbSortCol] : (b[lbSortCol] || '').toString().toLowerCase();
      if (av < bv) return lbSortDir === 'asc' ? -1 : 1;
      if (av > bv) return lbSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  const lbTotalPages = Math.ceil(lbFiltered.length / lbPageSize);
  const lbRows = lbFiltered.slice((lbPage - 1) * lbPageSize, lbPage * lbPageSize);

  const donutData = summary ? [
    { label: t('analytics.approved'),   value: summary.approved || 0,  color: '#059669' },
    { label: t('analytics.underReview'), value: summary.inReview  || 0, color: '#D97706' },
    { label: t('analytics.draft'),       value: summary.draft     || 0, color: '#9CA3AF' },
    { label: t('analytics.rejected'),    value: summary.rejected  || 0, color: '#EF4444' },
  ] : [];

  const statCards = summary ? [
    { label: isAdmin ? t('analytics.totalQAdmin') : t('analytics.totalQMine'), value: summary.totalMcqs || 0, icon: '📚', color: '#7C3AED', bg: '#EDE9FE' },
    { label: t('analytics.approved'),     value: summary.approved || 0, icon: '✅', color: '#059669', bg: '#D1FAE5' },
    { label: t('analytics.inReview'),     value: summary.inReview  || 0, icon: '🔍', color: '#D97706', bg: '#FEF3C7' },
    { label: t('analytics.rejected'),     value: summary.rejected || 0, icon: '❌', color: '#DC2626', bg: '#FEE2E2' },
    { label: t('analytics.draft'),        value: summary.draft     || 0, icon: '📝', color: '#6B7280', bg: '#F3F4F6' },
    { label: t('analytics.approvalRate'), value: summary.totalMcqs > 0 ? `${Math.round((summary.approved / summary.totalMcqs) * 100)}%` : '0%', icon: '📈', color: '#059669', bg: '#D1FAE5' },
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
            {/* Stat cards */}
            <div className="an-stat-grid">
              {statCards.map(c => (
                <div key={c.label} className="an-stat-card" style={{ borderLeft: `4px solid ${c.color}` }}>
                  <div className="an-stat-icon" style={{ background: c.bg }}>{c.icon}</div>
                  <div className="an-stat-body">
                    <div className="an-stat-val" style={{ color: c.color }}>{c.value}</div>
                    <div className="an-stat-label">{c.label}</div>
                  </div>
                </div>
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

            {/* My reviewer stats */}
            {reviewerStats && (
              <div className="an-section-card">
                <div className="an-section-heading">{t('rd.recentActivity')}</div>
                <div className="an-rev-stats">
                  {[
                    { label: t('rd.kpiTotalAssigned'), val: reviewerStats.totalAssigned, color: '#7C3AED' },
                    { label: t('analytics.approved'),  val: reviewerStats.approved,      color: '#059669' },
                    { label: t('analytics.rejected'),  val: reviewerStats.rejected,      color: '#DC2626' },
                    { label: t('pr.pending'),           val: reviewerStats.pending,       color: '#D97706' },
                    { label: t('analytics.approvalRate'), val: `${reviewerStats.approvalRate}%`, color: '#059669' },
                  ].map(s => (
                    <div key={s.label} className="an-rev-pill">
                      <span className="an-rev-val" style={{ color: s.color }}>{s.val}</span>
                      <span className="an-rev-lbl">{s.label}</span>
                    </div>
                  ))}
                </div>
                {reviewerStats.byTechStack?.length > 0 && (
                  <BarChart data={reviewerStats.byTechStack} valueKey="count" labelKey="techStack" title={t('analytics.byStackTitle')} />
                )}
              </div>
            )}

            {/* Leaderboard */}
            {leaderboard.length > 0 && (
              <div className="an-section-card">
                <div className="an-section-heading">{t('analytics.leaderboardTitle')}</div>
                <div className="an-lb-toolbar">
                  <input
                    className="an-lb-search"
                    placeholder={t('analytics.searchPlaceholder')}
                    value={lbSearch}
                    onChange={e => setLbSearch(e.target.value)}
                  />
                  <span className="an-lb-count">{lbFiltered.length} {t('lb.colFullName').toLowerCase()}</span>
                </div>
                <table className="an-lb-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <SortableTh colKey="fullName"     label={t('analytics.reviewer')}    sortCol={lbSortCol} sortDir={lbSortDir} onSort={handleLbSort} />
                      <SortableTh colKey="enterpriseId" label={t('analytics.enterpriseId')} sortCol={lbSortCol} sortDir={lbSortDir} onSort={handleLbSort} />
                      <SortableTh colKey="reviewCount"  label={t('analytics.reviewCount')}  sortCol={lbSortCol} sortDir={lbSortDir} onSort={handleLbSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {lbRows.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', color: '#9CA3AF', padding: '1rem' }}>No reviewers match your search.</td></tr>
                    ) : lbRows.map((r, idx) => {
                      const rank = (lbPage - 1) * lbPageSize + idx + 1;
                      return (
                        <tr key={r.userId}>
                          <td className="an-rank">
                            {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                          </td>
                          <td>{r.fullName}</td>
                          <td className="an-eid">{r.enterpriseId}</td>
                          <td><span className="an-review-count">{r.reviewCount}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <TablePagination
                  page={lbPage}
                  totalPages={lbTotalPages}
                  pageSize={lbPageSize}
                  totalItems={lbFiltered.length}
                  onPageChange={setLbPage}
                  onSizeChange={setLbPageSize}
                  pageSizeOptions={[5, 10, 20, 50]}
                />
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
