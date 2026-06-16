// src/routes/quotes.ts — POST /v1/quotes : validate address, lock a rate.
import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { query, id } from '../db.js';
import { computeQuote } from '../services/quote.js';
import { lightning } from '../services/lightning.js';

const router = Router();

const Body = z.object({
  amount_tzs: z.coerce.number().int().positive(),
  ln_address: z.string().min(3).max(255),
  network: z.enum(['MPESA', 'MIXX', 'AIRTEL', 'HALOPESA']),
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: { code: 'invalid_request', message: 'Check the amount, address and network.' },
      });
    }
    const { amount_tzs, ln_address, network } = parsed.data;

    if (network !== 'MPESA') {
      return res.status(422).json({
        error: { code: 'network_unavailable', message: 'Only M-Pesa is available right now.' },
      });
    }
    if (amount_tzs < config.minTzs || amount_tzs > config.maxTzs) {
      return res.status(422).json({
        error: {
          code: 'amount_out_of_bounds',
          message: `Enter between ${config.minTzs} and ${config.maxTzs} TZS.`,
        },
      });
    }

    const calc = computeQuote(amount_tzs);

    const check = await lightning.validate(ln_address, calc.sats);
    if (!check.valid) {
      return res.status(422).json({
        error: {
          code: 'address_unpayable',
          message: "That Lightning address can't receive this amount.",
          detail: check.reason,
        },
      });
    }

    const quoteId = id('qt');
    const expiresAt = new Date(Date.now() + config.quoteTtlSeconds * 1000);

    await query(
      `INSERT INTO quotes (id, amount_tzs, sats, sell_rate, ln_address, network, ln_address_valid, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,TRUE,$7)`,
      [quoteId, amount_tzs, calc.sats, calc.sellRate, ln_address, network, expiresAt],
    );

    res.status(201).json({
      quote_id: quoteId,
      amount_tzs: String(amount_tzs),
      sats: calc.sats,
      sell_rate_tzs_per_btc: String(calc.sellRate),
      ln_address_valid: true,
      expires_at: expiresAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
