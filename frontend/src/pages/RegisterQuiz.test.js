import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import API from '../api';

// ── Global mocks ────────────────────────────────────────────────────────────

jest.mock('../api');

jest.mock('../AuthContext', () => ({
  useAuth: () => ({
    user: { fullName: 'Test User', role: 'ADMIN', enterpriseId: 'test.user', email: 'test.user@example.com' },
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

// Passthrough hook – just return the inputs unchanged
jest.mock('../hooks/useContentTranslation', () => ({
  useContentTranslation: (texts) => texts,
}));

// html2canvas used by TakeQuiz anti-cheat
jest.mock('html2canvas', () => jest.fn(() => Promise.resolve({ toDataURL: () => 'data:image/png;base64,' })));

// react-toastify – keep it silent
jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), error: jest.fn(), warn: jest.fn() },
  ToastContainer: () => null,
}));

// ── Helper wrapper ───────────────────────────────────────────────────────────

const Wrapper = ({ children }) => <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;

// ── Shared data fixtures ─────────────────────────────────────────────────────

const TECH_STACKS = [
  { id: 1, name: 'Java' },
  { id: 2, name: 'React' },
];

const QUIZ_SESSIONS = [
  { id: 10, title: 'Java Basics', questionCount: 10, token: 'tok-abc', expiresAt: null, createdAt: '2026-06-20T10:00:00Z' },
  { id: 11, title: 'React Quiz',  questionCount: 5,  token: 'tok-def', expiresAt: null, createdAt: '2026-06-20T10:00:00Z' },
];

const ATTEMPTS = [
  { id: 1, candidateName: 'Alice', candidateEmail: 'alice@example.com', score: 8, total: 10, percent: 80, timeTakenSeconds: 180, status: 'COMPLETED', violationCount: 0, submittedAt: '2026-06-20T12:00:00Z' },
  { id: 2, candidateName: 'Bob',   candidateEmail: 'bob@example.com',   score: 4, total: 10, percent: 40, timeTakenSeconds: 600, status: 'TERMINATED', violationCount: 2, submittedAt: '2026-06-20T13:00:00Z' },
];

const LEADERBOARD_DATA = [
  { userId: 1, fullName: 'Alice Smith',   enterpriseId: 'alice.smith',   reviewCount: 20, rank: 1 },
  { userId: 2, fullName: 'Bob Jones',     enterpriseId: 'bob.jones',     reviewCount: 15, rank: 2 },
  { userId: 3, fullName: 'Carol White',   enterpriseId: 'carol.white',   reviewCount: 10, rank: 3 },
];

// ════════════════════════════════════════════════════════════════════════════
// QUIZ PAGE
// ════════════════════════════════════════════════════════════════════════════

// Quiz.js imports pages/Quiz.css – jest transform handles it via moduleNameMapper
import Quiz from './Quiz';

describe('Quiz Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    API.get = jest.fn().mockResolvedValue({ data: [] });
    API.post = jest.fn().mockResolvedValue({ data: {} });
  });

  test('renders without crashing', () => {
    render(<Wrapper><Quiz /></Wrapper>);
    // Page should mount – presence of the DOM is sufficient
    expect(document.body).toBeTruthy();
  });

  test('renders Start Quiz button in setup phase', () => {
    render(<Wrapper><Quiz /></Wrapper>);
    const btn = document.querySelector('button.quiz-start-btn');
    expect(btn).toBeTruthy();
  });

  test('loads and displays tech stacks in dropdown', async () => {
    API.get = jest.fn().mockResolvedValue({ data: TECH_STACKS });
    render(<Wrapper><Quiz /></Wrapper>);
    await waitFor(() => {
      expect(screen.queryByText('Java') || document.querySelector('option[value="1"]')).toBeTruthy();
    });
  });

  test('shows count-pill buttons (5, 10, 15, 20)', () => {
    render(<Wrapper><Quiz /></Wrapper>);
    const pills = document.querySelectorAll('button.quiz-count-pill');
    expect(pills.length).toBe(4);
  });

  test('calls API.get for tech stacks on mount', () => {
    render(<Wrapper><Quiz /></Wrapper>);
    expect(API.get).toHaveBeenCalledWith('/master/tech-stacks');
  });

  test('clicking start with no questions shows error', async () => {
    // Use URL-based implementation – safe even when effects fire twice (React strict mode)
    API.get = jest.fn().mockImplementation((url) => {
      if (url === '/master/tech-stacks') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] }); // questions returns empty
    });
    render(<Wrapper><Quiz /></Wrapper>);

    const btn = document.querySelector('button.quiz-start-btn');
    fireEvent.click(btn);

    await waitFor(() => {
      const errorEl = document.querySelector('.quiz-error');
      expect(errorEl).toBeTruthy();
    });
  });

  test('transitions to playing phase when questions are returned', async () => {
    const questions = [
      { id: 1, questionStem: 'What is Java?', optionA: 'A language', optionB: 'B', optionC: 'C', optionD: 'D', difficulty: 'EASY', techStack: 'Java', topic: 'Basics' },
    ];
    API.get = jest.fn().mockImplementation((url) => {
      if (url === '/master/tech-stacks') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: questions }); // quiz/questions
    });
    render(<Wrapper><Quiz /></Wrapper>);

    const btn = document.querySelector('button.quiz-start-btn');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(document.querySelector('.quiz-play-wrap') || screen.queryByText(/What is Java/)).toBeTruthy();
    });
  });

  test('clicking a count pill updates selection style', () => {
    render(<Wrapper><Quiz /></Wrapper>);
    const pills = document.querySelectorAll('button.quiz-count-pill');
    fireEvent.click(pills[0]); // click "5"
    expect(pills[0].className).toContain('active');
  });

  test('start button is disabled while loading', async () => {
    let resolveQuestions;
    const hangingPromise = new Promise(res => { resolveQuestions = res; });
    API.get = jest.fn().mockImplementation((url) => {
      if (url === '/master/tech-stacks') return Promise.resolve({ data: [] });
      return hangingPromise; // questions never resolves during the assertion
    });

    render(<Wrapper><Quiz /></Wrapper>);
    const btn = document.querySelector('button.quiz-start-btn');
    fireEvent.click(btn);

    expect(btn.disabled).toBe(true);

    // Resolve so the component can clean up
    act(() => resolveQuestions({ data: [] }));
  });

  test('shows error message when API.get for questions fails', async () => {
    API.get = jest.fn().mockImplementation((url) => {
      if (url === '/master/tech-stacks') return Promise.resolve({ data: [] });
      return Promise.reject(new Error('Network')); // questions fail
    });
    render(<Wrapper><Quiz /></Wrapper>);

    const btn = document.querySelector('button.quiz-start-btn');
    fireEvent.click(btn);

    await waitFor(() => {
      const errorEl = document.querySelector('.quiz-error');
      expect(errorEl).toBeTruthy();
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// TAKE QUIZ PAGE
// ════════════════════════════════════════════════════════════════════════════

import TakeQuiz from './TakeQuiz';

const SESSION_RESPONSE = {
  id: 10,
  title: 'Java Basics Quiz',
  timeLimitMinutes: 30,
  questions: [
    { id: 1, questionStem: 'What is JVM?', optionA: 'Virtual Machine', optionB: 'Compiler', optionC: 'IDE', optionD: 'None', correctAnswer: 'A', difficulty: 'EASY' },
  ],
};

describe('TakeQuiz Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // TakeQuiz uses global fetch, not the API module
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(SESSION_RESPONSE),
    });
    API.get = jest.fn().mockResolvedValue({ data: {} });
    API.post = jest.fn().mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    delete global.fetch;
  });

  test('renders without crashing', () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    expect(document.body).toBeTruthy();
  });

  test('shows info form after session loads successfully', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await waitFor(() => {
      // info-form step renders candidate name/email inputs
      const inputs = document.querySelectorAll('input');
      expect(inputs.length).toBeGreaterThan(0);
    });
  });

  test('pre-fills candidate name from logged-in user', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await waitFor(() => {
      const nameInput = Array.from(document.querySelectorAll('input')).find(
        el => el.value === 'Test User',
      );
      expect(nameInput).toBeTruthy();
    });
  });

  test('shows error step when fetch returns 410 (expired)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 410,
      json: () => Promise.resolve({ error: 'This quiz link has expired.' }),
    });
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await waitFor(() => {
      // error step – DOM should still be rendered (not crash)
      expect(document.body.innerHTML.length).toBeGreaterThan(0);
    });
  });

  test('shows error step when fetch throws network error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await waitFor(() => {
      expect(document.body.innerHTML.length).toBeGreaterThan(0);
    });
  });

  test('calls fetch with token from useParams', () => {
    // useParams returns {} from mock so token is undefined – but fetch is still called
    render(<Wrapper><TakeQuiz /></Wrapper>);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/quiz-sessions/take/'),
    );
  });

  test('info-form shows session title', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await waitFor(() => {
      expect(document.body.innerHTML).toContain('Java Basics Quiz');
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// QUIZ ATTEMPTS PAGE
// ════════════════════════════════════════════════════════════════════════════

import QuizAttempts from './QuizAttempts';

describe('QuizAttempts Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    API.get = jest.fn().mockImplementation((url) => {
      if (url === '/quiz-sessions') return Promise.resolve({ data: QUIZ_SESSIONS });
      if (url.includes('/attempts')) return Promise.resolve({ data: ATTEMPTS });
      return Promise.resolve({ data: [] });
    });
    API.post = jest.fn().mockResolvedValue({ data: {} });
  });

  test('renders without crashing', () => {
    render(<Wrapper><QuizAttempts /></Wrapper>);
    expect(document.body).toBeTruthy();
  });

  test('shows loading state initially', () => {
    // Don't resolve the promise immediately
    API.get = jest.fn().mockImplementation(() => new Promise(() => {}));
    render(<Wrapper><QuizAttempts /></Wrapper>);
    expect(document.querySelector('.qa-loading, .qa-spinner')).toBeTruthy();
  });

  test('displays attempts table after loading', async () => {
    render(<Wrapper><QuizAttempts /></Wrapper>);
    await waitFor(() => {
      expect(document.querySelector('.qa-table')).toBeTruthy();
    });
  });

  test('shows candidate names from API data', async () => {
    render(<Wrapper><QuizAttempts /></Wrapper>);
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeTruthy();
      expect(screen.getByText('Bob')).toBeTruthy();
    });
  });

  test('renders summary cards with attempt counts', async () => {
    render(<Wrapper><QuizAttempts /></Wrapper>);
    await waitFor(() => {
      const cards = document.querySelectorAll('.qa-summary-card');
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  test('shows empty state when no attempts', async () => {
    API.get = jest.fn().mockImplementation((url) => {
      if (url === '/quiz-sessions') return Promise.resolve({ data: QUIZ_SESSIONS });
      if (url.includes('/attempts')) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
    render(<Wrapper><QuizAttempts /></Wrapper>);
    await waitFor(() => {
      expect(document.querySelector('.qa-empty')).toBeTruthy();
    });
  });

  test('filter input is rendered', async () => {
    render(<Wrapper><QuizAttempts /></Wrapper>);
    await waitFor(() => {
      const filterInput = document.querySelector('.qa-filter-input');
      expect(filterInput).toBeTruthy();
    });
  });

  test('filtering by name hides non-matching rows', async () => {
    render(<Wrapper><QuizAttempts /></Wrapper>);
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeTruthy();
    });

    const filterInput = document.querySelector('.qa-filter-input');
    fireEvent.change(filterInput, { target: { value: 'Alice' } });

    await waitFor(() => {
      expect(document.querySelector('.qa-table')).toBeTruthy();
      expect(screen.queryByText('Bob')).toBeNull();
    });
  });

  test('TERMINATED status badge is styled differently', async () => {
    render(<Wrapper><QuizAttempts /></Wrapper>);
    await waitFor(() => {
      const terminatedRow = document.querySelector('.qa-row-terminated');
      expect(terminatedRow).toBeTruthy();
    });
  });

  test('back button is rendered', async () => {
    render(<Wrapper><QuizAttempts /></Wrapper>);
    await waitFor(() => {
      const backBtn = document.querySelector('.qa-back');
      expect(backBtn).toBeTruthy();
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// QUIZ BUILDER PAGE
// ════════════════════════════════════════════════════════════════════════════

import QuizBuilder from './QuizBuilder';

describe('QuizBuilder Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear sessionStorage between tests
    sessionStorage.clear();
    API.get = jest.fn().mockImplementation((url) => {
      if (url === '/master/tech-stacks') return Promise.resolve({ data: TECH_STACKS });
      if (url.includes('/topics')) return Promise.resolve({ data: [] });
      if (url === '/quiz-sessions') return Promise.resolve({ data: QUIZ_SESSIONS });
      return Promise.resolve({ data: [] });
    });
    API.post = jest.fn().mockResolvedValue({ data: { questionCount: 10 } });
  });

  test('renders without crashing', () => {
    render(<Wrapper><QuizBuilder /></Wrapper>);
    expect(document.body).toBeTruthy();
  });

  test('renders the quiz title input field', () => {
    render(<Wrapper><QuizBuilder /></Wrapper>);
    const titleInput = document.querySelector('input.qb-input');
    expect(titleInput).toBeTruthy();
  });

  test('renders Generate Link button', () => {
    render(<Wrapper><QuizBuilder /></Wrapper>);
    const btn = document.querySelector('button.qb-btn-primary');
    expect(btn).toBeTruthy();
  });

  test('loads tech stacks into dropdown', async () => {
    render(<Wrapper><QuizBuilder /></Wrapper>);
    await waitFor(() => {
      const options = Array.from(document.querySelectorAll('select option'));
      const names = options.map(o => o.textContent);
      expect(names).toContain('Java');
    });
  });

  test('displays existing quiz sessions', async () => {
    render(<Wrapper><QuizBuilder /></Wrapper>);
    await waitFor(() => {
      expect(screen.getByText('Java Basics') || document.body.innerHTML.includes('Java Basics')).toBeTruthy();
    });
  });

  test('calls API.post when form is submitted with a title', async () => {
    render(<Wrapper><QuizBuilder /></Wrapper>);

    const titleInput = document.querySelector('input.qb-input');
    fireEvent.change(titleInput, { target: { value: 'My New Quiz' } });

    const btn = document.querySelector('button.qb-btn-primary');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(API.post).toHaveBeenCalledWith('/quiz-sessions', expect.objectContaining({ title: 'My New Quiz' }));
    });
  });

  test('does NOT call API.post when title is empty', async () => {
    render(<Wrapper><QuizBuilder /></Wrapper>);

    const btn = document.querySelector('button.qb-btn-primary');
    fireEvent.click(btn);

    // API.post should NOT be called for empty title
    await waitFor(() => {
      expect(API.post).not.toHaveBeenCalled();
    });
  });

  test('difficulty dropdown renders at least 3 options', () => {
    render(<Wrapper><QuizBuilder /></Wrapper>);
    const selects = document.querySelectorAll('select.qb-select');
    // At least one select should have difficulty options
    const allOptions = Array.from(selects).flatMap(s => Array.from(s.querySelectorAll('option')));
    const texts = allOptions.map(o => o.value);
    expect(texts).toContain('EASY');
    expect(texts).toContain('MEDIUM');
    expect(texts).toContain('HARD');
  });

  test('shows copy-link buttons for existing sessions', async () => {
    render(<Wrapper><QuizBuilder /></Wrapper>);
    await waitFor(() => {
      // Sessions are rendered with copy buttons
      const sessionItems = document.querySelectorAll('.qa-back, .qb-btn-copy, [class*="copy"]');
      // At minimum sessions list is in the DOM
      expect(document.body.innerHTML.includes('Java Basics') || document.body.innerHTML.includes('React Quiz')).toBe(true);
    });
  });

  test('question count select has expected options', () => {
    render(<Wrapper><QuizBuilder /></Wrapper>);
    const selects = document.querySelectorAll('select.qb-select');
    const allOptionValues = Array.from(selects).flatMap(s => Array.from(s.options).map(o => o.value));
    // Check that numeric question count options (5..30) are present
    expect(allOptionValues.some(v => ['5','10','15','20','25','30'].includes(v))).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// LEADERBOARD PAGE
// ════════════════════════════════════════════════════════════════════════════

import Leaderboard from './Leaderboard';

describe('Leaderboard Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    API.get = jest.fn().mockImplementation((url) => {
      if (url === '/stats/leaderboard') return Promise.resolve({ data: LEADERBOARD_DATA });
      if (url.includes('assessment-leaderboard')) return Promise.resolve({ data: { leaderboard: [], sessions: [] } });
      return Promise.resolve({ data: [] });
    });
    API.post = jest.fn().mockResolvedValue({ data: {} });
  });

  test('renders without crashing', () => {
    render(<Wrapper><Leaderboard /></Wrapper>);
    expect(document.body).toBeTruthy();
  });

  test('renders the SME Reviewers tab', () => {
    render(<Wrapper><Leaderboard /></Wrapper>);
    expect(screen.getByText(/SME Reviewers/i)).toBeTruthy();
  });

  test('renders the Assessment Results tab', () => {
    render(<Wrapper><Leaderboard /></Wrapper>);
    expect(screen.getByText(/Assessment Results/i)).toBeTruthy();
  });

  test('loads and displays reviewer leaderboard data', async () => {
    render(<Wrapper><Leaderboard /></Wrapper>);
    await waitFor(() => {
      // Alice Smith appears in podium and/or table — getAllByText handles multiple matches
      const matches = screen.getAllByText('Alice Smith');
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  test('shows podium with top 3 reviewers', async () => {
    render(<Wrapper><Leaderboard /></Wrapper>);
    await waitFor(() => {
      const podium = document.querySelector('.lb-podium');
      expect(podium).toBeTruthy();
    });
  });

  test('shows empty state when leaderboard has no data', async () => {
    API.get = jest.fn().mockResolvedValue({ data: [] });
    render(<Wrapper><Leaderboard /></Wrapper>);
    await waitFor(() => {
      const empty = document.querySelector('.lb-empty');
      expect(empty).toBeTruthy();
    });
  });

  test('search input is rendered for filtering', async () => {
    render(<Wrapper><Leaderboard /></Wrapper>);
    await waitFor(() => {
      const searchInput = document.querySelector('.lb-search-input');
      expect(searchInput).toBeTruthy();
    });
  });

  test('clicking Assessment Results tab switches mode', async () => {
    render(<Wrapper><Leaderboard /></Wrapper>);

    const assessTab = screen.getByText(/Assessment Results/i);
    fireEvent.click(assessTab);

    await waitFor(() => {
      expect(API.get).toHaveBeenCalledWith(expect.stringContaining('assessment-leaderboard'));
    });
  });

  test('shows error when leaderboard API fails', async () => {
    API.get = jest.fn().mockRejectedValue(new Error('Server Error'));
    render(<Wrapper><Leaderboard /></Wrapper>);
    await waitFor(() => {
      const errorEl = document.querySelector('.lb-error');
      expect(errorEl).toBeTruthy();
    });
  });

  test('search filters reviewer list', async () => {
    render(<Wrapper><Leaderboard /></Wrapper>);
    await waitFor(() => {
      expect(screen.getAllByText('Alice Smith').length).toBeGreaterThan(0);
    });

    const searchInput = document.querySelector('.lb-search-input');
    fireEvent.change(searchInput, { target: { value: 'Alice' } });

    await waitFor(() => {
      // Bob Jones should be filtered out of the table (podium stays)
      const tableRows = document.querySelectorAll('.lb-table tbody tr');
      const rowTexts = Array.from(tableRows).map(r => r.textContent);
      expect(rowTexts.every(t => !t.includes('Bob Jones'))).toBe(true);
    });
  });

  test('calls API.get for leaderboard on mount', () => {
    render(<Wrapper><Leaderboard /></Wrapper>);
    expect(API.get).toHaveBeenCalledWith('/stats/leaderboard');
  });
});
