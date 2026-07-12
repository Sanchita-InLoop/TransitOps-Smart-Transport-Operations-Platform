'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const { getKpis } = require('../controllers/dashboard.controller');

const router = express.Router();

router.use(authenticate);

// Open to any authenticated role — see dashboard.controller.js for rationale.
router.get('/kpis', getKpis);

module.exports = router;
