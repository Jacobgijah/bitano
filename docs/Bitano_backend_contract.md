# BITANO — Backend Contract (Buy Flow)

**Companion to:** Bitano MVP Spec v0.2
**Covers:** the SWAP pillar, buy direction (TZS → sats). API endpoints + Postgres schema.
**Money rules carried over:** never send sats before fiat is confirmed; every refund branch is mandatory; every external event is idempotent.

---

## Part A — API endpoints

Conventions: JSON over HTTPS. All mutating calls accept an `Idempotency-Key` header (UUID); a repeated key returns the original result, never a second action. Money is explicit about currency: `amount_tzs` is a decimal string in shillings; `sats` is an integer. All errors use the shape in §A.6.

### A.1 `POST /v1/quotes` — lock a price

Validates the Lightning address **and** locks a rate before any money moves. Mirrors the mockup's live converter, made authoritative.

Request
```json
{ "amount_tzs": "10000", "ln_address": "juma@walletofsatoshi.com", "network": "MPESA" }
```
Response `201`
```json
{
  "quote_id": "qt_01Habc...",
  "amount_tzs": "10000",
  "sats": 3742,
  "sell_rate_tzs_per_btc": "267240000",
  "ln_address_valid": true,
  "expires_at": "2026-06-16T06:41:30Z"
}
```
- Resolves the LNURL-pay endpoint for `ln_address`; checks the amount is within `minSendable`/`maxSendable`. If it fails → `422 address_unpayable` (collect nothing).
- `sell_rate` already includes the spread. `expires_at` is the lock window (config; e.g. 90s).
- Enforces per-transaction min/max here.

### A.2 `POST /v1/transactions` — start the buy

Consumes a quote, validates limits against the payer phone, and triggers the USSD-push collection. This is the `CREATED → AWAITING_PAYMENT` transition.

Request (`Idempotency-Key` required)
```json
{ "quote_id": "qt_01Habc...", "phone": "255744000000" }
```
Response `202`
```json
{ "transaction_id": "tx_01Hxyz...", "state": "AWAITING_PAYMENT" }
```
- `404 quote_not_found` / `409 quote_expired` if the lock lapsed (client re-quotes).
- `429 limit_exceeded` if the phone is over its daily/velocity cap.
- `409 insufficient_treasury` if BTC liquidity can't cover `sats` — refuse up front, collect nothing.
- On success: pre-validates the LN address again, calls `FiatRail.collect(...)`, and the user gets the PIN prompt on their handset.

### A.3 `GET /v1/transactions/{id}` — poll state

Backs the mockup's waiting screen.
```json
{
  "transaction_id": "tx_01Hxyz...",
  "state": "COMPLETED",
  "amount_tzs": "10000",
  "sats": 3742,
  "ln_address": "juma@walletofsatoshi.com",
  "network": "MPESA",
  "failure_reason": null,
  "updated_at": "2026-06-16T06:42:05Z"
}
```
`state` is one of the values in §B.2. Clients poll (or subscribe via SSE/websocket — optional) until a terminal state.

### A.4 `POST /v1/webhooks/clickpesa/collection` — fiat result (internal)

Aggregator → Bitano. **Verify signature.** Idempotent on `(provider, event_id)`.
```json
{ "event_id": "evt_9981", "order_reference": "tx_01Hxyz...",
  "status": "SUCCESS", "amount_tzs": "10000" }
```
- `SUCCESS` → `PAYMENT_CONFIRMED`, then enqueue the Lightning send (fetch a **fresh** invoice at send time).
- `FAILED` → `PAYMENT_FAILED` (terminal, nothing collected).
- No event before timeout → `PAYMENT_TIMEOUT`.

### A.5 `POST /v1/webhooks/clickpesa/disbursement` — refund result (internal)

Closes the refund branch after a failed send. Verify signature; idempotent.
```json
{ "event_id": "evt_9983", "order_reference": "tx_01Hxyz...", "status": "SUCCESS" }
```
`SUCCESS` → `REFUNDED`. `FAILED` → `REFUND_FAILED` → ops queue + page a human.

> The Lightning send itself may be synchronous (provider returns success/failure on the `send` call) or asynchronous (a `POST /v1/webhooks/lightning/send` callback). Either way: success → `COMPLETED`; failure → `SEND_FAILED` → initiate disbursement (A.5).

### A.6 Error shape
```json
{ "error": { "code": "address_unpayable",
  "message": "That Lightning address can't receive this amount.",
  "transaction_id": null } }
```
Messages are end-user-safe and explain the fix (per the design system); `code` is for the client to branch on.

### A.7 Endpoint → state-machine map

| Endpoint | Drives transition |
|---|---|
| `POST /v1/quotes` | (pre-flight) `CREATED`, address validated |
| `POST /v1/transactions` | `CREATED → AWAITING_PAYMENT` |
| collection webhook `SUCCESS` | `AWAITING_PAYMENT → PAYMENT_CONFIRMED → SENDING` |
| lightning send result | `SENDING → COMPLETED` _or_ `→ SEND_FAILED` |
| (on `SEND_FAILED`) disburse | `SEND_FAILED → REFUND_INITIATED` |
| disbursement webhook | `REFUND_INITIATED → REFUNDED` _or_ `→ REFUND_FAILED` |

---

## Part B — Postgres schema (DDL)

Money correctness rules: balances are **derived from `ledger_entries`, never stored** as mutable columns; every transaction's entries must net to zero per currency; every external event is recorded once.

### B.1 Extensions & money types
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()

-- TZS stored as NUMERIC (shillings, 2dp tolerated); sats as BIGINT (integer).
```

### B.2 Enums
```sql
CREATE TYPE tx_state AS ENUM (
  'CREATED','ADDRESS_INVALID','ADDRESS_VALIDATED','AWAITING_PAYMENT',
  'PAYMENT_FAILED','PAYMENT_TIMEOUT','PAYMENT_CONFIRMED','SENDING',
  'COMPLETED','SEND_FAILED','REFUND_INITIATED','REFUNDED','REFUND_FAILED'
);

CREATE TYPE network AS ENUM ('MPESA','MIXX','AIRTEL','HALOPESA');

CREATE TYPE ledger_account AS ENUM (
  'TZS_FLOAT','BTC_TREASURY','REVENUE_SPREAD','NETWORK_FEES',
  'REFUNDS_PAYABLE','SUSPENSE'
);

CREATE TYPE entry_dir AS ENUM ('DEBIT','CREDIT');
CREATE TYPE money_ccy AS ENUM ('TZS','SATS');
```

### B.3 Quotes
```sql
CREATE TABLE quotes (
  id              TEXT PRIMARY KEY,                 -- qt_...
  amount_tzs      NUMERIC(20,2) NOT NULL CHECK (amount_tzs > 0),
  sats            BIGINT        NOT NULL CHECK (sats > 0),
  sell_rate       NUMERIC(24,0) NOT NULL,           -- TZS per BTC, spread included
  ln_address      TEXT          NOT NULL,
  network         network       NOT NULL,
  ln_address_valid BOOLEAN      NOT NULL DEFAULT FALSE,
  expires_at      TIMESTAMPTZ   NOT NULL,
  consumed_at     TIMESTAMPTZ,                      -- set when a tx is created
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);
```

### B.4 Transactions
```sql
CREATE TABLE transactions (
  id              TEXT PRIMARY KEY,                 -- tx_...
  quote_id        TEXT NOT NULL REFERENCES quotes(id),
  state           tx_state NOT NULL DEFAULT 'CREATED',
  amount_tzs      NUMERIC(20,2) NOT NULL,
  sats            BIGINT        NOT NULL,
  sell_rate       NUMERIC(24,0) NOT NULL,
  ln_address      TEXT          NOT NULL,
  network         network       NOT NULL,
  phone           TEXT          NOT NULL,           -- payer MSISDN (identity from rail)
  collection_ref  TEXT,                             -- aggregator collection id
  send_ref        TEXT,                             -- lightning send id / payment hash
  refund_ref      TEXT,                             -- disbursement id
  failure_reason  TEXT,
  idempotency_key TEXT UNIQUE,                      -- from POST /v1/transactions
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at    TIMESTAMPTZ,                      -- PAYMENT_CONFIRMED
  completed_at    TIMESTAMPTZ,                      -- COMPLETED
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tx_state   ON transactions(state);
CREATE INDEX idx_tx_phone   ON transactions(phone, created_at);  -- limits / velocity
CREATE INDEX idx_tx_created ON transactions(created_at);
```

### B.5 Double-entry ledger
```sql
CREATE TABLE ledger_entries (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES transactions(id),
  account        ledger_account NOT NULL,
  direction      entry_dir      NOT NULL,
  currency       money_ccy      NOT NULL,
  amount         NUMERIC(24,0)  NOT NULL CHECK (amount > 0),  -- TZS=shillings, SATS=sats
  memo           TEXT,
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX idx_le_tx      ON ledger_entries(transaction_id);
CREATE INDEX idx_le_account ON ledger_entries(account, currency);
```

**Balance per transaction must net to zero within each currency.** Enforce in the application layer inside the same DB transaction, and verify continuously with the reconciliation job:
```sql
-- Any transaction whose entries don't balance per currency = a bug. Should return 0 rows.
SELECT transaction_id, currency,
       SUM(CASE WHEN direction='DEBIT' THEN amount ELSE -amount END) AS net
FROM   ledger_entries
GROUP  BY transaction_id, currency
HAVING SUM(CASE WHEN direction='DEBIT' THEN amount ELSE -amount END) <> 0;
```

**Illustrative entries for one completed buy** (10,000 TZS in, 3,742 sats out):
```
TZS leg:   DEBIT  TZS_FLOAT       10000 TZS
           CREDIT SUSPENSE        10000 TZS
SATS leg:  CREDIT BTC_TREASURY     3742 SATS
           DEBIT  SUSPENSE         3742 SATS
```
(Spread is realised when SUSPENSE is reconciled against treasury cost; network/disbursement fees post to `NETWORK_FEES`. Refunds move TZS via `REFUNDS_PAYABLE`.)

### B.6 Webhook idempotency log
```sql
CREATE TABLE webhook_events (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider       TEXT NOT NULL,                      -- 'clickpesa' | 'lightning'
  event_id       TEXT NOT NULL,                      -- provider's event id
  transaction_id TEXT REFERENCES transactions(id),
  payload        JSONB NOT NULL,
  received_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at   TIMESTAMPTZ,
  UNIQUE (provider, event_id)                         -- the idempotency guard
);
```
A duplicate webhook violates the unique constraint → swallow as already-seen, no re-action. Out-of-order delivery is handled by loading the transaction and only applying a transition that's valid from its current `state` (see §A.7 / spec §3).

### B.7 Phone limits (AML, no-KYC posture)
```sql
-- Daily count + volume per payer, for the limit checks in POST /v1/transactions.
CREATE VIEW v_phone_daily AS
SELECT phone,
       date_trunc('day', created_at) AS day,
       count(*)                       AS tx_count,
       sum(amount_tzs)                AS tzs_total
FROM   transactions
WHERE  state NOT IN ('PAYMENT_FAILED','PAYMENT_TIMEOUT','ADDRESS_INVALID')
GROUP  BY phone, date_trunc('day', created_at);
```
Thresholds (per-tx min/max, daily count, monthly volume) are config, set with counsel.

---

## Build order against this contract

1. `quotes` + `POST /v1/quotes` with real LNURL validation (the mockup's converter, made authoritative).
2. `transactions` + `POST /v1/transactions` + `GET /v1/transactions/{id}` (happy path to `AWAITING_PAYMENT`).
3. Collection webhook → `PAYMENT_CONFIRMED` → Lightning send → `COMPLETED`, writing balanced ledger entries.
4. `SEND_FAILED` → disbursement → `REFUNDED`; `webhook_events` idempotency; the balance-check query in CI.
5. Limits view + enforcement; reconciliation job comparing ledger vs aggregator settlement vs treasury.

_Schema and endpoints are a starting contract, not final; tune types and limits with your aggregator's and Lightning provider's real payloads once sandbox access lands._