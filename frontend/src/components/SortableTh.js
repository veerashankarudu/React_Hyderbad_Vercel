import React from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable sortable <th> element.
 *
 * Props:
 *   colKey      {string}   the data key this column sorts by
 *   label       {string}   display label
 *   sortCol     {string}   currently active sort column key
 *   sortDir     {'asc'|'desc'}
 *   onSort      (colKey) => void
 *   style       {object}   extra inline styles for the <th>
 *   children    optional   override label with children
 */
export default function SortableTh({
  colKey,
  label,
  sortCol,
  sortDir,
  onSort,
  style = {},
  children,
}) {
  const isActive = sortCol === colKey;
  let titleText;
  if (!isActive) { titleText = `Sort by ${label || colKey}`; }
  else if (sortDir === 'asc') { titleText = 'Sorted A→Z, click for Z→A'; }
  else { titleText = 'Sorted Z→A, click for A→Z'; }

  return (
    <th
      onClick={() => onSort(colKey)}
      style={{
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        ...style,
      }}
      title={titleText}
    >
      {children || label}
      {' '}
      <span style={{
        opacity: isActive ? 1 : 0.25,
        fontSize: '0.72rem',
        transition: 'opacity 0.15s',
      }}>
        {isActive && sortDir === 'desc' ? '↓' : '↑'}
      </span>
    </th>
  );
}

SortableTh.propTypes = {
  colKey: PropTypes.string.isRequired,
  label: PropTypes.string,
  sortCol: PropTypes.string.isRequired,
  sortDir: PropTypes.oneOf(['asc', 'desc']).isRequired,
  onSort: PropTypes.func.isRequired,
  style: PropTypes.object,
  children: PropTypes.node,
};
