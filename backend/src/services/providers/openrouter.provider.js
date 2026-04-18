/**
 * Phase 4: OpenRouter Provider (fallback)
 *
 * Wraps the OpenRouter chat-completions REST API with the same interface
 * as the Groq provider.  Used as automatic fallback when Groq hits rate
 * limits, timeouts, or errors.
 */

import { ProviderError } from './groq.provider.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';
const TIMEOUT_MS = 10_000; // 10-second ceiling (OpenRouter can be slower)

// ─── Main Function ──────────────────────────────────────────────────────────

/**
 * Call the OpenRouter chat-completions endpoint.
 *
 * @param {string} userPrompt
 * @param {string} systemInstruction
 * @param {object} [options]
 * @param {string} [options.model]
 * @param {number} [options.maxTokens]
 * @returns {Promise<{ content: string, usage: object|null }>}
 * @throws {ProviderError}
 */
export async function generateCompletion(userPrompt, systemInstruction, options = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new ProviderError('OPENROUTER_API_KEY is not configured', {
      type: 'AUTH',
      provider: 'openrouter',
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
    const res = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://exora.ai',
        'X-Title': 'Exora AI',
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');

      if (res.status === 429) {
        const retryAfter = res.headers.get('retry-after');
        throw new ProviderError('OpenRouter rate limit exceeded', {
          type: 'RATE_LIMIT',
          provider: 'openrouter',
          statusCode: 429,
          retryAfterMs: retryAfter ? Number(retryAfter) * 1000 : 60_000,
        });
      }

      if (res.status === 401 || res.status === 403) {
        throw new ProviderError('OpenRouter authentication failed', {
          type: 'AUTH',
          provider: 'openrouter',
          statusCode: res.status,
        });
      }

      throw new ProviderError(`OpenRouter request failed (${res.status})`, {
        type: 'UNKNOWN',
        provider: 'openrouter',
        statusCode: res.status,
      });
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;

    if (typeof content !== 'string' || content.trim().length === 0) {
      throw new ProviderError('OpenRouter returned an empty or invalid response', {
        type: 'INVALID_RESPONSE',
        provider: 'openrouter',
      });
    }

    return {
      content: content.trim(),
      usage: data.usage || null,
    };
  } catch (err) {
    clearTimeout(timeout);

    if (err instanceof ProviderError) throw err;

    if (err.name === 'AbortError') {
      throw new ProviderError(`OpenRouter request timed out after ${TIMEOUT_MS}ms`, {
        type: 'TIMEOUT',
        provider: 'openrouter',
      });
    }

    throw new ProviderError(`OpenRouter network error: ${err.message}`, {
      type: 'NETWORK',
      provider: 'openrouter',
    });
  }
}
