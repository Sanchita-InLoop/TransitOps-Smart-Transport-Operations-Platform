'use strict';

/**
 * ApiError represents a known, "operational" failure (bad input, not
 * found, unauthorized, conflict, etc.) as opposed to an unexpected
 * programming/DB-driver error.
 *
 * Controllers/middleware throw this directly; errorHandler.js knows how
 * to translate it into the standard { success, message, fieldErrors }
 * envelope without exposing internals.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status to send.
   * @param {string} message - Human-readable, safe-to-display message.
   * @param {object|null} fieldErrors - Optional map of { field: "reason" }
   *   for validation-style responses, e.g. { email: "Email is required" }.
   * @param {boolean} isOperational - true for expected/handled failures;
   *   false is reserved for errorHandler's own wrapping of unknown errors.
   */
  constructor(statusCode, message, fieldErrors = null, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.fieldErrors = fieldErrors;
    this.isOperational = isOperational;

    // Preserves a clean stack trace pointing at the throw site rather
    // than at this constructor — useful for server-side logs only,
    // never sent to the client.
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, fieldErrors = null) {
    return new ApiError(400, message, fieldErrors);
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'You do not have permission to perform this action') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Resource conflict') {
    return new ApiError(409, message);
  }
}

module.exports = ApiError;
