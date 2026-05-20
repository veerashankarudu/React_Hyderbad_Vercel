import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { translateMany } from '../utils/translateContent';

/**
 * Hook to translate an array of strings whenever the language changes.
 *
 * @param {string[]} texts - Array of English source strings
 * @returns {string[]} - Translated strings (same order); falls back to originals while loading
 */
export function useContentTranslation(texts) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const [translated, setTranslated] = useState(texts);
  const prevKey = useRef(null);

  useEffect(() => {
    const key = `${lang}:${texts.join('|')}`;
    if (key === prevKey.current) return;
    prevKey.current = key;

    if (!lang || lang === 'en') {
      setTranslated(texts);
      return;
    }

    let cancelled = false;
    translateMany(texts, lang).then((result) => {
      if (!cancelled) setTranslated(result);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, texts.join('|||')]);

  return translated;
}
