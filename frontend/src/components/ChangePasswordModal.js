import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import API from '../api';

export default function ChangePasswordModal({ onClose }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (form.newPassword !== form.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (form.newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    API.post('/auth/change-password', {
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    })
      .then(() => { setSuccess(true); })
      .catch(err => setError(err?.response?.data?.error || err?.response?.data?.message || 'Password change failed.'))
      .finally(() => setLoading(false));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div style={{ background: 'var(--surface, #fff)', borderRadius: '14px', padding: '2rem', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
        {success ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
            <h3 style={{ color: '#059669', marginBottom: '0.5rem' }}>{t('cp.passwordChanged')}</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              {t('cp.passwordChangedMsg')}
            </p>
            <button type="button" onClick={onClose} style={{ background: 'var(--primary, #7C3AED)', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 1.5rem', fontWeight: 700, cursor: 'pointer' }}>
              {t('common.close')}
            </button>
          </div>
        ) : (
          <>
            <h3 style={{ marginBottom: '1.25rem', fontWeight: 700, fontSize: '1.1rem' }}>{t('common.changePassword')}</h3>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="cp-current" style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.35rem' }}>
                  {t('cp.currentPassword')}
                </label>
                <input
                  id="cp-current"
                  name="currentPassword"
                  type="password"
                  value={form.currentPassword}
                  onChange={handleChange}
                  placeholder={t('cp.currentPasswordPlaceholder')}
                  required
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="cp-new" style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.35rem' }}>
                  {t('cp.newPassword')}
                </label>
                <input
                  id="cp-new"
                  name="newPassword"
                  type="password"
                  value={form.newPassword}
                  onChange={handleChange}
                  placeholder={t('cp.newPasswordPlaceholder')}
                  required
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="cp-confirm" style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.35rem' }}>
                  {t('cp.confirmNewPassword')}
                </label>
                <input
                  id="cp-confirm"
                  name="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder={t('cp.confirmPasswordPlaceholder')}
                  required
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              {error && (
                <div style={{ color: '#EF4444', background: '#FEF2F2', borderRadius: '6px', padding: '0.6rem 0.85rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={onClose} disabled={loading} style={{ background: 'transparent', border: '1.5px solid #D1D5DB', borderRadius: '8px', padding: '0.5rem 1.25rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {t('common.cancel')}
                </button>
                <button type="submit" disabled={loading} style={{ background: 'var(--primary, #7C3AED)', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 1.25rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                  {loading ? t('common.saving') : t('cp.updatePassword')}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

ChangePasswordModal.propTypes = {
  onClose: PropTypes.func.isRequired,
};
