import { z } from 'zod';

/**
 * Phase 3: Meetings Zod Schemas
 *
 * createMeetingSchema: admin-only. Validates title, ISO datetime range,
 *   optional description, and array of participant user IDs.
 *
 * respondToInviteSchema: validates the status transition — only ACCEPTED or REJECTED allowed.
 */

export const createMeetingSchema = {
  body: z.object({
    title: z.string().min(1, { message: 'Meeting title is required.' }),
    description: z.string().optional(),
    startTime: z
      .string()
      .datetime({ message: 'startTime must be a valid ISO 8601 datetime string.' }),
    endTime: z
      .string()
      .datetime({ message: 'endTime must be a valid ISO 8601 datetime string.' }),
    participantIds: z
      .array(z.string().uuid({ message: 'Each participantId must be a valid UUID.' }))
      .min(1, { message: 'At least one participant is required.' }),
  }).refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: 'endTime must be after startTime.',
    path: ['endTime'],
  }),
};

export const respondToInviteSchema = {
  params: z.object({
    id: z.string().uuid({ message: 'Meeting ID must be a valid UUID.' }),
  }),
  body: z.object({
    status: z.enum(['ACCEPTED', 'REJECTED'], {
      errorMap: () => ({ message: 'Status must be either ACCEPTED or REJECTED.' }),
    }),
  }),
};

export const getMeetingSchema = {
  params: z.object({
    id: z.string().uuid({ message: 'Meeting ID must be a valid UUID.' }),
  }),
};

export const updateMeetingSchema = {
  params: z.object({
    id: z.string().uuid({ message: 'Meeting ID must be a valid UUID.' }),
  }),
  body: z.object({
    title: z.string().min(1, { message: 'Meeting title is required.' }).optional(),
    description: z.string().optional(),
    startTime: z.string().datetime({ message: 'startTime must be a valid ISO 8601 datetime string.' }).optional(),
    endTime: z.string().datetime({ message: 'endTime must be a valid ISO 8601 datetime string.' }).optional(),
    participantIds: z.array(z.string().uuid({ message: 'Each participantId must be a valid UUID.' })).min(1, { message: 'At least one participant is required.' }).optional(),
  }).refine((data) => {
    if (data.startTime && data.endTime) {
      return new Date(data.endTime) > new Date(data.startTime);
    }
    return true; // if only one is updated, we do validation inside service
  }, {
    message: 'endTime must be after startTime.',
    path: ['endTime'],
  }),
};

export const deleteMeetingSchema = {
  params: z.object({
    id: z.string().uuid({ message: 'Meeting ID must be a valid UUID.' }),
  }),
};
