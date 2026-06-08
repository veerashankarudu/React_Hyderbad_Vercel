/**
 * ChangePasswordModal.test.js — Tests for ChangePasswordModal component
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import ChangePasswordModal from './ChangePasswordModal';

jest.mock('../api', () => ({
  post: jest.fn(),
}));
const API = require('../api');

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => {
      const map = {
        'common.changePassword': 'Change Password',
        'common.cancel': 'Cancel',
        'common.close': 'Close',
        'common.saving': 'Saving...',
        'cp.currentPassword': 'Current Password',
        'cp.newPassword': 'New Password',
        'cp.confirmNewPassword': 'Confirm New Password',
        'cp.updatePassword': 'Update Password',
        'cp.passwordChanged': 'Password Changed!',
        'cp.passwordChangedMsg': 'Your password has been updated successfully.',
        'cp.currentPasswordPlaceholder': 'Enter current password',
        'cp.newPasswordPlaceholder': 'Enter new password',
        'cp.confirmPasswordPlaceholder': 'Confirm new password',
      };
      return map[key] || key;
    },
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

jest.mock('lucide-react', () => ({
  CheckCircle2: () => <span data-testid="check-icon">✓</span>,
}));

describe('ChangePasswordModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    API.post.mockResolvedValue({});
  });

  test('renders modal title', () => {
    const { getByText } = render(<ChangePasswordModal onClose={jest.fn()} />);
    expect(getByText('Change Password')).toBeTruthy();
  });

  test('renders three password input fields', () => {
    const { container } = render(<ChangePasswordModal onClose={jest.fn()} />);
    const inputs = container.querySelectorAll('input[type="password"]');
    expect(inputs.length).toBe(3);
  });

  test('renders current password label', () => {
    const { getByText } = render(<ChangePasswordModal onClose={jest.fn()} />);
    expect(getByText('Current Password')).toBeTruthy();
  });

  test('renders new password label', () => {
    const { getByText } = render(<ChangePasswordModal onClose={jest.fn()} />);
    expect(getByText('New Password')).toBeTruthy();
  });

  test('renders confirm password label', () => {
    const { getByText } = render(<ChangePasswordModal onClose={jest.fn()} />);
    expect(getByText('Confirm New Password')).toBeTruthy();
  });

  test('renders cancel and submit buttons', () => {
    const { getByText } = render(<ChangePasswordModal onClose={jest.fn()} />);
    expect(getByText('Cancel')).toBeTruthy();
    expect(getByText('Update Password')).toBeTruthy();
  });

  test('cancel button calls onClose', () => {
    const onClose = jest.fn();
    const { getByText } = render(<ChangePasswordModal onClose={onClose} />);
    fireEvent.click(getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  test('shows error when passwords do not match', () => {
    const { container, getByText } = render(<ChangePasswordModal onClose={jest.fn()} />);
    const inputs = container.querySelectorAll('input[type="password"]');
    fireEvent.change(inputs[0], { target: { name: 'currentPassword', value: 'old123' } });
    fireEvent.change(inputs[1], { target: { name: 'newPassword', value: 'newpass1' } });
    fireEvent.change(inputs[2], { target: { name: 'confirmPassword', value: 'different' } });
    fireEvent.submit(container.querySelector('form'));
    expect(container.textContent).toContain('New passwords do not match.');
  });

  test('shows error when new password is too short', () => {
    const { container } = render(<ChangePasswordModal onClose={jest.fn()} />);
    const inputs = container.querySelectorAll('input[type="password"]');
    fireEvent.change(inputs[0], { target: { name: 'currentPassword', value: 'old123' } });
    fireEvent.change(inputs[1], { target: { name: 'newPassword', value: '12345' } });
    fireEvent.change(inputs[2], { target: { name: 'confirmPassword', value: '12345' } });
    fireEvent.submit(container.querySelector('form'));
    expect(container.textContent).toContain('at least 6 characters');
  });

  test('calls API on valid submission', async () => {
    const { container } = render(<ChangePasswordModal onClose={jest.fn()} />);
    const inputs = container.querySelectorAll('input[type="password"]');
    fireEvent.change(inputs[0], { target: { name: 'currentPassword', value: 'oldpass' } });
    fireEvent.change(inputs[1], { target: { name: 'newPassword', value: 'newpass123' } });
    fireEvent.change(inputs[2], { target: { name: 'confirmPassword', value: 'newpass123' } });
    fireEvent.submit(container.querySelector('form'));
    await waitFor(() => expect(API.post).toHaveBeenCalledWith('/auth/change-password', {
      currentPassword: 'oldpass',
      newPassword: 'newpass123',
    }));
  });

  test('shows success message after successful change', async () => {
    const { container, findByText } = render(<ChangePasswordModal onClose={jest.fn()} />);
    const inputs = container.querySelectorAll('input[type="password"]');
    fireEvent.change(inputs[0], { target: { name: 'currentPassword', value: 'oldpass' } });
    fireEvent.change(inputs[1], { target: { name: 'newPassword', value: 'newpass123' } });
    fireEvent.change(inputs[2], { target: { name: 'confirmPassword', value: 'newpass123' } });
    fireEvent.submit(container.querySelector('form'));
    expect(await findByText('Password Changed!')).toBeTruthy();
  });

  test('shows close button after success', async () => {
    const { container, findByText } = render(<ChangePasswordModal onClose={jest.fn()} />);
    const inputs = container.querySelectorAll('input[type="password"]');
    fireEvent.change(inputs[0], { target: { name: 'currentPassword', value: 'oldpass' } });
    fireEvent.change(inputs[1], { target: { name: 'newPassword', value: 'newpass123' } });
    fireEvent.change(inputs[2], { target: { name: 'confirmPassword', value: 'newpass123' } });
    fireEvent.submit(container.querySelector('form'));
    const closeBtn = await findByText('Close');
    expect(closeBtn).toBeTruthy();
  });

  test('close button after success calls onClose', async () => {
    const onClose = jest.fn();
    const { container, findByText } = render(<ChangePasswordModal onClose={onClose} />);
    const inputs = container.querySelectorAll('input[type="password"]');
    fireEvent.change(inputs[0], { target: { name: 'currentPassword', value: 'oldpass' } });
    fireEvent.change(inputs[1], { target: { name: 'newPassword', value: 'newpass123' } });
    fireEvent.change(inputs[2], { target: { name: 'confirmPassword', value: 'newpass123' } });
    fireEvent.submit(container.querySelector('form'));
    const closeBtn = await findByText('Close');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  test('shows API error message on failure', async () => {
    API.post.mockRejectedValue({ response: { data: { error: 'Incorrect current password' } } });
    const { container, findByText } = render(<ChangePasswordModal onClose={jest.fn()} />);
    const inputs = container.querySelectorAll('input[type="password"]');
    fireEvent.change(inputs[0], { target: { name: 'currentPassword', value: 'wrong' } });
    fireEvent.change(inputs[1], { target: { name: 'newPassword', value: 'newpass123' } });
    fireEvent.change(inputs[2], { target: { name: 'confirmPassword', value: 'newpass123' } });
    fireEvent.submit(container.querySelector('form'));
    expect(await findByText('Incorrect current password')).toBeTruthy();
  });

  test('shows generic error when API error has no message', async () => {
    API.post.mockRejectedValue({ response: { data: {} } });
    const { container, findByText } = render(<ChangePasswordModal onClose={jest.fn()} />);
    const inputs = container.querySelectorAll('input[type="password"]');
    fireEvent.change(inputs[0], { target: { name: 'currentPassword', value: 'old' } });
    fireEvent.change(inputs[1], { target: { name: 'newPassword', value: 'newpass123' } });
    fireEvent.change(inputs[2], { target: { name: 'confirmPassword', value: 'newpass123' } });
    fireEvent.submit(container.querySelector('form'));
    expect(await findByText('Password change failed.')).toBeTruthy();
  });

  test('typing in input clears previous error', () => {
    const { container } = render(<ChangePasswordModal onClose={jest.fn()} />);
    const inputs = container.querySelectorAll('input[type="password"]');
    fireEvent.change(inputs[0], { target: { name: 'currentPassword', value: 'old' } });
    fireEvent.change(inputs[1], { target: { name: 'newPassword', value: 'short' } });
    fireEvent.change(inputs[2], { target: { name: 'confirmPassword', value: 'short' } });
    fireEvent.submit(container.querySelector('form'));
    expect(container.textContent).toContain('at least 6');
    // Now type again to clear error
    fireEvent.change(inputs[1], { target: { name: 'newPassword', value: 'longer123' } });
    expect(container.textContent).not.toContain('at least 6');
  });

  test('form inputs have required attribute', () => {
    const { container } = render(<ChangePasswordModal onClose={jest.fn()} />);
    const inputs = container.querySelectorAll('input[type="password"]');
    inputs.forEach(input => expect(input.required).toBe(true));
  });
});
