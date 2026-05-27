/**
 * Phase 4: AI Prompt Template System
 *
 * Versioned, parameterized prompt generators for each AI task type.
 * Every template enforces strict output schemas so downstream parsing is
 * deterministic.  Version tags (v1, v2 …) allow A/B testing and rollback
 * without touching orchestration logic.
 */

// Phase R1: Import proper builders added in src/prompts.js
import {
  AGENDA_EXTRACTION_PROMPT,
  INTENT_EXTRACTION_PROMPT,
} from '../prompts.js';

// ─── Task Type Constants ────────────────────────────────────────────────────

export const TASK_TYPES = Object.freeze({
  SUGGEST_TIMES:      'SUGGEST_TIMES',
  DRAFT_EMAIL:        'DRAFT_EMAIL',
  SUMMARIZE_MEETING:  'SUMMARIZE_MEETING',
  // Phase R1
  AGENDA_EXTRACTION:  'AGENDA_EXTRACTION',
  INTENT_EXTRACTION:  'INTENT_EXTRACTION',
});

// ─── SUGGEST_TIMES — v1 ─────────────────────────────────────────────────────

/**
 * Build the prompt for optimal meeting‐time suggestions.
 *
 * @param {object} params
 * @param {string}   params.meetingTitle      - Human-readable meeting name
 * @param {number}   params.durationMinutes   - Required duration in minutes
 * @param {object[]} params.availabilityByUser - Array of { userId, slots: [{ start, end }] }
 *                                              All timestamps MUST be ISO 8601.
 * @returns {{ system: string, user: string, version: string }}
 */
export function SUGGEST_TIMES_V1({ meetingTitle, durationMinutes, availabilityByUser }) {
  const dataBlock = JSON.stringify(availabilityByUser, null, 2);

  const system = [
    'You are an expert scheduling assistant.',
    'Given participant availability windows, suggest the best meeting times.',
    'Output ONLY valid JSON matching the schema below — no markdown, no explanation.',
    '',
    'Schema:',
    '{',
    '  "suggestions": [',
    '    { "start": "<ISO 8601>", "end": "<ISO 8601>", "score": <0.0–1.0> }',
    '  ]',
    '}',
    '',
    'Rules:',
    '1. Every suggestion must fit within ALL participants\' available windows.',
    `2. Each suggestion duration must equal exactly ${durationMinutes} minutes.`,
    '3. Score reflects how many participants are available (1.0 = everyone).',
    '4. Return at most 5 suggestions, sorted by score descending.',
    '5. Do NOT include any text outside the JSON object.',
  ].join('\n');

  const user = [
    `Meeting: "${meetingTitle}"`,
    `Required duration: ${durationMinutes} minutes`,
    '',
    'Participant availability (ISO 8601):',
    dataBlock,
  ].join('\n');

  return { system, user, version: 'v1' };
}

// ─── DRAFT_EMAIL — v1 ───────────────────────────────────────────────────────

/**
 * Build the prompt for drafting a meeting-related email.
 *
 * @param {object} params
 * @param {string}   params.contextType    - One of 'invite' | 'reminder' | 'follow-up'
 * @param {object}   params.meeting        - { title, description?, startTime, endTime }
 * @param {object[]} params.participants   - [{ name, email }]
 * @returns {{ system: string, user: string, version: string }}
 */
export function DRAFT_EMAIL_V1({ contextType, meeting, participants }) {
  const participantList = participants
    .map((p) => `  - ${p.name || 'Unknown'} (${p.email})`)
    .join('\n');

  const system = [
    'You are a professional executive assistant drafting meeting emails.',
    'Output ONLY valid JSON matching the schema below — no markdown fences, no commentary.',
    '',
    'Schema:',
    '{',
    '  "subject": "<email subject line>",',
    '  "body": "<full email body in plain text>"',
    '}',
    '',
    'Rules:',
    '1. Tone: professional yet friendly.',
    '2. Include meeting title, date/time, and participant names where appropriate.',
    `3. Context type is "${contextType}" — tailor the email accordingly.`,
    '4. Do NOT include any text outside the JSON object.',
  ].join('\n');

  const user = [
    `Email type: ${contextType}`,
    `Meeting: "${meeting.title}"`,
    meeting.description ? `Description: ${meeting.description}` : '',
    `Start: ${meeting.startTime}`,
    `End: ${meeting.endTime}`,
    '',
    'Participants:',
    participantList,
  ]
    .filter(Boolean)
    .join('\n');

  return { system, user, version: 'v1' };
}

// ─── SUMMARIZE_MEETING — v1 ─────────────────────────────────────────────────

/**
 * Build the prompt for summarizing meeting notes.
 *
 * @param {object} params
 * @param {object}   params.meeting - { title, startTime, endTime }
 * @param {string}   params.notes   - Raw meeting notes / transcript
 * @returns {{ system: string, user: string, version: string }}
 */
export function SUMMARIZE_MEETING_V1({ meeting, notes }) {
  const system = [
    'You are an expert meeting summarizer.',
    'Output ONLY valid JSON matching the schema below — no markdown fences, no commentary.',
    '',
    'Schema:',
    '{',
    '  "summary": "<1–3 paragraph summary>",',
    '  "bulletPoints": ["<key point>", ...],',
    '  "actionItems": [{ "owner": "<name or unknown>", "task": "<description>", "deadline": "<date or null>" }],',
    '  "decisions": ["<decision made>", ...]',
    '}',
    '',
    'Rules:',
    '1. Keep the summary concise but comprehensive.',
    '2. Extract every explicit action item with an owner if mentioned.',
    '3. List all decisions that were agreed upon.',
    '4. Do NOT include any text outside the JSON object.',
  ].join('\n');

  const user = [
    `Meeting: "${meeting.title}"`,
    `Date: ${meeting.startTime} — ${meeting.endTime}`,
    '',
    'Notes:',
    notes,
  ].join('\n');

  return { system, user, version: 'v1' };
}

// ─── Template Registry ──────────────────────────────────────────────────────

/**
 * Map task types → prompt builder functions.
 * The AI service looks up the right builder by taskType at runtime.
 */
export const PROMPT_REGISTRY = Object.freeze({
  [TASK_TYPES.SUGGEST_TIMES]:     SUGGEST_TIMES_V1,
  [TASK_TYPES.DRAFT_EMAIL]:       DRAFT_EMAIL_V1,
  [TASK_TYPES.SUMMARIZE_MEETING]: SUMMARIZE_MEETING_V1,
  // Phase R1 — full builders imported from src/prompts.js
  [TASK_TYPES.AGENDA_EXTRACTION]: AGENDA_EXTRACTION_PROMPT,
  [TASK_TYPES.INTENT_EXTRACTION]: INTENT_EXTRACTION_PROMPT,
});
