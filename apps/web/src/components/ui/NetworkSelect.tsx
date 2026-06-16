// src/components/ui/NetworkSelect.tsx — mobile-money network picker (only M-Pesa active).
import { useT } from '../../i18n/LanguageProvider.js';

export type Network = 'MPESA' | 'MIXX' | 'AIRTEL' | 'HALOPESA';

const OPTIONS: { id: Network; label: string; enabled: boolean }[] = [
  { id: 'MPESA', label: 'M-Pesa', enabled: true },
  { id: 'MIXX', label: 'Mixx', enabled: false },
  { id: 'AIRTEL', label: 'Airtel', enabled: false },
  { id: 'HALOPESA', label: 'Halopesa', enabled: false },
];

interface Props {
  value: Network;
  onChange: (n: Network) => void;
}

export function NetworkSelect({ value, onChange }: Props) {
  const t = useT();
  return (
    <div className="grid grid-cols-2 gap-2">
      {OPTIONS.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            disabled={!o.enabled}
            onClick={() => o.enabled && onChange(o.id)}
            className={`relative rounded-[var(--radius-field)] border px-3 py-3 text-sm font-bold transition-colors ${
              active
                ? 'border-brand bg-brand-soft text-brand-dark'
                : o.enabled
                  ? 'border-hairline bg-surface text-ink hover:border-brand/50'
                  : 'cursor-not-allowed border-hairline bg-canvas text-ink-faint'
            }`}
          >
            {o.label}
            {!o.enabled && (
              <span className="ml-1 align-middle text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                · {t('network_soon')}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
