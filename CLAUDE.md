# CLAUDE.md

Guidance for working in this repo. The `README.md` is the human onboarding doc; this file is
the agent-oriented map. The authoritative product/engineering spec lives in `docs/`
(`Bitano_mvp_spec.md`, `Bitano_backend_contract.md`) — read them before changing money logic.

## What this is

**Bitano** — a non-custodial fiat→Bitcoin bridge for Tanzania. A user pays with mobile money
(M-Pesa first) and sats are delivered to **their own** Lightning wallet. No accounts, no
balances, no custody.

This repo implements the **SWAP pillar, buy direction only** (TZS → sats) — the MVP.

## Repo layout (npm workspaces)

- `apps/api` — Node + TypeScript + Express + Zod, Postgres via `pg`. ESM (`"type": "module"`).
- `apps/web` — React + Vite + TypeScript (Swahili-first PWA).
- `db/migrations` — raw SQL, applied in order by `scripts/migrate.mjs` (tracked in a
  `schema_migrations` table).
- `docker-compose.yml` — local Postgres 16 (`bitano:bitano@localhost:5432/bitano`).

## Common commands

```bash
npm install                 # install all workspaces
npm run db:up               # start Postgres (docker compose)
cp apps/api/.env.example apps/api/.env   # API reads apps/api/.env
npm run db:migrate          # run SQL migrations
npm run dev:api             # API on http://localhost:4000  (tsx watch)
npm run dev:web             # web on http://localhost:5173  (vite, proxies /v1 -> :4000)
npm run build               # build api then web
npm run typecheck --workspace apps/api   # tsc --noEmit
```

## Architecture & key files

Two external dependencies are wrapped behind thin, swappable interfaces so business logic
never touches a vendor directly:

- **`FiatRail`** (`apps/api/src/services/fiat.ts`) — `collect` / `disburse` via the
  mobile-money aggregator (ClickPesa). Currently a stub.
- **`LightningSender`** (`apps/api/src/services/lightning.ts`) — `validate` / `send`.
  `validate` is real (delegates to LNURL); `send` is a stub.

Other key files:

- `apps/api/src/routes/quotes.ts` — `POST /v1/quotes`: validate + lock a rate, persist.
- `apps/api/src/routes/transactions.ts` — `POST /v1/transactions` (consume quote, limits,
  collect → `AWAITING_PAYMENT`) and `GET /v1/transactions/:id` (poll).
- `apps/api/src/lib/lnurl.ts` — real LNURL-pay address validation (`/.well-known/lnurlp/...`).
- `apps/api/src/services/quote.ts` — spread math: `sellRate = rate × (1 + spread)`,
  `sats = floor(amount_tzs / sellRate × 1e8)`.
- `apps/api/src/config.ts` — typed env with defaults. `apps/api/src/db.ts` — pg pool +
  prefixed id helper (`id('tx')` → `tx_...`).
- `apps/web/src/api.ts` — typed client. `apps/web/src/App.tsx` — current UI (quote step only).

## Money-correctness rules (non-negotiable)

See `docs/Bitano_backend_contract.md` §A.7 and `docs/Bitano_mvp_spec.md` §3.

- **Never send sats before fiat is confirmed collected.** Lightning sends are irreversible.
- A transaction is a **13-state machine** (`CREATED → … → COMPLETED`). Only apply transitions
  valid from the current state — this is how duplicate / out-of-order / late webhooks stay safe.
- The **refund branch is mandatory**: `SEND_FAILED → REFUND_INITIATED → REFUNDED`; the only
  state where a user paid and got neither sats nor refund is `REFUND_FAILED`, which must page a
  human.
- **Double-entry ledger** (`ledger_entries`): balances are *derived*, never stored as mutable
  columns; every transaction's entries net to zero per currency, written in the same DB tx.
- **Idempotency everywhere**: `Idempotency-Key` header on mutating calls; webhooks idempotent
  on `webhook_events (provider, event_id)`.
- **No-KYC but not anonymous**: identity inherited from the NIDA-registered SIM; AML enforced
  via per-phone limits (`config.ts` / `v_phone_daily`), not ID collection.
- At `SENDING`, fetch a **fresh** LNURL invoice at send time (validation-time invoices expire).

## Built vs. stubbed

| Area | Status |
|---|---|
| `POST /v1/quotes` (LNURL validate + rate lock + persist) | ✅ real |
| `POST /v1/transactions` (idempotency, daily limits, → `AWAITING_PAYMENT`) | ✅ real (collect stubbed) |
| `GET /v1/transactions/:id` | ✅ real |
| LNURL address validation (`lib/lnurl.ts`) | ✅ real |
| Schema: `quotes`, `transactions`, `ledger_entries`, `webhook_events` | ✅ created |
| Web: amount + LN address → quote display | ✅ first slice only |
| ClickPesa collect/disburse | ⬜ stub |
| Lightning `send` | ⬜ stub |
| Webhooks (`/v1/webhooks/clickpesa/...`) + ledger writes | ⬜ not built |
| Refund path, reconciliation job, treasury guard | ⬜ not built |

## Build order / next tickets

1. **ClickPesa adapter** — implement `fiat.ts` collect + disburse against sandbox.
2. **Collection webhook** — `POST /v1/webhooks/clickpesa/collection`: verify signature,
   idempotent on `(provider, event_id)`, `AWAITING_PAYMENT → PAYMENT_CONFIRMED → SENDING`,
   write balanced ledger entries.
3. **Lightning send** — `lightning.ts.send`; fetch fresh invoice at send time; `SENDING → COMPLETED`.
4. **Refund path** — `SEND_FAILED → REFUND_INITIATED → REFUNDED` via disbursement.
5. **Reconciliation job** — ledger vs aggregator settlement vs treasury; balance-check in CI.

## Gotchas for editors

- **ESM import specifiers**: TS source imports use `.js` extensions (e.g. `import { config }
  from './config.js'`) even though the files are `.ts`. Keep this convention.
- Pricing, spread, and limits in `apps/api/.env.example` are **indicative** — replace with a
  real price source and counsel-approved limits before real money moves.
- `insufficient_treasury` guard is a `TODO` in `transactions.ts`; treasury balances aren't
  tracked yet.
- The `ledger_entries` table exists but **no code writes to it yet** — wire this in with the
  collection webhook (ticket 2).
- In `transactions.ts`, `fiat.collect()` is currently called *before* the transaction row is
  persisted (before `BEGIN`/`INSERT`). Re-examine this ordering when implementing the real rail.
