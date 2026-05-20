// Translation cache: key = `${lang}:${text}` → translated string
const cache = new Map();

// Language code mappings
const LANG_MAP = {
  te: 'te',
  de: 'de',
  fr: 'fr',
  hi: 'hi',
  kn: 'kn',
  ur: 'ur',
  en: 'en',
};

/**
 * Translate via lingva.ml (Google Translate proxy – no API key, no rate limit).
 */
async function translateViaLingva(text, targetLang) {
  const url = `https://lingva.ml/api/v1/en/${targetLang}/${encodeURIComponent(text)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`Lingva HTTP ${res.status}`);
  const data = await res.json();
  if (data?.translation) return data.translation;
  throw new Error('Lingva: no translation');
}

/**
 * Translate via MyMemory (fallback).
 */
async function translateViaMyMemory(text, targetLang) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data?.responseStatus === 200) return data.responseData.translatedText;
  throw new Error('MyMemory: ' + (data?.responseDetails || 'failed'));
}

/**
 * Translate a single string.
 * Tries lingva.ml first, falls back to MyMemory, falls back to original text.
 */
export async function translateText(text, lang) {
  if (!text || !lang || lang === 'en') return text;
  const targetLang = LANG_MAP[lang] || lang;
  const cacheKey = `${targetLang}:${text}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  let translated = text;
  try {
    translated = await translateViaLingva(text, targetLang);
  } catch {
    try {
      translated = await translateViaMyMemory(text, targetLang);
    } catch {
      translated = text;
    }
  }
  cache.set(cacheKey, translated);
  return translated;
}

/**
 * Translate multiple strings in parallel.
 */
export async function translateMany(texts, lang) {
  if (!lang || lang === 'en') return texts;
  return Promise.all(texts.map((t) => translateText(t, lang)));
}

