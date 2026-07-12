const { z } = require('zod');

const VALID_ROLES = ['fleet_manager', 'driver', 'safety_officer', 'financial_analyst'];

const registerSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Name is required')
    .max(150, 'Name must be under 150 characters'),
  email: z.string()
    .trim()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .toLowerCase(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters'),
  role: z.enum(VALID_ROLES, {
    errorMap: () => ({ message: `Role must be one of: ${VALID_ROLES.join(', ')}` }),
  }),
});

const loginSchema = z.object({
  email: z.string()
    .trim()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  password: z.string()
    .min(1, 'Password is required'),
});

module.exports = { registerSchema, loginSchema };