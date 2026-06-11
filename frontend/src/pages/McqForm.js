import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Bot, Search, CheckCircle2, AlertTriangle, PenLine, ClipboardList, Sparkles, XCircle } from 'lucide-react';
import API from '../api';
import Navbar from '../components/Navbar';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';
import './MyQuestions.css';
import './McqForm.css';

export default function McqForm({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = mode === 'edit';
  const { user } = useAuth();
  const { t } = useTranslation();

  const [techStacks, setTechStacks] = useState([]);
  const [topics, setTopics] = useState([]);
  const [form, setForm] = useState({ techStackId: '', topicId: '', questionStem: '', optionA: '', optionB: '', optionC: '', optionD: '', correctAnswer: '', difficulty: 'MEDIUM', imageUrl: '', videoUrl: '', mediaType: 'TEXT', questionType: 'SINGLE' });
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
  const [showDupModal, setShowDupModal] = useState(false);
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
        setForm({ techStackId: data.techStackId, topicId: data.topicId, questionStem: data.questionStem, optionA: data.optionA, optionB: data.optionB, optionC: data.optionC, optionD: data.optionD, correctAnswer: data.correctAnswer, difficulty: data.difficulty, imageUrl: data.imageUrl || '', videoUrl: data.videoUrl || '', mediaType: data.mediaType || 'TEXT', questionType: data.questionType || 'SINGLE' });
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

  // ── Auto-trigger AI duplicate check while typing (debounced 2s) ──
  const dupCheckTimerRef = useRef(null);
  useEffect(() => {
    if (dupCheckTimerRef.current) clearTimeout(dupCheckTimerRef.current);
    const stem = form.questionStem.trim();
    // Only auto-check if question has at least 8 chars (meaningful query)
    if (stem.length < 8) return;
    dupCheckTimerRef.current = setTimeout(async () => {
      setAiCheckLoading(true); setDuplicateWarning(''); setDuplicateMatches([]); setDuplicateBlocked(false);
      try {
        const payload = { questionStem: form.questionStem };
        if (form.techStackId) payload.techStackId = Number(form.techStackId);
        if (form.topicId) payload.topicId = Number(form.topicId);
        if (isEdit && id) payload.excludeId = Number(id);
        const { data } = await API.post('/ai/check-duplicate-db', payload);
        if (data.aiError) {
          setDuplicateWarning('');
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
      } catch { /* AI unavailable — silent fail for auto-check */ }
      finally { setAiCheckLoading(false); }
    }, 2000);
    return () => { if (dupCheckTimerRef.current) clearTimeout(dupCheckTimerRef.current); };
  }, [form.questionStem, form.techStackId, form.topicId, isEdit, id]);

  // AI Generator: load topics when ai tech stack changes
  useEffect(() => {
    if (!aiForm.techStackId) { setAiTopics([]); setAiForm(f => ({ ...f, topicId: '' })); return; }
    API.get(`/master/tech-stacks/${aiForm.techStackId}/topics`)
      .then(r => setAiTopics(r.data || []))
      .catch(() => setAiTopics([]));
  }, [aiForm.techStackId]);

  // AI Generator: two-step flow (preview → keep/remove → save)
  const [aiPreview, setAiPreview] = useState(null); // preview data with questions + dup info
  const [aiKeep, setAiKeep] = useState({}); // { index: true/false } — which questions to keep
  const [aiSaving, setAiSaving] = useState(false);

  const handleAiGenerate = async () => {
    if (!aiForm.techStackId || !aiForm.topicId) { setAiError('Please select a tech stack and topic.'); return; }
    setAiLoading(true); setAiResult(null); setAiPreview(null); setAiError('');
    try {
      const { data } = await API.post('/ai/generate-mcqs-preview', {
        techStackId: Number(aiForm.techStackId),
        topicId: Number(aiForm.topicId),
        count: Number(aiForm.count),
        difficulty: aiForm.difficulty,
      }, { timeout: 300000 });
      // Initialize keep state: all kept by default (even duplicates — user decides)
      const keepMap = {};
      (data.questions || []).forEach((_, i) => { keepMap[i] = true; });
      setAiKeep(keepMap);
      setAiPreview(data);
    } catch (err) {
      setAiError(err.response?.data?.error || 'AI generation failed. Please try again.');
    } finally { setAiLoading(false); }
  };

  const handleAiSaveSelected = async () => {
    if (!aiPreview) return;
    const selectedQuestions = aiPreview.questions.filter((_, i) => aiKeep[i]);
    if (selectedQuestions.length === 0) { setAiError('Please keep at least one question to save.'); return; }
    setAiSaving(true); setAiError('');
    try {
      const { data } = await API.post('/ai/save-generated-mcqs', {
        techStackId: Number(aiForm.techStackId),
        topicId: Number(aiForm.topicId),
        difficulty: aiForm.difficulty,
        questions: selectedQuestions.map(q => ({
          questionStem: q.questionStem,
          optionA: q.optionA, optionB: q.optionB, optionC: q.optionC, optionD: q.optionD,
          correctAnswer: q.correctAnswer, difficulty: q.difficulty,
        })),
      });
      setAiResult({ ...data, generated: data.saved, techStack: aiPreview.techStack, topic: aiPreview.topic, creatorFullName: aiPreview.creatorFullName });
      setAiPreview(null);
    } catch (err) {
      setAiError(err.response?.data?.error || 'Failed to save questions.');
    } finally { setAiSaving(false); }
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
        if (data.blocked === true && matches.length > 0) setShowDupModal(true);
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
      setDistractorMsg('done');
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
      setError({ text: 'This question is ≥30% similar to existing questions. You must revise the question before sending for review.', dupId: null });
      return;
    }
    // Auto-trigger duplicate check on "Save & Send for Review" (PPT Slide 8 requirement)
    if (sendForReview && form.questionStem.trim()) {
      setLoading(true); setError({ text: '', dupId: null });
      try {
        const dupPayload = { questionStem: form.questionStem };
        if (form.techStackId) dupPayload.techStackId = Number(form.techStackId);
        if (form.topicId) dupPayload.topicId = Number(form.topicId);
        if (isEdit && id) dupPayload.excludeId = Number(id);
        const { data: dupData } = await API.post('/ai/check-duplicate-db', dupPayload);
        if (!dupData.aiError) {
          const matches = dupData.similarQuestions || [];
          setDuplicateMatches(matches);
          setDuplicateBlocked(dupData.blocked === true);
          if (dupData.blocked) {
            setDuplicateWarning('blocked');
            setShowDupModal(true);
            setError({ text: 'AI detected ≥30% similarity with existing questions. Please revise the question before sending for review.', dupId: null });
            setLoading(false);
            return;
          }
        }
      } catch {
        // AI unavailable — allow submit to proceed (backend will also check)
      }
    }
    setLoading(true); setError({ text: '', dupId: null });
    try {
      const payload = { questionStem: form.questionStem, optionA: form.optionA, optionB: form.optionB, optionC: form.optionC, optionD: form.optionD, correctAnswer: form.correctAnswer, difficulty: form.difficulty, techStackId: Number(form.techStackId), topicId: Number(form.topicId), imageUrl: form.imageUrl || null, videoUrl: form.videoUrl || null, mediaType: form.mediaType || 'TEXT', questionType: form.questionType || 'SINGLE' };
      let res;
      if (isEdit) { res = await API.put(`/mcqs/${id}`, payload); }
      else { res = await API.post('/mcqs', payload); }
      if (sendForReview) {
        const mcqId = isEdit ? id : res.data.id;
        try { await API.post(`/mcqs/${mcqId}/submit`); } catch (submitErr) {
          const submitMsg = submitErr.response?.data?.error || submitErr.response?.data?.message || '';
          if (submitMsg.startsWith('DUPLICATE:')) {
            const parts = submitMsg.split(':');
            const dupId = parts[1];
            const msg = parts.slice(2).join(':');
            setError({ text: msg, dupId });
            toast.error(`Duplicate detected! ${msg}`, { autoClose: 8000 });
            setLoading(false);
            return;
          }
          // Other submit errors — show message but stay on page
          const friendlyMsg = submitMsg || 'Failed to submit for review.';
          setError({ text: friendlyMsg, dupId: null });
          toast.error(friendlyMsg, { autoClose: 6000 });
          setLoading(false);
          return;
        }
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
              <Bot size={16} style={{marginRight:"0.35rem",verticalAlign:"middle"}} /> {t('ai.generateWithAi')}
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
                  <span className="ai-gen-icon"><Bot size={18} /></span>
                  <div>
                    <div className="ai-gen-title">{t('ai.generatorTitle')}</div>
                    <div className="ai-gen-sub">{t('ai.generatorSub')}</div>
                  </div>
                </div>
                {!aiLoading && <button className="add-dialog-close" style={{ position: 'relative', top: 0, right: 0 }} onClick={() => setShowAiGen(false)} type="button">✕</button>}
              </div>
              <div className="ai-gen-creator-bar">
                <span className="ai-gen-creator-icon"><Bot size={14} /></span>
                <span>{t('ai.mcqsCreatedAs')}: <strong>{user?.fullName || user?.enterpriseId}</strong> + AI Generated</span>
                <span className="ai-gen-badge"><Bot size={12} /> AI</span>
              </div>
              {aiResult ? (
                <div className="ai-gen-body">
                  <div className="ai-gen-success">
                    <div className="ai-gen-success-icon"><CheckCircle2 size={32} color="#059669" /></div>
                    <div className="ai-gen-success-title">{aiResult.generated || aiResult.saved} {t('ai.mcqsGenerated')}</div>
                    <div className="ai-gen-success-detail">
                      <strong>{aiResult.techStack}</strong> → <strong>{aiResult.topic}</strong><br />
                      {t('ai.createdBy')}: <strong>{aiResult.creatorFullName}</strong> + <Bot size={12} style={{verticalAlign:'middle'}} /> AI<br />
                      <span style={{ color: '#6B7280', fontSize: '0.8rem' }}>{t('ai.savedAsDraft')}</span>
                    </div>
                  </div>
                  <div className="ai-gen-actions">
                    <button type="button" className="btn-secondary" onClick={() => { setAiResult(null); setAiError(''); setAiPreview(null); }}>{t('ai.generateMore')}</button>
                    <button type="button" className="btn-primary" onClick={() => { setShowAiGen(false); navigate('/my-questions'); }}>{t('ai.viewMyQuestions')}</button>
                  </div>
                </div>
              ) : aiPreview ? (
                /* ── PREVIEW STEP: Show generated questions with duplicate matches ── */
                <div className="ai-gen-body" style={{ maxHeight: '60vh', overflow: 'auto' }}>
                  <div style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <strong>{aiPreview.questions.length}</strong> questions generated for <strong>{aiPreview.techStack}</strong> → <strong>{aiPreview.topic}</strong>.
                    Review below — toggle off any you don't want to save.
                  </div>
                  {aiPreview.questions.map((q, idx) => {
                    const kept = aiKeep[idx] !== false;
                    const hasDup = q.isDuplicate;
                    const matches = q.duplicateMatches || [];
                    return (
                      <div key={idx} style={{ border: `1px solid ${hasDup ? '#fbbf24' : 'var(--border)'}`, borderRadius: '10px', padding: '0.75rem', marginBottom: '0.6rem', background: kept ? (hasDup ? 'rgba(251,191,36,0.08)' : 'var(--card-bg)') : 'rgba(100,100,100,0.1)', opacity: kept ? 1 : 0.5, transition: 'all 0.2s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.3rem' }}>
                              {hasDup && <span style={{ color: '#d97706', marginRight: '0.3rem' }}><AlertTriangle size={12} style={{marginRight:'0.2rem',verticalAlign:'middle'}} /> Duplicate</span>}
                              {q.wasReplaced && <span style={{ color: '#059669', marginRight: '0.3rem', fontSize: '0.72rem', fontWeight: 700 }}>🔄 Auto-replaced (original was a duplicate)</span>}
                              Q{idx + 1}: {q.questionStem?.length > 100 ? q.questionStem.substring(0, 100) + '…' : q.questionStem}
                            </div>
                            {q.wasReplaced && q.replacedOriginalStem && (
                              <div style={{ margin: '0.4rem 0', padding: '0.5rem 0.7rem', background: 'rgba(220,38,38,0.07)', border: '1px dashed #dc2626', borderRadius: '8px', fontSize: '0.75rem' }}>
                                <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: '0.25rem' }}>✕ Discarded duplicate (AI originally generated):</div>
                                <div style={{ color: 'var(--text)', textDecoration: 'line-through', opacity: 0.75, marginBottom: '0.3rem' }}>
                                  {q.replacedOriginalStem}
                                </div>
                                {(q.replacedOriginalMatches || []).length > 0 && (
                                  <div>
                                    <div style={{ fontWeight: 600, color: '#92400e', marginBottom: '0.15rem' }}>It matched these existing questions:</div>
                                    {(q.replacedOriginalMatches || []).map((m) => (
                                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.1rem' }}>
                                        <span style={{ background: '#dc2626', color: '#fff', padding: '0.05rem 0.35rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>{m.similarityPercent}%</span>
                                        <span style={{ color: 'var(--text-muted)' }}>Q#{m.id}: {(m.questionStem || '').length > 75 ? (m.questionStem || '').substring(0, 75) + '…' : m.questionStem}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div style={{ marginTop: '0.3rem', color: '#059669', fontWeight: 600 }}>↓ Replaced with the new unique question above</div>
                              </div>
                            )}
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              A: {q.optionA} | B: {q.optionB} | C: {q.optionC} | D: {q.optionD} | ✓ {q.correctAnswer}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAiKeep(prev => ({ ...prev, [idx]: !prev[idx] }))}
                            style={{ padding: '0.3rem 0.7rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', background: kept ? '#dc2626' : '#059669', color: '#fff', whiteSpace: 'nowrap' }}
                          >
                            {kept ? '✕ Remove' : '✓ Keep'}
                          </button>
                        </div>
                        {hasDup && matches.length > 0 && kept && (
                          <div style={{ marginTop: '0.5rem', padding: '0.4rem 0.6rem', background: 'rgba(217,119,6,0.1)', borderRadius: '6px', fontSize: '0.75rem' }}>
                            <div style={{ fontWeight: 600, color: '#92400e', marginBottom: '0.2rem' }}>Matching existing questions:</div>
                            {matches.map((m, mi) => (
                              <div key={mi} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
                                <span style={{ background: m.similarityPercent >= 30 ? '#dc2626' : '#d97706', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>{m.similarityPercent}%</span>
                                <span style={{ color: '#78350f' }}>Q#{m.id}: {(m.questionStem || '').length > 80 ? (m.questionStem || '').substring(0, 80) + '…' : m.questionStem}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {aiError && <div className="error-msg">{aiError}</div>}
                  <div className="ai-gen-actions" style={{ marginTop: '0.75rem' }}>
                    <button type="button" className="btn-secondary" onClick={() => { setAiPreview(null); setAiError(''); }}>{t('common.cancel')}</button>
                    <button type="button" className="ai-gen-btn" onClick={handleAiSaveSelected} disabled={aiSaving || Object.values(aiKeep).every(v => !v)}>
                      {aiSaving ? '💾 Saving...' : `💾 Save ${Object.values(aiKeep).filter(Boolean).length} Selected`}
                    </button>
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
                        <><Bot size={14} style={{marginRight:'0.3rem',verticalAlign:'middle'}} /> {t('ai.generate', { count: aiForm.count })}</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </dialog>
          </div>
        )}

        {/* ── Duplicate Check Failed modal (PPT Level 2 mockup) ── */}
        {showDupModal && duplicateMatches.length > 0 && (() => {
          const blocking = duplicateMatches.filter(m => (m.similarityPercent || 0) >= 30).slice(0, 5);
          const shown = blocking.length > 0 ? blocking : duplicateMatches.slice(0, 5);
          const idList = shown.map(m => m.id).join(', ');
          return (
          <div className="dialog-overlay" onClick={() => setShowDupModal(false)} aria-hidden="true">
            <dialog open className="ai-gen-dialog" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()} style={{ maxWidth: '640px', maxHeight: '80vh', overflowY: 'auto', border: '1.5px solid #dc2626' }}>
              <div style={{ padding: '1.25rem 1.5rem' }}>
                <h3 style={{ color: '#dc2626', textAlign: 'center', margin: '0 0 0.75rem', fontSize: '1.15rem' }}>
                  <XCircle size={18} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />Duplicate Check Failed
                </h3>
                <p style={{ textAlign: 'center', fontSize: '0.85rem', margin: '0 0 0.5rem', color: 'var(--text)' }}>
                  A similarity match was detected with an existing question in the question bank for the same technology stack and topic (based on question stem and options).
                </p>
                <p style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, margin: '0 0 1rem', color: 'var(--text)' }}>
                  Similar question ID{shown.length > 1 ? 's' : ''}: {idList}.{' '}
                  The MCQ is {shown.map(m => `${m.similarityPercent}% similar to question ID ${m.id}`).join(' and ')}.
                </p>
                {shown.map((m) => (
                  <div key={m.id} style={{ border: '1px solid #f59e0b', background: 'rgba(245,158,11,0.08)', borderRadius: '10px', padding: '0.9rem 1.1rem', marginBottom: '0.75rem' }}>
                    <div style={{ textAlign: 'center', fontWeight: 700, color: '#b45309', marginBottom: '0.6rem', fontSize: '0.88rem' }}>
                      Question ID {m.id} — {m.similarityPercent}% similar
                    </div>
                    <div style={{ fontSize: '0.82rem', marginBottom: '0.5rem', color: 'var(--text)' }}>
                      <strong>Stem:</strong> {m.questionStem}
                    </div>
                    {(m.optionA || m.optionB || m.optionC || m.optionD) && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'grid', gap: '0.25rem' }}>
                        {m.optionA && <div>A. {m.optionA}</div>}
                        {m.optionB && <div>B. {m.optionB}</div>}
                        {m.optionC && <div>C. {m.optionC}</div>}
                        {m.optionD && <div>D. {m.optionD}</div>}
                      </div>
                    )}
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowDupModal(false)}>Close &amp; Revise</button>
                </div>
              </div>
            </dialog>
          </div>
          );
        })()}

        {/* Rejection feedback banner */}
        {isEdit && mcqStatus === 'REJECTED' && reviewComments.length > 0 && (
          <div className="rejection-banner">
            <div className="rejection-banner-title"><ClipboardList size={16} style={{marginRight:'0.35rem',verticalAlign:'middle'}} /> {t('form.reviewerFeedback')}</div>
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
                <div className="form-group">
                  <label htmlFor="mediaType">Media Type</label>
                  <select id="mediaType" name="mediaType" value={form.mediaType} onChange={handleChange}>
                    <option value="TEXT">Text Only</option>
                    <option value="IMAGE">Image</option>
                    <option value="VIDEO">Video</option>
                  </select>
                </div>
                {form.mediaType === 'IMAGE' && (
                  <div className="form-group">
                    <label htmlFor="imageUrl">Image URL</label>
                    <input type="url" id="imageUrl" name="imageUrl" value={form.imageUrl} onChange={handleChange} placeholder="https://example.com/image.png" />
                  </div>
                )}
                {form.mediaType === 'VIDEO' && (
                  <div className="form-group">
                    <label htmlFor="videoUrl">Video URL</label>
                    <input type="url" id="videoUrl" name="videoUrl" value={form.videoUrl} onChange={handleChange} placeholder="https://example.com/video.mp4" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="form-card">
            <div className="form-card-header"><h3>{t('form.question')}</h3></div>
            <div className="form-card-body">
              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <label htmlFor="questionStem">{t('form.questionStem')} *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <button type="button" onClick={wrapCodeBlock} style={{ fontSize: '0.75rem', padding: '0.2rem 0.65rem', borderRadius: '6px', border: '1px solid rgba(161,0,255,0.4)', background: 'rgba(161,0,255,0.12)', color: '#C77DFF', cursor: 'pointer', fontWeight: 600, fontFamily: 'monospace' }}>
                    &lt;/&gt; Code Block
                  </button>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Select code text then click, or click to insert template</span>
                </div>
                <div className="ai-check-wrap">
                  <textarea ref={questionStemRef} id="questionStem" name="questionStem" value={form.questionStem} onChange={handleChange} placeholder="Enter the MCQ question..." required rows={4} />
                  <button type="button" className="ai-btn" onClick={handleDuplicateCheck} disabled={aiCheckLoading || !form.questionStem.trim()}>
                    {aiCheckLoading ? <><Search size={14} style={{marginRight:'0.3rem',verticalAlign:'middle'}} /> Checking...</> : <><Search size={14} style={{marginRight:'0.3rem',verticalAlign:'middle'}} /> Duplicate Check</>}
                  </button>
                </div>
              </div>
              {duplicateWarning === 'no-duplicates' && (
                <div className="success-msg" style={{ marginBottom: '0.75rem' }}>
                  <CheckCircle2 size={14} style={{marginRight:'0.3rem',verticalAlign:'middle',color:'#059669'}} /> No significant duplicates found. Question looks unique!
                </div>
              )}
              {(duplicateWarning === 'blocked' || duplicateWarning === 'has-similar') && duplicateMatches.length > 0 && (
                <div className={duplicateBlocked ? 'warning-msg duplicate-match-box blocked' : 'warning-msg duplicate-match-box'} style={{ marginBottom: '0.75rem' }}>
                  <p style={{ marginBottom: '0.4rem', fontWeight: 600 }}>
                    {duplicateBlocked
                      ? <><XCircle size={14} style={{marginRight:'0.3rem',verticalAlign:'middle'}} /> Duplicate detected — this question is ≥30% similar to existing questions. Please revise before submitting:</>
                      : <><AlertTriangle size={14} style={{marginRight:'0.3rem',verticalAlign:'middle'}} /> Similar questions found (below 30% threshold — review recommended):</>}
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
                  {duplicateBlocked && (
                    <div style={{ marginTop: '0.5rem', padding: '0.4rem 1rem', borderRadius: '6px', border: '1px solid #dc2626', background: 'rgba(220,38,38,0.08)', color: '#991b1b', fontWeight: 600, fontSize: '0.8rem' }}>
                      <PenLine size={14} style={{marginRight:'0.3rem',verticalAlign:'middle'}} /> You must edit the question to reduce similarity below 30% before sending for review.
                    </div>
                  )}
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
                  {distractorLoading ? <><Bot size={14} style={{marginRight:'0.3rem',verticalAlign:'middle'}} /> Generating...</> : <><Bot size={14} style={{marginRight:'0.3rem',verticalAlign:'middle'}} /> AI: Generate Wrong Options (Distractors)</>}
                </button>
                {!canGenerateDistractors && <span className="validate-hint">Enter question + Option A (correct answer) first</span>}
                {distractorMsg && <span className={distractorMsg === 'done' ? 'distractor-success' : 'distractor-error'}>{distractorMsg === 'done' ? <><CheckCircle2 size={14} style={{marginRight:'0.3rem',verticalAlign:'middle'}} /> 3 distractors generated and shuffled!</> : distractorMsg}</span>}
              </div>

                <div className="form-group">
                <label>{t('form.questionType') || 'Answer Type'} *</label>
                <div className="radio-options">
                  <label className={`radio-label${form.questionType === 'SINGLE' ? ' radio-label--active' : ''}`}>
                    <input type="radio" name="questionType" value="SINGLE" checked={form.questionType === 'SINGLE'} onChange={handleChange} />
                    🔘 Single Selection (Radio)
                  </label>
                  <label className={`radio-label${form.questionType === 'MULTI' ? ' radio-label--active' : ''}`}>
                    <input type="radio" name="questionType" value="MULTI" checked={form.questionType === 'MULTI'} onChange={(e) => { setForm(f => ({ ...f, questionType: 'MULTI', correctAnswer: '' })); }} />
                    ☑️ Multiple Selection (Checkbox)
                  </label>
                </div>
                {form.questionType === 'MULTI' && <span style={{fontSize:'0.8rem', color:'#6b7280', marginTop:'0.3rem'}}>Select 2 or more correct answers below</span>}
              </div>

                <div className="form-group">
                <label htmlFor="correctAnswerGroup">{t('form.correctAnswer')} * {form.questionType === 'MULTI' && <span style={{fontWeight:'normal', color:'#6b7280'}}>({(form.correctAnswer || '').split(',').filter(Boolean).length} selected)</span>}</label>
                <div className="radio-options">
                  {form.questionType === 'MULTI' ? (
                    OPTIONS.map((key) => {
                      const selected = (form.correctAnswer || '').split(',').filter(Boolean);
                      const isChecked = selected.includes(key);
                      return (
                        <label key={key} className={`radio-label${isChecked ? ' radio-label--active' : ''}`}>
                          <input type="checkbox" name="correctAnswer" value={key} checked={isChecked} onChange={() => {
                            const current = (form.correctAnswer || '').split(',').filter(Boolean);
                            const updated = isChecked ? current.filter(k => k !== key) : [...current, key].sort();
                            setForm(f => ({ ...f, correctAnswer: updated.join(',') }));
                          }} />
                          {t('form.option')} {key}
                        </label>
                      );
                    })
                  ) : (
                    OPTIONS.map((key) => (
                      <label key={key} className={`radio-label${form.correctAnswer === key ? ' radio-label--active' : ''}`}>
                        <input type="radio" name="correctAnswer" value={key} checked={form.correctAnswer === key} onChange={handleChange} />
                        {t('form.option')} {key}
                      </label>
                    ))
                  )}
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
                  {validateLoading ? <><Bot size={14} style={{marginRight:'0.3rem',verticalAlign:'middle'}} /> Validating...</> : <><Bot size={14} style={{marginRight:'0.3rem',verticalAlign:'middle'}} /> Validate Answer with AI</>}
                </button>
                <button
                  type="button"
                  className="validate-btn quality-check-btn"
                  onClick={handleQualityCheck}
                  disabled={qualityLoading || !canValidate}
                >
                  {qualityLoading ? <><Sparkles size={14} style={{marginRight:'0.3rem',verticalAlign:'middle'}} /> Scoring...</> : <><Sparkles size={14} style={{marginRight:'0.3rem',verticalAlign:'middle'}} /> AI Quality Check</>}
                </button>
                <button
                  type="button"
                  className="explain-btn"
                  onClick={handleGenerateExplanations}
                  disabled={explanationLoading || !canGenerateExplanations}
                >
                  {explanationLoading ? <><Bot size={14} style={{marginRight:'0.3rem',verticalAlign:'middle'}} /> Generating...</> : <><Bot size={14} style={{marginRight:'0.3rem',verticalAlign:'middle'}} /> AI: Explain All Options</>}
                </button>
                {!canValidate && (
                  <span className="validate-hint">Fill all options + select correct answer to validate</span>
                )}
              </div>

              {qualityResult && (
                <div className="confidence-card" style={{ borderLeft: `4px solid ${qualityResult.available === false ? '#d1d5db' : qualityResult.qualityScore >= 80 ? '#059669' : qualityResult.qualityScore >= 60 ? '#d97706' : '#dc2626'}`, marginBottom: '0.75rem' }}>
                  {qualityResult.available === false ? (
                    <div className="confidence-row"><span className="conf-icon"><AlertTriangle size={16} /></span><span className="conf-text">{qualityResult.summary}</span></div>
                  ) : (
                    <>
                      <div className="confidence-row" style={{ alignItems: 'center' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: qualityResult.qualityScore >= 80 ? '#059669' : qualityResult.qualityScore >= 60 ? '#d97706' : '#dc2626' }}>{qualityResult.qualityScore}</span>
                        <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600, marginLeft: '0.2rem', marginRight: '0.75rem' }}>/100</span>
                        <span className="conf-verdict" style={{ fontSize: '0.82rem' }}>{qualityResult.summary}</span>
                      </div>
                      {!qualityResult.difficultyMatch && qualityResult.suggestedDifficulty && (
                        <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', background: '#fef3c7', color: '#92400e', padding: '0.3rem 0.6rem', borderRadius: '6px', fontWeight: 600 }}>
                          <AlertTriangle size={12} style={{marginRight:'0.25rem',verticalAlign:'middle'}} /> Difficulty mismatch: you selected <strong>{form.difficulty}</strong>, AI suggests <strong>{qualityResult.suggestedDifficulty}</strong>
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
                      <span className="conf-icon"><AlertTriangle size={16} /></span>
                      <span className="conf-text">{validateResult.explanation}</span>
                    </div>
                  ) : (
                    <>
                      <div className="confidence-row">
                        <span className="conf-icon">{validateResult.isCorrect ? <CheckCircle2 size={16} color="#059669" /> : <AlertTriangle size={16} color="#d97706" />}</span>
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
                        <p className="conf-ambiguity"><AlertTriangle size={12} style={{marginRight:'0.25rem',verticalAlign:'middle'}} /> {validateResult.ambiguityWarning}</p>
                      )}
                    </>
                  )}
                </div>
              );
            })()}

              {/* AI Explanation Generator */}

              {explanations && (
                <div className="explanation-card">
                  {explanations.available === false ? (
                    <p className="exp-unavailable">{explanations.error}</p>
                  ) : (
                    <>
                      <div className="exp-row exp-correct">
                        <span className="exp-label"><CheckCircle2 size={14} color="#059669" style={{marginRight:'0.25rem',verticalAlign:'middle'}} /> Why {form.correctAnswer} is correct:</span>
                        <span className="exp-text">{explanations.whyCorrect}</span>
                      </div>
                      {['A','B','C','D'].filter(k => k !== form.correctAnswer).map(k => (
                        explanations[`why${k}Wrong`] && (
                          <div key={k} className="exp-row">
                            <span className="exp-label"><XCircle size={14} color="#dc2626" style={{marginRight:'0.25rem',verticalAlign:'middle'}} /> Why {k} is wrong:</span>
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
                {(!isEdit || mcqStatus === 'DRAFT' || mcqStatus === 'REJECTED') && (
                  <button type="button" className="btn-secondary" disabled={loading} onClick={(e) => handleSubmit(e, false)}>
                    {loading ? t('common.saving') : t('common.save')}
                  </button>
                )}
                {(!isEdit || mcqStatus === 'DRAFT' || mcqStatus === 'REJECTED') && (
                  <button type="button" className="btn-primary" disabled={loading || duplicateBlocked} title={duplicateBlocked ? 'Duplicate detected — revise the question first' : ''} onClick={(e) => handleSubmit(e, true)}>
                    {loading ? t('common.saving') : duplicateBlocked ? <><XCircle size={14} style={{marginRight:'0.3rem',verticalAlign:'middle'}} /> Duplicate — Revise First</> : t('form.saveAndSend')}
                  </button>
                )}
                {isEdit && mcqStatus && mcqStatus !== 'DRAFT' && mcqStatus !== 'REJECTED' && (
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
