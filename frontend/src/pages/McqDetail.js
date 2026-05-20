import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import McqCommentSection from '../components/McqCommentSection';
import QuestionStemRenderer from '../components/QuestionStemRenderer';
import { useTranslation } from 'react-i18next';
import { useContentTranslation } from '../hooks/useContentTranslation';
import { useAuth } from '../AuthContext';
import './MyQuestions.css';
import './McqDetail.css';

export default function McqDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [mcq, setMcq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [explanations, setExplanations] = useState(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [qualityScore, setQualityScore] = useState(null);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [difficultyResult, setDifficultyResult] = useState(null);
  const [difficultyLoading, setDifficultyLoading] = useState(false);
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('detail');

  // Translate question content dynamically based on selected language
  const contentTexts = mcq
    ? [mcq.questionStem, mcq.optionA, mcq.optionB, mcq.optionC, mcq.optionD]
    : ['', '', '', '', ''];
  const [txStem, txA, txB, txC, txD] = useContentTranslation(contentTexts);

  useEffect(() => {
    API.get(`/mcqs/${id}`).then(({ data }) => { setMcq(data); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  const handleSubmitForReview = async () => {
    if (!window.confirm(t('mcd2.confirmSubmit'))) return;
    setSubmitting(true);
    try {
      await API.post(`/mcqs/${id}/submit`);
      API.get(`/mcqs/${id}`).then(({ data }) => setMcq(data));
    } catch (err) { alert(err.response?.data?.message || t('mcd2.failedSubmit')); }
    finally { setSubmitting(false); }
  };

  const handleExplain = async () => {
    setExplainLoading(true); setExplanations(null);
    try {
      const { data } = await API.post('/ai/generate-explanations', {
        questionStem: mcq.questionStem,
        optionA: mcq.optionA, optionB: mcq.optionB, optionC: mcq.optionC, optionD: mcq.optionD,
        correctAnswer: mcq.correctAnswer,
      });
      setExplanations(data);
    } catch { setExplanations({ available: false, error: t('mcd2.aiExplainUnavailable') }); }
    finally { setExplainLoading(false); }
  };

  const handleScoreQuality = async () => {
    setQualityLoading(true); setQualityScore(null);
    try {
      const { data } = await API.post('/ai/score-quality', {
        questionStem: mcq.questionStem,
        optionA: mcq.optionA, optionB: mcq.optionB, optionC: mcq.optionC, optionD: mcq.optionD,
        correctAnswer: mcq.correctAnswer,
        difficulty: mcq.difficulty,
      });
      setQualityScore(data);
    } catch { setQualityScore({ available: false, summary: t('mcd2.aiScoringUnavailable') }); }
    finally { setQualityLoading(false); }
  };

  const handleAutoDifficulty = async () => {
    setDifficultyLoading(true); setDifficultyResult(null);
    try {
      const { data } = await API.post('/ai/auto-difficulty', { mcqId: mcq.id });
      setDifficultyResult(data);
      // Update displayed difficulty if it changed
      if (data.difficulty) setMcq(prev => ({ ...prev, difficulty: data.difficulty, aiScore: data.score }));
    } catch { setDifficultyResult({ available: false, reasoning: t('mcd2.aiDifficultyUnavailable') }); }
    finally { setDifficultyLoading(false); }
  };

  const handleLoadHistory = async () => {
    if (history) { setActiveTab('history'); return; }
    setHistoryLoading(true);
    try {
      const { data } = await API.get(`/mcqs/${id}/history`);
      setHistory(data);
      setActiveTab('history');
    } catch { setHistory([]); setActiveTab('history'); }
    finally { setHistoryLoading(false); }
  };

  if (loading) return <><Navbar /><div className="page-container"><div className="loading">{t('common.loading')}</div></div></>;
  if (!mcq) return <><Navbar /><div className="page-container"><div className="error-msg">MCQ not found.</div></div></>;

  const options = [
    { key: 'A', text: txA || mcq.optionA },
    { key: 'B', text: txB || mcq.optionB },
    { key: 'C', text: txC || mcq.optionC },
    { key: 'D', text: txD || mcq.optionD },
  ];

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="page-header" style={{ marginBottom: '1rem' }}>
          <button className="btn-secondary" onClick={() => navigate(-1)}>&larr; Back</button>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {mcq.status === 'DRAFT' && (
              <button className="btn-sm btn-blue" onClick={handleSubmitForReview} disabled={submitting}>
                {submitting ? t('detail.submitting') : `📬 ${t('detail.submitForReview')}`}
              </button>
            )}
            {((['DRAFT','REJECTED'].includes(mcq.status)) || (isAdmin && mcq.status !== 'DRAFT')) && (
              <button className="btn-primary" onClick={() => navigate(`/mcq/${id}/edit`)}>{t('detail.editMcq')}</button>
            )}
            <button className="btn-sm btn-outline" onClick={handleExplain} disabled={explainLoading}>
              {explainLoading ? `🤖 ${t('detail.explaining')}` : `🤖 ${t('detail.aiExplain')}`}
            </button>
            <button className="btn-sm btn-outline" onClick={handleScoreQuality} disabled={qualityLoading} style={{ background: '#fef3c7', borderColor: '#d97706', color: '#92400e' }}>
              {qualityLoading ? `⏳ ${t('mcd2.aiScoring')}` : `🏅 ${t('mcd2.aiScoringBtn')}`}
            </button>
            <button className="btn-sm btn-outline" onClick={handleAutoDifficulty} disabled={difficultyLoading} style={{ background: '#f0fdf4', borderColor: '#16a34a', color: '#14532d' }}>
              {difficultyLoading ? `⏳ ${t('mcd2.aiRating')}` : `🎯 ${t('mcd2.aiRateBtn')}`}
            </button>
            <button className="btn-sm btn-outline" onClick={handleLoadHistory} disabled={historyLoading} style={{ background: '#eff6ff', borderColor: '#3b82f6', color: '#1d4ed8' }}>
              {historyLoading ? `⏳ ${t('mcd2.versionLoading')}` : `🕒 ${t('mcd2.versionHistoryBtn')}`}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0', marginBottom: '1rem', borderBottom: '2px solid var(--border)' }}>
          {[{key:'detail',labelKey:'mcd2.tabDetails'},{key:'history',labelKey:'mcd2.tabHistory'}].map(tab => (
            <button key={tab.key} onClick={() => { if (tab.key === 'history') handleLoadHistory(); else setActiveTab('detail'); }}
              style={{ padding: '0.55rem 1.2rem', border: 'none', background: 'none', cursor: 'pointer',
                fontWeight: activeTab === tab.key ? 700 : 400,
                borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-muted)', fontSize: '0.85rem',
                marginBottom: '-2px' }}>
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        {/* AI Quality Score Card */}
        {qualityScore && (
          <div className="detail-card" style={{ marginBottom: '1rem', borderLeft: `4px solid ${qualityScore.available === false ? '#d1d5db' : qualityScore.qualityScore >= 80 ? '#059669' : qualityScore.qualityScore >= 60 ? '#d97706' : '#dc2626'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', padding: '1rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: qualityScore.qualityScore >= 80 ? '#059669' : qualityScore.qualityScore >= 60 ? '#d97706' : '#dc2626' }}>
                  {qualityScore.qualityScore ?? '—'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 600 }}>{t('mcd2.qualityScoreLabel')}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.3rem' }}>{t('mcd2.aiQualityAssessment')}</div>
                <div style={{ fontSize: '0.82rem', color: '#374151', marginBottom: '0.4rem' }}>{qualityScore.summary}</div>
                {!qualityScore.difficultyMatch && qualityScore.suggestedDifficulty && (
                  <div style={{ fontSize: '0.78rem', background: '#fef3c7', color: '#92400e', padding: '0.3rem 0.6rem', borderRadius: '6px', marginBottom: '0.4rem', fontWeight: 600 }}>
                    ⚠️ Difficulty mismatch: declared <strong>{mcq.difficulty}</strong>, AI suggests <strong>{qualityScore.suggestedDifficulty}</strong>
                  </div>
                )}
                {qualityScore.issues && qualityScore.issues.length > 0 && (
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.78rem', color: '#6b7280' }}>
                    {qualityScore.issues.map((iss, i) => <li key={i}>{iss}</li>)}
                  </ul>
                )}
              </div>
              {qualityScore.qualityScore != null && (
                <div style={{ width: '80px', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${qualityScore.qualityScore}%`, height: '100%', background: qualityScore.qualityScore >= 80 ? '#059669' : qualityScore.qualityScore >= 60 ? '#d97706' : '#dc2626', borderRadius: '4px' }} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Auto-Difficulty Result Card */}
        {difficultyResult && (
          <div className="detail-card" style={{ marginBottom: '1rem', borderLeft: `4px solid ${difficultyResult.difficulty === 'HARD' ? '#dc2626' : difficultyResult.difficulty === 'EASY' ? '#059669' : '#d97706'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: difficultyResult.difficulty === 'HARD' ? '#dc2626' : difficultyResult.difficulty === 'EASY' ? '#059669' : '#d97706', minWidth: '60px', textAlign: 'center' }}>
                {difficultyResult.difficulty === 'HARD' ? '🔥' : difficultyResult.difficulty === 'EASY' ? '✅' : '⚡'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                  🎯 AI Difficulty: <span style={{ color: difficultyResult.difficulty === 'HARD' ? '#dc2626' : difficultyResult.difficulty === 'EASY' ? '#059669' : '#d97706' }}>{difficultyResult.difficulty}</span>
                  {' '}<span style={{ fontWeight: 400, fontSize: '0.82rem', color: '#6b7280' }}>(score {difficultyResult.score}/100 · via {difficultyResult.source})</span>
                </div>
                <div style={{ fontSize: '0.84rem', color: '#374151' }}>{difficultyResult.reasoning}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'detail' && (
        <div className="detail-card">
          <div className="detail-header">
            <div className="detail-header-left">
              <h3>{t('mcd.title', { id: mcq.id })}</h3>
              <div className="detail-header-meta">
                <span>{mcq.techStackName}</span>
                <span>/</span>
                <span>{mcq.topicName}</span>
                <span>&bull;</span>
                <span>{mcq.difficulty}</span>
              </div>
            </div>
            <StatusBadge status={mcq.status} />
          </div>

          <div className="detail-body">
            <div className="question-stem"><QuestionStemRenderer text={txStem || mcq.questionStem} /></div>
            <div className="options-list">
              {options.map((opt) => (
                <div key={opt.key} className={`option-row${mcq.correctAnswer === opt.key ? ' correct' : ''}`}>
                  <div className="option-key">{opt.key}</div>
                  <div className="option-text">{opt.text}</div>
                  {mcq.correctAnswer === opt.key && <span className="correct-badge">&#10003; {t('detail.correct')}</span>}
                </div>
              ))}
            </div>

            <div className="detail-meta-grid">
              <div className="meta-item"><label>{t('detail.creator')}</label><span>{mcq.creatorFullName}</span></div>
              <div className="meta-item"><label>{t('detail.reviewer')}</label><span>{mcq.reviewerFullName || t('detail.notAssigned')}</span></div>
              <div className="meta-item"><label>{t('detail.version')}</label><span>v{mcq.version}</span></div>
              <div className="meta-item"><label>{t('detail.created')}</label><span>{new Date(mcq.createdAt).toLocaleDateString()}</span></div>
              <div className="meta-item"><label>{t('detail.updated')}</label><span>{new Date(mcq.updatedAt).toLocaleDateString()}</span></div>
              <div className="meta-item"><label>{t('detail.aiWarning')}</label><span>{mcq.aiWarning || t('detail.none')}</span></div>
            </div>

            {explanations && (
              <div className="explanation-card" style={{ marginTop: '1rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1D4ED8', marginBottom: '0.6rem' }}>🤖 {t('detail.aiExplanation')}</div>
                {explanations.available === false ? (
                  <p style={{ color: '#92400E', fontSize: '0.82rem' }}>{explanations.error}</p>
                ) : (
                  <>
                    <div className="exp-row exp-correct" style={{ marginBottom: '0.4rem' }}>
                      <span className="exp-label">✅ Why {mcq.correctAnswer} is correct:</span>
                      <span className="exp-text">{explanations.whyCorrect}</span>
                    </div>
                    {['A','B','C','D'].filter(k => k !== mcq.correctAnswer).map(k =>
                      explanations[`why${k}Wrong`] ? (
                        <div key={k} className="exp-row" style={{ marginBottom: '0.3rem' }}>
                          <span className="exp-label">❌ Why {k} is wrong:</span>
                          <span className="exp-text">{explanations[`why${k}Wrong`]}</span>
                        </div>
                      ) : null
                    )}
                  </>
                )}
              </div>
            )}

            <McqCommentSection mcqId={mcq.id} />
          </div>
        </div>
        )}

        {activeTab === 'history' && (
          <div className="detail-card">
            <div style={{ padding: '1rem 1.25rem', fontWeight: 700, fontSize: '0.95rem', borderBottom: '1px solid var(--border)' }}>{t('mcd2.versionHistoryTitle')}</div>
            {historyLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>{t('mcd2.historyLoading')}</div>
            ) : !history || history.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>{t('mcd2.noVersionHistory')}</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-light)', textAlign: 'left' }}>
                      <th style={{ padding: '0.6rem 0.9rem' }}>{t('mcd2.colVer')}</th>
                      <th style={{ padding: '0.6rem 0.9rem' }}>{t('mcd2.colChangedBy')}</th>
                      <th style={{ padding: '0.6rem 0.9rem' }}>{t('mcd2.colStatus')}</th>
                      <th style={{ padding: '0.6rem 0.9rem' }}>{t('mcd2.colNote')}</th>
                      <th style={{ padding: '0.6rem 0.9rem' }}>{t('mcd2.colDate')}</th>
                      <th style={{ padding: '0.6rem 0.9rem' }}>{t('mcd2.colQuestionStem')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((v, i) => (
                      <tr key={v.id} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 0 ? '#fff' : 'var(--bg-light)' }}>
                        <td style={{ padding: '0.55rem 0.9rem', fontWeight: 700 }}>v{v.versionNumber}</td>
                        <td style={{ padding: '0.55rem 0.9rem' }}>{v.changedByName}</td>
                        <td style={{ padding: '0.55rem 0.9rem' }}><span style={{ padding: '0.15rem 0.5rem', borderRadius: '8px', background: '#e0e7ff', color: '#3730a3', fontSize: '0.72rem', fontWeight: 600 }}>{v.statusAtTime}</span></td>
                        <td style={{ padding: '0.55rem 0.9rem', color: '#6b7280' }}>{v.changeNote}</td>
                        <td style={{ padding: '0.55rem 0.9rem', whiteSpace: 'nowrap' }}>{v.createdAt ? new Date(v.createdAt).toLocaleString() : '—'}</td>
                        <td style={{ padding: '0.55rem 0.9rem', maxWidth: '300px', color: '#374151' }}>{(v.questionStem || '').substring(0, 120)}{v.questionStem?.length > 120 ? '…' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
