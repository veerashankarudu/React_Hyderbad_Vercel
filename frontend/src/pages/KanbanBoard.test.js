import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import API from '../api';

// ── Core mocks ────────────────────────────────────────────────────────────────

jest.mock('../api');

jest.mock('../AuthContext', () => ({
  useAuth: () => ({
    user: { fullName: 'Admin', role: 'ADMIN', enterpriseId: 'admin.user' },
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

jest.mock('../hooks/useContentTranslation', () => ({
  useContentTranslation: (texts) => texts,
}));

jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), error: jest.fn(), warn: jest.fn() },
  ToastContainer: () => null,
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import UserManagement from './UserManagement';
import KanbanBoard from './KanbanBoard';

// ── Shared wrapper ────────────────────────────────────────────────────────────

const Wrapper = ({ children }) => <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TECH_STACKS = [
  { id: 1, name: 'Java' },
  { id: 2, name: 'React' },
];

const ACTIVE_USER = {
  id: 1,
  fullName: 'John Doe',
  enterpriseId: 'john.d',
  role: 'SME',
  approved: true,
  email: 'j@t.com',
  techStacks: ['Java'],
};

const ADMIN_USER = {
  id: 2,
  fullName: 'Jane Admin',
  enterpriseId: 'jane.admin',
  role: 'ADMIN',
  approved: true,
  email: 'jane@t.com',
  techStacks: [],
};

const PENDING_USER = {
  id: 3,
  fullName: 'Bob Pending',
  enterpriseId: 'bob.p',
  role: 'PENDING',
  approved: false,
  email: 'bob@t.com',
  techStacks: [],
};

const AUDIT_LOG = [
  {
    id: 1,
    timestamp: '2026-06-20T12:00:00Z',
    actorEnterpriseId: 'admin.user',
    action: 'USER_APPROVED',
    targetEnterpriseId: 'john.d',
    details: 'Approved user john.d',
  },
];

const MCQS = [
  {
    id: 1,
    questionStem: 'Q1 about Java',
    status: 'DRAFT',
    difficulty: 'EASY',
    techStackName: 'Java',
    techStackId: 1,
    creatorFullName: 'John Doe',
    creatorEnterpriseId: 'john.doe',
    topicName: 'Basics',
    aiScore: 85,
    createdAt: '2026-06-20T00:00:00Z',
  },
  {
    id: 2,
    questionStem: 'Q2 about React',
    status: 'APPROVED',
    difficulty: 'MEDIUM',
    techStackName: 'React',
    techStackId: 2,
    creatorFullName: 'Jane Smith',
    creatorEnterpriseId: 'jane.smith',
    topicName: 'Hooks',
    aiScore: null,
    createdAt: '2026-06-20T00:00:00Z',
  },
  {
    id: 3,
    questionStem: 'Q3 rejected topic',
    status: 'REJECTED',
    difficulty: 'HARD',
    techStackName: 'Java',
    techStackId: 1,
    creatorFullName: 'Alice Brown',
    creatorEnterpriseId: 'alice.brown',
    reviewerFullName: 'Bob Reviewer',
    reviewerEnterpriseId: 'bob.reviewer',
    topicName: 'JVM',
    aiScore: 30,
    createdAt: '2026-06-20T00:00:00Z',
  },
];

// ── Global beforeEach ─────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  API.get    = jest.fn().mockResolvedValue({ data: [] });
  API.post   = jest.fn().mockResolvedValue({ data: {} });
  API.put    = jest.fn().mockResolvedValue({ data: {} });
  API.delete = jest.fn().mockResolvedValue({ data: {} });
});

// ════════════════════════════════════════════════════════════════════════════
// UserManagement – extended coverage
// ════════════════════════════════════════════════════════════════════════════

describe('UserManagement – extended coverage', () => {
  /** Set up API.get to return a single active user + tech stacks */
  function setupActiveUser(extra = {}) {
    API.get = jest.fn((url) => {
      if (url === '/admin/users')      return Promise.resolve({ data: [ACTIVE_USER, ...(extra.users || [])] });
      if (url === '/admin/audit-log')  return Promise.resolve({ data: extra.auditLog || [] });
      if (url === '/master/tech-stacks') return Promise.resolve({ data: TECH_STACKS });
      return Promise.resolve({ data: [] });
    });
  }

  // ── 1. User row content ──────────────────────────────────────────────────

  test('shows enterprise ID, full name, email and role badge for loaded user', async () => {
    setupActiveUser();
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => {
      const html = document.body.innerHTML;
      expect(html).toContain('john.d');
      expect(html).toContain('John Doe');
      expect(html).toContain('j@t.com');
      expect(html).toContain('SME');
    });
  });

  // ── 2. Tech stack chip in user row ───────────────────────────────────────

  test('displays tech stack chip for user with assigned stacks', async () => {
    setupActiveUser();
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('Java')
    );
  });

  // ── 3. Search by full name ───────────────────────────────────────────────

  test('search by full name hides non-matching users', async () => {
    API.get = jest.fn((url) => {
      if (url === '/admin/users') return Promise.resolve({ data: [
        ACTIVE_USER,
        { id: 10, fullName: 'Alice Wonder', enterpriseId: 'alice.w', role: 'SME', approved: true, email: 'a@t.com', techStacks: [] },
      ]});
      return Promise.resolve({ data: [] });
    });

    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => expect(document.body.innerHTML).toContain('John Doe'));

    const input = document.querySelector('input[type="text"]');
    fireEvent.change(input, { target: { value: 'Alice' } });

    await waitFor(() => {
      expect(document.body.innerHTML).toContain('Alice Wonder');
      expect(document.body.innerHTML).not.toContain('John Doe');
    });
  });

  // ── 4. Search by enterprise ID ───────────────────────────────────────────

  test('search by enterprise ID hides non-matching users', async () => {
    API.get = jest.fn((url) => {
      if (url === '/admin/users') return Promise.resolve({ data: [
        ACTIVE_USER,
        { id: 11, fullName: 'Alice Wonder', enterpriseId: 'alice.w', role: 'SME', approved: true, email: 'a@t.com', techStacks: [] },
      ]});
      return Promise.resolve({ data: [] });
    });

    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => expect(document.body.innerHTML).toContain('john.d'));

    fireEvent.change(document.querySelector('input[type="text"]'), { target: { value: 'alice.w' } });

    await waitFor(() => {
      expect(document.body.innerHTML).toContain('alice.w');
      expect(document.body.innerHTML).not.toContain('john.d');
    });
  });

  // ── 5. Search with no match shows empty state ────────────────────────────

  test('search with no match shows empty state', async () => {
    setupActiveUser();
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => expect(document.body.innerHTML).toContain('John Doe'));

    fireEvent.change(document.querySelector('input[type="text"]'), { target: { value: 'zzznomatch' } });

    await waitFor(() =>
      expect(document.querySelector('.empty-state')).toBeTruthy()
    );
  });

  // ── 6. Pending Approval tab shows pending user ───────────────────────────

  test('Pending Approval tab shows pending user enterprise ID', async () => {
    API.get = jest.fn((url) => {
      if (url === '/admin/users') return Promise.resolve({ data: [ACTIVE_USER, PENDING_USER] });
      return Promise.resolve({ data: [] });
    });
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => expect(document.body.innerHTML).toContain('Pending'));

    const tabs = Array.from(document.querySelectorAll('.status-tab'));
    const pendingTab = tabs.find(t => t.textContent.includes('Pending'));
    fireEvent.click(pendingTab);

    await waitFor(() =>
      expect(document.body.innerHTML).toContain('bob.p')
    );
  });

  // ── 7. Pending Approval tab shows empty state when no pending users ───────

  test('Pending Approval tab shows empty state when no pending users', async () => {
    setupActiveUser();
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => expect(document.body.innerHTML).toContain('User Management'));

    const tabs = Array.from(document.querySelectorAll('.status-tab'));
    const pendingTab = tabs.find(t => t.textContent.includes('Pending'));
    fireEvent.click(pendingTab);

    await waitFor(() =>
      expect(document.querySelector('.empty-state')).toBeTruthy()
    );
  });

  // ── 8. History tab empty state ───────────────────────────────────────────

  test('History tab shows empty state when audit log is empty', async () => {
    setupActiveUser();
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => expect(document.body.innerHTML).toContain('User Management'));

    const tabs = Array.from(document.querySelectorAll('.status-tab'));
    const historyTab = tabs.find(t => t.textContent.includes('History'));
    fireEvent.click(historyTab);

    await waitFor(() =>
      expect(document.querySelector('.empty-state')).toBeTruthy()
    );
  });

  // ── 9. History tab shows audit log entries ───────────────────────────────

  test('History tab shows audit log actor and target enterprise IDs', async () => {
    setupActiveUser({ auditLog: AUDIT_LOG });
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => expect(document.body.innerHTML).toContain('User Management'));

    const tabs = Array.from(document.querySelectorAll('.status-tab'));
    const historyTab = tabs.find(t => t.textContent.includes('History'));
    fireEvent.click(historyTab);

    await waitFor(() => {
      expect(document.body.innerHTML).toContain('admin.user');
      expect(document.body.innerHTML).toContain('john.d');
    });
  });

  // ── 10. Role change button shows confirm modal ───────────────────────────

  test('clicking "Make ADMIN" opens the confirm modal', async () => {
    setupActiveUser();
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => expect(document.body.innerHTML).toContain('John Doe'));

    const makeAdminBtn = Array.from(document.querySelectorAll('button'))
      .find(b => b.textContent === 'Make ADMIN');
    expect(makeAdminBtn).toBeTruthy();
    fireEvent.click(makeAdminBtn);

    await waitFor(() =>
      expect(document.querySelector('.um-modal')).toBeTruthy()
    );
  });

  // ── 11. Confirming role change calls API.put ─────────────────────────────

  test('confirming role change calls API.put with role endpoint', async () => {
    setupActiveUser();
    API.put = jest.fn().mockResolvedValue({ data: { ...ACTIVE_USER, role: 'ADMIN' } });

    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => expect(document.body.innerHTML).toContain('John Doe'));

    const makeAdminBtn = Array.from(document.querySelectorAll('button'))
      .find(b => b.textContent === 'Make ADMIN');
    fireEvent.click(makeAdminBtn);

    await waitFor(() => expect(document.querySelector('.um-modal')).toBeTruthy());

    const confirmBtn = document.querySelector('.btn-danger');
    fireEvent.click(confirmBtn);

    await waitFor(() =>
      expect(API.put).toHaveBeenCalledWith(expect.stringContaining('/admin/users/1/role'))
    );
  });

  // ── 12. Cancelling confirm modal closes it ───────────────────────────────

  test('cancelling the confirm modal closes it without calling API', async () => {
    setupActiveUser();
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => expect(document.body.innerHTML).toContain('John Doe'));

    const makeAdminBtn = Array.from(document.querySelectorAll('button'))
      .find(b => b.textContent === 'Make ADMIN');
    fireEvent.click(makeAdminBtn);

    await waitFor(() => expect(document.querySelector('.um-modal')).toBeTruthy());

    const cancelBtn = document.querySelector('.um-modal .btn-secondary');
    fireEvent.click(cancelBtn);

    await waitFor(() =>
      expect(document.querySelector('.um-modal')).toBeFalsy()
    );
    expect(API.put).not.toHaveBeenCalled();
  });

  // ── 13. "Make SME" button shown for ADMIN-role user ──────────────────────

  test('shows "Make SME" button for an ADMIN-role user', async () => {
    API.get = jest.fn((url) => {
      if (url === '/admin/users') return Promise.resolve({ data: [ADMIN_USER] });
      return Promise.resolve({ data: [] });
    });
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('Make SME')
    );
  });

  // ── 14. Approve pending user calls API.put /approve ──────────────────────

  test('clicking Approve on a pending user triggers API.put approve endpoint', async () => {
    API.get = jest.fn((url) => {
      if (url === '/admin/users') return Promise.resolve({ data: [PENDING_USER] });
      return Promise.resolve({ data: [] });
    });
    API.put = jest.fn().mockResolvedValue({ data: { ...PENDING_USER, approved: true, role: 'SME' } });

    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => expect(document.body.innerHTML).toContain('Pending'));

    const tabs = Array.from(document.querySelectorAll('.status-tab'));
    fireEvent.click(tabs.find(t => t.textContent.includes('Pending')));

    await waitFor(() => expect(document.body.innerHTML).toContain('bob.p'));

    const approveBtn = Array.from(document.querySelectorAll('button'))
      .find(b => b.textContent.trim().startsWith('✓'));
    expect(approveBtn).toBeTruthy();
    fireEvent.click(approveBtn);

    await waitFor(() => expect(document.querySelector('.um-modal')).toBeTruthy());

    fireEvent.click(document.querySelector('.btn-danger'));

    await waitFor(() =>
      expect(API.put).toHaveBeenCalledWith(expect.stringContaining('/admin/users/3/approve'))
    );
  });

  // ── 15. Reject pending user calls API.delete /reject ─────────────────────

  test('clicking Reject on a pending user triggers API.delete reject endpoint', async () => {
    API.get = jest.fn((url) => {
      if (url === '/admin/users') return Promise.resolve({ data: [PENDING_USER] });
      return Promise.resolve({ data: [] });
    });
    API.delete = jest.fn().mockResolvedValue({ data: {} });

    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => expect(document.body.innerHTML).toContain('Pending'));

    const tabs = Array.from(document.querySelectorAll('.status-tab'));
    fireEvent.click(tabs.find(t => t.textContent.includes('Pending')));

    await waitFor(() => expect(document.body.innerHTML).toContain('bob.p'));

    const rejectBtn = Array.from(document.querySelectorAll('button'))
      .find(b => b.textContent.trim().startsWith('✕'));
    expect(rejectBtn).toBeTruthy();
    fireEvent.click(rejectBtn);

    await waitFor(() => expect(document.querySelector('.um-modal')).toBeTruthy());

    fireEvent.click(document.querySelector('.btn-danger'));

    await waitFor(() =>
      expect(API.delete).toHaveBeenCalledWith(expect.stringContaining('/admin/users/3/reject'))
    );
  });

  // ── 16. Add User button opens Add User modal ─────────────────────────────

  test('clicking Add User button opens the Add User modal with form fields', async () => {
    setupActiveUser();
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => expect(document.body.innerHTML).toContain('User Management'));

    const addBtn = document.querySelector('.page-header .btn-primary');
    expect(addBtn).toBeTruthy();
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(document.querySelector('#au-eid')).toBeTruthy();
      expect(document.querySelector('#au-name')).toBeTruthy();
      expect(document.querySelector('#au-email')).toBeTruthy();
      expect(document.querySelector('#au-role')).toBeTruthy();
    });
  });

  // ── 17. Add User modal cancel closes it ─────────────────────────────────

  test('Add User modal cancel button closes the modal', async () => {
    setupActiveUser();
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => expect(document.body.innerHTML).toContain('User Management'));

    fireEvent.click(document.querySelector('.page-header .btn-primary'));

    await waitFor(() => expect(document.querySelector('#au-eid')).toBeTruthy());

    const cancelBtn = document.querySelector('.um-modal .btn-secondary');
    fireEvent.click(cancelBtn);

    await waitFor(() =>
      expect(document.querySelector('#au-eid')).toBeFalsy()
    );
  });

  // ── 18. Add User validation error for missing fields ─────────────────────

  test('Add User form shows validation error when required fields are empty', async () => {
    setupActiveUser();
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => expect(document.body.innerHTML).toContain('User Management'));

    fireEvent.click(document.querySelector('.page-header .btn-primary'));
    await waitFor(() => expect(document.querySelector('#au-eid')).toBeTruthy());

    // Click create without filling fields
    const createBtn = Array.from(document.querySelectorAll('.um-modal button.btn-primary'))
      .find(b => b.textContent);
    fireEvent.click(createBtn);

    await waitFor(() =>
      expect(document.body.innerHTML).toContain('required')
    );
  });

  // ── 19. Add User form submission calls API.post ───────────────────────────

  test('filled Add User form calls API.post /admin/users with form data', async () => {
    setupActiveUser();
    const newUser = { id: 99, fullName: 'New User', enterpriseId: 'new.u', role: 'SME', approved: true, email: 'new@t.com', techStacks: [] };
    API.post = jest.fn().mockResolvedValue({ data: newUser });

    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => expect(document.body.innerHTML).toContain('User Management'));

    fireEvent.click(document.querySelector('.page-header .btn-primary'));
    await waitFor(() => expect(document.querySelector('#au-eid')).toBeTruthy());

    fireEvent.change(document.querySelector('#au-eid'),   { target: { value: 'new.u' } });
    fireEvent.change(document.querySelector('#au-name'),  { target: { value: 'New User' } });
    fireEvent.change(document.querySelector('#au-email'), { target: { value: 'new@t.com' } });

    const createBtn = Array.from(document.querySelectorAll('.um-modal button.btn-primary'))
      .find(b => b.textContent);
    fireEvent.click(createBtn);

    await waitFor(() =>
      expect(API.post).toHaveBeenCalledWith('/admin/users', expect.objectContaining({
        enterpriseId: 'new.u',
        fullName: 'New User',
        email: 'new@t.com',
      }))
    );
  });

  // ── 20. Add User tech stack chips rendered in modal ──────────────────────

  test('Add User modal shows tech stack chips from loaded stacks', async () => {
    setupActiveUser();
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => expect(document.body.innerHTML).toContain('User Management'));

    fireEvent.click(document.querySelector('.page-header .btn-primary'));
    await waitFor(() => expect(document.querySelector('#au-eid')).toBeTruthy());

    const chips = Array.from(document.querySelectorAll('.um-chip'));
    expect(chips.length).toBeGreaterThan(0);
    const chipTexts = chips.map(c => c.textContent);
    expect(chipTexts).toContain('Java');
    expect(chipTexts).toContain('React');
  });

  // ── 21. Stats bar shows active / admin / SME / pending counts ────────────

  test('stats bar renders stat pills with user counts', async () => {
    API.get = jest.fn((url) => {
      if (url === '/admin/users') return Promise.resolve({ data: [ACTIVE_USER, ADMIN_USER, PENDING_USER] });
      return Promise.resolve({ data: [] });
    });
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() =>
      expect(document.querySelectorAll('.qb-stat-pill').length).toBeGreaterThan(0)
    );
  });

  // ── 22. Tech stack coverage card appears ─────────────────────────────────

  test('tech stack coverage card is rendered when users and tech stacks are loaded', async () => {
    setupActiveUser();
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() =>
      expect(document.querySelector('.um-coverage-card')).toBeTruthy()
    );
  });

  // ── 23. Tech stack coverage shows stack names ─────────────────────────────

  test('tech stack coverage shows names from master tech stacks', async () => {
    setupActiveUser();
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() => {
      const card = document.querySelector('.um-coverage-card');
      expect(card).toBeTruthy();
      expect(card.innerHTML).toContain('Java');
    });
  });

  // ── 24. Loading state while APIs are in flight ───────────────────────────

  test('shows loading indicator while API calls are in flight', () => {
    API.get = jest.fn(() => new Promise(() => {}));
    render(<Wrapper><UserManagement /></Wrapper>);
    expect(document.querySelector('.loading')).toBeTruthy();
  });

  // ── 25. Error banner when APIs fail ─────────────────────────────────────

  test('shows error banner when API calls fail with a message', async () => {
    API.get = jest.fn().mockRejectedValue({
      response: { data: { error: 'Unauthorized access' } },
    });
    render(<Wrapper><UserManagement /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('Unauthorized access')
    );
  });
});

// ════════════════════════════════════════════════════════════════════════════
// KanbanBoard – extended coverage (ADMIN role)
// ════════════════════════════════════════════════════════════════════════════

describe('KanbanBoard – extended coverage', () => {
  /** Set up API.get with MCQS + tech stacks for ADMIN */
  function setupAdminMcqs(mcqs = MCQS) {
    API.get = jest.fn((url) => {
      if (url === '/admin/mcqs')         return Promise.resolve({ data: mcqs });
      if (url === '/master/tech-stacks') return Promise.resolve({ data: TECH_STACKS });
      return Promise.resolve({ data: [] });
    });
  }

  // ── 1. ADMIN role calls /admin/mcqs ─────────────────────────────────────

  test('ADMIN role fetches /admin/mcqs on mount', async () => {
    setupAdminMcqs();
    render(<Wrapper><KanbanBoard /></Wrapper>);
    await waitFor(() =>
      expect(API.get).toHaveBeenCalledWith('/admin/mcqs')
    );
  });

  // ── 2. DRAFT card appears in the board ──────────────────────────────────

  test('DRAFT MCQ question stem is visible in the board', async () => {
    setupAdminMcqs();
    render(<Wrapper><KanbanBoard /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('Q1 about Java')
    );
  });

  // ── 3. APPROVED card is rendered ────────────────────────────────────────

  test('APPROVED MCQ question stem is visible in the board', async () => {
    setupAdminMcqs();
    render(<Wrapper><KanbanBoard /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('Q2 about React')
    );
  });

  // ── 4. REJECTED card is rendered ────────────────────────────────────────

  test('REJECTED MCQ question stem is visible in the board', async () => {
    setupAdminMcqs();
    render(<Wrapper><KanbanBoard /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('Q3 rejected topic')
    );
  });

  // ── 5. All five columns render ───────────────────────────────────────────

  test('renders exactly 5 kanban columns after data loads', async () => {
    setupAdminMcqs();
    render(<Wrapper><KanbanBoard /></Wrapper>);
    await waitFor(() =>
      expect(document.querySelectorAll('.kanban-column').length).toBe(5)
    );
  });

  // ── 6. Stats bar active / approved / rejected counts ────────────────────

  test('stats bar shows active, approved and rejected count boxes', async () => {
    setupAdminMcqs();
    render(<Wrapper><KanbanBoard /></Wrapper>);
    await waitFor(() =>
      expect(document.querySelector('.kanban-stats-bar')).toBeTruthy()
    );
    // 3 MCQs: 1 DRAFT (active), 1 APPROVED, 1 REJECTED → active count = 1
    const statNums = Array.from(document.querySelectorAll('.kstat-num')).map(el => el.textContent);
    expect(statNums.includes('1')).toBe(true);
  });

  // ── 7. DRAFT column count badge shows correct count ──────────────────────

  test('DRAFT column count badge equals number of DRAFT MCQs', async () => {
    setupAdminMcqs();
    render(<Wrapper><KanbanBoard /></Wrapper>);
    await waitFor(() =>
      expect(document.querySelectorAll('.kanban-column').length).toBe(5)
    );
    const draftCol = document.querySelector('.kanban-column');
    const countBadge = draftCol.querySelector('.kanban-col-count');
    expect(countBadge.textContent).toBe('1');
  });

  // ── 8. Empty columns show the empty placeholder ──────────────────────────

  test('columns with no cards show the empty placeholder', async () => {
    setupAdminMcqs();
    render(<Wrapper><KanbanBoard /></Wrapper>);
    await waitFor(() =>
      expect(document.querySelectorAll('.kanban-column').length).toBe(5)
    );
    // READY_FOR_REVIEW and UNDER_REVIEW have no cards
    expect(document.querySelectorAll('.kanban-empty').length).toBeGreaterThan(0);
  });

  // ── 9. Search filters displayed cards ───────────────────────────────────

  test('typing in search input hides non-matching cards', async () => {
    setupAdminMcqs();
    render(<Wrapper><KanbanBoard /></Wrapper>);
    await waitFor(() => expect(document.body.innerHTML).toContain('Q1 about Java'));

    fireEvent.change(document.querySelector('.kanban-search'), {
      target: { value: 'Q2 about React' },
    });

    await waitFor(() => {
      expect(document.body.innerHTML).toContain('Q2 about React');
      expect(document.body.innerHTML).not.toContain('Q1 about Java');
    });
  });

  // ── 10. Clearing search restores all cards ───────────────────────────────

  test('clearing search input restores all cards', async () => {
    setupAdminMcqs();
    render(<Wrapper><KanbanBoard /></Wrapper>);
    await waitFor(() => expect(document.body.innerHTML).toContain('Q1 about Java'));

    const search = document.querySelector('.kanban-search');
    fireEvent.change(search, { target: { value: 'nomatch999' } });
    await waitFor(() => expect(document.body.innerHTML).not.toContain('Q1 about Java'));

    fireEvent.change(search, { target: { value: '' } });
    await waitFor(() => expect(document.body.innerHTML).toContain('Q1 about Java'));
  });

  // ── 11. Search by creator enterprise ID ─────────────────────────────────

  test('search by creator enterprise ID shows only matching cards', async () => {
    setupAdminMcqs();
    render(<Wrapper><KanbanBoard /></Wrapper>);
    await waitFor(() => expect(document.body.innerHTML).toContain('Q1 about Java'));

    fireEvent.change(document.querySelector('.kanban-search'), {
      target: { value: 'alice.brown' },
    });

    await waitFor(() => {
      expect(document.body.innerHTML).toContain('Q3 rejected topic');
      expect(document.body.innerHTML).not.toContain('Q1 about Java');
      expect(document.body.innerHTML).not.toContain('Q2 about React');
    });
  });

  // ── 12. Tech stack filter dropdown is populated ──────────────────────────

  test('tech stack filter select is populated with loaded tech stacks', async () => {
    setupAdminMcqs();
    render(<Wrapper><KanbanBoard /></Wrapper>);
    await waitFor(() => {
      const select = document.querySelector('.kanban-select');
      expect(select).toBeTruthy();
      expect(select.innerHTML).toContain('Java');
      expect(select.innerHTML).toContain('React');
    });
  });

  // ── 13. Tech stack filter hides non-matching cards ───────────────────────

  test('selecting a tech stack filter hides cards from other stacks', async () => {
    setupAdminMcqs();
    render(<Wrapper><KanbanBoard /></Wrapper>);
    await waitFor(() => expect(document.body.innerHTML).toContain('Q1 about Java'));

    // Select techStackId=2 (React)
    fireEvent.change(document.querySelector('.kanban-select'), {
      target: { value: '2' },
    });

    await waitFor(() => {
      expect(document.body.innerHTML).toContain('Q2 about React');
      expect(document.body.innerHTML).not.toContain('Q1 about Java');
    });
  });

  // ── 14. Card shows difficulty badge ─────────────────────────────────────

  test('kanban card renders the difficulty badge (EASY / MEDIUM / HARD)', async () => {
    setupAdminMcqs();
    render(<Wrapper><KanbanBoard /></Wrapper>);
    await waitFor(() =>
      expect(document.querySelectorAll('.kcard-tag--diff').length).toBeGreaterThan(0)
    );
    expect(document.body.innerHTML).toContain('EASY');
    expect(document.body.innerHTML).toContain('MEDIUM');
    expect(document.body.innerHTML).toContain('HARD');
  });

  // ── 15. Card shows tech stack tag ────────────────────────────────────────

  test('kanban card renders tech stack name tag', async () => {
    setupAdminMcqs();
    render(<Wrapper><KanbanBoard /></Wrapper>);
    await waitFor(() =>
      expect(document.querySelectorAll('.kcard-tag--tech').length).toBeGreaterThan(0)
    );
  });

  // ── 16. Card shows topic name tag ────────────────────────────────────────

  test('kanban card renders topic name tag', async () => {
    setupAdminMcqs();
    render(<Wrapper><KanbanBoard /></Wrapper>);
    await waitFor(() =>
      expect(document.querySelectorAll('.kcard-tag--topic').length).toBeGreaterThan(0)
    );
  });

  // ── 17. Card shows AI score ──────────────────────────────────────────────

  test('kanban card shows AI score when aiScore is present', async () => {
    setupAdminMcqs();
    render(<Wrapper><KanbanBoard /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('85') // aiScore for MCQS[0]
    );
    expect(document.body.innerHTML).toContain('Score');
  });

  // ── 18. Card shows creator full name ─────────────────────────────────────

  test('kanban card shows creator full name', async () => {
    setupAdminMcqs();
    render(<Wrapper><KanbanBoard /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('John Doe')
    );
  });

  // ── 19. Card shows reviewer name when set ────────────────────────────────

  test('kanban card shows reviewer name when reviewerFullName is set', async () => {
    setupAdminMcqs();
    render(<Wrapper><KanbanBoard /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('Bob Reviewer')
    );
  });

  // ── 20. Refresh button triggers a new API call ───────────────────────────

  test('clicking the Refresh button triggers another API.get call', async () => {
    setupAdminMcqs();
    render(<Wrapper><KanbanBoard /></Wrapper>);
    await waitFor(() =>
      expect(document.querySelectorAll('.kanban-column').length).toBe(5)
    );

    const callsBefore = API.get.mock.calls.length;
    fireEvent.click(document.querySelector('.kanban-refresh'));

    await waitFor(() =>
      expect(API.get.mock.calls.length).toBeGreaterThan(callsBefore)
    );
  });

  // ── 21. Card is clickable (has onClick / tabIndex) ───────────────────────

  test('kanban cards are focusable and clickable without throwing', async () => {
    setupAdminMcqs();
    render(<Wrapper><KanbanBoard /></Wrapper>);
    await waitFor(() => expect(document.querySelectorAll('.kanban-card').length).toBeGreaterThan(0));

    const card = document.querySelector('.kanban-card');
    expect(card.getAttribute('tabindex')).toBe('0');
    // clicking should not throw
    expect(() => fireEvent.click(card)).not.toThrow();
  });

  // ── 22. Enter key on card triggers onClick ───────────────────────────────

  test('pressing Enter on a kanban card triggers its action without error', async () => {
    setupAdminMcqs();
    render(<Wrapper><KanbanBoard /></Wrapper>);
    await waitFor(() => expect(document.querySelectorAll('.kanban-card').length).toBeGreaterThan(0));

    const card = document.querySelector('.kanban-card');
    expect(() => fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' })).not.toThrow();
  });

  // ── 23. Board renders search + select controls ───────────────────────────

  test('board header renders search input and tech stack select', async () => {
    setupAdminMcqs();
    render(<Wrapper><KanbanBoard /></Wrapper>);
    await waitFor(() => expect(API.get).toHaveBeenCalled());

    expect(document.querySelector('.kanban-search')).toBeTruthy();
    expect(document.querySelector('.kanban-select')).toBeTruthy();
  });

  // ── 24. Error state on fetch failure ────────────────────────────────────

  test('shows kanban-error element when MCQ fetch fails', async () => {
    API.get = jest.fn((url) => {
      if (url === '/master/tech-stacks') return Promise.resolve({ data: TECH_STACKS });
      return Promise.reject(new Error('Network error'));
    });
    render(<Wrapper><KanbanBoard /></Wrapper>);
    await waitFor(() =>
      expect(document.querySelector('.kanban-error')).toBeTruthy()
    );
  });

  // ── 25. Board with single MCQ: card id badge shown ──────────────────────

  test('card shows the MCQ id badge (e.g. #1)', async () => {
    setupAdminMcqs([MCQS[0]]);
    render(<Wrapper><KanbanBoard /></Wrapper>);
    await waitFor(() =>
      expect(document.body.innerHTML).toContain('#1')
    );
  });
});
