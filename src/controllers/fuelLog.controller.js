'use strict';

const { query } = require('../config/db');
const catchAsync = require('../utils/catchAsync');

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

module.exports = { createFuelLog };
