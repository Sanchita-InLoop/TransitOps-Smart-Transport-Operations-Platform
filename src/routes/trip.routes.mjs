import { Router } from 'express';
import { getTrips, createTrip, updateTripStatus } from '../controllers/trip.controller.mjs';

const router = Router();

router.get('/', getTrips);
router.post('/', createTrip);
router.patch('/:id', updateTripStatus);

export default router;