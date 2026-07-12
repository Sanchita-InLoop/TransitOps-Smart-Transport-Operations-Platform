'use strict';

const express = require('express');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../validators/auth.validator');
const { register, login } = require('../controllers/auth.controller');

const router = express.Router();

// Public routes — no authenticate/rbac, since these ARE the entry point
// that produces the JWT used by every other route.
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);

module.exports = router;
