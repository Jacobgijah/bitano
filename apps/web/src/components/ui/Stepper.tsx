// src/components/ui/Stepper.tsx — 3-dot progress for the buy flow.
interface Props {
  current: 1 | 2 | 3;
}

const LABKEYS = ['step_amount', 'step_quote', 'step_pay'] as const;

import { useT } from '../../i18n/LanguageProvider.js';

export function Stepper({ current }: Props) {
  const t = useT();
  return (
    <div className="flex items-center justify-center gap-2" aria-label={`Step ${current} of 3`}>
      {[1, 2, 3].map((n) => {
        const active = n === current;
        const done = n < current;
        return (
          <div key={n} className="flex items-center gap-2">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                active
                  ? 'bg-brand text-white'
                  : done
                    ? 'bg-brand-soft text-brand-dark'
                    : 'bg-canvas text-ink-faint'
              }`}
            >
              {done ? '✓' : n}
            </div>
            {active && <span className="text-xs font-bold text-ink">{t(LABKEYS[n - 1])}</span>}
          </div>
        );
      })}
    </div>
  );
}
