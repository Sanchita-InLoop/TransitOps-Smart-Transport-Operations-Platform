'use strict';

const { query } = require('../config/db');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

const DRIVER_COLUMNS = `id, name, license_number, license_category, license_expiry_date,
                        contact_number, safety_score, status`;

/**
 * GET /api/drivers
 * Broadly readable across roles — fleet visibility (e.g. a fleet_manager
 * picking a driver for a new trip) benefits everyone; only mutation is
 * role-restricted at the route level.
 */
const listDrivers = catchAsync(async (req, res) => {
  const result = await query(`SELECT ${DRIVER_COLUMNS} FROM drivers ORDER BY name ASC`);

  res.status(200).json({
    success: true,
    data: result.rows,
  });
});

/**
 * GET /api/drivers/:id
 * Single-record lookup. A missing driver is a 404, not a 200 with null
 * data — keeping "not found" unambiguous for API consumers.
 */
const getDriverById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await query(`SELECT ${DRIVER_COLUMNS} FROM drivers WHERE id = $1`, [id]);
  const driver = result.rows[0];

  if (!driver) {
    throw ApiError.notFound('Driver not found.');
  }

  res.status(200).json({
    success: true,
    data: driver,
  });
});

/**
 * POST /api/drivers
 * Restricted to 'fleet_manager' at the route level. Body already
 * validated & type-coerced by createDriverSchema before this runs.
 * A duplicate license_number is pre-checked here for a clean 409
 * message; the DB's UNIQUE constraint (uq_drivers_license_number)
 * remains the authoritative, race-condition-safe guard — errorHandler.js
 * maps a raw 23505 to the same message if two requests race past this
 * check at the same instant.
 */
const createDriver = catchAsync(async (req, res) => {
  const { name, license_number, license_category, license_expiry_date, contact_number, safety_score } = req.body;

  const existing = await query('SELECT id FROM drivers WHERE license_number = $1', [license_number]);
  if (existing.rows.length > 0) {
    throw ApiError.conflict('A driver with this license number already exists.');
  }

  const result = await query(
    `INSERT INTO drivers (name, license_number, license_category, license_expiry_date, contact_number, safety_score)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${DRIVER_COLUMNS}`,
    [name, license_number, license_category, license_expiry_date, contact_number, safety_score]
  );

  res.status(201).json({
    success: true,
    data: result.rows[0],
  });
});

/**
 * PATCH /api/drivers/:id
 * Restricted to 'fleet_manager' at the route level. Uses a dynamically
 * built SET clause so only the fields actually present in the (already
 * Zod-validated, partial) body are updated — an omitted field is left
 * untouched rather than overwritten with NULL/undefined.
 *
 * Deliberately does NOT allow `status` to be set through this endpoint:
 * driver status is a system-managed field driven by trip lifecycle
 * transitions (dispatch/complete/cancel) and must never be hand-edited
 * out of band, or it could desync from the vehicle/trip it's tied to.
 */
const updateDriver = catchAsync(async (req, res) => {
  const { id } = req.params;
  const updates = req.body; // already validated + non-empty by updateDriverSchema

  const allowedFields = [
    'name',
    'license_number',
    'license_category',
    'license_expiry_date',
    'contact_number',
    'safety_score',
  ];
  const fieldsToUpdate = Object.keys(updates).filter((key) => allowedFields.includes(key));

  if (fieldsToUpdate.length === 0) {
    throw ApiError.badRequest('No updatable fields were provided.');
  }

  // Duplicate-license pre-check, scoped to exclude the driver's own row,
  // mirroring the same pre-check pattern used in createDriver.
  if (updates.license_number) {
    const existing = await query(
      'SELECT id FROM drivers WHERE license_number = $1 AND id != $2',
      [updates.license_number, id]
    );
    if (existing.rows.length > 0) {
      throw ApiError.conflict('Another driver already uses this license number.');
    }
  }

  const setClause = fieldsToUpdate.map((field, idx) => `${field} = $${idx + 1}`).join(', ');
  const values = fieldsToUpdate.map((field) => updates[field]);

  const result = await query(
    `UPDATE drivers SET ${setClause} WHERE id = $${fieldsToUpdate.length + 1}
     RETURNING ${DRIVER_COLUMNS}`,
    [...values, id]
  );

  if (result.rows.length === 0) {
    throw ApiError.notFound('Driver not found.');
  }

  res.status(200).json({
    success: true,
    data: result.rows[0],
  });
});

module.exports = { listDrivers, getDriverById, createDriver, updateDriver };
