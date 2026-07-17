import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext(null);

const STORAGE_KEY = 'agriguard_lang';
const SUPPORTED = ['English', 'Urdu'];

const readStoredLang = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED.includes(stored) ? stored : 'English';
  } catch {
    return 'English';
  }
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(readStoredLang);

  const setLang = (newLang) => {
    if (!SUPPORTED.includes(newLang)) return;
    try { localStorage.setItem(STORAGE_KEY, newLang); } catch { /* ignore */ }
    setLangState(newLang);
  };

  // Apply / remove the rtl-mode class on <body> whenever language changes.
  // The CSS class already exists — this is what actually activates it.
  useEffect(() => {
    if (lang === 'Urdu') {
      document.body.classList.add('rtl-mode');
    } else {
      document.body.classList.remove('rtl-mode');
    }
  }, [lang]);

  const t = translations[lang];
  const isRtl = lang === 'Urdu';

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isRtl }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
};
