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
} as const;
