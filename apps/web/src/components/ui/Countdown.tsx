// src/components/ui/Countdown.tsx — animated ring counting down to a quote's expiry.
interface Props {
  secondsLeft: number;
  total: number; // total window (e.g. 90s) for the ring fraction
  label: string;
}

export function Countdown({ secondsLeft, total, label }: Props) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const frac = total > 0 ? Math.max(0, Math.min(1, secondsLeft / total)) : 0;
  const low = secondsLeft <= 10;
  const stroke = low ? 'var(--color-danger)' : 'var(--color-brand)';

  return (
    <div className="flex items-center gap-2 text-xs text-ink-soft">
      <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="var(--color-hairline)" strokeWidth="3" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          style={{ transition: 'stroke-dashoffset 0.25s linear' }}
        />
      </svg>
      <span>
        {label}{' '}
        <b className={`tnum ${low ? 'text-danger' : 'text-ink'}`}>{secondsLeft}s</b>
      </span>
    </div>
  );
}
