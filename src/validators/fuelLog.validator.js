'use strict';

const { z } = require('zod');

const createFuelLogSchema = z.object({
  vehicle_id: z.coerce.number().int().positive('A valid vehicle_id is required.'),
  // Nullable to match fuel_logs.trip_id being optional in the schema —
  // a refuel can happen outside any active trip (depot top-up, etc).
  trip_id: z.coerce.number().int().positive().nullable().optional(),
  liters: z.coerce.number().positive('Liters must be greater than 0.'),
  cost: z.coerce.number().nonnegative('Cost cannot be negative.'),
  log_date: z.coerce.date().optional(),
});

/**
 * Query-string filters for GET /api/fuel-logs. All optional — an empty
 * query returns every fuel log.
 */
const listFuelLogsQuerySchema = z.object({
  vehicle_id: z.coerce.number().int().positive().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

module.exports = { createFuelLogSchema, listFuelLogsQuerySchema };