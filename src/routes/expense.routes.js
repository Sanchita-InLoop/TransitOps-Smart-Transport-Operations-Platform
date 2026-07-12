'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const restrictTo = require('../middleware/rbac');
const validate = require('../middleware/validate');
const { createExpenseSchema, listExpensesQuerySchema } = require('../validators/expense.validator');
const { listExpenses, createExpense } = require('../controllers/expense.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', validate(listExpensesQuerySchema, 'query'), listExpenses);

router.post('/', restrictTo('fleet_manager', 'financial_analyst'), validate(createExpenseSchema), createExpense);

module.exports = router;