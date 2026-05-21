import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import Login from './Login';
import API from '../api';

// Mock API module
jest.mock('../api');

// Mock AuthContext so useAuth() always returns a stable object
const mockLogin = jest.fn();
jest.mock('../AuthContext', () => ({
  useAuth: () => ({ user: null, login: mockLogin, logout: jest.fn() }),
}));

// Wrapper with i18n
const Wrapper = ({ children }) => <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;

describe('Login Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock demo users endpoint
    API.get = jest.fn().mockResolvedValue({ data: [] });
    API.post = jest.fn();
  });

  test('renders enterprise ID input field', () => {
    render(<Wrapper><Login /></Wrapper>);
    // Placeholder is 'e.g. gaurav.a.bhola' — just check a text input exists
    const textInput = document.querySelector('input[type="text"]');
    expect(textInput).toBeTruthy();
  });

  test('renders password input field', () => {
    render(<Wrapper><Login /></Wrapper>);
    const passwordInput = document.querySelector('input[type="password"]');
    expect(passwordInput).toBeTruthy();
  });

  test('renders sign in button', () => {
    render(<Wrapper><Login /></Wrapper>);
    const btn = document.querySelector('button[type="submit"]');
    expect(btn).toBeTruthy();
  });

  test('shows error message on failed login', async () => {
    API.post = jest.fn().mockRejectedValue({
      response: { data: { message: 'Invalid credentials' } }
    });
    render(<Wrapper><Login /></Wrapper>);

    const inputs = document.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'wrong.user' } });
    fireEvent.change(inputs[1], { target: { value: 'wrongpass' } });

    const form = document.querySelector('form');
    if (form) fireEvent.submit(form);

    await waitFor(() => {
      const errorEl = document.querySelector('.login-error, [class*="error"]');
      expect(errorEl || screen.queryByText(/Invalid credentials/i) || screen.queryByText(/invalid/i)).toBeTruthy();
    });
  });

  test('renders app brand name', () => {
    render(<Wrapper><Login /></Wrapper>);
    // The login page shows the brand text — translation: 'Smart Quiz AI Hub'
    expect(document.body.innerHTML).toContain('Smart Quiz AI Hub');
  });

  test('calls API.post on form submit', async () => {
    API.post = jest.fn().mockResolvedValue({
      data: { token: 'tok', role: 'SME', enterpriseId: 'user' }
    });
    render(<Wrapper><Login /></Wrapper>);

    const inputs = document.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'user.name' } });
    fireEvent.change(inputs[1], { target: { value: 'Pass1234' } });

    const form = document.querySelector('form');
    if (form) fireEvent.submit(form);

    await waitFor(() => {
      expect(API.post).toHaveBeenCalled();
    });
  });

  test('login is called with token data on success', async () => {
    const tokenData = { token: 'abc', role: 'ADMIN', enterpriseId: 'admin' };
    API.post = jest.fn().mockResolvedValue({ data: tokenData });
    render(<Wrapper><Login /></Wrapper>);

    const inputs = document.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'admin.user' } });
    fireEvent.change(inputs[1], { target: { value: 'Admin@123' } });

    const form = document.querySelector('form');
    if (form) fireEvent.submit(form);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(tokenData);
    });
  });

  test('renders forgot password link', () => {
    render(<Wrapper><Login /></Wrapper>);
    const link = screen.queryByText(/forgot/i) || document.querySelector('a[href*="forgot"]');
    expect(link).toBeTruthy();
  });

  test('renders register/signup link', () => {
    render(<Wrapper><Login /></Wrapper>);
    // The link text is 'Sign Up' (translation key login.signUp) and href='/register'
    const link = document.querySelector('a[href="/register"]');
    expect(link).toBeTruthy();
  });
});
