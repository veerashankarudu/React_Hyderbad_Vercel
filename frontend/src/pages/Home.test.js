import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import API from '../api';
import { useSearchParams } from 'react-router-dom';

// ─── Core mocks ─────────────────────────────────────────────────────────────

jest.mock('../api');

jest.mock('../AuthContext', () => ({
  useAuth: () => ({
    user: { fullName: 'Test User', role: 'SME', enterpriseId: 'test.user' },
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

// Navbar is a heavy component with its own API calls — replace with a stub
jest.mock('../components/Navbar', () => () => null);

// useContentTranslation does async AI translation — just pass texts through
jest.mock('../hooks/useContentTranslation', () => ({
  useContentTranslation: (texts) => texts,
}));

// Override the auto-mock so useSearchParams is a configurable jest.fn()
jest.mock('react-router-dom', () => {
  const React = require('react');
  return {
    MemoryRouter:  ({ children }) => React.createElement('div', null, children),
    Navigate:      ({ to })       => React.createElement('div', { 'data-testid': 'navigate', 'data-to': to }),
    Route:         ({ element })  => element,
    Routes:        ({ children }) => React.createElement('div', null, children),
    BrowserRouter: ({ children }) => React.createElement('div', null, children),
    Link:          ({ children, to }) => React.createElement('a', { href: to }, children),
    NavLink:       ({ children, to }) => React.createElement('a', { href: to }, children),
    Outlet:        ()             => null,
    useNavigate:   jest.fn(()    => jest.fn()),
    useLocation:   jest.fn(()    => ({ pathname: '/', search: '', hash: '', state: null })),
    useParams:     jest.fn(()    => ({})),
    useSearchParams: jest.fn(()  => [new URLSearchParams(), jest.fn()]),
  };
});

// ─── Page imports (must come after jest.mock declarations) ──────────────────

import Home          from './Home';
import Register      from './Register';
import ForgotPassword from './ForgotPassword';
import ResetPassword  from './ResetPassword';

// ─── Helper ─────────────────────────────────────────────────────────────────

const Wrapper = ({ children }) => (
  <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
);

// ═══════════════════════════════════════════════════════════════════════════
// Home Page
// ═══════════════════════════════════════════════════════════════════════════

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    API.get  = jest.fn().mockResolvedValue({ data: [] });
    API.post = jest.fn().mockResolvedValue({ data: {} });
  });

  test('renders without crashing', async () => {
    render(<Wrapper><Home /></Wrapper>);
    await waitFor(() => expect(document.body.innerHTML.length).toBeGreaterThan(0));
  });

  test("shows the signed-in user's first name in the greeting", async () => {
    render(<Wrapper><Home /></Wrapper>);
    await waitFor(() => {
      expect(document.body.textContent).toContain('Test');
    });
  });

  test('calls /stats/summary on mount', async () => {
    render(<Wrapper><Home /></Wrapper>);
    await waitFor(() => {
      expect(API.get).toHaveBeenCalledWith('/stats/summary');
    });
  });

  test('calls all four stats endpoints on mount', async () => {
    render(<Wrapper><Home /></Wrapper>);
    await waitFor(() => {
      expect(API.get).toHaveBeenCalledWith('/stats/summary');
      expect(API.get).toHaveBeenCalledWith('/stats/by-tech-stack');
      expect(API.get).toHaveBeenCalledWith('/stats/recent-activity');
      expect(API.get).toHaveBeenCalledWith('/stats/leaderboard');
    });
  });

  test('displays summary count from API in stat cards', async () => {
    API.get = jest.fn().mockImplementation((url) => {
      if (url === '/stats/summary')
        return Promise.resolve({ data: { totalMcqs: 42, approved: 20, inReview: 10, rejected: 5, draft: 7 } });
      return Promise.resolve({ data: [] });
    });
    render(<Wrapper><Home /></Wrapper>);
    await waitFor(() => {
      expect(document.body.textContent).toContain('42');
    });
  });

  test('renders action buttons for creating MCQs', async () => {
    render(<Wrapper><Home /></Wrapper>);
    await waitFor(() => {
      const buttons = document.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  test('shows leaderboard entries returned from API', async () => {
    API.get = jest.fn().mockImplementation((url) => {
      if (url === '/stats/leaderboard')
        return Promise.resolve({ data: [{ enterpriseId: 'alice.b', fullName: 'Alice B', count: 99 }] });
      return Promise.resolve({ data: [] });
    });
    render(<Wrapper><Home /></Wrapper>);
    await waitFor(() => {
      expect(document.body.textContent).toContain('Alice B');
    });
  });

  test('shows recent-activity items returned from API', async () => {
    API.get = jest.fn().mockImplementation((url) => {
      if (url === '/stats/recent-activity')
        return Promise.resolve({ data: [{ questionStem: 'What is dependency injection?', techStack: 'Spring Boot', status: 'APPROVED' }] });
      return Promise.resolve({ data: [] });
    });
    render(<Wrapper><Home /></Wrapper>);
    await waitFor(() => {
      expect(document.body.textContent).toContain('What is dependency injection?');
    });
  });

  test('does not crash when all stats APIs reject', async () => {
    API.get = jest.fn().mockRejectedValue(new Error('Network Error'));
    render(<Wrapper><Home /></Wrapper>);
    await waitFor(() => {
      // Page still renders — loading spinner goes away even on failure
      expect(document.body.innerHTML).toBeTruthy();
    });
  });

  test('renders the AI showcase banner section', async () => {
    render(<Wrapper><Home /></Wrapper>);
    await waitFor(() => {
      // The banner contains the AI robot emoji in the page
      expect(document.body.innerHTML).toContain('🤖');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Register Page
// ═══════════════════════════════════════════════════════════════════════════

describe('Register Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    API.get  = jest.fn().mockResolvedValue({ data: [] });
    API.post = jest.fn().mockResolvedValue({ data: {} });
  });

  test('renders without crashing', () => {
    render(<Wrapper><Register /></Wrapper>);
    expect(document.body.innerHTML).toBeTruthy();
  });

  test('renders enterprise ID input', () => {
    render(<Wrapper><Register /></Wrapper>);
    expect(document.querySelector('#enterpriseId')).toBeTruthy();
  });

  test('renders full name input', () => {
    render(<Wrapper><Register /></Wrapper>);
    expect(document.querySelector('#fullName')).toBeTruthy();
  });

  test('renders email input', () => {
    render(<Wrapper><Register /></Wrapper>);
    expect(document.querySelector('#email')).toBeTruthy();
  });

  test('renders two password inputs', () => {
    render(<Wrapper><Register /></Wrapper>);
    const pwdInputs = document.querySelectorAll('input[type="password"]');
    expect(pwdInputs.length).toBeGreaterThanOrEqual(2);
  });

  test('fetches tech stacks from /master/tech-stacks on mount', async () => {
    render(<Wrapper><Register /></Wrapper>);
    await waitFor(() => {
      expect(API.get).toHaveBeenCalledWith('/master/tech-stacks');
    });
  });

  test('shows tech stack chips when API returns stacks', async () => {
    API.get = jest.fn().mockResolvedValue({ data: [{ id: 1, name: 'React' }, { id: 2, name: 'Java' }] });
    render(<Wrapper><Register /></Wrapper>);
    await waitFor(() => {
      expect(document.body.textContent).toContain('React');
      expect(document.body.textContent).toContain('Java');
    });
  });

  test('renders a link back to the login page', () => {
    render(<Wrapper><Register /></Wrapper>);
    expect(document.querySelector('a[href="/login"]')).toBeTruthy();
  });

  test('shows an error when passwords do not match', async () => {
    render(<Wrapper><Register /></Wrapper>);
    fireEvent.change(document.querySelector('#enterpriseId'),    { target: { value: 'john.doe' } });
    fireEvent.change(document.querySelector('#fullName'),        { target: { value: 'John Doe' } });
    fireEvent.change(document.querySelector('#email'),           { target: { value: 'john@test.com' } });
    fireEvent.change(document.querySelector('#password'),        { target: { value: 'Pass1234' } });
    fireEvent.change(document.querySelector('#confirmPassword'), { target: { value: 'Different9' } });
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => {
      const err = document.querySelector('.login-error');
      expect(err || screen.queryByText(/passwords do not match/i)).toBeTruthy();
    });
  });

  test('shows an error when password is shorter than 8 characters', async () => {
    render(<Wrapper><Register /></Wrapper>);
    fireEvent.change(document.querySelector('#password'),        { target: { value: 'Ab1' } });
    fireEvent.change(document.querySelector('#confirmPassword'), { target: { value: 'Ab1' } });
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => {
      const err = document.querySelector('.login-error');
      expect(err || screen.queryByText(/at least 8/i)).toBeTruthy();
    });
  });

  test('shows an error when password has no letter+number mix', async () => {
    render(<Wrapper><Register /></Wrapper>);
    // 8 digits-only: passes length but fails alphanumeric check
    fireEvent.change(document.querySelector('#password'),        { target: { value: '12345678' } });
    fireEvent.change(document.querySelector('#confirmPassword'), { target: { value: '12345678' } });
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => {
      const err = document.querySelector('.login-error');
      expect(err || screen.queryByText(/letter.*number|number.*letter/i)).toBeTruthy();
    });
  });

  test('shows an error when no tech stack is selected', async () => {
    // No tech stacks returned so the user cannot select any
    API.get = jest.fn().mockResolvedValue({ data: [] });
    render(<Wrapper><Register /></Wrapper>);
    fireEvent.change(document.querySelector('#enterpriseId'),    { target: { value: 'john.doe' } });
    fireEvent.change(document.querySelector('#fullName'),        { target: { value: 'John Doe' } });
    fireEvent.change(document.querySelector('#email'),           { target: { value: 'john@test.com' } });
    fireEvent.change(document.querySelector('#password'),        { target: { value: 'Pass1234' } });
    fireEvent.change(document.querySelector('#confirmPassword'), { target: { value: 'Pass1234' } });
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => {
      const err = document.querySelector('.login-error');
      expect(err || screen.queryByText(/tech stack/i)).toBeTruthy();
    });
  });

  test('calls API.post /auth/register with form data on valid submit', async () => {
    API.get = jest.fn().mockResolvedValue({ data: [{ id: 7, name: 'Spring Boot' }] });
    render(<Wrapper><Register /></Wrapper>);

    // Wait for chip to appear then select it
    await waitFor(() => expect(document.querySelector('.reg-stack-chip')).toBeTruthy());
    fireEvent.click(document.querySelector('.reg-stack-chip'));

    fireEvent.change(document.querySelector('#enterpriseId'),    { target: { value: 'john.doe' } });
    fireEvent.change(document.querySelector('#fullName'),        { target: { value: 'John Doe' } });
    fireEvent.change(document.querySelector('#email'),           { target: { value: 'john@test.com' } });
    fireEvent.change(document.querySelector('#password'),        { target: { value: 'Pass1234' } });
    fireEvent.change(document.querySelector('#confirmPassword'), { target: { value: 'Pass1234' } });
    fireEvent.submit(document.querySelector('form'));

    await waitFor(() => {
      expect(API.post).toHaveBeenCalledWith('/auth/register', expect.objectContaining({
        enterpriseId: 'john.doe',
        fullName:     'John Doe',
        email:        'john@test.com',
        password:     'Pass1234',
        techStackIds: [7],
      }));
    });
  });

  test('shows pending-approval success state after registration', async () => {
    API.get  = jest.fn().mockResolvedValue({ data: [{ id: 7, name: 'Spring Boot' }] });
    API.post = jest.fn().mockResolvedValue({ data: {} });
    render(<Wrapper><Register /></Wrapper>);

    await waitFor(() => expect(document.querySelector('.reg-stack-chip')).toBeTruthy());
    fireEvent.click(document.querySelector('.reg-stack-chip'));

    fireEvent.change(document.querySelector('#enterpriseId'),    { target: { value: 'john.doe' } });
    fireEvent.change(document.querySelector('#fullName'),        { target: { value: 'John Doe' } });
    fireEvent.change(document.querySelector('#email'),           { target: { value: 'john@test.com' } });
    fireEvent.change(document.querySelector('#password'),        { target: { value: 'Pass1234' } });
    fireEvent.change(document.querySelector('#confirmPassword'), { target: { value: 'Pass1234' } });
    fireEvent.submit(document.querySelector('form'));

    await waitFor(() => {
      // Submitted state shows pending-approval messaging and a link back to login
      expect(document.querySelector('a[href="/login"]')).toBeTruthy();
      expect(document.body.textContent.toLowerCase()).toMatch(/pending|submitted|approval/);
    });
  });

  test('shows API error message on registration failure', async () => {
    API.get  = jest.fn().mockResolvedValue({ data: [{ id: 7, name: 'Spring Boot' }] });
    API.post = jest.fn().mockRejectedValue({
      response: { data: { message: 'Enterprise ID already exists' } },
    });
    render(<Wrapper><Register /></Wrapper>);

    await waitFor(() => expect(document.querySelector('.reg-stack-chip')).toBeTruthy());
    fireEvent.click(document.querySelector('.reg-stack-chip'));

    fireEvent.change(document.querySelector('#enterpriseId'),    { target: { value: 'john.doe' } });
    fireEvent.change(document.querySelector('#fullName'),        { target: { value: 'John Doe' } });
    fireEvent.change(document.querySelector('#email'),           { target: { value: 'john@test.com' } });
    fireEvent.change(document.querySelector('#password'),        { target: { value: 'Pass1234' } });
    fireEvent.change(document.querySelector('#confirmPassword'), { target: { value: 'Pass1234' } });
    fireEvent.submit(document.querySelector('form'));

    await waitFor(() => {
      const err = document.querySelector('.login-error');
      expect(err?.textContent || screen.queryByText(/Enterprise ID already exists/i)?.textContent)
        .toMatch(/Enterprise ID already exists/i);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ForgotPassword Page
// ═══════════════════════════════════════════════════════════════════════════

describe('ForgotPassword Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    API.get  = jest.fn().mockResolvedValue({ data: [] });
    API.post = jest.fn().mockResolvedValue({ data: {} });
  });

  test('renders without crashing', () => {
    render(<Wrapper><ForgotPassword /></Wrapper>);
    expect(document.body.innerHTML).toBeTruthy();
  });

  test('renders a text input for the identifier', () => {
    render(<Wrapper><ForgotPassword /></Wrapper>);
    expect(document.querySelector('input[type="text"]')).toBeTruthy();
  });

  test('renders a submit button', () => {
    render(<Wrapper><ForgotPassword /></Wrapper>);
    expect(document.querySelector('button[type="submit"]')).toBeTruthy();
  });

  test('submit button is disabled when the input is empty', () => {
    render(<Wrapper><ForgotPassword /></Wrapper>);
    expect(document.querySelector('button[type="submit"]').disabled).toBe(true);
  });

  test('submit button becomes enabled after typing', () => {
    render(<Wrapper><ForgotPassword /></Wrapper>);
    const input = document.querySelector('input[type="text"]');
    fireEvent.change(input, { target: { value: 'john.doe' } });
    expect(document.querySelector('button[type="submit"]').disabled).toBe(false);
  });

  test('calls API.post with enterpriseId when identifier has no @ symbol', async () => {
    render(<Wrapper><ForgotPassword /></Wrapper>);
    fireEvent.change(document.querySelector('input[type="text"]'), { target: { value: 'john.doe' } });
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => {
      expect(API.post).toHaveBeenCalledWith('/auth/forgot-password', { enterpriseId: 'john.doe' });
    });
  });

  test('calls API.post with email when identifier contains @', async () => {
    render(<Wrapper><ForgotPassword /></Wrapper>);
    fireEvent.change(document.querySelector('input[type="text"]'), { target: { value: 'john@accenture.com' } });
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => {
      expect(API.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'john@accenture.com' });
    });
  });

  test('shows "check your email" success state after a successful submit', async () => {
    API.post = jest.fn().mockResolvedValue({ data: {} });
    render(<Wrapper><ForgotPassword /></Wrapper>);
    fireEvent.change(document.querySelector('input[type="text"]'), { target: { value: 'john.doe' } });
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => {
      // Sent state shows 📬 or "check" in heading
      expect(document.body.innerHTML).toContain('📬');
    });
  });

  test('shows the identifier in the success state message', async () => {
    API.post = jest.fn().mockResolvedValue({ data: {} });
    render(<Wrapper><ForgotPassword /></Wrapper>);
    fireEvent.change(document.querySelector('input[type="text"]'), { target: { value: 'jane.smith' } });
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => {
      expect(document.body.textContent).toContain('jane.smith');
    });
  });

  test('shows an error message when the API call fails', async () => {
    API.post = jest.fn().mockRejectedValue({
      response: { data: { message: 'User not found' } },
    });
    render(<Wrapper><ForgotPassword /></Wrapper>);
    fireEvent.change(document.querySelector('input[type="text"]'), { target: { value: 'unknown.user' } });
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => {
      const err = document.querySelector('.login-error');
      expect(err || screen.queryByText(/User not found/i)).toBeTruthy();
    });
  });

  test('renders a "back to login" link', () => {
    render(<Wrapper><ForgotPassword /></Wrapper>);
    expect(document.querySelector('a[href="/login"]')).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ResetPassword Page — no token in URL
// ═══════════════════════════════════════════════════════════════════════════

describe('ResetPassword Page – no token', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSearchParams.mockReturnValue([new URLSearchParams(), jest.fn()]);
    API.get  = jest.fn().mockResolvedValue({ data: [] });
    API.post = jest.fn().mockResolvedValue({ data: {} });
  });

  test('renders the invalid-link state when token is absent', () => {
    render(<Wrapper><ResetPassword /></Wrapper>);
    expect(document.body.textContent).toMatch(/invalid|expired|link/i);
  });

  test('shows a link to /forgot-password to request a new reset link', () => {
    render(<Wrapper><ResetPassword /></Wrapper>);
    expect(document.querySelector('a[href="/forgot-password"]')).toBeTruthy();
  });

  test('does not render password input fields in the no-token state', () => {
    render(<Wrapper><ResetPassword /></Wrapper>);
    expect(document.querySelectorAll('input[type="password"]').length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ResetPassword Page — valid token present
// ═══════════════════════════════════════════════════════════════════════════

describe('ResetPassword Page – with token', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSearchParams.mockReturnValue([new URLSearchParams({ token: 'valid-reset-token-abc' }), jest.fn()]);
    API.get  = jest.fn().mockResolvedValue({ data: [] });
    API.post = jest.fn().mockResolvedValue({ data: {} });
  });

  test('renders the reset-password form when token is present', () => {
    render(<Wrapper><ResetPassword /></Wrapper>);
    expect(document.querySelectorAll('input[type="password"]').length).toBeGreaterThanOrEqual(2);
  });

  test('renders a submit button', () => {
    render(<Wrapper><ResetPassword /></Wrapper>);
    expect(document.querySelector('button[type="submit"]')).toBeTruthy();
  });

  test('submit button is disabled when both password inputs are empty', () => {
    render(<Wrapper><ResetPassword /></Wrapper>);
    expect(document.querySelector('button[type="submit"]').disabled).toBe(true);
  });

  test('shows error when the new password is fewer than 6 characters', async () => {
    render(<Wrapper><ResetPassword /></Wrapper>);
    const [pwd, confirm] = document.querySelectorAll('input[type="password"]');
    fireEvent.change(pwd,     { target: { value: 'ab1' } });
    fireEvent.change(confirm, { target: { value: 'ab1' } });
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => {
      const err = document.querySelector('.login-error');
      expect(err || screen.queryByText(/short|6/i)).toBeTruthy();
    });
  });

  test('shows error when passwords do not match', async () => {
    render(<Wrapper><ResetPassword /></Wrapper>);
    const [pwd, confirm] = document.querySelectorAll('input[type="password"]');
    fireEvent.change(pwd,     { target: { value: 'Password123' } });
    fireEvent.change(confirm, { target: { value: 'Different456' } });
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => {
      const err = document.querySelector('.login-error');
      expect(err || screen.queryByText(/match|mismatch/i)).toBeTruthy();
    });
  });

  test('calls API.post /auth/reset-password with token and new password', async () => {
    render(<Wrapper><ResetPassword /></Wrapper>);
    const [pwd, confirm] = document.querySelectorAll('input[type="password"]');
    fireEvent.change(pwd,     { target: { value: 'NewPass99' } });
    fireEvent.change(confirm, { target: { value: 'NewPass99' } });
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => {
      expect(API.post).toHaveBeenCalledWith('/auth/reset-password', {
        token:       'valid-reset-token-abc',
        newPassword: 'NewPass99',
      });
    });
  });

  test('shows a success confirmation after the password is reset', async () => {
    render(<Wrapper><ResetPassword /></Wrapper>);
    const [pwd, confirm] = document.querySelectorAll('input[type="password"]');
    fireEvent.change(pwd,     { target: { value: 'NewPass99' } });
    fireEvent.change(confirm, { target: { value: 'NewPass99' } });
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => {
      expect(document.body.textContent.toLowerCase()).toMatch(/success|password.*reset|reset.*success/);
    });
  });

  test('shows API error message on reset failure', async () => {
    API.post = jest.fn().mockRejectedValue({
      response: { data: { message: 'Token has expired' } },
    });
    render(<Wrapper><ResetPassword /></Wrapper>);
    const [pwd, confirm] = document.querySelectorAll('input[type="password"]');
    fireEvent.change(pwd,     { target: { value: 'NewPass99' } });
    fireEvent.change(confirm, { target: { value: 'NewPass99' } });
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => {
      const err = document.querySelector('.login-error');
      expect(err?.textContent || screen.queryByText(/Token has expired/i)?.textContent)
        .toMatch(/Token has expired/i);
    });
  });

  test('success state contains a link to the login page', async () => {
    render(<Wrapper><ResetPassword /></Wrapper>);
    const [pwd, confirm] = document.querySelectorAll('input[type="password"]');
    fireEvent.change(pwd,     { target: { value: 'NewPass99' } });
    fireEvent.change(confirm, { target: { value: 'NewPass99' } });
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => {
      expect(document.querySelector('a[href="/login"]')).toBeTruthy();
    });
  });
});
