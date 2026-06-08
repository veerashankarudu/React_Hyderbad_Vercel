import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import API from '../api';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import AssignReviewerModal from '../components/AssignReviewerModal';
import SortableTh from '../components/SortableTh';
import TablePagination from '../components/TablePagination';
import { useTranslation } from 'react-i18next';
import { useContentTranslation } from '../hooks/useContentTranslation';
import './MyQuestions.css';
import './QuestionBank.css';

const STATUS_OPTIONS = ['DRAFT','READY_FOR_REVIEW','UNDER_REVIEW','APPROVED','REJECTED'];
const DIFFICULTY_OPTIONS = ['EASY','MEDIUM','HARD'];
const PAGE_SIZE = 10;

const QB_COLUMNS = [
  { key: 'questionStem', labelKey: 'qb2.colQuestion' },
  { key: 'techStackName', labelKey: 'qb2.colTechStack' },
  { key: 'topicName', labelKey: 'qb2.colTopic' },
  { key: 'difficulty', labelKey: 'qb2.colDiff' },
  { key: 'status', labelKey: 'qb2.colStatus' },
  { key: 'creatorFullName', labelKey: 'qb2.colCreator' },
  { key: 'reviewerFullName', labelKey: 'qb2.colReviewer' },
];

function getQbVal(m, key) {
  return (m[key] || '').toString().toLowerCase();
}

export default function QuestionBank() {
  const [searchParams] = useSearchParams();
  const [mcqs, setMcqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: searchParams.get('status') || '', difficulty: '', techStackId: '', search: '' });
  const [techStacks, setTechStacks] = useState([]);
  const [assignModal, setAssignModal] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [menuPos, setMenuPos] = useState(null); // { id, top, right, mcq }
  const [sortCol, setSortCol] = useState('questionStem');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [semanticQuery, setSemanticQuery] = useState('');
  const [semanticResults, setSemanticResults] = useState(null);
  const [semanticLoading, setSemanticLoading] = useState(false);

  const handleQbSort = (key) => {
    if (sortCol === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }
    else { setSortCol(key); setSortDir('asc'); }
    setPage(0);
  };
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => { API.get('/master/tech-stacks').then(({ data }) => setTechStacks(Array.isArray(data) ? data : (data.content || []))); }, []);

  const fetchMcqs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.difficulty) params.difficulty = filters.difficulty;
      if (filters.techStackId) params.techStackId = filters.techStackId;
      const { data } = await API.get('/admin/mcqs', { params });
      setMcqs(Array.isArray(data) ? data : (data.content || []));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filters.status, filters.difficulty, filters.techStackId]);

  useEffect(() => { fetchMcqs(); }, [fetchMcqs]);
  useEffect(() => { setPage(0); }, [filters, pageSize]);

  let filtered = mcqs;
  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter(m => QB_COLUMNS.some(col => getQbVal(m, col.key).includes(q)));
  }
  filtered = [...filtered].sort((a, b) => {
    const av = getQbVal(a, sortCol);
    const bv = getQbVal(b, sortCol);
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const handleDelete = async (mcq) => {
    if (!window.confirm(`Delete "${mcq.questionStem.substring(0, 60)}..."? This cannot be undone.`)) return;
    setDeleting(mcq.id);
    try {
      await API.delete(`/admin/mcqs/${mcq.id}`);
      fetchMcqs();
    } catch (err) {
      alert(err?.response?.data?.message || t('common.deleteFailed'));
    } finally {
      setDeleting(null);
    }
  };

  const openMenu = (e, mcq) => {
    const r = e.currentTarget.getBoundingClientRect();
    setMenuPos({ id: mcq.id, top: r.bottom + 4, right: window.innerWidth - r.right, mcq });
  };

  const closeMenu = () => setMenuPos(null);

  const byStatus = (s) => mcqs.filter(m => m.status === s).length;
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);

  // Translate visible page of question stems, tech stack names, topic names
  const pagedStems = paginated.map(m => m.questionStem);
  const pagedTechs = paginated.map(m => m.techStackName || '');
  const pagedTopics = paginated.map(m => m.topicName || '');
  const txPagedStems = useContentTranslation(pagedStems);
  const txPagedTechs = useContentTranslation(pagedTechs);
  const txPagedTopics = useContentTranslation(pagedTopics);

  const handleSemanticSearch = async () => {
    if (!semanticQuery.trim()) return;
    setSemanticLoading(true);
    setSemanticResults(null);
    try {
      const payload = { query: semanticQuery, limit: 10 };
      if (filters.techStackId) payload.techStackId = Number(filters.techStackId);
      const { data } = await API.post('/ai/semantic-search', payload);
      setSemanticResults(data);
    } catch { setSemanticResults({ error: 'Semantic search unavailable.', results: [] }); }
    finally { setSemanticLoading(false); }
  };

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="page-header">
          <h2>{t('qb.title')}</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn-outline"
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}
              onClick={() => {
                const params = new URLSearchParams();
                if (filters.status) params.append('status', filters.status);
                if (filters.techStackId) params.append('techStackId', filters.techStackId);
                const url = `http://localhost:8080/api/v1/admin/mcqs/export${params.toString() ? '?' + params.toString() : ''}`;
                const token = localStorage.getItem('token');
                fetch(url, { headers: { Authorization: `Bearer ${token}` } })
                  .then(r => r.blob())
                  .then(blob => {
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = 'MCQ_Export.xlsx';
                    a.click();
                  });
              }}
            >⬇️ {t('qb.exportExcel')}</button>
            <button className="btn-primary" onClick={() => navigate('/mcq/create')}>{t('common.createMcq')}</button>
          </div>
        </div>

        <div className="qb-stats-bar">
          <div className="qb-stat-pill"><span className="qb-stat-num" style={{ color: 'var(--primary)' }}>{mcqs.length}</span><span className="qb-stat-label">{t('qb.statTotal')}</span></div>
          <div className="qb-stat-pill"><span className="qb-stat-num" style={{ color: 'var(--success)' }}>{byStatus('APPROVED')}</span><span className="qb-stat-label">{t('qb.statApproved')}</span></div>
          <div className="qb-stat-pill"><span className="qb-stat-num" style={{ color: 'var(--warning)' }}>{byStatus('UNDER_REVIEW')}</span><span className="qb-stat-label">{t('qb.statUnderReview')}</span></div>
          <div className="qb-stat-pill"><span className="qb-stat-num" style={{ color: 'var(--info)' }}>{byStatus('READY_FOR_REVIEW')}</span><span className="qb-stat-label">{t('qb.statReady')}</span></div>
          <div className="qb-stat-pill"><span className="qb-stat-num" style={{ color: 'var(--error)' }}>{byStatus('REJECTED')}</span><span className="qb-stat-label">{t('qb.statRejected')}</span></div>
        </div>

        <div className="filter-bar">
          <input type="text" placeholder={t('qb.searchPlaceholder')} value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} style={{ minWidth: '220px' }} />
          <select value={filters.techStackId} onChange={(e) => setFilters({ ...filters, techStackId: e.target.value })}>
            <option value="">{t('common.allTechStacks')}</option>
            {techStacks.map((ts) => <option key={ts.id} value={ts.id}>{ts.name}</option>)}
          </select>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">{t('common.allStatuses')}</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replaceAll('_',' ')}</option>)}
          </select>
          <select value={filters.difficulty} onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}>
            <option value="">{t('common.allDifficulties')}</option>
            {DIFFICULTY_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* Semantic Search Bar */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '0.75rem 0', padding: '10px 14px', background: 'rgba(161,0,255,0.05)', border: '1px solid rgba(161,0,255,0.15)', borderRadius: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#A100FF', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>🧠 Semantic Search</span>
          <input
            type="text"
            placeholder="e.g. thread safety in concurrent Java, REST idempotency..."
            value={semanticQuery}
            onChange={e => { setSemanticQuery(e.target.value); if (!e.target.value) setSemanticResults(null); }}
            onKeyDown={e => e.key === 'Enter' && handleSemanticSearch()}
            style={{ flex: 1, minWidth: '240px', padding: '7px 12px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '0.88rem' }}
          />
          <button
            onClick={handleSemanticSearch}
            disabled={semanticLoading || !semanticQuery.trim()}
            style={{ padding: '7px 18px', background: 'linear-gradient(135deg,#A100FF,#7B00C0)', color: '#fff', border: 'none', borderRadius: '7px', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', opacity: (semanticLoading || !semanticQuery.trim()) ? 0.55 : 1 }}
          >{semanticLoading ? '⏳ Searching…' : '🔍 Search'}</button>
          {semanticResults && (
            <button onClick={() => { setSemanticResults(null); setSemanticQuery(''); }} style={{ padding: '7px 12px', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '7px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>✕ Clear</button>
          )}
        </div>

        {/* Semantic Search Results */}
        {semanticResults && (
          <div style={{ marginBottom: '1rem', padding: '12px 16px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px' }}>
            <div style={{ fontWeight: 700, marginBottom: '0.6rem', color: '#374151', fontSize: '0.9rem' }}>
              🧠 Semantic Results for <em>"{semanticQuery}"</em>
              <span style={{ marginLeft: '8px', fontWeight: 400, fontSize: '0.82rem', color: '#6b7280' }}>
                {semanticResults.total} match{semanticResults.total !== 1 ? 'es' : ''} · via {semanticResults.results?.[0]?.source || 'keywords'}
              </span>
            </div>
            {semanticResults.error && <div style={{ color: '#dc2626', fontSize: '0.85rem' }}>{semanticResults.error}</div>}
            {(semanticResults.results || []).map(r => (
              <div key={r.id} onClick={() => navigate(`/mcq/${r.id}`)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', marginBottom: '4px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor='#A100FF'}
                onMouseLeave={e => e.currentTarget.style.borderColor='#e5e7eb'}>
                <div style={{ minWidth: '48px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#A100FF' }}>{Math.round((r.similarity || 0) * 100)}%</div>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>match</div>
                </div>
                <div style={{ flex: 1, fontSize: '0.85rem', color: '#111827' }}>
                  {r.questionStem?.length > 120 ? r.questionStem.substring(0, 120) + '…' : r.questionStem}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  {r.techStack && <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: '#F3E8FF', color: '#7B00C0', borderRadius: '10px' }}>{r.techStack}</span>}
                  {r.difficulty && <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: r.difficulty==='HARD'?'#fee2e2':r.difficulty==='EASY'?'#dcfce7':'#fef3c7', color: r.difficulty==='HARD'?'#991b1b':r.difficulty==='EASY'?'#166534':'#92400e', borderRadius: '10px' }}>{r.difficulty}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {(() => {
          if (loading) return <div className="loading">{t('common.loading')}</div>;
          if (filtered.length === 0) return <div className="empty-state"><div>{t('qb.noMcqs')}</div></div>;
          const plural = filtered.length === 1 ? '' : 's';
          return (
          <>
            <div className="results-count">{filtered.length} question{plural}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
            </div>
            <div className="table-wrapper">
              <table className="data-table qb-table">
                <colgroup>
                  <col style={{ width: '3%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '13%' }} />
                  <col style={{ width: '13%' }} />
                  <col style={{ width: '8%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>#</th>
                    {QB_COLUMNS.map(col => (
                      <SortableTh key={col.key} colKey={col.key} label={t(col.labelKey)}
                        sortCol={sortCol} sortDir={sortDir} onSort={handleQbSort} />
                    ))}
                    <th style={{ textAlign: 'center' }}>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((mcq, idx) => (
                    <tr key={mcq.id}>
                      <td>{page * pageSize + idx + 1}</td>
                      <td className="question-cell" title={mcq.questionStem}>{txPagedStems[idx] || mcq.questionStem}</td>
                      <td>{txPagedTechs[idx] || mcq.techStackName}</td>
                      <td>{txPagedTopics[idx] || mcq.topicName}</td>
                      <td><span className={`diff-badge ${mcq.difficulty?.toLowerCase()}`}>{mcq.difficulty}</span></td>
                      <td><StatusBadge status={mcq.status} /></td>
                      <td><span title={mcq.creatorFullName}>{mcq.creatorEnterpriseId || mcq.creatorFullName}</span></td>
                      <td>{mcq.reviewerFullName || <span style={{ color: 'var(--text-light)' }}>&mdash;</span>}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="qb-menu-btn"
                          onClick={(e) => menuPos?.id === mcq.id ? closeMenu() : openMenu(e, mcq)}
                          title="Actions"
                        >⋮</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={page + 1}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageChange={p => setPage(p - 1)}
              onSizeChange={n => { setPageSize(n); setPage(0); }}
              totalItems={filtered.length}
            />
          </>
          );
        })()}
      </div>

      {assignModal && (
        <AssignReviewerModal mcq={assignModal} onClose={() => setAssignModal(null)} onAssigned={() => { setAssignModal(null); fetchMcqs(); }} />
      )}

      {menuPos && (
        <>
          <div className="qb-overlay" onClick={closeMenu} />
          <div className="qb-dropdown" style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}>
            <button onClick={() => { navigate(`/mcq/${menuPos.mcq.id}`); closeMenu(); }}>👁 {t('common.view')}</button>
            <button onClick={() => { navigate(`/mcq/${menuPos.mcq.id}/edit`); closeMenu(); }}>✏️ {t('common.edit')}</button>
            {menuPos.mcq.status === 'READY_FOR_REVIEW' && <button onClick={() => { setAssignModal(menuPos.mcq); closeMenu(); }}>👤 {t('qb.assign')}</button>}
            <button className="qb-dropdown-delete" onClick={() => { closeMenu(); handleDelete(menuPos.mcq); }} disabled={deleting === menuPos.mcq.id}>🗑 {t('common.delete')}</button>
          </div>
        </>
      )}
    </>
  );
}
