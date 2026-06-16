# BITANO — *Bitcoin in your hand*

A non-custodial fiat → Bitcoin bridge for Tanzania. A user pays with mobile money (M-Pesa first)
and sats are delivered to **their own** Lightning wallet. No accounts, no balances, no custody.

This repo is the **SWAP pillar, buy direction** — the MVP. See `docs/` for the full spec.

## Stack

- **API** — Node + TypeScript + Express + Zod (`apps/api`)
- **Web** — React + Vite + TypeScript (`apps/web`)
- **DB** — Postgres, raw SQL migrations (`db/migrations`)
- **Local DB** — Docker Compose

## Prerequisites

- Node.js ≥ 20
- Docker (for local Postgres)

## Quick start

```bash
# 1. install everything (npm workspaces)
npm install

# 2. start Postgres
npm run db:up

# 3. create the API env file
cp apps/api/.env.example apps/api/.env

# 4. run migrations
npm run db:migrate

# 5. start the API (terminal 1)
npm run dev:api        # http://localhost:4000/health

# 6. start the web app (terminal 2)
npm run dev:web        # http://localhost:5173
```

Open the web app, enter an amount and a real Lightning address (e.g. your Wallet of Satoshi
address), and press **Endelea**. The API validates the address via LNURL, locks a quote, and
stores it in Postgres.

## Try the API directly

```bash
# create a quote (use a real lightning address you control)
curl -s localhost:4000/v1/quotes -H 'content-type: application/json' \
  -d '{"amount_tzs":10000,"ln_address":"you@walletofsatoshi.com","network":"MPESA"}'

# start a transaction (replace QUOTE_ID)
curl -s localhost:4000/v1/transactions \
  -H 'content-type: application/json' -H 'Idempotency-Key: 11111111-1111-1111-1111-111111111111' \
  -d '{"quote_id":"QUOTE_ID","phone":"255744000000"}'

# poll state (replace TX_ID)
curl -s localhost:4000/v1/transactions/TX_ID
```

## What's built vs. stubbed

| Area | Status |
|---|---|
| `POST /v1/quotes` (LNURL validate + lock) | ✅ real |
| `POST /v1/transactions` (idempotency, limits, collect) | ✅ real (fiat collect stubbed) |
| `GET /v1/transactions/:id` | ✅ real |
| Ledger schema (`db/migrations/001_init.sql`) | ✅ created |
| ClickPesa collect/disburse | ⬜ stub (`apps/api/src/services/fiat.ts`) |
| Lightning send | ⬜ stub (`apps/api/src/services/lightning.ts`) |
| Collection/disbursement webhooks + ledger writes | ⬜ next |

## Build order (next tickets)

1. **ClickPesa adapter** — implement `fiat.ts` collect + disburse against the sandbox.
2. **Collection webhook** — `POST /v1/webhooks/clickpesa/collection`: verify signature,
   idempotent on `(provider, event_id)`, move `AWAITING_PAYMENT → PAYMENT_CONFIRMED → SENDING`,
   write balanced ledger entries.
3. **Lightning send** — implement `lightning.ts.send` against the chosen provider; fetch a fresh
   invoice at send time; `SENDING → COMPLETED`.
4. **Refund path** — `SEND_FAILED → REFUND_INITIATED → REFUNDED` via disbursement.
5. **Reconciliation job** — ledger vs aggregator settlement vs treasury; balance-check in CI.

> Pricing, spread, and limits in `apps/api/.env.example` are indicative — replace with a real
> price source and counsel-approved limits before any real money moves.
