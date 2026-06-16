-- 001_init.sql — Bitano core schema (SWAP pillar, buy direction)
-- Money rules: balances are DERIVED from ledger_entries, never stored.
-- Every transaction's entries net to zero per currency. Every webhook event is recorded once.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---- enums ----
DO $$ BEGIN
  CREATE TYPE tx_state AS ENUM (
    'CREATED','ADDRESS_INVALID','ADDRESS_VALIDATED','AWAITING_PAYMENT',
    'PAYMENT_FAILED','PAYMENT_TIMEOUT','PAYMENT_CONFIRMED','SENDING',
    'COMPLETED','SEND_FAILED','REFUND_INITIATED','REFUNDED','REFUND_FAILED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE network AS ENUM ('MPESA','MIXX','AIRTEL','HALOPESA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ledger_account AS ENUM (
    'TZS_FLOAT','BTC_TREASURY','REVENUE_SPREAD','NETWORK_FEES','REFUNDS_PAYABLE','SUSPENSE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE entry_dir AS ENUM ('DEBIT','CREDIT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE money_ccy AS ENUM ('TZS','SATS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---- quotes ----
CREATE TABLE IF NOT EXISTS quotes (
  id               TEXT PRIMARY KEY,
  amount_tzs       NUMERIC(20,2) NOT NULL CHECK (amount_tzs > 0),
  sats             BIGINT        NOT NULL CHECK (sats > 0),
  sell_rate        NUMERIC(24,0) NOT NULL,
  ln_address       TEXT          NOT NULL,
  network          network       NOT NULL,
  ln_address_valid BOOLEAN       NOT NULL DEFAULT FALSE,
  expires_at       TIMESTAMPTZ   NOT NULL,
  consumed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ---- transactions ----
CREATE TABLE IF NOT EXISTS transactions (
  id              TEXT PRIMARY KEY,
  quote_id        TEXT NOT NULL REFERENCES quotes(id),
  state           tx_state NOT NULL DEFAULT 'CREATED',
  amount_tzs      NUMERIC(20,2) NOT NULL,
  sats            BIGINT        NOT NULL,
  sell_rate       NUMERIC(24,0) NOT NULL,
  ln_address      TEXT          NOT NULL,
  network         network       NOT NULL,
  phone           TEXT          NOT NULL,
  collection_ref  TEXT,
  send_ref        TEXT,
  refund_ref      TEXT,
  failure_reason  TEXT,
  idempotency_key TEXT UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tx_state   ON transactions(state);
CREATE INDEX IF NOT EXISTS idx_tx_phone   ON transactions(phone, created_at);
CREATE INDEX IF NOT EXISTS idx_tx_created ON transactions(created_at);

-- ---- double-entry ledger ----
CREATE TABLE IF NOT EXISTS ledger_entries (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES transactions(id),
  account        ledger_account NOT NULL,
  direction      entry_dir      NOT NULL,
  currency       money_ccy      NOT NULL,
  amount         NUMERIC(24,0)  NOT NULL CHECK (amount > 0),
  memo           TEXT,
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_le_tx      ON ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_le_account ON ledger_entries(account, currency);

-- ---- webhook idempotency log ----
CREATE TABLE IF NOT EXISTS webhook_events (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider       TEXT NOT NULL,
  event_id       TEXT NOT NULL,
  transaction_id TEXT REFERENCES transactions(id),
  payload        JSONB NOT NULL,
  received_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at   TIMESTAMPTZ,
  UNIQUE (provider, event_id)
);
