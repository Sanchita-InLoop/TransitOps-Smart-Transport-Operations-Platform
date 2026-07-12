'use strict';

const ApiError = require('../utils/ApiError');

/**
 * validate(schema, source): builds an Express middleware that parses
 * req[source] ('body' | 'query' | 'params') against a Zod schema.
 *
 * On failure, produces a 400 with a fieldErrors map shaped like:
 *   { email: "Invalid email address", cargo_weight: "Expected number, received string" }
 * matching the API-wide error envelope { success:false, message, fieldErrors }.
 *
 * On success, req[source] is REPLACED with the parsed/coerced data —
 * controllers can trust types (e.g. numeric strings become numbers)
 * without re-validating.
 *
 * Centralizing validation here (rather than scattering ad-hoc `if
 * (!req.body.x)` checks across controllers) is what gives this API
 * consistent, guaranteed-shape 400 responses for every single route.
 */
const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    const fieldErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      // First message per field is sufficient for a clean UI hint;
      // avoids overwhelming the client with every possible Zod issue.
      if (!fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return next(ApiError.badRequest('Validation failed. Please check the highlighted fields.', fieldErrors));
  }

  req[source] = result.data;
  next();
};

module.exports = validate;
