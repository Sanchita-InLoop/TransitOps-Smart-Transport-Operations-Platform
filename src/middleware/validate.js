'use strict';

const ApiError = require('../utils/ApiError');

/**
 * Factory: validate(schema) returns middleware that parses req.body
 * against a Zod schema. Matches the shared convention used across every
 * resource route (see vehicle.routes.js: validate(createVehicleSchema)).
 */
module.exports = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const fieldErrors = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return next(ApiError.badRequest('Validation failed', fieldErrors));
  }

  req.body = result.data;
  next();
};