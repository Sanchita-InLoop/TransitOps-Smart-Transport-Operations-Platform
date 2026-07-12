'use strict';

const express = require('express');

const authRoutes = require('./auth.routes');
const vehicleRoutes = require('./vehicle.routes');
const driverRoutes = require('./driver.routes');
const tripRoutes = require('./trip.routes');
const fuelLogRoutes = require('./fuelLog.routes');
const expenseRoutes = require('./expense.routes');
const reportRoutes = require('./report.routes');
const dashboardRoutes = require('./dashboard.routes');
const maintenanceRoutes = require('./maintenance.routes');

/**
 * FIX APPLIED: removed the async dynamic-import() shim that was routing
 * /drivers and /trips through a separate ESM loading path while every
 * other resource used a plain require(). That dual-loading setup is what
 * caused the crash — `require('./driver.routes')` at the top of this file
 * failed immediately because the file was still named `.mjs` on disk, so
 * the process never even got far enough to reach the dynamic-import
 * fallback below it.
 *
 * Now that driver.routes.js and trip.routes.js are proper CommonJS files
 * (matching every other route module in this app), they're required and
 * mounted exactly the same way as auth/vehicles/expenses/etc — one
 * consistent module system, one consistent mounting pattern.
 */
const router = express.Router();

router.use('/auth', authRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/drivers', driverRoutes);
router.use('/trips', tripRoutes);
router.use('/fuel-logs', fuelLogRoutes);
router.use('/expenses', expenseRoutes);
router.use('/reports', reportRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/maintenance-logs', maintenanceRoutes);

module.exports = router;