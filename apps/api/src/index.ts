// src/index.ts — Bitano API entrypoint.
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import quotes from './routes/quotes.js';
import transactions from './routes/transactions.js';
import webhooks from './routes/webhooks.js';

const app = express();
app.use(cors());
// Capture the raw body so webhook signatures can be verified over the exact bytes received.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
    },
  }),
);

app.get('/health', (_req, res) => res.json({ ok: true, service: 'bitano-api' }));

app.use('/v1/quotes', quotes);
app.use('/v1/transactions', transactions);
app.use('/v1/webhooks', webhooks);

// Central error handler — never leak internals to the client.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: { code: 'internal_error', message: 'Something went wrong.' } });
});

app.listen(config.port, () => {
  console.log(`bitano-api listening on http://localhost:${config.port}`);
});
