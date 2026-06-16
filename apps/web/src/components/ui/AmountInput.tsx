// src/components/ui/AmountInput.tsx — large centered TZS entry.
interface Props {
  value: string;
  onChange: (digits: string) => void;
}

export function AmountInput({ value, onChange }: Props) {
  return (
    <div className="flex items-baseline justify-center gap-2 py-2">
      <input
        inputMode="numeric"
        autoFocus
        value={value ? Number(value).toLocaleString('en-US') : ''}
        placeholder="0"
        aria-label="Amount in TZS"
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ''))}
        className="tnum w-full min-w-0 border-0 bg-transparent text-center text-5xl font-extrabold text-ink outline-none placeholder:text-ink-faint"
      />
      <span className="text-lg font-bold text-ink-faint">TZS</span>
    </div>
  );
}
