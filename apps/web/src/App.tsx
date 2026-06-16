import { useState } from 'react';
import { createQuote, type Quote } from './api.js';

// First runnable slice: enter amount + address -> call POST /v1/quotes -> show the locked quote.
// The full enter->confirm->waiting->success flow follows the mockup; this proves React->Node->Postgres.
export default function App() {
  const [amount, setAmount] = useState('10000');
  const [address, setAddress] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const amountNum = Number(amount) || 0;

  async function onContinue() {
    setError(null);
    setQuote(null);
    setLoading(true);
    try {
      const q = await createQuote(amountNum, address.trim());
      setQuote(q);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="brand">
        BIT<span className="o">ANO</span>
      </div>
      <div className="slogan">Bitcoin mkononi mwako</div>

      <div className="amount">
        <input
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
          aria-label="Amount in TZS"
        />
        <span className="cur">TZS</span>
      </div>
      <div className="receive">
        {quote ? (
          <>
            Utapokea ≈ <b>{quote.sats.toLocaleString()}</b> sats
          </>
        ) : (
          '\u00a0'
        )}
      </div>

      <label htmlFor="ln">Anwani yako ya Lightning</label>
      <input
        id="ln"
        className="input"
        placeholder="juma@walletofsatoshi.com"
        value={address}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => setAddress(e.target.value)}
      />

      <button
        className="cta"
        onClick={onContinue}
        disabled={loading || amountNum < 500 || address.length < 3}
      >
        {loading ? 'Inahesabu…' : 'Endelea'}
      </button>

      {error && <div className="err">{error}</div>}
      {quote && (
        <div className="ok">
          Quote {quote.quote_id} — locked until {new Date(quote.expires_at).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
