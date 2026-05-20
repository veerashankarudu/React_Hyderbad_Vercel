import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import API from '../api';
import Navbar from '../components/Navbar';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';
import './MyQuestions.css';
import './McqForm.css';

function getSaveDraftLabel(loading, isEdit) {
  if (loading) return 'Saving...';
  if (isEdit) return 'Save';
  return 'Save as Draft';
}

export default function McqForm({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = mode === 'edit';
  const { user } = useAuth();
  const { t } = useTranslation();

  const [techStacks, setTechStacks] = useState([]);
  const [topics, setTopics] = useState([]);
  const [form, setForm] = useState({ techStackId: '', topicId: '', questionStem: '', optionA: '', optionB: '', optionC: '', optionD: '', correctAnswer: '', difficulty: 'MEDIUM' });
  const questionStemRef = useRef(null);

  // Wraps selected text (or inserts a template) in ```java ... ``` fences for coloured code blocks
  const wrapCodeBlock = () => {
    const el = questionStemRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = form.questionStem.slice(start, end).trim();
    const codeContent = selected || 'paste your code here';
    const fence = '```java\n' + codeContent + '\n```';
    const newVal = form.questionStem.slice(0, start) + fence + form.questionStem.slice(end);
    setForm(f => ({ ...f, questionStem: newVal }));
    // Place cursor inside the fence after inserting
    setTimeout(() => {
      const newCursor = start + '```java\n'.length + codeContent.length;
      el.focus();
      el.setSelectionRange(newCursor, newCursor);
    }, 0);
  };

  // AI Generator modal state
  const [showAiGen, setShowAiGen] = useState(false);
  const [aiTopics, setAiTopics] = useState([]);
  const [aiForm, setAiForm] = useState({ techStackId: '', topicId: '', count: 3, difficulty: 'MEDIUM' });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState({ text: '', dupId: null });
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [duplicateMatches, setDuplicateMatches] = useState([]);
  const [duplicateBlocked, setDuplicateBlocked] = useState(false);
  const [aiCheckLoading, setAiCheckLoading] = useState(false);
  const [validateResult, setValidateResult] = useState(null);
  const [validateLoading, setValidateLoading] = useState(false);
  const [distractorLoading, setDistractorLoading] = useState(false);
  const [distractorMsg, setDistractorMsg] = useState('');
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [explanations, setExplanations] = useState(null);
  const [reviewComments, setReviewComments] = useState([]);
  const [mcqStatus, setMcqStatus] = useState('');
  const [qualityResult, setQualityResult] = useState(null);
  const [qualityLoading, setQualityLoading] = useState(false);

  useEffect(() => { API.get('/master/tech-stacks').then(({ data }) => setTechStacks(Array.isArray(data) ? data : (data.content || []))); }, []);

  useEffect(() => {
    if (form.techStackId) {
      API.get(`/master/tech-stacks/${form.techStackId}/topics`).then(({ data }) => setTopics(Array.isArray(data) ? data : (data.content || [])));
    } else { setTopics([]); }
  }, [form.techStackId]);

  useEffect(() => {
    if (isEdit && id) {
      API.get(`/mcqs/${id}`).then(({ data }) => {
        setForm({ techStackId: data.techStackId, topicId: data.topicId, questionStem: data.questionStem, optionA: data.optionA, optionB: data.optionB, optionC: data.optionC, optionD: data.optionD, correctAnswer: data.correctAnswer, difficulty: data.difficulty });
        setMcqStatus(data.status || '');
        setReviewComments(data.comments || []);
      });
    }
    // Pre-fill from Screenshot-to-MCQ navigation
    if (!isEdit && location.state?.prefill) {
      const p = location.state.prefill;
      setForm((f) => ({ ...f, questionStem: p.questionStem || '', optionA: p.optionA || '', optionB: p.optionB || '', optionC: p.optionC || '', optionD: p.optionD || '', correctAnswer: p.correctAnswer || '', difficulty: p.difficulty || 'MEDIUM' }));
    }
  }, [isEdit, id, location.state]);

  const handleChange = (e) => { const { name, value, type, checked } = e.target; setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value })); setValidateResult(null); setExplanations(null); if (name === 'questionStem') { setDuplicateWarning(''); setDuplicateMatches([]); setDuplicateBlocked(false); } };
  const handleTechStackChange = (e) => { setForm((f) => ({ ...f, techStackId: e.target.value, topicId: '' })); };

  // AI Generator: load topics when ai tech stack changes
  useEffect(() => {
    if (!aiForm.techStackId) { setAiTopics([]); setAiForm(f => ({ ...f, topicId: '' })); return; }
    API.get(`/master/tech-stacks/${aiForm.techStackId}/topics`)
      .then(r => setAiTopics(r.data || []))
      .catch(() => setAiTopics([]));
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
    } catch (err) {
      setAiError(err.response?.data?.error || 'AI generation failed. Please try again.');
    } finally { setAiLoading(false); }
  };

  const handleDuplicateCheck = async () => {
    if (!form.questionStem.trim()) return;
    setAiCheckLoading(true); setDuplicateWarning(''); setDuplicateMatches([]); setDuplicateBlocked(false);
    try {
      const payload = { questionStem: form.questionStem };
      if (form.techStackId) payload.techStackId = Number(form.techStackId);
      if (form.topicId) payload.topicId = Number(form.topicId);
      if (isEdit && id) payload.excludeId = Number(id);
      const { data } = await API.post('/ai/check-duplicate-db', payload);
      if (data.aiError) {
        setDuplicateWarning('AI check unavailable: ' + data.aiError);
      } else {
        const matches = data.similarQuestions || [];
        setDuplicateMatches(matches);
        setDuplicateBlocked(data.blocked === true);
        if (matches.length === 0) {
          setDuplicateWarning('no-duplicates');
        } else {
          setDuplicateWarning(data.blocked ? 'blocked' : 'has-similar');
        }
      }
    } catch { setDuplicateWarning('AI check unavailable.'); }
    finally { setAiCheckLoading(false); }
  };

  const canValidate = form.questionStem.trim() && form.optionA.trim() && form.optionB.trim() && form.optionC.trim() && form.optionD.trim() && form.correctAnswer;

  const handleQualityCheck = async () => {
    if (!canValidate) return;
    setQualityLoading(true); setQualityResult(null);
    try {
      const { data } = await API.post('/ai/score-quality', {
        questionStem: form.questionStem,
        optionA: form.optionA, optionB: form.optionB, optionC: form.optionC, optionD: form.optionD,
        correctAnswer: form.correctAnswer,
        difficulty: form.difficulty,
      });
      setQualityResult(data);
    } catch { setQualityResult({ available: false, summary: 'AI scoring unavailable.' }); }
    finally { setQualityLoading(false); }
  };

  const handleValidateAnswer = async () => {
    if (!canValidate) return;
    setValidateLoading(true); setValidateResult(null);
    try {
      const { data } = await API.post('/ai/validate-answer', {
        questionStem: form.questionStem,
        optionA: form.optionA,
        optionB: form.optionB,
        optionC: form.optionC,
        optionD: form.optionD,
        correctAnswer: form.correctAnswer,
      });
      setValidateResult(data);
    } catch { setValidateResult({ available: false, explanation: 'AI validation unavailable.' }); }
    finally { setValidateLoading(false); }
  };

  const canGenerateDistractors = form.questionStem.trim() && form.optionA.trim();

  const handleGenerateDistractors = async () => {
    setDistractorLoading(true); setDistractorMsg('');
    try {
      const { data } = await API.post('/ai/generate-distractors', {
        questionStem: form.questionStem,
        correctAnswer: form.optionA,
      });
      if (data.available === false) { setDistractorMsg(data.error || 'AI unavailable.'); return; }
      const correct = form.optionA;
      const pool = [correct, data.optionB, data.optionC, data.optionD];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const correctIdx = pool.indexOf(correct);
      setForm(f => ({ ...f, optionA: pool[0], optionB: pool[1], optionC: pool[2], optionD: pool[3], correctAnswer: ['A','B','C','D'][correctIdx] }));
      setDistractorMsg('✅ 3 distractors generated and shuffled!');
    } catch { setDistractorMsg('AI distractor generation failed.'); }
    finally { setDistractorLoading(false); }
  };

  const canGenerateExplanations = form.questionStem.trim() && form.optionA.trim() && form.optionB.trim() && form.optionC.trim() && form.optionD.trim() && form.correctAnswer;

  const handleGenerateExplanations = async () => {
    setExplanationLoading(true); setExplanations(null);
    try {
      const { data } = await API.post('/ai/generate-explanations', {
        questionStem: form.questionStem,
        optionA: form.optionA, optionB: form.optionB, optionC: form.optionC, optionD: form.optionD,
        correctAnswer: form.correctAnswer,
      });
      setExplanations(data);
    } catch { setExplanations({ available: false, error: 'AI explanation unavailable.' }); }
    finally { setExplanationLoading(false); }
  };

  const handleSubmit = async (e, sendForReview) => {
    e.preventDefault();
    if (!form.correctAnswer) { setError({ text: 'Please select the correct answer.', dupId: null }); return; }
    if (sendForReview && duplicateBlocked) {
      setError({ text: 'This question is too similar to existing questions (≥30% similarity). Please revise the question before sending for review.', dupId: null });
      return;
    }
    setLoading(true); setError({ text: '', dupId: null });
    try {
      const payload = { questionStem: form.questionStem, optionA: form.optionA, optionB: form.optionB, optionC: form.optionC, optionD: form.optionD, correctAnswer: form.correctAnswer, difficulty: form.difficulty, techStackId: Number(form.techStackId), topicId: Number(form.topicId) };
      let res;
      if (isEdit) { res = await API.put(`/mcqs/${id}`, payload); }
      else { res = await API.post('/mcqs', payload); }
      if (sendForReview) {
        const mcqId = isEdit ? id : res.data.id;
        try { await API.post(`/mcqs/${mcqId}/submit`); } catch {}
      }
      navigate('/my-questions');
    } catch (err) {
      const raw = err.response?.data?.message || err.response?.data?.error || 'Failed to save MCQ.';
      if (raw.startsWith('DUPLICATE:')) {
        const parts = raw.split(':');
        const dupId = parts[1];
        const msg = parts.slice(2).join(':');
        setError({ text: msg, dupId });
        toast.error(`Duplicate! This question already exists. View it here → /mcq/${dupId}`, { autoClose: 8000 });
      } else {
        setError({ text: raw, dupId: null });
      }
    }
    finally { setLoading(false); }
  };

  const OPTIONS = ['A','B','C','D'];
  const optionFields = { A: 'optionA', B: 'optionB', C: 'optionC', D: 'optionD' };

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="page-header" style={{ marginBottom: '1rem' }}>
          <button className="btn-secondary" onClick={() => navigate(-1)}>&larr; Back</button>
          <h2>{isEdit ? t('form.editMcq') : t('form.createMcq')}</h2>
          {!isEdit && (
            <button type="button" className="ai-gen-shortcut-btn" onClick={() => { setAiResult(null); setAiError(''); setAiForm({ techStackId: '', topicId: '', count: 3, difficulty: 'MEDIUM' }); setShowAiGen(true); }}>
              🤖 {t('ai.generateWithAi')}
            </button>
          )}
          {isEdit && <div />}
        </div>

        {/* ── AI MCQ Generator Modal ── */}
        {showAiGen && (
          <div className="dialog-overlay" onClick={() => !aiLoading && setShowAiGen(false)} aria-hidden="true">
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
            <dialog open className="ai-gen-dialog" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
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
              <div className="ai-gen-creator-bar">
                <span className="ai-gen-creator-icon">👤</span>
                <span>{t('ai.mcqsCreatedAs')}: <strong>{user?.fullName || user?.enterpriseId}</strong> + AI Generated</span>
                <span className="ai-gen-badge">🤖 AI</span>
              </div>
              {aiResult ? (
                <div className="ai-gen-body">
                  <div className="ai-gen-success">
                    <div className="ai-gen-success-icon">✅</div>
                    <div className="ai-gen-success-title">{aiResult.generated} {t('ai.mcqsGenerated')}</div>
                    <div className="ai-gen-success-detail">
                      <strong>{aiResult.techStack}</strong> → <strong>{aiResult.topic}</strong><br />
                      {t('ai.createdBy')}: <strong>{aiResult.creatorFullName}</strong> + 🤖 AI<br />
                      <span style={{ color: '#6B7280', fontSize: '0.8rem' }}>{t('ai.savedAsDraft')}</span>
                      {aiResult.skippedDuplicates > 0 && (
                        <div style={{ marginTop: '0.5rem', color: '#d97706', fontSize: '0.8rem', fontWeight: 600 }}>
                          ⚠️ {aiResult.skippedDuplicates} question{aiResult.skippedDuplicates > 1 ? 's' : ''} skipped — too similar to existing questions (≥30%).
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ai-gen-actions">
                    <button type="button" className="btn-secondary" onClick={() => { setAiResult(null); setAiError(''); }}>{t('ai.generateMore')}</button>
                    <button type="button" className="btn-primary" onClick={() => { setShowAiGen(false); navigate('/my-questions'); }}>{t('ai.viewMyQuestions')}</button>
                  </div>
                </div>
              ) : (
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
                        {aiTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
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

        {/* Rejection feedback banner */}
        {isEdit && mcqStatus === 'REJECTED' && reviewComments.length > 0 && (
          <div className="rejection-banner">
            <div className="rejection-banner-title">📋 {t('form.reviewerFeedback')}</div>
            {reviewComments.map((c) => (
              <div key={c.id ?? c.createdAt ?? c.comment} className="rejection-comment">
                <span className="rejection-who">{c.reviewerEnterpriseId || c.authorName || c.authorEnterpriseId || c.reviewer} &bull; {new Date(c.createdAt).toLocaleDateString()}</span>
                <p className="rejection-text">{c.comment}</p>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-card">
            <div className="form-card-header"><h3>{t('form.classification')}</h3></div>
            <div className="form-card-body">
              <div className="form-row-3">
                <div className="form-group">
                  <label htmlFor="techStackId">{t('form.techStack')} *</label>
                  <select id="techStackId" name="techStackId" value={form.techStackId} onChange={handleTechStackChange} required>
                    <option value="">{t('form.selectTechStack')}</option>
                    {techStacks.map((ts) => <option key={ts.id} value={ts.id}>{ts.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="topicId">{t('form.topic')} *</label>
                  <select id="topicId" name="topicId" value={form.topicId} onChange={handleChange} required disabled={!form.techStackId}>
                    <option value="">{t('form.selectTopic')}</option>
                    {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="difficulty">{t('form.difficulty')} *</label>
                  <select id="difficulty" name="difficulty" value={form.difficulty} onChange={handleChange} required>
                    <option value="EASY">{t('common.easy')}</option>
                    <option value="MEDIUM">{t('common.medium')}</option>
                    <option value="HARD">{t('common.hard')}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="form-card">
            <div className="form-card-header"><h3>{t('form.question')}</h3></div>
            <div className="form-card-body">
              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <label htmlFor="questionStem">{t('form.questionStem')} *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <button type="button" onClick={wrapCodeBlock} style={{ fontSize: '0.75rem', padding: '0.2rem 0.65rem', borderRadius: '6px', border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.12)', color: '#a78bfa', cursor: 'pointer', fontWeight: 600, fontFamily: 'monospace' }}>
                    &lt;/&gt; Code Block
                  </button>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Select code text then click, or click to insert template</span>
                </div>
                <div className="ai-check-wrap">
                  <textarea ref={questionStemRef} id="questionStem" name="questionStem" value={form.questionStem} onChange={handleChange} placeholder="Enter the MCQ question..." required rows={4} />
                  <button type="button" className="ai-btn" onClick={handleDuplicateCheck} disabled={aiCheckLoading || !form.questionStem.trim()}>
                    {aiCheckLoading ? '🤖 Checking...' : '🤖 AI Check'}
                  </button>
                </div>
              </div>
              {duplicateWarning === 'no-duplicates' && (
                <div className="success-msg" style={{ marginBottom: '0.75rem' }}>
                  ✅ No significant duplicates found. Question looks unique!
                </div>
              )}
              {(duplicateWarning === 'blocked' || duplicateWarning === 'has-similar') && duplicateMatches.length > 0 && (
                <div className={duplicateBlocked ? 'warning-msg duplicate-match-box blocked' : 'warning-msg duplicate-match-box'} style={{ marginBottom: '0.75rem' }}>
                  <p style={{ marginBottom: '0.4rem', fontWeight: 600 }}>
                    {duplicateBlocked
                      ? '🚫 Duplicate detected — this question is ≥30% similar to existing questions. Revise before sending for review.'
                      : '⚠️ Similar questions found (below 30% threshold — review recommended):'}
                  </p>
                  <ul className="duplicate-match-list">
                    {duplicateMatches.map((m, i) => {
                      const pct = m.similarityPercent;
                      const color = pct >= 30 ? '#dc2626' : pct >= 20 ? '#d97706' : '#6b7280';
                      return (
                        <li key={i} className="duplicate-match-item">
                          <span className="dup-badge" style={{ background: color }}>{pct}%</span>
                          <span className="dup-id">Q#{m.id}</span>
                          <span className="dup-stem">{(m.questionStem || '').length > 120 ? (m.questionStem || '').substring(0, 120) + '…' : (m.questionStem || '')}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {duplicateWarning && duplicateWarning !== 'no-duplicates' && duplicateWarning !== 'blocked' && duplicateWarning !== 'has-similar' && (
                <div className="warning-msg" style={{ marginBottom: '0.75rem' }}>{duplicateWarning}</div>
              )}
            </div>
          </div>

          <div className="form-card">
            <div className="form-card-header"><h3>{t('form.answerOptions')}</h3></div>
            <div className="form-card-body">
              <div className="options-grid">
                {OPTIONS.map((key) => (
                  <div key={key} className="form-group">
                    <label>{t('form.option')} {key} {key === 'A' ? `* (${t('form.optionAHint')})` : '*'}</label>
                    <div className="option-input-wrap">
                      <span className="option-letter">{key}.</span>
                      <input type="text" name={optionFields[key]} value={form[optionFields[key]]} onChange={handleChange} placeholder={key === 'A' ? t('form.enterCorrectFirst') : t('form.optionPlaceholder', { key })} required />
                    </div>
                  </div>
                ))}
              </div>

              {/* AI Distractor Generator */}
              <div className="validate-section" style={{ marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="distractor-btn"
                  onClick={handleGenerateDistractors}
                  disabled={distractorLoading || !canGenerateDistractors}
                >
                  {distractorLoading ? '🤖 Generating...' : '🤖 AI: Generate Wrong Options (Distractors)'}
                </button>
                {!canGenerateDistractors && <span className="validate-hint">Enter question + Option A (correct answer) first</span>}
                {distractorMsg && <span className={distractorMsg.startsWith('✅') ? 'distractor-success' : 'distractor-error'}>{distractorMsg}</span>}
              </div>

                <div className="form-group">
                <label htmlFor="correctAnswerGroup">{t('form.correctAnswer')} *</label>
                <div className="radio-options">
                  {OPTIONS.map((key) => (
                    <label key={key} className="radio-label">
                      <input type="radio" name="correctAnswer" value={key} checked={form.correctAnswer === key} onChange={handleChange} />
                      {t('form.option')} {key}
                    </label>
                  ))}
                </div>
              </div>

              {error?.text && (
                <div className="error-msg" style={{ marginTop: '0.75rem' }}>
                  {error.text}
                  {error.dupId && (
                    <> &nbsp;<a href={`/mcq/${error.dupId}`} target="_blank" rel="noreferrer" style={{ color: '#f59e0b', fontWeight: 700, textDecoration: 'underline' }}>
                      🔗 View existing question
                    </a></>
                  )}
                </div>
              )}

              {/* AI Answer Validator */}
              <div className="validate-section">
                <button
                  type="button"
                  className="validate-btn"
                  onClick={handleValidateAnswer}
                  disabled={validateLoading || !canValidate}
                >
                  {validateLoading ? '🤖 Validating...' : '🤖 Validate Answer with AI'}
                </button>
                <button
                  type="button"
                  className="validate-btn"
                  onClick={handleQualityCheck}
                  disabled={qualityLoading || !canValidate}
                  style={{ marginLeft: '0.5rem', background: '#fef3c7', color: '#92400e', borderColor: '#d97706' }}
                >
                  {qualityLoading ? '⏳ Scoring...' : '🏅 AI Quality Check'}
                </button>
                {!canValidate && (
                  <span className="validate-hint">Fill all options + select correct answer to validate</span>
                )}
              </div>

              {qualityResult && (
                <div className="confidence-card" style={{ borderLeft: `4px solid ${qualityResult.available === false ? '#d1d5db' : qualityResult.qualityScore >= 80 ? '#059669' : qualityResult.qualityScore >= 60 ? '#d97706' : '#dc2626'}`, marginBottom: '0.75rem' }}>
                  {qualityResult.available === false ? (
                    <div className="confidence-row"><span className="conf-icon">⚠️</span><span className="conf-text">{qualityResult.summary}</span></div>
                  ) : (
                    <>
                      <div className="confidence-row" style={{ alignItems: 'center' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: qualityResult.qualityScore >= 80 ? '#059669' : qualityResult.qualityScore >= 60 ? '#d97706' : '#dc2626' }}>{qualityResult.qualityScore}</span>
                        <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600, marginLeft: '0.2rem', marginRight: '0.75rem' }}>/100</span>
                        <span className="conf-verdict" style={{ fontSize: '0.82rem' }}>{qualityResult.summary}</span>
                      </div>
                      {!qualityResult.difficultyMatch && qualityResult.suggestedDifficulty && (
                        <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', background: '#fef3c7', color: '#92400e', padding: '0.3rem 0.6rem', borderRadius: '6px', fontWeight: 600 }}>
                          ⚠️ Difficulty mismatch: you selected <strong>{form.difficulty}</strong>, AI suggests <strong>{qualityResult.suggestedDifficulty}</strong>
                        </div>
                      )}
                      {qualityResult.issues && qualityResult.issues.length > 0 && (
                        <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.2rem', fontSize: '0.78rem', color: '#6b7280' }}>
                          {qualityResult.issues.map((iss, i) => <li key={i}>{iss}</li>)}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              )}

              {validateResult && (() => {
                let cardClass = 'confidence-card';
                if (validateResult.available === false) cardClass += ' unavailable';
                else if (validateResult.isCorrect) cardClass += ' correct';
                else cardClass += ' incorrect';

                let scoreColor = '#DC2626';
                if (validateResult.confidenceScore >= 80) scoreColor = '#059669';
                else if (validateResult.confidenceScore >= 60) scoreColor = '#D97706';

                return (
                  <div className={cardClass}>
                    {validateResult.available === false ? (
                    <div className="confidence-row">
                      <span className="conf-icon">⚠️</span>
                      <span className="conf-text">{validateResult.explanation}</span>
                    </div>
                  ) : (
                    <>
                      <div className="confidence-row">
                        <span className="conf-icon">{validateResult.isCorrect ? '✅' : '⚠️'}</span>
                        <span className="conf-verdict">{validateResult.isCorrect ? 'Answer Correct' : 'Answer May Be Wrong'}</span>
                        {validateResult.confidenceScore != null && (
                          <span className="conf-score-badge" style={{ background: scoreColor }}>
                            {validateResult.confidenceScore}% confidence
                          </span>
                        )}
                      </div>
                      {validateResult.confidenceScore != null && (
                        <div className="conf-bar-wrap">
                          <div className="conf-bar" style={{ width: `${validateResult.confidenceScore}%`, background: scoreColor }} />
                        </div>
                      )}
                      {validateResult.explanation && (
                        <p className="conf-explanation">{validateResult.explanation}</p>
                      )}
                      {validateResult.ambiguityWarning && (
                        <p className="conf-ambiguity">⚠️ {validateResult.ambiguityWarning}</p>
                      )}
                    </>
                  )}
                </div>
              );
            })()}

              {/* AI Explanation Generator */}
              <div className="validate-section">
                <button
                  type="button"
                  className="explain-btn"
                  onClick={handleGenerateExplanations}
                  disabled={explanationLoading || !canGenerateExplanations}
                >
                  {explanationLoading ? '🤖 Generating...' : '🤖 AI: Explain All Options'}
                </button>
                {!canGenerateExplanations && <span className="validate-hint">Fill all options + correct answer first</span>}
              </div>

              {explanations && (
                <div className="explanation-card">
                  {explanations.available === false ? (
                    <p className="exp-unavailable">{explanations.error}</p>
                  ) : (
                    <>
                      <div className="exp-row exp-correct">
                        <span className="exp-label">✅ Why {form.correctAnswer} is correct:</span>
                        <span className="exp-text">{explanations.whyCorrect}</span>
                      </div>
                      {['A','B','C','D'].filter(k => k !== form.correctAnswer).map(k => (
                        explanations[`why${k}Wrong`] && (
                          <div key={k} className="exp-row">
                            <span className="exp-label">❌ Why {k} is wrong:</span>
                            <span className="exp-text">{explanations[`why${k}Wrong`]}</span>
                          </div>
                        )
                      ))}
                    </>
                  )}
                </div>
              )}

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>{t('common.cancel')}</button>
                <button type="button" className="btn-secondary" disabled={loading} onClick={(e) => handleSubmit(e, false)}>
                  {loading ? t('common.saving') : (isEdit ? t('common.save') : t('form.saveAsDraft'))}
                </button>
                {(!isEdit || mcqStatus === 'REJECTED') && (
                  <button type="button" className="btn-primary" disabled={loading || duplicateBlocked} title={duplicateBlocked ? 'Duplicate detected — revise the question first' : ''} onClick={(e) => handleSubmit(e, true)}>
                    {loading ? t('common.saving') : duplicateBlocked ? '🚫 Duplicate — Revise First' : t('form.saveAndSend')}
                  </button>
                )}
                {isEdit && mcqStatus !== 'REJECTED' && (
                  <button type="button" className="btn-primary" disabled={loading} onClick={(e) => handleSubmit(e, false)}>
                    {loading ? t('common.saving') : t('form.updateMcq')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

McqForm.propTypes = {
  mode: PropTypes.string,
};
