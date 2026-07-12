'use strict';

const { query } = require('../config/db');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');

/**
 * FIX APPLIED: renamed create/getAll/getById/update/delete to
 * createVehicle/listVehicles/getVehicleById/updateVehicle/deleteVehicle.
 *
 * The original names didn't match what vehicle.routes.js imports
 * (`{ listVehicles, createVehicle }`), so `router.get('/', listVehicles)`
 * received `undefined` as its handler — Express throws
 * "Route.get() requires a callback function but got a [object Undefined]"
 * at boot, which is why something was console.log-ing the controller's
 * actual export keys to debug it.
 */

const createVehicle = catchAsync(async (req, res) => {
  const {
    registration_number, model_name, type,
    max_load_capacity, odometer, acquisition_cost
  } = req.body;

  const result = await query(
    `INSERT INTO vehicles 
      (registration_number, model_name, type, max_load_capacity, odometer, acquisition_cost) 
     VALUES ($1, $2, $3, $4, COALESCE($5, 0), $6) 
     RETURNING *`,
    [registration_number, model_name, type, max_load_capacity, odometer, acquisition_cost]
  );

  res.status(201).json({ success: true, data: result.rows[0] });
});

const listVehicles = catchAsync(async (req, res) => {
  const { status, type } = req.query;
  let sql = 'SELECT * FROM vehicles WHERE 1=1';
  const params = [];

  if (status) {
    params.push(status);
    sql += ` AND status = $${params.length}`;
  }
  if (type) {
    params.push(type);
    sql += ` AND type = $${params.length}`;
  }

  sql += ' ORDER BY created_at DESC';

  const result = await query(sql, params);
  res.status(200).json({ success: true, data: result.rows });
});

const getVehicleById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await query('SELECT * FROM vehicles WHERE id = $1', [id]);

  if (result.rows.length === 0) {
    throw ApiError.notFound('Vehicle not found');
  }

  res.status(200).json({ success: true, data: result.rows[0] });
});

const updateVehicle = catchAsync(async (req, res) => {
  const { id } = req.params;
  const {
    registration_number, model_name, type,
    max_load_capacity, odometer, acquisition_cost
  } = req.body;

  const result = await query(
    `UPDATE vehicles 
     SET registration_number = COALESCE($1, registration_number),
         model_name = COALESCE($2, model_name),
         type = COALESCE($3, type),
         max_load_capacity = COALESCE($4, max_load_capacity),
         odometer = COALESCE($5, odometer),
         acquisition_cost = COALESCE($6, acquisition_cost)
     WHERE id = $7 
     RETURNING *`,
    [registration_number, model_name, type, max_load_capacity, odometer, acquisition_cost, id]
  );

  if (result.rows.length === 0) {
    throw ApiError.notFound('Vehicle not found');
  }

  res.status(200).json({ success: true, data: result.rows[0] });
});

const deleteVehicle = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await query('DELETE FROM vehicles WHERE id = $1 RETURNING *', [id]);

  if (result.rows.length === 0) {
    throw ApiError.notFound('Vehicle not found');
  }

  res.status(200).json({ success: true, data: result.rows[0] });
});

module.exports = {
  createVehicle,
  listVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
};