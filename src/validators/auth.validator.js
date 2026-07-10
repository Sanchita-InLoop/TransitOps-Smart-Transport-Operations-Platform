const { body } = require('express-validator');

const VALID_ROLES = ['fleet_manager', 'driver', 'safety_officer', 'financial_analyst'];

exports.registerValidator = [
  body('name').trim().notEmpty().withMessage('Name is required')
    .isLength({ max: 150 }).withMessage('Name must be under 150 characters'),
  body('email').trim().notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format').normalizeEmail(),
  body('password').isString().isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('role').notEmpty().withMessage('Role is required')
    .isIn(VALID_ROLES).withMessage(`Role must be one of: ${VALID_ROLES.join(', ')}`),
];

exports.loginValidator = [
  body('email').trim().notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format'),
  body('password').notEmpty().withMessage('Password is required'),
];