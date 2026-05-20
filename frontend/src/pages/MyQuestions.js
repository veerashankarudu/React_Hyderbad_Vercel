/* global globalThis */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import API from '../api';
import StatusBadge from '../components/StatusBadge';
import Navbar from '../components/Navbar';
import SortableTh from '../components/SortableTh';
import TablePagination from '../components/TablePagination';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';
import { useContentTranslation } from '../hooks/useContentTranslation';
import './MyQuestions.css';

const STATUS_TABS = [
  { value: '', labelKey: 'common.all' },
  { value: 'DRAFT', labelKey: 'common.draft' },
  { value: 'READY_FOR_REVIEW', labelKey: 'common.readyForReview' },
  { value: 'UNDER_REVIEW', labelKey: 'common.inReview' },
  { value: 'APPROVED', labelKey: 'common.approved' },
  { value: 'REJECTED', labelKey: 'common.rejected' },
];
const DIFFICULTY_OPTIONS = ['EASY', 'MEDIUM', 'HARD'];

// Mock difficulty score until AI API key is configured.
// Uses mcq.aiScore if already set; otherwise derives a stable score from difficulty + id.
function diffScore(mcq) {
  if (mcq.aiScore != null) return mcq.aiScore;
  const id = mcq.id || 1;
  if (mcq.difficulty === 'EASY')   return 72 + (id % 18);  // 72-89
  if (mcq.difficulty === 'HARD')  return 32 + (id % 20);  // 32-51
  return 54 + (id % 16);                                   // 54-69 MEDIUM
}

function scoreStyle(s) {
  const bg  = s >= 80 ? '#D1FAE5' : s >= 60 ? '#FEF3C7' : '#FEE2E2';
  const clr = s >= 80 ? '#065F46' : s >= 60 ? '#92400E' : '#991B1B';
  return { bg, clr };
}

const MQ_COLUMNS = [
  { key: 'questionStem', labelKey: 'common.question' },
  { key: 'techStackName', labelKey: 'common.techStack' },
  { key: 'topicName', labelKey: 'common.topic' },
  { key: 'difficulty', labelKey: 'common.difficulty' },
  { key: 'status', labelKey: 'common.status' },
];

function getMqVal(m, key) {
  return (m[key] || '').toString().toLowerCase();
}

export default function MyQuestions() {
  const [searchParams] = useSearchParams();
  const [allMcqs, setAllMcqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('status') || '');
  const [difficulty, setDifficulty] = useState('');
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState('questionStem');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // AI Generator state
  const [showAiGen, setShowAiGen] = useState(false);
  const [techStacks, setTechStacks] = useState([]);
  const [topics, setTopics] = useState([]);
  const [aiForm, setAiForm] = useState({ techStackId: '', topicId: '', count: 3, difficulty: 'MEDIUM' });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState('');

  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const fetchMcqs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/mcqs');
      setAllMcqs(Array.isArray(data) ? data : (data.content || []));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMcqs(); }, [fetchMcqs]);
  useEffect(() => { setPage(0); }, [activeTab, difficulty, search, sortCol, sortDir, pageSize]);

  // Load tech stacks when AI generator opens
  useEffect(() => {
    if (!showAiGen) return;
    API.get('/master/tech-stacks').then(r => setTechStacks(r.data || [])).catch(() => {});
  }, [showAiGen]);

  // Load topics when tech stack changes
  useEffect(() => {
    if (!aiForm.techStackId) { setTopics([]); setAiForm(f => ({ ...f, topicId: '' })); return; }
    API.get(`/master/tech-stacks/${aiForm.techStackId}/topics`)
      .then(r => setTopics(r.data || []))
      .catch(() => setTopics([]));
  }, [aiForm.techStackId]);

  const handleAiGenerate = async () => {
    if (!aiForm.techStackId || !aiForm.topicId) { setAiError('Please select a tech stack and topic.'); return; }
    setAiLoading(true); setAiResult(null); setAiError('');
    try {
      const { data } = await API.post('/ai/generate-mcqs', {
        techStackId: Number(aiForm.techStackId),
        topicId: Number(aiForm.topicId),
        count: Number(aiForm.count),
        difficulty: aiForm.difficulty,
      });
      setAiResult(data);
      fetchMcqs(); // refresh list
    } catch (err) {
      setAiError(err.response?.data?.error || 'AI generation failed. Please try again.');
    } finally { setAiLoading(false); }
  };

  const handleMqSort = (key) => {
    if (sortCol === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }
    else { setSortCol(key); setSortDir('asc'); }
    setPage(0);
  };

  const handleSubmit = async (id) => {
    if (!globalThis.confirm(t('myQ2.confirmSubmit'))) return;
    try { await API.post(`/mcqs/${id}/submit`); fetchMcqs(); }
    catch (err) { globalThis.alert(err.response?.data?.message || t('common.failedSubmit')); }
  };

  const handleDelete = async (id) => {
    if (!globalThis.confirm(t('myQ2.confirmDelete'))) return;
    try { await API.delete(`/mcqs/${id}`); fetchMcqs(); }
    catch (err) { globalThis.alert(err.response?.data?.message || t('common.failedDelete')); }
  };

  // Per-status counts
  const counts = {};
  STATUS_TABS.forEach(t => {
    counts[t.value] = t.value === '' ? allMcqs.length : allMcqs.filter(m => m.status === t.value).length;
  });

  // Filter + sort + paginate client-side
  let filtered = allMcqs;
  if (activeTab) filtered = filtered.filter(m => m.status === activeTab);
  if (difficulty) filtered = filtered.filter(m => m.difficulty === difficulty);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(m => MQ_COLUMNS.some(col => getMqVal(m, col.key).includes(q)));
  }
  filtered = [...filtered].sort((a, b) => {
    const av = getMqVal(a, sortCol);
    const bv = getMqVal(b, sortCol);
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  // Translate visible page of question stems, tech stack names, topic names
  const myPagedStems = paged.map(m => m.questionStem);
  const myPagedTechs = paged.map(m => m.techStackName || '');
  const myPagedTopics = paged.map(m => m.topicName || '');
  const txMyPagedStems = useContentTranslation(myPagedStems);
  const txMyPagedTechs = useContentTranslation(myPagedTechs);
  const txMyPagedTopics = useContentTranslation(myPagedTopics);
  const showStart = filtered.length > 0 ? page * pageSize + 1 : 0;
  const showEnd   = Math.min((page + 1) * pageSize, filtered.length);

  return (
    <>
      <Navbar />
      <div className="page-container mq-page">
        <div className="page-header">
          <h2>{t('myQ.title')}</h2>
          <button className="btn-primary" onClick={() => setShowAddDialog(true)}>{t('myQ.addQuestion')}</button>
        </div>

        {/* ── Add Question Choice Dialog ── */}
        {showAddDialog && (
          <div className="dialog-overlay" onClick={() => setShowAddDialog(false)} onKeyDown={e => { if (e.key === 'Escape') setShowAddDialog(false); }} aria-hidden="true">
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
            <dialog open className="add-dialog" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
              <button className="add-dialog-close" onClick={() => setShowAddDialog(false)} type="button">✕</button>
              <div className="add-dialog-title">{t('myQ.addDialogTitle')}</div>
              <div className="add-dialog-options">
                <button type="button" className="add-option-btn" onClick={() => { setShowAddDialog(false); navigate('/mcq/create'); }}>
                  <span className="add-option-icon">✍️</span>
                  <span className="add-option-label">{t('myQ.addFromUi')}</span>
                  <span className="add-option-desc">{t('myQ.addFromUiDesc')}</span>
                </button>
                <button type="button" className="add-option-btn" onClick={() => { setShowAddDialog(false); navigate('/bulk-upload'); }}>
                  <span className="add-option-icon">📤</span>
                  <span className="add-option-label">{t('nav.bulkUpload')}</span>
                  <span className="add-option-desc">{t('myQ.bulkUploadDesc')}</span>
                </button>
                <button type="button" className="add-option-btn" style={{ '--hover-c': '#7C3AED' }} onClick={() => { setShowAddDialog(false); setAiResult(null); setAiError(''); setAiForm({ techStackId: '', topicId: '', count: 3, difficulty: 'MEDIUM' }); setShowAiGen(true); }}>
                  <span className="add-option-icon">🤖</span>
                  <span className="add-option-label">{t('ai.generatorTitle')}</span>
                  <span className="add-option-desc">{t('myQ.aiGeneratorDesc')}</span>
                </button>
              </div>
            </dialog>
          </div>
        )}

        {/* ── AI MCQ Generator Modal ── */}
        {showAiGen && (
          <div className="dialog-overlay" onClick={() => !aiLoading && setShowAiGen(false)} aria-hidden="true">
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
            <dialog open className="ai-gen-dialog" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
              {/* Header */}
              <div className="ai-gen-header">
                <div className="ai-gen-header-left">
                  <span className="ai-gen-icon">🤖</span>
                  <div>
                    <div className="ai-gen-title">{t('ai.generatorTitle')}</div>
                    <div className="ai-gen-sub">{t('ai.generatorSub')}</div>
                  </div>
                </div>
                {!aiLoading && <button className="add-dialog-close" style={{ position: 'relative', top: 0, right: 0 }} onClick={() => setShowAiGen(false)} type="button">✕</button>}
              </div>

              {/* Creator info banner */}
              <div className="ai-gen-creator-bar">
                <span className="ai-gen-creator-icon">👤</span>
                <span>{t('ai.mcqsCreatedAs')}: <strong>{user?.fullName || user?.enterpriseId}</strong> + AI Generated</span>
                <span className="ai-gen-badge">🤖 AI</span>
              </div>

              {aiResult ? (
                /* Success state */
                <div className="ai-gen-body">
                  <div className="ai-gen-success">
                    <div className="ai-gen-success-icon">✅</div>
                    <div className="ai-gen-success-title">{aiResult.generated} {t('ai.mcqsGenerated')}</div>
                    <div className="ai-gen-success-detail">
                      <strong>{aiResult.techStack}</strong> → <strong>{aiResult.topic}</strong><br />
                      {t('ai.createdBy')}: <strong>{aiResult.creatorFullName}</strong> + 🤖 AI<br />
                      <span style={{ color: '#6B7280', fontSize: '0.8rem' }}>{t('ai.savedAsDraft')}</span>
                    </div>
                  </div>
                  <div className="ai-gen-actions">
                    <button type="button" className="btn-secondary" onClick={() => { setAiResult(null); setAiError(''); }}>{t('ai.generateMore')}</button>
                    <button type="button" className="btn-primary" onClick={() => setShowAiGen(false)}>{t('ai.viewMyQuestions')}</button>
                  </div>
                </div>
              ) : (
                /* Form state */
                <div className="ai-gen-body">
                  <div className="ai-gen-form">
                    <div className="form-group">
                      <label>{t('form.techStack')}</label>
                      <select value={aiForm.techStackId} onChange={e => setAiForm(f => ({ ...f, techStackId: e.target.value, topicId: '' }))} disabled={aiLoading}>
                        <option value="">— {t('form.selectTechStack')} —</option>
                        {techStacks.map(ts => <option key={ts.id} value={ts.id}>{ts.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>{t('form.topic')}</label>
                      <select value={aiForm.topicId} onChange={e => setAiForm(f => ({ ...f, topicId: e.target.value }))} disabled={!aiForm.techStackId || aiLoading}>
                        <option value="">— {t('form.selectTopic')} —</option>
                        {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div className="ai-gen-row2">
                      <div className="form-group">
                        <label>{t('ai.numQuestions')}</label>
                        <select value={aiForm.count} onChange={e => setAiForm(f => ({ ...f, count: Number(e.target.value) }))} disabled={aiLoading}>
                          {[1,2,3,5,8,10].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>{t('form.difficulty')}</label>
                        <select value={aiForm.difficulty} onChange={e => setAiForm(f => ({ ...f, difficulty: e.target.value }))} disabled={aiLoading}>
                          <option value="EASY">{t('common.easy')}</option>
                          <option value="MEDIUM">{t('common.medium')}</option>
                          <option value="HARD">{t('common.hard')}</option>
                        </select>
                      </div>
                    </div>
                    {aiError && <div className="error-msg">{aiError}</div>}
                  </div>
                  <div className="ai-gen-actions">
                    <button type="button" className="btn-secondary" onClick={() => setShowAiGen(false)} disabled={aiLoading}>{t('common.cancel')}</button>
                    <button type="button" className="ai-gen-btn" onClick={handleAiGenerate} disabled={aiLoading || !aiForm.techStackId || !aiForm.topicId}>
                      {aiLoading ? (
                        <><span className="ai-gen-spinner" />{t('ai.generating', { count: aiForm.count })}</>
                      ) : (
                        <>🤖 {t('ai.generate', { count: aiForm.count })}</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </dialog>
          </div>
        )}

        {/* ── Status Tabs ── */}
        <div className="status-tabs">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              type="button"
              className={`status-tab${activeTab === tab.value ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.value)}
            >
              {t(tab.labelKey)}
              <span className="tab-count">{counts[tab.value] ?? 0}</span>
            </button>
          ))}
          <div className="tabs-spacer" />
          <input
            type="text"
            placeholder={t('common.searchQuestions')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="tabs-filter-select"
            style={{ minWidth: '180px' }}
          />
          <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="tabs-filter-select">
            <option value="">{t('common.allDifficulties')}</option>
            {DIFFICULTY_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {(() => {
          if (loading) return <div className="loading">Loading your questions...</div>;
          if (filtered.length === 0) return (
            <div className="empty-state">
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📝</div>
              <h3>{t('mq.noQuestionsFound')}</h3>
              <p>{activeTab ? t('mq.noQuestionsYet', { status: activeTab.replaceAll('_', ' ') }) : t('mq.getStarted')}</p>
            </div>
          );
          const plural = filtered.length === 1 ? '' : 's';
          return (
            <>
              <div className="results-count">
                {t('common.showing', { start: showStart, end: showEnd, total: filtered.length })}
              </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    {MQ_COLUMNS.map(col => (
                      <SortableTh key={col.key} colKey={col.key} label={t(col.labelKey)}
                        sortCol={sortCol} sortDir={sortDir} onSort={handleMqSort} />
                    ))}
                    <th>{t('common.actions')}</th>
                    <th>{t('common.difficultyScore')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((mcq, idx) => (
                    <tr key={mcq.id}>
                      <td>{page * pageSize + idx + 1}</td>
                      <td className="question-cell" title={mcq.questionStem}>{txMyPagedStems[idx] || mcq.questionStem}</td>
                      <td>{txMyPagedTechs[idx] || mcq.techStackName}</td>
                      <td>{txMyPagedTopics[idx] || mcq.topicName}</td>
                      <td><span className={`diff-badge ${mcq.difficulty?.toLowerCase()}`}>{mcq.difficulty}</span></td>
                      <td><StatusBadge status={mcq.status} /></td>
                      <td className="action-cell">
                        <button className="btn-sm btn-outline" onClick={() => navigate(`/mcq/${mcq.id}`)}>{t('common.view')}</button>
                        {['DRAFT', 'REJECTED'].includes(mcq.status) && (
                          <button className="btn-sm btn-outline" onClick={() => navigate(`/mcq/${mcq.id}/edit`)}>{t('common.edit')}</button>
                        )}
                        {mcq.status === 'DRAFT' && (
                          <button className="btn-sm btn-blue" onClick={() => handleSubmit(mcq.id)}>{t('common.submit')}</button>
                        )}
                        {mcq.status === 'DRAFT' && (
                          <button className="btn-sm btn-danger" onClick={() => handleDelete(mcq.id)}>{t('common.delete')}</button>
                        )}
                      </td>
                      <td>{(() => {
                        const score = diffScore(mcq);
                        const { bg, clr } = scoreStyle(score);
                        const isMock = mcq.aiScore == null;
                        return (
                          <span style={{ background: bg, color: clr, borderRadius: '4px', padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700 }}>
                            {score}/100{isMock ? ' *' : ''}
                          </span>
                        );
                      })()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem', paddingLeft: '0.25rem' }}>
              * Estimated score — will be replaced by real AI analysis once the API key is configured.
            </p>
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
    </>
  );
}

