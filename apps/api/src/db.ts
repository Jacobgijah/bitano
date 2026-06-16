// src/db.ts — shared Postgres pool.
import pg from 'pg';
import { config } from './config.js';

export const pool = new pg.Pool({ connectionString: config.databaseUrl });

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}

/** A query function bound to a single connection (used inside withTransaction). */
export type BoundQuery = <T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
) => Promise<pg.QueryResult<T>>;

/**
 * Run `fn` inside a single-connection transaction. BEGIN/COMMIT on success,
 * ROLLBACK on throw. The pooled `query` export is NOT connection-safe for
 * multi-statement transactions — always use this when atomicity matters.
 */
export async function withTransaction<T>(fn: (q: BoundQuery) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  const boundQuery: BoundQuery = (text, params) => client.query(text, params);
  try {
    await client.query('BEGIN');
    const result = await fn(boundQuery);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// Helper: short prefixed id, e.g. id('tx') -> "tx_3f9a...".
import { randomUUID } from 'node:crypto';
export function id(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
}
