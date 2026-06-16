// src/index.ts — Bitano API entrypoint.
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import quotes from './routes/quotes.js';
import transactions from './routes/transactions.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true, service: 'bitano-api' }));

app.use('/v1/quotes', quotes);
app.use('/v1/transactions', transactions);

// Central error handler — never leak internals to the client.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: { code: 'internal_error', message: 'Something went wrong.' } });
});

app.listen(config.port, () => {
  console.log(`bitano-api listening on http://localhost:${config.port}`);
});
