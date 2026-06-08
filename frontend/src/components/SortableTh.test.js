/**
 * SortableTh.test.js — Tests for SortableTh component
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';

const SortableTh = require('./SortableTh').default;

function renderTh(props = {}) {
  const defaults = {
    colKey: 'name',
    label: 'Name',
    sortCol: 'name',
    sortDir: 'asc',
    onSort: jest.fn(),
  };
  return render(
    <table><thead><tr><SortableTh {...defaults} {...props} /></tr></thead></table>
  );
}

describe('SortableTh', () => {
  test('renders label text', () => {
    const { container } = renderTh({ label: 'Full Name' });
    expect(container.textContent).toContain('Full Name');
  });

  test('renders children instead of label when provided', () => {
    const { container } = render(
      <table><thead><tr>
        <SortableTh colKey="x" sortCol="x" sortDir="asc" onSort={jest.fn()}>
          <span>Custom Child</span>
        </SortableTh>
      </tr></thead></table>
    );
    expect(container.textContent).toContain('Custom Child');
  });

  test('calls onSort with colKey when clicked', () => {
    const onSort = jest.fn();
    const { container } = renderTh({ colKey: 'email', onSort });
    fireEvent.click(container.querySelector('th'));
    expect(onSort).toHaveBeenCalledWith('email');
  });

  test('shows up arrow when active and sortDir is asc', () => {
    const { container } = renderTh({ sortCol: 'name', sortDir: 'asc', colKey: 'name' });
    expect(container.textContent).toContain('↑');
  });

  test('shows down arrow when active and sortDir is desc', () => {
    const { container } = renderTh({ sortCol: 'name', sortDir: 'desc', colKey: 'name' });
    expect(container.textContent).toContain('↓');
  });

  test('shows up arrow with low opacity when not active', () => {
    const { container } = renderTh({ sortCol: 'other', sortDir: 'asc', colKey: 'name' });
    const arrowSpan = container.querySelector('th span');
    expect(arrowSpan.style.opacity).toBe('0.25');
  });

  test('shows full opacity when active', () => {
    const { container } = renderTh({ sortCol: 'name', sortDir: 'asc', colKey: 'name' });
    const th = container.querySelector('th');
    const spans = th.querySelectorAll('span');
    const arrowSpan = spans[spans.length - 1];
    expect(arrowSpan.style.opacity).toBe('1');
  });

  test('has cursor pointer style', () => {
    const { container } = renderTh();
    expect(container.querySelector('th').style.cursor).toBe('pointer');
  });

  test('has userSelect none style', () => {
    const { container } = renderTh();
    expect(container.querySelector('th').style.userSelect).toBe('none');
  });

  test('applies custom style prop', () => {
    const { container } = renderTh({ style: { width: '200px' } });
    expect(container.querySelector('th').style.width).toBe('200px');
  });

  test('title says "Sort by X" when not active', () => {
    const { container } = renderTh({ sortCol: 'other', colKey: 'name', label: 'Name' });
    expect(container.querySelector('th').title).toBe('Sort by Name');
  });

  test('title says "Sorted A→Z" when active asc', () => {
    const { container } = renderTh({ sortCol: 'name', sortDir: 'asc', colKey: 'name' });
    expect(container.querySelector('th').title).toContain('A→Z');
  });

  test('title says "Sorted Z→A" when active desc', () => {
    const { container } = renderTh({ sortCol: 'name', sortDir: 'desc', colKey: 'name' });
    expect(container.querySelector('th').title).toContain('Z→A');
  });

  test('multiple clicks call onSort each time', () => {
    const onSort = jest.fn();
    const { container } = renderTh({ onSort });
    const th = container.querySelector('th');
    fireEvent.click(th);
    fireEvent.click(th);
    fireEvent.click(th);
    expect(onSort).toHaveBeenCalledTimes(3);
  });
});
