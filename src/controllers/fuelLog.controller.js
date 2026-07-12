'use strict';

const { query } = require('../config/db');
const catchAsync = require('../utils/catchAsync');

/**
 * GET /api/fuel-logs
 * Broadly readable across roles — filterable by vehicle_id and/or a
 * log_date range via query params. No restrictTo() here; only creation
 * is role-restricted (see route file).
 */
const listFuelLogs = catchAsync(async (req, res) => {
  const { vehicle_id, from, to } = req.query;
  const conditions = [];
  const params = [];

  if (vehicle_id) {
    params.push(vehicle_id);
    conditions.push(`vehicle_id = $${params.length}`);
  }
  if (from) {
    params.push(from);
    conditions.push(`log_date >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`log_date <= $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await query(
    `SELECT id, vehicle_id, trip_id, liters, cost, log_date FROM fuel_logs ${where} ORDER BY log_date DESC, id DESC`,
    params
  );

  res.status(200).json({
    success: true,
    data: result.rows,
  });
});

/**
 * POST /api/fuel-logs
 * Restricted to 'fleet_manager' and 'driver' at the route level (a
 * driver logging their own refuel stop is the common real-world case).
 * trip_id is intentionally nullable — see fuelLog.validator.js.
 */
const createFuelLog = catchAsync(async (req, res) => {
  const { vehicle_id, trip_id, liters, cost, log_date } = req.body;

  const result = await query(
    `INSERT INTO fuel_logs (vehicle_id, trip_id, liters, cost, log_date)
     VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE))
     RETURNING id, vehicle_id, trip_id, liters, cost, log_date`,
    [vehicle_id, trip_id ?? null, liters, cost, log_date ?? null]
  );

  res.status(201).json({
    success: true,
    data: result.rows[0],
  });
});

module.exports = { listFuelLogs, createFuelLog };