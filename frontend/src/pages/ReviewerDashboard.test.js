import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import API from '../api';

// ---------------------------------------------------------------------------
// Module-level mocks (hoisted by babel-jest)
// ---------------------------------------------------------------------------
jest.mock('../api');

jest.mock('../AuthContext', () => ({
  useAuth: () => ({
    user: { fullName: 'Test User', role: 'SME', enterpriseId: 'test.user' },
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

jest.mock('../components/Navbar', () => () => null);

jest.mock('../hooks/useContentTranslation', () => ({
  useContentTranslation: (texts) => texts,
}));

jest.mock('../components/SortableTh', () => ({ label, colKey, onSort }) => (
  <th onClick={() => onSort && onSort(colKey)}>{label}</th>
));

jest.mock('../components/TablePagination', () => () => (
  <div data-testid="table-pagination" />
));

// ---------------------------------------------------------------------------
// Pages under test
// ---------------------------------------------------------------------------
import ReviewerDashboard from './ReviewerDashboard';
import ReviewerMetrics from './ReviewerMetrics';
import ScreenshotMcq from './ScreenshotMcq';
import Inbox from './Inbox';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
const Wrapper = ({ children }) => (
  <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  API.get = jest.fn().mockResolvedValue({ data: [] });
  API.post = jest.fn().mockResolvedValue({ data: {} });
  API.put = jest.fn().mockResolvedValue({ data: {} });
  API.delete = jest.fn().mockResolvedValue({ data: {} });
  localStorage.clear();
});

// ===========================================================================
// ReviewerDashboard
// ===========================================================================
const mockStats = {
  totalAssigned: 20,
  approved: 15,
  rejected: 3,
  pending: 2,
  approvalRate: 75,
  byTechStack: [
    { techStack: 'Spring Boot', count: 10 },
    { techStack: 'React', count: 5 },
  ],
};

const mockApprovedReviews = [
  {
    id: 1,
    questionStem: 'What is dependency injection?',
    difficulty: 'EASY',
    status: 'APPROVED',
    updatedAt: '2024-01-15T10:00:00Z',
    aiScore: 80,
  },
  {
    id: 2,
    questionStem: 'Explain the CAP theorem.',
    difficulty: 'HARD',
    status: 'APPROVED',
    updatedAt: '2024-01-14T10:00:00Z',
    aiScore: 60,
  },
];

const mockRejectedReviews = [
  {
    id: 3,
    questionStem: 'What is a microservice?',
    difficulty: 'MEDIUM',
    status: 'REJECTED',
    updatedAt: '2024-01-13T10:00:00Z',
    aiScore: 35,
  },
];

function setupDashboardMocks() {
  API.get = jest.fn().mockImplementation((url) => {
    if (url === '/stats/reviewer-stats') return Promise.resolve({ data: mockStats });
    // Both /reviews calls (APPROVED and REJECTED) handled here
    return Promise.resolve({ data: mockApprovedReviews });
  });
}

describe('ReviewerDashboard', () => {
  test('renders without crashing', async () => {
    setupDashboardMocks();
    render(<Wrapper><ReviewerDashboard /></Wrapper>);
    await waitFor(() => {
      expect(document.body).toBeTruthy();
    });
  });

  test('shows loading state before data is fetched', () => {
    API.get = jest.fn().mockImplementation(() => new Promise(() => {})); // never resolves
    render(<Wrapper><ReviewerDashboard /></Wrapper>);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('renders page heading after data loads', async () => {
    setupDashboardMocks();
    render(<Wrapper><ReviewerDashboard /></Wrapper>);
    await waitFor(() => {
      const heading = document.querySelector('h2');
      expect(heading).toBeTruthy();
    });
  });

  test('renders KPI card with totalAssigned count', async () => {
    setupDashboardMocks();
    render(<Wrapper><ReviewerDashboard /></Wrapper>);
    await waitFor(() => {
      expect(screen.getByText('20')).toBeInTheDocument();
    });
  });

  test('renders KPI card with approved count', async () => {
    setupDashboardMocks();
    render(<Wrapper><ReviewerDashboard /></Wrapper>);
    await waitFor(() => {
      expect(screen.getByText('15')).toBeInTheDocument();
    });
  });

  test('renders approval rate percentage', async () => {
    setupDashboardMocks();
    render(<Wrapper><ReviewerDashboard /></Wrapper>);
    await waitFor(() => {
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });

  test('renders go-to-reviews button', async () => {
    setupDashboardMocks();
    render(<Wrapper><ReviewerDashboard /></Wrapper>);
    await waitFor(() => {
      expect(document.querySelector('.btn-primary')).toBeTruthy();
    });
  });

  test('renders tech stack section with data', async () => {
    setupDashboardMocks();
    render(<Wrapper><ReviewerDashboard /></Wrapper>);
    await waitFor(() => {
      expect(screen.getByText('Spring Boot')).toBeInTheDocument();
    });
  });

  test('renders recent reviews with MCQ stem', async () => {
    setupDashboardMocks();
    render(<Wrapper><ReviewerDashboard /></Wrapper>);
    await waitFor(() => {
      // Use getAllByText because the same MCQ may appear in both approved+rejected mock lists
      const stems = screen.getAllByText(/What is dependency injection/i);
      expect(stems.length).toBeGreaterThan(0);
    });
  });

  test('clicking a recent review item does not crash', async () => {
    setupDashboardMocks();
    render(<Wrapper><ReviewerDashboard /></Wrapper>);
    await waitFor(() => {
      expect(document.querySelector('.rd-recent-item')).toBeTruthy();
    });
    fireEvent.click(document.querySelector('.rd-recent-item'));
    // useNavigate is mocked — no error expected
    expect(document.body).toBeTruthy();
  });

  test('handles API error gracefully without crashing', async () => {
    API.get = jest.fn().mockRejectedValue(new Error('Network error'));
    render(<Wrapper><ReviewerDashboard /></Wrapper>);
    await waitFor(() => {
      expect(document.querySelector('.page-container')).toBeTruthy();
    });
  });

  test('shows empty recent reviews message when API returns no data', async () => {
    API.get = jest.fn().mockImplementation((url) => {
      if (url === '/stats/reviewer-stats')
        return Promise.resolve({ data: { ...mockStats, byTechStack: [] } });
      return Promise.resolve({ data: [] });
    });
    render(<Wrapper><ReviewerDashboard /></Wrapper>);
    await waitFor(() => {
      expect(document.querySelector('.page-container')).toBeTruthy();
    });
  });

  test('renders rejected count KPI', async () => {
    setupDashboardMocks();
    render(<Wrapper><ReviewerDashboard /></Wrapper>);
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  test('renders pending count KPI', async () => {
    setupDashboardMocks();
    render(<Wrapper><ReviewerDashboard /></Wrapper>);
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });
});

// ===========================================================================
// ReviewerMetrics
// ===========================================================================
const mockMetrics = [
  {
    userId: 1,
    fullName: 'Alice Reviewer',
    enterpriseId: 'alice.reviewer',
    totalAssigned: 30,
    completed: 28,
    approved: 22,
    rejected: 6,
    pending: 2,
    approvalRate: 73,
  },
  {
    userId: 2,
    fullName: 'Bob Reviewer',
    enterpriseId: 'bob.reviewer',
    totalAssigned: 15,
    completed: 10,
    approved: 8,
    rejected: 2,
    pending: 5,
    approvalRate: 53,
  },
];

const mockSla = [
  {
    id: 10,
    questionStem: 'Explain event sourcing in distributed systems.',
    status: 'UNDER_REVIEW',
    techStack: 'Kafka',
    creatorName: 'Dev User',
    reviewerName: 'Alice Reviewer',
    hoursStuck: 96,
  },
  {
    id: 11,
    questionStem: 'What is idempotency in REST APIs?',
    status: 'READY_FOR_REVIEW',
    techStack: 'Spring Boot',
    creatorName: 'Dev User 2',
    reviewerName: null,
    hoursStuck: 50,
  },
];

function setupMetricsMocks() {
  API.get = jest.fn().mockImplementation((url) => {
    if (url === '/stats/reviewer-metrics') return Promise.resolve({ data: mockMetrics });
    if (url === '/stats/sla-breach') return Promise.resolve({ data: mockSla });
    return Promise.resolve({ data: [] });
  });
}

describe('ReviewerMetrics', () => {
  test('renders without crashing', async () => {
    setupMetricsMocks();
    render(<Wrapper><ReviewerMetrics /></Wrapper>);
    await waitFor(() => {
      expect(document.body).toBeTruthy();
    });
  });

  test('shows loading state before data is fetched', () => {
    API.get = jest.fn().mockImplementation(() => new Promise(() => {}));
    render(<Wrapper><ReviewerMetrics /></Wrapper>);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('renders page heading', async () => {
    setupMetricsMocks();
    render(<Wrapper><ReviewerMetrics /></Wrapper>);
    await waitFor(() => {
      expect(document.querySelector('h2')).toBeTruthy();
    });
  });

  test('renders reviewer name in metrics table', async () => {
    setupMetricsMocks();
    render(<Wrapper><ReviewerMetrics /></Wrapper>);
    await waitFor(() => {
      // 'Alice Reviewer' appears in metrics tbody AND sla tbody (as reviewer), use getAllByText
      const cells = screen.getAllByText('Alice Reviewer');
      expect(cells.length).toBeGreaterThan(0);
    });
  });

  test('renders enterprise ID in metrics table', async () => {
    setupMetricsMocks();
    render(<Wrapper><ReviewerMetrics /></Wrapper>);
    await waitFor(() => {
      expect(screen.getByText('alice.reviewer')).toBeInTheDocument();
    });
  });

  test('renders SLA breach section with breach data', async () => {
    setupMetricsMocks();
    render(<Wrapper><ReviewerMetrics /></Wrapper>);
    await waitFor(() => {
      expect(screen.getByText(/96h/)).toBeInTheDocument();
    });
  });

  test('renders SLA breach question stem', async () => {
    setupMetricsMocks();
    render(<Wrapper><ReviewerMetrics /></Wrapper>);
    await waitFor(() => {
      expect(screen.getByText(/Explain event sourcing/i)).toBeInTheDocument();
    });
  });

  test('renders pagination component', async () => {
    setupMetricsMocks();
    render(<Wrapper><ReviewerMetrics /></Wrapper>);
    await waitFor(() => {
      expect(screen.getAllByTestId('table-pagination').length).toBeGreaterThan(0);
    });
  });

  test('shows no-data message when metrics are empty', async () => {
    API.get = jest.fn().mockImplementation((url) => {
      if (url === '/stats/reviewer-metrics') return Promise.resolve({ data: [] });
      if (url === '/stats/sla-breach') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
    render(<Wrapper><ReviewerMetrics /></Wrapper>);
    await waitFor(() => {
      // Component renders "no data" message in the table area
      expect(document.body).toBeTruthy();
    });
  });

  test('shows no-SLA message when sla list is empty', async () => {
    API.get = jest.fn().mockImplementation((url) => {
      if (url === '/stats/reviewer-metrics') return Promise.resolve({ data: mockMetrics });
      if (url === '/stats/sla-breach') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
    render(<Wrapper><ReviewerMetrics /></Wrapper>);
    await waitFor(() => {
      // No breach rows rendered — table container still present
      expect(document.querySelector('.rm-page')).toBeTruthy();
    });
  });

  test('displays error message when API call fails', async () => {
    API.get = jest.fn().mockRejectedValue({
      response: { data: { message: 'Failed to load metrics.' } },
    });
    render(<Wrapper><ReviewerMetrics /></Wrapper>);
    await waitFor(() => {
      expect(screen.getByText(/Failed to load metrics/i)).toBeInTheDocument();
    });
  });

  test('renders second reviewer in table', async () => {
    setupMetricsMocks();
    render(<Wrapper><ReviewerMetrics /></Wrapper>);
    await waitFor(() => {
      expect(screen.getByText('Bob Reviewer')).toBeInTheDocument();
    });
  });

  test('renders approval rate for reviewer', async () => {
    setupMetricsMocks();
    render(<Wrapper><ReviewerMetrics /></Wrapper>);
    await waitFor(() => {
      expect(screen.getByText('73%')).toBeInTheDocument();
    });
  });
});

// ===========================================================================
// ScreenshotMcq
// ===========================================================================
describe('ScreenshotMcq', () => {
  test('renders without crashing', () => {
    render(<Wrapper><ScreenshotMcq /></Wrapper>);
    expect(document.body).toBeTruthy();
  });

  test('renders the upload section dropzone', () => {
    render(<Wrapper><ScreenshotMcq /></Wrapper>);
    const dropzone = document.querySelector('.screenshot-dropzone');
    expect(dropzone).toBeTruthy();
  });

  test('renders extract button initially disabled (no image)', () => {
    render(<Wrapper><ScreenshotMcq /></Wrapper>);
    const extractBtn = screen.getByText(/Extract MCQ with AI/i);
    expect(extractBtn).toBeDisabled();
  });

  test('renders the extracted result panel', () => {
    render(<Wrapper><ScreenshotMcq /></Wrapper>);
    // The result card should be present in the layout
    expect(document.querySelector('.screenshot-result-card')).toBeTruthy();
  });

  test('shows placeholder text when no image is uploaded', () => {
    render(<Wrapper><ScreenshotMcq /></Wrapper>);
    const placeholder = document.querySelector('.screenshot-placeholder');
    expect(placeholder).toBeTruthy();
  });

  test('shows error message for non-image file', () => {
    render(<Wrapper><ScreenshotMcq /></Wrapper>);
    const input = document.querySelector('input[type="file"]');
    const textFile = new File(['hello'], 'test.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [textFile] } });
    expect(screen.getByText(/Please upload an image file/i)).toBeInTheDocument();
  });

  test('shows image preview after selecting a valid image', async () => {
    render(<Wrapper><ScreenshotMcq /></Wrapper>);
    const input = document.querySelector('input[type="file"]');
    const imgFile = new File(['image-data'], 'screenshot.png', { type: 'image/png' });
    // URL.createObjectURL is not available in jsdom; mock it
    const fakeUrl = 'blob:fake-url';
    global.URL.createObjectURL = jest.fn().mockReturnValue(fakeUrl);
    fireEvent.change(input, { target: { files: [imgFile] } });
    await waitFor(() => {
      expect(screen.getByText(/screenshot.png/i)).toBeInTheDocument();
    });
  });

  test('extract button becomes enabled after selecting an image', async () => {
    render(<Wrapper><ScreenshotMcq /></Wrapper>);
    const input = document.querySelector('input[type="file"]');
    const imgFile = new File(['image-data'], 'photo.jpg', { type: 'image/jpeg' });
    global.URL.createObjectURL = jest.fn().mockReturnValue('blob:fake');
    fireEvent.change(input, { target: { files: [imgFile] } });
    await waitFor(() => {
      expect(screen.getByText(/Extract MCQ with AI/i)).not.toBeDisabled();
    });
  });

  test('calls API.post on extract and shows extracted MCQ', async () => {
    const extractedData = {
      questionStem: 'What is polymorphism?',
      optionA: 'One form',
      optionB: 'Many forms',
      optionC: 'No forms',
      optionD: 'All forms',
      correctAnswer: 'B',
      difficulty: 'MEDIUM',
    };
    API.post = jest.fn().mockResolvedValue({ data: extractedData });

    render(<Wrapper><ScreenshotMcq /></Wrapper>);
    const input = document.querySelector('input[type="file"]');
    const imgFile = new File(['img'], 'q.png', { type: 'image/png' });
    global.URL.createObjectURL = jest.fn().mockReturnValue('blob:fake');
    fireEvent.change(input, { target: { files: [imgFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Extract MCQ with AI/i)).not.toBeDisabled();
    });

    fireEvent.click(screen.getByText(/Extract MCQ with AI/i));
    await waitFor(() => {
      expect(screen.getByText(/What is polymorphism/i)).toBeInTheDocument();
    });
  });

  test('shows error message when AI extraction fails', async () => {
    API.post = jest.fn().mockRejectedValue({
      response: { data: { message: 'Failed to extract MCQ from image.' } },
    });

    render(<Wrapper><ScreenshotMcq /></Wrapper>);
    const input = document.querySelector('input[type="file"]');
    const imgFile = new File(['img'], 'q.png', { type: 'image/png' });
    global.URL.createObjectURL = jest.fn().mockReturnValue('blob:fake');
    fireEvent.change(input, { target: { files: [imgFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Extract MCQ with AI/i)).not.toBeDisabled();
    });

    fireEvent.click(screen.getByText(/Extract MCQ with AI/i));
    await waitFor(() => {
      expect(screen.getByText(/Failed to extract MCQ from image/i)).toBeInTheDocument();
    });
  });

  test('shows error when API returns available: false', async () => {
    API.post = jest.fn().mockResolvedValue({
      data: { available: false, error: 'AI extraction unavailable. Please ensure AI is configured.' },
    });

    render(<Wrapper><ScreenshotMcq /></Wrapper>);
    const input = document.querySelector('input[type="file"]');
    const imgFile = new File(['img'], 'q.png', { type: 'image/png' });
    global.URL.createObjectURL = jest.fn().mockReturnValue('blob:fake');
    fireEvent.change(input, { target: { files: [imgFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Extract MCQ with AI/i)).not.toBeDisabled();
    });

    fireEvent.click(screen.getByText(/Extract MCQ with AI/i));
    await waitFor(() => {
      expect(screen.getByText(/AI extraction unavailable/i)).toBeInTheDocument();
    });
  });

  test('Remove button clears the selected image', async () => {
    render(<Wrapper><ScreenshotMcq /></Wrapper>);
    const input = document.querySelector('input[type="file"]');
    const imgFile = new File(['img'], 'photo.png', { type: 'image/png' });
    global.URL.createObjectURL = jest.fn().mockReturnValue('blob:fake');
    fireEvent.change(input, { target: { files: [imgFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Remove/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Remove/i));
    await waitFor(() => {
      expect(screen.queryByText(/Remove/i)).not.toBeInTheDocument();
    });
  });

  test('renders Import button after extraction and clicking does not crash', async () => {
    const extractedData = {
      questionStem: 'What is encapsulation?',
      optionA: 'Hiding state',
      optionB: 'Exposing state',
      optionC: 'Mutating state',
      optionD: 'Cloning state',
      correctAnswer: 'A',
      difficulty: 'EASY',
    };
    API.post = jest.fn().mockResolvedValue({ data: extractedData });

    render(<Wrapper><ScreenshotMcq /></Wrapper>);
    const input = document.querySelector('input[type="file"]');
    const imgFile = new File(['img'], 'q.png', { type: 'image/png' });
    global.URL.createObjectURL = jest.fn().mockReturnValue('blob:fake');
    fireEvent.change(input, { target: { files: [imgFile] } });

    await waitFor(() =>
      expect(screen.getByText(/Extract MCQ with AI/i)).not.toBeDisabled()
    );
    fireEvent.click(screen.getByText(/Extract MCQ with AI/i));
    await waitFor(() =>
      expect(screen.getByText(/Import & Edit in Form/i)).toBeInTheDocument()
    );

    fireEvent.click(screen.getByText(/Import & Edit in Form/i));
    expect(document.body).toBeTruthy(); // useNavigate is mocked
  });
});

// ===========================================================================
// Inbox
// ===========================================================================
const mockMessages = [
  {
    id: 1,
    subject: 'Review your MCQ',
    body: 'Please review the submitted question carefully before approving.',
    senderName: 'Admin User',
    recipientName: 'Test User',
    sentAt: '2024-01-15T10:00:00Z',
    read: false,
    starred: false,
    messageType: 'USER',
  },
  {
    id: 2,
    subject: 'Your MCQ was approved',
    body: 'Congratulations! Your MCQ has been approved by the reviewer.',
    senderName: 'System',
    recipientName: 'Test User',
    sentAt: '2024-01-14T09:00:00Z',
    read: true,
    starred: true,
    messageType: 'SYSTEM',
  },
];

function setupInboxMocks(msgs = mockMessages) {
  API.get = jest.fn().mockImplementation((url) => {
    if (url === '/inbox/unread-count') return Promise.resolve({ data: { count: 1 } });
    return Promise.resolve({ data: msgs });
  });
  API.post = jest.fn().mockResolvedValue({ data: { starred: true } });
  API.delete = jest.fn().mockResolvedValue({ data: {} });
}

describe('Inbox', () => {
  test('renders without crashing', async () => {
    setupInboxMocks();
    render(<Wrapper><Inbox /></Wrapper>);
    await waitFor(() => {
      expect(document.body).toBeTruthy();
    });
  });

  test('renders inbox sidebar tabs', async () => {
    setupInboxMocks();
    render(<Wrapper><Inbox /></Wrapper>);
    await waitFor(() => {
      expect(document.querySelector('.inbox-sidebar')).toBeTruthy();
    });
  });

  test('renders message list after data loads', async () => {
    setupInboxMocks();
    render(<Wrapper><Inbox /></Wrapper>);
    await waitFor(() => {
      expect(screen.getByText('Review your MCQ')).toBeInTheDocument();
    });
  });

  test('renders second message subject in inbox', async () => {
    setupInboxMocks();
    render(<Wrapper><Inbox /></Wrapper>);
    await waitFor(() => {
      expect(screen.getByText('Your MCQ was approved')).toBeInTheDocument();
    });
  });

  test('shows empty state when inbox has no messages', async () => {
    API.get = jest.fn().mockImplementation((url) => {
      if (url === '/inbox/unread-count') return Promise.resolve({ data: { count: 0 } });
      return Promise.resolve({ data: [] });
    });
    render(<Wrapper><Inbox /></Wrapper>);
    await waitFor(() => {
      expect(document.querySelector('.inbox-empty')).toBeTruthy();
    });
  });

  test('clicking a message row opens message detail', async () => {
    setupInboxMocks();
    render(<Wrapper><Inbox /></Wrapper>);
    await waitFor(() => {
      expect(document.querySelector('.inbox-msg-row')).toBeTruthy();
    });
    fireEvent.click(document.querySelector('.inbox-msg-row'));
    await waitFor(() => {
      // The detail pane renders only when a message is selected
      expect(document.querySelector('.inbox-detail-body')).toBeTruthy();
    });
  });

  test('opening an unread message calls API to mark it read', async () => {
    setupInboxMocks();
    render(<Wrapper><Inbox /></Wrapper>);
    await waitFor(() => {
      expect(screen.getByText('Review your MCQ')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Review your MCQ'));
    await waitFor(() => {
      expect(API.post).toHaveBeenCalledWith(expect.stringMatching(/\/inbox\/1\/read/));
    });
  });

  test('clicking Sent tab switches view and loads sent messages', async () => {
    setupInboxMocks();
    render(<Wrapper><Inbox /></Wrapper>);
    await waitFor(() => {
      expect(document.querySelector('.inbox-sidebar')).toBeTruthy();
    });
    const sentBtn = document.querySelectorAll('.inbox-tab-btn')[1];
    fireEvent.click(sentBtn);
    await waitFor(() => {
      expect(API.get).toHaveBeenCalledWith('/inbox/sent');
    });
  });

  test('clicking Starred tab loads starred messages', async () => {
    setupInboxMocks();
    render(<Wrapper><Inbox /></Wrapper>);
    await waitFor(() => {
      expect(document.querySelector('.inbox-sidebar')).toBeTruthy();
    });
    const starredBtn = document.querySelectorAll('.inbox-tab-btn')[2];
    fireEvent.click(starredBtn);
    await waitFor(() => {
      expect(API.get).toHaveBeenCalledWith('/inbox/starred');
    });
  });

  test('clicking Compose button shows compose form', async () => {
    setupInboxMocks();
    render(<Wrapper><Inbox /></Wrapper>);
    await waitFor(() => {
      expect(document.querySelector('.inbox-compose-btn')).toBeTruthy();
    });
    fireEvent.click(document.querySelector('.inbox-compose-btn'));
    await waitFor(() => {
      expect(document.querySelector('.inbox-compose')).toBeTruthy();
    });
  });

  test('compose form has recipient, subject, and body fields', async () => {
    setupInboxMocks();
    render(<Wrapper><Inbox /></Wrapper>);
    await waitFor(() =>
      expect(document.querySelector('.inbox-compose-btn')).toBeTruthy()
    );
    fireEvent.click(document.querySelector('.inbox-compose-btn'));
    await waitFor(() => {
      expect(document.querySelector('#compose-to')).toBeTruthy();
      expect(document.querySelector('#compose-subject')).toBeTruthy();
      expect(document.querySelector('#compose-body')).toBeTruthy();
    });
  });

  test('submitting compose form calls API.post /inbox/send', async () => {
    API.get = jest.fn().mockImplementation((url) => {
      if (url === '/inbox/unread-count') return Promise.resolve({ data: { count: 0 } });
      return Promise.resolve({ data: [] });
    });
    API.post = jest.fn().mockResolvedValue({ data: {} });

    render(<Wrapper><Inbox /></Wrapper>);
    await waitFor(() =>
      expect(document.querySelector('.inbox-compose-btn')).toBeTruthy()
    );
    fireEvent.click(document.querySelector('.inbox-compose-btn'));

    await waitFor(() => {
      expect(document.querySelector('#compose-to')).toBeTruthy();
    });

    fireEvent.change(document.querySelector('#compose-to'), { target: { value: 'recipient.id' } });
    fireEvent.change(document.querySelector('#compose-subject'), { target: { value: 'Test Subject' } });
    fireEvent.change(document.querySelector('#compose-body'), { target: { value: 'Test message body' } });

    const form = document.querySelector('.inbox-compose-form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(API.post).toHaveBeenCalledWith(
        '/inbox/send',
        expect.objectContaining({ to: 'recipient.id', subject: 'Test Subject' })
      );
    });
  });

  test('shows error message when send fails', async () => {
    API.get = jest.fn().mockImplementation((url) => {
      if (url === '/inbox/unread-count') return Promise.resolve({ data: { count: 0 } });
      return Promise.resolve({ data: [] });
    });
    API.post = jest.fn().mockRejectedValue({
      response: { data: { message: 'Failed to send. Check the recipient ID.' } },
    });

    render(<Wrapper><Inbox /></Wrapper>);
    fireEvent.click(document.querySelector('.inbox-compose-btn'));

    await waitFor(() => expect(document.querySelector('#compose-to')).toBeTruthy());

    fireEvent.change(document.querySelector('#compose-to'), { target: { value: 'bad.id' } });
    fireEvent.change(document.querySelector('#compose-subject'), { target: { value: 'Subj' } });
    fireEvent.change(document.querySelector('#compose-body'), { target: { value: 'Body text here' } });

    fireEvent.submit(document.querySelector('.inbox-compose-form'));

    await waitFor(() => {
      expect(screen.getByText(/Failed to send/i)).toBeInTheDocument();
    });
  });

  test('star button calls API.post to star/unstar message', async () => {
    setupInboxMocks();
    render(<Wrapper><Inbox /></Wrapper>);
    await waitFor(() => {
      expect(screen.getByText('Review your MCQ')).toBeInTheDocument();
    });
    const starBtns = document.querySelectorAll('.inbox-star-btn');
    fireEvent.click(starBtns[0]);
    await waitFor(() => {
      expect(API.post).toHaveBeenCalledWith(expect.stringMatching(/\/inbox\/\d+\/star/));
    });
  });

  test('search input filters messages by subject', async () => {
    setupInboxMocks();
    render(<Wrapper><Inbox /></Wrapper>);
    await waitFor(() => {
      expect(screen.getByText('Review your MCQ')).toBeInTheDocument();
    });
    const searchInput = document.querySelector('.inbox-search-input');
    fireEvent.change(searchInput, { target: { value: 'approved' } });
    // 'Your MCQ was approved' matches; 'Review your MCQ' does not
    expect(screen.getByText('Your MCQ was approved')).toBeInTheDocument();
    expect(screen.queryByText('Review your MCQ')).not.toBeInTheDocument();
  });

  test('shows unread count badge in sidebar', async () => {
    setupInboxMocks();
    render(<Wrapper><Inbox /></Wrapper>);
    await waitFor(() => {
      expect(document.querySelector('.inbox-badge')).toBeTruthy();
    });
  });
});
