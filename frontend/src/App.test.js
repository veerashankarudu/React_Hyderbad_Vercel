import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import PrivateRoute from './PrivateRoute';

// Simple router wrapper for tests that don't need MemoryRouter
function RouterWrapper({ children }) {
  return <div>{children}</div>;
}

// ─── AuthContext Tests ────────────────────────────────────────────────────────

function DisplayUser() {
  const { user } = useAuth();
  return <div>{user ? user.fullName : 'not logged in'}</div>;
}

function LoginButton() {
  const { login, logout } = useAuth();
  return (
    <>
      <button onClick={() => login({ token: 'tok', fullName: 'Test User', role: 'SME' })}>login</button>
      <button onClick={() => logout()}>logout</button>
    </>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('initial state is not logged in when localStorage is empty', () => {
    render(
      <AuthProvider><DisplayUser /></AuthProvider>
    );
    expect(screen.getByText('not logged in')).toBeInTheDocument();
  });

  test('login sets user in context', () => {
    render(
      <AuthProvider><DisplayUser /><LoginButton /></AuthProvider>
    );
    act(() => {
      screen.getByText('login').click();
    });
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  test('login stores token in localStorage', () => {
    render(
      <AuthProvider><LoginButton /></AuthProvider>
    );
    act(() => {
      screen.getByText('login').click();
    });
    expect(localStorage.getItem('token')).toBe('tok');
  });

  test('logout clears user from context', () => {
    render(
      <AuthProvider><DisplayUser /><LoginButton /></AuthProvider>
    );
    act(() => { screen.getByText('login').click(); });
    act(() => { screen.getByText('logout').click(); });
    expect(screen.getByText('not logged in')).toBeInTheDocument();
  });

  test('logout removes token from localStorage', () => {
    render(
      <AuthProvider><LoginButton /></AuthProvider>
    );
    act(() => { screen.getByText('login').click(); });
    act(() => { screen.getByText('logout').click(); });
    expect(localStorage.getItem('token')).toBeNull();
  });

  test('user is restored from localStorage on mount', () => {
    localStorage.setItem('user', JSON.stringify({ fullName: 'Saved User', role: 'ADMIN' }));
    render(
      <AuthProvider><DisplayUser /></AuthProvider>
    );
    expect(screen.getByText('Saved User')).toBeInTheDocument();
  });

  test('corrupted localStorage does not crash app', () => {
    localStorage.setItem('user', 'not-valid-json{');
    expect(() => render(
      <AuthProvider><DisplayUser /></AuthProvider>
    )).not.toThrow();
  });
});

// ─── PrivateRoute Tests ───────────────────────────────────────────────────────

describe('PrivateRoute', () => {
  beforeEach(() => { localStorage.clear(); });

  test('redirects to /login when not logged in', () => {
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <AuthProvider>
          <PrivateRoute><div>Protected Content</div></PrivateRoute>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  test('renders children when user is logged in', () => {
    localStorage.setItem('user', JSON.stringify({ fullName: 'User', role: 'SME' }));
    render(
      <MemoryRouter>
        <AuthProvider>
          <PrivateRoute><div>Protected Content</div></PrivateRoute>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  test('redirects to / when role does not match', () => {
    localStorage.setItem('user', JSON.stringify({ fullName: 'SME', role: 'SME' }));
    render(
      <MemoryRouter>
        <AuthProvider>
          <PrivateRoute requiredRole="ADMIN"><div>Admin Only</div></PrivateRoute>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.queryByText('Admin Only')).not.toBeInTheDocument();
  });

  test('renders children when role matches', () => {
    localStorage.setItem('user', JSON.stringify({ fullName: 'Admin', role: 'ADMIN' }));
    render(
      <MemoryRouter>
        <AuthProvider>
          <PrivateRoute requiredRole="ADMIN"><div>Admin Only</div></PrivateRoute>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('Admin Only')).toBeInTheDocument();
  });

  test('renders children with no requiredRole check for any logged-in user', () => {
    localStorage.setItem('user', JSON.stringify({ fullName: 'SME', role: 'SME' }));
    render(
      <MemoryRouter>
        <AuthProvider>
          <PrivateRoute><div>Open to all</div></PrivateRoute>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('Open to all')).toBeInTheDocument();
  });
});
