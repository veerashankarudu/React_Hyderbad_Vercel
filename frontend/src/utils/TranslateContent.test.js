/**
 * TranslateContent.test.js — Tests for translateContent utility
 */

// We need to isolate the module between tests since it has an internal cache
let translateText, translateMany;

// Mock fetch globally
global.fetch = jest.fn();

// Mock AbortSignal.timeout if not available
if (!AbortSignal.timeout) {
  AbortSignal.timeout = () => new AbortController().signal;
}

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  global.fetch.mockReset();
  // Re-import to get fresh cache
  const mod = require('./translateContent');
  translateText = mod.translateText;
  translateMany = mod.translateMany;
});

describe('translateContent', () => {
  describe('translateText', () => {
    test('returns original text when lang is "en"', async () => {
      const result = await translateText('Hello world', 'en');
      expect(result).toBe('Hello world');
      expect(fetch).not.toHaveBeenCalled();
    });

    test('returns original text when lang starts with "en"', async () => {
      const result = await translateText('Hello', 'en-US');
      expect(result).toBe('Hello');
      expect(fetch).not.toHaveBeenCalled();
    });

    test('returns original text when text is empty', async () => {
      const result = await translateText('', 'de');
      expect(result).toBe('');
      expect(fetch).not.toHaveBeenCalled();
    });

    test('returns original text when text is null', async () => {
      const result = await translateText(null, 'de');
      expect(result).toBeNull();
    });

    test('returns original text when lang is null', async () => {
      const result = await translateText('Hello', null);
      expect(result).toBe('Hello');
    });

    test('returns original text when lang is undefined', async () => {
      const result = await translateText('Hello', undefined);
      expect(result).toBe('Hello');
    });

    test('calls Lingva API for non-English language', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ translation: 'Hallo Welt' }),
      });
      const result = await translateText('Hello World unique1', 'de');
      expect(result).toBe('Hallo Welt');
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch.mock.calls[0][0]).toContain('lingva.ml');
    });

    test('falls back to MyMemory when Lingva fails', async () => {
      global.fetch
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ responseStatus: 200, responseData: { translatedText: 'Bonjour' } }),
        });
      const result = await translateText('Hello unique2', 'fr');
      expect(result).toBe('Bonjour');
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    test('falls back to original text when both APIs fail', async () => {
      global.fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));
      const result = await translateText('Hello unique3', 'hi');
      expect(result).toBe('Hello unique3');
    });

    test('caches translated text for subsequent calls', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ translation: 'Hola' }),
      });
      await translateText('Hello unique4', 'te');
      const result = await translateText('Hello unique4', 'te');
      expect(result).toBe('Hola');
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('uses correct language code from LANG_MAP', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ translation: 'Namaste' }),
      });
      await translateText('Hello unique5', 'hi');
      expect(fetch.mock.calls[0][0]).toContain('/hi/');
    });

    test('handles Lingva returning no translation field', async () => {
      global.fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ responseStatus: 200, responseData: { translatedText: 'Fallback' } }),
        });
      const result = await translateText('Test unique6', 'kn');
      expect(result).toBe('Fallback');
    });

    test('handles MyMemory returning non-200 responseStatus', async () => {
      global.fetch
        .mockRejectedValueOnce(new Error('Lingva down'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ responseStatus: 429, responseDetails: 'rate limited' }),
        });
      const result = await translateText('Test unique7', 'ur');
      expect(result).toBe('Test unique7');
    });

    test('encodes special characters in URL', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ translation: 'encoded' }),
      });
      await translateText('Hello & World unique8', 'de');
      expect(fetch.mock.calls[0][0]).toContain(encodeURIComponent('Hello & World unique8'));
    });

    test('handles unknown language code gracefully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ translation: 'translated' }),
      });
      const result = await translateText('Hello unique9', 'xx');
      expect(result).toBe('translated');
    });
  });

  describe('translateMany', () => {
    test('returns original texts when lang is "en"', async () => {
      const result = await translateMany(['Hello', 'World'], 'en');
      expect(result).toEqual(['Hello', 'World']);
      expect(fetch).not.toHaveBeenCalled();
    });

    test('returns original texts when lang is null', async () => {
      const result = await translateMany(['Hello', 'World'], null);
      expect(result).toEqual(['Hello', 'World']);
    });

    test('translates all texts in parallel', async () => {
      global.fetch.mockImplementation((url) => {
        if (url.includes('Parallel1')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ translation: 'P1' }) });
        if (url.includes('Parallel2')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ translation: 'P2' }) });
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ translation: 'x' }) });
      });
      const result = await translateMany(['Parallel1', 'Parallel2'], 'de');
      expect(result).toEqual(['P1', 'P2']);
    });

    test('handles empty array', async () => {
      const result = await translateMany([], 'de');
      expect(result).toEqual([]);
    });

    test('handles single element array', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ translation: 'Einzel' }),
      });
      const result = await translateMany(['SingleUnique'], 'de');
      expect(result).toEqual(['Einzel']);
    });

    test('handles mixed success and failure', async () => {
      global.fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ translation: 'Hallo' }) })
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'));
      const result = await translateMany(['MixHello', 'MixWorld'], 'de');
      expect(result[0]).toBe('Hallo');
      expect(result[1]).toBe('MixWorld');
    });
  });
});
