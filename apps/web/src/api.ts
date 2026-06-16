// src/api.ts — typed client for the Bitano API.
export interface Quote {
  quote_id: string;
  amount_tzs: string;
  sats: number;
  sell_rate_tzs_per_btc: string;
  ln_address_valid?: boolean;
  expires_at: string;
}

export type TxState =
  | 'CREATED'
  | 'ADDRESS_INVALID'
  | 'ADDRESS_VALIDATED'
  | 'AWAITING_PAYMENT'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_TIMEOUT'
  | 'PAYMENT_CONFIRMED'
  | 'SENDING'
  | 'COMPLETED'
  | 'SEND_FAILED'
  | 'REFUND_INITIATED'
  | 'REFUNDED'
  | 'REFUND_FAILED';

export interface CreatedTransaction {
  transaction_id: string;
  state: TxState;
}

export interface Transaction {
  transaction_id: string;
  state: TxState;
  amount_tzs: string;
  sats: number;
  ln_address: string;
  network: string;
  failure_reason: string | null;
  updated_at: string;
}

export interface ApiError {
  error: { code: string; message: string; detail?: string };
}

/** Wrap a fetch Response, throwing the API's error message on non-2xx. */
async function unwrap<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (data as ApiError | null)?.error?.message || 'Request failed';
    const err = new Error(msg) as Error & { code?: string };
    err.code = (data as ApiError | null)?.error?.code;
    throw err;
  }
  return data as T;
}

export async function createQuote(
  amountTzs: number,
  lnAddress: string,
  network = 'MPESA',
): Promise<Quote> {
  const res = await fetch('/v1/quotes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount_tzs: amountTzs, ln_address: lnAddress, network }),
  });
  return unwrap<Quote>(res);
}

export async function createTransaction(
  quoteId: string,
  phone: string,
  idempotencyKey: string,
): Promise<CreatedTransaction> {
  const res = await fetch('/v1/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ quote_id: quoteId, phone }),
  });
  return unwrap<CreatedTransaction>(res);
}

export async function getTransaction(id: string): Promise<Transaction> {
  const res = await fetch(`/v1/transactions/${encodeURIComponent(id)}`);
  return unwrap<Transaction>(res);
}

/** Terminal states stop polling. */
export const TERMINAL_STATES: ReadonlySet<TxState> = new Set<TxState>([
  'COMPLETED',
  'PAYMENT_FAILED',
  'PAYMENT_TIMEOUT',
  'ADDRESS_INVALID',
  'REFUNDED',
  'REFUND_FAILED',
]);
