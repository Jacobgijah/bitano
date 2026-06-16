// src/components/ui/Field.tsx — labelled text input with optional hint/error.
import type { InputHTMLAttributes, ReactNode } from 'react';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label: string;
  hint?: ReactNode;
  error?: string | null;
}

export function Field({ label, hint, error, id, ...rest }: Props) {
  const inputId = id ?? rest.name ?? label;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-xs font-bold tracking-wide text-ink-soft">
        {label}
      </label>
      <input
        id={inputId}
        className={`w-full rounded-[var(--radius-field)] border bg-surface px-4 py-3.5 text-base text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand focus:ring-2 focus:ring-brand/30 ${
          error ? 'border-danger' : 'border-hairline'
        }`}
        {...rest}
      />
      {error ? (
        <span className="text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="text-xs text-ink-faint">{hint}</span>
      ) : null}
    </div>
  );
}
