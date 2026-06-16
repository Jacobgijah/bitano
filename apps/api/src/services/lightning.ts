// src/services/lightning.ts
// LightningSender interface — wraps the send-capable Lightning provider (or, later, your own node).

import { validateLightningAddress } from '../lib/lnurl.js';

export interface LightningSender {
  /** Pre-flight: can this address receive this amount? Delegates to LNURL. */
  validate(address: string, sats: number): ReturnType<typeof validateLightningAddress>;
  /** Push sats to a Lightning address. Returns a send reference / payment hash. */
  send(address: string, sats: number): Promise<{ sendRef: string }>;
}

// --- STUB: replace send() with a real provider call once chosen. ---
class StubSender implements LightningSender {
  validate(address: string, sats: number) {
    return validateLightningAddress(address, sats);
  }
  async send(address: string, sats: number) {
    // TODO: fetch a FRESH invoice from the address callback at send time, then pay it.
    console.log(`[ln:stub] send ${sats} sats to ${address}`);
    return { sendRef: `ln_send_${Date.now()}` };
  }
}

export const lightning: LightningSender = new StubSender();
