'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const restrictTo = require('../middleware/rbac');
const { getAnalytics, exportReport } = require('../controllers/report.controller');

const router = express.Router();

router.use(authenticate);

// Financial/safety reporting is sensitive aggregate data — restricted to
// the two roles whose job function is to consume it.
router.get('/analytics', restrictTo('financial_analyst', 'safety_officer'), getAnalytics);
router.get('/export', restrictTo('financial_analyst'), exportReport);

module.exports = router;
