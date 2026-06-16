// src/components/ui/Button.tsx
import { motion } from 'framer-motion';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'bitcoin';

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: Variant;
  loading?: boolean;
  full?: boolean;
  children: ReactNode;
}

const base =
  'inline-flex items-center justify-center gap-2 font-bold rounded-[var(--radius-field)] px-5 py-4 text-base transition-colors disabled:opacity-40 disabled:cursor-not-allowed select-none';

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dark shadow-[var(--shadow-soft)]',
  bitcoin: 'bg-bitcoin text-white hover:brightness-95 shadow-[var(--shadow-soft)]',
  ghost: 'bg-transparent text-ink-soft hover:text-ink',
};

export function Button({ variant = 'primary', loading, full, children, disabled, ...rest }: Props) {
  return (
    <motion.button
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      className={`${base} ${variants[variant]} ${full ? 'w-full' : ''}`}
      disabled={disabled || loading}
      {...(rest as object)}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      )}
      {children}
    </motion.button>
  );
}
