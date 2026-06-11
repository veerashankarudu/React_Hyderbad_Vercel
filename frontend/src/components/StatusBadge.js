import React from 'react';
import { useTranslation } from 'react-i18next';

const STATUS_CONFIG = {
  DRAFT:            { bg: '#F3F4F6', color: '#4B5563', labelKey: 'common.draft',          dot: '#9CA3AF',  border: '#E5E7EB' },
  READY_FOR_REVIEW: { bg: '#EFF6FF', color: '#1D4ED8', labelKey: 'common.readyForReview', dot: '#3B82F6',  border: '#BFDBFE' },
  UNDER_REVIEW:     { bg: '#FFFBEB', color: '#B45309', labelKey: 'common.inReview',       dot: '#F59E0B',  border: '#FDE68A' },
  APPROVED:         { bg: '#ECFDF5', color: '#065F46', labelKey: 'common.approved',       dot: '#10B981',  border: '#A7F3D0' },
  REJECTED:         { bg: '#FFF1F2', color: '#9F1239', labelKey: 'common.rejected',       dot: '#F43F5E',  border: '#FECDD3' },
  PERMANENTLY_REJECTED: { bg: '#1F2937', color: '#F9FAFB', labelKey: 'common.permanentlyRejected', dot: '#DC2626', border: '#374151' },
};

export default function StatusBadge({ status }) {
  const { t } = useTranslation();
  const cfg = STATUS_CONFIG[status] || { bg: '#F3F4F6', color: '#666', labelKey: null, dot: '#999', border: '#E5E7EB' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.32rem',
      padding: '0.26rem 0.7rem', borderRadius: '20px',
      fontSize: '0.73rem', fontWeight: 700,
      background: cfg.bg, color: cfg.color,
      border: `1.5px solid ${cfg.border}`,
      whiteSpace: 'nowrap', letterSpacing: '0.01em',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.labelKey ? t(cfg.labelKey) : status}
    </span>
  );
}
