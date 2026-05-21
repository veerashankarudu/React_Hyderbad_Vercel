import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import API from '../api';

// --- Module Mocks (hoisted by babel-jest) ---
jest.mock('../api');

jest.mock('../AuthContext', () => ({
  useAuth: () => ({
    user: { fullName: 'Test User', role: 'SME', enterpriseId: 'test.user' },
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

// Return the same texts so components render their raw (English) content
jest.mock('../hooks/useContentTranslation', () => ({
  useContentTranslation: (texts) => texts,
}));

// Lightweight stub components so we don't drag in their full dependency trees
jest.mock('../components/Navbar', () => () => <div data-testid="navbar" />);
jest.mock('../components/StatusBadge', () => ({ status }) => (
  <span data-testid="status-badge">{status}</span>
));
jest.mock('../components/SortableTh', () => ({ label, colKey, onSort }) => (
  <th onClick={() => onSort && onSort(colKey)}>{label}</th>
));
jest.mock('../components/TablePagination', () => () => (
  <div data-testid="table-pagination" />
));
jest.mock('../components/AssignReviewerModal', () => () => (
  <div data-testid="assign-reviewer-modal" />
));

// Pages under test
import MyQuestions from './MyQuestions';
import QuestionBank from './QuestionBank';
import KanbanBoard from './KanbanBoard';
import PendingReviews from './PendingReviews';

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------
const mockMcqs = [
  {
    id: 1,
    questionStem: 'What is dependency injection?',
    techStackName: 'Spring Boot',
    techStackId: 1,
    topicName: 'IoC Container',
    difficulty: 'MEDIUM',
    status: 'DRAFT',
    creatorFullName: 'John Doe',
    creatorEnterpriseId: 'john.doe',
    reviewerFullName: null,
    optionA: 'A design pattern',
    optionB: 'A database concept',
    optionC: 'A network protocol',
    optionD: 'A testing framework',
    correctAnswer: 'A',
    createdAt: '2024-01-15T10:00:00Z',
    aiScore: 75,
  },
  {
    id: 2,
    questionStem: 'What is the CAP theorem?',
    techStackName: 'Distributed Systems',
    techStackId: 2,
    topicName: 'Consistency',
    difficulty: 'HARD',
    status: 'READY_FOR_REVIEW',
    creatorFullName: 'Jane Smith',
    creatorEnterpriseId: 'jane.smith',
    reviewerFullName: 'Bob Wilson',
    optionA: 'Consistency, Availability, Partition tolerance',
    optionB: 'Cache, API, Protocol',
    optionC: 'Create, Alter, Post',
    optionD: 'Component, Action, Property',
    correctAnswer: 'A',
    createdAt: '2024-01-10T10:00:00Z',
    aiScore: 40,
  },
];

const mockTechStacks = [
  { id: 1, name: 'Spring Boot' },
  { id: 2, name: 'React' },
];

const Wrapper = ({ children }) => (
  <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
);

// ===========================================================================
// MyQuestions
// ===========================================================================
describe('MyQuestions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    API.get = jest.fn().mockResolvedValue({ data: [] });
    API.post = jest.fn().mockResolvedValue({ data: {} });
  });

  test('renders without crash', () => {
    render(<Wrapper><MyQuestions /></Wrapper>);
    expect(screen.getByTestId('navbar')).toBeTruthy();
  });

  test('calls API.get(/mcqs) on mount', async () => {
    render(<Wrapper><MyQuestions /></Wrapper>);
    await waitFor(() => expect(API.get).toHaveBeenCalledWith('/mcqs'));
  });

  test('shows loading state before data arrives', () => {
    // Prevent the promise from resolving during this synchronous check
    API.get = jest.fn(() => new Promise(() => {}));
    render(<Wrapper><MyQuestions /></Wrapper>);
    expect(document.querySelector('.loading')).toBeTruthy();
  });

  test('shows empty state when API returns an empty array', async () => {
    API.get = jest.fn().mockResolvedValue({ data: [] });
    render(<Wrapper><MyQuestions /></Wrapper>);
    await waitFor(() =>
      expect(document.querySelector('.empty-state')).toBeTruthy()
    );
  });

  test('displays question stems from API response', async () => {
    API.get = jest.fn().mockResolvedValue({ data: mockMcqs });
    render(<Wrapper><MyQuestions /></Wrapper>);
    await waitFor(() =>
      expect(screen.getByText('What is dependency injection?')).toBeTruthy()
    );
  });

  test('renders the Add Question primary button', async () => {
    render(<Wrapper><MyQuestions /></Wrapper>);
    await waitFor(() => expect(API.get).toHaveBeenCalled());
    const addBtn = document.querySelector('button.btn-primary');
    expect(addBtn).toBeTruthy();
  });

  test('renders status filter tabs (All, Draft, …)', async () => {
    API.get = jest.fn().mockResolvedValue({ data: mockMcqs });
    render(<Wrapper><MyQuestions /></Wrapper>);
    await waitFor(() =>
      expect(document.querySelectorAll('.status-tab').length).toBeGreaterThan(0)
    );
  });

  test('handles API error gracefully without crashing', async () => {
    API.get = jest.fn().mockRejectedValue(new Error('Network error'));
    expect(() => render(<Wrapper><MyQuestions /></Wrapper>)).not.toThrow();
    await waitFor(() => expect(API.get).toHaveBeenCalled());
    // After error, empty state should show (loading ends, allMcqs stays [])
    await waitFor(() =>
      expect(document.querySelector('.empty-state')).toBeTruthy()
    );
  });

  test('shows both MCQ rows in the table when data is loaded', async () => {
    API.get = jest.fn().mockResolvedValue({ data: mockMcqs });
    render(<Wrapper><MyQuestions /></Wrapper>);
    await waitFor(() =>
      expect(screen.getByText('What is the CAP theorem?')).toBeTruthy()
    );
    expect(document.querySelectorAll('tbody tr').length).toBeGreaterThanOrEqual(2);
  });
});

// ===========================================================================
// QuestionBank
// ===========================================================================
describe('QuestionBank', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    API.get = jest.fn().mockResolvedValue({ data: [] });
    API.post = jest.fn().mockResolvedValue({ data: {} });
    // window.confirm guard – prevent accidental delete dialogs
    jest.spyOn(window, 'confirm').mockReturnValue(false);
  });

  afterEach(() => {
    window.confirm.mockRestore && window.confirm.mockRestore();
  });

  test('renders without crash', () => {
    render(<Wrapper><QuestionBank /></Wrapper>);
    expect(screen.getByTestId('navbar')).toBeTruthy();
  });

  test('fetches /master/tech-stacks and /admin/mcqs on mount', async () => {
    render(<Wrapper><QuestionBank /></Wrapper>);
    await waitFor(() => {
      expect(API.get).toHaveBeenCalledWith('/master/tech-stacks');
      expect(API.get).toHaveBeenCalledWith(
        '/admin/mcqs',
        expect.objectContaining({ params: expect.any(Object) })
      );
    });
  });

  test('shows loading state before data arrives', () => {
    API.get = jest.fn(() => new Promise(() => {}));
    render(<Wrapper><QuestionBank /></Wrapper>);
    expect(document.querySelector('.loading')).toBeTruthy();
  });

  test('shows empty state when API returns no MCQs', async () => {
    API.get = jest.fn().mockResolvedValue({ data: [] });
    render(<Wrapper><QuestionBank /></Wrapper>);
    await waitFor(() =>
      expect(document.querySelector('.empty-state')).toBeTruthy()
    );
  });

  test('displays MCQ question stems from API response', async () => {
    API.get = jest.fn((url) => {
      if (url === '/master/tech-stacks')
        return Promise.resolve({ data: mockTechStacks });
      return Promise.resolve({ data: mockMcqs });
    });
    render(<Wrapper><QuestionBank /></Wrapper>);
    await waitFor(() =>
      expect(screen.getByText('What is dependency injection?')).toBeTruthy()
    );
  });

  test('renders filter selects and search input', async () => {
    render(<Wrapper><QuestionBank /></Wrapper>);
    await waitFor(() => expect(API.get).toHaveBeenCalled());
    expect(document.querySelectorAll('select').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('input[type="text"]').length).toBeGreaterThan(0);
  });

  test('renders stat pills (Total, Approved, Under Review, etc.)', async () => {
    API.get = jest.fn((url) => {
      if (url === '/master/tech-stacks')
        return Promise.resolve({ data: mockTechStacks });
      return Promise.resolve({ data: mockMcqs });
    });
    render(<Wrapper><QuestionBank /></Wrapper>);
    await waitFor(() =>
      expect(document.querySelectorAll('.qb-stat-pill').length).toBeGreaterThan(0)
    );
  });

  test('handles API error on /admin/mcqs gracefully without crashing', async () => {
    // tech-stacks must succeed (its .then has no .catch); only mcqs rejects
    API.get = jest.fn((url) => {
      if (url === '/master/tech-stacks') return Promise.resolve({ data: [] });
      return Promise.reject(new Error('Server error'));
    });
    expect(() => render(<Wrapper><QuestionBank /></Wrapper>)).not.toThrow();
    await waitFor(() => expect(API.get).toHaveBeenCalled());
    // fetchMcqs has a try/catch, so component stays mounted with empty list
    await waitFor(() =>
      expect(document.querySelector('.empty-state')).toBeTruthy()
    );
  });

  test('filters MCQs by search text (client-side)', async () => {
    API.get = jest.fn((url) => {
      if (url === '/master/tech-stacks')
        return Promise.resolve({ data: mockTechStacks });
      return Promise.resolve({ data: mockMcqs });
    });
    render(<Wrapper><QuestionBank /></Wrapper>);
    await waitFor(() =>
      expect(screen.getByText('What is dependency injection?')).toBeTruthy()
    );
    // type a search term that matches only 1 of the 2 MCQs
    const searchInput = document.querySelector('.filter-bar input[type="text"]');
    fireEvent.change(searchInput, { target: { value: 'CAP' } });
    expect(screen.queryByText('What is dependency injection?')).toBeNull();
    expect(screen.getByText('What is the CAP theorem?')).toBeTruthy();
  });
});

// ===========================================================================
// KanbanBoard
// ===========================================================================
describe('KanbanBoard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    API.get = jest.fn().mockResolvedValue({ data: [] });
    API.post = jest.fn().mockResolvedValue({ data: {} });
  });

  test('renders without crash', () => {
    render(<Wrapper><KanbanBoard /></Wrapper>);
    expect(screen.getByTestId('navbar')).toBeTruthy();
  });

  test('shows loading state before data arrives', () => {
    API.get = jest.fn(() => new Promise(() => {}));
    render(<Wrapper><KanbanBoard /></Wrapper>);
    expect(document.querySelector('.kanban-loading')).toBeTruthy();
  });

  test('calls API.get(/mcqs) for SME role', async () => {
    render(<Wrapper><KanbanBoard /></Wrapper>);
    await waitFor(() => expect(API.get).toHaveBeenCalledWith('/mcqs'));
  });

  test('shows error message when MCQ fetch fails', async () => {
    API.get = jest.fn().mockRejectedValue(new Error('Network error'));
    render(<Wrapper><KanbanBoard /></Wrapper>);
    await waitFor(() =>
      expect(document.querySelector('.kanban-error')).toBeTruthy()
    );
    expect(document.querySelector('.kanban-error').textContent).toMatch(
      /Failed to load MCQs/
    );
  });

  test('renders all five kanban columns after data loads', async () => {
    API.get = jest.fn().mockResolvedValue({ data: mockMcqs });
    render(<Wrapper><KanbanBoard /></Wrapper>);
    await waitFor(() =>
      expect(document.querySelectorAll('.kanban-column').length).toBe(5)
    );
  });

  test('renders kanban stats bar with active/approved/rejected counts', async () => {
    API.get = jest.fn().mockResolvedValue({ data: mockMcqs });
    render(<Wrapper><KanbanBoard /></Wrapper>);
    await waitFor(() =>
      expect(document.querySelector('.kanban-stats-bar')).toBeTruthy()
    );
  });

  test('renders search input', async () => {
    render(<Wrapper><KanbanBoard /></Wrapper>);
    await waitFor(() => expect(API.get).toHaveBeenCalled());
    expect(document.querySelector('.kanban-search')).toBeTruthy();
  });

  test('filtering by search term does not crash the board', async () => {
    API.get = jest.fn().mockResolvedValue({ data: mockMcqs });
    render(<Wrapper><KanbanBoard /></Wrapper>);
    await waitFor(() =>
      expect(document.querySelectorAll('.kanban-column').length).toBe(5)
    );
    fireEvent.change(document.querySelector('.kanban-search'), {
      target: { value: 'dependency injection' },
    });
    expect(document.querySelector('.kanban-board')).toBeTruthy();
  });
});

// ===========================================================================
// PendingReviews
// ===========================================================================
describe('PendingReviews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    API.get = jest.fn().mockResolvedValue({ data: [] });
    API.post = jest.fn().mockResolvedValue({ data: {} });
  });

  test('renders without crash', () => {
    render(<Wrapper><PendingReviews /></Wrapper>);
    expect(screen.getByTestId('navbar')).toBeTruthy();
  });

  test('calls API.get for UNDER_REVIEW, APPROVED and REJECTED on mount', async () => {
    render(<Wrapper><PendingReviews /></Wrapper>);
    await waitFor(() => {
      expect(API.get).toHaveBeenCalledWith(
        '/reviews',
        expect.objectContaining({ params: { status: 'UNDER_REVIEW' } })
      );
      expect(API.get).toHaveBeenCalledWith(
        '/reviews',
        expect.objectContaining({ params: { status: 'APPROVED' } })
      );
      expect(API.get).toHaveBeenCalledWith(
        '/reviews',
        expect.objectContaining({ params: { status: 'REJECTED' } })
      );
    });
  });

  test('shows loading state before data arrives', () => {
    API.get = jest.fn(() => new Promise(() => {}));
    render(<Wrapper><PendingReviews /></Wrapper>);
    expect(document.querySelector('.loading')).toBeTruthy();
  });

  test('shows empty state (caught-up screen) when there are no pending reviews', async () => {
    API.get = jest.fn().mockResolvedValue({ data: [] });
    render(<Wrapper><PendingReviews /></Wrapper>);
    await waitFor(() =>
      expect(document.querySelector('.empty-state')).toBeTruthy()
    );
  });

  test('shows three review summary stats (pending / approved / rejected)', async () => {
    API.get = jest.fn((url, opts) => {
      const status = opts?.params?.status;
      if (status === 'UNDER_REVIEW') return Promise.resolve({ data: mockMcqs });
      if (status === 'APPROVED')
        return Promise.resolve({ data: [mockMcqs[0]] });
      return Promise.resolve({ data: [] });
    });
    render(<Wrapper><PendingReviews /></Wrapper>);
    await waitFor(() =>
      expect(document.querySelectorAll('.review-summary-stat').length).toBe(3)
    );
  });

  test('shows the reviews table when there are pending reviews', async () => {
    API.get = jest.fn((url, opts) => {
      const status = opts?.params?.status;
      if (status === 'UNDER_REVIEW') return Promise.resolve({ data: mockMcqs });
      return Promise.resolve({ data: [] });
    });
    render(<Wrapper><PendingReviews /></Wrapper>);
    await waitFor(() =>
      expect(document.querySelector('.data-table')).toBeTruthy()
    );
  });

  test('opens the review panel when a Review button is clicked', async () => {
    API.get = jest.fn((url, opts) => {
      const status = opts?.params?.status;
      if (status === 'UNDER_REVIEW') return Promise.resolve({ data: mockMcqs });
      return Promise.resolve({ data: [] });
    });
    render(<Wrapper><PendingReviews /></Wrapper>);
    await waitFor(() =>
      expect(document.querySelector('.btn-sm.btn-primary')).toBeTruthy()
    );
    fireEvent.click(document.querySelector('.btn-sm.btn-primary'));
    await waitFor(() =>
      expect(document.querySelector('.review-panel')).toBeTruthy()
    );
  });

  test('handles API error in all three Promise.allSettled calls without crashing', async () => {
    API.get = jest.fn().mockRejectedValue(new Error('Network error'));
    expect(() => render(<Wrapper><PendingReviews /></Wrapper>)).not.toThrow();
    // allSettled swallows individual failures; empty state should eventually render
    await waitFor(() =>
      expect(document.querySelector('.empty-state')).toBeTruthy()
    );
  });

  test('search input filters the displayed review rows', async () => {
    API.get = jest.fn((url, opts) => {
      const status = opts?.params?.status;
      if (status === 'UNDER_REVIEW') return Promise.resolve({ data: mockMcqs });
      return Promise.resolve({ data: [] });
    });
    render(<Wrapper><PendingReviews /></Wrapper>);
    await waitFor(() =>
      expect(screen.getByText('What is dependency injection?')).toBeTruthy()
    );
    const searchInput = document.querySelector('input[type="text"]');
    fireEvent.change(searchInput, { target: { value: 'CAP' } });
    expect(screen.queryByText('What is dependency injection?')).toBeNull();
    expect(screen.getByText('What is the CAP theorem?')).toBeTruthy();
  });
});
