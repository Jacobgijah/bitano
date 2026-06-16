// src/services/ledger.ts — double-entry ledger writer.
// Money rule (docs §A.7): balances are DERIVED from ledger_entries, never stored as mutable
// columns; every transaction's entries must net to ZERO per currency, written in the same DB
// transaction as the state change. This is the first (and only) place that writes the table.
import type { BoundQuery } from '../db.js';

export type LedgerAccount =
  | 'TZS_FLOAT'
  | 'BTC_TREASURY'
  | 'REVENUE_SPREAD'
  | 'NETWORK_FEES'
  | 'REFUNDS_PAYABLE'
  | 'SUSPENSE';

export type EntryDir = 'DEBIT' | 'CREDIT';
export type MoneyCcy = 'TZS' | 'SATS';

export interface LedgerEntry {
  account: LedgerAccount;
  direction: EntryDir;
  currency: MoneyCcy;
  amount: number; // positive integer (minor unit: TZS or sats)
  memo?: string;
}

/** Net of a set of entries for one currency (DEBIT positive, CREDIT negative). */
function netByCurrency(entries: LedgerEntry[]): Map<MoneyCcy, number> {
  const net = new Map<MoneyCcy, number>();
  for (const e of entries) {
    const delta = e.direction === 'DEBIT' ? e.amount : -e.amount;
    net.set(e.currency, (net.get(e.currency) ?? 0) + delta);
  }
  return net;
}

/**
 * Insert a balanced set of entries. Asserts each currency nets to zero BEFORE writing —
 * an unbalanced set is a programming error and must never reach the database.
 * Must be called inside withTransaction (pass the bound query).
 */
export async function postEntries(
  q: BoundQuery,
  transactionId: string,
  entries: LedgerEntry[],
): Promise<void> {
  if (entries.length === 0) throw new Error('ledger: refusing to post an empty entry set');

  for (const [ccy, net] of netByCurrency(entries)) {
    if (net !== 0) {
      throw new Error(`ledger: entries for ${transactionId} do not net to zero in ${ccy} (net=${net})`);
    }
  }
  if (entries.some((e) => !Number.isInteger(e.amount) || e.amount <= 0)) {
    throw new Error(`ledger: entry amounts must be positive integers (tx ${transactionId})`);
  }

  for (const e of entries) {
    await q(
      `INSERT INTO ledger_entries (transaction_id, account, direction, currency, amount, memo)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [transactionId, e.account, e.direction, e.currency, e.amount, e.memo ?? null],
    );
  }
}

/**
 * TZS-in legs for a confirmed mobile-money collection (docs §A.7 illustrative ledger):
 *   DEBIT  TZS_FLOAT  amount
 *   CREDIT SUSPENSE   amount
 * The sats legs (CREDIT BTC_TREASURY / DEBIT SUSPENSE) and the spread revenue split are
 * posted later at send time (Ticket 3), once the irreversible Lightning send succeeds.
 */
export async function recordCollection(
  q: BoundQuery,
  tx: { id: string; amount_tzs: number | string },
): Promise<void> {
  const amountTzs = Math.round(Number(tx.amount_tzs));
  await postEntries(q, tx.id, [
    { account: 'TZS_FLOAT', direction: 'DEBIT', currency: 'TZS', amount: amountTzs, memo: 'collection' },
    { account: 'SUSPENSE', direction: 'CREDIT', currency: 'TZS', amount: amountTzs, memo: 'collection' },
  ]);
}
