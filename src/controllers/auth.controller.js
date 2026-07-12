const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db'); // adjust import if your db.js exports differently
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

const SALT_ROUNDS = 10;

const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });

exports.register = catchAsync(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  // Fast path for the common case — a clean 409 without hitting the DB twice.
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    return next(ApiError.conflict('An account with this email already exists'));
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  // No try/catch needed here for duplicate-email races — errorHandler.js
  // already maps Postgres 23505 (unique_violation) to a safe 409.
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, created_at`,
    [name, email, password_hash, role]
  );

  const user = result.rows[0];
  const token = signToken(user);
  res.status(201).json({ success: true, data: { token, user } });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const result = await pool.query(
    'SELECT id, name, email, password_hash, role FROM users WHERE email = $1',
    [email]
  );
  const user = result.rows[0];

  // Same generic message for "no such user" and "wrong password" —
  // avoids leaking which emails are registered.
  if (!user) return next(new ApiError.unauthorized( 'Invalid email or password'));

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) return next(new ApiError.unauthorized( 'Invalid email or password'));

  const token = signToken(user);
  delete user.password_hash;
  res.status(200).json({ success: true, data: { token, user } });
});