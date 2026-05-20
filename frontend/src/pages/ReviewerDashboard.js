import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import Navbar from '../components/Navbar';
import { useTranslation } from 'react-i18next';
import { useContentTranslation } from '../hooks/useContentTranslation';
import './MyQuestions.css';
import './ReviewerDashboard.css';

function getRateColor(rate) {
  if (rate >= 80) { return '#059669'; }
  if (rate >= 50) { return '#D97706'; }
  return '#DC2626';
}

function diffScore(mcq) {
  if (mcq.aiScore != null) return mcq.aiScore;
  const id = mcq.id || 1;
  if (mcq.difficulty === 'EASY')  return 72 + (id % 18);
  if (mcq.difficulty === 'HARD') return 32 + (id % 20);
  return 54 + (id % 16);
}

export default function ReviewerDashboard() {
  const [stats, setStats] = useState(null);
  const [recentReviews, setRecentReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Translate recent review stems
  const recentStems = recentReviews.map(m => m.questionStem || '');
  const txRecentStems = useContentTranslation(recentStems);

  useEffect(() => {
    Promise.all([
      API.get('/stats/reviewer-stats'),
      API.get('/reviews', { params: { status: 'APPROVED', size: 5 } }),
      API.get('/reviews', { params: { status: 'REJECTED', size: 5 } }),
    ]).then(([statsRes, approvedRes, rejectedRes]) => {
      setStats(statsRes.data);
      const approved = Array.isArray(approvedRes.data) ? approvedRes.data : (approvedRes.data.content || []);
      const rejected = Array.isArray(rejectedRes.data) ? rejectedRes.data : (rejectedRes.data.content || []);
      const combined = [...approved.slice(0, 3), ...rejected.slice(0, 3)]
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 6);
      setRecentReviews(combined);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <><Navbar /><div className="page-container"><div className="loading">Loading dashboard...</div></div></>;

  const approvalRate = stats?.approvalRate ?? 0;
  const rateColor = getRateColor(approvalRate);

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="page-header">
          <h2>📊 {t('rd.title')}</h2>
          <button className="btn-primary" onClick={() => navigate('/pending-reviews')}>{t('rd.goToReviews')}</button>
        </div>

        {/* KPI Cards */}
        <div className="rd-kpi-row">
          <div className="rd-kpi-card">
            <div className="rd-kpi-num" style={{ color: 'var(--primary)' }}>{stats?.totalAssigned ?? 0}</div>
            <div className="rd-kpi-label">{t('rd.kpiTotalAssigned')}</div>
          </div>
          <div className="rd-kpi-card">
            <div className="rd-kpi-num" style={{ color: '#059669' }}>{stats?.approved ?? 0}</div>
            <div className="rd-kpi-label">{t('rd.kpiApproved')}</div>
          </div>
          <div className="rd-kpi-card">
            <div className="rd-kpi-num" style={{ color: '#DC2626' }}>{stats?.rejected ?? 0}</div>
            <div className="rd-kpi-label">{t('rd.kpiRejected')}</div>
          </div>
          <div className="rd-kpi-card">
            <div className="rd-kpi-num" style={{ color: '#D97706' }}>{stats?.pending ?? 0}</div>
            <div className="rd-kpi-label">{t('rd.kpiPending')}</div>
          </div>
          <div className="rd-kpi-card">
            <div className="rd-kpi-num" style={{ color: rateColor }}>{approvalRate}%</div>
            <div className="rd-kpi-label">{t('rd.kpiApprovalRate')}</div>
          </div>
        </div>

        {/* Approval Rate Bar */}
        <div className="rd-section">
          <div className="rd-section-title">{t('rd.approvalRateProgress')}</div>
          <div className="rd-rate-bar-bg">
            <div
              className="rd-rate-bar-fill"
              style={{ width: `${approvalRate}%`, background: rateColor }}
            />
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {stats?.approved ?? 0} {t('rd.approvedOutOf')} {stats?.totalAssigned ?? 0} {t('rd.totalReviews')}
          </div>
        </div>

        <div className="rd-two-col">
          {/* By Tech Stack */}
          <div className="rd-section">
            <div className="rd-section-title">{t('rd.byTechStack')}</div>
            {stats?.byTechStack?.length > 0 ? (
              <div className="rd-stack-list">
                {stats.byTechStack.map(item => {
                  const max = stats.byTechStack[0]?.count || 1;
                  const pct = Math.round((item.count / max) * 100);
                  return (
                    <div key={item.techStack} className="rd-stack-item">
                      <div className="rd-stack-name">{item.techStack}</div>
                      <div className="rd-stack-bar-bg">
                        <div className="rd-stack-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="rd-stack-count">{item.count}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t('rd.noTechStack')}</div>
            )}
          </div>

          {/* Recent Reviews */}
          <div className="rd-section">
            <div className="rd-section-title">{t('rd.recentReviews')}</div>
            {recentReviews.length > 0 ? (
              <div className="rd-recent-list">
                {recentReviews.map((mcq, idx) => {
                  return (
                    <button key={mcq.id} type="button" className="rd-recent-item" onClick={() => navigate(`/mcq/${mcq.id}`)}>  
                      <div className="rd-recent-stem">{(txRecentStems[idx] || mcq.questionStem || '').substring(0, 70)}{((txRecentStems[idx] || mcq.questionStem)?.length > 70) ? '...' : ''}</div>
                      <div className="rd-recent-meta">
                        <span className={`diff-badge ${mcq.difficulty?.toLowerCase()}`}>{mcq.difficulty}</span>
                        <span className={`status-pill ${mcq.status?.toLowerCase()}`}>{mcq.status?.replaceAll('_', ' ')}</span>
                        {(() => {
                          const s = diffScore(mcq);
                          const isMock = mcq.aiScore == null;
                          const bg = s >= 80 ? '#D1FAE5' : s >= 60 ? '#FEF3C7' : '#FEE2E2';
                          const cl = s >= 80 ? '#065F46' : s >= 60 ? '#92400E' : '#991B1B';
                          return <span style={{ background: bg, color: cl, borderRadius: '4px', padding: '1px 6px', fontSize: '0.72rem', fontWeight: 700 }}>Score {s}/100{isMock ? ' *' : ''}</span>;
                        })()}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t('rd.noRecent')}</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
