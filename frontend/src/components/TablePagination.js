import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

/**
 * Reusable pagination bar with prev/next buttons, page indicator, and page-size selector.
 *
 * Props:
 *   page        {number}   current page (1-indexed)
 *   totalPages  {number}   total number of pages
 *   pageSize    {number}   current page size
 *   onPageChange  (p) => void
 *   onSizeChange  (n) => void
 *   pageSizeOptions {number[]}  default [5, 10, 15, 20]
 *   totalItems  {number}   optional, shows "X items" label
 *   dark        {boolean}  use dark-theme select styling
 */
export default function TablePagination({
  page,
  totalPages,
  pageSize,
  onPageChange,
  onSizeChange,
  pageSizeOptions = [5, 10, 15, 20],
  totalItems,
  dark = false,
}) {
  const { t } = useTranslation();
  if (totalPages <= 1 && !onSizeChange) return null;

  const selectStyle = {
    padding: '0.3rem 0.55rem',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    fontSize: '0.82rem',
    cursor: 'pointer',
    background: dark ? '#1c2128' : 'var(--bg-light)',
    color: dark ? '#e2e8f0' : 'var(--text)',
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      flexWrap: 'wrap',
      marginTop: '0.85rem',
      justifyContent: 'center',
    }}>
      {onPageChange && (
        <button
          type="button"
          className="page-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          ← Prev
        </button>
      )}

      {totalPages > 0 && (
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '0 0.25rem' }}>
          {t('pagination.pageOf', { page, total: totalPages })}
          {totalItems !== undefined && ` ${t('pagination.totalItems', { count: totalItems })}`}
        </span>
      )}

      {onSizeChange && (
        <select
          value={pageSize}
          onChange={e => onSizeChange(Number(e.target.value))}
          style={selectStyle}
          aria-label="Rows per page"
        >
          {pageSizeOptions.map(n => (
            <option key={n} value={n}>{n} {t('pagination.rowsPerPage')}</option>
          ))}
        </select>
      )}

      {onPageChange && (
        <button
          type="button"
          className="page-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next →
        </button>
      )}
    </div>
  );
}

TablePagination.propTypes = {
  page: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  pageSize: PropTypes.number.isRequired,
  onPageChange: PropTypes.func,
  onSizeChange: PropTypes.func,
  pageSizeOptions: PropTypes.arrayOf(PropTypes.number),
  totalItems: PropTypes.number,
  dark: PropTypes.bool,
};
