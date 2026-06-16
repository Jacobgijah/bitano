// src/lib/stateMachine.ts — the single source of truth for the 13-state transaction graph.
// Mirrors docs/Bitano_backend_contract.md §3 / Bitano_mvp_spec.md.
// Transitions are applied ONLY if valid from the current state — this is what keeps
// duplicate / out-of-order / late webhooks safe.

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

/** Allowed next states per state. Terminal states map to []. */
export const TRANSITIONS: Record<TxState, TxState[]> = {
  CREATED: ['ADDRESS_VALIDATED', 'ADDRESS_INVALID'],
  ADDRESS_INVALID: [], // terminal — no fiat collected
  ADDRESS_VALIDATED: ['AWAITING_PAYMENT'],
  AWAITING_PAYMENT: ['PAYMENT_CONFIRMED', 'PAYMENT_FAILED', 'PAYMENT_TIMEOUT'],
  PAYMENT_FAILED: [], // terminal — nothing collected
  PAYMENT_TIMEOUT: [], // terminal — verify nothing collected
  PAYMENT_CONFIRMED: ['SENDING'],
  SENDING: ['COMPLETED', 'SEND_FAILED'],
  COMPLETED: [], // terminal — success
  SEND_FAILED: ['REFUND_INITIATED'],
  REFUND_INITIATED: ['REFUNDED', 'REFUND_FAILED'],
  REFUNDED: [], // terminal — recovered
  REFUND_FAILED: [], // terminal — manual ops queue + alert
};

/** True if `to` is a valid transition from `from`. */
export function canTransition(from: TxState, to: TxState): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}
