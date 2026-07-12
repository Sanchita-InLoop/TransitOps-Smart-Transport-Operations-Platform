'use strict';

require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 4000;

// Catch truly unexpected failures outside the request/response cycle
// (e.g. a bug in an unawaited promise) so the process logs clearly
// instead of dying silently or in an inconsistent state.
process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('UNCAUGHT EXCEPTION — shutting down.', err);
  process.exit(1);
});

const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`TransitOps API listening on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

process.on('unhandledRejection', (err) => {
  // eslint-disable-next-line no-console
  console.error('UNHANDLED REJECTION — shutting down.', err);
  server.close(() => process.exit(1));
});
