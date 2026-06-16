// src/hooks/useTransactionPolling.ts — poll a transaction until it reaches a terminal state.
import { useEffect, useRef, useState } from 'react';
import { getTransaction, TERMINAL_STATES, type Transaction } from '../api.js';

const INTERVAL_MS = 2500;

export function useTransactionPolling(txId: string | null): {
  tx: Transaction | null;
  error: string | null;
} {
  const [tx, setTx] = useState<Transaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stopped = useRef(false);

  useEffect(() => {
    if (!txId) return;
    stopped.current = false;
    setTx(null);
    setError(null);

    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const next = await getTransaction(txId);
        if (stopped.current) return;
        setTx(next);
        if (TERMINAL_STATES.has(next.state)) return; // done — stop polling
      } catch (e) {
        if (stopped.current) return;
        setError((e as Error).message);
      }
      timer = setTimeout(tick, INTERVAL_MS);
    };

    tick();
    return () => {
      stopped.current = true;
      clearTimeout(timer);
    };
  }, [txId]);

  return { tx, error };
}
