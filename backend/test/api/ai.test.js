import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { jest } from '@jest/globals';

const prisma = new PrismaClient();

/**
 * Phase 4: AI Integration Tests
 *
 * All AI providers are mocked — no real API calls are made.
 * Covers: success flows, provider fallback, malformed output, 503/429 errors.
 */

// ── Mock providers BEFORE importing the service ─────────────────────────────

let groqMock = jest.fn();
let openrouterMock = jest.fn();

// Custom ProviderError for mocking (mirrors the real one)
class MockProviderError extends Error {
  constructor(message, opts = {}) {
    super(message);
    this.name = 'ProviderError';
    this.type = opts.type || 'UNKNOWN';
    this.provider = opts.provider || 'groq';
    this.statusCode = opts.statusCode;
    this.retryAfterMs = opts.retryAfterMs;
  }
}

jest.unstable_mockModule('../../src/services/providers/groq.provider.js', () => ({
  generateCompletion: (...args) => groqMock(...args),
  ProviderError: MockProviderError,
}));

jest.unstable_mockModule('../../src/services/providers/openrouter.provider.js', () => ({
  generateCompletion: (...args) => openrouterMock(...args),
}));

// Dynamic imports AFTER mocks are registered
const { default: app } = await import('../../src/app.js');
const { _resetInternals } = await import('../../src/services/ai.service.js');

// ── Helpers ─────────────────────────────────────────────────────────────────

const VALID_SUGGEST_RESPONSE = JSON.stringify({
  suggestions: [
    { start: '2026-08-01T09:00:00Z', end: '2026-08-01T10:00:00Z', score: 0.95 },
    { start: '2026-08-01T14:00:00Z', end: '2026-08-01T15:00:00Z', score: 0.8 },
  ],
});

const VALID_EMAIL_RESPONSE = JSON.stringify({
  subject: 'Project Kickoff — Invitation',
  body: 'Hi team,\n\nYou are invited to the Project Kickoff meeting…',
});

const VALID_SUMMARY_RESPONSE = JSON.stringify({
  summary: 'The team discussed Q3 goals and assigned key deliverables.',
  bulletPoints: ['Revenue target set to $2M', 'Hiring plan approved'],
  actionItems: [
    { owner: 'Alice', task: 'Draft hiring plan', deadline: '2026-08-15' },
  ],
  decisions: ['Adopt new CI/CD pipeline'],
});

// ── Test Suite ──────────────────────────────────────────────────────────────

describe('AI Integration', () => {
  let adminToken, userToken;
  let adminId, userId;
  let meetingId;

  beforeAll(async () => {
    // Register admin
    const adminReg = await request(app).post('/api/auth/register').send({
      email: 'ai_admin@example.com', password: 'password123', name: 'AI Admin', role: 'ADMIN',
    });
    adminId = adminReg.body.data.user.id;
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'ai_admin@example.com', password: 'password123',
    });
    adminToken = adminLogin.body.data.token;

    // Register user
    const userReg = await request(app).post('/api/auth/register').send({
      email: 'ai_user@example.com', password: 'password123', name: 'AI User',
    });
    userId = userReg.body.data.user.id;
    const userLogin = await request(app).post('/api/auth/login').send({
      email: 'ai_user@example.com', password: 'password123',
    });
    userToken = userLogin.body.data.token;

    // Create a meeting (admin is organizer, user is participant)
    const meetingRes = await request(app)
      .post('/api/meetings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'AI Test Meeting',
        startTime: '2026-08-01T09:00:00Z',
        endTime: '2026-08-01T10:00:00Z',
        participantIds: [userId],
      });
    meetingId = meetingRes.body.data.id;

    // Add availability for the user so suggest-times has data
    await prisma.availability.create({
      data: {
        userId,
        startTime: new Date('2026-08-01T08:00:00Z'),
        endTime: new Date('2026-08-01T18:00:00Z'),
      },
    });
  });

  beforeEach(() => {
    groqMock.mockReset();
    openrouterMock.mockReset();
    _resetInternals();
  });

  // ────────────────────────────────────────────────────────────────────────
  // GET /api/ai/suggest-times/:meetingId
  // ────────────────────────────────────────────────────────────────────────

  describe('GET /api/ai/suggest-times/:meetingId', () => {
    it('should return suggestions on Groq success', async () => {
      groqMock.mockResolvedValueOnce({ content: VALID_SUGGEST_RESPONSE, usage: { total_tokens: 120 } });

      const res = await request(app)
        .get(`/api/ai/suggest-times/${meetingId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.suggestions).toHaveLength(2);
      expect(res.body.data.suggestions[0]).toHaveProperty('score');
      expect(groqMock).toHaveBeenCalledTimes(1);
    });

    it('should fallback to OpenRouter when Groq fails', async () => {
      groqMock.mockRejectedValue(
        new MockProviderError('Groq rate limit', { type: 'RATE_LIMIT', provider: 'groq', statusCode: 429 })
      );
      openrouterMock.mockResolvedValueOnce({ content: VALID_SUGGEST_RESPONSE, usage: null });

      const res = await request(app)
        .get(`/api/ai/suggest-times/${meetingId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.suggestions).toBeDefined();
      expect(openrouterMock).toHaveBeenCalled();
    });

    it('should deny non-admin users', async () => {
      const res = await request(app)
        .get(`/api/ai/suggest-times/${meetingId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should return 404 for non-existent meeting', async () => {
      const res = await request(app)
        .get('/api/ai/suggest-times/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // POST /api/ai/draft-email
  // ────────────────────────────────────────────────────────────────────────

  describe('POST /api/ai/draft-email', () => {
    it('should generate an email draft', async () => {
      groqMock.mockResolvedValueOnce({ content: VALID_EMAIL_RESPONSE, usage: null });

      const res = await request(app)
        .post('/api/ai/draft-email')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ meetingId, contextType: 'invite' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('subject');
      expect(res.body.data).toHaveProperty('body');
    });

    it('should reject invalid contextType', async () => {
      const res = await request(app)
        .post('/api/ai/draft-email')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ meetingId, contextType: 'invalid-type' });

      expect(res.statusCode).toBe(400);
    });

    it('should deny non-admin users', async () => {
      const res = await request(app)
        .post('/api/ai/draft-email')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ meetingId, contextType: 'invite' });

      expect(res.statusCode).toBe(403);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // POST /api/ai/summary
  // ────────────────────────────────────────────────────────────────────────

  describe('POST /api/ai/summary', () => {
    it('should generate a summary for admin', async () => {
      groqMock.mockResolvedValueOnce({ content: VALID_SUMMARY_RESPONSE, usage: null });

      const res = await request(app)
        .post('/api/ai/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ meetingId, notes: 'We discussed hiring and Q3 targets.' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('summary');
      expect(res.body.data).toHaveProperty('actionItems');
      expect(res.body.data).toHaveProperty('decisions');
    });

    it('should allow participant (USER role) to summarize', async () => {
      groqMock.mockResolvedValueOnce({ content: VALID_SUMMARY_RESPONSE, usage: null });

      const res = await request(app)
        .post('/api/ai/summary')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ meetingId, notes: 'Short notes.' });

      expect(res.statusCode).toBe(200);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Error, Fallback, and Resilience
  // ────────────────────────────────────────────────────────────────────────

  describe('Resilience', () => {
    it('should return 503 when both providers fail with network errors', async () => {
      groqMock.mockRejectedValue(
        new MockProviderError('Groq down', { type: 'NETWORK', provider: 'groq' })
      );
      openrouterMock.mockRejectedValue(
        new MockProviderError('OpenRouter down', { type: 'NETWORK', provider: 'openrouter' })
      );

      const res = await request(app)
        .post('/api/ai/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ meetingId, notes: 'Triggering failure.' });

      expect(res.statusCode).toBe(503);
    });

    it('should return 429 when both providers hit rate limits', async () => {
      groqMock.mockRejectedValue(
        new MockProviderError('Groq rate limit', { type: 'RATE_LIMIT', provider: 'groq', statusCode: 429 })
      );
      openrouterMock.mockRejectedValue(
        new MockProviderError('OpenRouter rate limit', { type: 'RATE_LIMIT', provider: 'openrouter', statusCode: 429 })
      );

      const res = await request(app)
        .post('/api/ai/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ meetingId, notes: 'Rate limit test.' });

      expect(res.statusCode).toBe(429);
    });

    it('should handle malformed AI output by retrying then failing', async () => {
      groqMock.mockResolvedValue({ content: 'not json at all!!!', usage: null });
      openrouterMock.mockResolvedValue({ content: '{"bad": true}', usage: null });

      const res = await request(app)
        .post('/api/ai/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ meetingId, notes: 'Malformed output test.' });

      expect(res.statusCode).toBe(503);
    });

    it('should return 401 for unauthenticated requests', async () => {
      const res = await request(app)
        .post('/api/ai/summary')
        .send({ meetingId: '00000000-0000-0000-0000-000000000000', notes: 'No token.' });

      expect(res.statusCode).toBe(401);
    });
  });
});
