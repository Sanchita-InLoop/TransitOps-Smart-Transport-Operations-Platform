'use strict';

const { z } = require('zod');

// Mirrors chk_vehicles_* CHECK constraints from the DDL — validating
// these at the API edge gives a clean 400 with a field-level message
// instead of surfacing a raw '23514 check_violation' from Postgres.
const createVehicleSchema = z.object({
  registration_number: z.string().trim().min(1, 'Registration number is required.').max(20),
  model_name: z.string().trim().min(1, 'Model name is required.').max(100),
  type: z.string().trim().min(1, 'Vehicle type is required.').max(50),
  max_load_capacity: z.coerce
    .number({ invalid_type_error: 'Max load capacity must be a number.' })
    .nonnegative('Max load capacity cannot be negative.'),
  odometer: z.coerce
    .number({ invalid_type_error: 'Odometer must be a number.' })
    .nonnegative('Odometer cannot be negative.')
    .optional()
    .default(0),
  acquisition_cost: z.coerce
    .number({ invalid_type_error: 'Acquisition cost must be a number.' })
    .nonnegative('Acquisition cost cannot be negative.'),
});

module.exports = { createVehicleSchema };
