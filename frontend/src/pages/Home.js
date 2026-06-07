import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Navbar from '../components/Navbar';
import API from '../api';
import { useTranslation } from 'react-i18next';
import { useContentTranslation } from '../hooks/useContentTranslation';
import './Home.css';


const STATUS_META = {
  APPROVED:         { labelKey: 'common.approved',       color: '#059669', bg: '#D1FAE5' },
  REJECTED:         { labelKey: 'common.rejected',       color: '#DC2626', bg: '#FEE2E2' },
  UNDER_REVIEW:     { labelKey: 'common.inReview',       color: '#D97706', bg: '#FEF3C7' },
  READY_FOR_REVIEW: { labelKey: 'common.readyForReview', color: '#7C3AED', bg: '#EDE9FE' },
  DRAFT:            { labelKey: 'common.draft',          color: '#6B7280', bg: '#F3F4F6' },
};

function formatAgo(dt) {
  if (!dt) return '';
  // Parse; if no timezone info, treat as UTC (Spring Boot stores UTC without Z)
  const str = dt.includes('Z') || dt.includes('+') ? dt : dt + 'Z';
  const d = new Date(str);
  if (isNaN(d)) return '';
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 0) {
    // Timestamp is in the future (clock skew) — show formatted date/time
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
           ', ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/* ── SVG circular progress ring ── */
function CircleRing({ percent, color, label, size = 104, stroke = 9 }) {
  const r   = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const off  = circ - (Math.min(Math.max(percent, 0), 100) / 100) * circ;
  return (
    <div className="ring-wrap">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} stroke="#F3F4F6" strokeWidth={stroke} fill="none"/>
        <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.1s ease' }}/>
      </svg>
      <div className="ring-inner">
        <span className="ring-pct" style={{ color }}>{percent}%</span>
        <span className="ring-lbl">{label}</span>
      </div>
    </div>
  );
}

/* ── Horizontal bar chart (pure CSS) ── */
function BarChart({ data }) {
  const { t } = useTranslation();
  if (!data?.length) return <div className="dw-empty">{t('common.noData')}</div>;
  const max = Math.max(...data.map(d => Number(d.count)));
  const COLORS = ['#7C3AED','#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#84CC16'];
  return (
    <div className="bar-chart">
      {data.slice(0, 8).map((d, i) => (
        <div key={d.techStack} className="bar-row">
          <span className="bar-lbl">{d.techStack}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{
              width: `${Math.round((Number(d.count) / max) * 100)}%`,
              background: COLORS[i % COLORS.length]
            }}/>
          </div>
          <span className="bar-cnt">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const now = new Date();

  const [summary, setSummary]           = useState({ totalMcqs: 0, approved: 0, inReview: 0, rejected: 0, draft: 0 });
  const [techStackData, setTechStackData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [leaderboard, setLeaderboard]   = useState([]);
  const [loading, setLoading]           = useState(true);

  // Translate recent activity question stems AND tech stack names
  const activityStems = recentActivity.map(item => item.questionStem || '');
  const activityTechStacks = recentActivity.map(item => item.techStack || '');
  const barChartLabels = techStackData.map(d => d.techStack || '');

  const txActivityStems = useContentTranslation(activityStems);
  const txActivityTechStacks = useContentTranslation(activityTechStacks);
  const txBarChartLabels = useContentTranslation(barChartLabels);

  // AI Generator


  const [showAiGen, setShowAiGen]       = useState(false);
  const [aiTechStacks, setAiTechStacks] = useState([]);
  const [aiTopics, setAiTopics]         = useState([]);
  const [aiForm, setAiForm]             = useState({ techStackId: '', topicId: '', count: 3, difficulty: 'MEDIUM' });
  const [aiLoading, setAiLoading]       = useState(false);
  const [aiResult, setAiResult]         = useState(null);
  const [aiError, setAiError]           = useState('');

  useEffect(() => {
    Promise.allSettled([
      API.get('/stats/summary'),
      API.get('/stats/by-tech-stack'),
      API.get('/stats/recent-activity'),
      API.get('/stats/leaderboard'),
    ]).then(([sumR, stackR, actR, lbR]) => {
      if (sumR.status   === 'fulfilled') setSummary(sumR.value.data);
      if (stackR.status === 'fulfilled') setTechStackData(stackR.value.data);
      if (actR.status   === 'fulfilled') setRecentActivity(actR.value.data);
      if (lbR.status    === 'fulfilled') setLeaderboard(lbR.value.data.slice(0, 5));
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!showAiGen) return;
    API.get('/master/tech-stacks').then(r => setAiTechStacks(r.data || [])).catch(() => {});
  }, [showAiGen]);

  useEffect(() => {
    if (!aiForm.techStackId) { setAiTopics([]); setAiForm(f => ({ ...f, topicId: '' })); return; }
    API.get(`/master/tech-stacks/${aiForm.techStackId}/topics`)
      .then(r => setAiTopics(r.data || [])).catch(() => setAiTopics([]));
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
      }, { timeout: 300000 });
      setAiResult(data);
      // Refresh summary counts
      API.get('/stats/summary').then(r => setSummary(r.data)).catch(() => {});
    } catch (err) {
      setAiError(err.response?.data?.error || 'AI generation failed. Please try again.');
    } finally { setAiLoading(false); }
  };

  const openAiGen = () => { setAiResult(null); setAiError(''); setAiForm({ techStackId: '', topicId: '', count: 3, difficulty: 'MEDIUM' }); setShowAiGen(true); };

  const isAdmin    = user?.role === 'ADMIN';
  const firstName  = user?.fullName?.split(' ')[0] || user?.enterpriseId;
  const hour       = now.getHours();
  let greeting = t('home.greetingEvening');
  if (hour < 12) greeting = t('home.greetingMorning');
  else if (hour < 17) greeting = t('home.greetingAfternoon');
  const dateStr    = now.toLocaleDateString(i18n.language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const approvalRate = summary.totalMcqs > 0 ? Math.round((summary.approved / summary.totalMcqs) * 100) : 0;
  const reviewRate   = summary.totalMcqs > 0 ? Math.round((summary.inReview  / summary.totalMcqs) * 100) : 0;

  const STAT_CARDS = [
    { key: 'totalMcqs', label: isAdmin ? t('home.statTotalAdmin') : t('home.statTotalMy'), icon: '📚', color: '#7C3AED', gradBg: 'linear-gradient(135deg,#EDE9FE,#DDD6FE)', route: isAdmin ? '/question-bank' : '/my-questions' },
    { key: 'approved',  label: t('home.statApproved'),  icon: '✅', color: '#059669', gradBg: 'linear-gradient(135deg,#D1FAE5,#A7F3D0)', route: isAdmin ? '/question-bank?status=APPROVED'  : '/my-questions?status=APPROVED'  },
    { key: 'inReview',  label: t('home.statInReview'),  icon: '🔍', color: '#D97706', gradBg: 'linear-gradient(135deg,#FEF3C7,#FDE68A)', route: isAdmin ? '/pending-reviews' : '/my-questions?status=UNDER_REVIEW' },
    { key: 'rejected',  label: t('home.statRejected'),  icon: '❌', color: '#DC2626', gradBg: 'linear-gradient(135deg,#FEE2E2,#FECACA)', route: isAdmin ? '/question-bank?status=REJECTED'  : '/my-questions?status=REJECTED'  },
    { key: 'draft',     label: t('home.statDraft'),     icon: '📝', color: '#6B7280', gradBg: 'linear-gradient(135deg,#F3F4F6,#E5E7EB)', route: isAdmin ? '/question-bank?status=DRAFT' : '/my-questions?status=DRAFT' },
  ];

  const QUICK_ACTIONS = [
    { label: `✍️ ${t('common.newMcq')}`,      path: '/mcq/create',       color: '#7C3AED' },
    { label: `📸 ${t('common.screenshot')}`,   path: '/screenshot-mcq',   color: '#8B5CF6' },
    { label: `🔍 ${t('common.reviewQueue')}`, path: '/pending-reviews',  color: '#F59E0B' },
    { label: `🏆 ${t('nav.leaderboard')}`,  path: '/leaderboard',      color: '#10B981' },
    ...(isAdmin ? [
      { label: `🏛️ ${t('nav.questionBank')}`, path: '/question-bank', color: '#3B82F6' },
      { label: `📤 ${t('nav.bulkUpload')}`,   path: '/bulk-upload',   color: '#06B6D4' },
    ] : [
      { label: `📋 ${t('nav.myQuestions')}`, path: '/my-questions',   color: '#3B82F6' },
      { label: `📤 ${t('nav.bulkUpload')}`,  path: '/bulk-upload',    color: '#06B6D4' },
    ]),
  ];

  const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];

  return (
    <>
      <Navbar />
      <div className="dashboard">

        {/* ── Top header ── */}
        <div className="dash-header">
          <div>
            <h1 className="dash-greeting">{greeting}, {firstName}! 👋</h1>
            <p className="dash-date">{dateStr} &middot; {isAdmin ? t('home.adminDashboard') : t('home.myWorkspace')}</p>
          </div>
          <div className="dash-header-actions">
            <button className="dash-btn-primary" onClick={() => navigate('/mcq/create')}>{t('common.createMcq')}</button>
            <button className="dash-btn-secondary" onClick={() => navigate('/screenshot-mcq')}>📸 {t('common.screenshot')}</button>
          </div>
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
                    </div>
                  </div>
                  <div className="ai-gen-actions">
                    <button type="button" className="btn-secondary" onClick={() => { setAiResult(null); setAiError(''); }}>{t('ai.generateMore')}</button>
                    <button type="button" className="ai-gen-btn" onClick={() => { setShowAiGen(false); navigate('/my-questions'); }}>{t('ai.viewMyQuestions')}</button>
                  </div>
                </div>
              ) : (
                <div className="ai-gen-body">
                  <div className="ai-gen-form">
                    <div className="form-group">
                      <label>{t('form.techStack')}</label>
                      <select value={aiForm.techStackId} onChange={e => setAiForm(f => ({ ...f, techStackId: e.target.value, topicId: '' }))} disabled={aiLoading}>
                        <option value="">— {t('form.selectTechStack')} —</option>
                        {aiTechStacks.map(ts => <option key={ts.id} value={ts.id}>{ts.name}</option>)}
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
                    {aiError && <div className="ai-gen-error">{aiError}</div>}
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

        {/* ── AI Generator Showcase Banner ── */}
        <div className="ai-showcase-banner">
          <div className="ai-showcase-left">
            <div className="ai-showcase-glow">🤖</div>
            <div className="ai-showcase-text">
              <div className="ai-showcase-title">{t('ai.showcaseTitle')}</div>
              <div className="ai-showcase-sub">{t('ai.showcaseSub')}</div>
            </div>
          </div>
          <div className="ai-showcase-right">
            <div className="ai-showcase-pills">
              <span className="ai-pill">Spring Boot</span>
              <span className="ai-pill">Core Java</span>
              <span className="ai-pill">React</span>
              <span className="ai-pill">{t('common.andMore')}</span>
            </div>
            <button type="button" className="ai-showcase-cta" onClick={openAiGen}>🤖 {t('ai.generateNow')}</button>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="dash-stats">
          {STAT_CARDS.map(s => (
            <button key={s.key} type="button" className="dsc dsc-clickable" onClick={() => navigate(s.route)}
              title={`${t('common.view')} ${s.label}`}>
              <div className="dsc-icon-bg" style={{ background: s.gradBg }}>
                <span className="dsc-icon">{s.icon}</span>
              </div>
              <div className="dsc-body">
                <div className="dsc-val" style={{ color: s.color }}>
                  {loading ? '—' : summary[s.key]}<span className="dsc-plus">+</span>
                </div>
                <div className="dsc-label">{s.label}</div>
              </div>
            </button>
          ))}
        </div>

        {/* ── Main 2-column grid ── */}
        <div className="dash-grid">

          {/* LEFT column */}
          <div className="dash-col-left">

            {/* Tech stack bar chart */}
            <div className="dw">
              <div className="dw-head">
                <div>
                  <div className="dw-title">📊 {t('home.byTechStack')}</div>
                  <div className="dw-sub">{t('home.platformWide')}</div>
                </div>
              </div>
              <div className="dw-body">
                {loading ? <div className="dw-loading">{t('home.loadingChart')}</div> : <BarChart data={techStackData.map((d, i) => ({ ...d, techStack: txBarChartLabels[i] || d.techStack }))} />}
              </div>
            </div>

            {/* Recent activity table */}
            <div className="dw">
              <div className="dw-head">
                <div>
                  <div className="dw-title">🕐 {t('home.recentActivity')}</div>
                  <div className="dw-sub">{t('home.latestUpdates')}</div>
                </div>
                <button className="dw-link" onClick={() => navigate(isAdmin ? '/question-bank' : '/my-questions')}>
                  {t('common.viewAll')} →
                </button>
              </div>
              <div className="dw-body">
                {(() => {
                  if (loading) return <div className="dw-loading">{t('common.loading')}</div>;
                  if (recentActivity.length === 0) return <div className="dw-empty">{t('home.noActivity')}</div>;
                  return (
                    <table className="act-table">
                      <thead><tr><th>{t('common.question')}</th><th>{t('common.stack')}</th><th>{t('common.status')}</th><th>{t('common.updated')}</th></tr></thead>
                      <tbody>
                        {recentActivity.map((item, idx) => {
                          const m = STATUS_META[item.status] || { labelKey: null, color: '#6B7280', bg: '#F3F4F6' };
                          return (
                            <tr key={item.id} onClick={() => navigate(`/mcq/${item.id}`)}>  
                              <td className="act-q">{txActivityStems[idx] || item.questionStem}</td>
                              <td className="act-stack">{txActivityTechStacks[idx] || item.techStack}</td>
                              <td><span className="act-badge" style={{ color: m.color, background: m.bg }}>{m.labelKey ? t(m.labelKey) : item.status}</span></td>
                              <td className="act-time">{formatAgo(item.updatedAt)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* RIGHT column */}
          <div className="dash-col-right">

            {/* Performance rings */}
            <div className="dw">
              <div className="dw-head"><div className="dw-title">📈 {t('home.performanceOverview')}</div></div>
              <div className="dw-body">
                <div className="rings-row">
                  <CircleRing percent={approvalRate} color="#059669" label={t('home.statApproved')} />
                  <CircleRing percent={reviewRate}   color="#D97706" label={t('home.statInReview')} />
                  <div className="perf-legend">
                    {[
                      { label: `${summary.approved} ${t('home.statApproved')}`,  color: '#059669' },
                      { label: `${summary.inReview} ${t('home.statInReview')}`, color: '#D97706' },
                      { label: `${summary.rejected} ${t('home.statRejected')}`,  color: '#DC2626' },
                      { label: `${summary.draft} ${t('home.statDraft')}`,        color: '#6B7280' },
                    ].map(p => (
                      <div key={p.label} className="perf-item">
                        <span className="perf-dot" style={{ background: p.color }}/>
                        <span>{p.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="dw">
              <div className="dw-head"><div className="dw-title">⚡ {t('home.quickActions')}</div></div>
              <div className="dw-body">
                <button type="button" className="qa-btn-ai" onClick={openAiGen}>🤖 {t('ai.aiGenerateMcqs')}</button>
                <div className="qa-grid" style={{ marginTop: '0.6rem' }}>
                  {QUICK_ACTIONS.map(a => (
                    <button
                      key={a.path}
                      className="qa-btn"
                      style={{ '--qa-c': a.color }}
                      onClick={() => navigate(a.path)}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Mini leaderboard */}
            <div className="dw">
              <div className="dw-head">
                <div className="dw-title">🏆 {t('home.topReviewers')}</div>
                <button className="dw-link" onClick={() => navigate('/leaderboard')}>{t('common.fullList')} →</button>
              </div>
              <div className="dw-body">
                {(() => {
                  if (loading) return <div className="dw-loading">{t('common.loading')}</div>;
                  if (leaderboard.length === 0) return <div className="dw-empty">{t('home.noReviewers')}</div>;
                  return leaderboard.map((r, i) => (
                    <div key={r.userId} className="lb-mini">
                      <span className="lb-mini-medal">{medals[i]}</span>
                      <div className="lb-mini-info">
                        <span className="lb-mini-name">{r.fullName}</span>
                        <span className="lb-mini-id">{r.enterpriseId}</span>
                      </div>
                      <span className="lb-mini-cnt">{r.reviewCount}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

