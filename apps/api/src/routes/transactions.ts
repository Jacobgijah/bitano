// src/routes/transactions.ts
// POST /v1/transactions : consume a quote, check limits, trigger collection (CREATED -> AWAITING_PAYMENT).
// GET  /v1/transactions/:id : poll state.
import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { query, id } from '../db.js';
import { fiat } from '../services/fiat.js';

const router = Router();

const Body = z.object({
  quote_id: z.string().min(3),
  phone: z.string().regex(/^\d{9,15}$/, 'phone must be digits, e.g. 255744000000'),
});

router.post('/', async (req, res, next) => {
  try {
    const idemKey = req.header('Idempotency-Key');
    if (!idemKey) {
      return res.status(400).json({
        error: { code: 'idempotency_key_required', message: 'Provide an Idempotency-Key header.' },
      });
    }

    // Idempotent replay: return the existing transaction if this key was seen.
    const existing = await query(
      `SELECT id, state FROM transactions WHERE idempotency_key = $1`,
      [idemKey],
    );
    if (existing.rowCount && existing.rowCount > 0) {
      const row = existing.rows[0] as { id: string; state: string };
      return res.status(202).json({ transaction_id: row.id, state: row.state });
    }

    const parsed = Body.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: { code: 'invalid_request', message: 'Provide quote_id and a valid phone.' },
      });
    }
    const { quote_id, phone } = parsed.data;

    const q = await query(
      `SELECT * FROM quotes WHERE id = $1`,
      [quote_id],
    );
    if (!q.rowCount) {
      return res.status(404).json({ error: { code: 'quote_not_found', message: 'Quote not found.' } });
    }
    const quote = q.rows[0] as any;

    if (quote.consumed_at) {
      return res.status(409).json({ error: { code: 'quote_already_used', message: 'Quote already used.' } });
    }
    if (new Date(quote.expires_at).getTime() < Date.now()) {
      return res.status(409).json({ error: { code: 'quote_expired', message: 'Quote expired — get a new price.' } });
    }

    // Per-phone daily limits (AML posture without KYC).
    const limits = await query(
      `SELECT count(*)::int AS cnt, COALESCE(sum(amount_tzs),0) AS total
         FROM transactions
        WHERE phone = $1
          AND created_at >= date_trunc('day', now())
          AND state NOT IN ('PAYMENT_FAILED','PAYMENT_TIMEOUT','ADDRESS_INVALID')`,
      [phone],
    );
    const { cnt, total } = limits.rows[0] as { cnt: number; total: string };
    if (cnt >= config.maxTxPerDay || Number(total) + Number(quote.amount_tzs) > config.maxTzsPerDay) {
      return res.status(429).json({
        error: { code: 'limit_exceeded', message: 'Daily limit reached. Try again tomorrow.' },
      });
    }

    // TODO: insufficient_treasury guard once treasury balances are tracked.

    const txId = id('tx');
    const collect = await fiat.collect({
      transactionId: txId,
      amountTzs: Number(quote.amount_tzs),
      phone,
      network: quote.network,
    });

    await query('BEGIN');
    try {
      await query(
        `INSERT INTO transactions
           (id, quote_id, state, amount_tzs, sats, sell_rate, ln_address, network, phone, collection_ref, idempotency_key)
         VALUES ($1,$2,'AWAITING_PAYMENT',$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          txId, quote.id, quote.amount_tzs, quote.sats, quote.sell_rate,
          quote.ln_address, quote.network, phone, collect.collectionRef, idemKey,
        ],
      );
      await query(`UPDATE quotes SET consumed_at = now() WHERE id = $1`, [quote.id]);
      await query('COMMIT');
    } catch (e) {
      await query('ROLLBACK');
      throw e;
    }

    res.status(202).json({ transaction_id: txId, state: 'AWAITING_PAYMENT' });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const r = await query(`SELECT * FROM transactions WHERE id = $1`, [req.params.id]);
    if (!r.rowCount) {
      return res.status(404).json({ error: { code: 'not_found', message: 'Transaction not found.' } });
    }
    const t = r.rows[0] as any;
    res.json({
      transaction_id: t.id,
      state: t.state,
      amount_tzs: String(t.amount_tzs),
      sats: Number(t.sats),
      ln_address: t.ln_address,
      network: t.network,
      failure_reason: t.failure_reason,
      updated_at: t.updated_at,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
