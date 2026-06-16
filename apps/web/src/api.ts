// src/api.ts — typed client for the Bitano API.
export interface Quote {
  quote_id: string;
  amount_tzs: string;
  sats: number;
  sell_rate_tzs_per_btc: string;
  expires_at: string;
}

export interface ApiError {
  error: { code: string; message: string; detail?: string };
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
  const data = await res.json();
  if (!res.ok) throw new Error((data as ApiError).error?.message || 'Request failed');
  return data as Quote;
}
