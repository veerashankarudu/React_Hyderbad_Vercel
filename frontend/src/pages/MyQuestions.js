/* global globalThis */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import API, { cachedGet, isCacheWarm, getCacheSync } from '../api';
import StatusBadge from '../components/StatusBadge';
import Navbar from '../components/Navbar';
import SortableTh from '../components/SortableTh';
import TablePagination from '../components/TablePagination';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';
import { useContentTranslation } from '../hooks/useContentTranslation';
import {
  PenLine, Upload, Bot, Code2, Camera, GripVertical, Link2, ArrowRightFromLine,
  TextCursorInput, Sparkles, Bug, Puzzle, Database, Building2, Eye, Wrench,
  BarChart3, Rocket, Shield, Brain, CheckCircle2, RefreshCw, UserRound, Circle, CheckSquare
} from 'lucide-react';
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

function diffScore(mcq) {
  if (mcq.aiScore != null) return mcq.aiScore;
  return null;
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
  { key: 'updatedAt', labelKey: 'common.lastModified' },
];

function getMqVal(m, key) {
  if (key === 'updatedAt') return m[key] || m['createdAt'] || '';
  return (m[key] || '').toString().toLowerCase();
}

export default function MyQuestions() {
  const [searchParams] = useSearchParams();
  const [allMcqs, setAllMcqs] = useState(() => { const d = getCacheSync('/mcqs'); return Array.isArray(d) ? d : (d?.content || []); });
  const [loading, setLoading] = useState(() => !isCacheWarm('/mcqs'));
  const [activeTab, setActiveTab] = useState(searchParams.get('status') || '');
  const [difficulty, setDifficulty] = useState('');
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState('updatedAt');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [scoringIds, setScoringIds] = useState(new Set());

  // AI Generator state
  const [showAiGen, setShowAiGen] = useState(false);
  const [techStacks, setTechStacks] = useState([]);
  const [topics, setTopics] = useState([]);
  const [aiForm, setAiForm] = useState({ techStackId: '', topicId: '', count: 3, difficulty: 'MEDIUM', questionType: 'SINGLE' });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState('');

  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const fetchMcqs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await cachedGet('/mcqs');
      setAllMcqs(Array.isArray(data) ? data : (data.content || []));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMcqs(); }, [fetchMcqs]);
  useEffect(() => { setPage(0); }, [activeTab, difficulty, search, sortCol, sortDir, pageSize]);

  // Fetch real AI scores for MCQs that don't have one yet
  useEffect(() => {
    const unscored = allMcqs.filter(m => m.aiScore == null);
    if (unscored.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const mcq of unscored) {
        if (cancelled) break;
        setScoringIds(prev => new Set([...prev, mcq.id]));
        try {
          const { data } = await API.post('/ai/score-quality', {
            mcqId: mcq.id,
            questionStem: mcq.questionStem, optionA: mcq.optionA, optionB: mcq.optionB,
            optionC: mcq.optionC, optionD: mcq.optionD, correctOption: mcq.correctOption,
            difficultyLevel: mcq.difficulty, techStack: mcq.techStackName, topic: mcq.topicName
          });
          if (!cancelled && data.available && data.qualityScore != null) {
            setAllMcqs(prev => prev.map(m => m.id === mcq.id ? { ...m, aiScore: data.qualityScore } : m));
          }
        } catch (_) { /* skip */ }
        setScoringIds(prev => { const n = new Set(prev); n.delete(mcq.id); return n; });
      }
    })();
    return () => { cancelled = true; };
  }, [allMcqs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load tech stacks when AI generator opens
  useEffect(() => {
    if (!showAiGen) return;
    cachedGet('/master/tech-stacks').then(r => setTechStacks(r.data || [])).catch(() => {});
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
        questionType: aiForm.questionType,
      }, { timeout: 300000 });
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
    catch (err) {
      const raw = err.response?.data?.error || err.response?.data?.message || t('common.failedSubmit');
      // Strip internal "DUPLICATE:ID:" prefix and show the human-readable part
      const msg = raw.startsWith('DUPLICATE:') ? raw.replace(/^DUPLICATE:\d+:/, '') : raw;
      globalThis.alert(msg);
    }
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
          <div>
            <h2>{t('myQ.title')}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>Questions created by logged-in user</p>
          </div>
          <button className="btn-primary" onClick={() => setShowAddDialog(true)}>{t('myQ.addQuestion')}</button>
        </div>

        {/* ── Add Question Choice Dialog ── */}
        {showAddDialog && (
          <div className="dialog-overlay" onClick={() => setShowAddDialog(false)} onKeyDown={e => { if (e.key === 'Escape') setShowAddDialog(false); }} aria-hidden="true">
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
            <dialog open className="add-dialog add-dialog-wide" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
              <button className="add-dialog-close" onClick={() => setShowAddDialog(false)} type="button">✕</button>
              <div className="add-dialog-title">{t('myQ.addDialogTitle')}</div>
              <div className="add-dialog-options">
                <button type="button" className="add-option-btn" onClick={() => { setShowAddDialog(false); navigate('/mcq/create'); }}>
                  <span className="add-option-icon"><PenLine size={22} /></span>
                  <span className="add-option-label">{t('myQ.addFromUi')}</span>
                  <span className="add-option-desc">{t('myQ.addFromUiDesc')}</span>
                </button>
                <button type="button" className="add-option-btn" onClick={() => { setShowAddDialog(false); navigate('/bulk-upload'); }}>
                  <span className="add-option-icon"><Upload size={22} /></span>
                  <span className="add-option-label">{t('nav.bulkUpload')}</span>
                  <span className="add-option-desc">{t('myQ.bulkUploadDesc')}</span>
                </button>
                <button type="button" className="add-option-btn" style={{ '--hover-c': '#A100FF' }} onClick={() => { setShowAddDialog(false); setAiResult(null); setAiError(''); setAiForm({ techStackId: '', topicId: '', count: 3, difficulty: 'MEDIUM', questionType: 'SINGLE' }); setShowAiGen(true); }}>
                  <span className="add-option-icon"><Bot size={22} /></span>
                  <span className="add-option-label">{t('ai.generatorTitle')}</span>
                  <span className="add-option-desc">{t('myQ.aiGeneratorDesc')}</span>
                </button>
                <button type="button" className="add-option-btn" style={{ '--hover-c': '#B84DFF' }} onClick={() => { setShowAddDialog(false); navigate('/screenshot-mcq'); }}>
                  <span className="add-option-icon"><Camera size={22} /></span>
                  <span className="add-option-label">{t('common.screenshot')}</span>
                  <span className="add-option-desc">{t('common.screenshotHint')}</span>
                </button>
                <button type="button" className="add-option-btn" style={{ '--hover-c': '#059669' }} onClick={() => { setShowAddDialog(false); navigate('/coding/create'); }}>
                  <span className="add-option-icon"><Code2 size={22} /></span>
                  <span className="add-option-label">{t('myQ.codingQuestion')}</span>
                  <span className="add-option-desc">{t('myQ.codingQuestionDesc')}</span>
                </button>
              </div>
              <div className="add-dialog-divider">── Advanced Question Types ──</div>
              <div className="add-dialog-grid">
                {[
                  { id: 'DRAG_ORDER', icon: <GripVertical size={20} />, title: 'Drag & Drop Ordering' },
                  { id: 'MATCH_PAIRS', icon: <Link2 size={20} />, title: 'Match Pairs' },
                  { id: 'CODE_OUTPUT', icon: <ArrowRightFromLine size={20} />, title: 'Code → Output' },
                  { id: 'FILL_BLANK', icon: <TextCursorInput size={20} />, title: 'Fill in the Blank' },
                  { id: 'PREDICT_OUTPUT', icon: <Sparkles size={20} />, title: 'Predict Output' },
                  { id: 'DEBUG_CODE', icon: <Bug size={20} />, title: 'Debug the Code' },
                  { id: 'CODE_REARRANGE', icon: <Puzzle size={20} />, title: 'Code Rearrange' },
                  { id: 'SQL_BUILDER', icon: <Database size={20} />, title: 'SQL Builder' },
                  { id: 'ARCH_LAYERS', icon: <Building2 size={20} />, title: 'Architecture Layers' },
                  { id: 'CODE_REVIEW', icon: <Eye size={20} />, title: 'Code Review' },
                  { id: 'PIPELINE_BUILD', icon: <Wrench size={20} />, title: 'Pipeline Builder' },
                  { id: 'FLOWCHART', icon: <BarChart3 size={20} />, title: 'Flowchart' },
                  { id: 'DEVOPS_PIPE', icon: <Rocket size={20} />, title: 'DevOps Pipeline' },
                  { id: 'SECURE_CODE', icon: <Shield size={20} />, title: 'Secure Coding' },
                  { id: 'RIDDLE', icon: <Brain size={20} />, title: 'Tech Riddles' },
                ].map(qt => (
                  <button key={qt.id} type="button" className="add-grid-btn" onClick={() => { setShowAddDialog(false); navigate(`/question-type-create/${qt.id}`); }}>
                    <span className="add-grid-icon">{qt.icon}</span>
                    <span className="add-grid-label">{qt.title}</span>
                  </button>
                ))}
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
                  <span className="ai-gen-icon"><Bot size={18} /></span>
                  <div>
                    <div className="ai-gen-title">{t('ai.generatorTitle')}</div>
                    <div className="ai-gen-sub">{t('ai.generatorSub')}</div>
                  </div>
                </div>
                {!aiLoading && <button className="add-dialog-close" style={{ position: 'relative', top: 0, right: 0 }} onClick={() => setShowAiGen(false)} type="button">✕</button>}
              </div>

              {/* Creator info banner */}
              <div className="ai-gen-creator-bar">
                <span className="ai-gen-creator-icon"><UserRound size={14} /></span>
                <span>{t('ai.mcqsCreatedAs')}: <strong>{user?.fullName || user?.enterpriseId}</strong> + AI Generated</span>
                <span className="ai-gen-badge"><Bot size={12} /> AI</span>
              </div>

              {aiResult ? (
                /* Success state */
                <div className="ai-gen-body">
                  <div className="ai-gen-success">
                    <div className="ai-gen-success-icon"><CheckCircle2 size={32} color="#059669" /></div>
                    <div className="ai-gen-success-title">{aiResult.generated} {t('ai.mcqsGenerated')}</div>
                    <div className="ai-gen-success-detail">
                      <strong>{aiResult.techStack}</strong> → <strong>{aiResult.topic}</strong><br />
                      {t('ai.createdBy')}: <strong>{aiResult.creatorFullName}</strong> + <Bot size={12} style={{verticalAlign:'middle'}} /> AI<br />
                      <span style={{ color: '#6B7280', fontSize: '0.8rem' }}>{t('ai.savedAsDraft')}</span>
                      {aiResult.replacedDuplicates > 0 && (
                        <><br /><span style={{ color: '#D97706', fontSize: '0.8rem', fontWeight: 600 }}><RefreshCw size={12} style={{verticalAlign:'middle'}} /> {aiResult.replacedDuplicates} duplicate(s) auto-replaced with new questions</span></>
                      )}
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
                    <div className="form-group">
                      <label>Question Type</label>
                      <select value={aiForm.questionType} onChange={e => setAiForm(f => ({ ...f, questionType: e.target.value }))} disabled={aiLoading}>
                        <option value="SINGLE"><Circle size={12} /> Single Choice MCQ</option>
                        <option value="MULTI"><CheckSquare size={12} /> Multiple Choice</option>
                        <option value="DRAG_ORDER">Drag & Drop Ordering</option>
                        <option value="MATCH_PAIRS">Match Pairs</option>
                        <option value="CODE_OUTPUT">Code → Output</option>
                        <option value="FILL_BLANK">Fill in the Blank</option>
                        <option value="PREDICT_OUTPUT">Predict Output</option>
                        <option value="DEBUG_CODE">Debug the Code</option>
                        <option value="CODE_REARRANGE">Code Rearrange</option>
                        <option value="SQL_BUILDER">SQL Builder</option>
                        <option value="ARCH_LAYERS">Architecture Layers</option>
                        <option value="CODE_REVIEW">Code Review</option>
                        <option value="PIPELINE_BUILD">Pipeline Builder</option>
                        <option value="FLOWCHART">Flowchart</option>
                        <option value="DEVOPS_PIPE">DevOps Pipeline</option>
                        <option value="SECURE_CODE">Secure Coding</option>
                        <option value="RIDDLE">Tech Riddles</option>
                      </select>
                    </div>
                    {aiError && <div className="error-msg">{aiError}</div>}
                  </div>
                  <div className="ai-gen-actions">
                    <button type="button" className="btn-secondary" onClick={() => setShowAiGen(false)} disabled={aiLoading}>{t('common.cancel')}</button>
                    <button type="button" className="ai-gen-btn" onClick={handleAiGenerate} disabled={aiLoading || !aiForm.techStackId || !aiForm.topicId}>
                      {aiLoading ? (
                        <><span className="ai-gen-spinner" />{t('ai.generating', { count: aiForm.count })}</>
                      ) : (
                        <><Bot size={14} style={{marginRight:'0.3rem',verticalAlign:'middle'}} /> {t('ai.generate', { count: aiForm.count })}</>
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
                      <td className="date-cell">{mcq.updatedAt ? new Date(mcq.updatedAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                      <td className="action-cell">
                        {mcq.status === 'DRAFT' && (
                          <button className="btn-sm btn-outline" onClick={() => navigate(`/mcq/${mcq.id}/edit`)}>{t('common.edit')}</button>
                        )}
                        {mcq.status === 'DRAFT' && (
                          <button className="btn-sm btn-danger" onClick={() => handleDelete(mcq.id)}>{t('common.delete')}</button>
                        )}
                        {['READY_FOR_REVIEW', 'UNDER_REVIEW', 'APPROVED'].includes(mcq.status) && (
                          <button className="btn-sm btn-outline" onClick={() => navigate(`/mcq/${mcq.id}`)}>{t('common.view')}</button>
                        )}
                        {mcq.status === 'REJECTED' && (
                          <button className="btn-sm btn-outline" onClick={() => navigate(`/mcq/${mcq.id}/edit`)}>{t('common.edit')}</button>
                        )}
                        {mcq.status === 'REJECTED' && (
                          <button className="btn-sm btn-blue" onClick={() => handleSubmit(mcq.id)}>{t('common.submit')}</button>
                        )}
                        {mcq.status === 'REJECTED' && (
                          <button className="btn-sm btn-danger" onClick={() => handleDelete(mcq.id)}>{t('common.delete')}</button>
                        )}
                      </td>
                      <td>{(() => {
                        const score = diffScore(mcq);
                        if (score == null) return scoringIds.has(mcq.id)
                          ? <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Scoring…</span>
                          : <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>;
                        const { bg, clr } = scoreStyle(score);
                        return (
                          <span style={{ background: bg, color: clr, borderRadius: '4px', padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700 }}>
                            {score}/100
                          </span>
                        );
                      })()}</td>
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
    </>
  );
}

