'use strict';

const { query } = require('../config/db');
const catchAsync = require('../utils/catchAsync');

/**
 * POST /api/expenses
 * Restricted to 'fleet_manager' and 'financial_analyst' at the route
 * level — the two roles responsible for logging/reconciling spend.
 */
const createExpense = catchAsync(async (req, res) => {
  const { vehicle_id, type, amount, expense_date } = req.body;

  const result = await query(
    `INSERT INTO expenses (vehicle_id, type, amount, expense_date)
     VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE))
     RETURNING id, vehicle_id, type, amount, expense_date`,
    [vehicle_id, type, amount, expense_date ?? null]
  );

  res.status(201).json({
    success: true,
    data: result.rows[0],
  });
});

module.exports = { createExpense };
