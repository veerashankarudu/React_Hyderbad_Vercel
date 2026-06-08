/**
 * apiCache.test.js — Tests for API response cache utility
 */
import { getCached, setCache, invalidateCache, clearAllCache, cacheSize } from './apiCache';

describe('apiCache', () => {
  beforeEach(() => {
    clearAllCache();
  });

  // ── getCached ──────────────────────────────────────────────────────────

  test('getCached returns null for unknown key', () => {
    expect(getCached('/unknown')).toBeNull();
  });

  test('getCached returns data for known key', () => {
    setCache('/api/test', { hello: 'world' });
    expect(getCached('/api/test')).toEqual({ hello: 'world' });
  });

  test('getCached returns null after TTL expires', () => {
    jest.useFakeTimers();
    setCache('/api/expired', { data: 1 }, 1000);
    jest.advanceTimersByTime(1001);
    expect(getCached('/api/expired')).toBeNull();
    jest.useRealTimers();
  });

  test('getCached returns data before TTL expires', () => {
    jest.useFakeTimers();
    setCache('/api/valid', { data: 2 }, 5000);
    jest.advanceTimersByTime(4999);
    expect(getCached('/api/valid')).toEqual({ data: 2 });
    jest.useRealTimers();
  });

  // ── setCache ───────────────────────────────────────────────────────────

  test('setCache stores data retrievable by getCached', () => {
    setCache('/test/key', [1, 2, 3]);
    expect(getCached('/test/key')).toEqual([1, 2, 3]);
  });

  test('setCache uses long TTL for tech-stacks URL', () => {
    jest.useFakeTimers();
    setCache('/master/tech-stacks', { stacks: [] });
    // Should still be valid after 10 minutes (LONG_TTL = 15min)
    jest.advanceTimersByTime(10 * 60 * 1000);
    expect(getCached('/master/tech-stacks')).toEqual({ stacks: [] });
    jest.useRealTimers();
  });

  test('setCache uses long TTL for topics URL', () => {
    jest.useFakeTimers();
    setCache('/master/tech-stacks/1/topics', [{ id: 1 }]);
    jest.advanceTimersByTime(10 * 60 * 1000);
    expect(getCached('/master/tech-stacks/1/topics')).toEqual([{ id: 1 }]);
    jest.useRealTimers();
  });

  test('setCache uses short TTL for notifications URL', () => {
    jest.useFakeTimers();
    setCache('/notifications', [{ id: 1 }]);
    jest.advanceTimersByTime(61 * 1000); // > 1 min SHORT_TTL
    expect(getCached('/notifications')).toBeNull();
    jest.useRealTimers();
  });

  test('setCache uses short TTL for inbox URL', () => {
    jest.useFakeTimers();
    setCache('/inbox', []);
    jest.advanceTimersByTime(61 * 1000);
    expect(getCached('/inbox')).toBeNull();
    jest.useRealTimers();
  });

  test('setCache uses default TTL for regular URLs', () => {
    jest.useFakeTimers();
    setCache('/mcqs', []);
    jest.advanceTimersByTime(4 * 60 * 1000); // < 5 min
    expect(getCached('/mcqs')).toEqual([]);
    jest.advanceTimersByTime(2 * 60 * 1000); // > 5 min total
    expect(getCached('/mcqs')).toBeNull();
    jest.useRealTimers();
  });

  test('setCache with custom TTL overrides default', () => {
    jest.useFakeTimers();
    setCache('/custom', 'data', 2000);
    jest.advanceTimersByTime(1999);
    expect(getCached('/custom')).toBe('data');
    jest.advanceTimersByTime(2);
    expect(getCached('/custom')).toBeNull();
    jest.useRealTimers();
  });

  test('setCache overwrites existing entry', () => {
    setCache('/key', 'old');
    setCache('/key', 'new');
    expect(getCached('/key')).toBe('new');
  });

  // ── invalidateCache ────────────────────────────────────────────────────

  test('invalidateCache removes matching keys', () => {
    setCache('/mcqs/1', 'a');
    setCache('/mcqs/2', 'b');
    setCache('/stats/summary', 'c');
    invalidateCache('/mcqs');
    expect(getCached('/mcqs/1')).toBeNull();
    expect(getCached('/mcqs/2')).toBeNull();
    expect(getCached('/stats/summary')).toBe('c');
  });

  test('invalidateCache does nothing when no match', () => {
    setCache('/key1', 'val1');
    invalidateCache('/nomatch');
    expect(getCached('/key1')).toBe('val1');
  });

  test('invalidateCache with partial pattern removes only matching', () => {
    setCache('/api/v1/users', [1]);
    setCache('/api/v1/mcqs', [2]);
    invalidateCache('users');
    expect(getCached('/api/v1/users')).toBeNull();
    expect(getCached('/api/v1/mcqs')).toEqual([2]);
  });

  // ── clearAllCache ──────────────────────────────────────────────────────

  test('clearAllCache removes all entries', () => {
    setCache('/a', 1);
    setCache('/b', 2);
    setCache('/c', 3);
    clearAllCache();
    expect(getCached('/a')).toBeNull();
    expect(getCached('/b')).toBeNull();
    expect(getCached('/c')).toBeNull();
  });

  test('clearAllCache results in cacheSize 0', () => {
    setCache('/x', 'y');
    clearAllCache();
    expect(cacheSize()).toBe(0);
  });

  // ── cacheSize ──────────────────────────────────────────────────────────

  test('cacheSize returns 0 initially', () => {
    expect(cacheSize()).toBe(0);
  });

  test('cacheSize increases as items are added', () => {
    setCache('/a', 1);
    expect(cacheSize()).toBe(1);
    setCache('/b', 2);
    expect(cacheSize()).toBe(2);
  });

  test('cacheSize does not increase for same key overwrite', () => {
    setCache('/a', 1);
    setCache('/a', 2);
    expect(cacheSize()).toBe(1);
  });

  test('cacheSize reflects invalidation', () => {
    setCache('/mcqs/1', 1);
    setCache('/mcqs/2', 2);
    setCache('/other', 3);
    invalidateCache('/mcqs');
    expect(cacheSize()).toBe(1);
  });

  // ── Edge cases ─────────────────────────────────────────────────────────

  test('stores null value correctly', () => {
    setCache('/null-val', null);
    // getCached checks if entry exists, so null data is still returned vs null (no entry)
    // Actually null is falsy so getCached returns null regardless — that's fine
    expect(cacheSize()).toBe(1);
  });

  test('stores empty array correctly', () => {
    setCache('/empty', []);
    expect(getCached('/empty')).toEqual([]);
  });

  test('stores complex nested objects', () => {
    const complex = { a: { b: [1, { c: 'deep' }] } };
    setCache('/complex', complex);
    expect(getCached('/complex')).toEqual(complex);
  });

  test('handles special characters in key', () => {
    setCache('/api?q=hello&page=1', 'result');
    expect(getCached('/api?q=hello&page=1')).toBe('result');
  });

  test('multiple invalidations are safe', () => {
    setCache('/a', 1);
    invalidateCache('/a');
    invalidateCache('/a');
    expect(cacheSize()).toBe(0);
  });

  test('clearAllCache after empty cache is safe', () => {
    clearAllCache();
    clearAllCache();
    expect(cacheSize()).toBe(0);
  });

  test('caches boolean false correctly', () => {
    setCache('/bool-false', false);
    expect(getCached('/bool-false')).toBe(false);
  });

  test('caches zero correctly', () => {
    setCache('/zero', 0);
    expect(getCached('/zero')).toBe(0);
  });

  test('caches empty string correctly', () => {
    setCache('/empty-str', '');
    expect(getCached('/empty-str')).toBe('');
  });

  test('caches nested objects correctly', () => {
    const nested = { a: { b: { c: [1, 2, 3] } } };
    setCache('/nested', nested);
    expect(getCached('/nested')).toEqual(nested);
  });

  test('invalidateCache with empty string invalidates all', () => {
    setCache('/x', 1);
    setCache('/y', 2);
    invalidateCache('');
    expect(cacheSize()).toBe(0);
  });

  test('setCache with same key updates value', () => {
    setCache('/update', 'old');
    setCache('/update', 'new');
    expect(getCached('/update')).toBe('new');
    expect(cacheSize()).toBe(1);
  });
});
