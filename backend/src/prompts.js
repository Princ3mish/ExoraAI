/**
 * Phase R1: Prompt Templates — src/prompts.js
 *
 * Three named exports, each a parameterized builder function.
 * Every builder returns { system, user, version } — the same interface
 * expected by the PROMPT_REGISTRY in src/utils/ai.prompts.js.
 *
 * Rules enforced by every prompt:
 *  - Output ONLY valid JSON — no markdown fences, no prose explanation.
 *  - The schema is declared inline so the model cannot deviate.
 *  - Version strings enable A/B testing and rollback without touching callers.
 */

// ─── INTENT_EXTRACTION_PROMPT ────────────────────────────────────────────────

/**
 * Classify a user message into a scheduling intent and extract structured slots.
 *
 * Supported intents:
 *   CREATE_MEETING    — user wants to schedule a new meeting
 *   RESCHEDULE        — user wants to move an existing meeting
 *   CANCEL            — user wants to cancel a meeting
 *   QUERY_SCHEDULE    — user is asking about their schedule
 *   CONFIRM_MEETING   — user is confirming attendance
 *   DECLINE_MEETING   — user is declining attendance
 *   UNKNOWN           — message does not match any scheduling intent
 *
 * @param {object} params
 * @param {string}   params.message              - Raw user message text
 * @param {object}   [params.context]            - Conversation context so far
 * @param {string}   [params.context.intent]     - Previously classified intent (if resuming)
 * @param {object}   [params.context.slots]      - Slots already collected (if resuming)
 * @param {string[]} [params.context.history]    - Last N conversation turns as strings
 * @returns {{ system: string, user: string, version: string }}
 */
export function INTENT_EXTRACTION_PROMPT({ message, context = {} }) {
  const contextBlock = Object.keys(context).length > 0
    ? `\nConversation context so far:\n${JSON.stringify(context, null, 2)}`
    : '';

  const system = [
    'You are an AI scheduling assistant operating inside a Telegram bot.',
    'Your task: classify the user\'s message into one intent and extract all relevant slots.',
    'Output ONLY valid JSON matching the schema below — no markdown, no explanation, no prose.',
    '',
    'Schema:',
    '{',
    '  "intent": "<one of: CREATE_MEETING | RESCHEDULE | CANCEL | QUERY_SCHEDULE | CONFIRM_MEETING | DECLINE_MEETING | UNKNOWN>",',
    '  "confidence": <0.0–1.0>,',
    '  "slots": {',
    '    "title":         "<meeting title or null>",',
    '    "date":          "<ISO 8601 date string or null>",',
    '    "time":          "<HH:MM 24h or null>",',
    '    "durationMins":  <integer minutes or null>,',
    '    "participants":  ["<email or name>", ...],',
    '    "location":      "<location string or null>",',
    '    "notes":         "<any extra context or null>"',
    '  },',
    '  "missingSlots": ["<slot name>", ...]',
    '}',
    '',
    'Rules:',
    '1. Set "confidence" to reflect how certain you are of the intent (1.0 = certain).',
    '2. Only populate slots you can extract from the message — use null for everything else.',
    '3. "missingSlots" must list every slot that is null but required for this intent.',
    '4. For CREATE_MEETING, required slots are: title, date, time.',
    '5. For RESCHEDULE, required slots are: title (or meeting reference), date, time.',
    '6. Do NOT hallucinate slot values — only extract what is explicitly stated.',
    '7. Do NOT include any text outside the JSON object.',
  ].join('\n');

  const user = [
    `User message: "${message}"`,
    contextBlock,
  ].filter(Boolean).join('\n');

  return { system, user, version: 'r1-v1' };
}

// ─── AGENDA_EXTRACTION_PROMPT ────────────────────────────────────────────────

/**
 * Extract a structured list of agenda topics from a raw voice call transcript.
 * Transcripts are noisy (filler words, repetition, cross-talk) — the model must
 * distil only the meaningful discussion points.
 *
 * @param {object} params
 * @param {string}  params.transcript   - Raw transcript text from the voice call
 * @param {string}  [params.meetingTitle] - Title of the meeting (optional context hint)
 * @param {string[]} [params.knownTopics] - Topics already recorded (for deduplication)
 * @returns {{ system: string, user: string, version: string }}
 */
export function AGENDA_EXTRACTION_PROMPT({ transcript, meetingTitle, knownTopics = [] }) {
  const contextHints = [
    meetingTitle   ? `Meeting title: "${meetingTitle}"` : '',
    knownTopics.length > 0
      ? `Topics already recorded (do not duplicate): ${JSON.stringify(knownTopics)}`
      : '',
  ].filter(Boolean).join('\n');

  const system = [
    'You are an expert meeting analyst.',
    'Extract the key agenda topics discussed in the following voice call transcript.',
    'Output ONLY valid JSON matching the schema below — no markdown, no explanation.',
    '',
    'Schema:',
    '{',
    '  "agendaTopics": ["<concise topic description>", ...],',
    '  "actionItems": [',
    '    { "owner": "<name or unknown>", "task": "<description>", "deadline": "<date or null>" }',
    '  ],',
    '  "outcome": "<one of: confirmed | rescheduled | declined | inconclusive>"',
    '}',
    '',
    'Rules:',
    '1. Each agenda topic must be a concise phrase (5–15 words), not a full sentence.',
    '2. Only include topics explicitly discussed — do not infer or embellish.',
    '3. Extract action items only if a commitment was explicitly made.',
    '4. Set "outcome" based on the final resolution of the call.',
    '5. If the transcript contains no meaningful content, return { "agendaTopics": [], "actionItems": [], "outcome": "inconclusive" }.',
    '6. Do NOT include any text outside the JSON object.',
  ].join('\n');

  const user = [
    contextHints,
    '',
    'Transcript:',
    transcript,
  ].filter(Boolean).join('\n');

  return { system, user, version: 'r1-v1' };
}

// ─── EMAIL_DRAFT_PROMPT ──────────────────────────────────────────────────────

/**
 * Write a concise, professional meeting invitation email body.
 * Hard limit: 120 words. Tone: warm but professional.
 *
 * @param {object} params
 * @param {object}   params.meeting              - Meeting details
 * @param {string}   params.meeting.title        - Meeting title
 * @param {string}   params.meeting.startTime    - ISO 8601 start time
 * @param {string}   params.meeting.endTime      - ISO 8601 end time
 * @param {string}   [params.meeting.description] - Optional agenda/notes
 * @param {string}   [params.meeting.location]   - Optional location or video link
 * @param {object[]} params.participants          - [{ name, email }]
 * @param {string}   params.organizerName        - Name of the meeting organizer
 * @param {string}   [params.contextType]        - 'invite' | 'reminder' | 'follow-up' (default: 'invite')
 * @returns {{ system: string, user: string, version: string }}
 */
export function EMAIL_DRAFT_PROMPT({ meeting, participants = [], organizerName, contextType = 'invite' }) {
  const participantList = participants.length > 0
    ? participants.map((p) => `  - ${p.name || 'Attendee'} <${p.email}>`).join('\n')
    : '  (no participants listed)';

  const system = [
    'You are a professional executive assistant writing a meeting email.',
    'Output ONLY valid JSON matching the schema below — no markdown fences, no commentary.',
    '',
    'Schema:',
    '{',
    '  "subject": "<concise email subject line>",',
    '  "body": "<full plain-text email body — maximum 120 words>"',
    '}',
    '',
    'Rules:',
    '1. The body must NOT exceed 120 words — count carefully.',
    '2. Tone: warm, professional, and action-oriented.',
    '3. Always include: meeting title, date, start and end times (formatted for humans).',
    '4. Include the location or video link if provided.',
    '5. Close with a clear call to action (e.g. "Please confirm your attendance").',
    `6. This is a "${contextType}" email — tailor the opening line accordingly.`,
    '7. Sign off with the organizer\'s name.',
    '8. Do NOT include any text outside the JSON object.',
  ].join('\n');

  // Format times for human readability in the user block
  const fmtStart = new Date(meeting.startTime).toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });
  const fmtEnd = new Date(meeting.endTime).toLocaleString('en-US', {
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });

  const user = [
    `Email type: ${contextType}`,
    `Organizer: ${organizerName || 'The Organizer'}`,
    `Meeting title: "${meeting.title}"`,
    meeting.description ? `Agenda/Description: ${meeting.description}` : '',
    `When: ${fmtStart} – ${fmtEnd}`,
    meeting.location ? `Where: ${meeting.location}` : '',
    '',
    'Participants:',
    participantList,
  ].filter(Boolean).join('\n');

  return { system, user, version: 'r1-v1' };
}
