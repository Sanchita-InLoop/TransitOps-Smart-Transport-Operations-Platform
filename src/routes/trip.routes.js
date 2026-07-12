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



/**

 * THIS FILE REPLACES: trip.routes.mjs (bare `router.patch('/:id', updateTripStatus)`)

 *

 * That version had one generic PATCH /:id route with no auth, no rbac, no

 * validation, and no distinction between dispatch/complete/cancel — each

 * of which has completely different business rules and side effects.

 * Restored here as three explicit, separately-guarded endpoints.

 */



const router = express.Router();



router.use(authenticate);



router.get('/', listTrips);

router.post('/', restrictTo('fleet_manager'), validate(createTripSchema), createTrip);



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



module.exports = router