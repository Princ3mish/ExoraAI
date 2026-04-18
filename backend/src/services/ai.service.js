/**
 * Phase 4: AI Orchestrator Service
 *
 * Central entry point for all AI-powered features.  Responsibilities:
 *  1. Prompt construction via the template registry
 *  2. Provider routing  (Groq → OpenRouter fallback)
 *  3. Retry with exponential back-off + circuit breaking
 *  4. Response schema validation
 *  5. LRU caching for deterministic / repeated prompts
 *  6. Structured Winston logging with truncation
 */

import { LRUCache } from 'lru-cache';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';
import { PROMPT_REGISTRY, TASK_TYPES } from '../utils/ai.prompts.js';
import { suggestTimesOutputSchema, draftEmailOutputSchema, summaryOutputSchema } from '../api/ai/ai.schema.js';
import * as groqProvider from './providers/groq.provider.js';
import * as openrouterProvider from './providers/openrouter.provider.js';
import { ProviderError } from './providers/groq.provider.js';

const prisma = new PrismaClient();

// ─── Quota Tracking ─────────────────────────────────────────────────────────

let globalTokenEstimate = 0;
const QUOTA_LIMIT = 50000;

// Reset every hour
setInterval(() => {
  globalTokenEstimate = 0;
}, 3600000);

// ─── Cache ──────────────────────────────────────────────────────────────────

const cache = new LRUCache({
  max: 100,          // entries
  ttl: 1000 * 60 * 15, // 15 minutes
});

// ─── Circuit Breaker (per provider) ─────────────────────────────────────────

const circuits = {
  groq: { failures: 0, openUntil: 0, THRESHOLD: 5, COOLDOWN_MS: 60_000 },
  openrouter: { failures: 0, openUntil: 0, THRESHOLD: 5, COOLDOWN_MS: 60_000 },
};

function isCircuitOpen(provider) {
  const c = circuits[provider];
  if (!c) return false;
  if (c.failures >= c.THRESHOLD && Date.now() < c.openUntil) return true;
  if (Date.now() >= c.openUntil) {
    // Reset after cooldown
    c.failures = 0;
  }
  return false;
}

function recordFailure(provider) {
  const c = circuits[provider];
  if (!c) return;
  c.failures += 1;
  if (c.failures >= c.THRESHOLD) {
    c.openUntil = Date.now() + c.COOLDOWN_MS;
    logger.warn(`Circuit breaker OPEN for provider "${provider}" until ${new Date(c.openUntil).toISOString()}`);
  }
}

function recordSuccess(provider) {
  const c = circuits[provider];
  if (c) c.failures = 0;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const PROVIDER_ORDER = [
  { name: 'groq', fn: groqProvider.generateCompletion },
  { name: 'openrouter', fn: openrouterProvider.generateCompletion },
];

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 500;

function truncate(str, maxLen = 300) {
  if (typeof str !== 'string') return String(str).slice(0, maxLen);
  return str.length > maxLen ? str.slice(0, maxLen) + '…[truncated]' : str;
}

function cacheKey(taskType, input) {
  return `${taskType}::${JSON.stringify(input)}`;
}

function validateAIResponse(taskType, rawContent) {
  try {
    // Strip markdown code fences if the model wraps its output
    let cleaned = rawContent.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    const parsed = JSON.parse(cleaned);

    let validator;
    if (taskType === TASK_TYPES.SUGGEST_TIMES) validator = suggestTimesOutputSchema;
    else if (taskType === TASK_TYPES.DRAFT_EMAIL) validator = draftEmailOutputSchema;
    else if (taskType === TASK_TYPES.SUMMARIZE_MEETING) validator = summaryOutputSchema;

    if (validator) {
      const result = validator.safeParse(parsed);
      if (!result.success) {
        return { valid: false, data: null, error: `Schema validation failed: ${result.error.message}` };
      }
      
      // Normalization layer
      const data = result.data;
      if (taskType === TASK_TYPES.SUGGEST_TIMES) {
        data.suggestions = data.suggestions.map(s => ({
          ...s,
          start: new Date(s.start).toISOString(),
          end: new Date(s.end).toISOString(),
        }));
      } else if (taskType === TASK_TYPES.DRAFT_EMAIL) {
        data.body = data.body.replace(/```(?:html|md|markdown)?\n?/g, '').replace(/```$/g, '').trim();
      }
      return { valid: true, data, error: null };
    }

    return { valid: true, data: parsed, error: null };
  } catch (e) {
    return { valid: false, data: null, error: `JSON parse failed: ${e.message}` };
  }
}

// ─── Availability Pre-Processing ────────────────────────────────────────────

/**
 * Deterministic pre-processing for SUGGEST_TIMES.
 * Filters availability slots using basic business rules BEFORE sending to AI:
 *  - Removes slots shorter than the meeting duration
 *  - Removes slots in the past
 *  - Normalises to ISO strings
 *
 * @param {object[]} availabilityByUser - [{ userId, slots: [{ start, end }] }]
 * @param {number}   durationMinutes
 * @returns {object[]}
 */
export function preProcessAvailability(availabilityByUser, durationMinutes) {
  const now = new Date();
  return availabilityByUser.map(({ userId, slots }) => ({
    userId,
    slots: slots
      .map((s) => ({
        start: new Date(s.start),
        end: new Date(s.end),
      }))
      .filter((s) => {
        if (s.end <= now) return false;                          // past
        const slotMinutes = (s.end - s.start) / 60_000;
        return slotMinutes >= durationMinutes;                   // too short
      })
      .map((s) => ({
        start: s.start.toISOString(),
        end: s.end.toISOString(),
      })),
  }));
}

// ─── Core Entry Point ───────────────────────────────────────────────────────

/**
 * Generate an AI completion.
 *
 * @param {object} params
 * @param {string} params.taskType  - One of TASK_TYPES values
 * @param {object} params.input     - Task-specific payload passed to the prompt builder
 * @param {object} [params.metadata] - { userId, meetingId, endpoint } for logging
 * @returns {Promise<object>}        - Parsed and validated AI response
 */
export async function generateCompletion({ taskType, input, metadata = {} }) {
  const startTime = Date.now();
  const logMeta = {
    taskType,
    userId: metadata.userId || null,
    meetingId: metadata.meetingId || null,
    endpoint: metadata.endpoint || null,
  };

  if (globalTokenEstimate > QUOTA_LIMIT) {
    logger.warn('AI Quota Exceeded', logMeta);
    const err = new Error('AI service quota exceeded. Please try again later.');
    err.statusCode = 429;
    throw err;
  }

  // ── 1. Check cache ────────────────────────────────────────────────────
  const key = cacheKey(taskType, input);
  const cached = cache.get(key);
  if (cached) {
    logger.info('AI cache HIT', { ...logMeta, cached: true });
    return cached;
  }

  // ── 2. Build prompt ───────────────────────────────────────────────────
  const promptBuilder = PROMPT_REGISTRY[taskType];
  if (!promptBuilder) {
    const err = new Error(`Unknown AI task type: ${taskType}`);
    err.statusCode = 400;
    throw err;
  }
  const { system, user, version } = promptBuilder(input);
  logMeta.promptVersion = version;

  logger.info('AI request initiated', {
    ...logMeta,
    systemPrompt: truncate(system),
    userPrompt: truncate(user),
  });

  // ── 3. Provider loop (Groq → OpenRouter) ──────────────────────────────
  const errors = [];

  for (const provider of PROVIDER_ORDER) {
    if (isCircuitOpen(provider.name)) {
      logger.warn(`Circuit open — skipping provider "${provider.name}"`, logMeta);
      continue;
    }

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new ProviderError('Orchestrator Timeout', { type: 'TIMEOUT' })), 15000);
        });

        const result = await Promise.race([provider.fn(user, system), timeoutPromise]);
        recordSuccess(provider.name);
        
        globalTokenEstimate += result.usage?.total_tokens || 500;

        // ── 4. Validate ─────────────────────────────────────────────────
        const { valid, data, error: validationError } = validateAIResponse(taskType, result.content);
        if (!valid) {
          logger.warn('AI response validation failed — retrying', {
            ...logMeta,
            provider: provider.name,
            attempt,
            validationError,
            rawSnippet: truncate(result.content, 200),
          });
          // Treat as retryable within the same provider
          if (attempt < MAX_RETRIES) {
            await sleep(BASE_DELAY_MS * 2 ** attempt);
            continue;
          }
          errors.push({ provider: provider.name, error: validationError });
          break; // fall through to next provider
        }

        const latency = Date.now() - startTime;
        logger.info('AI request completed', {
          ...logMeta,
          provider: provider.name,
          attempt,
          latency: `${latency}ms`,
          tokenUsage: result.usage,
          responseSnippet: truncate(JSON.stringify(data), 200),
        });

        // ── 5. Persistence, Cache and return ────────────────────────────
        if (metadata.meetingId) {
          try {
            await prisma.aIResult.create({
              data: {
                meetingId: metadata.meetingId,
                taskType,
                payload: data,
              }
            });
          } catch (dbErr) {
            logger.error('Failed to log AIResult to DB', { error: dbErr.message, meetingId: metadata.meetingId });
          }
        }
        
        cache.set(key, data);
        return data;

      } catch (err) {
        recordFailure(provider.name);
        const isRetryable = err instanceof ProviderError &&
          ['RATE_LIMIT', 'TIMEOUT', 'NETWORK'].includes(err.type);

        logger.error('AI provider error', {
          ...logMeta,
          provider: provider.name,
          attempt,
          errorType: err instanceof ProviderError ? err.type : 'UNKNOWN',
          message: err.message,
        });

        errors.push({ provider: provider.name, error: err.message, type: err.type });

        if (isRetryable && attempt < MAX_RETRIES) {
          const delay = err.retryAfterMs || BASE_DELAY_MS * 2 ** attempt;
          await sleep(Math.min(delay, 5000)); // cap at 5s
          continue;
        }
        break; // move to next provider
      }
    }
  }

  // ── 6. All providers exhausted ────────────────────────────────────────
  const latency = Date.now() - startTime;
  logger.error('All AI providers failed', { ...logMeta, latency: `${latency}ms`, errors });

  const allRateLimited = errors.every((e) => e.type === 'RATE_LIMIT');
  const finalErr = new Error(
    allRateLimited
      ? 'AI service temporarily overloaded. Please retry later.'
      : 'AI service is currently unavailable. Please try again shortly.'
  );
  finalErr.statusCode = allRateLimited ? 429 : 503;
  throw finalErr;
}

// ─── Utility ────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Expose for testing — allows clearing the cache + resetting circuit breakers.
 */
export function _resetInternals() {
  cache.clear();
  for (const key of Object.keys(circuits)) {
    circuits[key].failures = 0;
    circuits[key].openUntil = 0;
  }
}
