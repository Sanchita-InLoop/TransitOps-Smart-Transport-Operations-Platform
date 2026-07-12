'use strict';

/**
 * Wraps an async Express handler so any rejected promise (thrown error,
 * failed db query, etc.) is automatically forwarded to next(), which
 * routes it into errorHandler.js.
 *
 * Without this, every controller would need its own try/catch —
 * forgetting even one is how stack traces leak to the client in
 * real-world Express apps. Centralizing it here removes that entire
 * class of mistake.
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = catchAsync;
