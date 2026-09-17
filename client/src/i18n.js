import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';

/**
 * Registered UI locales.
 *
 * To add one:
 *   1. Copy `locales/en.json` to `locales/<code>.json` and translate the values
 *      (keep every key — missing keys fall back to English).
 *   2. Import it above and add an entry here.
 *
 * The language switcher renders itself from this list and hides when only one
 * locale is registered.
 */
export const LOCALES = [
  { code: 'en', label: 'EN', nativeName: 'English', resource: en },
];

const STORAGE_KEY = 'skillhub_lang';

const supported = LOCALES.map((l) => l.code);
const stored    = localStorage.getItem(STORAGE_KEY);
const savedLang = supported.includes(stored) ? stored : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: Object.fromEntries(
      LOCALES.map(({ code, resource }) => [code, { translation: resource }])
    ),
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

// Persist language selection
i18n.on('languageChanged', (lng) => {
  localStorage.setItem(STORAGE_KEY, lng);
  // Set <html lang="..."> for accessibility + font rendering
  document.documentElement.lang = lng;
});

// Set on initial load
document.documentElement.lang = savedLang;

export default i18n;
