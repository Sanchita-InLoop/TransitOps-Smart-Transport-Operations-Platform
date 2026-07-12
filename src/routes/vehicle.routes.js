const express = require('express');
const validate = require('../middleware/validate');

// 1. Direct imports
const vehicleController = require('../controllers/vehicle.controller');
const validatorModule = require('../validators/vehicle.validator');

// 2. Debug logs - this will print to your terminal when you save
console.log("👉 FOUND IN CONTROLLER:", Object.keys(vehicleController));
console.log("👉 FOUND IN VALIDATOR:", Object.keys(validatorModule));

const router = express.Router();

// 3. CRASH GUARDS: If an import failed, this prevents the [object Undefined] crash
const safeCreate = vehicleController.create || ((req, res) => res.status(500).json({ message: "create missing" }));
const safeGetAll = vehicleController.getAll || ((req, res) => res.status(500).json({ message: "getAll missing" }));
const safeGetById = vehicleController.getById || ((req, res) => res.status(500).json({ message: "getById missing" }));
const safeUpdate = vehicleController.update || ((req, res) => res.status(500).json({ message: "update missing" }));
const safeDelete = vehicleController.delete || ((req, res) => res.status(500).json({ message: "delete missing" }));

// 4. Safe Schemas
const safeCreateSchema = validatorModule.createVehicleSchema || {};
const safeUpdateSchema = validatorModule.updateVehicleSchema || {};

router.post('/', validate(safeCreateSchema), safeCreate);
router.get('/', safeGetAll);
router.get('/:id', safeGetById);
router.patch('/:id', validate(safeUpdateSchema), safeUpdate);
router.delete('/:id', safeDelete);

module.exports = router;