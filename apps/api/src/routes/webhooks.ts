// src/routes/webhooks.ts — inbound aggregator webhooks.
// POST /v1/webhooks/clickpesa/collection : confirm (or fail) a mobile-money collection.
//
// Safety model (docs §A.4 / §A.7):
//  - Verify the signature over the RAW request body before trusting anything.
//  - Idempotent on webhook_events (provider, event_id): a replay is a no-op.
//  - Apply the state transition only if valid from the current state (canTransition).
//  - State change + ledger writes happen in ONE DB transaction, with the tx row locked.
import { Router } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { config } from '../config.js';
import { withTransaction } from '../db.js';
import { canTransition, type TxState } from '../lib/stateMachine.js';
import { recordCollection } from '../services/ledger.js';

const router = Router();
const PROVIDER = 'clickpesa';

// ClickPesa collection webhook payload (per docs §A.4). Confirm exact shape vs sandbox.
const CollectionEvent = z.object({
  event_id: z.string().min(1),
  order_reference: z.string().min(1), // == our transaction id
  status: z.enum(['SUCCESS', 'FAILED']),
  amount_tzs: z.union([z.string(), z.number()]).optional(),
});

/**
 * Verify HMAC-SHA256(secret, rawBody) against the provider signature header.
 * NOTE: header name + scheme are an assumption — confirm against the ClickPesa sandbox.
 * If no secret is configured (local/dev), skip with a loud warning.
 */
function verifySignature(rawBody: Buffer | undefined, signature: string | undefined): boolean {
  if (!config.clickpesaWebhookSecret) {
    console.warn('[webhook] CLICKPESA_WEBHOOK_SECRET unset — skipping signature verification');
    return true;
  }
  if (!rawBody || !signature) return false;
  const expected = createHmac('sha256', config.clickpesaWebhookSecret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

type Outcome =
  | { kind: 'not_found' }
  | { kind: 'duplicate'; state: TxState }
  | { kind: 'ignored'; state: TxState } // valid event, but not a legal transition (late/dup)
  | { kind: 'applied'; state: TxState };

router.post('/clickpesa/collection', async (req, res, next) => {
  try {
    const signature = req.header('x-clickpesa-signature');
    if (!verifySignature((req as { rawBody?: Buffer }).rawBody, signature)) {
      return res.status(400).json({ error: { code: 'bad_signature', message: 'Invalid signature.' } });
    }

    const parsed = CollectionEvent.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'invalid_payload', message: 'Malformed webhook payload.' } });
    }
    const event = parsed.data;
    const target: TxState = event.status === 'SUCCESS' ? 'PAYMENT_CONFIRMED' : 'PAYMENT_FAILED';

    const outcome = await withTransaction<Outcome>(async (q) => {
      // Lock the tx row so concurrent duplicate webhooks serialize.
      const txRes = await q(
        `SELECT id, state, amount_tzs FROM transactions WHERE id = $1 FOR UPDATE`,
        [event.order_reference],
      );
      if (!txRes.rowCount) return { kind: 'not_found' };
      const tx = txRes.rows[0] as { id: string; state: TxState; amount_tzs: string };

      // Claim idempotency: first writer wins, replays no-op.
      const claim = await q(
        `INSERT INTO webhook_events (provider, event_id, transaction_id, payload)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (provider, event_id) DO NOTHING
         RETURNING id`,
        [PROVIDER, event.event_id, tx.id, JSON.stringify(event)],
      );
      if (!claim.rowCount) return { kind: 'duplicate', state: tx.state };

      // Only apply legal transitions; a late/dup event against a terminal state is ignored.
      if (!canTransition(tx.state, target)) {
        await q(`UPDATE webhook_events SET processed_at = now() WHERE provider = $1 AND event_id = $2`, [
          PROVIDER,
          event.event_id,
        ]);
        return { kind: 'ignored', state: tx.state };
      }

      if (target === 'PAYMENT_CONFIRMED') {
        await q(`UPDATE transactions SET state = 'PAYMENT_CONFIRMED', confirmed_at = now(), updated_at = now() WHERE id = $1`, [tx.id]);
        await recordCollection(q, tx);
        // Advance to SENDING. The actual irreversible Lightning send stays stubbed.
        // TODO Ticket 3: enqueue lightning send (fetch a FRESH invoice at send time).
        await q(`UPDATE transactions SET state = 'SENDING', updated_at = now() WHERE id = $1`, [tx.id]);
        await q(`UPDATE webhook_events SET processed_at = now() WHERE provider = $1 AND event_id = $2`, [PROVIDER, event.event_id]);
        return { kind: 'applied', state: 'SENDING' };
      }

      // FAILED → PAYMENT_FAILED (terminal, nothing was collected → no ledger entries).
      await q(`UPDATE transactions SET state = 'PAYMENT_FAILED', failure_reason = 'collection_failed', updated_at = now() WHERE id = $1`, [tx.id]);
      await q(`UPDATE webhook_events SET processed_at = now() WHERE provider = $1 AND event_id = $2`, [PROVIDER, event.event_id]);
      return { kind: 'applied', state: 'PAYMENT_FAILED' };
    });

    if (outcome.kind === 'not_found') {
      return res.status(404).json({ error: { code: 'transaction_not_found', message: 'Unknown order_reference.' } });
    }
    // Duplicate / ignored / applied are all successfully handled → 200.
    return res.status(200).json({ ok: true, state: outcome.state });
  } catch (err) {
    next(err);
  }
});

export default router;
