'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const apiRouter = require('./routes/index.js');
const errorHandler = require('./middleware/errorHandler.js');
const ApiError = require('./utils/ApiError.js');

const app = express();

// --- Security middleware, applied globally, before any route logic ---
app.use(helmet()); // sensible secure HTTP headers (CSP, X-Frame-Options, etc.)
app.use(cors()); // configure allowed origins explicitly in production
app.use(express.json({ limit: '10kb' })); // small limit — mitigates body-based DoS
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// --- All business routes live under /api ---
app.use('/api', apiRouter);

// --- Health check (useful for load balancers / hackathon demo uptime) ---
app.get('/health', (req, res) => res.status(200).json({ success: true, data: { status: 'ok' } }));

// --- Unmatched routes -> clean 404 through the same error envelope ---
app.use((req, res, next) => {
  next(ApiError.notFound(`Cannot find ${req.method} ${req.originalUrl} on this server.`));
});

// --- Central error handler MUST be registered last ---
app.use(errorHandler);

module.exports = app;