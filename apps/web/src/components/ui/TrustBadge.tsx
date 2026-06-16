// src/components/ui/TrustBadge.tsx — small reassurance chips used in the footer strip.
import { useT } from '../../i18n/LanguageProvider.js';

export function TrustStrip() {
  const t = useT();
  const items = [
    { icon: '🔒', label: t('trust_noncustodial') },
    { icon: '⚡', label: t('trust_yourwallet') },
    { icon: '🆔', label: t('trust_nokyc') },
  ];
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-semibold text-ink-faint">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1">
          <span aria-hidden>{it.icon}</span>
          {it.label}
        </span>
      ))}
    </div>
  );
}
