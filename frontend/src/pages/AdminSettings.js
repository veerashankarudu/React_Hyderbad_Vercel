import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import API, { cachedGet } from '../api';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

export default function AdminSettings() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    cachedGet('/admin/settings').then(({ data }) => {
      setSettings(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: prev[key] === 'true' ? 'false' : 'true'
    }));
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await API.put('/admin/settings', settings);
      setSettings(data);
      toast.success('Settings saved successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <><Navbar /><div className="page-container"><p>Loading settings...</p></div></>;

  const rejectionEnabled = settings.max_rejection_limit_enabled === 'true';

  return (
    <>
      <Navbar />
      <div className="page-container">
        <div className="page-header">
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>⚙️ Admin Settings</h2>
        </div>

        {/* Rejection Limit Section */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🚫 Maximum Rejection Limit
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            When enabled, MCQs that get rejected more than the allowed number of times will be permanently rejected and cannot be resubmitted. This prevents wasting reviewer time on questions that repeatedly fail review.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={rejectionEnabled}
                onChange={() => handleToggle('max_rejection_limit_enabled')}
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
              <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>Enable rejection limit</span>
            </label>
          </div>

          {rejectionEnabled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(220, 38, 38, 0.05)', borderRadius: '8px', border: '1px solid #fecaca' }}>
              <label style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                Max rejections allowed:
              </label>
              <input
                type="number"
                min="1"
                value={settings.max_rejection_count || '3'}
                onChange={(e) => handleChange('max_rejection_count', e.target.value)}
                style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.88rem', fontWeight: 700, width: '80px', textAlign: 'center' }}
              />
              <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                After {settings.max_rejection_count || 3} rejection(s), the MCQ is permanently locked.
              </span>
            </div>
          )}
        </div>

        {/* SLA Breach Threshold Section */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🚨 SLA Breach Threshold
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Questions stuck in "Ready for Review" or "Under Review" longer than this threshold will appear as SLA breaches in Reviewer Metrics.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '8px', border: '1px solid #fde68a' }}>
            <label style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
              Breach after:
            </label>
            <input
              type="number"
              min="1"
              value={settings.sla_breach_threshold_days || '2'}
              onChange={(e) => handleChange('sla_breach_threshold_days', e.target.value)}
              style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.88rem', fontWeight: 700, width: '80px', textAlign: 'center' }}
            />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>day(s)</span>
            <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>
              Questions pending review for more than {settings.sla_breach_threshold_days || 2} day(s) are flagged.
            </span>
          </div>
        </div>

        {/* Reviewer Metrics Section */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📊 Reviewer Metrics
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Track reviewer performance including approval rates, turnaround times, and workload distribution.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.reviewer_metrics_enabled === 'true'}
              onChange={() => handleToggle('reviewer_metrics_enabled')}
              style={{ width: 18, height: 18, cursor: 'pointer' }}
            />
            <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>Enable reviewer performance tracking</span>
          </div>
        </div>

        {/* Wellness Reminder Section */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🧘 Wellness Reminders
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Show periodic health & wellness tips to users (drink water, stretch, rest eyes, exercise hands). Promotes well-being during long work sessions.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.wellness_enabled !== 'false'}
                onChange={() => handleToggle('wellness_enabled')}
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
              <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>Enable wellness reminders for all users</span>
            </label>
          </div>

          {settings.wellness_enabled !== 'false' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                  Show reminder every:
                </label>
                <select
                  value={settings.wellness_interval_minutes || '30'}
                  onChange={(e) => handleChange('wellness_interval_minutes', e.target.value)}
                  style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.88rem', fontWeight: 700 }}
                >
                  <option value="15">15 minutes</option>
                  <option value="20">20 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                  Auto-dismiss after:
                </label>
                <select
                  value={settings.wellness_dismiss_seconds || '15'}
                  onChange={(e) => handleChange('wellness_dismiss_seconds', e.target.value)}
                  style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.88rem', fontWeight: 700 }}
                >
                  <option value="10">10 seconds</option>
                  <option value="15">15 seconds</option>
                  <option value="20">20 seconds</option>
                  <option value="30">30 seconds</option>
                  <option value="45">45 seconds</option>
                  <option value="60">60 seconds</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                  First reminder after:
                </label>
                <select
                  value={settings.wellness_first_delay_seconds || '5'}
                  onChange={(e) => handleChange('wellness_first_delay_seconds', e.target.value)}
                  style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.88rem', fontWeight: 700 }}
                >
                  <option value="5">5 seconds (demo)</option>
                  <option value="30">30 seconds</option>
                  <option value="60">1 minute</option>
                  <option value="300">5 minutes</option>
                  <option value="600">10 minutes</option>
                  <option value="1800">30 minutes (same as interval)</option>
                </select>
              </div>

              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                💡 Tips shown: Drink water, stretch body, rest eyes, hand exercises, neck rolls, wrist stretch, deep breathing, posture check, desk exercises, walk around, and more.
              </p>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ padding: '0.6rem 2rem', fontSize: '0.9rem', fontWeight: 700 }}
          >
            {saving ? 'Saving...' : '💾 Save Settings'}
          </button>
        </div>
      </div>
    </>
  );
}
