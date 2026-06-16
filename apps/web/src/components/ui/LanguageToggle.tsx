// src/components/ui/LanguageToggle.tsx — SW / EN switch in the header.
import { useLang } from '../../i18n/LanguageProvider.js';

export function LanguageToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex items-center rounded-full border border-hairline bg-surface p-0.5 text-xs font-bold">
      {(['sw', 'en'] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`rounded-full px-2.5 py-1 uppercase transition-colors ${
            lang === l ? 'bg-brand text-white' : 'text-ink-soft hover:text-ink'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
