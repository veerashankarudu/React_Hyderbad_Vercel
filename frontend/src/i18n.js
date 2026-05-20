import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import hi from './locales/hi.json';
import te from './locales/te.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import ur from './locales/ur.json';
import kn from './locales/kn.json';

export const LANGUAGES = [
  { code: 'en', label: 'English',  flag: '🇬🇧', dir: 'ltr' },
  { code: 'hi', label: 'हिंदी',    flag: '🇮🇳', dir: 'ltr' },
  { code: 'te', label: 'తెలుగు',  flag: '🇮🇳', dir: 'ltr' },
  { code: 'fr', label: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'de', label: 'Deutsch',  flag: '🇩🇪', dir: 'ltr' },
  { code: 'ur', label: 'اردو',     flag: '🇵🇰', dir: 'rtl' },
  { code: 'kn', label: 'ಕನ್ನಡ',   flag: '🇮🇳', dir: 'ltr' },
];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, hi: { translation: hi }, te: { translation: te }, fr: { translation: fr }, de: { translation: de }, ur: { translation: ur }, kn: { translation: kn } },
    fallbackLng: 'en',
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'], lookupLocalStorage: 'quizhub_lang' },
    interpolation: { escapeValue: false },
  });

// Apply RTL direction on init
const applyDir = (lng) => {
  const lang = LANGUAGES.find(l => l.code === lng);
  document.documentElement.dir = lang?.dir || 'ltr';
  document.documentElement.lang = lng;
};

applyDir(i18n.language);
i18n.on('languageChanged', applyDir);

export default i18n;
