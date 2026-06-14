import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import {
  FileText, CheckCircle2, Search, XCircle, PenLine, Camera,
  Trophy, Bot, BarChart3, TrendingUp, Clock, Plus,
  Upload, Code2, GripVertical, Link2, ArrowRightFromLine, TextCursorInput,
  Sparkles, Bug, Puzzle, Database, Building2, Eye, Wrench, Rocket, Shield, Brain,
  AlertTriangle, Activity, Layers, Star, Settings, RotateCcw, X
} from 'lucide-react';
import Navbar from '../components/Navbar';
import SystemHealth from '../components/SystemHealth';
import API, { cachedGet, getCacheSync } from '../api';
import { useTranslation } from 'react-i18next';
import { useContentTranslation } from '../hooks/useContentTranslation';
import './Home.css';

/* ── Dashboard Widget Configuration ── */
const WIDGET_REGISTRY = [
  { id: 'statCards',       label: 'Stat Cards',             icon: <FileText size={16} />,        description: 'Total, Approved, In Review, Rejected, Draft counters' },
  { id: 'techStack',      label: 'MCQs by Tech Stack',     icon: <BarChart3 size={16} />,       description: 'Bar chart of question distribution by tech stack' },
  { id: 'recentActivity', label: 'Recent Activity',        icon: <Clock size={16} />,           description: 'Table of latest question updates' },
  { id: 'performance',    label: 'Performance Overview',   icon: <TrendingUp size={16} />,      description: 'Approval & review rate rings' },
  { id: 'insights',       label: 'Platform Insights',      icon: <Activity size={16} />,        description: 'Quality score, SLA breaches, tech stacks' },
  { id: 'leaderboard',    label: 'Top Reviewers',          icon: <Trophy size={16} />,          description: 'Mini leaderboard of top 5 reviewers' },
  { id: 'pendingApprovals', label: 'Pending Approvals',    icon: <AlertTriangle size={16} />,   description: 'MCQs awaiting your approval action', adminOnly: true },
  { id: 'reviewerWorkload', label: 'Reviewer Workload',    icon: <Layers size={16} />,          description: 'How many MCQs each reviewer has pending', adminOnly: true },
  { id: 'actionItems',    label: 'Action Items',           icon: <CheckCircle2 size={16} />,    description: 'Rejected MCQs needing rework & SLA breaches' },
  { id: 'qualityGauge',   label: 'Quality Gauge',          icon: <Star size={16} />,            description: 'First-pass approval rate and rejection trend' },
];

const DEFAULT_VISIBLE = ['statCards', 'techStack', 'recentActivity', 'performance', 'insights', 'leaderboard'];
const STORAGE_KEY_PREFIX = 'quizhub_dashboard_widgets_';

function getUserStorageKey(userId) {
  return STORAGE_KEY_PREFIX + (userId || 'default');
}

function loadWidgetPrefs(userId) {
  try {
    // Try user-specific key first
    const userKey = getUserStorageKey(userId);
    const saved = localStorage.getItem(userKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
    // Migrate from old non-user key if exists
    const oldSaved = localStorage.getItem('quizhub_dashboard_widgets');
    if (oldSaved) {
      const parsed = JSON.parse(oldSaved);
      if (Array.isArray(parsed)) {
        localStorage.setItem(userKey, oldSaved);
        localStorage.removeItem('quizhub_dashboard_widgets');
        return parsed;
      }
    }
  } catch {}
  return [...DEFAULT_VISIBLE];
}

function saveWidgetPrefs(prefs, userId) {
  localStorage.setItem(getUserStorageKey(userId), JSON.stringify(prefs));
}

/* ── Drag-to-Reorder Order Storage ── */
const GRID_ORDER_KEY = 'quizhub_dashboard_grid_order_';
const DEFAULT_LEFT_ORDER  = ['techStack', 'recentActivity'];
const DEFAULT_RIGHT_ORDER = ['performance', 'insights', 'leaderboard'];
const DEFAULT_EXTRA_ORDER = ['pendingApprovals', 'reviewerWorkload', 'actionItems', 'qualityGauge'];

function loadGridOrder(section, userId) {
  try {
    const saved = localStorage.getItem(`${GRID_ORDER_KEY}${section}_${userId || 'default'}`);
    if (saved) { const p = JSON.parse(saved); if (Array.isArray(p)) return p; }
  } catch {}
  if (section === 'left')  return [...DEFAULT_LEFT_ORDER];
  if (section === 'right') return [...DEFAULT_RIGHT_ORDER];
  return [...DEFAULT_EXTRA_ORDER];
}

function saveGridOrder(section, order, userId) {
  localStorage.setItem(`${GRID_ORDER_KEY}${section}_${userId || 'default'}`, JSON.stringify(order));
}


const STATUS_META = {
  APPROVED:         { labelKey: 'common.approved',       color: '#059669', bg: '#D1FAE5' },
  REJECTED:         { labelKey: 'common.rejected',       color: '#DC2626', bg: '#FEE2E2' },
  UNDER_REVIEW:     { labelKey: 'common.inReview',       color: '#D97706', bg: '#FEF3C7' },
  READY_FOR_REVIEW: { labelKey: 'common.readyForReview', color: '#A100FF', bg: '#F3E8FF' },
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
  const COLORS = ['#A100FF','#3B82F6','#10B981','#F59E0B','#EF4444','#B84DFF','#06B6D4','#84CC16'];
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

  const [summary, setSummary]           = useState(() => getCacheSync('/stats/summary') || { totalMcqs: 0, approved: 0, inReview: 0, rejected: 0, draft: 0 });
  const [techStackData, setTechStackData] = useState(() => getCacheSync('/stats/by-tech-stack') || []);
  const [recentActivity, setRecentActivity] = useState(() => getCacheSync('/stats/recent-activity') || []);
  const [leaderboard, setLeaderboard]   = useState(() => { const d = getCacheSync('/stats/leaderboard'); return d ? d.slice(0, 5) : []; });
  const [loading, setLoading]           = useState(() => !getCacheSync('/stats/summary'));
  const [reviewerStats, setReviewerStats] = useState(() => getCacheSync('/stats/reviewer-stats') || null);
  const [slaBreachCount, setSlaBreachCount] = useState(() => { const d = getCacheSync('/stats/sla-breach'); return d ? (d.length || 0) : 0; });
  const [pendingApprovals, setPendingApprovals] = useState(() => { const d = getCacheSync('/mcqs?status=READY_FOR_REVIEW&page=0&size=100'); if (!d) return []; const items = d.content || d; return Array.isArray(items) ? items.slice(0, 5) : []; });
  const [reviewerWorkload, setReviewerWorkload] = useState([]);

  // Dashboard widget customization — per user
  const userId = user?.enterpriseId || user?.id;
  const [visibleWidgets, setVisibleWidgets] = useState(() => loadWidgetPrefs(userId));
  const [showCustomize, setShowCustomize] = useState(false);

  // Drag-to-reorder state
  const [leftOrder,  setLeftOrder]  = useState(() => loadGridOrder('left',  userId));
  const [rightOrder, setRightOrder] = useState(() => loadGridOrder('right', userId));
  const [extraOrder, setExtraOrder] = useState(() => loadGridOrder('extra', userId));
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  // Listen for profile-dropdown trigger
  useEffect(() => {
    const handler = () => setShowCustomize(true);
    window.addEventListener('open-dashboard-customize', handler);
    return () => window.removeEventListener('open-dashboard-customize', handler);
  }, []);

  const isWidgetVisible = useCallback((id) => visibleWidgets.includes(id), [visibleWidgets]);

  const toggleWidget = useCallback((id) => {
    setVisibleWidgets(prev => {
      const next = prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id];
      saveWidgetPrefs(next, userId);
      return next;
    });
  }, [userId]);

  const resetWidgets = useCallback(() => {
    setVisibleWidgets([...DEFAULT_VISIBLE]);
    saveWidgetPrefs([...DEFAULT_VISIBLE], userId);
  }, [userId]);

  // Drag-to-reorder handlers
  const reorderArr = useCallback((arr, fromId, toId) => {
    const next = [...arr];
    const from = next.indexOf(fromId);
    const to   = next.indexOf(toId);
    if (from < 0 || to < 0) return null;
    next.splice(from, 1);
    next.splice(to, 0, fromId);
    return next;
  }, []);

  const handleWidgetDrop = useCallback((targetId) => {
    if (!draggingId || draggingId === targetId) { setDraggingId(null); setDragOverId(null); return; }
    const tryLeft = reorderArr(leftOrder, draggingId, targetId);
    if (tryLeft)  { setLeftOrder(tryLeft);   saveGridOrder('left',  tryLeft,  userId); }
    const tryRight = reorderArr(rightOrder, draggingId, targetId);
    if (tryRight) { setRightOrder(tryRight); saveGridOrder('right', tryRight, userId); }
    const tryExtra = reorderArr(extraOrder, draggingId, targetId);
    if (tryExtra) { setExtraOrder(tryExtra); saveGridOrder('extra', tryExtra, userId); }
    setDraggingId(null); setDragOverId(null);
  }, [draggingId, leftOrder, rightOrder, extraOrder, reorderArr, userId]);

  const getDragProps = useCallback((id, orderArr) => ({
    draggable: true,
    onDragStart: (e) => { e.dataTransfer.effectAllowed = 'move'; setDraggingId(id); },
    onDragOver:  (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverId(id); },
    onDragLeave: ()  => setDragOverId(d => d === id ? null : d),
    onDrop:      (e) => { e.preventDefault(); handleWidgetDrop(id); },
    onDragEnd:   ()  => { setDraggingId(null); setDragOverId(null); },
    className: `dw${draggingId === id ? ' dw-is-dragging' : ''}${dragOverId === id && draggingId !== id ? ' dw-drag-over' : ''}`,
    style: { order: orderArr ? orderArr.indexOf(id) : 0 },
  }), [draggingId, dragOverId, handleWidgetDrop]);

  // Translate recent activity question stems AND tech stack names
  const activityStems = recentActivity.map(item => item.questionStem || '');
  const activityTechStacks = recentActivity.map(item => item.techStack || '');
  const barChartLabels = techStackData.map(d => d.techStack || '');

  const txActivityStems = useContentTranslation(activityStems);
  const txActivityTechStacks = useContentTranslation(activityTechStacks);
  const txBarChartLabels = useContentTranslation(barChartLabels);

  // AI Generator
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAiGen, setShowAiGen]       = useState(false);
  const [aiTechStacks, setAiTechStacks] = useState([]);
  const [aiTopics, setAiTopics]         = useState([]);
  const [aiForm, setAiForm]             = useState({ techStackId: '', topicId: '', count: 3, difficulty: 'MEDIUM' });
  const [aiLoading, setAiLoading]       = useState(false);
  const [aiResult, setAiResult]         = useState(null);
  const [aiError, setAiError]           = useState('');

  useEffect(() => {
    Promise.allSettled([
      cachedGet('/stats/summary'),
      cachedGet('/stats/by-tech-stack'),
      cachedGet('/stats/recent-activity'),
      cachedGet('/stats/leaderboard'),
      cachedGet('/stats/reviewer-stats'),
      ...(user?.role === 'ADMIN' ? [
        cachedGet('/stats/sla-breach'),
        API.get('/mcqs?status=READY_FOR_REVIEW&page=0&size=100'),
        cachedGet('/stats/leaderboard'),
      ] : []),
    ]).then(([sumR, stackR, actR, lbR, revR, slaR, pendR, wlR]) => {
      if (sumR.status   === 'fulfilled') setSummary(sumR.value.data);
      if (stackR.status === 'fulfilled') setTechStackData(stackR.value.data);
      if (actR.status   === 'fulfilled') setRecentActivity(actR.value.data);
      if (lbR.status    === 'fulfilled') setLeaderboard(lbR.value.data.slice(0, 5));
      if (revR?.status  === 'fulfilled') setReviewerStats(revR.value.data);
      if (slaR?.status  === 'fulfilled') setSlaBreachCount(slaR.value.data?.length || 0);
      if (pendR?.status === 'fulfilled') {
        const items = pendR.value.data?.content || pendR.value.data || [];
        setPendingApprovals(Array.isArray(items) ? items.slice(0, 5) : []);
      }
      if (wlR?.status   === 'fulfilled') {
        setReviewerWorkload(wlR.value.data || []);
      }
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!showAiGen) return;
    cachedGet('/master/tech-stacks').then(r => setAiTechStacks(r.data || [])).catch(() => {});
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
    { key: 'totalMcqs', label: isAdmin ? t('home.statTotalAdmin') : t('home.statTotalMy'), icon: <FileText size={22} />, color: '#A100FF', gradBg: 'linear-gradient(135deg,#F3E8FF,#DDD6FE)', route: isAdmin ? '/question-bank' : '/my-questions' },
    { key: 'approved',  label: t('home.statApproved'),  icon: <CheckCircle2 size={22} />, color: '#059669', gradBg: 'linear-gradient(135deg,#D1FAE5,#A7F3D0)', route: isAdmin ? '/question-bank?status=APPROVED'  : '/my-questions?status=APPROVED'  },
    { key: 'inReview',  label: t('home.statInReview'),  icon: <Search size={22} />, color: '#D97706', gradBg: 'linear-gradient(135deg,#FEF3C7,#FDE68A)', route: isAdmin ? '/pending-reviews' : '/my-questions?status=UNDER_REVIEW' },
    { key: 'rejected',  label: t('home.statRejected'),  icon: <XCircle size={22} />, color: '#DC2626', gradBg: 'linear-gradient(135deg,#FEE2E2,#FECACA)', route: isAdmin ? '/question-bank?status=REJECTED'  : '/my-questions?status=REJECTED'  },
    { key: 'draft',     label: t('home.statDraft'),     icon: <PenLine size={22} />, color: '#6B7280', gradBg: 'linear-gradient(135deg,#F3F4F6,#E5E7EB)', route: isAdmin ? '/question-bank?status=DRAFT' : '/my-questions?status=DRAFT' },
  ];

  const qualityScore = (summary.approved + summary.rejected) > 0
    ? Math.round((summary.approved / (summary.approved + summary.rejected)) * 100) : 0;

  const medals = ['#1','#2','#3','#4','#5'];

  return (
    <>
      <Navbar />
      <div className="dashboard">

        {/* ── AI Greeting Banner ── */}
        <div className="ai-greet-banner">
          <div className="ai-greet-orb">
            <div className="ai-greet-ring ai-greet-ring-1" />
            <div className="ai-greet-ring ai-greet-ring-2" />
            <div className="ai-greet-icon"><Sparkles size={22} /></div>
          </div>
          <div className="ai-greet-content">
            <div className="ai-greet-msg">
              <span className="ai-greet-wave">{hour < 12 ? '☀️' : hour < 17 ? '🌤️' : '🌙'}</span>
              {' '}{greeting}, <strong>{firstName}</strong>!
            </div>
            <div className="ai-greet-sub">
              {dateStr} · {isAdmin
                ? `${summary.totalMcqs} questions across ${techStackData.length} tech stacks · ${summary.inReview} awaiting review`
                : `You have ${summary.draft} drafts and ${summary.inReview} under review · Keep it up!`}
            </div>
          </div>
          <div className="ai-greet-actions">
            <button className="dash-btn-primary add-q-btn" onClick={() => setShowAddDialog(true)}>
              <Plus size={16} style={{marginRight:'0.35rem',verticalAlign:'middle'}} />
              {t('common.addQuestion')}
            </button>
          </div>
          <div className="ai-greet-sparkles">
            <span className="ai-sparkle ai-sparkle-1" />
            <span className="ai-sparkle ai-sparkle-2" />
            <span className="ai-sparkle ai-sparkle-3" />
          </div>
        </div>

        {/* ── System Health Pings ── */}
        <SystemHealth />

        {/* ── Customize Dashboard Drawer ── */}
        {showCustomize && <div className="cust-overlay" onClick={() => setShowCustomize(false)} aria-hidden="true" />}
        <div className={`cust-drawer${showCustomize ? ' cust-drawer-open' : ''}`}>
          <div className="cust-drawer-header">
            <div className="cust-drawer-title">
              <Settings size={18} />
              <span>Customize Dashboard</span>
            </div>
            <button className="cust-drawer-close" onClick={() => setShowCustomize(false)} type="button">
              <X size={18} />
            </button>
          </div>
          <p className="cust-drawer-desc">Toggle widgets on or off to personalize your dashboard view.</p>
          <div className="cust-widget-list">
            {WIDGET_REGISTRY.filter(w => !w.adminOnly || isAdmin).map(w => (
              <label key={w.id} className={`cust-widget-item${isWidgetVisible(w.id) ? ' cust-widget-active' : ''}`}>
                <div className="cust-widget-left">
                  <span className="cust-widget-icon">{w.icon}</span>
                  <div>
                    <div className="cust-widget-label">{w.label}{w.adminOnly ? <span className="cust-admin-badge">Admin</span> : null}</div>
                    <div className="cust-widget-desc">{w.description}</div>
                  </div>
                </div>
                <div className={`cust-toggle${isWidgetVisible(w.id) ? ' cust-toggle-on' : ''}`} onClick={() => toggleWidget(w.id)} role="switch" aria-checked={isWidgetVisible(w.id)} tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') toggleWidget(w.id); }}>
                  <div className="cust-toggle-thumb" />
                </div>
              </label>
            ))}
          </div>
          <div className="cust-drawer-footer">
            <button className="cust-reset-btn" onClick={resetWidgets} type="button">
              <RotateCcw size={14} style={{marginRight:'0.35rem',verticalAlign:'middle'}} />
              Reset to Default
            </button>
            <span className="cust-count">{visibleWidgets.filter(id => { const w = WIDGET_REGISTRY.find(r => r.id === id); return w && (!w.adminOnly || isAdmin); }).length}/{WIDGET_REGISTRY.filter(w => !w.adminOnly || isAdmin).length} widgets</span>
          </div>
        </div>

        {/* ── Add Question Dialog (same as MyQuestions) ── */}
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
                <button type="button" className="add-option-btn" style={{ '--hover-c': '#A100FF' }} onClick={() => { setShowAddDialog(false); openAiGen(); }}>
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
                    <div className="ai-gen-success-title">{aiResult.generated} {t('ai.mcqsGenerated')}</div>
                    <div className="ai-gen-success-detail">
                      <strong>{aiResult.techStack}</strong> → <strong>{aiResult.topic}</strong><br />
                      {t('ai.createdBy')}: <strong>{aiResult.creatorFullName}</strong> + <Bot size={12} style={{verticalAlign:'middle'}} /> AI<br />
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
                        <><Bot size={14} style={{marginRight:'0.3rem',verticalAlign:'middle'}} /> {t('ai.generate', { count: aiForm.count })}</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </dialog>
          </div>
        )}

        {/* ── Stat cards ── */}
        {isWidgetVisible('statCards') && (
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
        )}

        {/* ── Main 2-column grid ── */}
        <div className="dash-grid">

          {/* LEFT column */}
          <div className="dash-col-left">

            {/* Tech stack bar chart */}
            {isWidgetVisible('techStack') && (
            <div {...getDragProps('techStack', leftOrder)}>
              <div className="dw-head">
                <div>
                  <div className="dw-title"><BarChart3 size={16} style={{marginRight:'0.4rem',verticalAlign:'middle'}} /> {t('home.byTechStack')}</div>
                  <div className="dw-sub">{t('home.platformWide')}</div>
                </div>
              </div>
              <div className="dw-body">
                {loading ? <div className="dw-loading">{t('home.loadingChart')}</div> : <BarChart data={techStackData.map((d, i) => ({ ...d, techStack: txBarChartLabels[i] || d.techStack }))} />}
              </div>
            </div>
            )}

            {/* Recent activity table */}
            {isWidgetVisible('recentActivity') && (
            <div {...getDragProps('recentActivity', leftOrder)}>
              <div className="dw-head">
                <div>
                  <div className="dw-title"><Clock size={16} style={{marginRight:'0.4rem',verticalAlign:'middle'}} /> {t('home.recentActivity')}</div>
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
            )}
          </div>

          {/* RIGHT column */}
          <div className="dash-col-right">

            {/* Performance rings */}
            {isWidgetVisible('performance') && (
            <div {...getDragProps('performance', rightOrder)}>
              <div className="dw-head"><div className="dw-title"><TrendingUp size={16} style={{marginRight:'0.4rem',verticalAlign:'middle'}} /> {t('home.performanceOverview')}</div></div>
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
            )}

            {/* Dashboard Insights */}
            {isWidgetVisible('insights') && (
            <div {...getDragProps('insights', rightOrder)}>
              <div className="dw-head"><div className="dw-title"><Activity size={16} style={{marginRight:'0.4rem',verticalAlign:'middle'}} /> {isAdmin ? 'Platform Insights' : 'My Review Stats'}</div></div>
              <div className="dw-body">
                <div className="insights-grid">
                  {isAdmin ? (<>
                    <div className="insight-card">
                      <div className="insight-icon" style={{background:'linear-gradient(135deg,#D1FAE5,#A7F3D0)'}}><Star size={18} color="#059669"/></div>
                      <div className="insight-info">
                        <div className="insight-val" style={{color:'#059669'}}>{loading ? '—' : `${qualityScore}%`}</div>
                        <div className="insight-lbl">Quality Score</div>
                      </div>
                    </div>
                    <div className="insight-card">
                      <div className="insight-icon" style={{background:'linear-gradient(135deg,#FEF3C7,#FDE68A)'}}><AlertTriangle size={18} color="#D97706"/></div>
                      <div className="insight-info">
                        <div className="insight-val" style={{color:'#D97706'}}>{loading ? '—' : slaBreachCount}</div>
                        <div className="insight-lbl">SLA Breached</div>
                      </div>
                    </div>
                    <div className="insight-card">
                      <div className="insight-icon" style={{background:'linear-gradient(135deg,#DBEAFE,#BFDBFE)'}}><Layers size={18} color="#3B82F6"/></div>
                      <div className="insight-info">
                        <div className="insight-val" style={{color:'#3B82F6'}}>{loading ? '—' : techStackData.length}</div>
                        <div className="insight-lbl">Active Tech Stacks</div>
                      </div>
                    </div>
                    <div className="insight-card">
                      <div className="insight-icon" style={{background:'linear-gradient(135deg,#F3E8FF,#DDD6FE)'}}><TrendingUp size={18} color="#A100FF"/></div>
                      <div className="insight-info">
                        <div className="insight-val" style={{color:'#A100FF'}}>{loading ? '—' : `${approvalRate}%`}</div>
                        <div className="insight-lbl">Approval Rate</div>
                      </div>
                    </div>
                  </>) : (<>
                    <div className="insight-card">
                      <div className="insight-icon" style={{background:'linear-gradient(135deg,#F3E8FF,#DDD6FE)'}}><FileText size={18} color="#A100FF"/></div>
                      <div className="insight-info">
                        <div className="insight-val" style={{color:'#A100FF'}}>{loading ? '—' : (reviewerStats?.totalAssigned ?? 0)}</div>
                        <div className="insight-lbl">Assigned to Me</div>
                      </div>
                    </div>
                    <div className="insight-card">
                      <div className="insight-icon" style={{background:'linear-gradient(135deg,#D1FAE5,#A7F3D0)'}}><CheckCircle2 size={18} color="#059669"/></div>
                      <div className="insight-info">
                        <div className="insight-val" style={{color:'#059669'}}>{loading ? '—' : (reviewerStats?.approved ?? 0)}</div>
                        <div className="insight-lbl">Reviewed & Approved</div>
                      </div>
                    </div>
                    <div className="insight-card">
                      <div className="insight-icon" style={{background:'linear-gradient(135deg,#FEE2E2,#FECACA)'}}><XCircle size={18} color="#DC2626"/></div>
                      <div className="insight-info">
                        <div className="insight-val" style={{color:'#DC2626'}}>{loading ? '—' : (reviewerStats?.rejected ?? 0)}</div>
                        <div className="insight-lbl">Rejected</div>
                      </div>
                    </div>
                    <div className="insight-card">
                      <div className="insight-icon" style={{background:'linear-gradient(135deg,#FEF3C7,#FDE68A)'}}><Clock size={18} color="#D97706"/></div>
                      <div className="insight-info">
                        <div className="insight-val" style={{color:'#D97706'}}>{loading ? '—' : (reviewerStats?.pending ?? 0)}</div>
                        <div className="insight-lbl">Pending Review</div>
                      </div>
                    </div>
                  </>)}
                </div>
              </div>
            </div>
            )}

            {/* Mini leaderboard */}
            {isWidgetVisible('leaderboard') && (
            <div {...getDragProps('leaderboard', rightOrder)}>
              <div className="dw-head">
                <div className="dw-title"><Trophy size={16} style={{marginRight:'0.4rem',verticalAlign:'middle'}} /> {t('home.topReviewers')}</div>
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
            )}

          </div>
        </div>

        {/* ── Extra Widget Row ── */}
        <div className="dash-extra-row">

          {/* Pending Approvals — Admin only */}
          {isAdmin && isWidgetVisible('pendingApprovals') && (
            <div {...getDragProps('pendingApprovals', extraOrder)}>
              <div className="dw-head">
                <div>
                  <div className="dw-title"><AlertTriangle size={16} style={{marginRight:'0.4rem',verticalAlign:'middle'}} /> Pending Approvals</div>
                  <div className="dw-sub">{pendingApprovals.length} MCQs awaiting review</div>
                </div>
                <button className="dw-link" onClick={() => navigate('/pending-reviews')}>Review All →</button>
              </div>
              <div className="dw-body">
                {loading ? <div className="dw-loading">{t('common.loading')}</div> :
                  pendingApprovals.length === 0 ? <div className="dw-empty">No pending approvals — all caught up!</div> :
                  <div className="pa-list">
                    {pendingApprovals.map(mcq => {
                      const stem = mcq.questionStem || mcq.question || '';
                      return (
                        <div key={mcq.id} className="pa-item" onClick={() => navigate(`/mcq/${mcq.id}`)} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') navigate(`/mcq/${mcq.id}`); }}>
                          <div className="pa-stem">{stem.length > 80 ? stem.slice(0, 80) + '…' : stem}</div>
                          <div className="pa-meta">
                            <span className="pa-stack">{mcq.techStackName || mcq.techStack || '—'}</span>
                            <span className="pa-diff" data-diff={mcq.difficulty}>{mcq.difficulty}</span>
                            <span className="pa-time">{formatAgo(mcq.createdAt || mcq.updatedAt)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                }
              </div>
            </div>
          )}

          {/* Reviewer Workload — Admin only */}
          {isAdmin && isWidgetVisible('reviewerWorkload') && (
            <div {...getDragProps('reviewerWorkload', extraOrder)}>
              <div className="dw-head">
                <div>
                  <div className="dw-title"><Layers size={16} style={{marginRight:'0.4rem',verticalAlign:'middle'}} /> Reviewer Workload</div>
                  <div className="dw-sub">MCQs reviewed per reviewer</div>
                </div>
                <button className="dw-link" onClick={() => navigate('/reviewer-metrics')}>Details →</button>
              </div>
              <div className="dw-body">
                {loading ? <div className="dw-loading">{t('common.loading')}</div> :
                  reviewerWorkload.length === 0 ? <div className="dw-empty">{t('common.noData')}</div> :
                  <div className="rw-list">
                    {reviewerWorkload.slice(0, 6).map((r, i) => {
                      const maxCount = reviewerWorkload[0]?.reviewCount || 1;
                      const pct = Math.round((r.reviewCount / maxCount) * 100);
                      return (
                        <div key={r.userId || i} className="rw-item">
                          <div className="rw-name">{r.fullName}</div>
                          <div className="rw-bar-track">
                            <div className="rw-bar-fill" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="rw-count">{r.reviewCount}</span>
                        </div>
                      );
                    })}
                  </div>
                }
              </div>
            </div>
          )}

          {/* Action Items — for all users */}
          {isWidgetVisible('actionItems') && (
            <div {...getDragProps('actionItems', extraOrder)}>
              <div className="dw-head">
                <div>
                  <div className="dw-title"><CheckCircle2 size={16} style={{marginRight:'0.4rem',verticalAlign:'middle'}} /> Action Items</div>
                  <div className="dw-sub">Items needing your attention</div>
                </div>
              </div>
              <div className="dw-body">
                <div className="ai-items-list">
                  {summary.rejected > 0 && (
                    <button className="ai-item ai-item-warn" onClick={() => navigate(isAdmin ? '/question-bank?status=REJECTED' : '/my-questions?status=REJECTED')} type="button">
                      <XCircle size={16} />
                      <div className="ai-item-body">
                        <div className="ai-item-title">{summary.rejected} Rejected MCQs</div>
                        <div className="ai-item-desc">Need rework and resubmission</div>
                      </div>
                    </button>
                  )}
                  {isAdmin && slaBreachCount > 0 && (
                    <button className="ai-item ai-item-danger" onClick={() => navigate('/reviewer-metrics')} type="button">
                      <AlertTriangle size={16} />
                      <div className="ai-item-body">
                        <div className="ai-item-title">{slaBreachCount} SLA Breaches</div>
                        <div className="ai-item-desc">Reviews exceeding target turnaround</div>
                      </div>
                    </button>
                  )}
                  {summary.draft > 0 && (
                    <button className="ai-item ai-item-neutral" onClick={() => navigate(isAdmin ? '/question-bank?status=DRAFT' : '/my-questions?status=DRAFT')} type="button">
                      <PenLine size={16} />
                      <div className="ai-item-body">
                        <div className="ai-item-title">{summary.draft} Drafts</div>
                        <div className="ai-item-desc">Ready to finalize and submit</div>
                      </div>
                    </button>
                  )}
                  {summary.inReview > 0 && (
                    <button className="ai-item ai-item-pending" onClick={() => navigate(isAdmin ? '/pending-reviews' : '/my-questions?status=UNDER_REVIEW')} type="button">
                      <Search size={16} />
                      <div className="ai-item-body">
                        <div className="ai-item-title">{summary.inReview} Under Review</div>
                        <div className="ai-item-desc">{isAdmin ? 'Waiting for reviewer action' : 'Submitted and awaiting feedback'}</div>
                      </div>
                    </button>
                  )}
                  {summary.rejected === 0 && slaBreachCount === 0 && summary.draft === 0 && summary.inReview === 0 && (
                    <div className="dw-empty">No action items — great job!</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Quality Gauge */}
          {isWidgetVisible('qualityGauge') && (
            <div {...getDragProps('qualityGauge', extraOrder)}>
              <div className="dw-head">
                <div>
                  <div className="dw-title"><Star size={16} style={{marginRight:'0.4rem',verticalAlign:'middle'}} /> Quality Gauge</div>
                  <div className="dw-sub">First-pass approval metrics</div>
                </div>
              </div>
              <div className="dw-body">
                <div className="qg-grid">
                  <div className="qg-card">
                    <CircleRing percent={qualityScore} color="#059669" label="1st Pass" size={90} stroke={7} />
                    <div className="qg-label">Approval Rate</div>
                  </div>
                  <div className="qg-stats">
                    <div className="qg-stat">
                      <span className="qg-stat-val" style={{color:'#059669'}}>{summary.approved}</span>
                      <span className="qg-stat-lbl">Approved</span>
                    </div>
                    <div className="qg-stat">
                      <span className="qg-stat-val" style={{color:'#DC2626'}}>{summary.rejected}</span>
                      <span className="qg-stat-lbl">Rejected</span>
                    </div>
                    <div className="qg-stat">
                      <span className="qg-stat-val" style={{color:'#D97706'}}>{summary.inReview}</span>
                      <span className="qg-stat-lbl">In Review</span>
                    </div>
                    <div className="qg-stat">
                      <span className="qg-stat-val" style={{color:'#A100FF'}}>{summary.totalMcqs}</span>
                      <span className="qg-stat-lbl">Total</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

