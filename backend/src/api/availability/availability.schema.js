import { z } from 'zod';

/**
 * Phase 3: Availability Schemas
 * upsertAvailabilitiesSchema: array of DateTime-based availability slots.
 * Validates that endTime is after startTime at the schema level.
 */

const availabilitySlotSchema = z.object({
  startTime: z
    .string()
    .datetime({ message: 'startTime must be a valid ISO 8601 datetime string.' }),
  endTime: z
    .string()
    .datetime({ message: 'endTime must be a valid ISO 8601 datetime string.' }),
}).refine((data) => new Date(data.endTime) > new Date(data.startTime), {
  message: 'endTime must be after startTime.',
  path: ['endTime'],
});

export const upsertAvailabilitiesSchema = {
  body: z.object({
    slots: z
      .array(availabilitySlotSchema)
      .min(1, { message: 'At least one availability slot is required.' }),
  }),
};
