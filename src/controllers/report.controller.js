'use strict';

const { query } = require('../config/db');
const catchAsync = require('../utils/catchAsync');

/**
 * GET /api/reports/analytics
 * Restricted to 'financial_analyst' and 'safety_officer' (route level) —
 * aggregated cross-fleet figures, not raw per-row data.
 *
 * Stubbed as a single illustrative aggregate query per cost category;
 * a real implementation would likely accept query-string filters
 * (date range, vehicle_id, etc.) validated by their own Zod schema.
 */
const getAnalytics = catchAsync(async (req, res) => {
  const [tripStats, fuelStats, maintenanceStats, expenseStats] = await Promise.all([
    query(`SELECT status, COUNT(*)::int AS count FROM trips GROUP BY status`),
    query(`SELECT COALESCE(SUM(liters), 0)::float AS total_liters, COALESCE(SUM(cost), 0)::float AS total_cost FROM fuel_logs`),
    query(`SELECT status, COUNT(*)::int AS count, COALESCE(SUM(cost), 0)::float AS total_cost FROM maintenance_logs GROUP BY status`),
    query(`SELECT COALESCE(SUM(amount), 0)::float AS total_amount FROM expenses`),
  ]);

  res.status(200).json({
    success: true,
    data: {
      trips_by_status: tripStats.rows,
      fuel: fuelStats.rows[0],
      maintenance_by_status: maintenanceStats.rows,
      expenses: expenseStats.rows[0],
    },
  });
});

/**
 * GET /api/reports/export
 * Restricted to 'financial_analyst' (route level).
 * Stub: in production this would stream a CSV/PDF (see the file-
 * generation conventions used elsewhere in this stack) rather than
 * building a large payload in memory. Left as a clear extension point.
 */
const exportReport = catchAsync(async (req, res) => {
  // TODO: implement CSV/PDF generation and streaming response.
  res.status(200).json({
    success: true,
    data: {
      message: 'Export generation not yet implemented — stub endpoint.',
    },
  });
});

module.exports = { getAnalytics, exportReport };
