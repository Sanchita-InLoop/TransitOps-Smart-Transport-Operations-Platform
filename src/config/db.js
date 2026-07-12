'use strict';

const { Pool } = require('pg');

/**
 * A single shared connection pool for the whole process.
 *
 * Why 'pg' Pool over Prisma here:
 *  - The schema was hand-authored with explicit CHECK/ENUM/RESTRICT
 *    constraints (see transitops_schema.sql). Raw SQL keeps full,
 *    transparent control over exactly which query hits the DB — important
 *    when the DB layer, not the ORM, is the primary source of truth for
 *    integrity in this design.
 *  - Pool re-uses TCP connections instead of opening one per request,
 *    which matters under hackathon-demo load spikes as well as real
 *    production traffic.
 *
 * query() and getClient() are exported separately:
 *  - query(): for simple, single-statement operations (auto-managed
 *    connection acquire/release).
 *  - getClient(): for multi-statement DB transactions (e.g. trip dispatch,
 *    which must atomically update trips/vehicles/drivers together) —
 *    the caller is responsible for BEGIN/COMMIT/ROLLBACK and releasing.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  // Unexpected errors on idle clients (e.g. connection dropped by DB) —
  // log and let the process supervisor (pm2/k8s) decide on restarts,
  // rather than crashing silently or leaking the raw error to a request.
  // eslint-disable-next-line no-console
  console.error('Unexpected error on idle PostgreSQL client', err);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};
