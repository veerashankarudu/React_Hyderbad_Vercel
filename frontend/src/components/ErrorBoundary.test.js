/**
 * ErrorBoundary.test.js — Tests for ErrorBoundary component
 */
import React from 'react';
import { render } from '@testing-library/react';

const ErrorBoundary = require('./ErrorBoundary').default;

// Component that throws an error
function ThrowError({ shouldThrow }) {
  if (shouldThrow) throw new Error('Test error');
  return <div>No error</div>;
}

describe('ErrorBoundary', () => {
  // Suppress React error boundary console.error noise
  const originalError = console.error;
  beforeAll(() => { console.error = jest.fn(); });
  afterAll(() => { console.error = originalError; });

  test('renders children when no error', () => {
    const { container } = render(
      <ErrorBoundary><div>Child content</div></ErrorBoundary>
    );
    expect(container.textContent).toContain('Child content');
  });

  test('renders fallback UI when child throws', () => {
    const { container } = render(
      <ErrorBoundary><ThrowError shouldThrow={true} /></ErrorBoundary>
    );
    expect(container.textContent).not.toContain('No error');
    // Should render some error fallback
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });

  test('catches error without crashing the whole app', () => {
    expect(() => {
      render(
        <ErrorBoundary><ThrowError shouldThrow={true} /></ErrorBoundary>
      );
    }).not.toThrow();
  });

  test('renders multiple children when no error', () => {
    const { container } = render(
      <ErrorBoundary>
        <span>Child 1</span>
        <span>Child 2</span>
      </ErrorBoundary>
    );
    expect(container.textContent).toContain('Child 1');
    expect(container.textContent).toContain('Child 2');
  });

  test('renders empty children without error', () => {
    const { container } = render(<ErrorBoundary>{null}</ErrorBoundary>);
    expect(container).toBeTruthy();
  });
});
