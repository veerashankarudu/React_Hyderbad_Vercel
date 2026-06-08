/**
 * AssignReviewerModal.test.js — Tests for AssignReviewerModal component
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import AssignReviewerModal from './AssignReviewerModal';

// Mock API
jest.mock('../api', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));
const API = require('../api');

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => {
      const map = {
        'arm.title': 'Assign Reviewer',
        'arm.loadingReviewers': 'Loading reviewers...',
        'arm.assigning': 'Assigning...',
        'arm.assign': 'Assign',
        'common.cancel': 'Cancel',
      };
      return map[key] || key;
    },
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

const mockMcq = {
  id: 1,
  questionStem: 'What is Spring Boot?',
  techStackName: 'Spring Boot',
  topicName: 'Core',
  creatorEnterpriseId: 'john.doe',
};

const mockReviewers = [
  { id: 10, fullName: 'Alice Smith', enterpriseId: 'alice.smith' },
  { id: 20, fullName: 'Bob Jones', enterpriseId: 'bob.jones' },
];

describe('AssignReviewerModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    API.get.mockResolvedValue({ data: mockReviewers });
    API.post.mockResolvedValue({});
  });

  test('renders modal title', async () => {
    const { getByText } = render(
      <AssignReviewerModal mcq={mockMcq} onClose={jest.fn()} onAssigned={jest.fn()} />
    );
    expect(getByText('Assign Reviewer')).toBeTruthy();
  });

  test('renders MCQ question stem', () => {
    const { getByText } = render(
      <AssignReviewerModal mcq={mockMcq} onClose={jest.fn()} onAssigned={jest.fn()} />
    );
    expect(getByText('What is Spring Boot?')).toBeTruthy();
  });

  test('renders tech stack and topic info', () => {
    const { container } = render(
      <AssignReviewerModal mcq={mockMcq} onClose={jest.fn()} onAssigned={jest.fn()} />
    );
    expect(container.textContent).toContain('Spring Boot');
    expect(container.textContent).toContain('Core');
  });

  test('fetches reviewers from API on mount', () => {
    render(<AssignReviewerModal mcq={mockMcq} onClose={jest.fn()} onAssigned={jest.fn()} />);
    expect(API.get).toHaveBeenCalledWith('/admin/mcqs/1/eligible-reviewers');
  });

  test('displays reviewer names after loading', async () => {
    const { getByText } = render(
      <AssignReviewerModal mcq={mockMcq} onClose={jest.fn()} onAssigned={jest.fn()} />
    );
    await waitFor(() => expect(getByText('Alice Smith')).toBeTruthy());
    expect(getByText('Bob Jones')).toBeTruthy();
  });

  test('displays reviewer enterprise IDs', async () => {
    const { getByText } = render(
      <AssignReviewerModal mcq={mockMcq} onClose={jest.fn()} onAssigned={jest.fn()} />
    );
    await waitFor(() => expect(getByText('alice.smith')).toBeTruthy());
  });

  test('shows error when API fails to load reviewers', async () => {
    API.get.mockRejectedValue(new Error('Network error'));
    const { findByText } = render(
      <AssignReviewerModal mcq={mockMcq} onClose={jest.fn()} onAssigned={jest.fn()} />
    );
    expect(await findByText('Failed to load reviewers')).toBeTruthy();
  });

  test('assign button is disabled when no reviewer is selected', async () => {
    const { getByText, container } = render(
      <AssignReviewerModal mcq={mockMcq} onClose={jest.fn()} onAssigned={jest.fn()} />
    );
    await waitFor(() => expect(container.textContent).toContain('Alice Smith'));
    const assignBtn = getByText('Assign');
    expect(assignBtn.disabled).toBe(true);
  });

  test('selecting a reviewer enables the assign button', async () => {
    const { getByText, container } = render(
      <AssignReviewerModal mcq={mockMcq} onClose={jest.fn()} onAssigned={jest.fn()} />
    );
    await waitFor(() => expect(container.textContent).toContain('Alice Smith'));
    const radio = container.querySelectorAll('input[type="radio"]')[0];
    fireEvent.click(radio);
    const assignBtn = getByText('Assign');
    expect(assignBtn.disabled).toBe(false);
  });

  test('clicking assign calls API post with selected reviewer', async () => {
    const onAssigned = jest.fn();
    const { getByText, container } = render(
      <AssignReviewerModal mcq={mockMcq} onClose={jest.fn()} onAssigned={onAssigned} />
    );
    await waitFor(() => expect(container.textContent).toContain('Alice Smith'));
    fireEvent.click(container.querySelectorAll('input[type="radio"]')[0]);
    fireEvent.click(getByText('Assign'));
    await waitFor(() => expect(API.post).toHaveBeenCalledWith('/admin/mcqs/1/assign-reviewer', { reviewerId: 10 }));
    expect(onAssigned).toHaveBeenCalled();
  });

  test('shows error when assign API fails', async () => {
    API.post.mockRejectedValue({ response: { data: { message: 'Already assigned' } } });
    const { getByText, container } = render(
      <AssignReviewerModal mcq={mockMcq} onClose={jest.fn()} onAssigned={jest.fn()} />
    );
    await waitFor(() => expect(container.textContent).toContain('Alice Smith'));
    fireEvent.click(container.querySelectorAll('input[type="radio"]')[0]);
    fireEvent.click(getByText('Assign'));
    await waitFor(() => expect(container.textContent).toContain('Already assigned'));
  });

  test('clicking close button calls onClose', async () => {
    const onClose = jest.fn();
    const { container } = render(
      <AssignReviewerModal mcq={mockMcq} onClose={onClose} onAssigned={jest.fn()} />
    );
    fireEvent.click(container.querySelector('.modal-close'));
    expect(onClose).toHaveBeenCalled();
  });

  test('clicking overlay calls onClose', () => {
    const onClose = jest.fn();
    const { container } = render(
      <AssignReviewerModal mcq={mockMcq} onClose={onClose} onAssigned={jest.fn()} />
    );
    const overlay = container.querySelector('.modal-overlay');
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });

  test('clicking modal box does not close', () => {
    const onClose = jest.fn();
    const { container } = render(
      <AssignReviewerModal mcq={mockMcq} onClose={onClose} onAssigned={jest.fn()} />
    );
    const box = container.querySelector('.modal-box');
    fireEvent.click(box);
    expect(onClose).not.toHaveBeenCalled();
  });

  test('cancel button calls onClose', async () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <AssignReviewerModal mcq={mockMcq} onClose={onClose} onAssigned={jest.fn()} />
    );
    fireEvent.click(getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  test('renders reviewer initials avatar', async () => {
    const { container } = render(
      <AssignReviewerModal mcq={mockMcq} onClose={jest.fn()} onAssigned={jest.fn()} />
    );
    await waitFor(() => expect(container.textContent).toContain('AS'));
    expect(container.textContent).toContain('BJ');
  });
});
