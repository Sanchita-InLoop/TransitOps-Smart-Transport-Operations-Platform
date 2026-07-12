'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const restrictTo = require('../middleware/rbac');
const validate = require('../middleware/validate');
const { createVehicleSchema } = require('../validators/vehicle.validator');
const { listVehicles, createVehicle } = require('../controllers/vehicle.controller');

const router = express.Router();

// All vehicle routes require a valid session; only mutation is
// role-restricted, per the rationale documented in vehicle.controller.js.
router.use(authenticate);

router.get('/', listVehicles);
router.post('/', restrictTo('fleet_manager'), validate(createVehicleSchema), createVehicle);

module.exports = router;
