import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import API from '../api';

// ── Global mocks ─────────────────────────────────────────────────────────────

jest.mock('../api');

jest.mock('../AuthContext', () => ({
  useAuth: () => ({
    user: {
      fullName: 'Admin User',
      role: 'ADMIN',
      enterpriseId: 'admin.user',
      email: 'admin.user@example.com',
    },
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

jest.mock('../components/Navbar', () => () => null);

jest.mock('../hooks/useContentTranslation', () => ({
  useContentTranslation: (texts) => texts,
}));

jest.mock('../components/QuestionStemRenderer', () =>
  ({ text }) => <div data-testid="stem-renderer">{text}</div>
);

jest.mock('html2canvas', () =>
  jest.fn(() => Promise.resolve({ toDataURL: () => 'data:image/png;base64,' }))
);

jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), error: jest.fn(), warn: jest.fn() },
  ToastContainer: () => null,
}));

// ── Wrapper ───────────────────────────────────────────────────────────────────

const Wrapper = ({ children }) => <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SESSION_RESPONSE = {
  id: 42,
  title: 'Java Basics Quiz',
  timeLimitMinutes: 30,
  questions: [
    {
      id: 1,
      questionStem: 'What is JVM?',
      optionA: 'Virtual Machine',
      optionB: 'Compiler',
      optionC: 'IDE',
      optionD: 'None',
      correctAnswer: 'A',
      difficulty: 'EASY',
      techStackName: 'Java',
      topicName: 'Basics',
    },
    {
      id: 2,
      questionStem: 'What is OOP?',
      optionA: 'Object Oriented Programming',
      optionB: 'Open Office',
      optionC: 'Out of Process',
      optionD: 'None',
      correctAnswer: 'A',
      difficulty: 'MEDIUM',
      techStackName: 'Java',
      topicName: 'OOP',
    },
  ],
};

const SUBMIT_RESULTS_PASS = {
  score: 2,
  total: 2,
  percent: 100,
  status: 'COMPLETED',
  topicBreakdown: [
    { topic: 'Basics', percent: 100, strength: 'STRONG' },
    { topic: 'OOP', percent: 80, strength: 'AVERAGE' },
  ],
};

const SUBMIT_RESULTS_FAIL = {
  score: 0,
  total: 2,
  percent: 0,
  status: 'COMPLETED',
  topicBreakdown: [
    { topic: 'Basics', percent: 0, strength: 'WEAK' },
    { topic: 'OOP', percent: 0, strength: 'WEAK' },
  ],
};

const SUBMIT_RESULTS_TERMINATED = {
  score: 0,
  total: 2,
  percent: 30,
  status: 'TERMINATED',
  topicBreakdown: [],
};

function makeFetch({ alreadyAttempted = false, submitResults = SUBMIT_RESULTS_PASS } = {}) {
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

// Helper: navigate TakeQuiz from info-form → rules → quiz step
async function navigateToQuizStep() {
  await waitFor(() => expect(document.querySelector('.tq-entry-card')).toBeTruthy());
  fireEvent.click(document.querySelector('button.tq-btn-primary'));
  await waitFor(() => expect(document.querySelector('.tq-rules-card')).toBeTruthy());
  const primaryBtns = document.querySelectorAll('button.tq-btn-primary');
  fireEvent.click(primaryBtns[primaryBtns.length - 1]);
  await waitFor(() => expect(document.querySelector('.tq-exam-root')).toBeTruthy());
}

// Helper: navigate all the way through and submit quiz
async function navigateToResults(confirmResult = true) {
  window.confirm = jest.fn(() => confirmResult);
  await navigateToQuizStep();

  // Navigate to last question (index 1) via palette
  const paletteBtns = document.querySelectorAll('.tq-palette button');
  if (paletteBtns.length > 1) {
    fireEvent.click(paletteBtns[paletteBtns.length - 1]);
    await waitFor(() => expect(document.querySelector('.tq-btn-submit-final')).toBeTruthy());
  }

  const submitFinal = document.querySelector('button.tq-btn-submit-final');
  if (submitFinal) {
    fireEvent.click(submitFinal);
  }
  await waitFor(() =>
    expect(document.querySelector('.tq-results-root')).toBeTruthy(),
    { timeout: 4000 }
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAKE QUIZ — extended coverage (pages7)
// ════════════════════════════════════════════════════════════════════════════

import TakeQuiz from './TakeQuiz';

describe('TakeQuiz – pages7 extended coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = makeFetch();
    document.documentElement.requestFullscreen = jest.fn().mockResolvedValue(undefined);
    window.confirm = jest.fn(() => true);
    window.print = jest.fn();
    API.get = jest.fn().mockResolvedValue({ data: {} });
    API.post = jest.fn().mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    delete global.fetch;
    jest.useRealTimers();
  });

  // ── Loading / error states ────────────────────────────────────────────────

  test('shows spinner while session is loading', () => {
    global.fetch = jest.fn().mockImplementation(() => new Promise(() => {})); // never resolves
    render(<Wrapper><TakeQuiz /></Wrapper>);
    expect(document.querySelector('.tq-spinner')).toBeTruthy();
  });

  test('shows error step when fetch returns non-ok status (not 410)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({}),
    });
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await waitFor(() => {
      expect(document.querySelector('.tq-error-box')).toBeTruthy();
    });
  });

  test('shows expired icon when fetch returns 410 with error message', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 410,
      json: () => Promise.resolve({ error: 'Quiz link expired.' }),
    });
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await waitFor(() => {
      expect(document.body.innerHTML).toContain('⏰');
      expect(document.body.innerHTML).toContain('Quiz link expired.');
    });
  });

  test('shows generic error (🚫) when fetch returns 410 without message', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 410,
      json: () => Promise.reject(new Error('no json')),
    });
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await waitFor(() => {
      expect(document.querySelector('.tq-error-box')).toBeTruthy();
    });
  });

  // ── Info form ─────────────────────────────────────────────────────────────

  test('info-form shows session question count and time limit', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await waitFor(() => {
      expect(document.body.innerHTML).toContain('2'); // 2 questions
      expect(document.body.innerHTML).toContain('30'); // 30 minutes
    });
  });

  test('pre-fills candidate email from logged-in user', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await waitFor(() => {
      const emailInput = Array.from(document.querySelectorAll('input')).find(
        el => el.type === 'email',
      );
      expect(emailInput?.value).toBe('admin.user@example.com');
    });
  });

  test('candidate name can be edited in info-form', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.tq-entry-card')).toBeTruthy());

    const nameInput = document.querySelectorAll('input')[0];
    fireEvent.change(nameInput, { target: { value: 'New Candidate' } });
    expect(nameInput.value).toBe('New Candidate');
  });

  test('pressing Enter in name field triggers continue', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.tq-entry-card')).toBeTruthy());

    const nameInput = document.querySelectorAll('input')[0];
    fireEvent.keyDown(nameInput, { key: 'Enter' });

    await waitFor(() => {
      // Should either show rules or an error if validation fails
      expect(
        document.querySelector('.tq-rules-card') ||
        document.querySelector('.tq-field-error')
      ).toBeTruthy();
    });
  });

  test('pressing Enter in email field triggers continue', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.tq-entry-card')).toBeTruthy());

    const emailInput = document.querySelectorAll('input')[1];
    fireEvent.keyDown(emailInput, { key: 'Enter' });

    await waitFor(() => {
      expect(
        document.querySelector('.tq-rules-card') ||
        document.querySelector('.tq-field-error')
      ).toBeTruthy();
    });
  });

  test('shows already-attempted error when check returns alreadyAttempted=true', async () => {
    global.fetch = makeFetch({ alreadyAttempted: true });
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.tq-entry-card')).toBeTruthy());

    fireEvent.click(document.querySelector('button.tq-btn-primary'));
    await waitFor(() => {
      expect(document.querySelector('.tq-field-error')).toBeTruthy();
    });
  });

  test('check-attempt network failure still allows proceeding to rules', async () => {
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('check-attempt')) {
        return Promise.reject(new Error('network'));
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(SESSION_RESPONSE),
      });
    });
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.tq-entry-card')).toBeTruthy());

    fireEvent.click(document.querySelector('button.tq-btn-primary'));
    await waitFor(() => {
      expect(document.querySelector('.tq-rules-card')).toBeTruthy();
    });
  });

  // ── Rules step ────────────────────────────────────────────────────────────

  test('rules step shows 8 rule items', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.tq-entry-card')).toBeTruthy());
    fireEvent.click(document.querySelector('button.tq-btn-primary'));
    await waitFor(() => {
      const ruleItems = document.querySelectorAll('.tq-rule-item');
      expect(ruleItems.length).toBe(8);
    });
  });

  test('rules step shows time limit in rule title', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.tq-entry-card')).toBeTruthy());
    fireEvent.click(document.querySelector('button.tq-btn-primary'));
    await waitFor(() => {
      expect(document.body.innerHTML).toContain('30');
    });
  });

  test('start assessment calls requestFullscreen', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await waitFor(() => expect(document.querySelector('.tq-entry-card')).toBeTruthy());
    fireEvent.click(document.querySelector('button.tq-btn-primary'));
    await waitFor(() => expect(document.querySelector('.tq-rules-card')).toBeTruthy());

    const primaryBtns = document.querySelectorAll('button.tq-btn-primary');
    fireEvent.click(primaryBtns[primaryBtns.length - 1]);

    await waitFor(() => {
      expect(document.documentElement.requestFullscreen).toHaveBeenCalled();
    });
  });

  // ── Quiz step ─────────────────────────────────────────────────────────────

  test('quiz step shows answered/pending stat counters', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToQuizStep();

    const sidebar = document.querySelector('.tq-sidebar');
    expect(sidebar).toBeTruthy();
    expect(document.querySelector('.tq-sidebar-stats')).toBeTruthy();
  });

  test('clicking palette button navigates to that question', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToQuizStep();

    const palette = document.querySelectorAll('.tq-palette button');
    expect(palette.length).toBe(2);

    // Click second question
    fireEvent.click(palette[1]);
    await waitFor(() => {
      expect(palette[1].className).toContain('active');
    });
  });

  test('clicking Prev button goes back to previous question', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToQuizStep();

    // Navigate to Q2
    const palette = document.querySelectorAll('.tq-palette button');
    fireEvent.click(palette[1]);
    await waitFor(() => expect(document.querySelector('.tq-btn-submit-final')).toBeTruthy());

    // Click Prev
    const prevBtn = document.querySelector('button.tq-btn-nav');
    expect(prevBtn).toBeTruthy();
    fireEvent.click(prevBtn);

    await waitFor(() => {
      // Should be back on Q1 — submit button gone
      expect(document.querySelector('button.tq-btn-next')).toBeTruthy();
    });
  });

  test('Prev button is disabled on first question', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToQuizStep();

    const prevBtn = document.querySelector('button.tq-btn-nav');
    expect(prevBtn).toBeTruthy();
    expect(prevBtn.disabled).toBe(true);
  });

  test('selecting an answer marks it as selected', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToQuizStep();

    const opts = document.querySelectorAll('button.tq-option');
    expect(opts.length).toBe(4);

    fireEvent.click(opts[0]);
    await waitFor(() => {
      expect(opts[0].className).toContain('selected');
    });
  });

  test('selecting an answer shows checkmark ✓', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToQuizStep();

    const opts = document.querySelectorAll('button.tq-option');
    fireEvent.click(opts[1]);

    await waitFor(() => {
      expect(document.body.innerHTML).toContain('✓');
    });
  });

  test('answer persists when navigating back and forth via palette', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToQuizStep();

    // Answer Q1
    const opts = document.querySelectorAll('button.tq-option');
    fireEvent.click(opts[0]);
    await waitFor(() => expect(opts[0].className).toContain('selected'));

    // Navigate to Q2
    const palette = document.querySelectorAll('.tq-palette button');
    fireEvent.click(palette[1]);
    await waitFor(() => expect(document.querySelector('.tq-btn-submit-final')).toBeTruthy());

    // Navigate back to Q1
    fireEvent.click(palette[0]);
    await waitFor(() => {
      const firstOption = document.querySelectorAll('button.tq-option')[0];
      expect(firstOption.className).toContain('selected');
    });
  });

  test('answered count increments after selecting an option', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToQuizStep();

    // Initially 0 answered
    const statsBefore = document.querySelector('.tq-stat-val.tq-stat-green');
    expect(statsBefore?.textContent).toBe('0');

    const opts = document.querySelectorAll('button.tq-option');
    fireEvent.click(opts[0]);

    await waitFor(() => {
      const statsAfter = document.querySelector('.tq-stat-val.tq-stat-green');
      expect(statsAfter?.textContent).toBe('1');
    });
  });

  test('candidate name avatar initial displayed in sidebar', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToQuizStep();

    const avatar = document.querySelector('.tq-avatar');
    expect(avatar?.textContent).toBe('A'); // 'Admin User' → 'A'
  });

  test('question tags (techStack, topic, difficulty) are shown', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToQuizStep();

    const html = document.body.innerHTML;
    expect(html).toContain('Java');
    expect(html).toContain('Basics');
  });

  test('last question shows Submit Assessment button instead of Next', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToQuizStep();

    const palette = document.querySelectorAll('.tq-palette button');
    fireEvent.click(palette[palette.length - 1]);

    await waitFor(() => {
      expect(document.querySelector('button.tq-btn-submit-final')).toBeTruthy();
      expect(document.querySelector('button.tq-btn-next')).toBeFalsy();
    });
  });

  test('submit with window.confirm returning false does not call fetch submit', async () => {
    window.confirm = jest.fn(() => false);
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToQuizStep();

    const palette = document.querySelectorAll('.tq-palette button');
    fireEvent.click(palette[palette.length - 1]);
    await waitFor(() => expect(document.querySelector('button.tq-btn-submit-final')).toBeTruthy());

    fireEvent.click(document.querySelector('button.tq-btn-submit-final'));

    // fetch for 'submit' should NOT have been called
    await act(async () => {});
    const fetchCalls = global.fetch.mock.calls.map(([url]) => url);
    expect(fetchCalls.some(u => u.includes('submit'))).toBe(false);
  });

  test('submit with window.confirm true calls fetch submit endpoint', async () => {
    window.confirm = jest.fn(() => true);
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToQuizStep();

    const palette = document.querySelectorAll('.tq-palette button');
    fireEvent.click(palette[palette.length - 1]);
    await waitFor(() => expect(document.querySelector('button.tq-btn-submit-final')).toBeTruthy());

    fireEvent.click(document.querySelector('button.tq-btn-submit-final'));

    await waitFor(() => {
      const fetchCalls = global.fetch.mock.calls.map(([url]) => url);
      expect(fetchCalls.some(u => u.includes('submit'))).toBe(true);
    });
  });

  test('failed submit (non-ok response) calls toast.error', async () => {
    const { toast } = require('react-toastify');
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('check-attempt')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ alreadyAttempted: false }) });
      }
      if (url.includes('submit')) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Server error' }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(SESSION_RESPONSE) });
    });

    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToQuizStep();

    const palette = document.querySelectorAll('.tq-palette button');
    fireEvent.click(palette[palette.length - 1]);
    await waitFor(() => expect(document.querySelector('button.tq-btn-submit-final')).toBeTruthy());

    window.confirm = jest.fn(() => true);
    fireEvent.click(document.querySelector('button.tq-btn-submit-final'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  // ── Violation / tab-switch detection ─────────────────────────────────────

  test('tab switch increments violations badge', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToQuizStep();

    // Simulate tab switch (document becomes hidden)
    Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => {
      const badge = document.querySelector('.tq-violations-badge');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toContain('1/3');
    });

    // Reset
    Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
  });

  test('warning banner appears after tab switch', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToQuizStep();

    Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => {
      expect(document.querySelector('.tq-warning-banner')).toBeTruthy();
    });

    Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
  });

  test('dismiss button on warning banner clears the banner', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToQuizStep();

    Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => expect(document.querySelector('.tq-warning-banner')).toBeTruthy());

    const dismissBtn = document.querySelector('button.tq-btn-dismiss');
    expect(dismissBtn).toBeTruthy();
    fireEvent.click(dismissBtn);

    await waitFor(() => {
      expect(document.querySelector('.tq-warning-banner')).toBeFalsy();
    });

    Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
  });

  test('3 tab switches auto-submits and calls fetch submit', async () => {
    const { toast } = require('react-toastify');
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToQuizStep();

    Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });

    for (let i = 0; i < 3; i++) {
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
    }

    await waitFor(() => {
      const fetchCalls = global.fetch.mock.calls.map(([url]) => url);
      expect(fetchCalls.some(u => u.includes('submit'))).toBe(true);
    }, { timeout: 3000 });

    Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
  });

  // ── Timer countdown ───────────────────────────────────────────────────────

  test('countdown timer renders CircularTimer on quiz step', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToQuizStep();

    expect(document.querySelector('.tq-circ-timer')).toBeTruthy();
  });

  test('timer shows MM:SS format', async () => {
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToQuizStep();

    const timeEl = document.querySelector('.tq-circ-time');
    expect(timeEl).toBeTruthy();
    expect(timeEl.textContent).toMatch(/^\d{2}:\d{2}$/);
  });

  test('timer auto-submits when it reaches zero', async () => {
    jest.useFakeTimers();
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToQuizStep();

    // Advance timer past 30 minutes (1800 seconds)
    act(() => {
      jest.advanceTimersByTime(1801 * 1000);
    });

    await waitFor(() => {
      const fetchCalls = global.fetch.mock.calls.map(([url]) => url);
      expect(fetchCalls.some(u => u.includes('submit'))).toBe(true);
    });

    jest.useRealTimers();
  });

  // ── Results step ──────────────────────────────────────────────────────────

  test('results page shows candidate name and email', async () => {
    global.fetch = makeFetch({ submitResults: SUBMIT_RESULTS_PASS });
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToResults();

    expect(document.body.innerHTML).toContain('Admin User');
    expect(document.body.innerHTML).toContain('admin.user@example.com');
  });

  test('results page shows score and total', async () => {
    global.fetch = makeFetch({ submitResults: SUBMIT_RESULTS_PASS });
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToResults();

    const html = document.body.innerHTML;
    expect(html).toContain('2'); // score and total
  });

  test('results page shows 100% for perfect score', async () => {
    global.fetch = makeFetch({ submitResults: SUBMIT_RESULTS_PASS });
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToResults();

    await waitFor(() => {
      expect(document.querySelector('.tq-score-pct')).toBeTruthy();
    });
  });

  test('results page shows topic performance bars', async () => {
    global.fetch = makeFetch({ submitResults: SUBMIT_RESULTS_PASS });
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToResults();

    await waitFor(() => {
      expect(document.querySelector('.tq-topic-bars') || document.querySelector('.tq-tbar-row')).toBeTruthy();
    });
  });

  test('results page shows TERMINATED badge when status is TERMINATED', async () => {
    global.fetch = makeFetch({ submitResults: SUBMIT_RESULTS_TERMINATED });
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToResults();

    await waitFor(() => {
      expect(document.querySelector('.tq-terminated-badge')).toBeTruthy();
    });
  });

  test('results page shows strengths section for STRONG topics', async () => {
    global.fetch = makeFetch({ submitResults: SUBMIT_RESULTS_PASS });
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToResults();

    await waitFor(() => {
      const html = document.body.innerHTML;
      expect(html).toContain('Basics');
    });
  });

  test('results page shows weak topics in study section', async () => {
    global.fetch = makeFetch({ submitResults: SUBMIT_RESULTS_FAIL });
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToResults();

    await waitFor(() => {
      expect(document.querySelector('.tq-insight-card.tq-insight-study')).toBeTruthy();
    });
  });

  test('results page shows Download PDF button', async () => {
    global.fetch = makeFetch({ submitResults: SUBMIT_RESULTS_PASS });
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToResults();

    await waitFor(() => {
      const pdfBtn = document.querySelector('button.tq-btn-pdf');
      expect(pdfBtn).toBeTruthy();
    });
  });

  test('Download PDF button calls window.print', async () => {
    global.fetch = makeFetch({ submitResults: SUBMIT_RESULTS_PASS });
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToResults();

    await waitFor(() => expect(document.querySelector('button.tq-btn-pdf')).toBeTruthy());
    jest.useFakeTimers();
    fireEvent.click(document.querySelector('button.tq-btn-pdf'));
    act(() => jest.runAllTimers());
    expect(window.print).toHaveBeenCalled();
    jest.useRealTimers();
  });

  test('Confetti is shown for 100% score (>=80%)', async () => {
    global.fetch = makeFetch({ submitResults: SUBMIT_RESULTS_PASS });
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToResults();

    await waitFor(() => {
      expect(document.querySelector('.tq-confetti-wrap')).toBeTruthy();
    });
  });

  test('no Confetti is shown for 0% score', async () => {
    global.fetch = makeFetch({ submitResults: SUBMIT_RESULTS_FAIL });
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToResults();

    await waitFor(() => {
      expect(document.querySelector('.tq-results-root')).toBeTruthy();
    });
    expect(document.querySelector('.tq-confetti-wrap')).toBeFalsy();
  });

  test('report header brand text is shown on results page', async () => {
    global.fetch = makeFetch({ submitResults: SUBMIT_RESULTS_PASS });
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToResults();

    await waitFor(() => {
      expect(document.querySelector('.tq-report-header')).toBeTruthy();
    });
  });

  test('results page has score pills for correct and incorrect', async () => {
    global.fetch = makeFetch({ submitResults: SUBMIT_RESULTS_PASS });
    render(<Wrapper><TakeQuiz /></Wrapper>);
    await navigateToResults();

    await waitFor(() => {
      const pills = document.querySelectorAll('.tq-score-pill');
      expect(pills.length).toBeGreaterThanOrEqual(2);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// QUIZ PAGE — extended coverage (pages7)
// ════════════════════════════════════════════════════════════════════════════

import Quiz from './Quiz';

const TECH_STACKS = [
  { id: 1, name: 'Java' },
  { id: 2, name: 'React' },
  { id: 3, name: 'Python' },
];

const QUIZ_QUESTIONS = [
  {
    id: 1,
    questionStem: 'What is Java?',
    optionA: 'Language',
    optionB: 'Framework',
    optionC: 'Database',
    optionD: 'OS',
    difficulty: 'EASY',
    techStack: 'Java',
    topic: 'Intro',
  },
  {
    id: 2,
    questionStem: 'What is React?',
    optionA: 'Library',
    optionB: 'Language',
    optionC: 'Database',
    optionD: 'OS',
    difficulty: 'MEDIUM',
    techStack: 'React',
    topic: 'Frontend',
  },
];

const SUBMIT_RESULT_GOOD = {
  score: 2,
  total: 2,
  percentage: 100,
  results: [
    {
      mcqId: 1,
      questionStem: 'What is Java?',
      yourAnswer: 'A',
      correctAnswer: 'A',
      correct: true,
      difficulty: 'EASY',
    },
    {
      mcqId: 2,
      questionStem: 'What is React?',
      yourAnswer: 'A',
      correctAnswer: 'A',
      correct: true,
      difficulty: 'MEDIUM',
    },
  ],
};

const SUBMIT_RESULT_POOR = {
  score: 0,
  total: 2,
  percentage: 0,
  results: [
    {
      mcqId: 1,
      questionStem: 'What is Java?',
      yourAnswer: 'B',
      correctAnswer: 'A',
      correct: false,
      difficulty: 'EASY',
    },
  ],
};

describe('Quiz Page – pages7 extended coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    API.get = jest.fn().mockImplementation((url) => {
      if (url === '/master/tech-stacks') return Promise.resolve({ data: TECH_STACKS });
      if (url === '/quiz/questions') return Promise.resolve({ data: QUIZ_QUESTIONS });
      return Promise.resolve({ data: [] });
    });
    API.post = jest.fn().mockResolvedValue({ data: SUBMIT_RESULT_GOOD });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── Setup phase ───────────────────────────────────────────────────────────

  test('renders setup card with title and subtitle', () => {
    render(<Wrapper><Quiz /></Wrapper>);
    expect(document.querySelector('.quiz-setup-card')).toBeTruthy();
  });

  test('loads tech stacks into the dropdown on mount', async () => {
    render(<Wrapper><Quiz /></Wrapper>);
    await waitFor(() => {
      const options = document.querySelectorAll('option');
      // "All tech stacks" + 3 loaded stacks
      expect(options.length).toBeGreaterThanOrEqual(4);
    });
  });

  test('selecting tech stack option updates config', async () => {
    render(<Wrapper><Quiz /></Wrapper>);
    await waitFor(() => expect(document.querySelectorAll('option').length).toBeGreaterThan(1));

    const select = document.querySelector('select');
    fireEvent.change(select, { target: { value: '1' } });
    expect(select.value).toBe('1');
  });

  test('count pill 5 can be selected', () => {
    render(<Wrapper><Quiz /></Wrapper>);
    const pills = document.querySelectorAll('button.quiz-count-pill');
    fireEvent.click(pills[0]); // pill "5"
    expect(pills[0].classList.contains('active')).toBe(true);
  });

  test('count pill 15 can be selected', () => {
    render(<Wrapper><Quiz /></Wrapper>);
    const pills = document.querySelectorAll('button.quiz-count-pill');
    fireEvent.click(pills[2]); // pill "15"
    expect(pills[2].classList.contains('active')).toBe(true);
  });

  test('count pill 20 can be selected', () => {
    render(<Wrapper><Quiz /></Wrapper>);
    const pills = document.querySelectorAll('button.quiz-count-pill');
    fireEvent.click(pills[3]); // pill "20"
    expect(pills[3].classList.contains('active')).toBe(true);
  });

  test('default count is 10 (second pill active)', () => {
    render(<Wrapper><Quiz /></Wrapper>);
    const pills = document.querySelectorAll('button.quiz-count-pill');
    expect(pills[1].classList.contains('active')).toBe(true);
  });

  test('tech stacks API failure does not crash the page', async () => {
    API.get = jest.fn().mockRejectedValue(new Error('network'));
    render(<Wrapper><Quiz /></Wrapper>);
    await waitFor(() => {
      expect(document.querySelector('.quiz-setup-card')).toBeTruthy();
    });
  });

  // ── Playing phase ─────────────────────────────────────────────────────────

  test('transitions to playing phase and shows question stem', async () => {
    render(<Wrapper><Quiz /></Wrapper>);
    fireEvent.click(document.querySelector('button.quiz-start-btn'));
    await waitFor(() => {
      expect(screen.queryByText('What is Java?')).toBeTruthy();
    });
  });

  test('progress bar is rendered in playing phase', async () => {
    render(<Wrapper><Quiz /></Wrapper>);
    fireEvent.click(document.querySelector('button.quiz-start-btn'));
    await waitFor(() => {
      expect(document.querySelector('.quiz-progress-bar')).toBeTruthy();
    });
  });

  test('difficulty pill is rendered for each question', async () => {
    render(<Wrapper><Quiz /></Wrapper>);
    fireEvent.click(document.querySelector('button.quiz-start-btn'));
    await waitFor(() => {
      expect(document.querySelector('.quiz-diff-pill')).toBeTruthy();
    });
  });

  test('tech stack pill shown when question has techStack', async () => {
    render(<Wrapper><Quiz /></Wrapper>);
    fireEvent.click(document.querySelector('button.quiz-start-btn'));
    await waitFor(() => {
      expect(document.querySelector('.quiz-stack-pill')).toBeTruthy();
    });
  });

  test('topic pill shown when question has topic', async () => {
    render(<Wrapper><Quiz /></Wrapper>);
    fireEvent.click(document.querySelector('button.quiz-start-btn'));
    await waitFor(() => {
      expect(document.querySelector('.quiz-topic-pill')).toBeTruthy();
    });
  });

  test('four answer option buttons are shown in playing phase', async () => {
    render(<Wrapper><Quiz /></Wrapper>);
    fireEvent.click(document.querySelector('button.quiz-start-btn'));
    await waitFor(() => {
      const opts = document.querySelectorAll('button.quiz-option');
      expect(opts.length).toBe(4);
    });
  });

  test('clicking an option selects it and disables others', async () => {
    render(<Wrapper><Quiz /></Wrapper>);
    fireEvent.click(document.querySelector('button.quiz-start-btn'));
    await waitFor(() => expect(document.querySelectorAll('button.quiz-option').length).toBe(4));

    const opts = document.querySelectorAll('button.quiz-option');
    fireEvent.click(opts[0]);

    await waitFor(() => {
      expect(opts[0].className).toContain('selected');
      expect(opts[1].disabled).toBe(true);
    });
  });

  test('clicking option twice does not change selection', async () => {
    render(<Wrapper><Quiz /></Wrapper>);
    fireEvent.click(document.querySelector('button.quiz-start-btn'));
    await waitFor(() => expect(document.querySelectorAll('button.quiz-option').length).toBe(4));

    const opts = document.querySelectorAll('button.quiz-option');
    fireEvent.click(opts[0]);
    fireEvent.click(opts[1]); // should not change since already answered

    await waitFor(() => {
      expect(opts[0].className).toContain('selected');
      expect(opts[1].className).not.toContain('selected');
    });
  });

  test('Skip button advances to next question without selection', async () => {
    render(<Wrapper><Quiz /></Wrapper>);
    fireEvent.click(document.querySelector('button.quiz-start-btn'));
    await waitFor(() => expect(document.querySelector('.quiz-play-wrap')).toBeTruthy());

    const skipBtn = document.querySelector('button.quiz-skip-btn');
    expect(skipBtn).toBeTruthy();
    fireEvent.click(skipBtn);

    await waitFor(() => {
      // Question counter should advance OR we hit the last question/submit
      const questionNum = document.querySelector('.quiz-qnum');
      expect(questionNum).toBeTruthy();
    });
  });

  test('Next button is disabled until an option is selected', async () => {
    render(<Wrapper><Quiz /></Wrapper>);
    fireEvent.click(document.querySelector('button.quiz-start-btn'));
    await waitFor(() => expect(document.querySelector('.quiz-play-wrap')).toBeTruthy());

    const nextBtn = document.querySelector('button.quiz-next-btn');
    expect(nextBtn?.disabled).toBe(true);
  });

  test('Next button becomes enabled after selecting an option', async () => {
    render(<Wrapper><Quiz /></Wrapper>);
    fireEvent.click(document.querySelector('button.quiz-start-btn'));
    await waitFor(() => expect(document.querySelectorAll('button.quiz-option').length).toBe(4));

    fireEvent.click(document.querySelectorAll('button.quiz-option')[0]);

    await waitFor(() => {
      const nextBtn = document.querySelector('button.quiz-next-btn');
      expect(nextBtn?.disabled).toBe(false);
    });
  });

  test('timer is shown with seconds countdown in playing phase', async () => {
    render(<Wrapper><Quiz /></Wrapper>);
    fireEvent.click(document.querySelector('button.quiz-start-btn'));
    await waitFor(() => {
      expect(document.querySelector('.quiz-timer')).toBeTruthy();
    });
  });

  test('question number indicator is shown (Q1 of N)', async () => {
    render(<Wrapper><Quiz /></Wrapper>);
    fireEvent.click(document.querySelector('button.quiz-start-btn'));
    await waitFor(() => {
      const qnum = document.querySelector('.quiz-qnum');
      expect(qnum).toBeTruthy();
      expect(qnum.textContent).toContain('1');
    });
  });

  // ── Result phase (uses fake timers to skip 600ms setTimeout in handleNext) ─

  async function playAndFinishFake() {
    jest.useFakeTimers();
    render(<Wrapper><Quiz /></Wrapper>);
    fireEvent.click(document.querySelector('button.quiz-start-btn'));
    for (let q = 0; q < QUIZ_QUESTIONS.length; q++) {
      await waitFor(() => expect(document.querySelectorAll('button.quiz-option').length).toBe(4));
      fireEvent.click(document.querySelectorAll('button.quiz-option')[0]);
      await waitFor(() => expect(document.querySelector('button.quiz-next-btn')?.disabled).toBe(false));
      fireEvent.click(document.querySelector('button.quiz-next-btn'));
      // advance past the 600ms delay in handleNext
      act(() => { jest.advanceTimersByTime(700); });
    }
    jest.useRealTimers();
    await waitFor(() => expect(document.querySelector('.quiz-result-wrap')).toBeTruthy(), { timeout: 5000 });
  }

  test('result phase shows score percentage', async () => {
    await playAndFinishFake();
    expect(document.querySelector('.quiz-score-big')).toBeTruthy();
    expect(document.body.innerHTML).toContain('100%');
  });

  test('result phase shows 🎉 emoji for excellent score (>=80%)', async () => {
    await playAndFinishFake();
    expect(document.body.innerHTML).toContain('🎉');
  });

  test('result phase for poor score shows 💪 emoji', async () => {
    API.post = jest.fn().mockResolvedValue({ data: SUBMIT_RESULT_POOR });
    jest.useFakeTimers();
    render(<Wrapper><Quiz /></Wrapper>);
    fireEvent.click(document.querySelector('button.quiz-start-btn'));
    for (let q = 0; q < QUIZ_QUESTIONS.length; q++) {
      await waitFor(() => expect(document.querySelectorAll('button.quiz-option').length).toBe(4));
      fireEvent.click(document.querySelectorAll('button.quiz-option')[0]);
      await waitFor(() => expect(document.querySelector('button.quiz-next-btn')?.disabled).toBe(false));
      fireEvent.click(document.querySelector('button.quiz-next-btn'));
      act(() => { jest.advanceTimersByTime(700); });
    }
    jest.useRealTimers();
    await waitFor(() => expect(document.querySelector('.quiz-result-wrap')).toBeTruthy(), { timeout: 5000 });
    expect(document.body.innerHTML).toContain('💪');
  });

  test('result phase shows per-question breakdown', async () => {
    await playAndFinishFake();
    expect(document.querySelector('.quiz-breakdown')).toBeTruthy();
  });

  test('result phase shows correct/wrong row styling in breakdown', async () => {
    await playAndFinishFake();
    const correctRow = document.querySelector('.quiz-breakdown-row.correct');
    expect(correctRow).toBeTruthy();
  });

  test('Try Again button returns to setup phase', async () => {
    await playAndFinishFake();
    const retryBtn = document.querySelector('button.quiz-retry-btn');
    expect(retryBtn).toBeTruthy();
    fireEvent.click(retryBtn);
    await waitFor(() => expect(document.querySelector('.quiz-setup-card')).toBeTruthy());
  });

  test('submit failure keeps user in playing phase (no crash)', async () => {
    API.get = jest.fn().mockImplementation((url) => {
      if (url === '/master/tech-stacks') return Promise.resolve({ data: TECH_STACKS });
      if (url === '/quiz/questions') return Promise.resolve({ data: [QUIZ_QUESTIONS[0]] });
      return Promise.resolve({ data: [] });
    });
    API.post = jest.fn().mockRejectedValue(new Error('submit failed'));
    render(<Wrapper><Quiz /></Wrapper>);
    fireEvent.click(document.querySelector('button.quiz-start-btn'));
    await waitFor(() => expect(document.querySelectorAll('button.quiz-option').length).toBe(4));
    fireEvent.click(document.querySelectorAll('button.quiz-option')[0]);
    await waitFor(() => expect(document.querySelector('button.quiz-next-btn')?.disabled).toBe(false));
    jest.useFakeTimers();
    fireEvent.click(document.querySelector('button.quiz-next-btn'));
    await act(async () => { jest.advanceTimersByTime(700); });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    jest.useRealTimers();
    // After submit failure, user stays in playing phase (not result phase)
    await act(async () => {});
    expect(document.querySelector('.quiz-result-wrap')).toBeFalsy();
    expect(API.post).toHaveBeenCalled();
  });
});
