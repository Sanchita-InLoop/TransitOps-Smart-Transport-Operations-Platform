'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const restrictTo = require('../middleware/rbac');
const validate = require('../middleware/validate');
const { createVehicleSchema, updateVehicleSchema } = require('../validators/vehicle.validator');
const {
  listVehicles,
  createVehicle,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
} = require('../controllers/vehicle.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', listVehicles);
router.get('/:id', getVehicleById);

router.post('/', restrictTo('fleet_manager'), validate(createVehicleSchema), createVehicle);
router.patch('/:id', restrictTo('fleet_manager'), validate(updateVehicleSchema), updateVehicle);

// NOTE: exposing a hard DELETE is worth a second thought — vehicles.id is
// referenced by trips/fuel_logs/maintenance_logs/expenses with
// ON DELETE RESTRICT (see the DDL), so the DB will already reject deleting
// any vehicle with history. This route only succeeds for a vehicle that
// was created but never used — if you want to remove vehicles with
// history from view, prefer setting status = 'retired' instead.
router.delete('/:id', restrictTo('fleet_manager'), deleteVehicle);

module.exports = router;