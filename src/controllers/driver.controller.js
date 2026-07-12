'use strict';

const { query } = require('../config/db');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

/**
 * FIXES APPLIED (converted from driver_controller.mjs):
 * 1. ESM (`import`/`export`) -> CommonJS (`require`/`module.exports`) —
 *    the rest of the app is CommonJS; mixing module systems without a
 *    "type": "module" change in package.json (which would break every
 *    other require() in the project) simply cannot run.
 * 2. Manual try/catch + res.status(500).json({ error: ... }) -> catchAsync
 *    + ApiError, matching the rest of the app's single error-handling
 *    path. Previously, a DB failure here would return { error: "..." }
 *    while every other route in the app returns
 *    { success: false, message: "...", fieldErrors }. Two different
 *    error shapes from the same API is exactly what the central
 *    errorHandler was built to prevent.
 * 3. res.json(result.rows) -> res.json({ success: true, data: ... }) —
 *    same reasoning; this file's responses weren't wrapped in the
 *    standard envelope the rest of the API uses.
 * 4. Added getDriverById + updateDriver (only name/license/category/
 *    expiry/contact/safety_score — NOT status, see below) since
 *    driver.routes.js below expects them and they existed in intent
 *    per the earlier "CRUD" work but weren't present here.
 * 5. `updateDriverStatus` -> kept, but now BLOCKS setting status to
 *    'on_trip' directly. Only the dispatch transaction (trip.controller.js)
 *    is allowed to move a driver into 'on_trip', because that's the one
 *    place cargo/capacity/license/suspension checks actually run. Letting
 *    a client PATCH status='on_trip' directly would let someone fake an
 *    active assignment with none of those checks applied.
 */

const DRIVER_COLUMNS = `id, name, license_number, license_category, license_expiry_date,
                        contact_number, safety_score, status`;

// GET /api/drivers
const listDrivers = catchAsync(async (req, res) => {
  const result = await query(`SELECT ${DRIVER_COLUMNS} FROM drivers ORDER BY name ASC`);
  res.status(200).json({ success: true, data: result.rows });
});

// GET /api/drivers/:id
const getDriverById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await query(`SELECT ${DRIVER_COLUMNS} FROM drivers WHERE id = $1`, [id]);

  if (!result.rows[0]) {
    throw ApiError.notFound('Driver profile not found.');
  }

  res.status(200).json({ success: true, data: result.rows[0] });
});

// POST /api/drivers
const createDriver = catchAsync(async (req, res) => {
  const { name, license_number, license_category, license_expiry_date, contact_number, safety_score } = req.body;

  const result = await query(
    `INSERT INTO drivers (name, license_number, license_category, license_expiry_date, contact_number, safety_score)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, 100))
     RETURNING ${DRIVER_COLUMNS}`,
    [name, license_number, license_category, license_expiry_date, contact_number, safety_score]
  );

  res.status(201).json({ success: true, data: result.rows[0] });
  // Note: duplicate license_number is caught by errorHandler.js's 23505
  // mapping ("A record with these details already exists.") — no need
  // to special-case it here, since the DB's UNIQUE constraint is the
  // single source of truth and is race-condition-safe.
});

// PATCH /api/drivers/:id — profile fields only, never `status`.
const updateDriver = catchAsync(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const allowedFields = [
    'name', 'license_number', 'license_category',
    'license_expiry_date', 'contact_number', 'safety_score',
  ];
  const fields = Object.keys(updates).filter((k) => allowedFields.includes(k));

  if (fields.length === 0) {
    throw ApiError.badRequest('No updatable fields were provided.');
  }

  const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
  const values = fields.map((f) => updates[f]);

  const result = await query(
    `UPDATE drivers SET ${setClause} WHERE id = $${fields.length + 1} RETURNING ${DRIVER_COLUMNS}`,
    [...values, id]
  );

  if (!result.rows[0]) {
    throw ApiError.notFound('Driver profile not found.');
  }

  res.status(200).json({ success: true, data: result.rows[0] });
});

// PATCH /api/drivers/:id/status — manual status changes only, never 'on_trip'.
const updateDriverStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const manuallySettableStatuses = ['available', 'off_duty', 'suspended'];
  if (!manuallySettableStatuses.includes(status)) {
    throw ApiError.badRequest(
      `Status must be manually set to one of: ${manuallySettableStatuses.join(', ')}. ` +
      `'on_trip' can only be set by dispatching a trip.`
    );
  }

  const result = await query(
    'UPDATE drivers SET status = $1 WHERE id = $2 RETURNING ' + DRIVER_COLUMNS,
    [status, id]
  );

  if (!result.rows[0]) {
    throw ApiError.notFound('Driver profile not found.');
  }

  res.status(200).json({ success: true, data: result.rows[0] });
});

module.exports = { listDrivers, getDriverById, createDriver, updateDriver, updateDriverStatus };