import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import API from '../api';
import './Login.css';

const AI_NODES = [[80,120],[200,80],[350,140],[480,90],[540,220],[490,360],[400,480],[250,520],[120,440],[60,280],[300,300],[420,200],[180,340]];
const AI_LINES = [[80,120,200,80],[200,80,350,140],[350,140,480,90],[480,90,540,220],[540,220,490,360],[490,360,400,480],[400,480,250,520],[250,520,120,440],[120,440,60,280],[60,280,80,120],[300,300,200,80],[300,300,480,90],[300,300,490,360],[300,300,250,520],[300,300,120,440],[420,200,350,140],[420,200,540,220],[180,340,60,280],[180,340,250,520]];

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setLoading(true);
    setError('');
    try {
      const key = identifier.includes('@') ? 'email' : 'enterpriseId';
      await API.post('/auth/forgot-password', { [key]: identifier.trim() });
      setSent(true);
    } catch (e) {
      setError(e.response?.data?.message || t('fp.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  const RightPanel = () => (
    <div className="login-right">
      <svg className="login-ai-svg" viewBox="0 0 600 700" xmlns="http://www.w3.org/2000/svg">
        {AI_NODES.map(([cx, cy], i) => (
          <g key={i}>
            <circle cx={cx} cy={cy} r="3" fill="#6983FF" opacity="0.7">
              <animate attributeName="opacity" values="0.3;0.9;0.3" dur={`${2 + i * 0.4}s`} repeatCount="indefinite"/>
            </circle>
          </g>
        ))}
        {AI_LINES.map(([x1,y1,x2,y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#6983FF" strokeWidth="0.8" opacity="0.25"/>
        ))}
      </svg>
      <div className="login-right-content">
        <div className="login-ai-icon">🔑</div>
        <div className="login-ai-badge-tag">{t('fp.secureBadge')}</div>
        <h2 className="login-ai-title">{t('fp.rightTitle')}</h2>
        <p className="login-ai-desc">{t('fp.rightDesc')}</p>
        <div className="login-ai-stats">
          <div className="login-ai-stat"><span className="las-num">2hr</span><span className="las-lbl">{t('fp.linkValid')}</span></div>
          <div className="login-ai-stat"><span className="las-num">SSL</span><span className="las-lbl">{t('fp.encrypted')}</span></div>
          <div className="login-ai-stat"><span className="las-num">24/7</span><span className="las-lbl">{t('fp.support')}</span></div>
        </div>
      </div>
    </div>
  );

  if (sent) {
    return (
      <div className="login-root">
        <div className="login-left">
          <div className="login-brand-bar">
            <div className="login-logo-icon">🧠</div>
            <span className="login-brand-text">{t('common.appName')}</span>
          </div>
          <div className="login-form-section">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📬</div>
              <h2 className="login-heading" style={{ marginBottom: '0.5rem' }}>{t('fp.checkEmailTitle')}</h2>
              <p style={{ color: '#64748b', marginBottom: '1rem', lineHeight: 1.6 }}>
                {t('fp.checkEmailMsg', { identifier })}
              </p>
              <p style={{ color: '#475569', fontSize: '0.83rem', marginBottom: '1.75rem' }}>
                {t('fp.linkExpiry')}
              </p>
              <Link to="/login" className="login-submit-btn" style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }}>
                {t('fp.backToLogin')}
              </Link>
            </div>
          </div>
        </div>
        <RightPanel />
      </div>
    );
  }

  return (
    <div className="login-root">
      {/* LEFT — Form Panel */}
      <div className="login-left">
        <div className="login-brand-bar">
          <div className="login-logo-icon">🧠</div>
          <span className="login-brand-text">{t('common.appName')}</span>
        </div>
        <div className="login-form-section">
          <h2 className="login-heading">{t('fp.title')}</h2>
          <p className="login-sub">{t('fp.subtitle')}</p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label>{t('fp.idOrEmailLabel')}</label>
              <input
                type="text"
                placeholder={t('fp.idOrEmailPlaceholder')}
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>
            {error && <div className="login-error">{error}</div>}
            <button type="submit" className="login-submit-btn" disabled={loading || !identifier.trim()}>
              {loading ? t('fp.sending') : t('fp.sendLink')}
            </button>
          </form>

          <div className="login-signup-link" style={{ marginTop: '1.25rem' }}>
            <Link to="/login">{t('fp.backToLogin')}</Link>
          </div>
        </div>
      </div>

      {/* RIGHT — Visual Panel */}
      <RightPanel />
    </div>
  );
}
