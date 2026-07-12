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

const router = express.Router();

/**
 * Single mounting point for every resource router, keeping the exact
 * path layout explicit and easy to audit in one place:
 *   /api/auth        -> auth.routes.js
 *   /api/vehicles     -> vehicle.routes.js
 *   /api/drivers      -> driver.routes.js
 *   /api/trips        -> trip.routes.js
 *   /api/fuel-logs    -> fuelLog.routes.js
 *   /api/expenses     -> expense.routes.js
 *   /api/reports      -> report.routes.js
 *   /api/dashboard    -> dashboard.routes.js
 */
router.use('/auth', authRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/drivers', driverRoutes);
router.use('/trips', tripRoutes);
router.use('/fuel-logs', fuelLogRoutes);
router.use('/expenses', expenseRoutes);
router.use('/reports', reportRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;
