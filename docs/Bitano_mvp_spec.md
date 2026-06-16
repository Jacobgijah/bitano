# BITANO — *Bitcoin in your hand*
## Fiat → Bitcoin Bridge — MVP Technical Specification

**Product:** Bitano — a Tanzania-first Bitcoin bridge for everyday people
**Slogan:** Bitcoin in your hand
**Version:** 0.2 (MVP build spec — brand integrated)
**Model:** Non-custodial, no-account, stateless fiat→BTC converter (Bitika / Tando style)
**Scope owner:** _your team_
**Status:** For build — review the "Open decisions" section before sprint 0.

---

## 0. Brand, vision & design system

**The name.** BIT (Bitcoin) + TANO (Swahili for *five* → five fingers of the open hand → the five product pillars). The open-hand mark and the slogan "Bitcoin in your hand" are not just decoration — they *are* the architecture. Bitano is non-custodial: Bitcoin lands in the user's own wallet, in their own hand. **Brand and product reinforce each other; lead with this in all copy.** Never imply Bitano holds the user's coins.

**The five pillars** (the product north star; the MVP delivers the first two):

| Pillar | Meaning | Delivered |
|---|---|---|
| **HOLD** | Your keys, your coins — self-custody savings | **From day 1** (sats go to the user's own wallet by design) |
| **SWAP** | Convert TZS ⇄ BTC — the bridge | **MVP** (buy/TZS→BTC first; sell later) |
| **SEND** | Send sats P2P over Lightning | Phase 2 |
| **PAY** | Airtime, data, bills, merchants | Phase 2–3 |
| **GROW** | Recurring buy (stack sats) + Bitcoin education | Phase 3 |

> Scope note: the MVP in this document = the **SWAP** pillar, buy direction. **HOLD** comes for free because the model is non-custodial. Everything in §1 below is unchanged by the rebrand — Bitano is the name for the same lean bridge.

**Color palette (from the logo).**

| Token | Hex | Use |
|---|---|---|
| `--bitano-orange` | `#F7931A` | Primary brand / Bitcoin orange — buttons, accents |
| `--bitano-orange-light` | `#FDB94E` | Gradient top, highlights, hover |
| `--bitano-navy` | `#0E1B2E` | Primary background |
| `--bitano-navy-2` | `#16263B` | Cards / raised surfaces |
| `--bitano-line` | `#243349` | Borders / dividers |
| `--bitano-white` | `#FFFFFF` | Primary text on dark |
| `--bitano-muted` | `#C2D0DE` | Secondary text on dark |

Primary gradient: `linear-gradient(#FDB94E → #F7931A)`. Wordmark convention: **BIT** in white, **ANO** in orange.

**UX direction (MVP PWA).**
- Dark-navy canvas, orange as the single action color; generous spacing; large tap targets (market traders, outdoor screens, mid-range Android).
- **Swahili-first**, English secondary. Plain words, no crypto jargon — the flow should feel like sending mobile money.
- The entire buy flow is **one screen + a confirm**: enter Lightning address, amount (TZS), network → see "You pay X TZS → receive ≈ Y sats" → USSD push → done. No login, no dashboard, no balance.
- Reuse the open-hand mark as the success state ("Bitcoin is in your hand").
- Accessibility: works on low-end devices and poor connectivity; consider a USSD/WhatsApp channel for reach in Phase 1.1.

---

## 1. What we are building (and what we are deliberately NOT building)

A user converts Tanzanian Shillings (TZS) held in mobile money into Bitcoin (sats) delivered to **their own** external Lightning wallet. The platform is a **bridge**, not a wallet.

**In scope for MVP**
- One direction: TZS in → sats out.
- One network first: **M-Pesa (Vodacom)**. Others added after the happy path + refund path are proven.
- User supplies their own Lightning address (Wallet of Satoshi, Blink, Phoenix, etc.).
- Mobile-money collection and refund via a **licensed aggregator** (ClickPesa as primary).
- Sats sent via a **send-capable Lightning API** (no self-hosted node in MVP — see §11 and Open decisions).

**Explicitly NOT in scope for MVP**
- No user accounts, login, or profile.
- No wallet UI, no displayed balance, no stored user funds of any kind.
- No Bitcoin custody. No holding of user TZS beyond the instant of the transaction.
- No BTC→fiat (off-ramp), no P2P, no merchant payments, no airtime/bills. (Later phases.)
- No self-hosted Lightning node / BTCPay / LNbits in MVP (candidate for Phase 2 sovereignty).

**Identity / KYC posture.** No KYC at the app layer (no signup, no ID). Identity is *inherited* from the mobile-money rail: every Tanzanian SIM is NIDA-registered and the payer phone number is captured by the aggregator, which is itself BOT-licensed and AML-obligated. The platform is therefore **no-KYC but not anonymous**. AML risk is managed through per-phone transaction limits (§9), not identity collection. **Confirm thresholds with Tanzanian fintech counsel before launch.**

---

## 2. High-level architecture

```
 ┌──────────┐     ┌──────────────────────────────┐     ┌─────────────────┐
 │  Client  │────▶│        Bridge Service        │────▶│  Mobile Money    │
 │ (web/PWA)│◀────│  (API + state machine +      │◀────│  Aggregator      │
 └──────────┘     │   ledger + reconciliation)   │     │  (ClickPesa)     │
                  │                              │     └─────────────────┘
                  │                              │     ┌─────────────────┐
                  │                              │────▶│ Lightning Send   │
                  │                              │◀────│ API (provider)   │
                  └──────────────────────────────┘     └─────────────────┘
```

Two external dependencies are wrapped behind **thin internal interfaces** so either can be swapped without touching business logic:

- `FiatRail` — `collect(amount, phone, network) → paymentRef`, `disburse(amount, phone, network) → payoutRef`, plus inbound webhooks. Implementation: ClickPesa. Backup: Selcom / DPO.
- `LightningSender` — `validateAddress(lnAddress, amountSats) → ok|reason`, `send(lnAddress, amountSats) → sendRef`. Implementation: send-capable Lightning API. Future: self-hosted node + LNbits.

**Suggested stack:** Go or Node/TypeScript backend; PostgreSQL (ledger + transaction store); a durable job/queue mechanism for async steps and retries; Swahili-first mobile PWA. Nothing exotic — correctness and idempotency matter more than the language.

---

## 3. The transaction state machine (the heart of the system)

Every conversion is one `Transaction` row that moves through this machine. **The cardinal invariant: sats are NEVER sent before fiat is confirmed collected.** Lightning sends are irreversible.

| State | Meaning | Valid next states |
|---|---|---|
| `CREATED` | Request received, quote locked, not yet validated | `ADDRESS_VALIDATED`, `ADDRESS_INVALID` |
| `ADDRESS_INVALID` | LN address won't resolve or can't receive amount | _terminal (no fiat collected)_ |
| `ADDRESS_VALIDATED` | LN address resolves and accepts the amount | `AWAITING_PAYMENT` |
| `AWAITING_PAYMENT` | USSD push sent; waiting for the user's PIN + collection | `PAYMENT_CONFIRMED`, `PAYMENT_FAILED`, `PAYMENT_TIMEOUT` |
| `PAYMENT_FAILED` | User declined / wrong PIN / insufficient funds | _terminal (nothing collected)_ |
| `PAYMENT_TIMEOUT` | No collection within window | _terminal (verify nothing collected)_ |
| `PAYMENT_CONFIRMED` | Aggregator webhook confirms TZS collected | `SENDING` |
| `SENDING` | Lightning send initiated to user address | `COMPLETED`, `SEND_FAILED` |
| `COMPLETED` | Sats delivered to user wallet | _terminal (success)_ |
| `SEND_FAILED` | Send could not complete (bad route, liquidity, expired invoice) | `REFUND_INITIATED` |
| `REFUND_INITIATED` | Disbursement of TZS back to payer started | `REFUNDED`, `REFUND_FAILED` |
| `REFUNDED` | TZS returned to payer's mobile money | _terminal (recovered)_ |
| `REFUND_FAILED` | Refund could not complete | _terminal → manual ops queue + alert_ |

**Rules**
- A transaction that never reaches `PAYMENT_CONFIRMED` must result in **zero** outbound sats. Period.
- `PAYMENT_CONFIRMED → SENDING` should fetch a **fresh** Lightning invoice from the address callback at send time (LNURL invoices expire); do not reuse one fetched at validation time.
- `SEND_FAILED` must **always** lead to a refund attempt. There is no terminal state where the user paid and received neither sats nor a refund except `REFUND_FAILED`, which pages a human.
- Re-entrant transitions (from retried webhooks) are governed by idempotency keys (§7) — a transition already applied is a no-op, never a double action.

---

## 4. Quote & spread logic

**Revenue = spread on the BTC sell rate.** No separate user fee in MVP (simpler UX; revisit later).

```
reference_rate   = BTC/TZS from price source (or the send provider's rate)
sell_rate        = reference_rate × (1 + spread_pct)      # user pays more TZS per sat
sats_out         = floor( (amount_tzs / sell_rate) × 1e8 )  # minus est. network fee
```

- `spread_pct` must cover: gross margin + Lightning routing fees + FX buffer (seconds of exposure) + refund cost buffer. Start conservative; tune with data.
- **Quote lock:** lock `sell_rate` at `CREATED` for a short window (suggest 60–120s). Decide the policy if collection confirms *after* expiry: re-quote, or honor within a tolerance band (Open decision).
- **FX exposure window:** the only directional risk is between `PAYMENT_CONFIRMED` and `COMPLETED` (seconds). Keep it small; if using a provider that converts on send, exposure is near-zero.
- Always show the user, before they pay: **"You pay {amount_tzs} TZS → you receive ≈ {sats_out} sats to {ln_address}."**

---

## 5. Lightning address validation contract

A Lightning address `user@domain` maps to an LNURL-pay endpoint. Validation happens **before any fiat is collected**.

**Validate (at `CREATED`):**
1. `GET https://{domain}/.well-known/lnurlp/{user}`
2. Expect JSON with `callback`, `minSendable`, `maxSendable` (millisats), `metadata`, `tag: "payRequest"`.
3. Assert `minSendable ≤ sats_out×1000 ≤ maxSendable`.
4. On any failure (DNS, non-200, malformed, amount out of range) → `ADDRESS_INVALID`, surface a clear reason, collect nothing.

**Send (at `SENDING`):**
1. `GET {callback}?amount={msats}` → returns `{ pr: "<bolt11 invoice>" }`.
2. Pay the `pr` invoice via `LightningSender.send(...)`.
3. Success → `COMPLETED`. Failure → `SEND_FAILED` → refund.

> Note: if using a provider whose `send()` accepts a Lightning address directly, it performs the LNURL dance internally — still do step (1)–(4) of *validation* yourself before collecting fiat.

---

## 6. Mobile-money (ClickPesa) integration checklist

ClickPesa is BOT-licensed and already integrated with M-Pesa, Mixx by Yas, Airtel Money, and HaloPesa — one integration covers all four. MVP uses M-Pesa only.

**Setup**
- [ ] Register business; obtain API credentials (client id / API key).
- [ ] Implement auth-token generation/refresh.
- [ ] Get sandbox access first; build and pass the full flow in sandbox before production.

**Collection (the "buy" leg)**
- [ ] Initiate USSD-push collection: pass `amount` (TZS), payer `phone`, `network`, and your unique `order_reference` (= internal transaction id).
- [ ] Collection is **asynchronous** — the user enters their PIN on their handset; confirmation arrives later by webhook (and/or status poll as a fallback).
- [ ] Map webhook outcomes → `PAYMENT_CONFIRMED` / `PAYMENT_FAILED` / `PAYMENT_TIMEOUT`.

**Disbursement (the refund leg)**
- [ ] Implement payout/disbursement: send TZS to the payer's `phone` on `SEND_FAILED`.
- [ ] Decide who absorbs disbursement fees on refund (Open decision) — default: platform absorbs; never silently short the user.
- [ ] Map payout webhook → `REFUNDED` / `REFUND_FAILED`.

**Webhooks & reconciliation**
- [ ] Verify webhook authenticity (signature / shared secret / source check).
- [ ] Idempotent handling keyed on `order_reference` + event id (§7).
- [ ] Pull the daily settlement report; run the reconciliation job (§8).

---

## 7. Webhooks, idempotency, retries

- Every externally-triggered state change carries an **idempotency key** (`order_reference` + provider event id). Applying the same event twice is a no-op.
- Webhooks may arrive **duplicated, out-of-order, or late.** The handler must be safe under all three: load the transaction, check its current state, apply the transition only if valid, otherwise ignore.
- Outbound calls (`collect`, `disburse`, `send`) also use idempotency keys so a retried request never double-charges or double-pays.
- Use a durable queue + bounded retries with backoff for `SENDING` and `REFUND_INITIATED`. Exhausted retries → manual ops queue + alert, never a silent drop.

---

## 8. Internal ledger & reconciliation (no user balances — for YOUR books)

There are no user balances, but you still need **double-entry accounting** for your own treasury, revenue, and audits. Every balanced entry; balances are *derived* from entries, never stored as a mutable number.

**Core accounts (minimum):**
- `TZS_FLOAT` — shillings held at the aggregator (working capital for refunds/ops).
- `BTC_TREASURY` — sats available to send (at provider or, later, your node).
- `REVENUE_SPREAD` — your margin per transaction.
- `NETWORK_FEES` — Lightning routing + disbursement fees.
- `REFUNDS_PAYABLE` — in-flight refunds.

**Per completed transaction (illustrative):**
- TZS collected: `Dr TZS_FLOAT` / `Cr suspense`
- Sats sent: `Cr BTC_TREASURY` / `Dr suspense`
- Difference recognized: `Cr REVENUE_SPREAD`, `Dr NETWORK_FEES`

**Reconciliation job (daily, before scaling volume):**
- Compare internal ledger vs. aggregator settlement report (TZS) and vs. provider balance (sats).
- Any mismatch → alert loudly and halt automated payouts until cleared.

---

## 9. Limits & AML (no-KYC posture)

Because there is no platform identity, AML control is enforced through limits keyed on the **payer phone number**:

- [ ] Per-transaction min and max (TZS).
- [ ] Per-phone daily and monthly caps.
- [ ] Velocity checks (N transactions / window).
- [ ] Block list / sanctions handling per counsel + aggregator requirements.
- [ ] Hard stop: if `BTC_TREASURY` cannot cover a requested send, **refuse the buy up front** (do not collect fiat you can't fulfill).

> All thresholds are placeholders until reviewed with Tanzanian fintech counsel and confirmed acceptable to the aggregator's compliance team.

---

## 10. Security

- Webhook signature verification on every inbound provider call.
- Idempotency keys on every state transition and outbound money movement.
- Secrets in a managed store; the Lightning send API key is **money** — treat it like a hot wallet credential.
- Rate-limit the public `quote` and `initiate` endpoints (anti-abuse / anti-enumeration).
- Append-only audit log of all transitions and money movements.
- Principle of least privilege on provider API scopes (e.g., separate collection vs. disbursement credentials if supported).

---

## 11. Lightning send: provider vs. self-hosted node

**MVP decision: use a send-capable Lightning API; run no node.** Rationale: shipping speed, no channel/liquidity management, no node security surface. Trade-off: the provider will KYB *you* and may impose compliance terms (does not affect end users' no-KYC experience).

**Phase 2 sovereignty option:** self-hosted Lightning node + **LNbits** (lighter and more send/API-first than BTCPay for a push-to-address bridge). BTCPay is receive-first; reserve it for a future *merchant-acceptance* product, not the bridge core. Running your own node means **you** source BTC and manage inbound/outbound liquidity — that's the real cost, not the software. Keep `LightningSender` abstracted so this swap is a config change.

---

## 12. Sprint breakdown

Assumes a small team; sprints ~1–2 weeks each.

**Sprint 0 — Foundations (parallelizable, partly non-engineering)**
- Engage fintech counsel; begin BOT sandbox conversation; lock AML limit thresholds on paper.
- Secure sandbox access: ClickPesa + chosen Lightning send API.
- Repo, CI, environments, PostgreSQL, ledger schema, `FiatRail` + `LightningSender` interfaces (stubbed).

**Sprint 1 — Quote + validation + state machine skeleton**
- Price source + spread/quote engine with rate lock.
- Lightning address validation contract (§5).
- Transaction model + state machine with all states and guards (no real money yet).

**Sprint 2 — Happy path (M-Pesa buy → sats out)**
- ClickPesa collection initiation + webhook handling.
- `LightningSender.send` integration.
- End-to-end sandbox: `CREATED → … → COMPLETED`. Ledger entries written.

**Sprint 3 — Failure & refund + reconciliation**
- `PAYMENT_FAILED` / `TIMEOUT`, `SEND_FAILED → REFUND_INITIATED → REFUNDED`.
- Disbursement integration; refund fee policy implemented.
- Reconciliation job + mismatch alerting. Idempotency hardening under duplicate/out-of-order webhooks.

**Sprint 4 — Hardening & alpha**
- Limits/AML enforcement, rate limiting, audit log, monitoring/alerting, treasury low-liquidity guard.
- Internal alpha with small real amounts on one network.
- Then: add remaining networks (Mixx by Yas, Airtel, HaloPesa — config, since aggregator covers them) and a USSD/WhatsApp channel for reach (Phase 1.1).

**Post-MVP, by pillar** (the five fingers, in build order)
- **SWAP — sell direction:** BTC→TZS off-ramp (reverse of the bridge) to complete the SWAP pillar.
- **SEND:** P2P sats over Lightning (phone number ⇄ Lightning address).
- **PAY:** airtime, data, bills, then merchant QR with auto-settlement to TZS.
- **GROW:** recurring buy ("stack sats"), plus Swahili Bitcoin education built into the app.
- **HOLD** needs no build — it is the non-custodial default, present from day one.

---

## 13. Open decisions (resolve before / during Sprint 0)

1. **Lightning send provider** — which send-capable API for MVP? (Confirm: pushes to external LN address, TZS-relevant settlement, KYB terms, fees, uptime.)
2. **Price source** — provider's own rate vs. independent BTC/TZS feed.
3. **Quote lock policy** — window length, and behavior when collection confirms after expiry (re-quote vs. tolerance band).
4. **Refund fee handling** — platform absorbs mobile-money disbursement fee on refunds (recommended) vs. deduct.
5. **Treasury rebalancing** — manual at first; define the trigger/threshold for converting accumulated TZS back into BTC inventory.
6. **Channel(s) for v1** — PWA only, or PWA + USSD/WhatsApp from the start (reach vs. speed).

---

_Bitano keeps the user-facing system stateless and custody-free — Bitcoin in the user's own hand. The complexity that remains lives in three places — the state machine, the refund path, and reconciliation — so that is where review and test effort should concentrate. Legal/regulatory items require Tanzanian counsel and are not legal advice._