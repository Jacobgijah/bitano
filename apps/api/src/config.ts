// src/config.ts — typed environment config with sane defaults.
function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  port: num('PORT', 4000),
  databaseUrl:
    process.env.DATABASE_URL || 'postgres://bitano:bitano@localhost:5432/bitano',

  rateTzsPerBtc: num('RATE_TZS_PER_BTC', 262_000_000),
  spreadPct: num('SPREAD_PCT', 0.02),
  quoteTtlSeconds: num('QUOTE_TTL_SECONDS', 90),

  minTzs: num('MIN_TZS', 500),
  maxTzs: num('MAX_TZS', 5_000_000),
  maxTxPerDay: num('MAX_TX_PER_DAY', 10),
  maxTzsPerDay: num('MAX_TZS_PER_DAY', 2_000_000),

  // ClickPesa webhook signing secret. Empty in local/dev → signature check is skipped
  // (with a loud warning). Confirm the exact header + signing scheme against the sandbox.
  clickpesaWebhookSecret: process.env.CLICKPESA_WEBHOOK_SECRET || '',
  // How long we wait for a collection before a tx is treated as PAYMENT_TIMEOUT (sweeper TBD).
  paymentTimeoutSeconds: num('PAYMENT_TIMEOUT_SECONDS', 600),
} as const;
