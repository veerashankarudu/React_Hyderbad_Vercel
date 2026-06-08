/**
 * TablePagination.test.js — Tests for TablePagination component
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, opts) => {
    if (key === 'pagination.pageOf') return `Page ${opts?.page} of ${opts?.total}`;
    if (key === 'pagination.totalItems') return `(${opts?.count} items)`;
    if (key === 'pagination.rowsPerPage') return 'rows';
    return key;
  }, i18n: { language: 'en', changeLanguage: jest.fn() } }),
}));

const TablePagination = require('./TablePagination').default;

function renderPagination(props = {}) {
  const defaults = {
    page: 1,
    totalPages: 5,
    pageSize: 10,
    onPageChange: jest.fn(),
    onSizeChange: jest.fn(),
  };
  return render(<TablePagination {...defaults} {...props} />);
}

describe('TablePagination', () => {
  test('renders page indicator text', () => {
    const { container } = renderPagination({ page: 2, totalPages: 10 });
    expect(container.textContent).toContain('Page 2 of 10');
  });

  test('renders Prev button', () => {
    const { container } = renderPagination();
    expect(container.textContent).toContain('Prev');
  });

  test('renders Next button', () => {
    const { container } = renderPagination();
    expect(container.textContent).toContain('Next');
  });

  test('Prev button is disabled on first page', () => {
    const { container } = renderPagination({ page: 1 });
    const prevBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Prev'));
    expect(prevBtn.disabled).toBe(true);
  });

  test('Next button is disabled on last page', () => {
    const { container } = renderPagination({ page: 5, totalPages: 5 });
    const nextBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Next'));
    expect(nextBtn.disabled).toBe(true);
  });

  test('Prev button is enabled on page > 1', () => {
    const { container } = renderPagination({ page: 3 });
    const prevBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Prev'));
    expect(prevBtn.disabled).toBe(false);
  });

  test('Next button is enabled on page < totalPages', () => {
    const { container } = renderPagination({ page: 3, totalPages: 5 });
    const nextBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Next'));
    expect(nextBtn.disabled).toBe(false);
  });

  test('clicking Prev calls onPageChange with page - 1', () => {
    const onPageChange = jest.fn();
    const { container } = renderPagination({ page: 3, onPageChange });
    const prevBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Prev'));
    fireEvent.click(prevBtn);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  test('clicking Next calls onPageChange with page + 1', () => {
    const onPageChange = jest.fn();
    const { container } = renderPagination({ page: 3, onPageChange });
    const nextBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Next'));
    fireEvent.click(nextBtn);
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  test('renders page size select with options', () => {
    const { container } = renderPagination();
    const select = container.querySelector('select');
    expect(select).toBeTruthy();
    expect(select.querySelectorAll('option').length).toBe(4); // [5, 10, 15, 20]
  });

  test('page size select shows current value', () => {
    const { container } = renderPagination({ pageSize: 15 });
    const select = container.querySelector('select');
    expect(select.value).toBe('15');
  });

  test('changing page size calls onSizeChange', () => {
    const onSizeChange = jest.fn();
    const { container } = renderPagination({ onSizeChange });
    const select = container.querySelector('select');
    fireEvent.change(select, { target: { value: '20' } });
    expect(onSizeChange).toHaveBeenCalledWith(20);
  });

  test('custom pageSizeOptions are rendered', () => {
    const { container } = renderPagination({ pageSizeOptions: [25, 50, 100] });
    const options = container.querySelectorAll('option');
    expect(options.length).toBe(3);
    expect(options[0].value).toBe('25');
    expect(options[2].value).toBe('100');
  });

  test('shows totalItems count when provided', () => {
    const { container } = renderPagination({ totalItems: 42 });
    expect(container.textContent).toContain('42 items');
  });

  test('does not show totalItems when not provided', () => {
    const { container } = renderPagination();
    expect(container.textContent).not.toContain('items');
  });

  test('returns null when totalPages <= 1 and no onSizeChange', () => {
    const { container } = renderPagination({ totalPages: 1, onSizeChange: undefined });
    expect(container.innerHTML).toBe('');
  });

  test('renders when totalPages is 1 but onSizeChange is provided', () => {
    const { container } = renderPagination({ totalPages: 1, onSizeChange: jest.fn() });
    expect(container.innerHTML).not.toBe('');
  });

  test('does not render buttons when onPageChange is not provided', () => {
    const { container } = renderPagination({ onPageChange: undefined, totalPages: 3 });
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(0);
  });

  test('does not render select when onSizeChange is not provided', () => {
    const { container } = renderPagination({ onSizeChange: undefined, totalPages: 3 });
    expect(container.querySelector('select')).toBeNull();
  });

  test('select has aria-label for accessibility', () => {
    const { container } = renderPagination();
    const select = container.querySelector('select');
    expect(select.getAttribute('aria-label')).toBe('Rows per page');
  });

  test('dark mode applies different background style', () => {
    const { container } = renderPagination({ dark: true });
    const select = container.querySelector('select');
    expect(select.style.background).toContain('rgb');
  });
});
