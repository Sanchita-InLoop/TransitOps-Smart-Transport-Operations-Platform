'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const restrictTo = require('../middleware/rbac');
const validate = require('../middleware/validate');
const { createVehicleSchema, updateVehicleSchema } = require('../validators/vehicle.validator');
const vehicleController = require('../controllers/vehicle.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', vehicleController.getAll);
router.post('/', restrictTo('fleet_manager'), validate(createVehicleSchema), vehicleController.create);
router.patch('/:id', restrictTo('fleet_manager'), validate(updateVehicleSchema, 'body'), vehicleController.update);

module.exports = router;
