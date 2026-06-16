// src/lib/lnurl.ts
// Validate a Lightning address (user@domain) and check it can receive a given sats amount.
// This is the pre-flight that must pass BEFORE any fiat is collected.

export type LnValidation =
  | { valid: true; callback: string; minSats: number; maxSats: number }
  | { valid: false; reason: string };

const ADDRESS_RE = /^[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

export async function validateLightningAddress(
  address: string,
  sats: number,
  timeoutMs = 6000,
): Promise<LnValidation> {
  if (!ADDRESS_RE.test(address)) {
    return { valid: false, reason: 'malformed_address' };
  }
  const [name, domain] = address.split('@');
  const url = `https://${domain}/.well-known/lnurlp/${encodeURIComponent(name)}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return { valid: false, reason: 'lnurl_unreachable' };

    const data = (await res.json()) as {
      tag?: string;
      callback?: string;
      minSendable?: number;
      maxSendable?: number;
    };

    if (data.tag !== 'payRequest' || !data.callback) {
      return { valid: false, reason: 'not_a_pay_endpoint' };
    }

    const msats = sats * 1000;
    const min = data.minSendable ?? 0;
    const max = data.maxSendable ?? Number.MAX_SAFE_INTEGER;
    if (msats < min || msats > max) {
      return { valid: false, reason: 'amount_out_of_range' };
    }

    return {
      valid: true,
      callback: data.callback,
      minSats: Math.ceil(min / 1000),
      maxSats: Math.floor(max / 1000),
    };
  } catch (err) {
    const reason = (err as Error).name === 'AbortError' ? 'lnurl_timeout' : 'lnurl_error';
    return { valid: false, reason };
  } finally {
    clearTimeout(timer);
  }
}
