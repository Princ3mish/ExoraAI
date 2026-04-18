/**
 * Phase 4: Groq Provider
 *
 * Wraps the Groq chat-completions REST API with timeout guards and
 * unified error mapping.  The orchestrator (ai.service.js) treats this as
 * the PRIMARY provider because of Groq's higher free-tier throughput.
 */

import logger from '../../utils/logger.js';

// ─── Error Types ────────────────────────────────────────────────────────────

export class ProviderError extends Error {
  /**
   * @param {string} message
   * @param {object} opts
   * @param {'RATE_LIMIT'|'TIMEOUT'|'INVALID_RESPONSE'|'AUTH'|'NETWORK'|'UNKNOWN'} opts.type
   * @param {string}  opts.provider
   * @param {number} [opts.statusCode]
   * @param {number} [opts.retryAfterMs]
   */
  constructor(message, { type, provider, statusCode, retryAfterMs } = {}) {
    super(message);
    this.name = 'ProviderError';
    this.type = type || 'UNKNOWN';
    this.provider = provider || 'groq';
    this.statusCode = statusCode;
    this.retryAfterMs = retryAfterMs;
  }
}

// ─── Constants ──────────────────────────────────────────────────────────────

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const TIMEOUT_MS = 8000; // 8-second hard ceiling

// ─── Main Function ──────────────────────────────────────────────────────────

/**
 * Call the Groq chat-completions endpoint.
 *
 * @param {string} userPrompt       - The user-role message content
 * @param {string} systemInstruction - The system-role message content
 * @param {object} [options]
 * @param {string} [options.model]   - Override the default model
 * @param {number} [options.maxTokens] - Max response tokens (default 2048)
 * @returns {Promise<{ content: string, usage: object|null }>}
 * @throws {ProviderError}
 */
export async function generateCompletion(userPrompt, systemInstruction, options = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new ProviderError('GROQ_API_KEY is not configured', {
      type: 'AUTH',
      provider: 'groq',
    });
  }

  const model = options.model || DEFAULT_MODEL;
  const maxTokens = options.maxTokens || 2048;

  const body = JSON.stringify({
    model,
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: maxTokens,
    temperature: 0.3,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // ── Map HTTP errors ─────────────────────────────────────────────────
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');

      if (res.status === 429) {
        const retryAfter = res.headers.get('retry-after');
        throw new ProviderError('Groq rate limit exceeded', {
          type: 'RATE_LIMIT',
          provider: 'groq',
          statusCode: 429,
          retryAfterMs: retryAfter ? Number(retryAfter) * 1000 : 60_000,
        });
      }

      if (res.status === 401 || res.status === 403) {
        throw new ProviderError('Groq authentication failed', {
          type: 'AUTH',
          provider: 'groq',
          statusCode: res.status,
        });
      }

      throw new ProviderError(`Groq request failed (${res.status})`, {
        type: 'UNKNOWN',
        provider: 'groq',
        statusCode: res.status,
      });
    }

    // ── Parse response ──────────────────────────────────────────────────
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;

    if (typeof content !== 'string' || content.trim().length === 0) {
      throw new ProviderError('Groq returned an empty or invalid response', {
        type: 'INVALID_RESPONSE',
        provider: 'groq',
      });
    }

    return {
      content: content.trim(),
      usage: data.usage || null,
    };
  } catch (err) {
    clearTimeout(timeout);

    // Already a ProviderError – rethrow
    if (err instanceof ProviderError) throw err;

    // Abort / timeout
    if (err.name === 'AbortError') {
      throw new ProviderError(`Groq request timed out after ${TIMEOUT_MS}ms`, {
        type: 'TIMEOUT',
        provider: 'groq',
      });
    }

    // Generic network
    throw new ProviderError(`Groq network error: ${err.message}`, {
      type: 'NETWORK',
      provider: 'groq',
    });
  }
}
