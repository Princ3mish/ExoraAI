import { z } from 'zod';

/**
 * Phase 4: AI Zod Validation Schemas
 */

export const suggestTimesSchema = {
  params: z.object({
    meetingId: z.string().uuid({ message: 'meetingId must be a valid UUID.' }),
  }),
};

export const draftEmailSchema = {
  body: z.object({
    meetingId: z.string().uuid({ message: 'meetingId must be a valid UUID.' }),
    contextType: z.enum(['invite', 'reminder', 'follow-up'], {
      errorMap: () => ({ message: 'contextType must be one of: invite, reminder, follow-up.' }),
    }),
  }),
};

export const summarySchema = {
  body: z.object({
    meetingId: z.string().uuid({ message: 'meetingId must be a valid UUID.' }),
    notes: z.string().min(1, { message: 'notes must be a non-empty string.' }),
  }),
};

// ─── Output Schemas for AI Integration ──────────────────────────────────────

export const suggestTimesOutputSchema = z.object({
  suggestions: z.array(
    z.object({
      start: z.string(),
      end: z.string(),
      score: z.number(),
    })
  ),
});

export const draftEmailOutputSchema = z.object({
  subject: z.string(),
  body: z.string(),
});

export const summaryOutputSchema = z.object({
  summary: z.string(),
  bulletPoints: z.array(z.string()),
  actionItems: z.array(
    z.object({
      owner: z.string(),
      task: z.string(),
      deadline: z.string(),
    })
  ),
  decisions: z.array(z.string()),
});

