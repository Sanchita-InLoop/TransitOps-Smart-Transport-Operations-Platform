import { Router } from 'express';
import { getDrivers, createDriver, updateDriverStatus } from '../controllers/driver.controller.mjs';

const router = Router();

router.get('/', getDrivers);
router.post('/', createDriver);
router.patch('/:id/status', updateDriverStatus);

export default router;