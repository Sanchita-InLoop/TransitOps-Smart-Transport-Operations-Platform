'use strict';

const { query } = require('../config/db');
const catchAsync = require('../utils/catchAsync');

/**
 * GET /api/dashboard/kpis
 * Open to any authenticated role — a lightweight, high-level snapshot
 * every role benefits from seeing on login (unlike /reports/analytics,
 * which is deeper financial/safety detail restricted to specific roles).
 */
const getKpis = catchAsync(async (req, res) => {
  const [vehicleCounts, driverCounts, activeTrips, openMaintenance] = await Promise.all([
    query(`SELECT status, COUNT(*)::int AS count FROM vehicles GROUP BY status`),
    query(`SELECT status, COUNT(*)::int AS count FROM drivers GROUP BY status`),
    query(`SELECT COUNT(*)::int AS count FROM trips WHERE status = 'dispatched'`),
    query(`SELECT COUNT(*)::int AS count FROM maintenance_logs WHERE status = 'open'`),
  ]);

  res.status(200).json({
    success: true,
    data: {
      vehicles_by_status: vehicleCounts.rows,
      drivers_by_status: driverCounts.rows,
      active_trips: activeTrips.rows[0].count,
      open_maintenance_tickets: openMaintenance.rows[0].count,
    },
  });
});

module.exports = { getKpis };
