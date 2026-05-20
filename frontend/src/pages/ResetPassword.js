import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import API from '../api';
import './Login.css'; /* reuse login styles */

export default function ResetPassword() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!token) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚠️</div>
            <h2>{t('rp.invalidTitle')}</h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
              {t('rp.invalidMsg')}
            </p>
            <Link to="/forgot-password" className="login-button" style={{ textDecoration: 'none', display: 'inline-block' }}>
              {t('rp.requestNew')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { setError(t('rp.tooShort')); return; }
    if (newPassword !== confirmPassword) { setError(t('rp.mismatch')); return; }
    setLoading(true);
    setError('');
    try {
      await API.post('/auth/reset-password', { token, newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (e) {
      setError(e.response?.data?.message || t('rp.failedReset'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
            <h2 style={{ marginBottom: '0.5rem' }}>{t('rp.successTitle')}</h2>
            <p style={{ color: '#64748b', marginBottom: '0.5rem' }}>
              {t('rp.successMsg')}
            </p>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              {t('rp.redirecting')}
            </p>
            <Link to="/login" className="login-button" style={{ textDecoration: 'none', display: 'inline-block' }}>
              {t('rp.goToLogin')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">🔐</div>
          <h1 className="login-title">{t('rp.title')}</h1>
          <p className="login-subtitle">{t('rp.subtitle')}</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}

          <div className="login-field">
            <label className="login-label">{t('rp.newPassword')}</label>
            <input
              className="login-input"
              type="password"
              placeholder={t('rp.newPlaceholder')}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="login-field">
            <label className="login-label">{t('rp.confirmPassword')}</label>
            <input
              className="login-input"
              type="password"
              placeholder={t('rp.confirmPlaceholder')}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            className="login-button"
            type="submit"
            disabled={loading || !newPassword || !confirmPassword}
          >
            {loading ? t('rp.resetting') : t('rp.reset')}
          </button>
        </form>
      </div>
    </div>
  );
}
