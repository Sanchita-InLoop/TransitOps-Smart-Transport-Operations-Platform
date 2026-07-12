'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const restrictTo = require('../middleware/rbac');
const validate = require('../middleware/validate');
const {
  createTripSchema,
  tripIdParamSchema,
  completeTripSchema,
} = require('../validators/trip.validator');
const { listTrips, createTrip, dispatchTrip, completeTrip, cancelTrip } = require('../controllers/trip.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', listTrips);
router.post('/', restrictTo('fleet_manager'), validate(createTripSchema), createTrip);

// :id is validated as params (separate `source` argument to validate()),
// keeping path-param validation consistent with body validation.
router.patch(
  '/:id/dispatch',
  restrictTo('fleet_manager'),
  validate(tripIdParamSchema, 'params'),
  dispatchTrip
);

router.patch(
  '/:id/complete',
  restrictTo('fleet_manager', 'driver'),
  validate(tripIdParamSchema, 'params'),
  validate(completeTripSchema, 'body'),
  completeTrip
);

router.patch(
  '/:id/cancel',
  restrictTo('fleet_manager'),
  validate(tripIdParamSchema, 'params'),
  cancelTrip
);

module.exports = router;
