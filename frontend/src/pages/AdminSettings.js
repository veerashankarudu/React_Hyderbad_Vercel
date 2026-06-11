import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import API from '../api';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

export default function AdminSettings() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    API.get('/admin/settings').then(({ data }) => {
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
