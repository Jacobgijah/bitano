// src/components/ui/StatusIcon.tsx — animated status visuals for the pay/result screens.
import { motion } from 'framer-motion';

type Kind = 'waiting' | 'sending' | 'success' | 'error' | 'refund';

const ring: Record<Kind, string> = {
  waiting: 'border-brand/30 text-brand',
  sending: 'border-bitcoin/30 text-bitcoin',
  success: 'border-brand/30 text-brand',
  error: 'border-danger/30 text-danger',
  refund: 'border-bitcoin/30 text-bitcoin',
};

export function StatusIcon({ kind }: { kind: Kind }) {
  return (
    <div className="flex justify-center">
      <div
        className={`relative flex h-24 w-24 items-center justify-center rounded-full border-4 ${ring[kind]}`}
      >
        {(kind === 'waiting' || kind === 'sending' || kind === 'refund') && (
          <motion.span
            className="absolute inset-0 rounded-full border-4 border-transparent"
            style={{ borderTopColor: 'currentColor' }}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          />
        )}
        <Glyph kind={kind} />
      </div>
    </div>
  );
}

function Glyph({ kind }: { kind: Kind }) {
  if (kind === 'success') {
    return (
      <motion.svg width="44" height="44" viewBox="0 0 44 44" fill="none">
        <motion.path
          d="M12 23l7 7 14-15"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </motion.svg>
    );
  }
  if (kind === 'error') {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <path d="M13 13l14 14M27 13L13 27" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === 'waiting') {
    return <span className="text-3xl">📲</span>;
  }
  // sending / refund — Bitcoin glyph
  return <span className="text-3xl font-extrabold">₿</span>;
}
