// src/components/AppShell.tsx — header + centered mobile card + trust footer.
import type { ReactNode } from 'react';
import { LanguageToggle } from './ui/LanguageToggle.js';
import { TrustStrip } from './ui/TrustBadge.js';

export function Wordmark() {
  return (
    <div className="text-xl font-extrabold tracking-tight text-ink">
      Bit<span className="text-bitcoin">ano</span>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-6 pt-5">
      <header className="flex items-center justify-between">
        <Wordmark />
        <LanguageToggle />
      </header>

      <main className="flex flex-1 flex-col justify-center py-6">{children}</main>

      <footer className="pt-2">
        <TrustStrip />
      </footer>
    </div>
  );
}

/** Standard white card used by the wizard steps. */
export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-hairline bg-surface p-5 shadow-[var(--shadow-card)]">
      {children}
    </div>
  );
}
