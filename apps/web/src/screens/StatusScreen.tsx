// src/screens/StatusScreen.tsx — post-payment status: polls the tx and renders the live state.
import { motion } from 'framer-motion';
import { useT } from '../i18n/LanguageProvider.js';
import type { StringKey } from '../i18n/strings.js';
import { useTransactionPolling } from '../hooks/useTransactionPolling.js';
import type { Quote, TxState } from '../api.js';
import { formatSats } from '../lib/format.js';
import { Card } from '../components/AppShell.js';
import { Stepper } from '../components/ui/Stepper.js';
import { StatusIcon } from '../components/ui/StatusIcon.js';
import { Button } from '../components/ui/Button.js';

type Kind = 'waiting' | 'sending' | 'success' | 'error' | 'refund';
type Action = 'retry' | 'startover' | 'none';

interface View {
  kind: Kind;
  title: StringKey;
  desc: StringKey;
  action: Action;
}

const VIEWS: Record<TxState, View> = {
  CREATED: { kind: 'waiting', title: 'awaiting_title', desc: 'awaiting_desc', action: 'none' },
  ADDRESS_VALIDATED: { kind: 'waiting', title: 'awaiting_title', desc: 'awaiting_desc', action: 'none' },
  AWAITING_PAYMENT: { kind: 'waiting', title: 'awaiting_title', desc: 'awaiting_desc', action: 'none' },
  PAYMENT_CONFIRMED: { kind: 'sending', title: 'delivering_title', desc: 'delivering_desc', action: 'none' },
  SENDING: { kind: 'sending', title: 'delivering_title', desc: 'delivering_desc', action: 'none' },
  COMPLETED: { kind: 'success', title: 'success_title', desc: 'success_desc', action: 'startover' },
  PAYMENT_FAILED: { kind: 'error', title: 'failed_title', desc: 'failed_desc', action: 'retry' },
  PAYMENT_TIMEOUT: { kind: 'error', title: 'timeout_title', desc: 'timeout_desc', action: 'retry' },
  ADDRESS_INVALID: { kind: 'error', title: 'failed_title', desc: 'failed_desc', action: 'retry' },
  SEND_FAILED: { kind: 'refund', title: 'refund_title', desc: 'refund_desc', action: 'none' },
  REFUND_INITIATED: { kind: 'refund', title: 'refund_title', desc: 'refund_desc', action: 'none' },
  REFUNDED: { kind: 'refund', title: 'refunded_title', desc: 'refunded_desc', action: 'startover' },
  REFUND_FAILED: { kind: 'error', title: 'refund_failed_title', desc: 'refund_failed_desc', action: 'startover' },
};

interface Props {
  txId: string;
  quote: Quote;
  address: string;
  onRetry: () => void;
  onStartOver: () => void;
  /** TEMP (dev preview): force a state and skip polling. Remove with the preview hook. */
  previewState?: TxState;
}

export function StatusScreen({ txId, quote, address, onRetry, onStartOver, previewState }: Props) {
  const t = useT();
  const { tx } = useTransactionPolling(previewState ? null : txId);
  const state: TxState = previewState ?? tx?.state ?? 'AWAITING_PAYMENT';
  const v = VIEWS[state];

  return (
    <div className="flex flex-col gap-4">
      <Stepper current={3} />
      <Card>
        <motion.div
          key={v.kind}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 py-3 text-center"
        >
          <StatusIcon kind={v.kind} />
          <div>
            <h2 className="text-xl font-extrabold text-ink">{t(v.title)}</h2>
            <p className="mx-auto mt-1 max-w-xs text-sm leading-relaxed text-ink-soft">{t(v.desc)}</p>
          </div>

          {v.kind === 'success' && (
            <div className="w-full rounded-[var(--radius-field)] bg-bitcoin-soft p-4">
              <div className="tnum text-3xl font-extrabold text-ink">{formatSats(quote.sats)}</div>
              <div className="text-sm font-bold text-bitcoin">sats</div>
              <div className="mt-1 break-all text-xs text-ink-soft">
                {t('to_address')} <span className="font-semibold text-ink">{address}</span>
              </div>
            </div>
          )}

          <div className="mt-1 w-full">
            {v.action === 'retry' && (
              <Button full onClick={onRetry}>
                {t('try_again')}
              </Button>
            )}
            {v.action === 'startover' && (
              <Button full variant={v.kind === 'success' ? 'primary' : 'ghost'} onClick={onStartOver}>
                {t('start_over')}
              </Button>
            )}
          </div>
        </motion.div>
      </Card>
    </div>
  );
}
