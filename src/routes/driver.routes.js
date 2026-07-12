'use strict';

const express = require('express');
const { z } = require('zod');
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
  updateDriverStatus,
} = require('../controllers/driver.controller');

/**
 * FIX APPLIED (converted from driver_routes.mjs):
 * 1. ESM `import`/`export default` -> CommonJS, matching the rest of the app.
 * 2. THIS IS THE ROOT CAUSE OF THE BUG YOU HIT: the original file had no
 *    `authenticate` or `restrictTo` middleware on ANY route, which is
 *    exactly why `GET /api/drivers` returned 200 with no Authorization
 *    header at all. `router.use(authenticate)` below fixes that for
 *    every route in this file in one place.
 * 3. No Zod validation was wired in — createDriver/updateDriver would
 *    have accepted any body shape and let a bad INSERT/UPDATE bounce off
 *    the DB's raw constraints instead of returning a clean 400.
 */

const statusUpdateSchema = z.object({
  status: z.enum(['available', 'off_duty', 'suspended'], {
    errorMap: () => ({ message: "Status must be one of: available, off_duty, suspended." }),
  }),
});

const router = express.Router();

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

router.patch(
  '/:id/status',
  restrictTo('fleet_manager'),
  validate(driverIdParamSchema, 'params'),
  validate(statusUpdateSchema, 'body'),
  updateDriverStatus
);

module.exports = router;