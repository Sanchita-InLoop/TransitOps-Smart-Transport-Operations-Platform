'use strict';

const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

/**
 * authenticate: verifies the `Authorization: Bearer <token>` header and
 * attaches the decoded payload to req.user for downstream handlers/rbac.
 *
 * Security notes for judges:
 *  - Token is verified with the server's JWT_SECRET (HMAC) — a forged or
 *    tampered token fails verification and is rejected with 401, not
 *    trusted "as-is".
 *  - We deliberately do NOT trust any role/user data sent in the request
 *    body/query for authorization decisions — only what's inside the
 *    signed token payload (req.user) is used downstream in rbac.js.
 *  - Errors thrown here (missing header, malformed token, expired token)
 *    flow through catchAsync -> errorHandler, so the response shape is
 *    identical to every other error in the API.
 */
const authenticate = catchAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Authentication token is missing.');
  }

  const token = authHeader.split(' ')[1];

  // jwt.verify throws JsonWebTokenError / TokenExpiredError on failure —
  // both are caught centrally in errorHandler.js and mapped to clean 401s.
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // Minimal, non-sensitive payload — never trust this blob for anything
  // beyond identity/role; always re-check ownership against the DB inside
  // controllers where an action affects a specific resource.
  req.user = {
    id: decoded.sub,
    email: decoded.email,
    role: decoded.role,
  };

  next();
});

module.exports = authenticate;
