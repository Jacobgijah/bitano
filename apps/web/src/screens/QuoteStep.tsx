// src/screens/QuoteStep.tsx — show the locked quote, collect phone, trigger collection.
import { useState } from 'react';
import { useT } from '../i18n/LanguageProvider.js';
import { createTransaction, type Quote } from '../api.js';
import { useCountdown } from '../hooks/useCountdown.js';
import { formatSats, formatTzs, isValidPhone, newIdemKey, normalizePhone } from '../lib/format.js';
import { Card } from '../components/AppShell.js';
import { Stepper } from '../components/ui/Stepper.js';
import { Countdown } from '../components/ui/Countdown.js';
import { Field } from '../components/ui/Field.js';
import { Button } from '../components/ui/Button.js';

const QUOTE_WINDOW = 90; // seconds — matches API QUOTE_TTL_SECONDS

interface Props {
  quote: Quote;
  address: string;
  phone: string;
  setPhone: (v: string) => void;
  onPaid: (txId: string) => void;
  onReQuote: () => void;
  onBack: () => void;
}

export function QuoteStep({ quote, address, phone, setPhone, onPaid, onReQuote, onBack }: Props) {
  const t = useT();
  const { secondsLeft, expired } = useCountdown(quote.expires_at);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneOk = isValidPhone(phone);
  const rate = formatTzs(quote.sell_rate_tzs_per_btc);

  async function pay() {
    setError(null);
    setLoading(true);
    try {
      const tx = await createTransaction(quote.quote_id, normalizePhone(phone), newIdemKey());
      onPaid(tx.transaction_id);
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Stepper current={2} />
      <Card>
        {/* Receive summary */}
        <div className="rounded-[var(--radius-field)] bg-bitcoin-soft p-4 text-center">
          <div className="text-xs font-bold uppercase tracking-wide text-bitcoin">{t('you_receive')}</div>
          <div className="tnum mt-1 text-4xl font-extrabold text-ink">{formatSats(quote.sats)}</div>
          <div className="text-sm font-bold text-bitcoin">sats</div>
          <div className="mt-2 break-all text-xs text-ink-soft">
            {t('to_address')} <span className="font-semibold text-ink">{address}</span>
          </div>
        </div>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-soft">TZS</dt>
            <dd className="tnum font-bold text-ink">{formatTzs(quote.amount_tzs)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">{t('rate')}</dt>
            <dd className="tnum text-ink-soft">
              {rate} <span className="text-xs">{t('per_btc')}</span>
            </dd>
          </div>
        </dl>

        <div className="mt-3 flex justify-center">
          {expired ? (
            <span className="text-xs font-bold text-danger">{t('quote_expired')}</span>
          ) : (
            <Countdown secondsLeft={secondsLeft} total={QUOTE_WINDOW} label={t('expires_in')} />
          )}
        </div>

        <div className="mt-4">
          <Field
            label={t('phone_label')}
            name="phone"
            inputMode="numeric"
            placeholder={t('phone_hint')}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={error}
            disabled={expired}
          />
        </div>

        <div className="mt-5 flex flex-col gap-2">
          {expired ? (
            <Button full onClick={onReQuote}>
              {t('get_new_price')}
            </Button>
          ) : (
            <Button full onClick={pay} loading={loading} disabled={!phoneOk || loading}>
              {loading ? t('sending_request') : t('pay_mpesa')}
            </Button>
          )}
          <Button variant="ghost" full onClick={onBack}>
            {t('back')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
