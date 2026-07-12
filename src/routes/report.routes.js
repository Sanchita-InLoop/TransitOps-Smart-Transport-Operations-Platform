'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const restrictTo = require('../middleware/rbac');
const {
  getVehicleReport,
  getAllVehicleReports,
  getFleetUtilization,
  exportReport,
} = require('../controllers/report.controller');

const router = express.Router();

router.use(authenticate);

router.get('/vehicles', restrictTo('financial_analyst', 'fleet_manager'), getAllVehicleReports);
router.get('/vehicles/:vehicleId', restrictTo('financial_analyst', 'fleet_manager'), getVehicleReport);
router.get('/fleet-utilization', restrictTo('financial_analyst', 'fleet_manager', 'safety_officer'), getFleetUtilization);
router.get('/export', restrictTo('financial_analyst'), exportReport);

module.exports = router;