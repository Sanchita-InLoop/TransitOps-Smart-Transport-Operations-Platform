'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const restrictTo = require('../middleware/rbac');
const validate = require('../middleware/validate');
const {
  createDriverSchema,
  updateDriverSchema,
  driverIdParamSchema,
} = require('../validators/driver.validator');
const {
  listDrivers,
  getDriverById,
  createDriver,
  updateDriver,
} = require('../controllers/driver.controller');

const router = express.Router();

// Every driver route requires a valid session; only mutating routes are
// further role-restricted below.
router.use(authenticate);

router.get('/', listDrivers);

router.get('/:id', validate(driverIdParamSchema, 'params'), getDriverById);

router.post('/', restrictTo('fleet_manager'), validate(createDriverSchema), createDriver);

router.patch(
  '/:id',
  restrictTo('fleet_manager'),
  validate(driverIdParamSchema, 'params'),
  validate(updateDriverSchema, 'body'),
  updateDriver
);

module.exports = router;
