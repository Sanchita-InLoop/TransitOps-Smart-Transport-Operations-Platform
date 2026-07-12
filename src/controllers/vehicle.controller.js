'use strict';

const { query } = require('../config/db');
const catchAsync = require('../utils/catchAsync');

/**
 * GET /api/vehicles
 * Available to any authenticated role — fleet visibility is broadly
 * useful (a driver checking an assigned vehicle, a financial_analyst
 * cross-referencing costs, etc.), so read access is not role-restricted
 * at the route level; only mutating actions are.
 */
const listVehicles = catchAsync(async (req, res) => {
  const result = await query(
    `SELECT id, registration_number, model_name, type, max_load_capacity,
            odometer, acquisition_cost, status, created_at
     FROM vehicles
     ORDER BY created_at DESC`
  );

  res.status(200).json({
    success: true,
    data: result.rows,
  });
});

/**
 * POST /api/vehicles
 * Restricted to 'fleet_manager' at the route level (see vehicle.routes.js).
 * Body already validated & type-coerced by the createVehicleSchema
 * middleware before this handler runs.
 */
const createVehicle = catchAsync(async (req, res) => {
  const { registration_number, model_name, type, max_load_capacity, odometer, acquisition_cost } = req.body;

  const result = await query(
    `INSERT INTO vehicles (registration_number, model_name, type, max_load_capacity, odometer, acquisition_cost)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, registration_number, model_name, type, max_load_capacity, odometer, acquisition_cost, status, created_at`,
    [registration_number, model_name, type, max_load_capacity, odometer, acquisition_cost]
  );

  res.status(201).json({
    success: true,
    data: result.rows[0],
  });
});

module.exports = { listVehicles, createVehicle };
