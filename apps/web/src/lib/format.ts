// src/lib/format.ts — display + id helpers.

/** 10000 -> "10,000" */
export function formatTzs(amount: number | string): string {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(n)) return '0';
  return Math.round(n).toLocaleString('en-US');
}

/** 3742 -> "3,742" */
export function formatSats(sats: number | string): string {
  const n = typeof sats === 'string' ? Number(sats) : sats;
  if (!Number.isFinite(n)) return '0';
  return Math.round(n).toLocaleString('en-US');
}

/** Idempotency key for a transaction-create attempt. */
export function newIdemKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `idem_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Normalise a locally-typed phone to the API format (^\d{9,15}$).
 * Accepts "0744 000 000" or "+255744000000" -> "255744000000".
 */
export function normalizePhone(raw: string): string {
  let d = raw.replace(/[^\d]/g, '');
  if (d.startsWith('0')) d = '255' + d.slice(1); // local TZ number -> country code
  return d;
}

export function isValidPhone(raw: string): boolean {
  return /^\d{9,15}$/.test(normalizePhone(raw));
}
