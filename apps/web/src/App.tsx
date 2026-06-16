// src/App.tsx — buy-flow state machine: landing -> amount -> quote -> status.
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Quote } from './api.js';
import { AppShell } from './components/AppShell.js';
import { Landing } from './screens/Landing.js';
import { AmountStep } from './screens/AmountStep.js';
import { QuoteStep } from './screens/QuoteStep.js';
import { StatusScreen } from './screens/StatusScreen.js';
import type { Network } from './components/ui/NetworkSelect.js';
import type { TxState } from './api.js';

type Screen = 'landing' | 'amount' | 'quote' | 'status';

// ---- TEMP dev preview ------------------------------------------------------
// Visit /?preview=success (or failed | timeout | sending | waiting | refund |
// refunded | refund_failed) to render StatusScreen in that state without the
// backend. Lets us preview the COMPLETED success screen before Ticket 3 (real
// Lightning send) lands. Remove this block + the previewState prop afterwards.
const PREVIEW_MAP: Record<string, TxState> = {
  success: 'COMPLETED',
  completed: 'COMPLETED',
  failed: 'PAYMENT_FAILED',
  timeout: 'PAYMENT_TIMEOUT',
  sending: 'SENDING',
  waiting: 'AWAITING_PAYMENT',
  refund: 'REFUND_INITIATED',
  refunded: 'REFUNDED',
  refund_failed: 'REFUND_FAILED',
};

function getPreviewState(): TxState | null {
  if (typeof location === 'undefined') return null;
  const key = new URLSearchParams(location.search).get('preview');
  return key ? (PREVIEW_MAP[key] ?? null) : null;
}

const PREVIEW_QUOTE: Quote = {
  quote_id: 'qt_preview',
  amount_tzs: '10000',
  sats: 3741,
  sell_rate_tzs_per_btc: '267240000',
  ln_address_valid: true,
  expires_at: new Date().toISOString(),
};
// ---------------------------------------------------------------------------

export default function App() {
  // TEMP dev preview: short-circuit straight to a forced StatusScreen state.
  const previewState = getPreviewState();
  if (previewState) {
    const reset = () => {
      location.search = '';
    };
    return (
      <AppShell>
        <StatusScreen
          txId="tx_preview"
          quote={PREVIEW_QUOTE}
          address="satoshi@coinos.io"
          previewState={previewState}
          onRetry={reset}
          onStartOver={reset}
        />
      </AppShell>
    );
  }

  const [screen, setScreen] = useState<Screen>('landing');
  const [amount, setAmount] = useState('10000');
  const [network, setNetwork] = useState<Network>('MPESA');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [txId, setTxId] = useState<string | null>(null);

  function startOver() {
    setQuote(null);
    setTxId(null);
    setPhone('');
    setScreen('amount');
  }

  return (
    <AppShell>
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {screen === 'landing' && <Landing onStart={() => setScreen('amount')} />}

          {screen === 'amount' && (
            <AmountStep
              amount={amount}
              setAmount={setAmount}
              network={network}
              setNetwork={setNetwork}
              address={address}
              setAddress={setAddress}
              onQuoted={(q) => {
                setQuote(q);
                setScreen('quote');
              }}
              onBack={() => setScreen('landing')}
            />
          )}

          {screen === 'quote' && quote && (
            <QuoteStep
              quote={quote}
              address={address}
              phone={phone}
              setPhone={setPhone}
              onPaid={(id) => {
                setTxId(id);
                setScreen('status');
              }}
              onReQuote={() => setScreen('amount')}
              onBack={() => setScreen('amount')}
            />
          )}

          {screen === 'status' && quote && txId && (
            <StatusScreen
              txId={txId}
              quote={quote}
              address={address}
              onRetry={startOver}
              onStartOver={startOver}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </AppShell>
  );
}
