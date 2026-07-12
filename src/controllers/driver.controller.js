'use strict';

const { query } = require('../config/db');
const catchAsync = require('../utils/catchAsync');

// GET /api/drivers — broadly readable, same rationale as vehicles.
const listDrivers = catchAsync(async (req, res) => {
  const result = await query(
    `SELECT id, name, license_number, license_category, license_expiry_date,
            contact_number, safety_score, status
     FROM drivers
     ORDER BY name ASC`
  );

  res.status(200).json({
    success: true,
    data: result.rows,
  });
});

// POST /api/drivers — restricted to 'fleet_manager' at the route level.
const createDriver = catchAsync(async (req, res) => {
  const { name, license_number, license_category, license_expiry_date, contact_number, safety_score } = req.body;

  const result = await query(
    `INSERT INTO drivers (name, license_number, license_category, license_expiry_date, contact_number, safety_score)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, license_number, license_category, license_expiry_date, contact_number, safety_score, status`,
    [name, license_number, license_category, license_expiry_date, contact_number, safety_score]
  );

  res.status(201).json({
    success: true,
    data: result.rows[0],
  });
});

module.exports = { listDrivers, createDriver };
