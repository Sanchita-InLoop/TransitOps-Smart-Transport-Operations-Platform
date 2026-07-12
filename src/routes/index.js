'use strict';

const express = require('express');

const authRoutes = require('./auth.routes');
const vehicleRoutes = require('./vehicle.routes');
const fuelLogRoutes = require('./fuelLog.routes');
const expenseRoutes = require('./expense.routes');
const reportRoutes = require('./report.routes');
const dashboardRoutes = require('./dashboard.routes');

const router = express.Router();

// 1. Mount classic CommonJS team routes smoothly
router.use('/auth', authRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/fuel-logs', fuelLogRoutes);
router.use('/expenses', expenseRoutes);
router.use('/reports', reportRoutes);
router.use('/dashboard', dashboardRoutes);

// 2. Asynchronously load and forward requests to your modern ES Module (.mjs) routes
router.use('/drivers', async (req, res, next) => {
  try {
    const module = await import('./driver.routes.mjs');
    // Explicitly forward the execution context to the ES Module router instance
    module.default(req, res, next);
  } catch (err) {
    next(err);
  }
});

router.use('/trips', async (req, res, next) => {
  try {
    const module = await import('./trip.routes.mjs');
    // Explicitly forward the execution context to the ES Module router instance
    module.default(req, res, next);
  } catch (err) {
    next(err);
  }
});

module.exports = router;