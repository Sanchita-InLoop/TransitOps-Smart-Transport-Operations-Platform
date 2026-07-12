'use strict';

require('dotenv').config();
const app = require('./app.js');

const PORT = process.env.PORT || 4000;

// Catch truly unexpected failures outside the request/response cycle
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION — shutting down.', err);
  process.exit(1);
});

const server = app.listen(PORT, () => {
  console.log(`TransitOps API listening on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION — shutting down.', err);
  server.close(() => process.exit(1));
});