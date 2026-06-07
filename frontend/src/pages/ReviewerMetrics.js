import React, { useState, useEffect } from 'react';
import API from '../api';
import Navbar from '../components/Navbar';
import { useTranslation } from 'react-i18next';
import { useContentTranslation } from '../hooks/useContentTranslation';
import SortableTh from '../components/SortableTh';
import TablePagination from '../components/TablePagination';
import './ReviewerMetrics.css';

function hoursColor(h) {
  if (h >= 72) return '#dc2626';
  if (h >= 48) return '#d97706';
  return '#059669';
}

function approvalColor(r) {
  if (r >= 80) return '#059669';
  if (r >= 50) return '#d97706';
  return '#dc2626';
}

export default function ReviewerMetrics() {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState([]);
  const [sla, setSla] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mPage, setMPage] = useState(1);
  const [sPage, setSPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [mSort, setMSort] = useState({ col: 'fullName', dir: 'asc' });
  const [sSort, setSSort] = useState({ col: 'hoursStuck', dir: 'desc' });

  // Translate visible SLA breach question stems
  const slaStems = sla.map(m => m.questionStem || '');
  const txSlaStems = useContentTranslation(slaStems);
  const slaStemMap = Object.fromEntries(sla.map((m, i) => [m.id ?? i, txSlaStems[i] || m.questionStem]));

  const sortRows = (arr, col, dir) => [...arr].sort((a, b) => {
    const av = typeof a[col] === 'number' ? a[col] : (a[col] || '').toString().toLowerCase();
    const bv = typeof b[col] === 'number' ? b[col] : (b[col] || '').toString().toLowerCase();
    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ? 1 : -1;
    return 0;
  });

  const handleMSort = (col) => { setMSort(s => ({ col, dir: s.col === col ? (s.dir === 'asc' ? 'desc' : 'asc') : 'asc' })); setMPage(1); };
  const handleSSort = (col) => { setSSort(s => ({ col, dir: s.col === col ? (s.dir === 'asc' ? 'desc' : 'asc') : 'asc' })); setSPage(1); };

  useEffect(() => {
    Promise.all([
      API.get('/stats/reviewer-metrics'),
      API.get('/stats/sla-breach'),
    ]).then(([mRes, sRes]) => {
      setMetrics(Array.isArray(mRes.data) ? mRes.data : []);
      setSla(Array.isArray(sRes.data) ? sRes.data : []);
    }).catch(err => setError(err.response?.data?.message || 'Failed to load metrics.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Navbar />
      <div className="page-container rm-page">
        <div className="page-header" style={{ marginBottom: '1.25rem' }}>
          <h2>{t('rm.title')}</h2>
        </div>

        {error && <div className="error-msg">{error}</div>}

        {loading ? (
          <div className="loading">{t('rm.loading')}</div>
        ) : (
          <>
            {/* Reviewer table */}
            <div className="detail-card" style={{ marginBottom: '1.5rem' }}>
              <div style={{ padding: '1rem 1.25rem', fontWeight: 700, fontSize: '0.95rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span>{t('rm.allPerformance')}</span>
              </div>
              {metrics.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>{t('rm.noData')}</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                    <thead>
                      <tr className="rm-thead-row" style={{ textAlign: 'left' }}>
                        {[{col:'fullName',label:t('rm.colReviewer')},{col:'enterpriseId',label:t('rm.colEnterpriseId')},{col:'totalAssigned',label:t('rm.colAssigned')},{col:'completed',label:t('rm.colCompleted')},{col:'approved',label:t('rm.colApproved')},{col:'rejected',label:t('rm.colRejected')},{col:'pending',label:t('rm.colPending')},{col:'approvalRate',label:t('rm.colApprovalRate')}].map(h => (
                          <SortableTh key={h.col} colKey={h.col} label={h.label}
                            sortCol={mSort.col} sortDir={mSort.dir} onSort={handleMSort}
                            style={{ padding: '0.65rem 1rem', textAlign: h.col !== 'fullName' && h.col !== 'enterpriseId' ? 'center' : 'left' }} />
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortRows(metrics, mSort.col, mSort.dir).slice((mPage-1)*pageSize, mPage*pageSize).map((r, i) => (
                        <tr key={r.userId || i} className="rm-row">
                          <td style={{ padding: '0.6rem 1rem', fontWeight: 600 }}>{r.fullName}</td>
                          <td style={{ padding: '0.6rem 1rem', fontFamily: 'monospace', fontSize: '0.78rem' }} className="rm-muted">{r.enterpriseId}</td>
                          <td style={{ padding: '0.6rem 1rem', textAlign: 'center', fontWeight: 600 }}>{r.totalAssigned}</td>
                          <td style={{ padding: '0.6rem 1rem', textAlign: 'center' }}>{r.completed}</td>
                          <td style={{ padding: '0.6rem 1rem', textAlign: 'center', color: '#059669', fontWeight: 600 }}>{r.approved}</td>
                          <td style={{ padding: '0.6rem 1rem', textAlign: 'center', color: '#dc2626', fontWeight: 600 }}>{r.rejected}</td>
                          <td style={{ padding: '0.6rem 1rem', textAlign: 'center', color: '#d97706' }}>{r.pending}</td>
                          <td style={{ padding: '0.6rem 1rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                              <div className="rm-progress-bg" style={{ width: '60px', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${r.approvalRate}%`, height: '100%', background: approvalColor(r.approvalRate), borderRadius: '3px' }} />
                              </div>
                              <span style={{ fontWeight: 700, color: approvalColor(r.approvalRate), fontSize: '0.82rem' }}>{r.approvalRate}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <TablePagination
                page={mPage}
                totalPages={Math.ceil(metrics.length / pageSize)}
                pageSize={pageSize}
                onPageChange={setMPage}
                onSizeChange={n => { setPageSize(n); setMPage(1); setSPage(1); }}
                totalItems={metrics.length}
                dark
              />
            </div>

            {/* SLA Breach section */}
            <div className="detail-card">
              <div style={{ padding: '1rem 1.25rem', fontWeight: 700, fontSize: '0.95rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span>{t('rm.slaTitle')}</span>
                {sla.length > 0 && (
                  <span className="rm-sla-badge">
                    {t('rm.breached', { count: sla.length })}
                  </span>
                )}
              </div>
              {sla.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#059669', fontWeight: 600 }}>{t('rm.noSla')}</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                    <thead>
                      <tr className="rm-sla-thead-row" style={{ textAlign: 'left' }}>
                        {[{col:'id',label:t('rm.colMcqId')},{col:'questionStem',label:t('rm.colQuestion')},{col:'status',label:t('rm.colStatus')},{col:'techStack',label:t('rm.colTechStack')},{col:'creatorName',label:t('rm.colCreator')},{col:'reviewerName',label:t('rm.colReviewerName')},{col:'hoursStuck',label:t('rm.colTimeStuck')}].map(h => (
                          <SortableTh key={h.col} colKey={h.col} label={h.label}
                            sortCol={sSort.col} sortDir={sSort.dir} onSort={handleSSort}
                            style={{ padding: '0.65rem 1rem' }} />
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortRows(sla, sSort.col, sSort.dir).slice((sPage-1)*pageSize, sPage*pageSize).map((m, i) => (
                        <tr key={m.id || i} className="rm-sla-row">
                          <td style={{ padding: '0.6rem 1rem', fontWeight: 700 }} className="rm-sla-id">#{m.id}</td>
                          <td style={{ padding: '0.6rem 1rem', maxWidth: '280px' }} className="rm-sla-text">{((slaStemMap[m.id ?? i] || m.questionStem || '').substring(0, 80))}{(slaStemMap[m.id ?? i] || m.questionStem)?.length > 80 ? '…' : ''}</td>
                          <td style={{ padding: '0.6rem 1rem' }}><span className="rm-status-badge">{m.status?.replace('_',' ')}</span></td>
                          <td style={{ padding: '0.6rem 1rem', fontSize: '0.78rem' }}>{m.techStack}</td>
                          <td style={{ padding: '0.6rem 1rem', fontSize: '0.78rem' }}>{m.creatorName}</td>
                          <td style={{ padding: '0.6rem 1rem', fontSize: '0.78rem' }}>{m.reviewerName || '—'}</td>
                          <td style={{ padding: '0.6rem 1rem' }}>
                            <span style={{ fontWeight: 700, color: hoursColor(m.hoursStuck), fontSize: '0.88rem' }}>
                              {m.hoursStuck}h
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <TablePagination
                page={sPage}
                totalPages={Math.ceil(sla.length / pageSize)}
                pageSize={pageSize}
                onPageChange={setSPage}
                onSizeChange={n => { setPageSize(n); setMPage(1); setSPage(1); }}
                totalItems={sla.length}
                dark
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}
