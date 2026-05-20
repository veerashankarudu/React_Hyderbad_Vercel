import React, { useState, useEffect } from 'react';
import API from '../api';
import Navbar from '../components/Navbar';
import SortableTh from '../components/SortableTh';
import TablePagination from '../components/TablePagination';
import { useTranslation } from 'react-i18next';
import { useContentTranslation } from '../hooks/useContentTranslation';
import './MyQuestions.css';
import './PendingReviews.css';

const PR_COLUMNS = [
  { key: 'questionStem', labelKey: 'pr2.colQuestion' },
  { key: 'techStackName', labelKey: 'pr2.colTechStack' },
  { key: 'topicName', labelKey: 'pr2.colTopic' },
  { key: 'difficulty', labelKey: 'pr2.colDifficulty' },
  { key: 'creatorFullName', labelKey: 'pr2.colCreator' },
];

function getPrVal(m, key) {
  return (m[key] || '').toString().toLowerCase();
}

function getCopilotRisk(score) {
  if (score == null) { return null; }
  if (score >= 85) { return 'LOW'; }
  if (score >= 60) { return 'MEDIUM'; }
  return 'HIGH';
}

export default function PendingReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState('questionStem');
  const [sortDir, setSortDir] = useState('asc');
  const [action, setAction] = useState('');
  const [aiCopilot, setAiCopilot] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [prPage, setPrPage] = useState(1);
  const [prPageSize, setPrPageSize] = useState(10);
  const { t } = useTranslation();

  // Translate currently-selected review question
  const selTexts = selected
    ? [selected.questionStem, selected.optionA, selected.optionB, selected.optionC, selected.optionD]
    : ['', '', '', '', ''];
  const [txSelStem, txSelA, txSelB, txSelC, txSelD] = useContentTranslation(selTexts);
  const txSelOptions = { A: txSelA || '', B: txSelB || '', C: txSelC || '', D: txSelD || '' };

  // Compute filtered/sorted/paged rows at top level so we can translate them
  let prFilteredRows = reviews;
  if (search) {
    const q = search.toLowerCase();
    prFilteredRows = prFilteredRows.filter(m => PR_COLUMNS.some(col => getPrVal(m, col.key).includes(q)));
  }
  prFilteredRows = [...prFilteredRows].sort((a, b) => {
    const av = getPrVal(a, sortCol);
    const bv = getPrVal(b, sortCol);
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });
  const prTotalPages = Math.ceil(prFilteredRows.length / prPageSize);
  const prPagedRows = prFilteredRows.slice((prPage - 1) * prPageSize, prPage * prPageSize);

  // Translate paged items
  const txPrStems = useContentTranslation(prPagedRows.map(m => m.questionStem || ''));
  const txPrTechs = useContentTranslation(prPagedRows.map(m => m.techStackName || ''));
  const txPrTopics = useContentTranslation(prPagedRows.map(m => m.topicName || ''));

  const handlePrSort = (key) => {
    if (sortCol === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }
    else { setSortCol(key); setSortDir('asc'); }
    setPrPage(1);
  };
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [checklist, setChecklist] = useState([false, false, false, false]);
  const [reviewStats, setReviewStats] = useState({ approved: 0, rejected: 0 });

  const fetchReviews = async () => {
    setLoading(true);
    try {
      // Only fetch UNDER_REVIEW (assigned to this SME) + stats for approved/rejected
      const [r1, r2, r3] = await Promise.allSettled([
        API.get('/reviews', { params: { status: 'UNDER_REVIEW' } }),
        API.get('/reviews', { params: { status: 'APPROVED' } }),
        API.get('/reviews', { params: { status: 'REJECTED' } }),
      ]);
      const raw1 = r1.status === 'fulfilled' ? r1.value.data : [];
      const raw2 = r2.status === 'fulfilled' ? r2.value.data : [];
      const raw3 = r3.status === 'fulfilled' ? r3.value.data : [];
      const list1 = Array.isArray(raw1) ? raw1 : (raw1.content || []);
      const approvedList = Array.isArray(raw2) ? raw2 : (raw2.content || []);
      const rejectedList = Array.isArray(raw3) ? raw3 : (raw3.content || []);
      const approved = approvedList.length;
      const rejected = rejectedList.length;
      setReviews(list1);
      setReviewStats({ approved, rejected });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReviews(); }, []);

  const openReview = (mcq) => {
    setSelected(mcq);
    setAction('');
    setComment('');
    setError('');
    setChecklist([false, false, false, false]);
    setAiCopilot(null);
    setAiLoading(false);
  };
  const closeReview = () => {
    setSelected(null);
    setAction('');
    setComment('');
    setError('');
    setChecklist([false, false, false, false]);
    setAiCopilot(null);
    setAiLoading(false);
  };

  const runAiCopilot = async (mcq) => {
    setAiLoading(true);
    setAiCopilot(null);
    try {
      const { data } = await API.post('/ai/validate-answer', {
        questionStem: mcq.questionStem,
        optionA: mcq.optionA,
        optionB: mcq.optionB,
        optionC: mcq.optionC,
        optionD: mcq.optionD,
        correctAnswer: mcq.correctAnswer,
      });
      setAiCopilot(data);
    } catch (e) {
      console.error('AI copilot error', e);
      setAiCopilot({ available: false, explanation: 'AI service unavailable.' });
    }
    setAiLoading(false);
  };

  const handleSubmitReview = async () => {
    if (!action) { setError(t('pr2.pleaseSelectAction')); return; }
    if (!checklist.every(Boolean)) { setError(t('pr2.completeChecklist')); return; }
    if (action === 'REJECT' && !comment.trim()) { setError('A comment is required when rejecting.'); return; }
    setSubmitting(true); setError('');
    try {
      await API.post(`/reviews/${selected.id}/submit`, { action, comment: comment.trim() });
      closeReview(); fetchReviews();
    } catch (err) { setError(err.response?.data?.message || err.response?.data?.error || t('pr2.failedSubmit')); }
    finally { setSubmitting(false); }
  };

  const OPTIONS = ['A','B','C','D'];
  const optMap = (mcq) => ({ A: mcq.optionA, B: mcq.optionB, C: mcq.optionC, D: mcq.optionD });

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="page-header">
          <h2>{t('pr.title')}</h2>
        </div>
        <div className="review-summary">
          <div className="review-summary-stat pending">
            <span className="rs-num">{reviews.length}</span>
            <span className="rs-label">{t('pr.statPending')}</span>
          </div>
          <div className="review-summary-stat approved">
            <span className="rs-num">{reviewStats.approved}</span>
            <span className="rs-label">{t('pr.statApproved')}</span>
          </div>
          <div className="review-summary-stat rejected">
            <span className="rs-num">{reviewStats.rejected}</span>
            <span className="rs-label">{t('pr.statRejected')}</span>
          </div>
        </div>

        {loading ? <div className="loading">Loading reviews...</div> : null}
        {!loading && reviews.length === 0 && !selected && (
          <div className="empty-state">
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎉</div>
            <h3>{t('pr.allCaughtUp')}</h3>
            <p>{t('pr.noPending')}</p>
          </div>
        )}
        {!loading && reviews.length > 0 && !selected && (
          <div>
            <div style={{ marginBottom: '0.75rem' }}>
              <input
                type="text"
                placeholder={t('pr.searchPlaceholder')}
                value={search}
                onChange={e => { setSearch(e.target.value); setPrPage(1); }}
                style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border)', minWidth: '220px', fontSize: '0.875rem' }}
              />
            </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('common.status')}</th>
                  {PR_COLUMNS.map(col => (
                    <SortableTh key={col.key} colKey={col.key} label={t(col.labelKey)}
                      sortCol={sortCol} sortDir={sortDir} onSort={handlePrSort} />
                  ))}
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {prPagedRows.map((mcq, idx) => (
                  <tr key={mcq.id}>
                    <td>{(prPage - 1) * prPageSize + idx + 1}</td>
                    <td><span style={{ display:'inline-flex', alignItems:'center', gap:'0.3rem', padding:'0.25rem 0.65rem', borderRadius:'20px', fontSize:'0.72rem', fontWeight:700, background:'#FFFBEB', color:'#B45309', border:'1.5px solid #FDE68A', whiteSpace:'nowrap' }}>⏳ {t('pr.pending')}</span></td>
                    <td className="question-cell" title={mcq.questionStem}>{txPrStems[idx] || mcq.questionStem}</td>
                    <td>{txPrTechs[idx] || mcq.techStackName}</td>
                    <td>{txPrTopics[idx] || mcq.topicName}</td>
                    <td><span className={`diff-badge ${mcq.difficulty?.toLowerCase()}`}>{mcq.difficulty}</span></td>
                    <td>{mcq.creatorFullName}</td>
                    <td><button className="btn-sm btn-primary" onClick={() => openReview(mcq)}>{t('pr.review')}</button></td>
                  </tr>
                ))}
                {prTotalPages > 1 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <TablePagination
                        page={prPage}
                        totalPages={prTotalPages}
                        pageSize={prPageSize}
                        onPageChange={setPrPage}
                        onSizeChange={n => { setPrPageSize(n); setPrPage(1); }}
                        totalItems={prFilteredRows.length}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </div>
        )}

        {selected && (
          <div className="review-panel">
            <div className="review-panel-header">
              <div>
                <h3>{t('pr.reviewMcqTitle', { id: selected.id })}</h3>
                <div className="review-panel-meta">{selected.techStackName} / {selected.topicName} &bull; {selected.difficulty} &bull; Creator: {selected.creatorFullName}</div>
              </div>
              <button className="review-back-btn" onClick={closeReview}>&larr; {t('pr.backToList')}</button>
            </div>
            <div className="review-panel-body">
              <div className="review-question">{txSelStem || selected.questionStem}</div>
              <div className="review-options">
                {OPTIONS.map((key) => (
                  <div key={key} className={`review-option${selected.correctAnswer === key ? ' correct' : ''}`}>
                    <div className="opt-key">{key}</div>
                    <div className="opt-text">{txSelOptions[key] || optMap(selected)[key]}</div>
                    {selected.correctAnswer === key && <span className="correct-tag">&#10003; {t('detail.correct')}</span>}
                  </div>
                ))}
              </div>
              <div className="review-actions-bar">
                {/* AI Reviewer Copilot */}
                <div style={{ marginBottom: '1rem', background: '#F0F4FF', border: '1px solid #C7D7FF', borderRadius: '8px', padding: '0.85rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: aiCopilot ? '0.75rem' : 0 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#3730A3' }}>🤖 {t('pr.aiCopilot')}</span>
                    {(() => {
                      let copilotLabel = t('pr.getAiAnalysis');
                      if (aiLoading) copilotLabel = t('pr.analyzing');
                      else if (aiCopilot) copilotLabel = t('pr.reAnalyze');
                      return (
                        <button
                          type="button"
                          className="btn-sm btn-outline"
                          style={{ fontSize: '0.78rem' }}
                          onClick={() => runAiCopilot(selected)}
                          disabled={aiLoading}
                        >{copilotLabel}</button>
                      );
                    })()}
                  </div>
                  {aiCopilot && (() => {
                    const score = aiCopilot.confidenceScore;
                    const risk = getCopilotRisk(score);
                    const riskColor = { LOW: '#059669', MEDIUM: '#D97706', HIGH: '#DC2626' };
                    return (
                      <div style={{ fontSize: '0.85rem' }}>
                        {aiCopilot.available === false ? (
                          <span style={{ color: '#6B7280' }}>{aiCopilot.explanation}</span>
                        ) : (
                          <>
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                              <span>{t('pr.answerValid')}: <strong style={{ color: aiCopilot.isCorrect ? '#059669' : '#DC2626' }}>{aiCopilot.isCorrect ? '✓ Yes' : '✗ No'}</strong></span>
                              {score != null && <span>{t('pr.confidence')}: <strong style={{ color: riskColor[risk] }}>{score}/100 ({risk})</strong></span>}
                            </div>
                            {aiCopilot.explanation && <div style={{ color: '#374151', marginBottom: '0.25rem' }}><strong>{t('pr.analysis')}:</strong> {aiCopilot.explanation}</div>}
                            {aiCopilot.ambiguityWarning && <div style={{ color: '#B45309' }}>⚠️ {aiCopilot.ambiguityWarning}</div>}
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
                {/* Reviewer Checklist */}
                <div className="reviewer-checklist">
                  <div className="checklist-title">✅ {t('pr.checklistTitle')}</div>
                  {[t('pr.check1'), t('pr.check2'), t('pr.check3'), t('pr.check4')].map((item, idx) => {
                    return (
                      <label key={item} className={`checklist-item${checklist[idx] ? ' checked' : ''}`}>
                        <input
                          type="checkbox"
                          checked={checklist[idx]}
                          onChange={() => {
                            const next = [...checklist];
                            next[idx] = !next[idx];
                            setChecklist(next);
                          }}
                        />
                        <span>{item}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="review-verdict">
                  <button className={`verdict-btn approve${action === 'APPROVE' ? ' selected' : ''}`} onClick={() => setAction('APPROVE')}>
                    &#10004; {t('pr.approve')}
                  </button>
                  <button className={`verdict-btn reject${action === 'REJECT' ? ' selected' : ''}`} onClick={() => setAction('REJECT')}>
                    &#10006; {t('pr.reject')}
                  </button>
                </div>
                <div className="review-comment">
                  <span className="review-comment-label">{t('pr.comment')} {action === 'REJECT' ? `(${t('pr.required')})` : `(${t('pr.optional')})`}</span>
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t('pr.commentPlaceholder')} rows={3} />
                </div>
                {error && <div className="error-msg">{error}</div>}
                <div className="review-submit-row">
                  <button className="btn-sm btn-outline" onClick={closeReview}>{t('common.cancel')}</button>
                  <button
                    className="btn-sm btn-primary"
                    onClick={handleSubmitReview}
                    disabled={!action || submitting || !checklist.every(Boolean)}
                    title={checklist.every(Boolean) ? '' : t('pr.checklistIncomplete')}
                  >
                    {(() => {
                      if (submitting) return t('pr.submitting');
                      const done = checklist.filter(Boolean).length;
                      if (done < 4) return `${t('pr.submitReview')} (${done}/4 checklist)`;
                      return t('pr.submitReview');
                    })()}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
