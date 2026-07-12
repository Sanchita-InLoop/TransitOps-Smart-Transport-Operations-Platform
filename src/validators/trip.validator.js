'use strict';

const { z } = require('zod');

// Helper for auto-incrementing integer IDs
const idSchema = (fieldName) => z.coerce.number().int().positive(`A valid ${fieldName} is required.`);

const createTripSchema = z.object({
  vehicle_id: idSchema('vehicle_id'),
  driver_id: z.string().uuid('A valid driver_id is required.'),
  source: z.string().trim().min(1, 'Source location is required.').max(255),
  destination: z.string().trim().min(1, 'Destination location is required.').max(255),
  // Enforces strictly greater than 0 to mirror database CHECK constraints
  cargo_weight: z.coerce.number().positive('Cargo weight must be greater than 0.'),
  planned_distance: z.coerce.number().positive('Planned distance must be greater than 0.'),
});

const tripIdParamSchema = z.object({
  id: idSchema('trip ID'),
});

const completeTripSchema = z.object({
  // Non-negative as requested, allowing zero for edge cases
  actual_distance: z.coerce.number().nonnegative('Actual distance cannot be negative.'),
  fuel_consumed: z.coerce.number().nonnegative('Fuel consumed cannot be negative.').optional(),
});

module.exports = { createTripSchema, tripIdParamSchema, completeTripSchema };