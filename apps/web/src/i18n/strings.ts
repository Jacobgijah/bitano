// src/i18n/strings.ts — Swahili-first copy with an English fallback.
// Keys are referenced via useT() from LanguageProvider.

export type Lang = 'sw' | 'en';

export const STRINGS = {
  // brand / shell
  slogan: { sw: 'Bitcoin mkononi mwako', en: 'Bitcoin in your hand' },
  trust_noncustodial: { sw: 'Si ya kuhifadhiwa', en: 'Non-custodial' },
  trust_nokyc: { sw: 'Bila usajili', en: 'No sign-up' },
  trust_yourwallet: { sw: 'Sats kwenye pochi yako', en: 'Sats to your wallet' },

  // landing
  landing_title: { sw: 'Nunua Bitcoin\nkwa sekunde', en: 'Buy Bitcoin\nin seconds' },
  landing_sub: {
    sw: 'Lipa kwa M-Pesa, pokea sats moja kwa moja kwenye pochi yako ya Lightning. Hakuna akaunti, hakuna kuhifadhi.',
    en: 'Pay with M-Pesa, receive sats straight to your own Lightning wallet. No account, no custody.',
  },
  landing_cta: { sw: 'Anza', en: 'Get started' },
  feat_fast_t: { sw: 'Haraka', en: 'Fast' },
  feat_fast_d: { sw: 'Sats hufika kwa sekunde baada ya kulipa.', en: 'Sats arrive seconds after you pay.' },
  feat_safe_t: { sw: 'Salama', en: 'Safe' },
  feat_safe_d: { sw: 'Pesa zako huenda moja kwa moja kwa pochi yako.', en: 'Funds go straight to your own wallet.' },
  feat_simple_t: { sw: 'Rahisi', en: 'Simple' },
  feat_simple_d: { sw: 'Kama M-Pesa — weka kiasi, lipa, umemaliza.', en: 'Just like M-Pesa — enter, pay, done.' },

  // amount step
  step_amount: { sw: 'Kiasi', en: 'Amount' },
  amount_label: { sw: 'Unataka kununua kiasi gani?', en: 'How much do you want to buy?' },
  network_label: { sw: 'Lipa kwa', en: 'Pay with' },
  network_soon: { sw: 'Inakuja', en: 'Soon' },
  ln_label: { sw: 'Anwani yako ya Lightning', en: 'Your Lightning address' },
  ln_hint: { sw: 'Pochi: Phoenix, Blink, Wallet of Satoshi…', en: 'Wallets: Phoenix, Blink, Wallet of Satoshi…' },
  continue: { sw: 'Endelea', en: 'Continue' },
  calculating: { sw: 'Inahesabu…', en: 'Calculating…' },
  amount_min: { sw: 'Kiasi cha chini ni TZS 500.', en: 'Minimum is TZS 500.' },
  amount_max: { sw: 'Kiasi cha juu ni TZS 5,000,000.', en: 'Maximum is TZS 5,000,000.' },

  // quote step
  step_quote: { sw: 'Bei', en: 'Quote' },
  you_receive: { sw: 'Utapokea', en: "You'll receive" },
  rate: { sw: 'Bei', en: 'Rate' },
  per_btc: { sw: 'kwa BTC', en: 'per BTC' },
  expires_in: { sw: 'Bei imefungwa kwa', en: 'Price locked for' },
  quote_expired: { sw: 'Bei imeisha muda.', en: 'Price expired.' },
  get_new_price: { sw: 'Pata bei mpya', en: 'Get a new price' },
  phone_label: { sw: 'Namba ya M-Pesa', en: 'M-Pesa number' },
  phone_hint: { sw: 'mfano 0744 000 000', en: 'e.g. 0744 000 000' },
  phone_invalid: { sw: 'Weka namba sahihi ya simu.', en: 'Enter a valid phone number.' },
  pay_mpesa: { sw: 'Lipa na M-Pesa', en: 'Pay with M-Pesa' },
  sending_request: { sw: 'Inatuma…', en: 'Sending…' },

  // pay / status step
  step_pay: { sw: 'Lipa', en: 'Pay' },
  awaiting_title: { sw: 'Angalia simu yako', en: 'Check your phone' },
  awaiting_desc: { sw: 'Weka PIN ya M-Pesa kukamilisha malipo.', en: 'Enter your M-Pesa PIN to confirm payment.' },
  delivering_title: { sw: 'Inatuma sats…', en: 'Delivering sats…' },
  delivering_desc: { sw: 'Malipo yamethibitishwa. Tunatuma Bitcoin kwenye pochi yako.', en: 'Payment confirmed. Sending Bitcoin to your wallet.' },

  // results
  success_title: { sw: 'Umefanikiwa!', en: 'Success!' },
  success_desc: { sw: 'Umepokea sats kwenye pochi yako.', en: 'Sats delivered to your wallet.' },
  to_address: { sw: 'Kwenda', en: 'To' },
  start_over: { sw: 'Anza upya', en: 'Start over' },
  failed_title: { sw: 'Malipo hayakukamilika', en: 'Payment failed' },
  failed_desc: { sw: 'Hakuna pesa iliyokatwa. Jaribu tena.', en: 'No money was taken. Please try again.' },
  timeout_title: { sw: 'Muda umeisha', en: 'Timed out' },
  timeout_desc: { sw: 'Hatukupokea malipo kwa wakati. Jaribu tena.', en: "We didn't receive payment in time. Try again." },
  try_again: { sw: 'Jaribu tena', en: 'Try again' },
  refund_title: { sw: 'Tunakurejeshea pesa', en: 'Refunding you' },
  refund_desc: { sw: 'Sats hazikufika, kwa hivyo tunarejesha TZS yako kwa M-Pesa.', en: "Sats couldn't be delivered, so we're returning your TZS via M-Pesa." },
  refunded_title: { sw: 'Pesa imerejeshwa', en: 'Refunded' },
  refunded_desc: { sw: 'TZS yako imerudishwa kwenye M-Pesa.', en: 'Your TZS has been returned to M-Pesa.' },
  refund_failed_title: { sw: 'Tunahitaji kukusaidia', en: 'We need to help you' },
  refund_failed_desc: { sw: 'Tafadhali wasiliana na huduma kwa wateja kuhusu malipo haya.', en: 'Please contact support about this payment.' },

  // generic
  back: { sw: 'Rudi', en: 'Back' },
  something_wrong: { sw: 'Hitilafu imetokea. Jaribu tena.', en: 'Something went wrong. Please try again.' },
} as const;

export type StringKey = keyof typeof STRINGS;
