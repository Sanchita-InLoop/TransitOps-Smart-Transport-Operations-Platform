'use strict';

const { z } = require('zod');

const uuid = z.string().uuid('A valid UUID is required.');

const createTripSchema = z.object({
  vehicle_id: z.coerce.number().int().positive('A valid vehicle_id is required.'),
  driver_id: uuid,
  source: z.string().trim().min(1, 'Source is required.').max(255),
  destination: z.string().trim().min(1, 'Destination is required.').max(255),
  // Mirrors chk_trips_cargo_weight_positive / chk_trips_planned_distance_positive
  // (strictly > 0, not just >= 0) — matches the DDL's business rule exactly.
  cargo_weight: z.coerce.number().positive('Cargo weight must be greater than 0.'),
  planned_distance: z.coerce.number().positive('Planned distance must be greater than 0.'),
});

const tripIdParamSchema = z.object({
  id: z.coerce.number().int().positive('A valid trip id is required.'),
});

const completeTripSchema = z.object({
  actual_distance: z.coerce.number().nonnegative('Actual distance cannot be negative.'),
  fuel_consumed: z.coerce.number().nonnegative('Fuel consumed cannot be negative.').optional(),
});

module.exports = { createTripSchema, tripIdParamSchema, completeTripSchema };
