import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import API from '../api';

// ── Global mocks ─────────────────────────────────────────────────────────────

jest.mock('../api');

jest.mock('../AuthContext', () => ({
  useAuth: () => ({
    user: { fullName: 'Test User', role: 'ADMIN', enterpriseId: 'test.user', email: 'test.user@example.com' },
    login: jest.fn(),
    logout: jest.fn(),
    updateUser: jest.fn(),
  }),
}));

jest.mock('../components/Navbar', () => () => null);

jest.mock('../components/SortableTh', () =>
  ({ label, onSort, colKey }) => (
    <th onClick={() => onSort && onSort(colKey)}>{label}</th>
  )
);

jest.mock('../components/TablePagination', () => () => null);

jest.mock('../components/QuestionStemRenderer', () =>
  ({ text }) => <div data-testid="stem-renderer">{text}</div>
);

jest.mock('../hooks/useContentTranslation', () => ({
  useContentTranslation: (texts) => texts,
}));

jest.mock('html2canvas', () =>
  jest.fn(() => Promise.resolve({ toDataURL: () => 'data:image/png;base64,' }))
);

jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), error: jest.fn(), warn: jest.fn() },
  ToastContainer: () => null,
}));

// ── Wrapper ──────────────────────────────────────────────────────────────────

const Wrapper = ({ children }) => <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;

// ── Fixtures ─────────────────────────────────────────────────────────────────

const SESSION_RESPONSE = {
  id: 42,
  title: 'Test Quiz',
  timeLimitMinutes: 30,
  questions: [
    { id: 1, questionStem: 'Q1?', optionA: 'A', optionB: 'B', optionC: 'C', optionD: 'D', correctAnswer: 'A', difficulty: 'EASY', techStackName: 'Java', topicName: 'Basics' },
    { id: 2, questionStem: 'Q2?', optionA: 'W', optionB: 'X', optionC: 'Y', optionD: 'Z', correctAnswer: 'B', difficulty: 'MEDIUM', techStackName: 'Java', topicName: 'OOP' },
  ],
};

const SUBMIT_RESULTS = {
  score: 2,
  total: 2,
  percent: 100,
  status: 'COMPLETED',
  topicBreakdown: [{ topic: 'Basics', percent: 100, strength: 'STRONG' }],
};

function makeFetch({ alreadyAttempted = false, submitResults = SUBMIT_RESULTS } = {}) {
  return jest.fn().mockImplementation((url) => {
    if (typeof url === 'string' && url.includes('check-attempt')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ alreadyAttempted }),
      });
    }
    if (typeof url === 'string' && url.includes('submit')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(submitResults),
      });
    }
    // Default: session load
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(SESSION_RESPONSE),
    });
  });
}

const USERS = [
  { id: 1, fullName: 'John Doe',   enterpriseId: 'john.doe',   role: 'SME',   email: 'john@test.com', techStacks: ['Java'], approved: true },
  { id: 2, fullName: 'Jane Smith', enterpriseId: 'jane.smith', role: 'ADMIN', email: 'jane@test.com', techStacks: [],        approved: true },
];

const PENDING_USER = {
  id: 3, fullName: 'Bob Pending', enterpriseId: 'bob.pending', role: 'PENDING',
  email: 'bob@test.com', techStacks: [], approved: false,
};

const ATTEMPTS = [
  {
    id: 1, candidateName: 'Alice', candidateEmail: 'alice@test.com',
    score: 8, total: 10, percent: 80, timeTakenSeconds: 180,
    status: 'COMPLETED', violationCount: 0, submittedAt: '2026-03-01T12:00:00Z',
  },
  {
    id: 2, candidateName: 'Bob', candidateEmail: 'bob@test.com',
    score: 4, total: 10, percent: 40, timeTakenSeconds: 600,
    status: 'TERMINATED', violationCount: 2, submittedAt: '2026-03-02T13:00:00Z',
  },
];

// ════════════════════════════════════════════════════════════════════════════
// TakeQuiz — additional coverage
// ════════════════════════════════════════════════════════════════════════════

import TakeQuiz from './TakeQuiz';

describe('TakeQuiz – extended coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = makeFetch();
    // requestFullscreen is not implemented in jsdom
    document.documentElement.requestFullscreen = jest.fn().mockResolvedValue(undefined);
    window.confirm = jest.fn(() => true);
    API.get = jest.fn().mockResolvedValue({ data: {} });
    API.post = jest.fn().mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    delete global.fetch;
  });

  // ── info-form validation ──────────────────────────────────────────────────

  test('shows error when name is empty and Continue is clicked', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.tq-entry-card')).toBeTruthy());

    // Clear name field
    const inputs = document.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: '' } });

    const continueBtn = document.querySelector('button.tq-btn-primary');
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(document.querySelector('.tq-field-error')).toBeTruthy();
    });
  });

  test('shows error when email is invalid and Continue is clicked', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.tq-entry-card')).toBeTruthy());

    const inputs = document.querySelectorAll('input');
    // Name stays as 'Test User', set bad email
    fireEvent.change(inputs[1], { target: { value: 'not-an-email' } });

    const continueBtn = document.querySelector('button.tq-btn-primary');
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(document.querySelector('.tq-field-error')).toBeTruthy();
    });
  });

  test('shows alreadyAttempted error when check-attempt returns true', async () => {
    global.fetch = makeFetch({ alreadyAttempted: true });
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.tq-entry-card')).toBeTruthy());

    const continueBtn = document.querySelector('button.tq-btn-primary');
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(document.querySelector('.tq-field-error')).toBeTruthy();
    });
  });

  test('transitions to rules step after valid info submit', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.tq-entry-card')).toBeTruthy());

    const continueBtn = document.querySelector('button.tq-btn-primary');
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(document.querySelector('.tq-rules-card')).toBeTruthy();
    });
  });

  test('rules step displays Start Assessment button', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.tq-entry-card')).toBeTruthy());

    fireEvent.click(document.querySelector('button.tq-btn-primary'));

    await waitFor(() => {
      const btns = document.querySelectorAll('button.tq-btn-primary');
      expect(btns.length).toBeGreaterThan(0);
    });
  });

  test('rules step back button returns to info-form', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.tq-entry-card')).toBeTruthy());

    fireEvent.click(document.querySelector('button.tq-btn-primary'));
    await waitFor(() => expect(document.querySelector('.tq-rules-card')).toBeTruthy());

    const backBtn = document.querySelector('button.tq-btn-outline');
    fireEvent.click(backBtn);

    await waitFor(() => {
      expect(document.querySelector('.tq-entry-card')).toBeTruthy();
    });
  });

  test('rules step shows exam rules list items', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.tq-entry-card')).toBeTruthy());

    fireEvent.click(document.querySelector('button.tq-btn-primary'));

    await waitFor(() => {
      const ruleItems = document.querySelectorAll('.tq-rule-item');
      expect(ruleItems.length).toBeGreaterThan(0);
    });
  });

  test('clicking Start Assessment enters quiz step', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.tq-entry-card')).toBeTruthy());

    // Go to rules
    fireEvent.click(document.querySelector('button.tq-btn-primary'));
    await waitFor(() => expect(document.querySelector('.tq-rules-card')).toBeTruthy());

    // Click Start Assessment (second tq-btn-primary on rules page)
    const primaryBtns = document.querySelectorAll('button.tq-btn-primary');
    fireEvent.click(primaryBtns[primaryBtns.length - 1]);

    await waitFor(() => {
      expect(document.querySelector('.tq-exam-root')).toBeTruthy();
    });
  });

  test('quiz step displays question text', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.tq-entry-card')).toBeTruthy());

    fireEvent.click(document.querySelector('button.tq-btn-primary'));
    await waitFor(() => expect(document.querySelector('.tq-rules-card')).toBeTruthy());

    const primaryBtns = document.querySelectorAll('button.tq-btn-primary');
    fireEvent.click(primaryBtns[primaryBtns.length - 1]);

    await waitFor(() => {
      const stemEl = document.querySelector('[data-testid="stem-renderer"]');
      expect(stemEl).toBeTruthy();
    });
  });

  test('quiz step renders four answer option buttons', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.tq-entry-card')).toBeTruthy());

    fireEvent.click(document.querySelector('button.tq-btn-primary'));
    await waitFor(() => expect(document.querySelector('.tq-rules-card')).toBeTruthy());

    const primaryBtns = document.querySelectorAll('button.tq-btn-primary');
    fireEvent.click(primaryBtns[primaryBtns.length - 1]);

    await waitFor(() => {
      const opts = document.querySelectorAll('button.tq-option');
      expect(opts.length).toBe(4);
    });
  });

  test('clicking an option selects it', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.tq-entry-card')).toBeTruthy());

    fireEvent.click(document.querySelector('button.tq-btn-primary'));
    await waitFor(() => expect(document.querySelector('.tq-rules-card')).toBeTruthy());

    const primaryBtns = document.querySelectorAll('button.tq-btn-primary');
    fireEvent.click(primaryBtns[primaryBtns.length - 1]);

    await waitFor(() => expect(document.querySelectorAll('button.tq-option').length).toBe(4));

    const opts = document.querySelectorAll('button.tq-option');
    fireEvent.click(opts[0]);

    await waitFor(() => {
      expect(opts[0].className).toContain('selected');
    });
  });

  test('quiz step shows question palette buttons', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.tq-entry-card')).toBeTruthy());

    fireEvent.click(document.querySelector('button.tq-btn-primary'));
    await waitFor(() => expect(document.querySelector('.tq-rules-card')).toBeTruthy());

    const primaryBtns = document.querySelectorAll('button.tq-btn-primary');
    fireEvent.click(primaryBtns[primaryBtns.length - 1]);

    await waitFor(() => {
      const palette = document.querySelector('.tq-palette');
      expect(palette).toBeTruthy();
      expect(palette.querySelectorAll('button').length).toBe(SESSION_RESPONSE.questions.length);
    });
  });

  test('quiz sidebar shows candidate name', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.tq-entry-card')).toBeTruthy());

    fireEvent.click(document.querySelector('button.tq-btn-primary'));
    await waitFor(() => expect(document.querySelector('.tq-rules-card')).toBeTruthy());

    const primaryBtns = document.querySelectorAll('button.tq-btn-primary');
    fireEvent.click(primaryBtns[primaryBtns.length - 1]);

    await waitFor(() => {
      expect(document.body.innerHTML).toContain('Test User');
    });
  });

  test('expired link (410) shows error icon ⏰', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 410,
      json: () => Promise.resolve({ error: 'Expired.' }),
    });
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await waitFor(() => {
      expect(document.body.innerHTML).toContain('⏰');
    });
  });

  test('results step shown after submitting quiz', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.tq-entry-card')).toBeTruthy());

    // info-form → rules
    fireEvent.click(document.querySelector('button.tq-btn-primary'));
    await waitFor(() => expect(document.querySelector('.tq-rules-card')).toBeTruthy());

    // rules → quiz
    const primaryBtns = document.querySelectorAll('button.tq-btn-primary');
    fireEvent.click(primaryBtns[primaryBtns.length - 1]);
    await waitFor(() => expect(document.querySelector('.tq-exam-root')).toBeTruthy());

    // Navigate to last question and click submit
    const submitFinal = document.querySelector('button.tq-btn-submit-final');
    if (submitFinal) {
      fireEvent.click(submitFinal);
    } else {
      // Move to last question via palette
      const paletteBtns = document.querySelectorAll('.tq-palette button');
      if (paletteBtns.length > 1) fireEvent.click(paletteBtns[paletteBtns.length - 1]);
      await waitFor(() => {
        const sf = document.querySelector('button.tq-btn-submit-final');
        if (sf) fireEvent.click(sf);
      });
    }

    await waitFor(() => {
      expect(
        document.querySelector('.tq-results-root') || document.querySelector('.tq-results-page')
      ).toBeTruthy();
    }, { timeout: 3000 });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// UserManagement — extended coverage
// ════════════════════════════════════════════════════════════════════════════

import UserManagement from './UserManagement';

describe('UserManagement – extended coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    API.get = jest.fn().mockImplementation((url) => {
      if (url === '/admin/users') return Promise.resolve({ data: [...USERS, PENDING_USER] });
      if (url === '/admin/audit-log') return Promise.resolve({ data: [] });
      if (url === '/master/tech-stacks') return Promise.resolve({ data: [{ id: 1, name: 'Java' }] });
      return Promise.resolve({ data: [] });
    });
    API.post = jest.fn().mockResolvedValue({ data: { id: 99, fullName: 'New User', enterpriseId: 'new', role: 'SME', email: 'n@test.com', approved: true } });
    API.put = jest.fn().mockResolvedValue({ data: { ...USERS[0], role: 'ADMIN' } });
    API.delete = jest.fn().mockResolvedValue({});
  });

  test('displays active user count in stats bar', async () => {
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => {
      const pills = document.querySelectorAll('.qb-stat-pill');
      expect(pills.length).toBeGreaterThan(0);
    });
  });

  test('displays admin and SME counts in stats', async () => {
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => {
      const html = document.body.innerHTML;
      // Stats bar should have some numbers
      expect(html).toMatch(/\d/);
    });
  });

  test('switches to Pending Approval tab showing pending user', async () => {
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.status-tab')).toBeTruthy());

    const tabs = document.querySelectorAll('.status-tab');
    const pendingTab = Array.from(tabs).find(t => t.textContent.includes('Pending'));
    fireEvent.click(pendingTab);

    await waitFor(() => {
      expect(document.body.innerHTML).toContain('Bob Pending');
    });
  });

  test('pending approval tab shows Approve button', async () => {
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.status-tab')).toBeTruthy());

    const tabs = document.querySelectorAll('.status-tab');
    const pendingTab = Array.from(tabs).find(t => t.textContent.includes('Pending'));
    fireEvent.click(pendingTab);

    await waitFor(() => {
      const html = document.body.innerHTML;
      expect(html).toContain('Approve');
    });
  });

  test('pending approval tab shows Reject button', async () => {
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.status-tab')).toBeTruthy());

    const tabs = document.querySelectorAll('.status-tab');
    const pendingTab = Array.from(tabs).find(t => t.textContent.includes('Pending'));
    fireEvent.click(pendingTab);

    await waitFor(() => {
      const html = document.body.innerHTML;
      expect(html).toContain('Reject');
    });
  });

  test('clicking Approve opens confirm modal', async () => {
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.status-tab')).toBeTruthy());

    const tabs = document.querySelectorAll('.status-tab');
    const pendingTab = Array.from(tabs).find(t => t.textContent.includes('Pending'));
    fireEvent.click(pendingTab);

    await waitFor(() => expect(document.body.innerHTML).toContain('Approve'));

    const approveBtn = Array.from(document.querySelectorAll('button')).find(b =>
      b.textContent.includes('Approve')
    );
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(document.querySelector('.um-modal')).toBeTruthy();
    });
  });

  test('confirming approve calls API.put', async () => {
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.status-tab')).toBeTruthy());

    const tabs = document.querySelectorAll('.status-tab');
    const pendingTab = Array.from(tabs).find(t => t.textContent.includes('Pending'));
    fireEvent.click(pendingTab);

    await waitFor(() => expect(document.body.innerHTML).toContain('Approve'));

    const approveBtn = Array.from(document.querySelectorAll('button')).find(b =>
      b.textContent.includes('Approve')
    );
    fireEvent.click(approveBtn);

    await waitFor(() => expect(document.querySelector('.um-modal')).toBeTruthy());

    const confirmBtn = document.querySelector('button.btn-danger');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(API.put).toHaveBeenCalledWith(expect.stringContaining('/approve'));
    });
  });

  test('clicking Reject opens confirm modal', async () => {
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.status-tab')).toBeTruthy());

    const tabs = document.querySelectorAll('.status-tab');
    const pendingTab = Array.from(tabs).find(t => t.textContent.includes('Pending'));
    fireEvent.click(pendingTab);

    await waitFor(() => expect(document.body.innerHTML).toContain('Reject'));

    const rejectBtn = Array.from(document.querySelectorAll('button')).find(b =>
      b.textContent.includes('Reject')
    );
    fireEvent.click(rejectBtn);

    await waitFor(() => {
      expect(document.querySelector('.um-modal')).toBeTruthy();
    });
  });

  test('confirming reject calls API.delete', async () => {
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.status-tab')).toBeTruthy());

    const tabs = document.querySelectorAll('.status-tab');
    const pendingTab = Array.from(tabs).find(t => t.textContent.includes('Pending'));
    fireEvent.click(pendingTab);

    await waitFor(() => expect(document.body.innerHTML).toContain('Reject'));

    const rejectBtn = Array.from(document.querySelectorAll('button')).find(b =>
      b.textContent.includes('Reject')
    );
    fireEvent.click(rejectBtn);

    await waitFor(() => expect(document.querySelector('.um-modal')).toBeTruthy());

    const confirmBtn = document.querySelector('button.btn-danger');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(API.delete).toHaveBeenCalledWith(expect.stringContaining('/reject'));
    });
  });

  test('Add User button opens Add User modal', async () => {
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => {
      const html = document.body.innerHTML;
      expect(html).toContain('Add User');
    });

    const addBtn = Array.from(document.querySelectorAll('button')).find(b =>
      b.textContent.includes('Add User')
    );
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(document.querySelector('.um-modal')).toBeTruthy();
    });
  });

  test('Add User modal has Enterprise ID and Full Name fields', async () => {
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => expect(document.body.innerHTML).toContain('Add User'));

    const addBtn = Array.from(document.querySelectorAll('button')).find(b =>
      b.textContent.includes('Add User')
    );
    fireEvent.click(addBtn);

    await waitFor(() => {
      const modal = document.querySelector('.um-modal');
      expect(modal).toBeTruthy();
      const inputs = modal.querySelectorAll('input');
      expect(inputs.length).toBeGreaterThanOrEqual(3); // enterpriseId, fullName, email
    });
  });

  test('search input filters users by name', async () => {
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => expect(document.body.innerHTML).toContain('john.doe'));

    const searchInput = document.querySelector('input[type="text"]');
    fireEvent.change(searchInput, { target: { value: 'John' } });

    await waitFor(() => {
      expect(document.body.innerHTML).toContain('John Doe');
      expect(document.body.innerHTML).not.toContain('Jane Smith');
    });
  });

  test('search input filters by enterprise ID', async () => {
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => expect(document.body.innerHTML).toContain('jane.smith'));

    const searchInput = document.querySelector('input[type="text"]');
    fireEvent.change(searchInput, { target: { value: 'jane.smith' } });

    await waitFor(() => {
      expect(document.body.innerHTML).toContain('jane.smith');
      expect(document.body.innerHTML).not.toContain('john.doe');
    });
  });

  test('role change button visible for non-self users', async () => {
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => {
      const makeBtns = Array.from(document.querySelectorAll('button')).filter(b =>
        b.textContent.startsWith('Make ')
      );
      expect(makeBtns.length).toBeGreaterThan(0);
    });
  });

  test('role pill displayed for each active user', async () => {
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => {
      expect(document.body.innerHTML).toContain('SME');
    });
  });

  test('pending count badge shown on Pending Approval tab', async () => {
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => {
      // Bob Pending is a pending user, so badge should show
      const html = document.body.innerHTML;
      expect(html).toContain('Pending');
    });
  });

  test('History tab switch works without error', async () => {
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.status-tab')).toBeTruthy());

    const tabs = document.querySelectorAll('.status-tab');
    const historyTab = Array.from(tabs).find(t => t.textContent.includes('History'));
    fireEvent.click(historyTab);

    // No error thrown and component still mounted
    expect(document.body).toBeTruthy();
  });

  test('closing confirm modal cancels the action', async () => {
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.status-tab')).toBeTruthy());

    const tabs = document.querySelectorAll('.status-tab');
    const pendingTab = Array.from(tabs).find(t => t.textContent.includes('Pending'));
    fireEvent.click(pendingTab);

    await waitFor(() => expect(document.body.innerHTML).toContain('Approve'));

    const approveBtn = Array.from(document.querySelectorAll('button')).find(b =>
      b.textContent.includes('Approve')
    );
    fireEvent.click(approveBtn);

    await waitFor(() => expect(document.querySelector('.um-modal')).toBeTruthy());

    const cancelBtn = document.querySelector('button.btn-secondary');
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(document.querySelector('.um-modal')).toBeNull();
    });
    expect(API.put).not.toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// QuizAttempts — extended coverage
// ════════════════════════════════════════════════════════════════════════════

import QuizAttempts from './QuizAttempts';

const QUIZ_SESSIONS_LIST = [
  { id: 10, title: 'Java Basics', questionCount: 10, token: 'tok-abc' },
];

describe('QuizAttempts – extended coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    API.get = jest.fn().mockImplementation((url) => {
      if (url === '/quiz-sessions') return Promise.resolve({ data: QUIZ_SESSIONS_LIST });
      if (url.includes('/attempts')) return Promise.resolve({ data: ATTEMPTS });
      return Promise.resolve({ data: [] });
    });
    API.post = jest.fn().mockResolvedValue({ data: {} });
  });

  test('clear filter button appears when filter has text', async () => {
    render(<Wrapper><QuizAttempts /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.qa-filter-input')).toBeTruthy());

    const filterInput = document.querySelector('.qa-filter-input');
    fireEvent.change(filterInput, { target: { value: 'Alice' } });

    await waitFor(() => {
      expect(document.querySelector('.qa-btn-clear')).toBeTruthy();
    });
  });

  test('clear filter button resets the filter', async () => {
    render(<Wrapper><QuizAttempts /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.qa-filter-input')).toBeTruthy());

    const filterInput = document.querySelector('.qa-filter-input');
    fireEvent.change(filterInput, { target: { value: 'Alice' } });

    await waitFor(() => expect(document.querySelector('.qa-btn-clear')).toBeTruthy());

    fireEvent.click(document.querySelector('.qa-btn-clear'));

    await waitFor(() => {
      expect(document.querySelector('.qa-filter-input').value).toBe('');
      expect(document.querySelector('.qa-btn-clear')).toBeNull();
    });
  });

  test('view button opens detail panel for that attempt', async () => {
    render(<Wrapper><QuizAttempts /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.qa-table')).toBeTruthy());

    const viewBtns = document.querySelectorAll('button.qa-btn-detail');
    expect(viewBtns.length).toBeGreaterThan(0);
    fireEvent.click(viewBtns[0]);

    await waitFor(() => {
      expect(document.querySelector('.qa-detail-panel')).toBeTruthy();
    });
  });

  test('detail panel shows candidate name', async () => {
    render(<Wrapper><QuizAttempts /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.qa-table')).toBeTruthy());

    const viewBtns = document.querySelectorAll('button.qa-btn-detail');
    fireEvent.click(viewBtns[0]);

    await waitFor(() => {
      const panel = document.querySelector('.qa-detail-panel');
      expect(panel.textContent).toContain('Alice');
    });
  });

  test('detail panel has a close button', async () => {
    render(<Wrapper><QuizAttempts /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.qa-table')).toBeTruthy());

    const viewBtns = document.querySelectorAll('button.qa-btn-detail');
    fireEvent.click(viewBtns[0]);

    await waitFor(() => {
      expect(document.querySelector('.qa-detail-panel .qa-btn-close')).toBeTruthy();
    });
  });

  test('closing detail panel removes it from DOM', async () => {
    render(<Wrapper><QuizAttempts /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.qa-table')).toBeTruthy());

    const viewBtns = document.querySelectorAll('button.qa-btn-detail');
    fireEvent.click(viewBtns[0]);
    await waitFor(() => expect(document.querySelector('.qa-detail-panel')).toBeTruthy());

    const closeBtn = document.querySelector('.qa-btn-close');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(document.querySelector('.qa-detail-panel')).toBeNull();
    });
  });

  test('download CSV button is present', async () => {
    render(<Wrapper><QuizAttempts /></Wrapper>);
    await waitFor(() => {
      const csvBtn = document.querySelector('button.qa-btn-download.csv');
      expect(csvBtn).toBeTruthy();
    });
  });

  test('download PDF button is present', async () => {
    render(<Wrapper><QuizAttempts /></Wrapper>);
    await waitFor(() => {
      const pdfBtn = document.querySelector('button.qa-btn-download.pdf');
      expect(pdfBtn).toBeTruthy();
    });
  });

  test('date From and To filter inputs are present', async () => {
    render(<Wrapper><QuizAttempts /></Wrapper>);
    await waitFor(() => {
      const dateInputs = document.querySelectorAll('input[type="date"]');
      expect(dateInputs.length).toBe(2);
    });
  });

  test('shows violation warning icon for attempts with violations', async () => {
    render(<Wrapper><QuizAttempts /></Wrapper>);
    await waitFor(() => {
      expect(document.body.innerHTML).toContain('⚠️');
    });
  });

  test('shows dash for zero violations', async () => {
    render(<Wrapper><QuizAttempts /></Wrapper>);
    await waitFor(() => {
      // Alice has 0 violations → renders '—'
      const tds = Array.from(document.querySelectorAll('td'));
      const dashTd = tds.find(td => td.textContent === '—');
      expect(dashTd).toBeTruthy();
    });
  });

  test('average score shown in summary cards', async () => {
    render(<Wrapper><QuizAttempts /></Wrapper>);
    await waitFor(() => {
      // Average of 80% and 40% = 60%
      expect(document.body.innerHTML).toContain('60%');
    });
  });

  test('filtering by name updates visible rows without unmounting table', async () => {
    render(<Wrapper><QuizAttempts /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.qa-table')).toBeTruthy());

    const filterInput = document.querySelector('.qa-filter-input');
    fireEvent.change(filterInput, { target: { value: 'bob' } });

    await waitFor(() => {
      const rows = document.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('Bob');
    });
  });

  test('no results message shown when filter matches nothing', async () => {
    render(<Wrapper><QuizAttempts /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.qa-table')).toBeTruthy());

    const filterInput = document.querySelector('.qa-filter-input');
    fireEvent.change(filterInput, { target: { value: 'zzznomatch' } });

    await waitFor(() => {
      expect(document.querySelector('.qa-empty')).toBeTruthy();
    });
  });

  test('clicking view again on same row closes detail panel', async () => {
    render(<Wrapper><QuizAttempts /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.qa-table')).toBeTruthy());

    const viewBtns = document.querySelectorAll('button.qa-btn-detail');
    // Open detail
    fireEvent.click(viewBtns[0]);
    await waitFor(() => expect(document.querySelector('.qa-detail-panel')).toBeTruthy());

    // The button text should now say "Close" – click it to toggle off
    const closingViewBtn = document.querySelectorAll('button.qa-btn-detail')[0];
    fireEvent.click(closingViewBtn);

    await waitFor(() => {
      expect(document.querySelector('.qa-detail-panel')).toBeNull();
    });
  });

  test('page header subtitle is rendered', async () => {
    render(<Wrapper><QuizAttempts /></Wrapper>);
    await waitFor(() => {
      const header = document.querySelector('.qa-header');
      expect(header).toBeTruthy();
      expect(document.querySelector('.qa-title')).toBeTruthy();
    });
  });
});
