'use strict';

const { z } = require('zod');

// Mirrors the `user_role` PostgreSQL ENUM exactly — keeping the allowed
// set here in sync with the DB type means an invalid role is rejected
// with a clean 400 at the edge, before it ever reaches a query and
// triggers a raw '22P02 invalid input value for enum' DB error.
const USER_ROLES = ['fleet_manager', 'driver', 'safety_officer', 'financial_analyst'];

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters long.').max(150),
  email: z.string().trim().toLowerCase().email('A valid email address is required.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long.')
    .max(72, 'Password must be at most 72 characters long.'), // bcrypt's hard limit
  role: z.enum(USER_ROLES, {
    errorMap: () => ({ message: `Role must be one of: ${USER_ROLES.join(', ')}` }),
  }),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('A valid email address is required.'),
  password: z.string().min(1, 'Password is required.'),
});

module.exports = { registerSchema, loginSchema, USER_ROLES };
