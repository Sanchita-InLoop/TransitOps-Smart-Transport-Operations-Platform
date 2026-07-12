'use strict';

const { z } = require('zod');

const vehicleIdParamSchema = z.object({
  vehicleId: z.coerce.number().int().positive(),
});

const roiQuerySchema = z.object({
  revenue: z.coerce.number().min(0).optional().default(0),
});

module.exports = { vehicleIdParamSchema, roiQuerySchema };