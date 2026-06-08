/**
 * useContentTranslation.test.js — Tests for the useContentTranslation hook
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useContentTranslation } from './useContentTranslation';

// Mock react-i18next
const mockI18n = { language: 'en', changeLanguage: jest.fn() };
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: mockI18n }),
}));

// Mock translateMany
jest.mock('../utils/translateContent', () => ({
  translateMany: jest.fn(),
}));
const { translateMany } = require('../utils/translateContent');

describe('useContentTranslation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockI18n.language = 'en';
    translateMany.mockResolvedValue([]);
  });

  test('returns original texts when language is en', () => {
    const { result } = renderHook(() => useContentTranslation(['Hello', 'World']));
    expect(result.current).toEqual(['Hello', 'World']);
    expect(translateMany).not.toHaveBeenCalled();
  });

  test('returns original texts when language starts with en', () => {
    mockI18n.language = 'en-US';
    const { result } = renderHook(() => useContentTranslation(['Test']));
    expect(result.current).toEqual(['Test']);
  });

  test('calls translateMany when language is not en', async () => {
    mockI18n.language = 'de';
    translateMany.mockResolvedValue(['Hallo', 'Welt']);
    const { result } = renderHook(() =>
      useContentTranslation(['Hello', 'World'])
    );
    await waitFor(() => expect(result.current).toEqual(['Hallo', 'Welt']));
    expect(translateMany).toHaveBeenCalledWith(['Hello', 'World'], 'de');
  });

  test('returns original texts initially before translation completes', () => {
    mockI18n.language = 'fr';
    translateMany.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useContentTranslation(['Hello']));
    expect(result.current).toEqual(['Hello']);
  });

  test('does not call translateMany again with same texts and language', async () => {
    mockI18n.language = 'de';
    translateMany.mockResolvedValue(['Hallo']);
    const { result, rerender } = renderHook(
      ({ texts }) => useContentTranslation(texts),
      { initialProps: { texts: ['Hello'] } }
    );
    await waitFor(() => expect(result.current).toEqual(['Hallo']));
    expect(translateMany).toHaveBeenCalledTimes(1);

    // Re-render with same props
    rerender({ texts: ['Hello'] });
    expect(translateMany).toHaveBeenCalledTimes(1);
  });

  test('calls translateMany again when texts change', async () => {
    mockI18n.language = 'de';
    translateMany.mockResolvedValueOnce(['Hallo']).mockResolvedValueOnce(['Welt']);
    const { result, rerender } = renderHook(
      ({ texts }) => useContentTranslation(texts),
      { initialProps: { texts: ['Hello'] } }
    );
    await waitFor(() => expect(result.current).toEqual(['Hallo']));

    rerender({ texts: ['World'] });
    await waitFor(() => expect(result.current).toEqual(['Welt']));
    expect(translateMany).toHaveBeenCalledTimes(2);
  });

  test('handles empty texts array', () => {
    mockI18n.language = 'de';
    const { result } = renderHook(() => useContentTranslation([]));
    expect(result.current).toEqual([]);
  });

  test('cancels pending translation on unmount', async () => {
    mockI18n.language = 'de';
    let resolveTranslation;
    translateMany.mockReturnValue(new Promise(r => { resolveTranslation = r; }));
    const { unmount } = renderHook(() => useContentTranslation(['Hello']));
    unmount();
    // Resolve after unmount — state should not update (no error = cancelled properly)
    await act(async () => { resolveTranslation(['Hallo']); });
  });
});
