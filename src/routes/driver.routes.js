'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const restrictTo = require('../middleware/rbac');
const validate = require('../middleware/validate');
const { createDriverSchema } = require('../validators/driver.validator');
const { listDrivers, createDriver } = require('../controllers/driver.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', listDrivers);
router.post('/', restrictTo('fleet_manager'), validate(createDriverSchema), createDriver);

module.exports = router;
