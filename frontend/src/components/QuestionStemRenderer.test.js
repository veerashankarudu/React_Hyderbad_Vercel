/**
 * QuestionStemRenderer.test.js — Tests for QuestionStemRenderer component
 */
import React from 'react';
import { render } from '@testing-library/react';

const QuestionStemRenderer = require('./QuestionStemRenderer').default;

// Mock hljs
beforeEach(() => {
  window.hljs = { highlightElement: jest.fn() };
});

describe('QuestionStemRenderer', () => {
  test('returns null when text is empty', () => {
    const { container } = render(<QuestionStemRenderer text="" />);
    expect(container.innerHTML).toBe('');
  });

  test('returns null when text is null', () => {
    const { container } = render(<QuestionStemRenderer text={null} />);
    expect(container.innerHTML).toBe('');
  });

  test('returns null when text is undefined', () => {
    const { container } = render(<QuestionStemRenderer text={undefined} />);
    expect(container.innerHTML).toBe('');
  });

  test('renders plain text without code blocks', () => {
    const { container } = render(<QuestionStemRenderer text="Hello World" />);
    expect(container.textContent).toContain('Hello World');
    expect(container.querySelector('pre')).toBeNull();
  });

  test('renders text with className qsr-root', () => {
    const { container } = render(<QuestionStemRenderer text="Test" />);
    expect(container.querySelector('.qsr-root')).toBeTruthy();
  });

  test('applies custom className', () => {
    const { container } = render(<QuestionStemRenderer text="Test" className="custom" />);
    expect(container.querySelector('.custom')).toBeTruthy();
  });

  test('renders fenced code block with pre and code', () => {
    const text = '```java\nSystem.out.println("hi");\n```';
    const { container } = render(<QuestionStemRenderer text={text} />);
    expect(container.querySelector('pre')).toBeTruthy();
    expect(container.querySelector('code')).toBeTruthy();
  });

  test('displays language badge for code blocks', () => {
    const text = '```python\nprint("hello")\n```';
    const { container } = render(<QuestionStemRenderer text={text} />);
    expect(container.querySelector('.qsr-lang-badge').textContent).toBe('python');
  });

  test('renders code content correctly', () => {
    const text = '```js\nconst x = 1;\n```';
    const { container } = render(<QuestionStemRenderer text={text} />);
    expect(container.querySelector('code').textContent).toContain('const x = 1;');
  });

  test('renders text before code block', () => {
    const text = 'Question:\n```java\ncode\n```';
    const { container } = render(<QuestionStemRenderer text={text} />);
    expect(container.textContent).toContain('Question:');
    expect(container.querySelector('code').textContent).toContain('code');
  });

  test('renders text after code block', () => {
    const text = '```java\ncode\n```\nWhat does this print?';
    const { container } = render(<QuestionStemRenderer text={text} />);
    expect(container.textContent).toContain('What does this print?');
  });

  test('renders multiple code blocks', () => {
    const text = '```java\nA\n```\n\n```python\nB\n```';
    const { container } = render(<QuestionStemRenderer text={text} />);
    expect(container.querySelectorAll('pre').length).toBe(2);
  });

  test('calls hljs.highlightElement for code blocks', () => {
    const text = '```java\ncode\n```';
    render(<QuestionStemRenderer text={text} />);
    expect(window.hljs.highlightElement).toHaveBeenCalled();
  });

  test('does not call hljs if window.hljs is undefined', () => {
    delete window.hljs;
    const text = '```java\ncode\n```';
    expect(() => render(<QuestionStemRenderer text={text} />)).not.toThrow();
  });

  test('preserves newlines in text as br elements', () => {
    const text = 'Line 1\nLine 2\nLine 3';
    const { container } = render(<QuestionStemRenderer text={text} />);
    expect(container.querySelectorAll('br').length).toBe(2);
  });

  test('renders code block without language as "code"', () => {
    const text = '```\nplain code\n```';
    const { container } = render(<QuestionStemRenderer text={text} />);
    expect(container.querySelector('.qsr-lang-badge').textContent).toBe('code');
  });

  test('trims trailing whitespace from code content', () => {
    const text = '```java\nline1\nline2  \n```';
    const { container } = render(<QuestionStemRenderer text={text} />);
    expect(container.querySelector('code').textContent).toBe('line1\nline2');
  });
});
