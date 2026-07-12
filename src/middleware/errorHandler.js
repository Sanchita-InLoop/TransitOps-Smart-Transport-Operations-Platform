'use strict';

const ApiError = require('../utils/ApiError');

/**
 * Maps known PostgreSQL error codes to safe, human-readable messages.
 * Full reference: https://www.postgresql.org/docs/current/errcodes-appendix.html
 *
 * Rationale: the raw driver error (err.detail, err.stack) can contain
 * table/column names, constraint internals, or even fragments of query
 * text — never suitable to send to a frontend. This translation layer
 * is what keeps the DB schema's implementation details private while
 * still giving the client an actionable message.
 */
function mapPostgresError(err) {
  switch (err.code) {
    case '23505': // unique_violation
      return new ApiError(409, 'A record with these details already exists.');
    case '23503': // foreign_key_violation
      return new ApiError(409, 'This action references a record that does not exist or cannot be modified.');
    case '23514': // check_violation
      return new ApiError(400, 'One or more values do not meet the required business rules.');
    case '22P02': // invalid_text_representation (e.g. bad UUID/enum literal)
      return new ApiError(400, 'One or more fields contain an invalid value.');
    case '23502': // not_null_violation
      return new ApiError(400, 'A required field was missing.');
    default:
      return null; // Not a recognized/safe-to-explain DB error.
  }
}

/**
 * Express error-handling middleware (note the 4-arg signature — required
 * by Express to be recognized as an error handler). Mounted LAST in
 * app.js so it catches everything forwarded via next(err), including
 * errors surfaced through catchAsync.
 *
 * Response contract (always, regardless of error source):
 *   { success: false, message: string, fieldErrors: object|null }
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let error = err;

  // Normalize raw pg driver errors into safe ApiErrors first.
  if (!(error instanceof ApiError) && err.code) {
    const mapped = mapPostgresError(err);
    if (mapped) error = mapped;
  }

  // Malformed/expired JWTs surfaced by jsonwebtoken.
  if (err.name === 'JsonWebTokenError') {
    error = ApiError.unauthorized('Invalid authentication token.');
  }
  if (err.name === 'TokenExpiredError') {
    error = ApiError.unauthorized('Your session has expired. Please log in again.');
  }

  const isOperational = error instanceof ApiError;
  const statusCode = isOperational ? error.statusCode : 500;
  const message = isOperational ? error.message : 'An unexpected error occurred. Please try again later.';
  const fieldErrors = isOperational ? error.fieldErrors ?? null : null;

  // Full detail goes to server-side logs only — this is the ONE place
  // raw stack traces are allowed to exist, and they never leave this
  // process boundary.
  if (!isOperational) {
    // eslint-disable-next-line no-console
    console.error('[UNHANDLED ERROR]', err);
  } else if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn('[HANDLED ERROR]', err.message);
  }

  res.status(statusCode).json({
    success: false,
    message,
    fieldErrors,
  });
}

module.exports = errorHandler;
