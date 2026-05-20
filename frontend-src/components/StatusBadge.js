import React from 'react';

const STATUS_STYLES = {
  DRAFT:             { background: '#f3f4f6', color: '#6b7280', label: 'Draft' },
  READY_FOR_REVIEW:  { background: '#dbeafe', color: '#1d4ed8', label: 'Ready for Review' },
  UNDER_REVIEW:      { background: '#fef3c7', color: '#d97706', label: 'Under Review' },
  APPROVED:          { background: '#d1fae5', color: '#065f46', label: 'Approved' },
  REJECTED:          { background: '#fee2e2', color: '#dc2626', label: 'Rejected' },
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || { background: '#f3f4f6', color: '#666', label: status };
  return (
    <span style={{
      padding: '0.2rem 0.65rem',
      borderRadius: '12px',
      fontSize: '0.78rem',
      fontWeight: 600,
      background: style.background,
      color: style.color,
      whiteSpace: 'nowrap',
    }}>
      {style.label}
    </span>
  );
}
