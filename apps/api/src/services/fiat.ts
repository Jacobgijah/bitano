// src/services/fiat.ts
// FiatRail interface — wraps the mobile-money aggregator (ClickPesa primary).
// Swap the implementation without touching business logic.

export interface CollectInput {
  transactionId: string;
  amountTzs: number;
  phone: string;
  network: string;
}

export interface FiatRail {
  /** Trigger a USSD-push collection. Returns the aggregator's collection reference. */
  collect(input: CollectInput): Promise<{ collectionRef: string }>;
  /** Refund TZS to the payer (used on SEND_FAILED). */
  disburse(input: CollectInput): Promise<{ disbursementRef: string }>;
}

// --- STUB: replace with a real ClickPesa adapter once sandbox creds land. ---
class ClickPesaStub implements FiatRail {
  async collect(input: CollectInput) {
    // TODO: call ClickPesa USSD-push collection; confirmation arrives via webhook.
    console.log(`[fiat:stub] collect ${input.amountTzs} TZS from ${input.phone} (${input.network})`);
    return { collectionRef: `cp_collect_${input.transactionId}` };
  }
  async disburse(input: CollectInput) {
    // TODO: call ClickPesa disbursement to refund the payer.
    console.log(`[fiat:stub] refund ${input.amountTzs} TZS to ${input.phone}`);
    return { disbursementRef: `cp_refund_${input.transactionId}` };
  }
}

export const fiat: FiatRail = new ClickPesaStub();
