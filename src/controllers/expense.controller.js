'use strict';

const { query } = require('../config/db');
const catchAsync = require('../utils/catchAsync');

/**
 * GET /api/expenses
 * Broadly readable across roles — filterable by vehicle_id and/or type.
 * No restrictTo() here; only creation is role-restricted (see route file).
 */
const listExpenses = catchAsync(async (req, res) => {
  const { vehicle_id, type } = req.query;
  const conditions = [];
  const params = [];

  if (vehicle_id) {
    params.push(vehicle_id);
    conditions.push(`vehicle_id = $${params.length}`);
  }
  if (type) {
    params.push(type);
    conditions.push(`type = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await query(
    `SELECT id, vehicle_id, type, amount, expense_date FROM expenses ${where} ORDER BY expense_date DESC, id DESC`,
    params
  );

  res.status(200).json({
    success: true,
    data: result.rows,
  });
});

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

module.exports = { listExpenses, createExpense };