// src/i18n/LanguageProvider.tsx — language context + useT() translator.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { STRINGS, type Lang, type StringKey } from './strings.js';

const STORAGE_KEY = 'bitano.lang';

interface LanguageCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (key: StringKey) => string;
}

const Ctx = createContext<LanguageCtx | null>(null);

function initialLang(): Lang {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'sw' || saved === 'en') return saved;
  }
  return 'sw'; // Swahili-first
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const toggle = useCallback(() => setLangState((l) => (l === 'sw' ? 'en' : 'sw')), []);
  const t = useCallback((key: StringKey) => STRINGS[key][lang], [lang]);

  const value = useMemo(() => ({ lang, setLang, toggle, t }), [lang, setLang, toggle, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LanguageCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLang must be used within LanguageProvider');
  return ctx;
}

/** Shorthand: const t = useT(); t('continue') */
export function useT(): (key: StringKey) => string {
  return useLang().t;
}
