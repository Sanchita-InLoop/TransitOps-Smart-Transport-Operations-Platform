'use strict';

const { z } = require('zod');

const createExpenseSchema = z.object({
  vehicle_id: z.coerce.number().int().positive('A valid vehicle_id is required.'),
  type: z.string().trim().min(1, 'Expense type is required.').max(50),
  amount: z.coerce.number().nonnegative('Amount cannot be negative.'),
  expense_date: z.coerce.date().optional(),
});

/**
 * Query-string filters for GET /api/expenses. All optional — an empty
 * query returns every expense.
 */
const listExpensesQuerySchema = z.object({
  vehicle_id: z.coerce.number().int().positive().optional(),
  type: z.string().trim().min(1).max(50).optional(),
});

module.exports = { createExpenseSchema, listExpensesQuerySchema };