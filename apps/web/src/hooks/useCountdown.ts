// src/hooks/useCountdown.ts — live seconds-remaining until an ISO deadline.
import { useEffect, useState } from 'react';

export function useCountdown(deadlineIso: string | undefined): { secondsLeft: number; expired: boolean } {
  const deadline = deadlineIso ? new Date(deadlineIso).getTime() : 0;

  const calc = () => (deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) : 0);
  const [secondsLeft, setSecondsLeft] = useState<number>(calc);

  useEffect(() => {
    if (!deadline) return;
    setSecondsLeft(calc());
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline]);

  return { secondsLeft, expired: deadline > 0 && secondsLeft <= 0 };
}
