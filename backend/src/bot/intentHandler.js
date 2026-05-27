import { generateCompletion } from '../services/ai.service.js';
import { TASK_TYPES } from '../utils/ai.prompts.js';
import logger from '../utils/logger.js';

/**
 * Phase R2: Intent Handler
 *
 * Sends a raw Telegram message through the Groq AI service to classify
 * the user's intent and extract structured scheduling slots.
 *
 * Returns a safe, normalized result — never throws.
 * On any failure it returns { intent: 'UNKNOWN' } so the conversation
 * can degrade gracefully without crashing.
 */

const SAFE_FALLBACK = {
  intent:       'UNKNOWN',
  confidence:   0,
  slots:        {},
  missingSlots: [],
};

/**
 * Classify a Telegram message and extract scheduling slots.
 *
 * @param {object} opts
 * @param {string}  opts.message    - Raw message text from the user
 * @param {object}  [opts.context]  - Existing session context (intent + slots collected so far)
 * @param {string|number} [opts.telegramId] - For logging
 *
 * @returns {Promise<{
 *   intent:       string,
 *   confidence:   number,
 *   slots:        object,
 *   missingSlots: string[]
 * }>}
 */
export async function extractIntent({ message, context = {}, telegramId }) {
  try {
    const result = await generateCompletion({
      taskType: TASK_TYPES.INTENT_EXTRACTION,
      input:    { message, context },
      metadata: { endpoint: 'telegram-intent', userId: String(telegramId || '') },
    });

    // generateCompletion already validates + parses JSON — but we still
    // defensively normalise the shape in case the schema drifts.
    const intent       = result?.intent        || 'UNKNOWN';
    const confidence   = result?.confidence    ?? 0;
    const slots        = result?.slots         || {};
    const missingSlots = result?.missingSlots  || [];

    // Strip null values from slots so the object stays clean
    const cleanSlots = Object.fromEntries(
      Object.entries(slots).filter(([, v]) => v !== null && v !== undefined && v !== '')
    );

    logger.info('[IntentHandler] Classified', {
      telegramId,
      intent,
      confidence,
      slots: cleanSlots,
      missingSlots,
    });

    return { intent, confidence, slots: cleanSlots, missingSlots };
  } catch (err) {
    logger.error('[IntentHandler] Groq call failed — returning UNKNOWN', {
      telegramId,
      error: err.message,
    });
    return SAFE_FALLBACK;
  }
}
