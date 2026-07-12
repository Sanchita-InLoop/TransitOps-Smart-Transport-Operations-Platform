const { z } = require('zod');

// Coercing numeric fields ensures string payloads from clients parse correctly
const createVehicleSchema = z.object({
  registration_number: z.string().min(1, "Required").max(20, "Max 20 chars"),
  model_name: z.string().min(1, "Required").max(100, "Max 100 chars"),
  type: z.string().min(1, "Required").max(50, "Max 50 chars"),
  max_load_capacity: z.coerce.number().positive("Must be a positive number"),
  odometer: z.coerce.number().min(0).optional(), // Has DB default 0
  acquisition_cost: z.coerce.number().positive("Must be a positive number")
});

const updateVehicleSchema = createVehicleSchema.partial();

module.exports = {
  createVehicleSchema,
  updateVehicleSchema
};