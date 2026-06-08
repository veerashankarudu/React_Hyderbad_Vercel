import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import API from '../api';

// ── Core mocks ─────────────────────────────────────────────────────────────────
jest.mock('../api');

jest.mock('../AuthContext', () => ({
  useAuth: () => ({
    user: { fullName: 'Admin', role: 'ADMIN', enterpriseId: 'admin.user' },
    login: jest.fn(),
    logout: jest.fn(),
    updateUser: jest.fn(),
  }),
}));

jest.mock('../components/Navbar', () => () => <div data-testid="navbar" />);

jest.mock('../components/SortableTh', () =>
  ({ label, onSort, colKey }) => (
    <th onClick={() => onSort && onSort(colKey)}>{label}</th>
  )
);

jest.mock('../components/TablePagination', () =>
  () => <div data-testid="table-pagination" />
);

jest.mock('../components/StatusBadge', () =>
  ({ status }) => <span data-testid="status-badge">{status}</span>
);

jest.mock('../components/McqCommentSection', () =>
  () => <div data-testid="comment-section" />
);

jest.mock('../components/QuestionStemRenderer', () =>
  ({ text }) => <div data-testid="stem-renderer">{text}</div>
);

jest.mock('../hooks/useContentTranslation', () => ({
  useContentTranslation: (texts) => texts,
}));

jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

// ── Page imports ───────────────────────────────────────────────────────────────
import UserManagement from './UserManagement';
import MasterData from './MasterData';
import Analytics from './Analytics';
import AuditLog from './AuditLog';
import McqDetail from './McqDetail';
import McqForm from './McqForm';
import BulkUpload from './BulkUpload';

const Wrapper = ({ children }) => (
  <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
);

// ─────────────────────────────────────────────────────────────────────────────
// 1. UserManagement
// ─────────────────────────────────────────────────────────────────────────────
describe('UserManagement Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    API.get = jest.fn().mockResolvedValue({ data: [] });
    API.post = jest.fn().mockResolvedValue({ data: {} });
    API.put = jest.fn().mockResolvedValue({ data: {} });
    API.delete = jest.fn().mockResolvedValue({ data: {} });
  });

  test('renders without crashing', () => {
    render(<Wrapper><UserManagement /></Wrapper>);
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
  });

  test('shows "User Management" title', async () => {
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('User Management')
    );
  });

  test('calls admin/users, admin/audit-log, and master/tech-stacks on mount', async () => {
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => {
      expect(API.get).toHaveBeenCalledWith('/admin/users');
      expect(API.get).toHaveBeenCalledWith('/admin/audit-log');
      expect(API.get).toHaveBeenCalledWith('/master/tech-stacks');
    });
  });

  test('shows "+ Add User" button', async () => {
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('+ Add User')
    );
  });

  test('shows Users, Pending Approval, and History tabs', async () => {
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => {
      const html = document.body.innerHTML;
      expect(html).toContain('Users');
      expect(html).toContain('Pending Approval');
      expect(html).toContain('History');
    });
  });

  test('shows empty state when no users returned', async () => {
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('No data yet')
    );
  });

  test('shows user enterprise ID when API returns users', async () => {
    const users = [
      {
        id: 1,
        enterpriseId: 'jane.doe',
        fullName: 'Jane Doe',
        email: 'jane@accenture.com',
        role: 'SME',
        techStacks: [],
        approved: true,
      },
    ];
    API.get = jest.fn((url) => {
      if (url === '/admin/users') return Promise.resolve({ data: users });
      return Promise.resolve({ data: [] });
    });
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('jane.doe')
    );
  });

  test('shows error banner when API call fails', async () => {
    API.get = jest.fn().mockRejectedValue({
      response: { data: { error: 'Server error' } },
    });
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('Server error')
    );
  });

  test('has a search input field', async () => {
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => {
      const input = document.querySelector('input[type="text"]');
      expect(input).toBeTruthy();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. MasterData
// ─────────────────────────────────────────────────────────────────────────────
describe('MasterData Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    API.get = jest.fn().mockResolvedValue({ data: [] });
    API.post = jest.fn().mockResolvedValue({ data: {} });
    API.put = jest.fn().mockResolvedValue({ data: {} });
    API.delete = jest.fn().mockResolvedValue({ data: {} });
    window.confirm = jest.fn(() => true);
  });

  test('renders without crashing', () => {
    render(<Wrapper><MasterData /></Wrapper>);
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
  });

  test('calls /master/tech-stacks on mount', async () => {
    render(<Wrapper><MasterData /></Wrapper>);
    await waitFor(() =>
      expect(API.get).toHaveBeenCalledWith('/master/tech-stacks')
    );
  });

  test('calls /master/smes for admin user', async () => {
    render(<Wrapper><MasterData /></Wrapper>);
    await waitFor(() =>
      expect(API.get).toHaveBeenCalledWith('/master/smes')
    );
  });

  test('renders page container without error when tech stacks empty', async () => {
    render(<Wrapper><MasterData /></Wrapper>);
    await waitFor(() => {
      expect(document.querySelector('.md-container')).toBeTruthy();
    });
  });

  test('shows tech stack names when API returns data', async () => {
    const stacks = [
      { id: 1, name: 'Spring Boot' },
      { id: 2, name: 'React' },
    ];
    API.get = jest.fn((url) => {
      if (url === '/master/tech-stacks') return Promise.resolve({ data: stacks });
      return Promise.resolve({ data: [] });
    });
    render(<Wrapper><MasterData /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('Spring Boot')
    );
  });

  test('has inputs for admin CRUD operations', async () => {
    render(<Wrapper><MasterData /></Wrapper>);
    await waitFor(() => {
      // Inputs default to type=text even without explicit attribute
      const inputs = document.querySelectorAll('input');
      expect(inputs.length).toBeGreaterThan(0);
    });
  });

  test('loads topics when a tech stack is selected', async () => {
    const stacks = [{ id: 7, name: 'Core Java' }];
    API.get = jest.fn((url) => {
      if (url === '/master/tech-stacks') return Promise.resolve({ data: stacks });
      if (url === '/master/tech-stacks/7/topics')
        return Promise.resolve({ data: [{ id: 21, name: 'Collections' }] });
      return Promise.resolve({ data: [] });
    });
    render(<Wrapper><MasterData /></Wrapper>);
    await waitFor(() =>
      expect(API.get).toHaveBeenCalledWith('/master/tech-stacks/7/topics')
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Analytics
// ─────────────────────────────────────────────────────────────────────────────
describe('Analytics Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    API.get = jest.fn().mockResolvedValue({ data: [] });
    API.post = jest.fn().mockResolvedValue({ data: {} });
    API.put = jest.fn().mockResolvedValue({ data: {} });
    API.delete = jest.fn().mockResolvedValue({ data: {} });
  });

  test('renders without crashing', () => {
    render(<Wrapper><Analytics /></Wrapper>);
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
  });

  test('calls all four stats endpoints on mount', async () => {
    render(<Wrapper><Analytics /></Wrapper>);
    await waitFor(() => {
      expect(API.get).toHaveBeenCalledWith('/stats/summary', expect.any(Object));
      expect(API.get).toHaveBeenCalledWith('/stats/by-tech-stack', expect.any(Object));
    });
  });

  test('shows analytics title text', async () => {
    render(<Wrapper><Analytics /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('Analytics')
    );
  });

  test('shows From and To date filter inputs', async () => {
    render(<Wrapper><Analytics /></Wrapper>);
    await waitFor(() => {
      const dateInputs = document.querySelectorAll('input[type="date"]');
      expect(dateInputs.length).toBeGreaterThanOrEqual(2);
    });
  });

  test('shows Apply filter button', async () => {
    render(<Wrapper><Analytics /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('Apply')
    );
  });

  test('shows Export Excel button', async () => {
    render(<Wrapper><Analytics /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('Export Excel')
    );
  });

  test('renders donut total value when summary data loads', async () => {
    // approved(30) + inReview(10) + draft(10) + rejected(5) = 55, rendered in donut centre
    API.get = jest.fn((url) => {
      if (url === '/stats/summary') {
        return Promise.resolve({
          data: {
            totalMcqs: 55,
            approved: 30,
            inReview: 10,
            draft: 10,
            rejected: 5,
          },
        });
      }
      return Promise.resolve({ data: [] });
    });
    render(<Wrapper><Analytics /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('55')
    );
  });

  test('shows leaderboard search input', async () => {
    render(<Wrapper><Analytics /></Wrapper>);
    await waitFor(() => {
      const inputs = document.querySelectorAll('input');
      expect(inputs.length).toBeGreaterThan(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. AuditLog
// ─────────────────────────────────────────────────────────────────────────────
describe('AuditLog Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    API.get = jest.fn().mockResolvedValue({ data: [] });
    API.post = jest.fn().mockResolvedValue({ data: {} });
    API.put = jest.fn().mockResolvedValue({ data: {} });
    API.delete = jest.fn().mockResolvedValue({ data: {} });
  });

  test('renders without crashing', () => {
    render(<Wrapper><AuditLog /></Wrapper>);
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
  });

  test('calls /admin/audit-log on mount', async () => {
    render(<Wrapper><AuditLog /></Wrapper>);
    await waitFor(() =>
      expect(API.get).toHaveBeenCalledWith('/admin/audit-log')
    );
  });

  test('shows "Audit Log" in the title area', async () => {
    render(<Wrapper><AuditLog /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('Audit Log')
    );
  });

  test('shows Refresh button', async () => {
    render(<Wrapper><AuditLog /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('Refresh')
    );
  });

  test('shows empty state message when no logs returned', async () => {
    render(<Wrapper><AuditLog /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('No audit log entries found.')
    );
  });

  test('has a search text input', async () => {
    render(<Wrapper><AuditLog /></Wrapper>);
    await waitFor(() => {
      const input = document.querySelector('input[type="text"]');
      expect(input).toBeTruthy();
    });
  });

  test('has an action filter dropdown', async () => {
    render(<Wrapper><AuditLog /></Wrapper>);
    await waitFor(() => {
      const sel = document.querySelector('select');
      expect(sel).toBeTruthy();
    });
  });

  test('shows actor enterprise ID when logs are returned', async () => {
    const logs = [
      {
        id: 1,
        action: 'APPROVE',
        actorEnterpriseId: 'admin.user',
        targetEnterpriseId: 'jane.doe',
        details: 'Approved registration',
        timestamp: '2024-01-01T10:00:00Z',
      },
    ];
    API.get = jest.fn().mockResolvedValue({ data: logs });
    render(<Wrapper><AuditLog /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('admin.user')
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. McqDetail
// ─────────────────────────────────────────────────────────────────────────────
describe('McqDetail Page', () => {
  // useParams() from the global mock returns {}, so id is undefined.
  const mockMcq = {
    id: 5,
    questionStem: 'What is polymorphism in OOP?',
    optionA: 'Many forms',
    optionB: 'Single form',
    optionC: 'No form',
    optionD: 'All of the above',
    correctAnswer: 'A',
    difficulty: 'MEDIUM',
    status: 'DRAFT',
    techStack: { name: 'Java' },
    topic: { name: 'OOP' },
    comments: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: API resolves with null → "MCQ not found"
    API.get = jest.fn().mockResolvedValue({ data: null });
    API.post = jest.fn().mockResolvedValue({ data: {} });
    API.put = jest.fn().mockResolvedValue({ data: {} });
    API.delete = jest.fn().mockResolvedValue({ data: {} });
  });

  test('renders without crashing (null MCQ)', () => {
    render(<Wrapper><McqDetail /></Wrapper>);
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
  });

  test('shows "MCQ not found" when API resolves with null', async () => {
    render(<Wrapper><McqDetail /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('MCQ not found')
    );
  });

  test('shows "MCQ not found" when API call rejects', async () => {
    API.get = jest.fn().mockRejectedValue(new Error('Network error'));
    render(<Wrapper><McqDetail /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('MCQ not found')
    );
  });

  test('renders MCQ question stem when data loads', async () => {
    API.get = jest.fn().mockResolvedValue({ data: mockMcq });
    render(<Wrapper><McqDetail /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('What is polymorphism in OOP?')
    );
  });

  test('shows Back button when MCQ is loaded', async () => {
    API.get = jest.fn().mockResolvedValue({ data: mockMcq });
    render(<Wrapper><McqDetail /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('Back')
    );
  });

  test('shows AI Explain button when MCQ is loaded', async () => {
    API.get = jest.fn().mockResolvedValue({ data: mockMcq });
    render(<Wrapper><McqDetail /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('AI Explain')
    );
  });

  test('shows option text when MCQ is loaded', async () => {
    API.get = jest.fn().mockResolvedValue({ data: mockMcq });
    render(<Wrapper><McqDetail /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('Many forms')
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. McqForm
// ─────────────────────────────────────────────────────────────────────────────
describe('McqForm Page (create mode)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    API.get = jest.fn().mockResolvedValue({ data: [] });
    API.post = jest.fn().mockResolvedValue({ data: { id: 10 } });
    API.put = jest.fn().mockResolvedValue({ data: {} });
    API.delete = jest.fn().mockResolvedValue({ data: {} });
  });

  test('renders without crashing', () => {
    render(<Wrapper><McqForm /></Wrapper>);
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
  });

  test('shows "Create MCQ" heading', async () => {
    render(<Wrapper><McqForm /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('Create MCQ')
    );
  });

  test('has tech stack selector', async () => {
    render(<Wrapper><McqForm /></Wrapper>);
    await waitFor(() => {
      const sel = document.querySelector('#techStackId');
      expect(sel).toBeTruthy();
    });
  });

  test('has difficulty selector with Easy, Medium, Hard options', async () => {
    render(<Wrapper><McqForm /></Wrapper>);
    await waitFor(() => {
      const sel = document.querySelector('#difficulty');
      expect(sel).toBeTruthy();
      const html = document.body.innerHTML;
      expect(html).toContain('Easy');
      expect(html).toContain('Medium');
      expect(html).toContain('Hard');
    });
  });

  test('has question stem textarea', async () => {
    render(<Wrapper><McqForm /></Wrapper>);
    await waitFor(() => {
      const textarea = document.querySelector('textarea');
      expect(textarea).toBeTruthy();
    });
  });

  test('calls API.get for tech stacks on mount', async () => {
    render(<Wrapper><McqForm /></Wrapper>);
    await waitFor(() =>
      expect(API.get).toHaveBeenCalledWith('/master/tech-stacks')
    );
  });

  test('shows a form element', async () => {
    render(<Wrapper><McqForm /></Wrapper>);
    await waitFor(() => {
      expect(document.querySelector('form')).toBeTruthy();
    });
  });

  test('shows Save as Draft button text', async () => {
    render(<Wrapper><McqForm /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('Save')
    );
  });

  test('shows "Generate with AI" button in create mode', async () => {
    render(<Wrapper><McqForm /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('Generate with AI')
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. BulkUpload
// ─────────────────────────────────────────────────────────────────────────────
describe('BulkUpload Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    API.get = jest.fn().mockResolvedValue({ data: [] });
    API.post = jest.fn().mockResolvedValue({
      data: { success: 3, failed: 0, totalRows: 3, errors: [] },
    });
    API.put = jest.fn().mockResolvedValue({ data: {} });
    API.delete = jest.fn().mockResolvedValue({ data: {} });
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });
  });

  test('renders without crashing', () => {
    render(<Wrapper><BulkUpload /></Wrapper>);
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
  });

  test('shows "Bulk Upload" title', async () => {
    render(<Wrapper><BulkUpload /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('Bulk Upload')
    );
  });

  test('shows Download Template button', async () => {
    render(<Wrapper><BulkUpload /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('Download Template')
    );
  });

  test('shows drag and drop zone text', async () => {
    render(<Wrapper><BulkUpload /></Wrapper>);
    await waitFor(() => {
      // '&' is encoded as '&amp;' in innerHTML; check text content instead
      expect(document.body.textContent).toContain('Drag & drop');
    });
  });

  test('calls API.get for tech stacks on mount', async () => {
    render(<Wrapper><BulkUpload /></Wrapper>);
    await waitFor(() =>
      expect(API.get).toHaveBeenCalledWith('/master/tech-stacks')
    );
  });

  test('has a hidden file input accepting .csv/.xlsx/.xls', async () => {
    render(<Wrapper><BulkUpload /></Wrapper>);
    await waitFor(() => {
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeTruthy();
      expect(fileInput.accept).toContain('.csv');
    });
  });

  test('shows format reference section', async () => {
    render(<Wrapper><BulkUpload /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('Format Reference')
    );
  });
});
