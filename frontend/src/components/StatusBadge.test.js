/**
 * StatusBadge.test.js — Tests for StatusBadge component
 */
import React from 'react';
import { render } from '@testing-library/react';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'en', changeLanguage: jest.fn() } }),
}));

const StatusBadge = require('./StatusBadge').default;

describe('StatusBadge', () => {
  test('renders DRAFT status with correct label key', () => {
    const { container } = render(<StatusBadge status="DRAFT" />);
    expect(container.textContent).toContain('common.draft');
  });

  test('renders APPROVED status with correct label key', () => {
    const { container } = render(<StatusBadge status="APPROVED" />);
    expect(container.textContent).toContain('common.approved');
  });

  test('renders REJECTED status with correct label key', () => {
    const { container } = render(<StatusBadge status="REJECTED" />);
    expect(container.textContent).toContain('common.rejected');
  });

  test('renders UNDER_REVIEW status with correct label key', () => {
    const { container } = render(<StatusBadge status="UNDER_REVIEW" />);
    expect(container.textContent).toContain('common.inReview');
  });

  test('renders READY_FOR_REVIEW status with correct label key', () => {
    const { container } = render(<StatusBadge status="READY_FOR_REVIEW" />);
    expect(container.textContent).toContain('common.readyForReview');
  });

  test('renders unknown status as raw text', () => {
    const { container } = render(<StatusBadge status="UNKNOWN_STATUS" />);
    expect(container.textContent).toContain('UNKNOWN_STATUS');
  });

  test('renders with dot indicator element', () => {
    const { container } = render(<StatusBadge status="APPROVED" />);
    const spans = container.querySelectorAll('span');
    expect(spans.length).toBeGreaterThanOrEqual(2); // outer + dot + text
  });

  test('renders with pill-like styling (border-radius)', () => {
    const { container } = render(<StatusBadge status="DRAFT" />);
    const badge = container.firstChild;
    expect(badge.style.borderRadius).toBe('20px');
  });

  test('APPROVED has green color scheme', () => {
    const { container } = render(<StatusBadge status="APPROVED" />);
    const badge = container.firstChild;
    expect(badge.style.color).toBe('rgb(6, 95, 70)');
  });

  test('REJECTED has red color scheme', () => {
    const { container } = render(<StatusBadge status="REJECTED" />);
    const badge = container.firstChild;
    expect(badge.style.color).toBe('rgb(159, 18, 57)');
  });

  test('DRAFT has gray color scheme', () => {
    const { container } = render(<StatusBadge status="DRAFT" />);
    const badge = container.firstChild;
    expect(badge.style.color).toBe('rgb(75, 85, 99)');
  });

  test('UNDER_REVIEW has amber color scheme', () => {
    const { container } = render(<StatusBadge status="UNDER_REVIEW" />);
    const badge = container.firstChild;
    expect(badge.style.color).toBe('rgb(180, 83, 9)');
  });

  test('renders inline-flex display', () => {
    const { container } = render(<StatusBadge status="DRAFT" />);
    const badge = container.firstChild;
    expect(badge.style.display).toBe('inline-flex');
  });
});
