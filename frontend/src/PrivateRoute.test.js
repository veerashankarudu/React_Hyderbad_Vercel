/**
 * PrivateRoute.test.js — Tests for PrivateRoute component
 */
import React from 'react';
import { render } from '@testing-library/react';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  Navigate: (props) => { mockNavigate(props); return null; },
}));

// Mock AuthContext
let mockUser = null;
jest.mock('./AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

const PrivateRoute = require('./PrivateRoute').default;

describe('PrivateRoute', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUser = null;
  });

  test('redirects to /login when user is not authenticated', () => {
    mockUser = null;
    render(<PrivateRoute><div>Secret</div></PrivateRoute>);
    expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ to: '/login', replace: true }));
  });

  test('renders children when user is authenticated', () => {
    mockUser = { role: 'ADMIN', name: 'John' };
    const { getByText } = render(<PrivateRoute><div>Secret Content</div></PrivateRoute>);
    expect(getByText('Secret Content')).toBeTruthy();
  });

  test('redirects to / when user role does not match requiredRole', () => {
    mockUser = { role: 'SME', name: 'Jane' };
    render(<PrivateRoute requiredRole="ADMIN"><div>Admin Only</div></PrivateRoute>);
    expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ to: '/', replace: true }));
  });

  test('renders children when user role matches requiredRole', () => {
    mockUser = { role: 'ADMIN', name: 'Admin User' };
    const { getByText } = render(<PrivateRoute requiredRole="ADMIN"><div>Admin Page</div></PrivateRoute>);
    expect(getByText('Admin Page')).toBeTruthy();
  });

  test('renders without requiredRole when user is authenticated', () => {
    mockUser = { role: 'SME', name: 'User' };
    const { getByText } = render(<PrivateRoute><div>Any Role</div></PrivateRoute>);
    expect(getByText('Any Role')).toBeTruthy();
  });

  test('does not render children when user is null', () => {
    mockUser = null;
    const { queryByText } = render(<PrivateRoute><div>Hidden</div></PrivateRoute>);
    expect(queryByText('Hidden')).toBeNull();
  });

  test('does not render children when role mismatch', () => {
    mockUser = { role: 'USER', name: 'Test' };
    const { queryByText } = render(<PrivateRoute requiredRole="ADMIN"><div>Admin</div></PrivateRoute>);
    expect(queryByText('Admin')).toBeNull();
  });

  test('renders multiple children when authenticated', () => {
    mockUser = { role: 'ADMIN', name: 'Admin' };
    const { getByText } = render(
      <PrivateRoute>
        <div>Child 1</div>
        <div>Child 2</div>
      </PrivateRoute>
    );
    expect(getByText('Child 1')).toBeTruthy();
    expect(getByText('Child 2')).toBeTruthy();
  });
});
