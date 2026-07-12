'use strict';

class ApiError extends Error {
  constructor(statusCode, message, fieldErrors = null) {
    super(message);
    this.statusCode = statusCode;
    this.fieldErrors = fieldErrors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', fieldErrors = null) {
    return new ApiError(400, message, fieldErrors);
  }
  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }
  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }
  static notFound(message = 'Not found') {
    return new ApiError(404, message);
  }
  static conflict(message = 'Conflict', fieldErrors = null) {
    return new ApiError(409, message, fieldErrors);
  }
  static internal(message = 'Internal server error') {
    return new ApiError(500, message);



    
  }
}

module.exports = ApiError;