import React, { useState, useEffect, useCallback } from 'react';
import API, { cachedGet, isCacheWarm, getCacheSync } from '../api';
import Navbar from '../components/Navbar';
import { useTranslation } from 'react-i18next';
import SortableTh from '../components/SortableTh';
import TablePagination from '../components/TablePagination';
import './AuditLog.css';

const ACTION_ICON = {
  APPROVE: '✅',
  REJECT: '❌',
  ASSIGN: '👤',
  UNASSIGN: '🚫',
  REGISTER: '🆕',
  ROLE_CHANGE: '🔄',
  DEACTIVATE: '🔒',
  REACTIVATE: '🔓',
  DELETE: '🗑️',
};

function getActionColor(action) {
  if (!action) return '#6b7280';
  const a = action.toUpperCase();
  if (a.includes('APPROVE')) return '#059669';
  if (a.includes('REJECT') || a.includes('DEACTIVATE')) return '#dc2626';
  if (a.includes('ASSIGN')) return '#2563eb';
  if (a.includes('REGISTER') || a.includes('REACTIVATE')) return '#6983FF';
  return '#d97706';
}

export default function AuditLog() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState(() => { const d = getCacheSync('/admin/audit-log'); return Array.isArray(d) ? d : (d?.content || []); });
  const [filtered, setFiltered] = useState(() => { const d = getCacheSync('/admin/audit-log'); return Array.isArray(d) ? d : (d?.content || []); });
  const [loading, setLoading] = useState(() => !isCacheWarm('/admin/audit-log'));
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortCol, setSortCol] = useState('timestamp');
  const [sortDir, setSortDir] = useState('desc');

  const handleSort = (key) => {
    if (sortCol === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }
    else { setSortCol(key); setSortDir('asc'); }
    setPage(1);
  };

  const loadLogs = useCallback(() => {
    setLoading(true);
    cachedGet('/admin/audit-log')
      .then(({ data }) => {
        const arr = Array.isArray(data) ? data : [];
        setLogs(arr);
        setFiltered(arr);
      })
      .catch(err => setError(err.response?.data?.message || 'Failed to load audit log.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  useEffect(() => {
    let result = logs;
    if (actionFilter) result = result.filter(l => (l.action || '').toUpperCase().includes(actionFilter.toUpperCase()));
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        (l.actorEnterpriseId || '').toLowerCase().includes(q) ||
        (l.targetEnterpriseId || '').toLowerCase().includes(q) ||
        (l.action || '').toLowerCase().includes(q) ||
        (l.details || '').toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [search, actionFilter, logs]);

  // Reset to page 1 when filters/size change
  useEffect(() => { setPage(1); }, [search, actionFilter, pageSize]);

  const uniqueActions = [...new Set(logs.map(l => l.action).filter(Boolean))].sort();

  return (
    <>
      <Navbar />
      <div className="page-container al-page">
        <div className="page-header" style={{ marginBottom: '1.25rem' }}>
          <h2>{t('auditLog.title')}</h2>
          <button className="btn-secondary" onClick={loadLogs} disabled={loading}>{t('auditLog.refresh')}</button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder={t('auditLog.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '220px', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.84rem' }}
          />
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="al-select"
            style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.84rem' }}
          >
            <option value="">{t('auditLog.allActions')}</option>
            {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <span style={{ alignSelf: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{t('auditLog.entries', { count: filtered.length })}</span>
        </div>

        {loading ? (
          <div className="loading">{t('auditLog.loading')}</div>
        ) : filtered.length === 0 ? (
          <div className="detail-card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            {t('auditLog.empty')}
          </div>
        ) : (
          <>
          <div className="detail-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr className="al-thead-row" style={{ textAlign: 'left' }}>
                    <th style={{ padding: '0.65rem 1rem' }}>#</th>
                    {[{key:'timestamp',label:t('auditLog.colTime')},{key:'actorEnterpriseId',label:t('auditLog.colActor')},{key:'action',label:t('auditLog.colAction')},{key:'targetEnterpriseId',label:t('auditLog.colTarget')},{key:'details',label:t('auditLog.colDetails')}].map(col => (
                      <SortableTh key={col.key} colKey={col.key} label={col.label}
                        sortCol={sortCol} sortDir={sortDir} onSort={handleSort}
                        style={{ padding: '0.65rem 1rem' }} />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...filtered].sort((a, b) => {
                    const av = sortCol === 'timestamp' ? new Date(a.timestamp || 0).getTime() : (a[sortCol] || '').toString().toLowerCase();
                    const bv = sortCol === 'timestamp' ? new Date(b.timestamp || 0).getTime() : (b[sortCol] || '').toString().toLowerCase();
                    if (av < bv) return sortDir === 'asc' ? -1 : 1;
                    if (av > bv) return sortDir === 'asc' ? 1 : -1;
                    return 0;
                  }).slice((page-1)*pageSize, page*pageSize).map((log, i) => {
                    const actionColor = getActionColor(log.action);
                    const icon = ACTION_ICON[log.action?.toUpperCase()] || '📋';
                    return (
                      <tr key={log.id || i} className="al-row">
                        <td style={{ padding: '0.55rem 1rem', fontSize: '0.75rem' }} className="al-details">{log.id}</td>
                        <td style={{ padding: '0.55rem 1rem', whiteSpace: 'nowrap', fontSize: '0.78rem' }} className="al-details">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                        </td>
                        <td style={{ padding: '0.55rem 1rem', fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 600 }} className="al-actor">
                          {log.actorEnterpriseId || '—'}
                        </td>
                        <td style={{ padding: '0.55rem 1rem' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                            padding: '0.15rem 0.65rem', borderRadius: '10px', fontSize: '0.75rem',
                            fontWeight: 700, background: `${actionColor}18`, color: actionColor, whiteSpace: 'nowrap'
                          }}>
                            {icon} {log.action || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '0.55rem 1rem', fontFamily: 'monospace', fontSize: '0.78rem' }} className="al-target">
                          {log.targetEnterpriseId || '—'}
                        </td>
                        <td style={{ padding: '0.55rem 1rem', maxWidth: '320px', wordBreak: 'break-word' }} className="al-details">
                          {log.details || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <TablePagination
            page={page}
            totalPages={Math.ceil(filtered.length / pageSize)}
            pageSize={pageSize}
            onPageChange={setPage}
            onSizeChange={n => { setPageSize(n); setPage(1); }}
            totalItems={filtered.length}
            dark
          />
          </>
        )}
      </div>
    </>
  );
}
