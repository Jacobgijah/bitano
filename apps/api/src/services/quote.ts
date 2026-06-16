// src/services/quote.ts — TZS→sats conversion with spread.
import { config } from '../config.js';

export interface QuoteCalc {
  amountTzs: number;
  sats: number;
  sellRate: number; // TZS per BTC, spread included
}

const SATS_PER_BTC = 100_000_000;

export function computeQuote(amountTzs: number): QuoteCalc {
  const sellRate = Math.round(config.rateTzsPerBtc * (1 + config.spreadPct));
  const sats = Math.floor((amountTzs / sellRate) * SATS_PER_BTC);
  return { amountTzs, sats, sellRate };
}
