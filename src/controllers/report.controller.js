'use strict';

const { query } = require('../config/db');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');

// Shared helper: per-vehicle cost/efficiency figures used by both the
// single-vehicle and all-vehicles report endpoints.
async function getVehicleReportRow(vehicleId, revenue = 0) {
  const vehicleRes = await query(`SELECT * FROM vehicles WHERE id = $1`, [vehicleId]);
  if (vehicleRes.rows.length === 0) return null;
  const vehicle = vehicleRes.rows[0];

  const fuelRes = await query(
    `SELECT COALESCE(SUM(liters),0)::float AS total_liters, COALESCE(SUM(cost),0)::float AS total_cost
     FROM fuel_logs WHERE vehicle_id = $1`,
    [vehicleId]
  );
  const maintenanceRes = await query(
    `SELECT COALESCE(SUM(cost),0)::float AS total_cost FROM maintenance_logs WHERE vehicle_id = $1`,
    [vehicleId]
  );
  const expenseRes = await query(
    `SELECT COALESCE(SUM(amount),0)::float AS total_cost FROM expenses WHERE vehicle_id = $1`,
    [vehicleId]
  );
  const tripRes = await query(
    `SELECT COALESCE(SUM(planned_distance),0)::float AS total_distance
     FROM trips WHERE vehicle_id = $1 AND status = 'Completed'`,
    [vehicleId]
  );

  const totalFuel = fuelRes.rows[0].total_liters;
  const totalDistance = tripRes.rows[0].total_distance;
  const fuelEfficiency = totalFuel > 0 ? totalDistance / totalFuel : null;

  const fuelCost = fuelRes.rows[0].total_cost;
  const maintenanceCost = maintenanceRes.rows[0].total_cost;
  const expenseCost = expenseRes.rows[0].total_cost;
  const operationalCost = fuelCost + maintenanceCost + expenseCost;

  const acquisitionCost = parseFloat(vehicle.acquisition_cost);
  const roi = acquisitionCost > 0
    ? (revenue - (maintenanceCost + fuelCost)) / acquisitionCost
    : null;

  return {
    vehicle_id: vehicle.id,
    registration_number: vehicle.registration_number,
    fuel_efficiency: fuelEfficiency,
    operational_cost: operationalCost,
    fuel_cost: fuelCost,
    maintenance_cost: maintenanceCost,
    expense_cost: expenseCost,
    roi,
  };
}

// GET /api/reports/vehicles/:vehicleId
const getVehicleReport = catchAsync(async (req, res) => {
  const vehicleId = req.params.vehicleId;
  const revenue = Number(req.query.revenue) || 0;
  const report = await getVehicleReportRow(vehicleId, revenue);
  if (!report) throw ApiError.notFound('Vehicle not found');
  res.status(200).json({ success: true, data: report });
});

// GET /api/reports/vehicles  (all vehicles)
const getAllVehicleReports = catchAsync(async (req, res) => {
  const vehiclesRes = await query(`SELECT id FROM vehicles`);
  const reports = [];
  for (const v of vehiclesRes.rows) {
    const r = await getVehicleReportRow(v.id, 0);
    if (r) reports.push(r);
  }
  res.status(200).json({ success: true, data: reports });
});

// GET /api/reports/fleet-utilization
const getFleetUtilization = catchAsync(async (req, res) => {
  const totalRes = await query(`SELECT COUNT(*)::int AS count FROM vehicles`);
  const onTripRes = await query(`SELECT COUNT(*)::int AS count FROM vehicles WHERE status = 'on_trip'`);
  const total = totalRes.rows[0].count;
  const onTrip = onTripRes.rows[0].count;
  const utilization = total > 0 ? (onTrip / total) * 100 : 0;
  res.status(200).json({ success: true, data: { total, on_trip: onTrip, utilization_percent: utilization } });
});

// GET /api/reports/export  (CSV of all-vehicle report)
const exportReport = catchAsync(async (req, res) => {
  const vehiclesRes = await query(`SELECT id FROM vehicles`);
  const rows = [];
  for (const v of vehiclesRes.rows) {
    const r = await getVehicleReportRow(v.id, 0);
    if (r) rows.push(r);
  }

  const headers = ['vehicle_id', 'registration_number', 'fuel_efficiency', 'operational_cost', 'fuel_cost', 'maintenance_cost', 'expense_cost', 'roi'];
  const csvLines = [headers.join(',')];
  for (const r of rows) {
    csvLines.push(headers.map((h) => (r[h] ?? '')).join(','));
  }
  const csv = csvLines.join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="vehicle_reports.csv"');
  res.status(200).send(csv);
});

module.exports = { getVehicleReport, getAllVehicleReports, getFleetUtilization, exportReport };