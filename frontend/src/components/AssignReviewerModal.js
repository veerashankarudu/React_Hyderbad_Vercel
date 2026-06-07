import React, { useState, useEffect } from 'react';
import API from '../api';
import { useTranslation } from 'react-i18next';
import './AssignReviewerModal.css';

export default function AssignReviewerModal({ mcq, onClose, onAssigned }) {
  const [reviewers, setReviewers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    API.get(`/admin/mcqs/${mcq.id}/eligible-reviewers`)
      .then(({ data }) => setReviewers(data))
      .catch(() => setError('Failed to load reviewers'));
  }, [mcq.id]);

  const handleAssign = async () => {
    if (!selected) return;
    setLoading(true);
    setError('');
    try {
      await API.post(`/admin/mcqs/${mcq.id}/assign-reviewer`, { reviewerId: selected });
      onAssigned();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign reviewer');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <h3>{t('arm.title')}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-mcq-info">
            <div className="modal-mcq-question">{mcq.questionStem}</div>
            <div className="modal-mcq-meta"><strong>Technology Stack:</strong> {mcq.techStackName} &bull; <strong>Topic:</strong> {mcq.topicName} &bull; <strong>Creator:</strong> {mcq.creatorEnterpriseId || mcq.creatorFullName}</div>
          </div>

          <div className="modal-section-label">
            {reviewers.length === 0 ? t('arm.loadingReviewers') : `Choose reviewer mapped for ${mcq.techStackName}`}
          </div>

          <div className="reviewer-list">
            {reviewers.map((r) => (
              <label key={r.id} className={`reviewer-option${selected === r.id ? ' selected' : ''}`}>
                <input type="radio" name="reviewer" value={r.id} checked={selected === r.id} onChange={() => setSelected(r.id)} />
                <div className="reviewer-avatar">{getInitials(r.fullName)}</div>
                <div className="reviewer-info">
                  <div className="reviewer-name">{r.fullName}</div>
                  <div className="reviewer-id">{r.enterpriseId}</div>
                </div>
              </label>
            ))}
          </div>

          {error && <div style={{ color: 'var(--error)', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{error}</div>}

          <div className="modal-actions">
            <button className="btn-sm btn-outline" onClick={onClose}>{t('common.cancel')}</button>
            <button className="btn-sm btn-primary" disabled={!selected || loading} onClick={handleAssign}>
              {loading ? t('arm.assigning') : t('arm.assign')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
