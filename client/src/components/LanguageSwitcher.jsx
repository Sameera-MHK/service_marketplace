import { useTranslation } from 'react-i18next';
import { LOCALES as LANGS } from '../i18n';

export default function LanguageSwitcher({ compact = false, dark = false }) {
  const { i18n } = useTranslation();
  const current = i18n.language;

  // Nothing to switch between until a second locale is registered in i18n.js.
  if (LANGS.length < 2) return null;

  function change(code) {
    i18n.changeLanguage(code);
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-0.5 rounded-lg p-0.5 ${dark ? 'bg-white/10' : 'bg-stone-100'}`}>
        {LANGS.map(({ code, label }) => (
          <button
            key={code}
            onClick={() => change(code)}
            title={LANGS.find((l) => l.code === code)?.nativeName}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              current === code
                ? dark
                  ? 'bg-white text-violet-600 shadow-sm'
                  : 'bg-white text-violet-600 shadow-sm'
                : dark
                  ? 'text-stone-300 hover:text-white'
                  : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    );
  }

  // Full dropdown — for settings / standalone use
  return (
    <select
      value={current}
      onChange={(e) => change(e.target.value)}
      className="input max-w-xs text-sm py-1.5"
    >
      {LANGS.map(({ code, nativeName }) => (
        <option key={code} value={code}>{nativeName}</option>
      ))}
    </select>
  );
}
