const ApiError = require('../utils/ApiError');

// Usage: router.get('/vehicles', authMiddleware, rbac('fleet_manager', 'safety_officer'), handler)
module.exports = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized('Not authenticated'));
  if (!allowedRoles.includes(req.user.role)) {
    return next(ApiError.forbidden('You do not have permission to perform this action'));
  }
  next();
};