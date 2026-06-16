// src/screens/AmountStep.tsx — enter amount + network + Lightning address, fetch a quote.
import { useState } from 'react';
import { useT } from '../i18n/LanguageProvider.js';
import { createQuote, type Quote } from '../api.js';
import { Card } from '../components/AppShell.js';
import { Stepper } from '../components/ui/Stepper.js';
import { AmountInput } from '../components/ui/AmountInput.js';
import { NetworkSelect, type Network } from '../components/ui/NetworkSelect.js';
import { Field } from '../components/ui/Field.js';
import { Button } from '../components/ui/Button.js';

interface Props {
  amount: string;
  setAmount: (v: string) => void;
  network: Network;
  setNetwork: (n: Network) => void;
  address: string;
  setAddress: (v: string) => void;
  onQuoted: (q: Quote) => void;
  onBack: () => void;
}

const MIN = 500;
const MAX = 5_000_000;

export function AmountStep({ amount, setAmount, network, setNetwork, address, setAddress, onQuoted, onBack }: Props) {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountNum = Number(amount) || 0;
  const tooLow = amountNum > 0 && amountNum < MIN;
  const tooHigh = amountNum > MAX;
  const canSubmit = amountNum >= MIN && amountNum <= MAX && address.trim().length >= 3 && !loading;

  const amountError = tooLow ? t('amount_min') : tooHigh ? t('amount_max') : null;

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const q = await createQuote(amountNum, address.trim(), network);
      onQuoted(q);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Stepper current={1} />
      <Card>
        <p className="mb-1 text-center text-xs font-bold text-ink-soft">{t('amount_label')}</p>
        <AmountInput value={amount} onChange={setAmount} />
        {amountError && <p className="mb-1 text-center text-xs text-danger">{amountError}</p>}

        <div className="mt-4 flex flex-col gap-1.5">
          <span className="text-xs font-bold tracking-wide text-ink-soft">{t('network_label')}</span>
          <NetworkSelect value={network} onChange={setNetwork} />
        </div>

        <div className="mt-4">
          <Field
            label={t('ln_label')}
            name="ln"
            placeholder="juma@walletofsatoshi.com"
            hint={t('ln_hint')}
            value={address}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="none"
            onChange={(e) => setAddress(e.target.value)}
            error={error}
          />
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <Button full onClick={submit} loading={loading} disabled={!canSubmit}>
            {loading ? t('calculating') : `${t('continue')} →`}
          </Button>
          <Button variant="ghost" full onClick={onBack}>
            {t('back')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
