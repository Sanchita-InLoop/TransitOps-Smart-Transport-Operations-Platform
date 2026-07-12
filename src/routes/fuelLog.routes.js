'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const restrictTo = require('../middleware/rbac');
const validate = require('../middleware/validate');
const { createFuelLogSchema } = require('../validators/fuelLog.validator');
const { createFuelLog } = require('../controllers/fuelLog.controller');

const router = express.Router();

router.use(authenticate);

router.post('/', restrictTo('fleet_manager', 'driver'), validate(createFuelLogSchema), createFuelLog);

module.exports = router;
