'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

const signToken = (user) =>
  jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

/**
 * POST /api/auth/register
 * Public route. Hashes the password with bcrypt before storage — the
 * plaintext password never touches the database, matching the
 * `password_hash` column contract documented in the schema.
 */
const register = catchAsync(async (req, res) => {
  const { name, email, password, role } = req.body;

  // Pre-check for a friendlier 409 message; the DB's UNIQUE constraint on
  // users.email is still the ultimate source of truth (race-condition-safe),
  // and errorHandler.js maps a 23505 violation to the same clean message
  // if two requests race past this check simultaneously.
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw ApiError.conflict('An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, created_at`,
    [name, email, passwordHash, role]
  );

  const user = result.rows[0];
  const token = signToken(user);

  res.status(201).json({
    success: true,
    data: { user, token },
  });
});

/**
 * POST /api/auth/login
 * Public route. Deliberately returns the SAME generic message whether
 * the email doesn't exist or the password is wrong — prevents user
 * enumeration via response-message timing/content differences.
 */
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const result = await query(
    'SELECT id, name, email, password_hash, role FROM users WHERE email = $1',
    [email]
  );
  const user = result.rows[0];

  if (!user) {
    throw ApiError.unauthorized('Invalid email or password.');
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw ApiError.unauthorized('Invalid email or password.');
  }

  const token = signToken(user);

  // Never include password_hash in any response payload.
  const { password_hash, ...safeUser } = user;

  res.status(200).json({
    success: true,
    data: { user: safeUser, token },
  });
});

module.exports = { register, login };
