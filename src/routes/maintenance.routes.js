const express = require('express');
const validate = require('../middleware/validate');

const maintenanceController = require('../controllers/maintenance.controller');
const validatorModule = require('../validators/maintenance.validator');

const router = express.Router();

const safeCreate = maintenanceController.create || ((req, res) => res.status(500).json({ message: "create missing" }));
const safeClose = maintenanceController.close || ((req, res) => res.status(500).json({ message: "close missing" }));
const safeGetAll = maintenanceController.getAll || ((req, res) => res.status(500).json({ message: "getAll missing" }));
const safeGetById = maintenanceController.getById || ((req, res) => res.status(500).json({ message: "getById missing" }));

const safeCreateSchema = validatorModule.createMaintenanceLogSchema || {};

router.post('/', validate(safeCreateSchema), safeCreate);
router.patch('/:id/close', safeClose);
router.get('/', safeGetAll);
router.get('/:id', safeGetById);

module.exports = router; 