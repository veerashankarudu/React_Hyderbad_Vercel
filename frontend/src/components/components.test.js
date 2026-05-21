import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';

import StatusBadge from '../components/StatusBadge';
import SortableTh from '../components/SortableTh';
import TablePagination from '../components/TablePagination';

// ─── Wrapper to provide i18n context ─────────────────────────────────────────

const Wrapper = ({ children }) => (
  <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
);

// ─── StatusBadge Tests ────────────────────────────────────────────────────────

describe('StatusBadge', () => {
  test('renders DRAFT badge', () => {
    render(<Wrapper><StatusBadge status="DRAFT" /></Wrapper>);
    expect(screen.getByText(/draft/i)).toBeInTheDocument();
  });

  test('renders APPROVED badge', () => {
    render(<Wrapper><StatusBadge status="APPROVED" /></Wrapper>);
    expect(screen.getByText(/approved/i)).toBeInTheDocument();
  });

  test('renders REJECTED badge', () => {
    render(<Wrapper><StatusBadge status="REJECTED" /></Wrapper>);
    expect(screen.getByText(/rejected/i)).toBeInTheDocument();
  });

  test('renders READY_FOR_REVIEW badge', () => {
    const { container } = render(<Wrapper><StatusBadge status="READY_FOR_REVIEW" /></Wrapper>);
    const badge = container.querySelector('span');
    expect(badge).toBeTruthy();
  });

  test('renders UNDER_REVIEW badge', () => {
    render(<Wrapper><StatusBadge status="UNDER_REVIEW" /></Wrapper>);
    expect(document.querySelector('span')).toBeTruthy();
  });

  test('renders unknown status as raw text', () => {
    render(<Wrapper><StatusBadge status="UNKNOWN_STATUS" /></Wrapper>);
    expect(screen.getByText('UNKNOWN_STATUS')).toBeInTheDocument();
  });

  test('APPROVED badge has green color styling', () => {
    const { container } = render(<Wrapper><StatusBadge status="APPROVED" /></Wrapper>);
    const span = container.querySelector('span');
    expect(span.style.color).toBe('rgb(6, 95, 70)');
  });

  test('REJECTED badge has red color styling', () => {
    const { container } = render(<Wrapper><StatusBadge status="REJECTED" /></Wrapper>);
    const span = container.querySelector('span');
    expect(span.style.color).toBe('rgb(159, 18, 57)');
  });

  test('DRAFT badge has grey color styling', () => {
    const { container } = render(<Wrapper><StatusBadge status="DRAFT" /></Wrapper>);
    const span = container.querySelector('span');
    expect(span.style.color).toBe('rgb(75, 85, 99)');
  });

  test('badge renders a dot indicator', () => {
    const { container } = render(<Wrapper><StatusBadge status="APPROVED" /></Wrapper>);
    const spans = container.querySelectorAll('span');
    expect(spans.length).toBeGreaterThanOrEqual(2); // outer + dot
  });
});

// ─── SortableTh Tests ─────────────────────────────────────────────────────────

describe('SortableTh', () => {
  const renderTh = (props) =>
    render(
      <table><thead><tr>
        <SortableTh colKey="name" label="Name" sortCol="name" sortDir="asc" onSort={props.onSort || jest.fn()} {...props} />
      </tr></thead></table>
    );

  test('renders label text', () => {
    renderTh({});
    expect(screen.getByText(/name/i)).toBeInTheDocument();
  });

  test('calls onSort with colKey on click', () => {
    const onSort = jest.fn();
    renderTh({ onSort });
    fireEvent.click(screen.getByRole('columnheader'));
    expect(onSort).toHaveBeenCalledWith('name');
  });

  test('shows asc arrow when active and asc', () => {
    renderTh({ sortCol: 'name', sortDir: 'asc' });
    expect(screen.getByTitle(/Z→A/i)).toBeInTheDocument();
  });

  test('shows desc arrow when active and desc', () => {
    renderTh({ sortCol: 'name', sortDir: 'desc' });
    expect(screen.getByTitle(/A→Z/i)).toBeInTheDocument();
  });

  test('shows sort hint when inactive', () => {
    renderTh({ sortCol: 'other', sortDir: 'asc' });
    expect(screen.getByTitle(/Sort by Name/i)).toBeInTheDocument();
  });

  test('renders children instead of label if provided', () => {
    render(
      <table><thead><tr>
        <SortableTh colKey="name" sortCol="" sortDir="asc" onSort={jest.fn()}>
          <span>Custom Label</span>
        </SortableTh>
      </tr></thead></table>
    );
    expect(screen.getByText('Custom Label')).toBeInTheDocument();
  });

  test('has pointer cursor style', () => {
    renderTh({});
    const th = screen.getByRole('columnheader');
    expect(th.style.cursor).toBe('pointer');
  });
});

// ─── TablePagination Tests ────────────────────────────────────────────────────

describe('TablePagination', () => {
  const defaultProps = {
    page: 1,
    totalPages: 5,
    pageSize: 10,
    onPageChange: jest.fn(),
    onSizeChange: jest.fn(),
    totalItems: 50,
  };

  test('renders pagination when totalPages > 1', () => {
    render(<Wrapper><TablePagination {...defaultProps} /></Wrapper>);
    expect(screen.getByRole('button', { name: /prev/i })).toBeInTheDocument();
  });

  test('returns null when totalPages is 1 and no onSizeChange', () => {
    const { container } = render(
      <Wrapper>
        <TablePagination {...defaultProps} totalPages={1} onSizeChange={undefined} />
      </Wrapper>
    );
    expect(container.firstChild).toBeNull();
  });

  test('disables Prev button on first page', () => {
    render(<Wrapper><TablePagination {...defaultProps} page={1} /></Wrapper>);
    const prev = screen.getByRole('button', { name: /prev/i });
    expect(prev).toBeDisabled();
  });

  test('disables Next button on last page', () => {
    render(<Wrapper><TablePagination {...defaultProps} page={5} totalPages={5} /></Wrapper>);
    const next = screen.getByRole('button', { name: /next/i });
    expect(next).toBeDisabled();
  });

  test('calls onPageChange with page+1 on Next click', () => {
    const onPageChange = jest.fn();
    render(<Wrapper><TablePagination {...defaultProps} page={2} onPageChange={onPageChange} /></Wrapper>);
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  test('calls onPageChange with page-1 on Prev click', () => {
    const onPageChange = jest.fn();
    render(<Wrapper><TablePagination {...defaultProps} page={3} onPageChange={onPageChange} /></Wrapper>);
    fireEvent.click(screen.getByRole('button', { name: /prev/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  test('shows current page number', () => {
    render(<Wrapper><TablePagination {...defaultProps} page={3} totalPages={5} /></Wrapper>);
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });

  test('shows total pages', () => {
    render(<Wrapper><TablePagination {...defaultProps} page={1} totalPages={5} /></Wrapper>);
    expect(screen.getByText(/Page 1 of 5/)).toBeInTheDocument();
  });
});
