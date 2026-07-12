'use strict';

const ApiError = require('../utils/ApiError');

/**
 * restrictTo(...roles): route-level authorization guard.
 *
 * Usage: router.post('/', authenticate, restrictTo('fleet_manager'), controller)
 *
 * Design notes:
 *  - Must run AFTER `authenticate` — it relies on req.user.role having
 *    already been populated from a verified JWT, never from client input.
 *  - Implemented as a factory (function returning a middleware) so each
 *    route can declare its own allowed-role set inline and declaratively,
 *    keeping authorization rules visible directly in the route file
 *    rather than buried in controller logic.
 *  - Fails closed: if req.user is somehow missing (auth misconfigured on
 *    a route), access is denied rather than silently allowed.
 */
const restrictTo = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !req.user.role) {
    return next(ApiError.unauthorized());
  }

  if (!allowedRoles.includes(req.user.role)) {
    return next(
      ApiError.forbidden(
        `This action requires one of the following roles: ${allowedRoles.join(', ')}.`
      )
    );
  }

  next();
};

module.exports = restrictTo;
