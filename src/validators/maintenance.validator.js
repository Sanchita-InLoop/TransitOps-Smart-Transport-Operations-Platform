const { z } = require('zod');

const createMaintenanceLogSchema = z.object({
  vehicle_id: z.coerce.number().int("Invalid Vehicle ID format"), // No longer UUID
  description: z.string().min(1, "Description cannot be empty"),
  cost: z.coerce.number().nonnegative("Cost cannot be negative") // Added required field
});

module.exports = {
  createMaintenanceLogSchema
};