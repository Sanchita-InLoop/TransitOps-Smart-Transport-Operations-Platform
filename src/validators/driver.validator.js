'use strict';

const { z } = require('zod');

const createDriverSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters long.').max(150),
  license_number: z.string().trim().min(1, 'License number is required.').max(50),
  license_category: z.string().trim().min(1, 'License category is required.').max(20),
  // Accepts 'YYYY-MM-DD' strings from the client, matching the DATE column.
  license_expiry_date: z.coerce.date({
    errorMap: () => ({ message: 'License expiry date must be a valid date (YYYY-MM-DD).' }),
  }),
  contact_number: z.string().trim().min(7, 'A valid contact number is required.').max(20),
  // Mirrors chk_drivers_safety_score_range (0-100). Defaults to 100 to
  // match the DB column default for newly onboarded drivers.
  safety_score: z.coerce
    .number()
    .int('Safety score must be a whole number.')
    .min(0, 'Safety score cannot be below 0.')
    .max(100, 'Safety score cannot exceed 100.')
    .optional()
    .default(100),
});

module.exports = { createDriverSchema };
